// Inspects URLs of open tabs, to find the DVD Queue or MyList tab
function getNetflixTabID(isDvd, callback)
{
    var queryInfo;
    if (isDvd)
    {
        queryInfo = { url: ["http://*.netflix.com/Queue*", "https://*.netflix.com/Queue*"] };
    }
    else
    {
        queryInfo = { url: ["http://*.netflix.com/*my-list*",  "https://*.netflix.com/*my-list*"] };
    }

    console.log("Calling chrome.tabs.query");
    var id;
    chrome.tabs.query(queryInfo, function (tabs)
    {
        if (tabs == null || tabs.length < 1)
        {
            if (isDvd)
            {
                window.alert("Could not find an open tab with 'netflix.com' and 'Queue' in the URL");
                return;
            }
            else
            {
                var response = window.confirm("Could not find an open tab with 'netflix.com' and 'my-list' in the URL.  If you proceed, NetQFixer will assume your streaming MyList is empty.");
                if (response)
                {
                    id = null;
                }
                else
                {
                    return;
                }
            }
        }
        else
        {
            id = tabs[0].id;
        }

        console.log("chrome.tabs.query found tab id " + (id == null) ? "(none)" : id);
        callback(id);
    });
}

// Message communication:
//
// (1) Extension injects NetQFixer_MyList_Content_Script.js to MyList TAB and
//      NetQFixer_DvdQ_Content_Script.js to DVD Queue tab
// (2) MyList TAB sends message to EXTENSION containing streamingMovieAnchors
// (3) EXTENSION sends message to DVD Queue TAB containing streamingMovieAnchors

console.log("Calling onClicked.addListener...");
chrome.browserAction.onClicked.addListener(function (tab)
{
    console.log("NetQFixer browser action listener is invoked");
    debugger;

    // Find the my-list tab
    getNetflixTabID(false, function (myListTabID)
    {
        // Find the dvd Queue tab
        getNetflixTabID(true, function (dvdQueueTabID)
        {
            if (myListTabID != null)
            {
                chrome.runtime.onMessage.addListener(
                    function (request, sender, sendResponse)
                    {
                        // (2) Extension receives message from MyList tab containing streamingMovieAnchors
                        console.log("(2) NetQFixer browser action received message from MyList tab; sending streamingMovieAnchors to DVD Queue tab next");

                        // (3) EXTENSION sends message to DVD Queue TAB containing streamingMovieAnchors
                        console.log("(3) EXTENSION sends message to DVD Queue TAB containing streamingMovieAnchors");
                        chrome.tabs.sendMessage(
                            dvdQueueTabID,
                            request,            // Contains streamingMovieAnchors field
                            null);              // No response callback
                    });

                // (1) When the browser action icon is clicked, inject content scripts into both pages

                // --- (MyList tab)
                console.log("About to inject into the MyList tab");
                chrome.tabs.executeScript(
                    myListTabID,
                    { file: "NetQFixer_Common_Content_Script.js" }
                    );
                chrome.tabs.executeScript(
                    myListTabID,
                    { file: "NetQFixer_MyList_Content_Script.js" }
                    );
            }

            // (1) When the browser action icon is clicked, inject content scripts into both pages
            // --- (DvdQ tab)
            console.log("About to inject into the DvdQ tab");
            chrome.tabs.executeScript(
                dvdQueueTabID,
                { file: "NetQFixer_Common_Content_Script.js" }
                );
            chrome.tabs.executeScript(
                dvdQueueTabID,
                { file: "NetQFixer_DvdQ_Content_Script.js" }
                );

            if (myListTabID == null)
            {
                // (3) EXTENSION sends message to DVD Queue TAB containing an empty streamingMovieAnchors
                // b/c there's no MyList tab
                console.log("(3) EXTENSION sends message to DVD Queue TAB containing EMPTY streamingMovieAnchors");
                chrome.tabs.sendMessage(
                    dvdQueueTabID,
                    { streamingMovieAnchors: [] },      // Empty streamingMovieAnchors hash
                    null);                              // No response callback
            }
        });
    });
});
