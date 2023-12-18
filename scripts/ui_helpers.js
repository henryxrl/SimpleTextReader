function setMainContentUI() {
    // console.log("setMainContentUI");

    // console.log(style.mainColor_active);
    // console.log(hexToHSL(style.mainColor_active));
    // console.log(hexToHSL(style.mainColor_active, 1.5));
    // console.log(HSLToHex(...hexToHSL(style.mainColor_active)));
    // console.log(HSLToHex(...hexToHSL(style.mainColor_active, 1.5)));

    // const rgb = hexToRGB(style.mainColor_active);
    // const color = new Color(rgb[0], rgb[1], rgb[2]);
    // const solver = new Solver(color);
    // const result = solver.solve(10);
    // console.log(result.filter);

    // Dark mode
    darkModeToggle.checked = (!getUIMode());
    setUIMode(!darkModeToggle.checked);
    style.ui_Mode = (!darkModeToggle.checked ? "light" : "dark");
    // console.log(style.ui_Mode);
    dropZoneTextImgWrapper.title = style.ui_tooltip_dropZone;
    darkModeActualButton.title = style.ui_tooltip_modeToggle;
    setTimeout(function() {
        style.darkMode_animation = style.darkMode_default_animation;
    }, 1000);

    // UI calculations
    const maxWidth = sh(100) / 9 * 16;
    // const maxWidth = sh(100) * 2;
    style.ui_maxWidth = `${maxWidth}px`;

    // windowWith = windowLeftRightMargin + tocWidth + gapWidth + contentWidth + windowLeftRightMargin;
    style.ui_contentMarginLeft = (100 - parseInt(style.ui_contentWidth) - parseInt(style.ui_windowLeftRightMargin)).toString();
    // console.log("IN SETMAINCONTENTUI: style.ui_contentMarginLeft: " + style.ui_contentMarginLeft);

    const tocWidthPercent = 100 - parseInt(style.ui_contentWidth) - parseInt(style.ui_windowLeftRightMargin) * 2 - parseInt(style.ui_gapWidth);
    const tocWidth = vw(100) <= maxWidth ? tocWidthPercent : tocWidthPercent * maxWidth / vw(100);
    style.ui_tocWidth = tocWidth.toString();

    const paginationLeftPercent = parseInt(style.ui_contentWidth) / 2 + parseInt(style.ui_contentMarginLeft);
    const paginationLeft = vw(100) <= maxWidth ? paginationLeftPercent : (paginationLeftPercent * maxWidth / 100 + (vw(100) - maxWidth) / 2) / vw(100) * 100;
    style.ui_paginationCenter = paginationLeft.toString();
    
    // Main content
    if (isVariableDefined(contentContainer)) {
        contentContainer.style.width = style.ui_contentWidth + '%';
        contentContainer.style.marginTop = '0px';
        contentContainer.style.marginRight = '0px';
        contentContainer.style.marginBottom = '0px';
        contentContainer.style.marginLeft = style.ui_contentMarginLeft + '%';
    }

    // TOC
    if (isVariableDefined(tocContainer)) {
        tocContainer.style.width = style.ui_tocWidth + '%';
        tocContainer.style.height = style.ui_tocHeight + '%';
        tocContainer.style.marginTop = '0px';
        tocContainer.style.marginRight = '0px';
        tocContainer.style.marginBottom = '0px';
        tocContainer.style.marginLeft = style.ui_windowLeftRightMargin + '%';

        tocContainer.style.left = `calc(${contentContainer.getBoundingClientRect().x}px - ${tocContainer.getBoundingClientRect().width}px - ${style.ui_gapWidth}% - ${style.ui_windowLeftRightMargin}%)`;
    }

    // Pagination
    if (isVariableDefined(paginationContainer)) {
        paginationContainer.style.left = style.ui_paginationCenter + '%';
    }

    // Progress
    if (isVariableDefined(progressContainer)) {
        progressContainer.style.width = style.ui_tocWidth + '%';
        progressContainer.style.marginTop = '2.5em';
        progressContainer.style.marginRight = '0';
        progressContainer.style.marginBottom = '2.5em';
        progressContainer.style.marginLeft = style.ui_windowLeftRightMargin + '%';
        progressContainer.style.top = '75%';

        progressContainer.style.left = `calc(${contentContainer.getBoundingClientRect().x}px - ${tocContainer.getBoundingClientRect().width}px - ${style.ui_gapWidth}% - ${style.ui_windowLeftRightMargin}%)`;
    }
}

