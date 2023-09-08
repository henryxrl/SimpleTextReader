// Set up the UI
if (isVariableDefined(dropZone)) {
    dropZone.addEventListener('dragenter', allowDrag);
    dropZone.addEventListener('dragenter', handleDragEnter, false);
    dropZone.addEventListener('dragover', allowDrag);
    dropZone.addEventListener("dragover", handleDragOver, false);
    dropZone.addEventListener("drop", handleDrop, false);
    dropZone.addEventListener("dragleave", handleDragLeave, false);
    dropZone.addEventListener("dblclick", openFileSelector, false);
}
if (isVariableDefined(darkModeToggle)) {
    // localStorage.removeItem("UIMode");
    darkModeToggle.addEventListener("change", (e) => {
        setUIMode(!e.target.checked);
    });
}
setMainContentUI();
// setMainContentUI_onRatio();
// setTOC_onRatio(initial=true);
let emInPx = getSizePrecise('1em', contentContainer);



// Event listeners
window.addEventListener('resize', function(event) {
    // setMainContentUI_onRatio();

    let isIncreasing = (window.innerWidth < storePrevWindowWidth) ? false : true;
    storePrevWindowWidth = window.innerWidth;
    updateTOCUI(isIncreasing);
});

// window.addEventListener('dblclick', function(event) {
//     setTOC_onRatio();
// });

window.addEventListener('dragenter', function(event) {
    historyLineNumber = getHistory(filename);
    init = true;
    event.preventDefault();
    let res = showDropZone(focused=true);
    if (res == 0) {
        // showDropZone success
        contentContainer.style.display = "none";
    }
});

window.onscroll = function(event) {
    event.preventDefault();
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
            // console.log("Escape pressed:", no_ui);
            if (isVariableDefined(dropZone)) {
                resetUI();
            }
        break;
    }
};

function openFileSelector(event) {
    event.preventDefault();
    var fileSelector = document.createElement("input");
    fileSelector.setAttribute("type", "file");
    fileSelector.setAttribute("accept", ".txt");
    fileSelector.click();
    // get the selected filepath
    fileSelector.onchange = function() {
        handleSelectedFile(this.files);
    };
    fileSelector.remove();
}

function allowDrag(event) {
    if (true) {  // Test that the item being dragged is a valid one
        event.dataTransfer.dropEffect = 'copy';
        event.preventDefault();
    }
}

function handleDragEnter(event) {
    // console.log("Drag enter");
    dragCounter++;
    event.preventDefault();
    showDropZone(focused=true);
    contentContainer.style.display = "none";
}

function handleDragOver(event) {
    // console.log("Drag over");
    event.preventDefault();
    showDropZone(focused=true);
    contentContainer.style.display = "none";
}

function handleDragLeave(event) {
    // console.log("Drag leave");
    dragCounter--;
    event.preventDefault();
    if (dragCounter === 0) {
        if (contentContainer.innerHTML === "") {
            // no file loaded, show dropZone
            showDropZone();
            contentContainer.style.display = "none";
        } else {
            // file loaded, revert back to normal
            hideDropZone();
            contentContainer.style.display = "block";
            gotoLine(historyLineNumber, isTitle=false);
            init = false;
        }
    }
}

function handleDrop(event) {
    event.preventDefault();
    hideDropZone();
    contentContainer.style.display = "block";
    resetVars();
    // setTOC_onRatio(initial=true);

    var fileList = event.dataTransfer.files;
    handleSelectedFile(fileList);
}

