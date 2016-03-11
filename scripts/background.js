
chrome.runtime.onStartup.addListener(function() {
    loadSettings();
});

chrome.tabs.onCreated.addListener(function() {
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    updateIconForTab(tab);
});

chrome.tabs.onActivated.addListener(function(info) {
    chrome.tabs.get(info.tabId, function(tab) {
        updateIconForTab(tab);
    });
});

/*
chrome.runtime.onInstalled.addListener(function() {
    changeAlgorithmSetting('ROT13');
});
*/

// it's an object, not an array (this is important to avoid a lot of problems)
var settings = {};

function changeAlgorithmSetting(url, algorithm, key) {
    switch(algorithm) {
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

    if (settings[url]) {
        settings[url].algorithm = algorithm;
        settings[url].key = key;
    } else {
        settings[url] = {
            'enabled': false,
            'algorithm': algorithm,
            'key': key
        }
    }

    console.log("Algorithm changed to " + algorithm + " with key " + key + " for " + url);

    saveSettings();

    return true;
}

function getStatus(url) {
    if (settings.hasOwnProperty(url) && settings[url]) {
        if (settings[url].enabled) {
            return true;
        }
    }
    return false;
}

function setStatus(url, status) {

    if (settings[url]) {
        settings[url].enabled = status;
    } else {
        settings[url] = {
            'url': url,
            'enabled': status,
            'algorithm': 'ROT13',
            'key': ''
        };
    }

    console.log("Plugin " + (status ? 'enabled' : 'disabled') + " for " + url);

    saveSettings();

    return true;
}

function getSettings(url) {
    if (!settings[url]) {
        settings[url] = {
            'url': url,
            'enabled': false,
            'algorithm': 'ROT13',
            'key': ''
        };
    }
    // there is no need to save the default value in the storage
    return settings[url];
}

function saveSettings() {
    chrome.storage.local.set({settings: settings}, function() {
        if (chrome.runtime.lastError) {
            console.log(chrome.runtime.lastError.message);
        } else {
            console.log('Settings saved');
        }
    });
}

function loadSettings() {
    chrome.storage.local.get(['settings'], function(result) {
        if (result.settings) {
            settings = result.settings;
        } else {
            settings = {};
        }
    });
}

function updateIconForTab(tab) {
    if (settings) {
        if (tab.hasOwnProperty('url') && tab.url) {
            var urlDomain = extractDomain(tab.url);
            if (settings.hasOwnProperty(urlDomain) && settings[urlDomain]) {
                if (settings[urlDomain].enabled) {
                    chrome.browserAction.setIcon({path: '../images/icon25.png'});
                } else {
                    chrome.browserAction.setIcon({path: '../images/icon25d.png'});
                }
            } else {
                chrome.browserAction.setIcon({path: '../images/icon25d.png'});
            }
        }
    } else {
        console.log("No settings found for the tab");
    }
}

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

messageListener = function(request, sender, sendResponse) {
    //todo: switch
    if (request.cmd == "getSettings") {
        sendResponse({
            settings: getSettings(request.url)
        });
    } else if (request.cmd == "getStatus") {
        sendResponse({
            status: getStatus(extractDomain(sender.tab.url))
        });
    } else if (request.cmd == "setStatus") {
        sendResponse({
            success: setStatus(request.url, request.status)
        });
    } else if (request.cmd == "changeAlgorithmSetting") {
        sendResponse({
            success: changeAlgorithmSetting(request.url, request.algorithm, request.key)
        });
    }
};

chrome.runtime.onMessage.addListener(messageListener);

loadSettings();



/*
chrome.storage.onChanged.addListener(function(changes, namespace) {
    for (var key in changes) {
        var storageChange = changes[key];
        console.log('Storage key "%s" in namespace "%s" changed. ' +
            'Old value was "%s", new value is "%s".',
            key,
            namespace,
            storageChange.oldValue,
            storageChange.newValue);
    }
});
*/