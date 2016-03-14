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

chrome.runtime.sendMessage(
    {cmd: "getSettings"},
    /**@param response {{settings:object}}*/
    function (response) {
        if (response) {
            createCookie('secureEtherpadEnabled', response.settings.enabled, 1);
            createCookie('secureEtherpadAlgorithm', response.settings.algorithm, 1);
            createCookie('secureEtherpadKey', response.settings.key, 1);
        } else {
            // error, so disable the extensions for this tab
            createCookie('secureEtherpadEnabled', false, 1);
            alert("Error while retrieving the settings for the current tab URL. Try to reload the page.");
        }
    }
);