console.log("NetQFixer_DvdQ_Content_Script.js says hello");

// NOTE: If you change this URL, remember to add the URL to the manifest.js
// permissions list
//
// Gave "bad gateway" error for a month on individual title pages
//var STREAMING_TITLE_URL_PREFIX = "http://instantwatcher.com/title/";
//
// Has detail pages for titles NOT on streaming (with links that go to bogus
// streaming pages on netflix for the title but with no play button), and missing
// detail pages for titles that ARE on streaming
//var STREAMING_TITLE_URL_PREFIX = "http://www.flixlist.co/titles/";
//
// Changed URLS to go to "title" followed by name of movie instead of ID
//var STREAMING_TITLE_URL_PREFIX = "https://www.allflicks.net/movies/";
var STREAMING_TITLE_URL_PREFIX = "https://www.netflix.com/title/";



main();

// Called first, globally
function main()
{
    getStreamingMovieAnchors();    // Its async await does the rest
}

function getStreamingMovieAnchors()
{
    // Wait for message from extension containing the list of movies available for
    // streaming (as calculated by the MyList tab).
    chrome.runtime.onMessage.addListener(
      function (request, sender, sendResponse)
      {
          console.log("(3) DVD Queue TAB has received streamingMovieAnchors from EXTENSION");

          // Now that we have the streaming queue info, do "everything else"
          var dvdMovieAnchors = findMovieAnchors(true /* DVD */, document);
          adjustDvdMovieAnchors(dvdMovieAnchors, request.streamingMovieAnchors);
      });
}

// Now that the dvd & mylist anchor hashes are populated, adjust the DVD queue
// HTML anchors text accordingly
function adjustDvdMovieAnchors(dvdMovieAnchors, streamingMovieAnchors)
{
    // On MyList?  Set to green
    adjustMyListedDvdMovieAnchors(dvdMovieAnchors, streamingMovieAnchors);

    // Not on MyList?  Set to black (unstreamable) or red (streamable)
    adjustUnlistedDvdMovieAnchors(dvdMovieAnchors);
}

// Ensures anything in BOTH DVD queue & MyList is marked green in DVD Queue
function adjustMyListedDvdMovieAnchors(dvdMovieAnchors, streamingMovieAnchors)
{
    for (var i = 0; i < streamingMovieAnchors.length; i++)
    {
        var movieID = streamingMovieAnchors[i];
        var dvdMovieAnchorArr = dvdMovieAnchors[movieID];
        if (dvdMovieAnchorArr == undefined)
        {
            continue;
        }

        // Set all anchors for this movieID to green
        for (var j = 0; j < dvdMovieAnchorArr.length; j++)
        {
            adjustDvdMovieAnchor(dvdMovieAnchorArr[j], "green");
        }

        // Now that it's green, don't look it up again
        delete dvdMovieAnchors[movieID];
    }
}

// After MyListed movies have been removed from dvdMovieAnchors, this looks
// through the rest of them, and makes an HTTP request for each one to check
// if it's available for streaming.  If so, adjust the text in the DVD Queue accordingly
function adjustUnlistedDvdMovieAnchors(dvdMovieAnchors)
{
    var nTimes = 1;
    for (var movieID in dvdMovieAnchors)
    {
        if (dvdMovieAnchors[movieID] == undefined)
        {
            continue;
        }

        var dvdMovieAnchorArr = dvdMovieAnchors[movieID];

        // Construct URL to test whether this movie ID exists in
        // the streaming section of the Netflix site
        var streamingURL = STREAMING_TITLE_URL_PREFIX + movieID;

        // Using setTimeout to ensure HTTP requests are made
        // with sufficient delay between them so the web site doesn't get anxious
        nTimes++;
        window.setTimeout(
            adjustUnlistedDvdMovieAnchorFromStreamingUrlAtNetflixSite,
            200 * nTimes,
            streamingURL,
            dvdMovieAnchorArr,
            movieID);
    }
}

// EXTENSION gives us raw response text when checking one title's availability for
// streaming.  This wraps an HTMLDocument around it for easier parsing
function getHtmlDocFromText(aHTMLString)
{
    var doc = document.implementation.createHTMLDocument("example");
    doc.documentElement.innerHTML = aHTMLString;
    return doc;
}


