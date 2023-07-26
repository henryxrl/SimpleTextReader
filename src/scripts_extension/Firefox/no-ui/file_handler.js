// console.log("document.readyState:", document.readyState);
// console.log("paths:", paths);
// if ((document.readyState === 'interactive') && (typeof paths == 'object') && (typeof style == 'object')) {
if ((typeof paths == 'object') && (typeof style == 'object')) {
    // console.log("paths:", paths);
    // console.log("style:", style);
    setupUI_content();
} 


function setupUI_content () {
// window.onload = function () {
    var body = document.body;
    var pre = document.getElementsByTagName("pre");
    // document.title = "易笺";

    pre = document.getElementsByTagName("pre")[0];
    if (!pre) {
        preText = body.innerHTML;
        body.innerHTML = "";
    } else {
        preText = pre.innerHTML;
        pre.innerHTML = "";
    }

    // Get file content
    fileContentChunks = preText.split("\n").filter(Boolean).filter(n => n.trim() !== '');
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
    filename = decodeURI(window.location.href.split("/").pop().split(new RegExp("(.txt)", "i")).shift());
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
            fileContentChunks[i] = makeFootNote(fileContentChunks[i]);
        }
    }
    // console.log(allTitles);
    // tocContainer.innerHTML = processTOC_bak();
    processTOC();
    // setMainContentUI();

    // Add title page
    let stampRotation = (style.ui_LANG === "EN") ? `transform:rotate(${randomFloatFromInterval(-50, 80)}deg)` : "";
    // fileContentChunks.unshift(`<div id=line${(titlePageLineNumberOffset - 1)} class='prevent-select stamp'><img id='stamp_${style.ui_LANG}' src='${eval(`paths.img_path_stamp_${style.ui_LANG}`)}' style='left:calc(${randomFloatFromInterval(0, 1)} * (100% - ${`style.stamp_width_${style.ui_LANG}`})); ${stampRotation}'/></div>`);
    let stampSrc = (style.ui_LANG === "CN") ? paths.img_path_stamp_CN : paths.img_path_stamp_EN;
    // console.log("ui_LANG", style.ui_LANG, "stampSrc: ", stampSrc);
    fileContentChunks.unshift(`<div id=line${(titlePageLineNumberOffset - 1)} class='prevent-select stamp'><img id='stamp_${style.ui_LANG}' src='${stampSrc}' style='left:calc(${randomFloatFromInterval(0, 1)} * (100% - ${style.ui_LANG === 'CN' ? style.stamp_width_CN : style.stamp_width_EN})); ${stampRotation}'/></div>`);
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
    GetScrollPositions();

    // Retrieve reading history if exists
    // removeAllHistory();    // for debugging
    let curLineNumber = getHistory(filename);
    if ((currentPage === 1) && (curLineNumber === 0) && (window.scrollY === 0)) {
        // if the first line is a header, it will show up in TOC
        setTitleActive(curLineNumber);
    }
}