
var actualCode = '(' + function () {

        /** Imported code from socket.io.js */

        var socketio = {};

        var isAndroid = navigator.userAgent.match(/Android/i);
        var isPhantomJS = /PhantomJS/i.test(navigator.userAgent);
        var dontSendBlobs = isAndroid || isPhantomJS;
        var packets = {
            open: 0    // non-ws
            , close: 1    // non-ws
            , ping: 2
            , pong: 3
            , message: 4
            , upgrade: 5
            , noop: 6
        };
        var packetslist = keys(packets);
        var exports = {};
        var err = {type: 'error', data: 'parser error'};
        exports.types = [
            'CONNECT',
            'DISCONNECT',
            'EVENT',
            'BINARY_EVENT',
            'ACK',
            'BINARY_ACK',
            'ERROR'
        ];
        exports.CONNECT = 0;
        exports.DISCONNECT = 1;
        exports.EVENT = 2;
        exports.ACK = 3;
        exports.ERROR = 4;
        exports.BINARY_EVENT = 5;
        exports.BINARY_ACK = 6;


        //decode
        socketio.decodeString = function(str) {
            var p = {};
            var i = 0;

            // look up type
            p.type = Number(str.charAt(0));
            if (null == exports.types[p.type]) {
                return;
            }

            // look up attachments if type binary
            if (exports.BINARY_EVENT == p.type || exports.BINARY_ACK == p.type) {
                var buf = '';
                while (str.charAt(++i) != '-') {
                    buf += str.charAt(i);
                    if (i == str.length) break;
                }
                if (buf != Number(buf) || str.charAt(i) != '-') {
                    throw new Error('Illegal attachments');
                }
                p.attachments = Number(buf);
            }

            // look up namespace (if any)
            if ('/' == str.charAt(i + 1)) {
                p.nsp = '';
                while (++i) {
                    var c = str.charAt(i);
                    if (',' == c) break;
                    p.nsp += c;
                    if (i == str.length) break;
                }
            } else {
                p.nsp = '/';
            }

            // look up id
            var next = str.charAt(i + 1);
            if ('' !== next && Number(next) == next) {
                p.id = '';
                while (++i) {
                    var c = str.charAt(i);
                    if (null == c || Number(c) != c) {
                        --i;
                        break;
                    }
                    p.id += str.charAt(i);
                    if (i == str.length) break;
                }
                p.id = Number(p.id);
            }

            // look up json data
            if (str.charAt(++i)) {
                try {
                    //todo: json3 not JSON
                    p.data = JSON3.parse(str.substr(i));
                } catch (e) {
                    console.log("Error");
                    return;
                }
            }

            return p;
        };

        function decodeBase64Packet(msg, binaryType) {
            var type = packetslist[msg.charAt(0)];
            //noinspection JSUnresolvedVariable
            if (!global.ArrayBuffer) {
                return {type: type, data: {base64: true, data: msg.substr(1)}};
            }

            var data = exports.decode(msg.substr(1));

            if (binaryType === 'blob' && Blob) {
                data = new Blob([data]);
            }

            return {type: type, data: data};
        }

        socketio.decodePacket = function(data, binaryType, utf8decode) {
            // String data
            if (typeof data == 'string' || data === undefined) {
                if (data.charAt(0) == 'b') {
                    return decodeBase64Packet(data.substr(1), binaryType);
                }

                if (utf8decode) {
                    try {
                        data = utf8.decode(data);
                    } catch (e) {
                        console.log(e);
                    }
                }
                var type = data.charAt(0);

                if (Number(type) != type || !packetslist[type]) {
                    console.log("Error");
                }

                if (data.length > 1) {
                    return {type: packetslist[type], data: data.substring(1)};
                } else {
                    return {type: packetslist[type]};
                }
            }

            var asArray = new Uint8Array(data);
            var type = asArray[0];
            var rest = sliceBuffer(data, 1);
            if (Blob && binaryType === 'blob') {
                rest = new Blob([rest]);
            }
            return {type: packetslist[type], data: rest};
        };

        socketio.decodePayload = function(data, binaryType) {
            var packets = [];
            //var callback;

            if (typeof data != 'string') {
                return decodePayloadAsBinary(data, binaryType);
            }

            //if (typeof binaryType === 'function') {
            //    callback = binaryType;
            //    binaryType = null;
            //}

            var packet;
            if (data == '') {
                // parser error - ignoring payload
                console.log("Error");
                return;
            }

            var length = '', n, msg;

            for (var i = 0, l = data.length; i < l; i++) {
                var chr = data.charAt(i);

                if (':' != chr) {
                    length += chr;
                } else {
                    if ('' == length || (length != (n = Number(length)))) {
                        console.log("Error");
                    }

                    msg = data.substr(i + 1, n);

                    if (length != msg.length) {
                        console.log("Error");
                    }

                    if (msg.length) {
                        packet = socketio.decodePacket(msg, binaryType, true);

                        if (err.type == packet.type && err.data == packet.data) {
                            console.log("Error");
                        }

                        // FIX: i don't use callbacks but returns an array of packets
                        packets.push(packet);

                        // var ret = callback(packet, i + n, l);
                        // if (false === ret) return;
                    }

                    // advance cursor
                    i += n;
                    length = '';
                }
            }

            // FIX: i don't use callbacks but returns an array of packets
            return packets;

            //if (length != '') {
            //    console.log("Error");
            //}
        };

        function decodePayloadAsBinary(data) {
            if (typeof data === 'string' || data == '' || !data) {
                return;
            }

            var bufferTail = data;
            var buffers = [];

            var numberTooLong = false;
            while (bufferTail.byteLength > 0) {
                var tailArray = new Uint8Array(bufferTail);
                var isString = tailArray[0] === 0;
                var msgLength = '';

                for (var i = 1; ; i++) {
                    if (tailArray[i] == 255) break;

                    if (msgLength.length > 310) {
                        numberTooLong = true;
                        break;
                    }

                    msgLength += tailArray[i];
                }

                if (numberTooLong) {
                    console.log("error");
                    return;
                }

                bufferTail = sliceBuffer(bufferTail, 2 + msgLength.length);
                msgLength = parseInt(msgLength);

                var msg = sliceBuffer(bufferTail, 0, msgLength);
                if (isString) {
                    try {
                        msg = String.fromCharCode.apply(null, new Uint8Array(msg));
                    } catch (e) {
                        // iPhone Safari doesn't let you apply to typed arrays
                        var typed = new Uint8Array(msg);
                        msg = '';
                        for (var i = 0; i < typed.length; i++) {
                            msg += String.fromCharCode(typed[i]);
                        }
                    }
                }

                buffers.push(msg);
                bufferTail = sliceBuffer(bufferTail, msgLength);
            }

            var packets = [];
            buffers.forEach(function (buffer) {
                // todo: binaryType
                packets.push(socketio.decodePacket(buffer, 'arraybuffer', true));
            });
            return packets;
        }


        var utf8 = {
            'version': '2.0.0',
            'encode': utf8encode,
            'decode': utf8decode
        };

        function ucs2decode(string) {
            var output = [];
            var counter = 0;
            var length = string.length;
            var value;
            var extra;
            while (counter < length) {
                value = string.charCodeAt(counter++);
                if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
                    // high surrogate, and there is a next character
                    extra = string.charCodeAt(counter++);
                    if ((extra & 0xFC00) == 0xDC00) { // low surrogate
                        output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
                    } else {
                        // unmatched surrogate; only append this code unit, in case the next
                        // code unit is the high surrogate of a surrogate pair
                        output.push(value);
                        counter--;
                    }
                } else {
                    output.push(value);
                }
            }
            return output;
        }

        function ucs2encode(array) {
            var length = array.length;
            var index = -1;
            var value;
            var output = '';
            while (++index < length) {
                value = array[index];
                if (value > 0xFFFF) {
                    value -= 0x10000;
                    output += String.fromCharCode(value >>> 10 & 0x3FF | 0xD800);
                    value = 0xDC00 | value & 0x3FF;
                }
                output += String.fromCharCode(value);
            }
            return output;
        }

        function createByte(codePoint, shift) {
            return String.fromCharCode(((codePoint >> shift) & 0x3F) | 0x80);
        }

        function encodeCodePoint(codePoint) {
            if ((codePoint & 0xFFFFFF80) == 0) { // 1-byte sequence
                return String.fromCharCode(codePoint);
            }
            var symbol = '';
            if ((codePoint & 0xFFFFF800) == 0) { // 2-byte sequence
                symbol = String.fromCharCode(((codePoint >> 6) & 0x1F) | 0xC0);
            }
            else if ((codePoint & 0xFFFF0000) == 0) { // 3-byte sequence
                symbol = String.fromCharCode(((codePoint >> 12) & 0x0F) | 0xE0);
                symbol += createByte(codePoint, 6);
            }
            else if ((codePoint & 0xFFE00000) == 0) { // 4-byte sequence
                symbol = String.fromCharCode(((codePoint >> 18) & 0x07) | 0xF0);
                symbol += createByte(codePoint, 12);
                symbol += createByte(codePoint, 6);
            }
            symbol += String.fromCharCode((codePoint & 0x3F) | 0x80);
            return symbol;
        }

        function utf8encode(string) {
            var codePoints = ucs2decode(string);

            // console.log(JSON.stringify(codePoints.map(function(x) {
            // 	return 'U+' + x.toString(16).toUpperCase();
            // })));

            var length = codePoints.length;
            var index = -1;
            var codePoint;
            var byteString = '';
            while (++index < length) {
                codePoint = codePoints[index];
                byteString += encodeCodePoint(codePoint);
            }
            return byteString;
        }

        function readContinuationByte() {
            if (byteIndex >= byteCount) {
                throw Error('Invalid byte index');
            }

            var continuationByte = byteArray[byteIndex] & 0xFF;
            byteIndex++;

            if ((continuationByte & 0xC0) == 0x80) {
                return continuationByte & 0x3F;
            }

            // If we end up here, it’s not a continuation byte
            throw Error('Invalid continuation byte');
        }

        function decodeSymbol() {
            var byte1;
            var byte2;
            var byte3;
            var byte4;
            var codePoint;

            if (byteIndex > byteCount) {
                throw Error('Invalid byte index');
            }

            if (byteIndex == byteCount) {
                return false;
            }

            // Read first byte
            byte1 = byteArray[byteIndex] & 0xFF;
            byteIndex++;

            // 1-byte sequence (no continuation bytes)
            if ((byte1 & 0x80) == 0) {
                return byte1;
            }

            // 2-byte sequence
            if ((byte1 & 0xE0) == 0xC0) {
                var byte2 = readContinuationByte();
                codePoint = ((byte1 & 0x1F) << 6) | byte2;
                if (codePoint >= 0x80) {
                    return codePoint;
                } else {
                    throw Error('Invalid continuation byte');
                }
            }

            // 3-byte sequence (may include unpaired surrogates)
            if ((byte1 & 0xF0) == 0xE0) {
                byte2 = readContinuationByte();
                byte3 = readContinuationByte();
                codePoint = ((byte1 & 0x0F) << 12) | (byte2 << 6) | byte3;
                if (codePoint >= 0x0800) {
                    return codePoint;
                } else {
                    throw Error('Invalid continuation byte');
                }
            }

            // 4-byte sequence
            if ((byte1 & 0xF8) == 0xF0) {
                byte2 = readContinuationByte();
                byte3 = readContinuationByte();
                byte4 = readContinuationByte();
                codePoint = ((byte1 & 0x0F) << 0x12) | (byte2 << 0x0C) |
                    (byte3 << 0x06) | byte4;
                if (codePoint >= 0x010000 && codePoint <= 0x10FFFF) {
                    return codePoint;
                }
            }

            throw Error('Invalid UTF-8 detected');
        }

        function utf8decode(byteString) {
            byteArray = ucs2decode(byteString);
            byteCount = byteArray.length;
            byteIndex = 0;
            var codePoints = [];
            var tmp;
            while ((tmp = decodeSymbol()) !== false) {
                codePoints.push(tmp);
            }
            return ucs2encode(codePoints);
        }

        var byteArray;
        var byteCount;
        var byteIndex;

