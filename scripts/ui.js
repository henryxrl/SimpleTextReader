var init = true;
var filename = "";
var fileContentChunks = []; // Declare the variable outside the handleDrop function
var allTitles = [];
var isEasternLan = true;
var itemsPerPage = 200;
var currentPage = 1;
var totalPages = 0;
var gotoTitle_Clicked = false;
var bookAndAuthor = {};
var footnotes = [];
var footnote_proccessed_counter = 0;

document.title = "易笺";
var dropZone = document.getElementById('dropZone');
dropZone.addEventListener('dragenter', allowDrag);
dropZone.addEventListener("dragover", handleDragOver, false);
dropZone.addEventListener('dragover', allowDrag);
dropZone.addEventListener("drop", handleDrop, false);
dropZone.addEventListener("dragleave", handleDragLeave, false);
const loadingScreen = document.getElementById('loading');
// loadingScreen.style.visibility = "visible"; // For debugging

const dropZoneText = document.getElementById("dropZoneText");
const contentContainer = document.getElementById("content");
const tocContainer = document.getElementById("tocContent");
const paginationContainer = document.getElementById("pagination");
const progressContainer = document.getElementById("progress");
const footNoteContainer = document.getElementById("footnote-content");

// Set sizes
// windowWith = windowLeftRightMargin + tocWidth + gapWidth + contentWidth + windowLeftRightMargin;
let contentWidth = 72;
let windowLeftRightMargin = 6;
let gapWidth = 3;
let contentMarginLeft = 100 - contentWidth - windowLeftRightMargin;
let tocWidth = 100 - contentWidth - windowLeftRightMargin * 2 - gapWidth;
let paginationCenter = contentWidth / 2 + contentMarginLeft;
contentContainer.style.width = contentWidth + '%';
contentContainer.style.marginTop = '0px';
contentContainer.style.marginRight = '0px';
contentContainer.style.marginBottom = '0px';
contentContainer.style.marginLeft = contentMarginLeft + '%';
tocContainer.style.width = tocWidth + '%';
tocContainer.style.marginTop = '0px';
tocContainer.style.marginRight = '0px';
tocContainer.style.marginBottom = '0px';
tocContainer.style.marginLeft = windowLeftRightMargin + '%';
paginationContainer.style.left = paginationCenter + '%';
progressContainer.style.width = tocWidth + '%';
progressContainer.style.marginTop = '3em';
progressContainer.style.marginRight = '0';
progressContainer.style.marginBottom = '0';
progressContainer.style.marginLeft = windowLeftRightMargin + '%';

window.addEventListener('dragenter', function(e) {
    dropZone.style.visibility = "visible";
    dropZone.style.zIndex = "999";
    dropZoneText.style.visibility = "visible";
    dropZoneText.style.zIndex = "1000";
});

window.onscroll = function() {
    if (!init) {
        GetScrollPositions();
    }
};

document.onkeydown = function(event) {
    switch (event.key) {
        case 'ArrowLeft':
            jumpToPage(currentPage-1);
        break;
        case 'ArrowRight':
            jumpToPage(currentPage+1);
        break;
        case 'Escape':
            resetUI();
        break;
    }
 };

function allowDrag(event) {
    if (true) {  // Test that the item being dragged is a valid one
        event.dataTransfer.dropEffect = 'copy';
        event.preventDefault();
    }
}

function handleDragOver(event) {
    event.preventDefault();
    dropZone.style.visibility = "visible";
    dropZone.style.zIndex = "999";
    dropZone.style.borderColor = "#274c77";
    dropZoneText.style.visibility = "visible";
    dropZoneText.style.zIndex = "1000";
    dropZoneText.style.color = "#274c77";
    // console.log("dropZone.style.zIndex: " + dropZone.style.zIndex);
    // console.log("dropZoneText.style.zIndex: " + dropZoneText.style.zIndex);
}

function handleDragLeave(event) {
    event.preventDefault();
    dropZone.style.visibility = "visible";
    dropZone.style.zIndex = "999";
    dropZone.style.borderColor = "#6096ba";
    dropZoneText.style.visibility = "visible";
    dropZoneText.style.zIndex = "1000";
    dropZoneText.style.color = "#6096ba";
}

