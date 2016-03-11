//// Set a cookie
//function setCookie(name, value, hours) {
//    var exp = new Date();
//    exp.setTime(exp.getTime() + (hours * 60 * 60 * 1000));
//    document.cookie = name + "=" + value + "; expires=" + exp.toGMTString() + "; path=/";
//}
//
//// Get the content in a cookie
//function getCookie(name) {
//    // Search for the start of the goven cookie
//    var prefix = name + "=",
//        cookieStartIndex = document.cookie.indexOf(prefix),
//        cookieEndIndex;
//
//    // If the cookie is not found return null
//    if (cookieStartIndex == -1) {
//        return null;
//    }
//
//    // Look for the end of the cookie
//    cookieEndIndex = document.cookie.indexOf(";", cookieStartIndex + prefix.length);
//    if (cookieEndIndex == -1) {
//        cookieEndIndex = document.cookie.length;
//    }
//
//    // Extract the cookie content
//    return unescape(document.cookie.substring(cookieStartIndex + prefix.length, cookieEndIndex));
//}
//
//// Remove a cookie
//function deleteCookie(name) {
//    setCookie(name, null, -60);
//}
//
//messageListener = function(request, sender, sendResponse) {
//    var newStatus;
//
//    if (request.cmd == "getStatus") {
//        newStatus = getStatus(request.domain);
//    } else if (request.cmd == "toggleStatus") {
//        newStatus = toggleStatus();
//    } else if (request.cmd == "setStatus") {
//        newStatus = setStatus(request.status, request.domain);
//    } else if (request.cmd == "reloadPage") {
//        location.reload();
//    }
//
//    // Respond with the current status
//    sendResponse({
//        status: newStatus
//    });
//};
//
//// Get current state
//getStatus = function() {
//    return getCookie("encryption_enabled") == true;
//};
//
//// Toggle state
//toggleStatus = function() {
//    return setStatus(!getStatus());
//};
//
//// Set the state
//setStatus = function(status) {
//    if (status == true) {
//        setCookie("encryption_enabled", true, 24);
//    } else {
//        deleteCookie("encryption_enabled");
//    }
//    return status;
//};
//
//chrome.runtime.onMessage.addListener(messageListener);