// encode
        socketio.encodeAsString = function(obj) {
            var str = '';
            var nsp = false;

            // first is type
            str += obj.type;

            // attachments if we have them
            if (exports.BINARY_EVENT == obj.type || exports.BINARY_ACK == obj.type) {
                str += obj.attachments;
                str += '-';
            }

            // if we have a namespace other than `/`
            // we append it followed by a comma `,`
            if (obj.nsp && '/' != obj.nsp) {
                nsp = true;
                str += obj.nsp;
            }

            // immediately followed by the id
            if (null != obj.id) {
                if (nsp) {
                    str += ',';
                    nsp = false;
                }
                str += obj.id;
            }

            // json data
            if (null != obj.data) {
                if (nsp) str += ',';
                str += JSON3.stringify(obj.data);
            }

            return str;
        };

        function encodeBase64Packet(packet, callback) {
            var message = 'b' + exports.packets[packet.type];
            if (Blob && packet.data instanceof Blob) {
                var fr = new FileReader();
                fr.onload = function () {
                    var b64 = fr.result.split(',')[1];
                    callback(message + b64);
                };
                return fr.readAsDataURL(packet.data);
            }

            var b64data;
            try {
                b64data = String.fromCharCode.apply(null, new Uint8Array(packet.data));
            } catch (e) {
                // iPhone Safari doesn't let you apply with typed arrays
                var typed = new Uint8Array(packet.data);
                var basic = new Array(typed.length);
                for (var i = 0; i < typed.length; i++) {
                    basic[i] = typed[i];
                }
                b64data = String.fromCharCode.apply(null, basic);
            }
            message += global.btoa(b64data);
            return callback(message);
        }

        function encodeBase64Object(packet, callback) {
            // packet data is an object { base64: true, data: dataAsBase64String }
            var message = 'b' + exports.packets[packet.type] + packet.data.data;
            return callback(message);
        }

        socketio.encodePacket = function(packet, supportsBinary, utf8encode, callback) {
            if ('function' == typeof supportsBinary) {
                callback = supportsBinary;
                supportsBinary = false;
            }

            if ('function' == typeof utf8encode) {
                callback = utf8encode;
                utf8encode = null;
            }

            var data = (packet.data === undefined)
                ? undefined
                : packet.data.buffer || packet.data;

            /* TODO: fix
             if (global.ArrayBuffer && data instanceof ArrayBuffer) {
             return encodeArrayBuffer(packet, supportsBinary, callback);
             } else if (Blob && data instanceof global.Blob) {
             return encodeBlob(packet, supportsBinary, callback);
             }
             */

            // might be an object with { base64: true, data: dataAsBase64String }
            if (data && data.base64) {
                return encodeBase64Object(packet, callback);
            }

            // Sending data as a utf-8 string
            var encoded = packets[packet.type];

            // data fragment is optional
            if (undefined !== packet.data) {
                encoded += utf8encode ? utf8.encode(String(packet.data)) : String(packet.data);
            }

            //todo: fix
            return encoded;
            //return callback('' + encoded);

        };

        socketio.encodePayload = function(packets, supportsBinary, callback) {
            if (typeof supportsBinary == 'function') {
                callback = supportsBinary;
                supportsBinary = null;
            }

            var isBinary = hasBinary(packets);

            if (supportsBinary && isBinary) {
                if (Blob && !dontSendBlobs) {
                    return encodePayloadAsBlob(packets, callback);
                }

                return encodePayloadAsArrayBuffer(packets, callback);
            }

            if (!packets.length) {
                return callback('0:');
            }

            function setLengthHeader(message) {
                return message.length + ':' + message;
            }

            //function encodeOne(packet, doneCallback) {
            //    encodePacket(packet, !isBinary ? false : supportsBinary, true, function (message) {
            //        doneCallback(null, setLengthHeader(message));
            //    });
            //}

            // FIX: todo
            var res = "";
            for (var i = 0; i < packets.length; ++i) {
                var msg = socketio.encodePacket(packets[i], !isBinary ? false : supportsBinary, true, function (message) {
                });
                res += setLengthHeader(msg);
            }

            //map(packets, encodeOne, function (err, results) {
            //    res += results.join('');
            //});
            return res;
        };

        function encodePayloadAsBlob(packets, callback) {
            function encodeOne(packet, doneCallback) {
                socketio.encodePacket(packet, true, true, function (encoded) {
                    var binaryIdentifier = new Uint8Array(1);
                    binaryIdentifier[0] = 1;
                    if (typeof encoded === 'string') {
                        var view = new Uint8Array(encoded.length);
                        for (var i = 0; i < encoded.length; i++) {
                            view[i] = encoded.charCodeAt(i);
                        }
                        encoded = view.buffer;
                        binaryIdentifier[0] = 0;
                    }

                    var len = (encoded instanceof ArrayBuffer)
                        ? encoded.byteLength
                        : encoded.size;

                    var lenStr = len.toString();
                    var lengthAry = new Uint8Array(lenStr.length + 1);
                    for (var i = 0; i < lenStr.length; i++) {
                        lengthAry[i] = parseInt(lenStr[i]);
                    }
                    lengthAry[lenStr.length] = 255;

                    if (Blob) {
                        var blob = new Blob([binaryIdentifier.buffer, lengthAry.buffer, encoded]);
                        doneCallback(null, blob);
                    }
                });
            }

            map(packets, encodeOne, function (err, results) {
                return callback(new Blob(results));
            });
        }

        function encodeArrayBuffer(packet, supportsBinary, callback) {
            if (!supportsBinary) {
                return encodeBase64Packet(packet, callback);
            }

            var data = packet.data;
            var contentArray = new Uint8Array(data);
            var resultBuffer = new Uint8Array(1 + data.byteLength);

            resultBuffer[0] = packets[packet.type];
            for (var i = 0; i < contentArray.length; i++) {
                resultBuffer[i + 1] = contentArray[i];
            }

            return callback(resultBuffer.buffer);
        }

        function encodeBlobAsArrayBuffer(packet, supportsBinary, callback) {
            if (!supportsBinary) {
                return encodeBase64Packet(packet, callback);
            }

            var fr = new FileReader();
            fr.onload = function () {
                packet.data = fr.result;
                socketio.encodePacket(packet, supportsBinary, true, callback);
            };
            return fr.readAsArrayBuffer(packet.data);
        }

        function encodeBlob(packet, supportsBinary, callback) {
            if (!supportsBinary) {
                return encodeBase64Packet(packet, callback);
            }

            if (dontSendBlobs) {
                return encodeBlobAsArrayBuffer(packet, supportsBinary, callback);
            }

            var length = new Uint8Array(1);
            length[0] = packets[packet.type];
            var blob = new Blob([length.buffer, packet.data]);

            return callback(blob);
        }

        function hasBinary(data) {

            function _hasBinary(obj) {
                if (!obj) return false;

                // todo: this was modified
                return true;
                if ((global.Buffer && global.Buffer.isBuffer(obj)) ||
                    (global.ArrayBuffer && obj instanceof ArrayBuffer) ||
                    (global.Blob && obj instanceof Blob) ||
                    (global.File && obj instanceof File)
                ) {
                    return true;
                }

                if (isArray(obj)) {
                    for (var i = 0; i < obj.length; i++) {
                        if (_hasBinary(obj[i])) {
                            return true;
                        }
                    }
                } else if (obj && 'object' == typeof obj) {
                    if (obj.toJSON) {
                        obj = obj.toJSON();
                    }

                    for (var key in obj) {
                        if (obj.hasOwnProperty(key) && _hasBinary(obj[key])) {
                            return true;
                        }
                    }
                }

                return false;
            }

            return _hasBinary(data);
        }

