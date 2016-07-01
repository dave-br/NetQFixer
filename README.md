# NetQFixer
Chrome extension to color-code DVD Queue titles based on streamability and existence in MyList

I use Netflix for DVDs and streaming, and wanted a way to correlate the two, since Netflix removed that feature.  With this extension, the DVD Queue page becomes color-coded: Green for items also on MyList, Red for items that are streamable but not on MyList, and Black for everything else (DVDs that are not streamable).

INSTALLATION
------------

Don't ever trust anyone who tells you to enable Developer Mode in Chrome, and then install their extension.  That's what I'm telling you to do, so you should be wary.  Read my code first, and verify for yourself that it is harmless and does what you want.  Then, go ahead and download the files (.js, .json, and .png) into a single directory, enable Developer Mode in Chrome, and then "Load Unpacked Extension".  See https://developer.chrome.com/extensions/getstarted ("Load the extension" section) for details.


USE
---

Open up your DVD Queue in one tab, and your MyList in another, and click the extension button (icon is "NQ" with a smiley face; I'm not an artist).  The extension will figure out which tab is which based on the URL, and start the color-coding.  You will notice the titles gradually become bold as a determination is made for each one (On MyList=Green, Not on MyList but is streamable=Red, or Not streamable=Black).  Should take several seconds.  When it's done, if anything is left unbold, then something went wrong.  Go debug it!

WARNINGS
--------

This is my first Chrome Extension, and first foray into HTML manipulation with JavaScript.  This extension is also very sensitive to UI changes made on the Netflix site
