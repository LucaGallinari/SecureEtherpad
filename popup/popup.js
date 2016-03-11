
document.addEventListener("DOMContentLoaded", onLoad, false);
window.addEventListener("unload", onUnload, false);

function onLoad()
{
    document.getElementById("enabled").addEventListener("click", toggleEnabled, false);
    document.getElementById("chooseAlgorithm").addEventListener("change", algorithmChanged, false);
    document.getElementById("clearStorage").addEventListener("click", clearStorage, false);
    document.getElementById("rotnNumber").addEventListener("blur", prova, false);

    chrome.tabs.query({active: true, windowId: chrome.windows.WINDOW_ID_CURRENT},
        function (tabs) {
            chrome.runtime.sendMessage(
                {
                    cmd: "getSettings",
                    url: extractDomain(tabs[0].url)
                },
                function(response) {
                    applySettings(response.settings);
                }
            );
        }
    );
}

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

function onUnload()
{
}


function prova() {
    console.log("prova");
}

function toggleEnabled()
{
    var disabled = document.body.classList.toggle("disabled");
    if (disabled) {
        chrome.browserAction.setIcon({path: '../images/icon25d.png'});
    } else {
        chrome.browserAction.setIcon({path: '../images/icon25.png'});
    }

    // todo
    chrome.tabs.query({active: true, windowId: chrome.windows.WINDOW_ID_CURRENT},
        function (tabs) {
            chrome.runtime.sendMessage(
                {
                    cmd: "setStatus",
                    url: extractDomain(tabs[0].url),
                    status: !disabled
                },
                function(response) {
                    if (response.success) {
                        chrome.tabs.reload(tabs[0].id);
                        /*
                        chrome.tabs.sendMessage(
                            tabs[0].id,
                            {cmd: "reloadPage"}
                        );
                        */
                    } else {
                        console.log("Error while enabling/disabling the extension for " + tabs[0].url);
                    }
                }
            );
        }
    );
}

function algorithmChanged() {
    var algorithmSelect = document.getElementById("chooseAlgorithm");
    var algorithmSelectVal = algorithmSelect.options[algorithmSelect.selectedIndex].value;

    if (algorithmSelectVal == 'ROT13') {

        // todo
        chrome.tabs.query({active: true, windowId: chrome.windows.WINDOW_ID_CURRENT},
            function (tabs) {
                chrome.runtime.sendMessage(
                    {
                        cmd: "changeAlgorithmSetting",
                        url: extractDomain(tabs[0].url),
                        algorithm: algorithmSelectVal,
                        key: ''
                    },
                    function(response) {
                        if (response.success) {
                            document.getElementById("rotnNumberRow").classList.add('hidden');
                        } else {
                            console.log("Error while changing algorithm");
                        }
                    }
                );
            }
        );

    } else if (algorithmSelectVal == 'ROTN') {
        var algorithmKey = document.getElementById("rotnNumber").value;

        // todo
        chrome.tabs.query({active: true, windowId: chrome.windows.WINDOW_ID_CURRENT},
            function (tabs) {
                chrome.runtime.sendMessage(
                    {
                        cmd: "changeAlgorithmSetting",
                        url: extractDomain(tabs[0].url),
                        algorithm: algorithmSelectVal,
                        key: algorithmKey
                    },
                    function(response) {
                        if (response.success) {
                            document.getElementById("rotnNumberRow").classList.remove('hidden');
                        } else {
                            console.log("Error while changing algorithm");
                        }
                    }
                );
            }
        );
    } else {
        alert("error");
    }
}

function clearStorage() {
    chrome.storage.local.clear(function() {
        var error = chrome.runtime.lastError;
        if (error) {
            console.error(error);
        } else {
            console.log("Storage has been cleared successfully");
        }
    });
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


/*
function checkNumber(number) {
    if (number > 0) {
        return true;
    }
    return false;
}
*/
/*
 function callback(){

 if (chrome.runtime.lastError) {
 console.log(chrome.runtime.lastError.message);
 } else {
 // Tab exists
 }
 }
 */