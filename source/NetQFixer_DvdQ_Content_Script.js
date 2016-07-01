console.log("NetQFixer_DvdQ_Content_Script.js says hello");

var STREAMING_TITLE_URL_PREFIX = "https://www.allflicks.net/movies/";

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
            adjustUnlistedDvdMovieAnchorFromStreamingUrl,
            200 * nTimes,
            streamingURL,
            dvdMovieAnchorArr,
            movieID);
    }
}

// Adjusts a single DVD movie anchor not on MyList to either red or black
function adjustUnlistedDvdMovieAnchorFromStreamingUrl(url, dvdMovieAnchorArr, netfxMovieID)
{
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function ()
    {
        if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200)
        {
            console.log("Successful response received from " + url);
            var color;
            if (existsAnchorForMovieID(xhr.response, netfxMovieID))
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
        };
    }
    xhr.responseType = "document";
    xhr.open("GET", url, true /* async */);
    xhr.send();
}

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

console.log("NetQFixer_DvdQ_Content_Script.js says goodbye");