// by cataerogong:
//    regBefore( <callback> ) // <callback>: function (file_blob) -> new_file_blob
//    regAfter( <callback> ) // <callback>: function () -> undefined
//
//    example:
//    function renameSomeFile(f) { // change some file's name
//        if (f.name=="A.txt") {
//            return new File([f], "B.txt", {type: f.type, lastModified: f.lastModified});
//        } else {
//            return f;
//        }
//    }
//    function unzipFile(f) { // support zip-file
//        if (f.name.endsWith(".zip")) {
//            newF = unzip(f)[0]; // unzip and return the first file
//            return newF;
//        } else {
//            return f;
//        }
//    }
//    async function saveFileToDB(f) { // save file to db
//        if (f.type == "text/plain")
//            await db.saveFile(f); // call async function, wait for finish.
//        return f;
//    }
//    async function loadProgress() { // load progress from webdav
//        let line = await webdav.getProgress(filename);
//        setHistory(filename, line);
//        getHistory(filename);
//    }
//    fileloadCallback.regBefore(renameSomeFile);
//    fileloadCallback.regBefore(unzipFile);
//    fileloadCallback.regBefore(saveFileToDB);
//    fileloadCallback.regAfter(loadProgress);
var fileloadCallback = {
    beforeList: [],

    afterList: [],

    regBefore(callback) {
        if ((typeof(callback) == "function") && !this.beforeList.includes(callback))
            this.beforeList.push(callback);
    },
    unregBefore(callback) {
        let i = this.beforeList.indexOf(callback);
        if (i >= 0) this.beforeList.splice(i, 1);
    },

    regAfter(callback) {
        if ((typeof(callback) == "function") && !this.afterList.includes(callback))
            this.afterList.push(callback);
    },
    unregAfter(callback) {
        let i = this.afterList.indexOf(callback);
        if (i >= 0) this.afterList.splice(i, 1);
    },

    async before(f) {
        let newF = f;
        try {
            for (func of this.beforeList) {
                newF = (await func(newF)) || newF;
            }
        } catch (e) {
            console.log("fileloadCallback.before() error:", e);
        }
        console.log("fileloadCallback.before() finished:", newF);
        return newF;
    },

    async after() {
        try {
            for (func of this.afterList) {
                await func();
            }
        } catch (e) {
            console.log("fileloadCallback.after() error:", e);
        }
        console.log("fileloadCallback.after() finished.");
    }
};

