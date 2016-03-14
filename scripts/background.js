/**
 * background.js
 *
 * @category scripts
 * @package  SecureEtherpad
 * @author   Luca Gallinari <luke.gallinari@gmail.com>
 */

var DEBUG = false;

// it's an object, not an array (this is important to avoid a lot of problems)
var SETTINGS = {};

/**
 *
 * @param url {string}
 * @param algorithm {string}
 * @param key {int}
 * @returns {boolean}
 */
function changeAlgorithmSetting(url, algorithm, key) {
    switch (algorithm) {
        case 'ROT13':
            key = 13;
            break;
        case 'ROTN':
            break;
        default:
            console.log('Invalid algorithm!');
            return false;
            break;
    }

    if (SETTINGS[url]) {// already existent settings
        SETTINGS[url].algorithm = algorithm;
        SETTINGS[url].key = key;
    } else {// non existent settings for this url
        SETTINGS[url] = {
            'enabled': false,
            'algorithm': algorithm,
            'key': key
        }
    }

    if (DEBUG) {
        console.log("Algorithm changed to " + algorithm + " with key " + key + " for " + url);
    }

    saveSettings();

    return true;
}

/**
 * Check if the extension is enabled/disabled for the given "url".
 * @param url {string}
 * @returns {boolean}
 * @see setStatus
 */
function getStatus(url) {
    if (SETTINGS.hasOwnProperty(url) && SETTINGS[url]) {
        if (SETTINGS[url].enabled) {
            return true;
        }
    }
    return false;
}

/**
 * Enable/disable the extension for a given "url"
 * @param url {string}
 * @param status {boolean}
 * @returns {boolean}
 * @see getStatus
 */
function setStatus(url, status) {
    if (SETTINGS[url]) {
        SETTINGS[url].enabled = status;
    } else {
        SETTINGS[url] = {
            'url': url,
            'enabled': status,
            'algorithm': 'ROT13',
            'key': ''
        };
    }

    if (DEBUG) {
        console.log("Plugin " + (status ? 'enabled' : 'disabled') + " for " + url);
    }

    saveSettings();
    return true;
}

/**
 * Retrieve setttings for the given "url"
 * @param url {string}
 * @returns {object}
 * @see saveSettings
 * @see loadSettings
 */
function getSettings(url) {
    // if settings for this url does not exists, create a new default settings for it
    if (!SETTINGS[url]) {
        SETTINGS[url] = {
            'url': url,
            'enabled': false,
            'algorithm': 'ROT13',
            'key': ''
        };
    }
    // there is no need to save the default value in the storage
    return SETTINGS[url];
}

/**
 * Save settings in the storage
 * @see loadSettings
 * @see getSettings
 */
function saveSettings() {
    chrome.storage.local.set({settings: SETTINGS}, function () {
        if (DEBUG) {
            if (chrome.runtime.lastError) {
                console.log(chrome.runtime.lastError.message);
            } else {
                console.log('Settings saved');
            }
        }
    });
}

/**
 * Load settings from the storage
 * @see saveSettings
 * @see getSettings
 */
function loadSettings() {
    chrome.storage.local.get(
        ['settings'],
        /**@param {{settings:object}} result*/
        function (result) {
            if (result.settings) {
                SETTINGS = result.settings;
                if (DEBUG) {
                    console.log("Loaded settings:");
                    console.log(SETTINGS);
                }
            } else {
                SETTINGS = {};
            }
        }
    );
}

/**
 * Set the correct icon the given "tab"
 * @param tab {object}
 */
function updateIconForTab(tab) {
    if (SETTINGS) {
        if (tab.hasOwnProperty('url') && tab.url) {
            var urlDomain = extractDomain(tab.url);
            if (SETTINGS.hasOwnProperty(urlDomain) && SETTINGS[urlDomain]) {
                if (SETTINGS[urlDomain].enabled) {
                    chrome.browserAction.setIcon({path: '../images/icon25.png'});
                } else {
                    chrome.browserAction.setIcon({path: '../images/icon25d.png'});
                }
            } else {
                chrome.browserAction.setIcon({path: '../images/icon25d.png'});
            }
        }
    } else {
        if (DEBUG) {
            console.log("No settings found for the tab");
        }
    }
}

/**
 * Extract the domain string from a given "url".
 * @param url
 * @returns {string}
 * @see http://stackoverflow.com/questions/8498592/extract-root-domain-name-from-string
 */
function extractDomain(url) {
    var domain;
    //find & remove protocol (http, ftp, etc.) and get domain
    if (url.indexOf("://") > -1) {
        domain = url.split('/')[2];
    }
    else {
        domain = url.split('/')[0];
    }

    //find & remove port number
    domain = domain.split(':')[0];

    return domain;
}

/**
 * Based on the given "request", it calls the correct function.
 * @param request {object}
 * @param sender {object}
 * @param callback {function}
 */
function messageListener(request, sender, callback) {
    switch(request.cmd) {
        case "getSettings":
            var url;
            if (request.hasOwnProperty('url')) {
                url = request.url;
            } else {
                url = extractDomain(sender.tab.url);
            }
            callback({
                settings: getSettings(url)
            });
            break;
        case "getStatus":
            callback({
                enabled: getStatus(extractDomain(sender.tab.url))
            });
            break;
        case "setStatus":
            callback({
                success: setStatus(request.url, request.enabled)
            });
            break;
        case "changeAlgorithmSetting":
            callback({
                success: changeAlgorithmSetting(request.url, request.algorithm, request.key)
            });
            break;
    }
}

chrome.runtime.onMessage.addListener(messageListener);

chrome.runtime.onStartup.addListener(function startup() {
    console.log("startup");
    loadSettings();
});

chrome.tabs.onCreated.addListener(function created() {
    console.log("created");
});

chrome.tabs.onUpdated.addListener(function updated(tabId, changeInfo, tab) {
    updateIconForTab(tab);
});

chrome.tabs.onActivated.addListener(function activated(info) {
    chrome.tabs.get(info.tabId, function (tab) {
        updateIconForTab(tab);
    });
});

/**
 * Debug every changes made to the storage
 */
chrome.storage.onChanged.addListener(function changed(changes, namespace) {
    if (DEBUG) {
        for (var key in changes) {
            if (changes.hasOwnProperty(key)) {
                var storageChange = changes[key];
                console.log('Storage key "%s" in namespace "%s" changed. ' +
                    'Old value was "%s", new value is "%s".',
                    key,
                    namespace,
                    storageChange.oldValue,
                    storageChange.newValue);
            }
        }
    }
});

loadSettings();