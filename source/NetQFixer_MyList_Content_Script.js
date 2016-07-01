console.log("NetQFixer_MyList_Content_Script.js says hello");

main();

// Called first, globally
function main()
{
    var streamingMovieAnchors = findMovieAnchors(false /* Streaming */, document);
    console.log("(2) MyList tab sending streamingMovieAnchors to extension...");
    chrome.runtime.sendMessage({ streamingMovieAnchors: streamingMovieAnchors }, null /* no response */);
}

console.log("NetQFixer_MyList_Content_Script.js says goodbye");
