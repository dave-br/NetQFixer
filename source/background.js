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
// (4) repeeatedly: DVD Queue TAB sends message to EXTENSION for each URL it wants
//      to access to determine if a movie ID is available for streaming.  Extension
//      must make this request on behalf of DVD Queue TAB, b/c DVD Queue TAB is an
//      https request to the netflix queue page, whereas the URL that determines whether
//      a title is available for streaming may only be HTTP, which Chrome disallows
//      requesting from an HTTPS page for security reasons.

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
                        if (request.streamingMovieAnchors != undefined)
                        {
                            // (2) Extension receives message from MyList tab containing streamingMovieAnchors
                            console.log("(2) NetQFixer browser action received message from MyList tab; sending streamingMovieAnchors to DVD Queue tab next");

                            // (3) EXTENSION sends message to DVD Queue TAB containing streamingMovieAnchors
                            console.log("(3) EXTENSION sends message to DVD Queue TAB containing streamingMovieAnchors");
                            chrome.tabs.sendMessage(
                                dvdQueueTabID,
                                request,            // Contains streamingMovieAnchors field
                                null);              // No response callback
                        }

                            // (4) DVD Queue TAB sends message to EXTENSION to go to URL to check one movie's availability
                            /**
                             * Possible parameters for request:
                             *  action: "xhttp" for a cross-origin HTTP request
                             *  method: Default "GET"
                             *  url   : required, but not validated
                             *  data  : data to send in a POST request
                             *
                             * The sendResponse function is called upon completion of the request */
                        else
                        {
                            //console.log("BACKGROUND script listener invoked for message other than (2) initialization");
                            if (request.action == "xhttp")
                            {
                                //console.log("BACKGROUND script listener invoked for xhttp message for url: " + request.url);
                                var xhttp = new XMLHttpRequest();
                                var method = request.method ? request.method.toUpperCase() : 'GET';

                                xhttp.onload = function ()
                                {
                                    sendResponse(xhttp.responseText);
                                };
                                xhttp.onerror = function ()
                                {
                                    // Do whatever you want on error. Don't forget to invoke the
                                    // callback to clean up the communication port.
                                    sendResponse(null);
                                };
                                xhttp.open(method, request.url, true);
                                if (method == 'POST')
                                {
                                    xhttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                                }
                                xhttp.send(xhttp);
                                return true; // prevents the callback from being called too early on return
                            }
                        }
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