function handleDrop(event) {
    event.preventDefault();
    dropZone.style.visibility = "hidden";
    dropZone.style.zIndex = "1";
    dropZoneText.style.visibility = "hidden";
    dropZoneText.style.zIndex = "2";
    resetVars();

    var fileList = event.dataTransfer.files;
    filename = fileList[0].name;

    if (fileList.length > 0 && fileList[0].type === "text/plain") {
        var fileReader = new FileReader();

        fileReader.onload = function (event) {
            // Detect encoding
            const text = String.fromCharCode.apply(null, new Uint8Array(fileReader.result.slice(0, 100)));
            const detectedEncoding = jschardet.detect(text).encoding;
            console.log('Encoding:', detectedEncoding);
    
            // Get file content
            const decoderOptions = { stream: true, fatal: true };
            const decoder = new TextDecoder(detectedEncoding);
            var contents = decoder.decode(event.target.result, decoderOptions);
            fileContentChunks = contents.split("\n").filter(Boolean).filter(n => n.trim() !== '');
            totalPages = Math.ceil(fileContentChunks.length / itemsPerPage);
            
            // Detect language
            isEasternLan = getLanguage(fileContentChunks.slice(0, 50).join("\n"));
            console.log("isEasternLan: " + isEasternLan);

            // Get all titles and process all footnotes
            for (var i in fileContentChunks) {
                if (fileContentChunks[i].trim() !== '') {
                    // get all titles
                    tempTitle = getTitle(fileContentChunks[i]);
                    if (tempTitle !== "") {
                        allTitles.push([tempTitle, parseInt(i)]);
                    }

                    // process all footnotes
                    fileContentChunks[i] = makeFootNote(fileContentChunks[i]);
                }
            }
            // console.log(allTitles);
            tocContainer.innerHTML = processTOC();

            // Get book name and author
            bookAndAuthor = getBookNameAndAuthor(filename.replace(/(.txt)$/i, ''));
            console.log("BookName: " + bookAndAuthor.bookName);
            console.log("Author: " + bookAndAuthor.author);

            // Update the title of webpage
            document.title = bookAndAuthor.bookName;

            // Show content
            init = false;
            showCurrentPageContent();
            window.scrollBy(0, 1);  // scroll 1 pixel so that if the first line is a header, it will show up in TOC
            generatePagination();

            // Retrieve history if exists
            // localStorage.clear();    // Clear all history; for debugging
            if (localStorage.getItem(filename)) {
                console.log("History found! Go to line: " + localStorage.getItem(filename));
                gotoLine(localStorage.getItem(filename), false);
            }
        };

        fileReader.onloadstart = function (event) {
            dropZone.style.visibility = "hidden";
            dropZoneText.style.visibility = "hidden";

            loadingScreen.style.visibility = "visible";

            contentContainer.style.visibility = "hidden";
            tocContainer.style.visibility = "hidden";
            paginationContainer.style.visibility = "hidden";
            progressContainer.style.visibility = "hidden";
        };

        fileReader.onprogress = function (event) {
            loadingScreen.style.visibility = "visible";
        };

        fileReader.onloadend = function (event) {
            loadingScreen.style.visibility = "hidden";

            contentContainer.style.visibility = "visible";
            tocContainer.style.visibility = "visible";
            paginationContainer.style.visibility = "visible";
            progressContainer.style.visibility = "visible";
        };

        fileReader.readAsArrayBuffer(fileList[0]);
    } else {
        resetUI();
    }
}

function resetUI() {
    resetVars();

    dropZone.style.visibility = "visible";
    dropZone.style.zIndex = "999";
    dropZone.style.borderColor = "#6096ba";
    dropZoneText.style.visibility = "visible";
    dropZoneText.style.zIndex = "1000";
    dropZoneText.style.color = "#6096ba";

    loadingScreen.style.visibility = "hidden";
    contentContainer.style.visibility = "hidden";
    tocContainer.style.visibility = "hidden";
    paginationContainer.style.visibility = "hidden";
    progressContainer.style.visibility = "hidden";
}

function resetVars() {
    init = true;
    filename = "";
    fileContentChunks = []; // Clear content chunks when a new file is dropped
    allTitles = []; // Clear titles when a new file is dropped
    currentPage = 1; // Reset current page to 1 when a new file is dropped
    totalPages = 0; // Reset total pages to 0 when a new file is dropped
    isEasternLan = true;
    gotoTitle_Clicked = false;
    bookAndAuthor = {};
    footnotes = [];
    footnote_proccessed_counter = 0;

    document.title = "易笺";
    contentContainer.innerHTML = "";
    tocContainer.innerHTML = "";
    progressContainer.innerHTML = "";
    footNoteContainer.innerHTML = "";
}