//helpers
        function after(count, callback, err_cb) {
            var bail = false;
            err_cb = err_cb || noop;
            proxy.count = count;

            return (count === 0) ? callback() : proxy;

            function proxy(err, result) {
                if (proxy.count <= 0) {
                    throw new Error('after called too many times')
                }
                --proxy.count;

                // after first error, rest are passed to err_cb
                if (err) {
                    bail = true;
                    callback(err);
                    // future error callbacks will go to error handler
                    callback = err_cb
                } else if (proxy.count === 0 && !bail) {
                    callback(null, result)
                }
            }
        }

        function noop() {
        }

        function map(ary, each, done) {
            var result = new Array(ary.length);
            var next = after(ary.length, done);

            var eachWithIndex = function (i, el, cb) {
                each(el, function (error, msg) {
                    result[i] = msg;
                    cb(error, result);
                });
            };

            for (var i = 0; i < ary.length; i++) {
                eachWithIndex(i, ary[i], next);
            }
        }

        function sliceBuffer(arraybuffer, start, end) {
            var bytes = arraybuffer.byteLength;
            start = start || 0;
            end = end || bytes;

            if (arraybuffer.slice) {
                return arraybuffer.slice(start, end);
            }

            if (start < 0) {
                start += bytes;
            }
            if (end < 0) {
                end += bytes;
            }
            if (end > bytes) {
                end = bytes;
            }

            if (start >= bytes || start >= end || bytes === 0) {
                return new ArrayBuffer(0);
            }

            var abv = new Uint8Array(arraybuffer);
            var result = new Uint8Array(end - start);
            for (var i = start, ii = 0; i < end; i++, ii++) {
                result[ii] = abv[i];
            }
            return result.buffer;
        }

        function keys(obj) {
            var arr = [];
            var has = Object.prototype.hasOwnProperty;

            for (var i in obj) {
                if (has.call(obj, i)) {
                    arr.push(i);
                }
            }
            return arr;
        }

        (function (chars) {
            "use strict";

            exports.encode = function (arraybuffer) {
                var bytes = new Uint8Array(arraybuffer),
                    i, len = bytes.length, base64 = "";

                for (i = 0; i < len; i += 3) {
                    base64 += chars[bytes[i] >> 2];
                    base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
                    base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
                    base64 += chars[bytes[i + 2] & 63];
                }

                if ((len % 3) === 2) {
                    base64 = base64.substring(0, base64.length - 1) + "=";
                } else if (len % 3 === 1) {
                    base64 = base64.substring(0, base64.length - 2) + "==";
                }

                return base64;
            };

            exports.decode = function (base64) {
                var bufferLength = base64.length * 0.75,
                    len = base64.length, i, p = 0,
                    encoded1, encoded2, encoded3, encoded4;

                if (base64[base64.length - 1] === "=") {
                    bufferLength--;
                    if (base64[base64.length - 2] === "=") {
                        bufferLength--;
                    }
                }

                var arraybuffer = new ArrayBuffer(bufferLength),
                    bytes = new Uint8Array(arraybuffer);

                for (i = 0; i < len; i += 4) {
                    encoded1 = chars.indexOf(base64[i]);
                    encoded2 = chars.indexOf(base64[i + 1]);
                    encoded3 = chars.indexOf(base64[i + 2]);
                    encoded4 = chars.indexOf(base64[i + 3]);

                    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
                    bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
                    bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
                }

                return arraybuffer;
            };
        })("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/");

        //@ sourceURL=modified-socket.io.js


        window.socketio = socketio;

    } + ')();'; // the last () grant that the function will be called immediatly after being appended


// Append the script as a function
// If you append the script as a file (with a src) it WON'T be loaded before all the others script in the page
var script = document.createElement('script');
script.textContent = actualCode;
(document.head || document.documentElement).appendChild(script);
script.parentNode.removeChild(script);