function updateTOCUI(isIncreasing) {
    const maxWidth = parseFloat(style.ui_maxWidth);
    const tocWidthPercent = 100 - parseInt(style.ui_contentWidth) - parseInt(style.ui_windowLeftRightMargin) * 2 - parseInt(style.ui_gapWidth);
    const tocWidth = vw(100) <= maxWidth ? tocWidthPercent : tocWidthPercent * maxWidth / vw(100);
    style.ui_tocWidth = tocWidth.toString();

    if (isVariableDefined(tocContainer)) {
        tocContainer.style.width = style.ui_tocWidth + '%';
        tocContainer.style.height = style.ui_tocHeight + '%';
        if (tocContainer.scrollHeight > (window.innerHeight * 0.5)) {
            tocContainer.style.height = '50%';
        }

        tocContainer.style.left = `calc(${contentContainer.getBoundingClientRect().x}px - ${tocContainer.getBoundingClientRect().width}px - ${style.ui_gapWidth}% - ${style.ui_windowLeftRightMargin}%)`;
    }

    if (isVariableDefined(progressContainer)) {
        progressContainer.style.width = style.ui_tocWidth + '%';
        progressContainer.style.left = `calc(${contentContainer.getBoundingClientRect().x}px - ${tocContainer.getBoundingClientRect().width}px - ${style.ui_gapWidth}% - ${style.ui_windowLeftRightMargin}%)`;
    }

    if (isVariableDefined(paginationContainer)) {
        if (!isIncreasing) {
            if (((paginationContainer.offsetWidth) > (contentContainer.offsetWidth * 0.5)) && (parseInt(style.ui_numPaginationItems) > 5)) {
                style.ui_numPaginationItems = (parseInt(style.ui_numPaginationItems) - 2).toString();
                style.ui_numPaginationItems = (Math.max(parseInt(style.ui_numPaginationItems), 5)).toString();
                generatePagination();
            }
        } else {
            if (((paginationContainer.offsetWidth + 2*(paginationContainer.offsetWidth / (parseInt(style.ui_numPaginationItems) + 2))) < (contentContainer.offsetWidth * 0.5)) && (parseInt(style.ui_numPaginationItems) < 9)) {
                style.ui_numPaginationItems = (parseInt(style.ui_numPaginationItems) + 2).toString();
                style.ui_numPaginationItems = (Math.min(parseInt(style.ui_numPaginationItems), 9)).toString();
                generatePagination();
            }
        }

        const paginationLeftPercent = parseInt(style.ui_contentWidth) / 2 + parseInt(style.ui_contentMarginLeft);
        const paginationLeft = vw(100) <= maxWidth ? paginationLeftPercent : (paginationLeftPercent * maxWidth / 100 + (vw(100) - maxWidth) / 2) / vw(100) * 100;
        style.ui_paginationCenter = paginationLeft.toString();
        paginationContainer.style.left = style.ui_paginationCenter + '%';
    }
}

function setMainContentUI_onRatio() {
    if (window.innerWidth < window.innerHeight) {
        // Portrait mode
        tocContainer.style.display = "none";
        tocContainer.style.width = '36%';
        // tocContainer.style.height = '75%';
        tocContainer.style.backgroundColor = style.bgColor;
        tocContainer.style.marginLeft = '0%';
        tocContainer.style.paddingLeft = style.ui_windowLeftRightMargin + '%';
        tocContainer.style.border = '1px solid ' + style.borderColor;
        tocContainer.style.borderBottom = 'none';
        tocContainer.style.boxShadow = '0 0 1px ' + style.shadowColor + ', 0 0 2px ' + style.shadowColor + ', 0 0 4px ' + style.shadowColor + ', 0 0 8px ' + style.shadowColor + ', 0 0 16px ' + style.shadowColor;
        tocContainer.style.clipPath = 'inset(-16px -16px 0px -16px)';
        contentContainer.style.marginLeft = style.ui_windowLeftRightMargin + '%';
        contentContainer.style.width = (parseInt(style.ui_contentWidth) + parseInt(style.ui_contentMarginLeft) - parseInt(style.ui_windowLeftRightMargin)) + '%';
        progressContainer.style.display = "none";
        progressContainer.style.width = '36%';
        progressContainer.style.backgroundColor = style.bgColor;
        progressContainer.style.marginTop = '0';
        progressContainer.style.marginBottom = '0';
        progressContainer.style.marginLeft = '0';
        progressContainer.style.paddingTop = '3em';
        progressContainer.style.paddingBottom = '3em';
        progressContainer.style.paddingLeft = style.ui_windowLeftRightMargin + '%';
        progressContainer.style.border = '1px solid ' + style.borderColor;
        progressContainer.style.borderTop = 'none';
        progressContainer.style.boxShadow = '0 0 1px ' + style.shadowColor + ', 0 0 2px ' + style.shadowColor + ', 0 0 4px ' + style.shadowColor + ', 0 0 8px ' + style.shadowColor + ', 0 0 16px ' + style.shadowColor;
        progressContainer.style.clipPath = 'inset(1px -16px -16px -16px)';
        progressContainer.style.setProperty("top", "calc(75% - 1px)");
        paginationContainer.style.left = '50%';
    } else {
        // Landscape mode
        tocContainer.style.display = "block";
        tocContainer.style.width = style.ui_tocWidth + '%';
        // tocContainer.style.height = style.ui_tocHeight + '%';
        tocContainer.style.backgroundColor = 'transparent';
        tocContainer.style.border = 'none';
        tocContainer.style.boxShadow = 'none';
        tocContainer.style.clipPath = 'none';
        tocContainer.style.clipPath = 'none';
        contentContainer.style.marginLeft = style.ui_contentMarginLeft + '%';
        contentContainer.style.width = style.ui_contentWidth + '%';
        progressContainer.style.display = "block";
        progressContainer.style.width = style.ui_tocWidth + '%';
        progressContainer.style.backgroundColor = 'transparent';
        progressContainer.style.marginTop = '3em';
        progressContainer.style.marginRight = '0';
        progressContainer.style.marginBottom = '3em';
        progressContainer.style.paddingTop = '0';
        progressContainer.style.paddingBottom = '0';
        progressContainer.style.border = 'none';
        progressContainer.style.boxShadow = 'none';
        progressContainer.style.clipPath = 'none';
        progressContainer.style.top = '75%';
        paginationContainer.style.left = style.ui_paginationCenter + '%';
    }
}