function showCurrentPageContent() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    contentContainer.innerHTML = "";
    let to_drop_cap = false;

    // process line by line - fast
    for (var j = startIndex; j < endIndex && j < fileContentChunks.length; j++) {
        if (fileContentChunks[j].trim() !== '') {
            processedResult = process(fileContentChunks[j], j, to_drop_cap);
            to_drop_cap = processedResult[1] === 'h' ? true : false;
            contentContainer.innerHTML += processedResult[0];
        }
    }

    // process 20 line at a time - fast
    // const line_step = 20;
    // for (var j = startIndex; j < endIndex && j < fileContentChunks.length; j+=line_step) {
    //     const preElement = document.createElement("pre");
    //     preElement.style.whiteSpace = 'pre-wrap'; // Enable word wrapping
    //     preElement.innerHTML = process_batch(fileContentChunks.slice(j, j+line_step).join('\n'));
    //     contentContainer.appendChild(preElement);
    // }

    // process one page at a time - slow
    // const preElement = document.createElement("pre");
    // preElement.style.whiteSpace = 'pre-wrap'; // Enable word wrapping
    // preElement.innerHTML = process_batch(fileContentChunks.join('\n'));
    // contentContainer.appendChild(preElement);

    // set up footnote
    Footnotes.setup();
}

function generatePagination() {
    paginationContainer.innerHTML = "";
    const paginationList = document.createElement("div");
    paginationList.classList.add("pagination");

    const showPages = getPageList(totalPages, currentPage, 9);
    // console.log("showPages: " + showPages + "; currentPage: " + currentPage);
    for (var i = 1; i <= showPages.length; i++) {
        // Add a prev page button
        if (showPages[i-1] === 1) {
            var paginationItem_prev = document.createElement("div");
            paginationItem_prev.innerHTML = "<a href='#' onclick='gotoPage(" + (currentPage-1) + ")' class='prevent-select page'>&laquo;</a>";
            if (currentPage === 1) {
                paginationItem_prev.classList.add("disabledbutton");
            }
            paginationList.appendChild(paginationItem_prev);
        }

        // Add a page button
        if (showPages[i-1] === 0) {
            var paginationItem = document.createElement("div");
            paginationItem.innerHTML = "<a href='#!'><input type='text' id='jumpInput' placeholder='···' size='1' oninput='this.size = (this.value.length <= 0 ? 1 : this.value.length)' onkeypress='jumpToPageInputField(event)'></a>";
            paginationList.appendChild(paginationItem);
        } else {
            var paginationItem = document.createElement("div");
            paginationItem.innerHTML = "<a href='#' onclick='gotoPage(" + showPages[i-1] + ")' class='prevent-select page'>" + showPages[i-1] + "</a>";
            if (showPages[i-1] === currentPage) {
                paginationItem.classList.add("active");
                paginationItem.children[0].classList.add("active");
            }
            paginationList.appendChild(paginationItem);
        }

        // Add a next page button
        if (showPages[i-1] === totalPages) {
            var paginationItem_next = document.createElement("div");
            paginationItem_next.innerHTML = "<a href='#' onclick='gotoPage(" + (currentPage+1) + ")' class='prevent-select page'>&raquo;</a>";
            if (currentPage === totalPages) {
                paginationItem_next.classList.add("disabledbutton");
            }
            paginationList.appendChild(paginationItem_next);
        }
    }

    paginationContainer.appendChild(paginationList);
}

function jumpToPage(pageNumber, scrolltoTop=true) {
    if (!isNaN(pageNumber)) {
        currentPage = pageNumber > totalPages ? totalPages : (pageNumber < 1 ? 1 : pageNumber);
        showCurrentPageContent();
        generatePagination();
    } else {
        currentPage = currentPage;
        showCurrentPageContent();
        generatePagination();
    }

    if (scrolltoTop) {
        window.scrollTo(0, 0, {behavior: 'instant'});
    }
    GetScrollPositions();
}

function jumpToPageInputField(event, scrolltoTop=true) {
    if (event.key === 'Enter') {
        pageNumberInput = event.target.value;
        const pageNumber = parseInt(pageNumberInput);

        if (!isNaN(pageNumber)) {
            currentPage = pageNumber > totalPages ? totalPages : (pageNumber < 1 ? 1 : pageNumber);
            showCurrentPageContent();
            generatePagination();
        } else {
            currentPage = currentPage;
            showCurrentPageContent();
            generatePagination();
        }

        if (scrolltoTop) {
            window.scrollTo(0, 0, {behavior: 'instant'});
        }
        GetScrollPositions();
    }
}

function gotoPage(page, scrolltoTop=true) {
    currentPage = page;
    showCurrentPageContent();
    generatePagination();

    if (scrolltoTop) {
        window.scrollTo(0, 0, {behavior: 'instant'});
    }
    GetScrollPositions();
}

function processTOC() {
    // for each title in allTitles, create a link
    var toc = "";
    for (var i in allTitles) {
        // toc += "<a href='#" + allTitles[i][1] + "'>" + allTitles[i][0] + "</a><br>";
        toc += "<a id='a" + allTitles[i][1] + "_bull' href='#line" + allTitles[i][1] + "' onclick='gotoLine(" + allTitles[i][1] + ")' class='prevent-select toc-bullet'></a><a id='a" + allTitles[i][1] + "' href='#line" + allTitles[i][1] + "' onclick='gotoLine(" + allTitles[i][1] + ")' class='prevent-select toc-text'>" + allTitles[i][0] + "</a><br/>";
    }
    return toc;
}

