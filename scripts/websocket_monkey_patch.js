
function createCookie(name,value,days) {
    if (days) {
        var date = new Date();
        date.setTime(date.getTime()+(days*24*60*60*1000));
        var expires = "; expires="+date.toGMTString();
    }
    else var expires = "";
    document.cookie = name+"="+value+expires+"; path=/";
}

chrome.runtime.sendMessage(
    {cmd: "getStatus"},
    function(response) {
        console.log("cookie creato");
        console.log(response.status);
        createCookie('status', response.status, 1);
    }
);

var actualCode = '(' +

    function() {

        /*
        if (!response.status) {
            console.log("Ext is DISABLED for this site");
            return;
        }
        console.log("Ext is ENABLED for this site");
        */

        function encodeROT13(data) {
            var encodedData = "";
            for (var i = 0; i < data.length; ++i) {
                if (data.charCodeAt(i) > 31) {
                    encodedData += String.fromCharCode(data.charCodeAt(i) + 1);
                } else { // avoid encoding special chars
                    encodedData += data.charAt(i);
                }
            }
            return encodedData;
        }

        function decodeROT13(data) {
            var encodedData = "";
            for (var i = 0; i < data.length; ++i) {
                if (data.charCodeAt(i) > 31) {
                    encodedData += String.fromCharCode(data.charCodeAt(i) - 1);
                } else {
                    encodedData += data.charAt(i);
                }
            }
            return encodedData;
        }

        function createCookie(name,value,days) {
            if (days) {
                var date = new Date();
                date.setTime(date.getTime()+(days*24*60*60*1000));
                var expires = "; expires="+date.toGMTString();
            }
            else var expires = "";
            document.cookie = name+"="+value+expires+"; path=/";
        }

        function readCookie(name) {
            var nameEQ = name + "=";
            var ca = document.cookie.split(';');
            for(var i=0;i < ca.length;i++) {
                var c = ca[i];
                while (c.charAt(0)==' ') c = c.substring(1,c.length);
                if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
            }
            return null;
        }

        function eraseCookie(name) {
            createCookie(name,"",-1);
        }


        // save the original WebSocket
        console.log("Overriding WebSocket");
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
                var status = readCookie('status');
                if (status == 'false') {
                    return;
                }
                console.log("Ext is ENABLED for this site");


                var dataObj = socketio.decodeString(event.data.substr(1));

                if (!dataObj || !dataObj.hasOwnProperty('data'))
                    return;

                if (dataObj.data[0] == 'message') {

                    var cTemp = event.data.substr(0, 1);
                    var packet = dataObj.data[1];

                    if (packet.hasOwnProperty('data')) {
                        if (packet.data.hasOwnProperty('type')) {
                            //noinspection JSUnresolvedVariable
                            if (packet.data.type == 'NEW_CHANGES') {

                                // This packet was already decode so let it be propagated to other listeners
                                if ('decoded' in packet) {
                                    return;
                                }

                                console.log("Received a message that must be decoded");

                                // decode data
                                //noinspection JSUnresolvedVariable
                                var packetData = packet.data.changeset;
                                var subs = packetData.split('$');
                                var mod = subs[0] + '$' + decodeROT13(subs[1]);
                                dataObj.data[1].data.changeset = mod;
                                dataObj.data[1].decoded = true; // flag that avoid an infinite decode
                                console.log("from-> "+packetData+" to-> "+mod);

                                // Don't propagate the event to others listeners.
                                // I do this because the data of the event are READ ONLY, so I have to fire a new
                                // MessageEvent event, identical to the previous, but with decoded data in the payload
                                event.stopImmediatePropagation();
                                var messageEvent = new MessageEvent(
                                    "message",
                                    {
                                        data: cTemp + socketio.encodeAsString(dataObj),
                                        origin: event.origin,
                                        lastEventId: event.lastEventId
                                    }
                                );
                                ws.dispatchEvent(messageEvent);
                            }
                        }
                    }

                }
            });

            return ws;

        };//.bind();

        window.WebSocket.prototype = OrigWebSocket.prototype;
        window.WebSocket.prototype.constructor = window.WebSocket;


        // save the original send function
        var wsSend = OrigWebSocket.prototype.send;
        wsSend = wsSend.apply.bind(wsSend);

        // override the send function of the original WebSocket
        OrigWebSocket.prototype.send = function(data) {
            var status = readCookie('status');

            if (status != 'false') {
                if (data != '') {
                    var dataObj = socketio.decodeString(data.substr(1));
                    if (dataObj != null) {
                        if (dataObj.hasOwnProperty('data')) {
                            if (dataObj.data[0] == 'message') {
                                //todo: check USER_CHANGES type
                                var cTemp = data.substr(0,1);
                                //console.log(dataObj);
                                var packet = dataObj.data[1];
                                //noinspection JSUnresolvedVariable
                                var packetData = packet.data.changeset;
                                var subs = packetData.split('$');

                                var mod = subs[0] + '$' + encodeROT13(subs[1]);
                                dataObj.data[1].data.changeset = mod;
                                console.log("from-> "+packetData+" to-> "+mod);

                                data = cTemp + socketio.encodeAsString(dataObj);
                                //console.log(data);
                            }
                        }
                    }
                }
            }

            // call the original send function
            return wsSend(this, arguments);
        };


        xhook.after(function(request, response) {
            var status = readCookie('status');
            if (status == 'false') {
                return;
            }
            console.log("Ext is ENABLED for this site");

            if (200 == response.status || 1223 == response.status) {

                // todo: better than indexof?
                if (response.data.indexOf("CLIENT_VARS") > -1 ) {
                    console.log(response);

                    var packets = socketio.decodePayload(response.data, null);

                    for (var i=0; i<packets.length; ++i) {

                        var packet = socketio.decodeString(packets[i].data);

                        if (packet && packet.hasOwnProperty('data')) {
                            //console.log(dataObj);
                            if (packet.data[1].type == "CLIENT_VARS") {
                                var initText = packet.data[1].data.collab_client_vars.initialAttributedText.text;

                                // modify obj
                                packet.data[1].data.collab_client_vars.initialAttributedText.text = decodeROT13(initText);

                                // save
                                var decodedData = socketio.encodeAsString(packet);
                                //var lenTextFin = decodedData.length;

                                packets[i].data = decodedData;
                            }
                        }

                    }

                    var textMod = socketio.encodePayload(packets, null, function() {});

                    console.log(textMod);
                    response.text = textMod;
                }

            }
        });

        //@ sourceURL=monkey_patch.js

    }
    //)
+ ')();'; // the last () grant that the function will be called immediatly after being appended


// Append the script as a function
// If you append the script as a file (with a src) it WON'T be loaded before all the others script in the page
var script = document.createElement('script');
script.textContent = actualCode;
(document.head||document.documentElement).appendChild(script);
script.parentNode.removeChild(script);
