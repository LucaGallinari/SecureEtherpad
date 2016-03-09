
var scriptInserted = false;

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    insertPageAction(tabId, tab.url);
});


chrome.tabs.onCreated.addListener(function (tab) {
    insertPageAction(tab.id, tab.url);
});

/**
 * Check if the page is correct and insert the page action icon
 */
function insertPageAction(tabId, url)
{
    // console.log(url);
    if (url.toLowerCase().indexOf("oasis.sandstorm.io") > -1) {
        if (!scriptInserted) {
            chrome.pageAction.show(tabId);
            //chrome.tabs.executeScript(null, {file: "scripts/jquery-2.2.0.min.js"});
            //chrome.tabs.executeScript(null, {file: "scripts/example.js"});
            scriptInserted = true;
        }
    }
}

chrome.webRequest.onBeforeRequest.addListener(
    function(details){
        console.log(details.requestBody);
    },
    {urls: ["<all_urls>"]},
    ["blocking", "requestBody"]
);