// Adjusts a single DVD movie anchor not on MyList to either red or black by
// using Netflix's own streaming site to see if the title is available
function adjustUnlistedDvdMovieAnchorFromStreamingUrlAtNetflixSite(url, dvdMovieAnchorArr, netfxMovieID)
{
    //console.log("DvdQ: Calling chrome.runtime.sendmessage to make GET request to " + url);
    chrome.runtime.sendMessage({
        method: 'GET',
        action: 'xhttp',
        url: url
        //data: 'q=something'
    }, function (responseText)
    {
        //console.log("DvdQ: Received response from background script for url " + url);
        if (responseText != null)
        {
            //console.log("Successful response received from " + url);

            // Wrap an HTML Doc around the response text the EXTENSION procured for us
            var htmlDoc = getHtmlDocFromText(responseText);

            var color;
            if (existsWatchAnchorForMovieID(htmlDoc, netfxMovieID))
            {
                color = "red";
            }
            else
            {
                color = "black";
            }

            // Set all anchors for this movieID to color
            for (var j = 0; j < dvdMovieAnchorArr.length; j++)
            {
                adjustDvdMovieAnchor(dvdMovieAnchorArr[j], color);
            }
        }
    });
}

// Returns a boolean indicating whether the given movie ID is available for streaming.
// It does this by looking through htmlDoc for any anchors with a class known
// to be a play link.  Note: Cannot search for all anchors with an HREF containing
// the movie ID.  Even though the debugger shows the anchor looks like this:
//
// <a tabindex="0" to="[object Object]" role="link" aria-label="Play" class="overviewPlay playLink" // href="/watch/80098100?trackId=14277281&amp;tctx=0%2C0%2C8ec4b53f-4c35-4795-8934-ce0ea1366aea-// 158964263" data-reactid="58">
//
// the href property is for some reason the empty string(!!).
//
function existsWatchAnchorForMovieID(htmlDoc, netfxMovieID)
{
    var anchorNodeList = htmlDoc.getElementsByTagName("A");
    for (var i = 0; i < anchorNodeList.length; i++)
    {
        if (anchorNodeList[i].className.indexOf("play") != -1)
        {
            return true;
        }
    }

    return false;
}


// Given a DVD Queue anchor, bold it and change its color
function adjustDvdMovieAnchor(dvdMovieAnchorNode, color)
{
    // Set up <SPAN style="color:blah"><B>
    var spanTag = document.createElement("SPAN");
    spanTag.style.color = color;
    var boldTag = document.createElement("B");
    spanTag.appendChild(boldTag);

    // Get the anchor's text
    var textElement = dvdMovieAnchorNode.childNodes[0];

    // Temporarily remove text from anchor
    textElement = dvdMovieAnchorNode.removeChild(textElement);

    // Make text the child of the bold tag instead
    boldTag.appendChild(textElement);

    // Put span tag where text used to be
    dvdMovieAnchorNode.appendChild(spanTag);
}

// ************** OLD, UNUSED FUNCTIONS ************** 

// OLD: This was used for checking third-party sites to see if a play-link
// was available from them to netflix

// Returns a boolean indicating whether the given movie ID is available for streaming.
// It does this by looking through htmlDoc for any anchors containing an href
// that implies the movie ID is indeed streamable.  Assumption is that the
// caller made a request to a page (stored in htmlDoc) that would have such an
// anchor iff the movie is streamable.
function existsAnchorForMovieID(htmlDoc, netfxMovieID)
{
    var anchorNodeList = htmlDoc.getElementsByTagName("A");
    for (var i = 0; i < anchorNodeList.length; i++)
    {
        if (anchorNodeList[i].childNodes.length == 0)
        {
            continue;
        }
        var anchorDisplayNode = anchorNodeList[i].childNodes[0];
        if (anchorDisplayNode == null)
        {
            continue;
        }
        var anchorDisplayText = anchorDisplayNode.nodeValue;
        if (anchorDisplayText == null || anchorDisplayText == "")
        {
            continue;
        }

        // We found an anchor with text.  Is it for this movie?
        var href = anchorNodeList[i].href;
        var hrefComponents = href.split("/");
        for (var j = 0; j < hrefComponents.length; j++)
        {
            if (hrefComponents[j] == netfxMovieID)
            {
                return true;
            }
        }
    }

    // Still here?  Didn't find an anchor for the movie
    return false;
}

console.log("NetQFixer_DvdQ_Content_Script.js says goodbye");
