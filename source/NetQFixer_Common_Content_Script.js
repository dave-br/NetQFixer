console.log("NetQFixer_Common_Content_Script.js says hello");

// Read DVD or instant queue, find all <A> tags for individual movies on the queue
//
// Returns an array of data gleaned from the DVD Queue or MyList.  This data is
// slightly different depending on whether we're reading the DVD queue or MyList
//
// DVD Queue:
//      Indexed by movieID (sparse array / hash table)
//      Element = array of anchors (to facilitate multiple discs within
//          a single TV series)
//
// MyList:
//      Indexed by simple 0-based integer (to facilitate efficient transferring
//          to the extension, since JSON stringify does not do well with sparse arrays).
//      Element = the movieID
function findMovieAnchors(isDvd /*true for DVD queue, false for streaming queue */, queueDoc)
{
    var ret = [];
    var iRet = 0;

    var anchorNodeList = queueDoc.getElementsByTagName("A");
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

        // We found an anchor with text.  Is it for a movie?  Try to extract
        // its movie ID from the href.

        var href = anchorNodeList[i].href;
        var hrefComponents = href.split("/");
        var movieID;
        if (isDvd == true)
        {
            // DVD Queue anchor
            // Example: "https://dvd.netflix.com/Movie/Misery-Loves-Comedy/80037121?trkid=201886046"
            // Example: [0] = "https:", [1] = "", [2] = "dvd.netflix.com", [3] = "Movie",  [4] = "Misery-Loves-Comedy", [5] = "80037121?trkid=201886046"

            if (hrefComponents.length < 6)
            {
                continue;
            }

            if (hrefComponents[3].toLowerCase() != "movie")
            {
                continue;
            }

            var iQuestion = hrefComponents[5].indexOf("?");
            if (iQuestion == -1)
            {
                //continue;
                iQuestion = hrefComponents[5].length;
            }

            // Looks like the kind of anchor we want.  Before we commit to using the movie ID from the href,
            // see if there's a data-series-parent-id attribute on a parent DIV.  If so, this is
            // a TV series, and that DIV attribute will be a different (but correct) movie ID
            // from the one in the href.  The HREF one would be particular to the season / disc on the
            // queue, and that's useless when correlating with MyList or streamability

            movieID = hrefComponents[5].substring(0, iQuestion);        // default

            var div = getClosestParentDiv(anchorNodeList[i]);
            if (div != null)
            {
                var temp = div.getAttribute("data-series-parent-id");
                if (temp != null && temp != undefined && temp != "")
                {
                    // Looks good--use this as the movieID field instead
                    movieID = temp;
                }
            }

            if (ret[movieID] == undefined)
            {
                ret[movieID] = [];
            }
            ret[movieID].push(anchorNodeList[i]);
        }
        else
        {
            // Streaming Queue anchor
            // Example: "https://www.netflix.com/Title/80037121"
            // Example: [0] = "https:", [1] = "", [2] = "www.netflix.com", [3] = "Title",  [4] = "80037121"
            if (hrefComponents.length < 5)
            {
                continue;
            }

            if (hrefComponents[3].toLowerCase() != "title")
            {
                continue;
            }

            movieID = hrefComponents[4];
            ret[iRet++] = movieID;
        }


        console.log("Found " + (isDvd ? "DVD " : "Streaming ") + "anchor tag: " + anchorDisplayText + ", movie ID: " + movieID);
    }

    return ret;
}

// Given an <A> element keep going up parent elements until we find the first DIV
function getClosestParentDiv(anchorElement)
{
    var ret = anchorElement;

    while (ret.nodeName.toLowerCase() != "div")
    {
        ret = ret.parentElement;
        if (ret == null)
        {
            // There was no parent div element somehow.
            return null;
        }
    }

    return ret;
}