function gotoLine(lineNumber, isTitle=true) {
    // Find the page number to jump to
    // console.log("lineNumber: " + lineNumber + ", isTitle: " + isTitle);
    let needToGoPage = lineNumber % itemsPerPage === 0 ? (lineNumber / itemsPerPage + 1) : (Math.ceil(lineNumber / itemsPerPage));
    needToGoPage = needToGoPage > totalPages ? totalPages : (needToGoPage < 1 ? 1 : needToGoPage);
    // console.log("needToGoPage: " + needToGoPage);
    gotoPage(needToGoPage, false);

    if (isTitle) {
        // Set the current title in the TOC as active
        setTitleActive(lineNumber);

        gotoTitle_Clicked = true;
    } else {
        // scroll to the particular line
        const line = document.getElementById("line" + lineNumber);
        try {
            // console.log("line.tagName: " + line.tagName);
            if (line.tagName === "H2") {
                // scroll back 3.2em to show the title and margin
                // line-height:1.6em;
                // margin-top:1.6em;
                line.scrollIntoView(true, {behavior: 'instant'});
                let scrollBackPx = getSizePrecise('3em', parent=line.parentElement);
                // console.log("scrollBackPx: " + scrollBackPx);
                window.scrollBy(0, -scrollBackPx);
                setTitleActive(lineNumber);
            } else {
                line.scrollIntoView(true, {behavior: 'instant'});
            }
        } catch (error) {
            console.log("Error: No tag with id 'line" + lineNumber + "' found.");
        }
    }

    // Remember the line number in history
    localStorage.setItem(filename, lineNumber);
}

function GetScrollPositions() {
    // console.log("GetScrollPositions() called, gotoTitle_Clicked: " + gotoTitle_Clicked);
    
    // Get current scroll position
    // const scrollTop = window.scrollY || document.documentElement.scrollTop;
    // console.log("Top: " + scrollTop + "px");

    // Get the line number on top of the viewport
    let curLineNumber = 0;
    for (i in contentContainer.children) {
        if (isInViewport(contentContainer.children[i])) {
            curLineNumber = parseInt(contentContainer.children[i].id.replace('line', ''));
            break;
        }
    }
    // console.log("Current line: " + curLineNumber);

    if (!gotoTitle_Clicked) {
        // Remember the line number in history
        localStorage.setItem(filename, curLineNumber);

        // Get the title the detectected line belongs to
        let curTitleID = 0;
        for (var i = 0; i < allTitles.length; i++) {
            if (i < allTitles.length - 1) {
                if (curLineNumber >= allTitles[i][1] && curLineNumber < allTitles[i+1][1]) {
                    // console.log("Current title: " + allTitles[i][0]);
                    curTitleID = allTitles[i][1];
                    break;
                }
            } else {
                if (curLineNumber >= allTitles[i][1] && curLineNumber < fileContentChunks.length) {
                    // console.log("Current title: " + allTitles[i][0]);
                    curTitleID = allTitles[i][1];
                    break;
                }
            }
        }
        // console.log("Current title ID: " + curTitleID);

        // Set the current title in the TOC as active
        setTitleActive(curTitleID);
    }

    progressContainer.innerHTML = "阅读进度：" + (curLineNumber / fileContentChunks.length * 100).toFixed(1) + "%";

    gotoTitle_Clicked = false;
}

function setTitleActive(titleID) {
    // Remove all active titles
    let allActiveTitles = tocContainer.getElementsByClassName("toc-active");
    while (allActiveTitles.length) {
        allActiveTitles[0].classList.remove("toc-active");
    }
    try {
        // Set the selected title in the TOC as active
        let selectedTitle = document.getElementById("a" + titleID);
        selectedTitle.classList.add("toc-active");
        for (i in selectedTitle.children) {
            if (selectedTitle.children[i].classList) {
                selectedTitle.children[i].classList.add("toc-active");
            }
        }
        let selectedTitleBull = document.getElementById("a" + titleID + "_bull")
        selectedTitleBull.classList.add("toc-active");
        for (i in selectedTitleBull.children) {
            if (selectedTitleBull.children[i].classList) {
                selectedTitleBull.children[i].classList.add("toc-active");
            }
        }
        // Move the selected title to the center of the TOC
        if (!isInContainerViewport(tocContainer, selectedTitle, tocContainer.clientHeight / 10)) {
            tocContainer.scrollTo(0, selectedTitle.offsetTop - tocContainer.clientHeight / 2, {behavior: 'smooth'});
        }
    } catch (error) {
        console.log("Error: No title with ID " + titleID + " found.");
    }
}