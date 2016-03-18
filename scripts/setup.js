/**
 * setup.js
 *
 * @category scripts
 * @package  SecureEtherpad
 * @author   Luca Gallinari <luke.gallinari@gmail.com>
 */

console.log(new Date().getTime() + ": Sending async message to retrieve settings for this tab. ");

chrome.runtime.sendMessage(
    {cmd: "getSettings"},
    /**@param response {{settings:object}}*/
    function (response) {

        console.log(new Date().getTime() + ": Received settings for this tab.");

        var script = document.createElement('script');

        if (response) {
            script.textContent = '(' +
                /**
                 * @param enabled
                 * @param algorithm
                 * @param key
                 */
                function(enabled, algorithm, key) {
                    window.secureEtherpadObject = {
                        enabled: enabled,
                        algorithm: algorithm,
                        secureKey: key
                    };
                } + ')' +
                '("' +response.settings.enabled+ '", "' +response.settings.algorithm+ '", "' +response.settings.key+ '");';
        } else {
            // error, so disable the extensions for this tab
            script.textContent = '(' +
                function() {
                    window.secureEtherpadObject = {
                        enabled: 0
                    };
                    alert(
                        "Error while retrieving the settings for the current tab URL. " +
                        "The extension has been disabled. " +
                        "Try to reload the page."
                    );
                } + ')();';

        }

        (document.head||document.documentElement).appendChild(script);
        script.parentNode.removeChild(script);
    }
);