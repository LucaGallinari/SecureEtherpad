/**
 * setup.js
 *
 * @category scripts
 * @package  SecureEtherpad
 * @author   Luca Gallinari <luke.gallinari@gmail.com>
 */

/**
 * Create a cookie
 * @param name
 * @param value
 * @param days
 * @see http://stackoverflow.com/a/24103596/4670153
 */
function createCookie(name, value, days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toGMTString();
    }
    document.cookie = name + "=" + value + expires + "; path=/";
}

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

chrome.runtime.sendMessage(
    {cmd: "getSettings"},
    /**@param response {{settings:object}}*/
    function (response) {
        if (response) {
            console.log("Settings for current url loaded");
            createCookie('secureEtherpadEnabled', response.settings.enabled, 1);
            createCookie('secureEtherpadAlgorithm', response.settings.algorithm, 1);
            createCookie('secureEtherpadKey', response.settings.key, 1);
            console.log(readCookie('secureEtherpadEnabled'));
            console.log(readCookie('secureEtherpadAlgorithm'));
            console.log(readCookie('secureEtherpadKey'));
        } else {
            // error, so disable the extensions for this tab
            createCookie('secureEtherpadEnabled', false, 1);
            alert("Error while retrieving the settings for the current tab URL. Try to reload the page.");
        }
    }
);