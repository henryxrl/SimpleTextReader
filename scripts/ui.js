var fileContentChunks = []; // Declare the variable outside the handleDrop function
var allTitles = [];
var isEasternLan = true;
var itemsPerPage = 200;
var currentPage = 1;
var totalPages = 0;
var gotoTitle_Clicked = false;
var bookAndAuthor = {};

var dropZone = document.getElementById('dropZone');
dropZone.addEventListener('dragenter', allowDrag);
dropZone.addEventListener("dragover", handleDragOver, false);
dropZone.addEventListener('dragover', allowDrag);
dropZone.addEventListener("drop", handleDrop, false);
dropZone.addEventListener("dragleave", handleDragLeave, false);

const dropZoneText = document.getElementById("dropZoneText");
const contentContainer = document.getElementById("content");
const tocContainer = document.getElementById("tocContent");

window.addEventListener('dragenter', function(e) {
    dropZone.style.visibility = "visible";
    dropZone.style.zIndex = "999";
    dropZoneText.style.visibility = "visible";
    dropZoneText.style.zIndex = "1000";
});
window.onscroll = function() {
    GetScrollPositions();
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
    contentContainer.innerHTML = "";
    tocContainer.innerHTML = "";
    dropZone.style.visibility = "hidden";
    dropZone.style.zIndex = "1";
    dropZoneText.style.visibility = "hidden";
    dropZoneText.style.zIndex = "2";

    resetVars();
    var fileList = event.dataTransfer.files;

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

            // Get all titles
            for (var i in fileContentChunks) {
                if (fileContentChunks[i].trim() !== '') {
                    tempTitle = getTitle(fileContentChunks[i]);
                    if (tempTitle !== "") {
                        allTitles.push([tempTitle, parseInt(i)]);
                    }
                }
            }
            // console.log(allTitles);
            tocContainer.innerHTML = processTOC();

            // Get book name and author
            bookAndAuthor = getBookNameAndAuthor(fileList[0].name.replace(/(.txt)$/i, ''));
            console.log("BookName: " + bookAndAuthor.bookName);
            console.log("Author: " + bookAndAuthor.author);

            // Show content
            showCurrentPageContent();
            generatePagination();
            GetScrollPositions();
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
}

function resetVars() {
    fileContentChunks = []; // Clear content chunks when a new file is dropped
    allTitles = []; // Clear titles when a new file is dropped
    currentPage = 1; // Reset current page to 1 when a new file is dropped
    totalPages = 0; // Reset total pages to 0 when a new file is dropped
    isEasternLan = true;
    gotoTitle_Clicked = false;
    bookAndAuthor = {};

    contentContainer.innerHTML = "";
    tocContainer.innerHTML = "";
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
}

function generatePagination() {
    const paginationContainer = document.getElementById("pagination");
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

// Credit: https://stackoverflow.com/questions/46382109/limit-the-number-of-visible-pages-in-pagination
// Returns an array of maxLength (or less) page numbers
// where a 0 in the returned array denotes a gap in the series.
// Parameters:
//   totalPages:     total number of pages
//   page:           current page
//   maxLength:      maximum size of returned array
function getPageList(totalPages, page, maxLength) {
    if (maxLength < 5) throw "maxLength must be at least 5";

    function range(start, end) {
        return Array.from(Array(end - start + 1), (_, i) => i + start); 
    }

    var sideWidth = maxLength < 9 ? 1 : 2;
    var leftWidth = (maxLength - sideWidth*2 - 3) >> 1;
    var rightWidth = (maxLength - sideWidth*2 - 2) >> 1;
    if (totalPages <= maxLength) {
        // no breaks in list
        return range(1, totalPages);
    }
    if (page <= maxLength - sideWidth - 1 - rightWidth) {
        // no break on left of page
        return range(1, maxLength - sideWidth - 1)
            .concat(0, range(totalPages - sideWidth + 1, totalPages));
    }
    if (page >= totalPages - sideWidth - 1 - rightWidth) {
        // no break on right of page
        return range(1, sideWidth)
            .concat(0, range(totalPages - sideWidth - 1 - rightWidth - leftWidth, totalPages));
    }
    // Breaks on both sides
    return range(1, sideWidth)
        .concat(0, range(page - leftWidth, page + rightWidth),
                0, range(totalPages - sideWidth + 1, totalPages));
}

function processTOC() {
    // for each title in allTitles, create a link
    var toc = "";
    for (var i in allTitles) {
        // toc += "<a href='#" + allTitles[i][1] + "'>" + allTitles[i][0] + "</a><br>";
        toc += "<a id='a" + allTitles[i][1] + "_bull' href='#line" + allTitles[i][1] + "' onclick='gotoTitle(" + allTitles[i][1] + ")' class='prevent-select toc-bullet'></a><a id='a" + allTitles[i][1] + "' href='#line" + allTitles[i][1] + "' onclick='gotoTitle(" + allTitles[i][1] + ")' class='prevent-select toc-text'>" + allTitles[i][0] + "</a><br/>";
    }
    return toc;
}

function gotoTitle(lineNumber) {
    // Find the page number to jump to
    // console.log("lineNumber: " + lineNumber);
    let needToGoPage = Math.ceil(lineNumber / itemsPerPage);
    needToGoPage = needToGoPage > totalPages ? totalPages : (needToGoPage < 1 ? 1 : needToGoPage);
    // console.log("needToGoPage: " + needToGoPage);
    gotoPage(needToGoPage, false);

    // Set the current title in the TOC as active
    setTitleActive(lineNumber);

    gotoTitle_Clicked = true;
}

function GetScrollPositions() {
    if (!gotoTitle_Clicked) {
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

    gotoTitle_Clicked = false;
}

// Credit: https://www.javascripttutorial.net/dom/css/check-if-an-element-is-visible-in-the-viewport/
function isInViewport(el) {
    try {
        const rect = el.getBoundingClientRect();
        return (
            rect.bottom >= 0 &&
            rect.top <= (window.innerHeight || document.documentElement.clientHeight)
        );
    } catch (error) {
        return false;
    }
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

function isInContainerViewport(container, el, margin=0) {
    try {
        const containerRect = container.getBoundingClientRect();
        const rect = el.getBoundingClientRect();
        return (
            rect.top >= (containerRect.top + margin) &&
            rect.bottom <= (containerRect.bottom - margin)
        );
    } catch (error) {
        return false;
    }
}