// Main functions
// by cataerogong:
//    call fileloadCallback before and after file-load.
//    async function fileloadCallback.before(file_blob) -> new_file_blob
//    async function fileloadCallback.after() -> undefined
async function handleSelectedFile(fileList) {
    if (fileList.length > 0)
        fileList = [await fileloadCallback.before(fileList[0])];
    if (fileList.length > 0 && fileList[0].type === "text/plain") {
        var fileReader = new FileReader();

        fileReader.onload = function (event) {
            event.preventDefault();
            // Detect encoding
            let tempBuffer = new Uint8Array(fileReader.result.slice(0, encodingLookupByteLength));
            while (tempBuffer.byteLength < encodingLookupByteLength) {
                // make copies of tempBuffer till it is more than 1000 bytes
                tempBuffer = new Uint8Array([...tempBuffer, ...tempBuffer]);
            }
            const text = String.fromCharCode.apply(null, tempBuffer);
            const detectedEncoding = jschardet.detect(text).encoding || "utf-8";
            console.log('Encoding:', detectedEncoding);
    
            // Get file content
            const decoderOptions = { stream: true, fatal: true };
            const decoder = new TextDecoder(detectedEncoding);
            var contents = decoder.decode(event.target.result, decoderOptions);
            fileContentChunks = contents.split("\n").filter(Boolean).filter(n => n.trim() !== '');
            totalPages = Math.ceil(fileContentChunks.length / itemsPerPage);
            
            // Detect language
            isEasternLan = getLanguage(fileContentChunks.slice(0, 50).join("\n"));
            console.log("isEasternLan: ", isEasternLan);
            // Change UI language based on detected language
            if (isEasternLan) {
                style.ui_LANG = "CN";
            } else {
                style.ui_LANG = "EN";
            }
            // Set fonts based on detected language
            // style.fontFamily_title = eval(`style.fontFamily_title_${style.ui_LANG}`);
            // style.fontFamily_body = eval(`style.fontFamily_body_${style.ui_LANG}`);
            style.fontFamily_title = style.ui_LANG === "CN" ? style.fontFamily_title_CN : style.fontFamily_title_EN;
            style.fontFamily_body = style.ui_LANG === "CN" ? style.fontFamily_body_CN : style.fontFamily_body_EN;

            // Get book name and author
            filename = fileList[0].name;
            bookAndAuthor = getBookNameAndAuthor(filename.replace(/(.txt)$/i, ''));
            console.log("BookName: ", bookAndAuthor.bookName);
            console.log("Author: ", bookAndAuthor.author);

            // Get all titles and process all footnotes
            allTitles.push([((style.ui_LANG === "EN") ? "TITLE PAGE" : "扉页"), 0]);
            titlePageLineNumberOffset = (bookAndAuthor.author !== "") ? 3 : 2;
            for (var i in fileContentChunks) {
                if (fileContentChunks[i].trim() !== '') {
                    // get all titles
                    tempTitle = getTitle(fileContentChunks[i]);
                    if (tempTitle !== "") {
                        allTitles.push([tempTitle, (parseInt(i) + titlePageLineNumberOffset)]);
                    }

                    // process all footnotes
                    fileContentChunks[i] = makeFootNote(fileContentChunks[i], `images/note_${style.ui_LANG}.png`);
                }
            }
            // console.log(allTitles);
            // tocContainer.innerHTML = processTOC_bak();
            processTOC();
            // setMainContentUI();

            // Add title page
            let sealRotation = (style.ui_LANG === "EN") ? `transform:rotate(${randomFloatFromInterval(-50, 80)}deg)` : "";
            // fileContentChunks.unshift(`<div id=line${(titlePageLineNumberOffset - 1)} class='prevent-select seal'><img id='seal_${style.ui_LANG}' src='images/seal_${style.ui_LANG}.png' style='left:calc(${randomFloatFromInterval(0, 1)} * (100% - ${eval(`style.seal_width_${style.ui_LANG}`)})); ${sealRotation}'/></div>`);
            fileContentChunks.unshift(`<div id=line${(titlePageLineNumberOffset - 1)} class='prevent-select seal'><img id='seal_${style.ui_LANG}' src='images/seal_${style.ui_LANG}.png' style='left:calc(${randomFloatFromInterval(0, 1)} * (100% - ${style.ui_LANG === 'CN' ? style.seal_width_CN : style.seal_width_EN})); ${sealRotation}'/></div>`);
            if (bookAndAuthor.author !== "") {
                fileContentChunks.unshift(`<h1 id=line1 style='margin-top:0; margin-bottom:${(parseFloat(style.h1_lineHeight)/2)}em'>${bookAndAuthor.author}</h1>`);
                fileContentChunks.unshift(`<h1 id=line0 style='margin-bottom:0'>${bookAndAuthor.bookName}</h1>`);
            } else {
                fileContentChunks.unshift(`<h1 id=line0 style='margin-bottom:${(parseFloat(style.h1_lineHeight)/2)}em'>${bookAndAuthor.bookName}</h1>`);
            }

            // Update the title of webpage
            document.title = bookAndAuthor.bookName;

            // Show content
            init = false;
            showCurrentPageContent();
            generatePagination();
            updateTOCUI(false);
            GetScrollPositions(toSetHistory=false);

            // Retrieve reading history if exists
            // removeAllHistory();    // for debugging
            let curLineNumber = getHistory(filename);
            if ((currentPage === 1) && (curLineNumber === 0) && (window.scrollY === 0)) {
                // if the first line is a header, it will show up in TOC
                setTitleActive(curLineNumber);
            }
        };

        fileReader.onloadstart = function (event) {
            event.preventDefault();
            hideDropZone();
            showLoadingScreen();
            hideContent();
        };

        fileReader.onprogress = function (event) {
            event.preventDefault();
            hideDropZone();
            showLoadingScreen();
            hideContent();
        };

        fileReader.onloadend = function (event) {
            event.preventDefault();
            hideDropZone();
            hideLoadingScreen();
            showContent();
            fileloadCallback.after();
        };

        fileReader.readAsArrayBuffer(fileList[0]);
    } else {
        resetUI();
    }
}

