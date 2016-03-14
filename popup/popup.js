/**
 * popup.js
 *
 * @category popup
 * @package  SecureEtherpad
 * @author   Luca Gallinari <luke.gallinari@gmail.com>
 */

document.addEventListener("DOMContentLoaded", onLoad, false);

/**
 * Add event listeners and retrieve settings for the current tab url
 */
function onLoad() {
    document.getElementById("enabled").addEventListener("click", toggleEnabled, false);
    document.getElementById("saveChanges").addEventListener("click", saveChanges, false);
    document.getElementById("clearStorage").addEventListener("click", clearStorage, false);
    document.getElementById("chooseAlgorithm").addEventListener("change", setupPopupForm, false);

    chrome.tabs.query({active: true, windowId: chrome.windows.WINDOW_ID_CURRENT},
        function (tabs) {
            chrome.runtime.sendMessage(
                {
                    cmd: "getSettings",
                    url: extractDomain(tabs[0].url)
                },
                function (response) {
                    if (response) {
                        applySettings(response.settings);
                    } else {
                        alert("Error while retrieving the settings for the current tab URL.")
                    }
                }
            );
        }
    );
}

/**
 * Setup the popup box based on the settings for the current tab url
 * @param settings {object}
 */
function applySettings(settings) {
    if (settings.hasOwnProperty('enabled')) {
        if (settings.enabled) {
            document.body.classList.remove("disabled");
        } else {
            document.body.classList.add("disabled");
        }
    } else {
        document.body.classList.add("disabled");
    }

    if (settings.hasOwnProperty('algorithm')) {
        document.getElementById("chooseAlgorithm").value = settings.algorithm;

        if (settings.algorithm == 'ROTN') {
            document.getElementById("rotnNumberRow").classList.remove('hidden');
        }
    }
}

/**
 * Modify the popup form based on the selected algorithm.
 */
function setupPopupForm() {
    var algorithmSelect = document.getElementById("chooseAlgorithm");
    var algorithmSelectVal = algorithmSelect.options[algorithmSelect.selectedIndex].value;

    switch (algorithmSelectVal) {
        case 'ROT13':
            document.getElementById("rotnNumberRow").classList.add('hidden');
            break;
        case 'ROTN':
            document.getElementById("rotnNumberRow").classList.remove('hidden');
            break;
        default:
            alert("You choose a non-existent algorithm");
            break;
    }
}

/**
 * Event related function fired when the save button is clicked.
 * Communicate to the background page that the extension must be enabled/disabled for the current tab url.
 */
function toggleEnabled() {
    // if the ext is disabled it must be enabled
    var enabled = document.body.classList.contains("disabled");

    chrome.tabs.query({active: true, windowId: chrome.windows.WINDOW_ID_CURRENT},
        function (tabs) {
            chrome.runtime.sendMessage(
                {
                    cmd: "setStatus",
                    url: extractDomain(tabs[0].url),
                    enabled: enabled
                },
                function (response) {
                    if (response.success) {
                        if (document.body.classList.toggle("disabled")) {
                            chrome.browserAction.setIcon({path: '../images/icon25d.png'});
                        } else {
                            chrome.browserAction.setIcon({path: '../images/icon25.png'});
                        }
                        chrome.tabs.reload(tabs[0].id);
                    } else {
                        console.log("Error while enabling/disabling the extension for " + tabs[0].url);
                    }
                }
            );
        }
    );
}

/**
 * Event related function fired when the save button is clicked.
 * After some checks on the input fields it communicate to the background page the settings for the current url.
 *
 * @see sendChangeAlgorithmMessage()
 */
function saveChanges() {
    var algorithmSelect = document.getElementById("chooseAlgorithm");
    var algorithmSelectVal = algorithmSelect.options[algorithmSelect.selectedIndex].value;

    switch (algorithmSelectVal) {
        case 'ROT13':
            sendChangeAlgorithmMessage(algorithmSelectVal, 13);
            break;
        case 'ROTN':
            var algorithmKey = document.getElementById("rotnNumber").value;
            if (!checkPositiveNumber(algorithmKey)) {
                alert("The key must be a number");
                return;
            }
            sendChangeAlgorithmMessage(algorithmSelectVal, algorithmKey);
            break;
        default:
            alert("You choose a non-existent algorithm");
            break;
    }
}

/**
 * Remove all saved settings from the storage.
 */
function clearStorage() {
    chrome.storage.local.clear(function () {
        if (chrome.runtime.lastError) {
            alert("An error occured while clearing the storage");
        } else {
            chrome.tabs.reload(tabs[0].id);
        }
    });
}

/**
 * Communicate to the background page that settings have been changed for the current tab url.
 * @param algorithm {string}
 * @param key {int}
 */
function sendChangeAlgorithmMessage(algorithm, key) {
    chrome.tabs.query({active: true, windowId: chrome.windows.WINDOW_ID_CURRENT},
        function (tabs) {
            chrome.runtime.sendMessage(
                {
                    cmd: "changeAlgorithmSetting",
                    url: extractDomain(tabs[0].url),
                    algorithm: algorithm,
                    key: key
                },
                function (response) {
                    if (response) {
                        if (response.success) {
                            chrome.tabs.reload(tabs[0].id);
                        } else {
                            console.log("Error while changing algorithm");
                        }
                    }
                }
            );
        }
    );
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
 * Check if "num" is a positive valid number
 * @param num
 * @returns {boolean}
 */
function checkPositiveNumber(num) {
    return !(isNaN(num) || num < 0);
}
