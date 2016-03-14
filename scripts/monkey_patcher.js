/**
 * popup.js
 *
 * @category scripts
 * @package  SecureEtherpad
 * @author   Luca Gallinari <luke.gallinari@gmail.com>
 */

var actualCode = '(' +

    function() {

        var DEBUG = true;

        /**
         * Read a cookie
         * @param name {string}
         * @returns {string|null}
         * @see http://stackoverflow.com/a/24103596/4670153
         */
        function readCookie(name) {
            var nameEQ = name + "=";
            var ca = document.cookie.split(';');
            for (var i = 0; i < ca.length; i++) {
                var c = ca[i];
                while (c.charAt(0) == ' ') c = c.substring(1, c.length);
                if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
            }
            return null;
        }

        /**
         * Apply a simple ROTATE 13 algorithm to given "data".
         * Avoid encoding special codes (new line, ecc) to maintain the integrity of the payload.
         * @param data {string}
         * @param rotateNumber {int} rotate by number (+/-)
         * @param encode {boolean} encode if true, decode if false
         * @returns {string}
         */
        function rotateAlgorithm(data, rotateNumber, encode) {
            var postProcessData = "", i;
            for (i = 0; i < data.length; ++i) {
                if (data.charCodeAt(i) > 31) {
                    postProcessData += String.fromCharCode(
                        data.charCodeAt(i) + (encode ? +rotateNumber : -rotateNumber)
                    );
                } else {
                    postProcessData += data.charAt(i);
                }
            }
            return postProcessData;
        }

        /**
         * Apply encoding/decoding based on the given "algorithm"
         * @param algorithm {string} algorithm to use
         * @param data {string}
         * @param key {string} if needed
         * @param encode {boolean} encode if true, decode if false
         * @returns {string}
         */
        function applyAlgorithmToData(algorithm, key, data, encode) {
            var postProcessData;
            switch (algorithm) {
                case 'ROT13':
                    postProcessData = rotateAlgorithm(data, 13, encode);
                    break;
                case 'ROTN':
                    postProcessData = rotateAlgorithm(data, parseInt(key), encode);
                    break;
                default:
                    console.log('Invalid algorithm!');
                    break;
            }
            return postProcessData;
        }

        /**
         * Use socketio.js methods to decode the the given packet and replace the text with the encoded/decoded one.
         * @param packet {object}
         * @param encode {boolean}
         * @return {object|boolean}
         */
        function decodePacketAndApplyAlgorithm(packet, encode) {

            var packetData = socketio.decodePacket(packet, null);
            if (
                !packetData.hasOwnProperty('type') || !packetData.hasOwnProperty('data') ||
                packetData.type != 'message'
            ) {
                return false;
            }

            var packetObj = socketio.decodeString(packetData.data);
            if (
                !packetObj || !packetObj.hasOwnProperty('data') ||
                packetObj.data.length != 2 || !packetObj.data[1].hasOwnProperty('data')
            ) {
                return false;
            }

            // If we are decoding, check if this packet was already decode, if so just return false
            if (
                encode == false &&
                packetObj.data[1].hasOwnProperty('decoded')
            ) {
                return false;
            }

            // We want only newChanges or userChanges
            var msg = packetObj.data[1].data;
            if (
                !msg.hasOwnProperty('type') ||
                (msg.type != 'NEW_CHANGES' && msg.type != 'USER_CHANGES')
            ) {
                return false;
            }

            if (DEBUG) {
                console.log("Received a message that must be decoded:");
            }

            // todo: save those in a global variable
            var secureAlgorithm = readCookie('secureEtherpadAlgorithm');
            var secureKey = readCookie('secureEtherpadKey');

            // split by the first '$' to get the pad and the text
            var msgData = msg.changeset;
            var splitIndex = msgData.indexOf('$');
            var pad = msgData.substr(0, splitIndex);
            var text = msgData.substr(splitIndex + 1);

            var postProcessData = applyAlgorithmToData(secureAlgorithm, secureKey, text, encode);

            if (DEBUG) {
                console.log("Pad: " + pad);
                console.log("Before alg. text: " + text);
                console.log("After alg. text: " + postProcessData);
            }

            // save the data back into propers objects
            packetObj.data[1].data.changeset = pad + '$' + postProcessData;
            if (encode == false) {
                packetObj.data[1].decoded = true; // flag that avoid an infinite decode
            }
            packetData.data = socketio.encodeAsString(packetObj);

            return socketio.encodePacket(packetData, null);
        }

        // save the original WebSocket
        if (DEBUG) {console.log("Overriding the WebSocket implementation");}

        var OrigWebSocket = window.WebSocket;
        var callWebSocket = OrigWebSocket.apply.bind(OrigWebSocket);
        var wsAddListener = OrigWebSocket.prototype.addEventListener;
        wsAddListener = wsAddListener.call.bind(wsAddListener);

        // override the original WebSocket
        window.WebSocket = function WebSocket(url, protocols) {

            var ws;
            if (!(this instanceof WebSocket)) {
                // Called without 'new' (browsers will throw an error).
                ws = callWebSocket(this, arguments);
            } else if (arguments.length === 1) {
                ws = new OrigWebSocket(url);
            } else if (arguments.length >= 2) {
                ws = new OrigWebSocket(url, protocols);
            } else { // No arguments (browsers will throw an error)
                ws = new OrigWebSocket();
            }

            // Listen to incoming messages
            // This script will always be executed before every others in the page, so this listener
            // will always be fired for first.
            wsAddListener(ws, 'message', function(event) {

                // the extension is disabled for this site
                if (readCookie('secureEtherpadEnabled') !== 'true') {
                    if (DEBUG) {console.log("SecureEtherpad is DISABLED for this site");}
                    return;
                }

                // check that the event data is a 'message' (type=4)
                if (!('data' in event) || event.data.charAt(0) != '4') {return;}

                var eventData = decodePacketAndApplyAlgorithm(event.data, false);
                if (eventData === false) {return;}// invalid packet
                if (DEBUG) {console.log("Post-decoding event data: " + eventData);}

                // Don't propagate the event to others listeners.
                // I do this because the data of the event are READ ONLY, so I have to fire a new
                // MessageEvent event, identical to the previous, but with decoded data in the payload
                event.stopImmediatePropagation();
                var messageEvent = new MessageEvent("message", {
                    data: eventData,
                    origin: event.origin,
                    lastEventId: event.lastEventId
                });
                ws.dispatchEvent(messageEvent);
            });

            return ws;
        };

        window.WebSocket.prototype = OrigWebSocket.prototype;
        window.WebSocket.prototype.constructor = window.WebSocket;


        // save the original send function
        var wsSend = OrigWebSocket.prototype.send;
        wsSend = wsSend.apply.bind(wsSend);

        // override the send function of the original WebSocket
        OrigWebSocket.prototype.send = function(data) {

            // the extension is enabled for this site
            if (data != '') {
                if (readCookie('secureEtherpadEnabled') === 'true') {
                    if (data.charAt(0) == '4') {
                        var ret = decodePacketAndApplyAlgorithm(data, true);
                        if (ret !== false) {
                            //noinspection JSUnusedAssignment
                            data = ret;
                        }
                    }
                }
            }

            // call the original send function
            return wsSend(this, arguments);
        };


        //noinspection JSUnresolvedFunction
        xhook.after(function(request, response) {
            // the extension is disabled for this site
            if (readCookie('secureEtherpadEnabled') !== 'true') {return;}

            if (200 == response.status || 1223 == response.status) {

                // todo: something better than indexof?
                if (response.data.indexOf("CLIENT_VARS") > -1 ) {

                    var packets = socketio.decodePayload(response.data, null);
                    for (var i=0; i<packets.length; ++i) {

                        var packet = socketio.decodeString(packets[i].data);
                        if (packet && packet.hasOwnProperty('data')) {

                            if (packet.data[1].type == "CLIENT_VARS") {

                                var secureAlgorithm = readCookie('secureEtherpadAlgorithm');
                                var secureKey = readCookie('secureEtherpadKey');

                                //noinspection JSUnresolvedVariable
                                var initText = packet.data[1].data.collab_client_vars.initialAttributedText.text;
                                var decodedText = applyAlgorithmToData(secureAlgorithm, secureKey, initText, false);

                                if (DEBUG) {console.log("Decoded data: " + decodedText);}
                                // save text in the packet
                                //noinspection JSUnresolvedVariable
                                packet.data[1].data.collab_client_vars.initialAttributedText.text = decodedText;
                                // write the encoded packet back in the packets payload
                                packets[i].data = socketio.encodeAsString(packet);
                            }
                        }
                    }

                    // write encoded payload back in the response
                    response.text = socketio.encodePayload(packets, null, function() {});
                }

            }
        });

        //@ sourceURL=monkey_patcher.js
    }
    //)
+ ')();'; // the last () grant that the function will be called immediatly after being appended


// Append the script as a function
// If you append the script as a file (with a src) it WON'T be loaded before all the others script in the page
var script = document.createElement('script');
script.textContent = actualCode;
(document.head||document.documentElement).appendChild(script);
script.parentNode.removeChild(script);
