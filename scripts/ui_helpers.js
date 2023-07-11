function setMainContentUI() {
    dropZoneText.innerHTML = eval("style.ui_dropZoneText_" + style.ui_LANG);
    // windowWith = windowLeftRightMargin + tocWidth + gapWidth + contentWidth + windowLeftRightMargin;
    let contentMarginLeft = 100 - style.ui_contentWidth - style.ui_windowLeftRightMargin;
    let tocWidth = 100 - style.ui_contentWidth - style.ui_windowLeftRightMargin * 2 - style.ui_gapWidth;
    let paginationCenter = style.ui_contentWidth / 2 + contentMarginLeft;
    contentContainer.style.width = style.ui_contentWidth + '%';
    contentContainer.style.marginTop = '0px';
    contentContainer.style.marginRight = '0px';
    contentContainer.style.marginBottom = '0px';
    contentContainer.style.marginLeft = contentMarginLeft + '%';
    tocContainer.style.width = tocWidth + '%';
    tocContainer.style.marginTop = '0px';
    tocContainer.style.marginRight = '0px';
    tocContainer.style.marginBottom = '0px';
    tocContainer.style.marginLeft = style.ui_windowLeftRightMargin + '%';
    paginationContainer.style.left = paginationCenter + '%';
    progressContainer.style.width = tocWidth + '%';
    progressContainer.style.marginTop = '3em';
    progressContainer.style.marginRight = '0';
    progressContainer.style.marginBottom = '0';
    progressContainer.style.marginLeft = style.ui_windowLeftRightMargin + '%';
}

function showDropZone(focused=false) {
    let c = style.mainColor;
    let filter = style.mainColor_filter;
    if (focused) {
        c = style.mainColor_focused;
        filter = style.mainColor_focused_filter;
    }
    dropZone.style.visibility = "visible";
    dropZone.style.zIndex = "999";
    dropZone.style.borderColor = c;
    dropZoneText.style.visibility = "visible";
    dropZoneText.style.zIndex = "1000";
    dropZoneText.style.color = c;
    dropZoneImg.style.visibility = "visible";
    dropZoneImg.style.zIndex = "1001";
    dropZoneImg.style.setProperty("filter", filter);
}

function hideDropZone() {
    dropZone.style.visibility = "hidden";
    dropZone.style.zIndex = "1";
    dropZoneText.style.visibility = "hidden";
    dropZoneText.style.zIndex = "2";
    dropZoneImg.style.visibility = "hidden";
    dropZoneImg.style.zIndex = "3";
}

function showLoadingScreen() {
    loadingScreen.style.visibility = "visible";
}

function hideLoadingScreen() {
    loadingScreen.style.visibility = "hidden";
}

function showContent() {
    contentContainer.style.visibility = "visible";
    tocContainer.style.visibility = "visible";
    paginationContainer.style.visibility = "visible";
    progressContainer.style.visibility = "visible";
}

function hideContent() {
    contentContainer.style.visibility = "hidden";
    tocContainer.style.visibility = "hidden";
    paginationContainer.style.visibility = "hidden";
    progressContainer.style.visibility = "hidden";
}

function resetUI() {
    resetVars();
    showDropZone();
    hideLoadingScreen();
    hideContent();
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
    dragCounter = 0;
    historyLineNumber = 0;

    document.title = eval("style.ui_title_" + style.ui_LANG);
    contentContainer.innerHTML = "";
    tocContainer.innerHTML = "";
    progressContainer.innerHTML = "";
    footNoteContainer.innerHTML = "";
}