function setTOC_onRatio(initial=false) {
    if (window.innerWidth < window.innerHeight) {
        // Portrait mode
        if (initial) {
            tocContainer.style.display = "none";
            progressContainer.style.display = "none";
        } else {
            if (tocContainer.style.display == "block") {
                tocContainer.style.display = "none";
                progressContainer.style.display = "none";
            } else {
                tocContainer.style.display = "block";
                progressContainer.style.display = "block";
            }
        }
    }
}

function showDropZone(focused=false) {
    // hide menus
    if (isVariableDefined(document.getElementById('settings-menu'))) {
        hideSettingMenu();
    }
    if (isVariableDefined($(".dot-menu__checkbox"))) {
        $(".dot-menu__checkbox").prop("checked", false);
    }
    if (isVariableDefined($(".bookInfoMenu"))) {
        $(".bookInfoMenu").remove();
    }

    if (isVariableDefined(dropZone) && isVariableDefined(dropZoneText) && isVariableDefined(dropZoneImg)) {
        let c = null;
        // let filter = style.mainColor_inactive_filter;
        if (focused) {
            c = style.mainColor_active;
            dropZone.style.borderColor = c;
            // filter = style.mainColor_active_filter;
        } else {
            c = style.mainColor_inactive;
            // dropZone.style.borderColor = c;
            $('#dropZone').css('border-color', 'var(--main-color-inactive)');
            // filter = style.mainColor_inactive_filter;
        }
        let filter = style.toGray_filter;
        dropZone.style.visibility = "visible";
        dropZone.style.zIndex = "999";
        // dropZone.style.borderColor = c;
        dropZoneText.style.visibility = "visible";
        dropZoneText.style.zIndex = "1000";
        // dropZoneText.style.color = c;
        dropZoneImg.style.visibility = "visible";
        dropZoneImg.style.zIndex = "1001";
        // dropZoneImg.style.setProperty("filter", filter);

        // Fix icons location with/without scrollbar
        style.ui_btnOffset = "0px";

        // Hide bookshelf trigger button if bookshelf is opened
        if (isVariableDefined(bookshelf))
            bookshelf.hideTriggerBtn();
        return 0;
    } else {
        return 1;
    }
}

function hideDropZone() {
    if (isVariableDefined(dropZone) && isVariableDefined(dropZoneText) && isVariableDefined(dropZoneImg)) {
        dropZone.style.visibility = "hidden";
        dropZone.style.zIndex = "1";
        dropZoneText.style.visibility = "hidden";
        dropZoneText.style.zIndex = "2";
        dropZoneImg.style.visibility = "hidden";
        dropZoneImg.style.zIndex = "3";

        // Fix icons location with/without scrollbar
        style.ui_btnOffset = (-1 * parseInt(style.ui_scrollBarWidth)).toString() + "px";

        // Show bookshelf trigger button if a book is opened
        if (isVariableDefined(bookshelf))
            bookshelf.showTriggerBtn();
    }
}

function showLoadingScreen() {
    loadingScreen.style.visibility = "visible";

    // Fix icons location with/without scrollbar
    style.ui_btnOffset = "0px";
}

function hideLoadingScreen() {
    loadingScreen.style.visibility = "hidden";

    // Fix icons location with/without scrollbar
    // style.ui_btnOffset = (-1 * parseInt(style.ui_scrollBarWidth)).toString() + "px";
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

async function resetUI(refreshBookshelf = true, hardRefresh = true, sortBookshelf = true) {
    if (isVariableDefined(bookshelf)) {
        // console.log(`refreshBookshelf: ${refreshBookshelf}, HardRefresh: ${hardRefresh}`);
        if (refreshBookshelf) {
            await bookshelf.refreshBookList(hardRefresh, sortBookshelf);
        }
    }
    setLanguage(webLANG);
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
    storePrevWindowWidth = window.innerWidth;
    titlePageLineNumberOffset = 0;

    setTitle();
    contentContainer.innerHTML = "";
    tocContainer.innerHTML = "";
    progressTitle.innerHTML = "";
    progressContent.innerHTML = "";
    footNoteContainer.innerHTML = "";
}