function showCurrentPageContent() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    contentContainer.innerHTML = "";
    let to_drop_cap = false;

    // process line by line - fast
    for (var j = startIndex; j < endIndex && j < fileContentChunks.length; j++) {
        if (fileContentChunks[j].trim() !== '') {
            let processedResult = process(fileContentChunks[j], j, to_drop_cap);
            to_drop_cap = processedResult[1] === 'h' ? true : false;
            // contentContainer.innerHTML += processedResult[0];
            contentContainer.appendChild(processedResult[0]);
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

    const showPages = getPageList(totalPages, currentPage, parseInt(style.ui_numPaginationItems));
    // console.log(`showPages: ${showPages}; currentPage: ${currentPage}`);
    for (var i = 1; i <= showPages.length; i++) {
        // Add a prev page button
        if (showPages[i-1] === 1) {
            var paginationItem_prev = document.createElement("div");
            // paginationItem_prev.innerHTML = `<a href='#' onclick='gotoPage(${(currentPage-1)})' class='prevent-select page'>&laquo;</a>`;
            let tempItem = document.createElement("a");
            tempItem.href = "#";
            tempItem.addEventListener('click', function(event) {
                event.preventDefault();
                gotoPage((currentPage-1));
            });
            tempItem.classList.add("prevent-select");
            tempItem.classList.add("page");
            // tempItem.innerHTML = "&laquo;";
            tempItem.innerText = "«";
            paginationItem_prev.appendChild(tempItem);

            if (currentPage === 1) {
                paginationItem_prev.classList.add("disabledbutton");
            }
            paginationList.appendChild(paginationItem_prev);
        }

        // Add a page button
        if (showPages[i-1] === 0) {
            var paginationItem = document.createElement("div");
            // paginationItem.innerHTML = "<a href='#!'><input type='text' id='jumpInput' placeholder='···' size='1' oninput='this.size = (this.value.length <= 0 ? 1 : this.value.length)' onkeypress='jumpToPageInputField(event)'></a>";
            let tempItem = document.createElement("a");
            tempItem.href = "#!";
            let tempInput = document.createElement("input");
            tempInput.type = "text";
            tempInput.classList.add("jumpInput");
            tempInput.placeholder = "···";
            tempInput.size = 1;
            tempInput.addEventListener('input', function(event) {
                this.size = (this.value.length <= 0 ? 1 : this.value.length);
            });
            tempInput.addEventListener('keypress', function(event) {
                jumpToPageInputField(event);
            });
            tempItem.appendChild(tempInput);
            paginationItem.appendChild(tempItem);
            paginationList.appendChild(paginationItem);
        } else {
            var paginationItem = document.createElement("div");
            // paginationItem.innerHTML = `<a href='#' onclick='gotoPage(${showPages[i-1]})' class='prevent-select page'>${showPages[i-1]}</a>`;
            let tempItem = document.createElement("a");
            tempItem.href = "#";
            tempItem.classList.add("prevent-select");
            tempItem.classList.add("page");
            // tempItem.innerHTML = showPages[i-1];
            tempItem.innerText = showPages[i-1];
            tempItem.addEventListener('click', function(event) {
                event.preventDefault();
                gotoPage(parseInt(this.innerHTML));
            });
            paginationItem.appendChild(tempItem);

            if (showPages[i-1] === currentPage) {
                paginationItem.classList.add("active");
                paginationItem.children[0].classList.add("active");
            }
            paginationList.appendChild(paginationItem);
        }

        // Add a next page button
        if (showPages[i-1] === totalPages) {
            var paginationItem_next = document.createElement("div");
            // paginationItem_next.innerHTML = `<a href='#' onclick='gotoPage(${(currentPage+1)})' class='prevent-select page'>&raquo;</a>`;
            let tempItem = document.createElement("a");
            tempItem.href = "#";
            tempItem.addEventListener('click', function(event) {
                event.preventDefault();
                gotoPage((currentPage+1));
            });
            tempItem.classList.add("prevent-select");
            tempItem.classList.add("page");
            // tempItem.innerHTML = "&raquo;";
            tempItem.innerText = "»";
            paginationItem_next.appendChild(tempItem);

            if (currentPage === totalPages) {
                paginationItem_next.classList.add("disabledbutton");
            }
            paginationList.appendChild(paginationItem_next);
        }
    }

    paginationContainer.appendChild(paginationList);
}

function processTOC_bak() {
    // for each title in allTitles, create a link
    var toc = "";
    for (var i in allTitles) {
        toc += `<a id='a${allTitles[i][1]}_bull' href='#line${allTitles[i][1]}' onclick='gotoLine(${allTitles[i][1]})' class='prevent-select toc-bullet'></a><a id='a${allTitles[i][1]}' href='#line${allTitles[i][1]}' onclick='gotoLine(${allTitles[i][1]})' class='prevent-select toc-text'>${allTitles[i][0]}</a><br/>`;
    }

    return toc;
}

function processTOC() {
    for (var i in allTitles) {
        let tempBullet = document.createElement("a");
        tempBullet.id = `a${allTitles[i][1]}_bull`;
        tempBullet.href = `#line${allTitles[i][1]}`;
        tempBullet.classList.add("prevent-select");
        tempBullet.classList.add("toc-bullet");
        tempBullet.addEventListener('click', function(event) {
            event.preventDefault();
            // console.log("gotoLine: ", parseInt(event.target.id.replace(/(a|_bull)/g, '')));
            gotoLine(parseInt(event.target.id.replace(/(a|_bull)/g, '')));
            let line = document.getElementById(`line${parseInt(event.target.id.replace(/(a|_bull)/g, ''))}`);
            let top = line.offsetTop;
            let style = line.currentStyle || window.getComputedStyle(line);
            let top_margin = parseFloat(style.marginTop);
            // console.log("top: ", top, "top_margin: ", top_margin);
            window.scrollTo(0, (top - top_margin), {behavior: 'instant'});
        });
        tocContainer.appendChild(tempBullet);

        let tempText = document.createElement("a");
        tempText.id = `a${allTitles[i][1]}`;
        tempText.href = `#line${allTitles[i][1]}`;
        tempText.classList.add("prevent-select");
        tempText.classList.add("toc-text");
        // tempText.innerHTML = allTitles[i][0];
        tempText.innerText = allTitles[i][0];
        tempText.addEventListener('click', function(event) {
            event.preventDefault();
            // console.log("gotoLine: ", parseInt(event.target.id.replace(/(a)/g, '')));
            gotoLine(parseInt(event.target.id.replace(/(a)/g, '')));
            let line = document.getElementById(`line${parseInt(event.target.id.replace(/(a)/g, ''))}`);
            let top = line.offsetTop;
            let style = line.currentStyle || window.getComputedStyle(line);
            let top_margin = parseFloat(style.marginTop);
            // console.log("top: ", top, "top_margin: ", top_margin);
            window.scrollTo(0, (top - top_margin), {behavior: 'instant'});
        });
        tocContainer.appendChild(tempText);
    }
}



// Helper functions
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

    if ((currentPage > 1) && (currentPage < totalPages)) {
        if (scrolltoTop) {
            window.scrollTo(0, 0, {behavior: 'instant'});
        }
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

function gotoLine(lineNumber, isTitle=true) {
    // Find the page number to jump to
    // console.log(`lineNumber: ${lineNumber}, isTitle: ${isTitle}`);
    let needToGoPage = lineNumber % itemsPerPage === 0 ? (lineNumber / itemsPerPage + 1) : (Math.ceil(lineNumber / itemsPerPage));
    needToGoPage = needToGoPage > totalPages ? totalPages : (needToGoPage < 1 ? 1 : needToGoPage);
    // console.log("needToGoPage: ", needToGoPage);
    if (needToGoPage !== currentPage) {
        gotoPage(needToGoPage, false);
    }

    if (isTitle) {
        // Set the current title in the TOC as active
        setTitleActive(lineNumber);

        gotoTitle_Clicked = true;
        // console.log("gotoTitle_Clicked: ", gotoTitle_Clicked);
    } else {
        // scroll to the particular line
        const line = document.getElementById(`line${lineNumber}`);
        try {
            // console.log("line.tagName: ", line.tagName);
            if (line.tagName === "H2") {
                // Add the following line because we no longer use in-line onclick event
                line.scrollIntoView(true, {behavior: 'instant'});
                // scroll back 3.2em to show the title and margin
                // line-height:1.6em;
                // margin-top:1.6em;
                let scrollBackPx = emInPx * 3;
                // console.log("scrollBackPx: ", scrollBackPx);
                window.scrollBy(0, -scrollBackPx);
                setTitleActive(lineNumber);
            } else {
                line.scrollIntoView(true, {behavior: 'instant'});
            }
        } catch (error) {
            console.log(`Error: No tag with id 'line${lineNumber}' found.`);
            return -1;
        }
    }

    // Remember the line number in history
    setHistory(filename, lineNumber);
    return 0;
}

function GetScrollPositions(toSetHistory=true) {
    // console.log("GetScrollPositions() called, gotoTitle_Clicked: ", gotoTitle_Clicked);
    
    // Get current scroll position
    // const scrollTop = window.scrollY || document.documentElement.scrollTop;
    // console.log(`Top: ${scrollTop}px`);

    // Get the line number on top of the viewport
    let curLineNumber = getTopLineNumber();
    // console.log("Current line: ", curLineNumber);

    if (!gotoTitle_Clicked) {
        // Remember the line number in history
        if (toSetHistory) {
            setHistory(filename, curLineNumber);
        }

        // Get the title the detectected line belongs to
        let curTitleID = 0;
        for (var i = 0; i < allTitles.length; i++) {
            if (i < allTitles.length - 1) {
                if (curLineNumber >= allTitles[i][1] && curLineNumber < allTitles[i+1][1]) {
                    // console.log("Current title: ", allTitles[i][0]);
                    curTitleID = allTitles[i][1];
                    break;
                }
            } else {
                if (curLineNumber >= allTitles[i][1] && curLineNumber < fileContentChunks.length) {
                    // console.log("Current title: ", allTitles[i][0]);
                    curTitleID = allTitles[i][1];
                    break;
                }
            }
        }
        // console.log("Current title ID: ", curTitleID);

        // Set the current title in the TOC as active
        setTitleActive(curTitleID);
    }

    // let readingProgressText = eval(`style.ui_readingProgress_${style.ui_LANG}`);
    let readingProgressText = style.ui_LANG === "CN" ? style.ui_readingProgress_CN : style.ui_readingProgress_EN;
    readingProgressText = style.ui_LANG === "CN" ? readingProgressText : readingProgressText.replace("：", ":");
    
    // progressContainer.innerHTML = `<span style='text-decoration:underline'>${bookAndAuthor.bookName}</span><br/>${readingProgressText} ${((curLineNumber + 1) / fileContentChunks.length * 100).toFixed(1)}%`;
    let pastPageLines = (currentPage - 1) * itemsPerPage;
    let curItemsPerPage = Math.min(itemsPerPage, (fileContentChunks.length - pastPageLines));
    let curPagePercentage = (curLineNumber + 1 - pastPageLines) / (curItemsPerPage - getBottomLineNumber() + curLineNumber);
    let scalePercentage = curItemsPerPage / fileContentChunks.length;
    let pastPagePercentage = pastPageLines / fileContentChunks.length;
    let totalPercentage = (curPagePercentage * scalePercentage + pastPagePercentage) * 100;
    if ((curLineNumber === 0) && (currentPage === 1) && (window.scrollY <= 5)) {
        totalPercentage = 0;
    }
    // progressContainer.innerHTML = `<span style='text-decoration:underline'>${bookAndAuthor.bookName}</span><br/>${readingProgressText} ${totalPercentage.toFixed(1).replace(".0", "")}%`;
    document.getElementById("progress-title").innerText = bookAndAuthor.bookName;
    document.getElementById("progress-content").innerText = `${readingProgressText} ${totalPercentage.toFixed(1).replace(".0", "")}%`;

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
        let selectedTitle = document.getElementById(`a${titleID}`);
        selectedTitle.classList.add("toc-active");
        for (i in selectedTitle.children) {
            if (selectedTitle.children[i].classList) {
                selectedTitle.children[i].classList.add("toc-active");
            }
        }
        let selectedTitleBull = document.getElementById(`a${titleID}_bull`);
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
        // Set the selected title's :target:before css style
        let selectedLine = document.getElementById(`line${titleID}`);
        if (selectedLine && (selectedLine.tagName[0] === "H")) {
            // style.ui_anchorTargetBefore = eval(`style.h${selectedLine.tagName[1]}_margin`);
            switch (selectedLine.tagName[1]) {
                case '1':
                    style.ui_anchorTargetBefore = style.h1_margin;
                break;
                case '2':
                    style.ui_anchorTargetBefore = style.h2_margin;
                break;
                case '3':
                    style.ui_anchorTargetBefore = style.h3_margin;
                break;
                case '4':
                    style.ui_anchorTargetBefore = style.h4_margin;
                break;
                case '5':
                    style.ui_anchorTargetBefore = style.h5_margin;
                break;
                case '6':
                    style.ui_anchorTargetBefore = style.h6_margin;
                break;
                default:
                    style.ui_anchorTargetBefore = style.h2_margin;
            }
        }
    } catch (error) {
        console.log(`Error: No title with ID ${titleID} found.`);
    }
}

function getTopLineNumber() {
    let curLineNumber = 0;
    for (i in contentContainer.children) {
        if (isInViewport(contentContainer.children[i])) {
            curLineNumber = parseInt(contentContainer.children[i].id.replace('line', ''));
            break;
        }
    }
    return curLineNumber;
}

function getBottomLineNumber() {
    let curLineNumber = 0;
    for (i in contentContainer.children) {
        if (isInViewport(contentContainer.children[i])) {
            curLineNumber = parseInt(contentContainer.children[i].id.replace('line', ''));
        }
    }
    return curLineNumber;
}

FUNC_KEYDOWN_ = document.onkeydown; // 保存页面原来的 onkeydown 函数，下面会临时屏蔽 onkeydown
function freezeContent() {
    document.onkeydown = null;
    $("body").css("overflow-y", "hidden");
}
function unfreezeContent() {
    document.onkeydown = FUNC_KEYDOWN_;
    $("body").css("overflow-y", "auto");
}
