/**
 * @fileoverview UI helper functions for managing interface elements and layout
 *
 * This module provides utility functions for:
 * - Language switching and localization
 * - Viewport and screen size calculations
 * - UI element visibility management
 * - Layout calculations and adjustments
 * - Content container positioning
 *
 * @module client/app/utils/helpers-ui
 * @requires client/app/config/index
 * @requires client/app/utils/base
 * @requires client/app/modules/features/reader
 * @requires client/app/utils/helpers-reader
 */

import * as CONFIG from "../config/index.js";
import { ICONS } from "../config/icons.js";
import { reader } from "../modules/features/reader.js";
import { PopupManager } from "../modules/components/popup-manager.js";
import { isVariableDefined, triggerCustomEvent, toBool } from "./base.js";
import { setTitle } from "./helpers-reader.js";

// ===============================
// UI Mode Related Functions
// ===============================
/**
 * Sets the UI theme mode and updates related settings
 * @param {boolean} mode - True for light mode, false for dark mode
 * @param {boolean} [silence=false] - Whether to suppress console logs
 * @public
 */
export function setUIMode(mode, silence = false) {
    const theme = mode ? "light" : "dark";
    if (!silence) {
        console.log(`UI mode set to ${theme}.`);
    }

    localStorage.setItem("UIMode", mode);
    CONFIG.RUNTIME_VARS.STYLE.ui_Mode = theme;

    triggerCustomEvent("loadSettings");
    triggerCustomEvent("applySettings");
    document.documentElement.setAttribute("data-theme", theme);

    // Trigger updateAllBookCovers event
    triggerCustomEvent("updateAllBookCovers");
}

/**
 * Gets the current UI theme mode from localStorage
 * @param {boolean} [silence=false] - Whether to suppress console logs
 * @returns {boolean} True for light mode, false for dark mode
 * @public
 */
export function getUIMode(silence = false) {
    const storedMode = localStorage.getItem("UIMode");
    if (isVariableDefined(storedMode)) {
        const mode = JSON.parse(storedMode);
        if (!silence) {
            console.log(`UI mode is ${mode ? "light" : "dark"}.`);
        }
        return mode;
    }
    if (!silence) {
        console.log("UI mode is light by default.");
    }
    return true;
}

// ===============================
// Viewport/Screen Size Related Functions
// ===============================
/**
 * Calculates viewport height percentage
 * @param {number} percent - Percentage of viewport height
 * @returns {number} Calculated height in pixels
 * @public
 */
export function vh(percent) {
    const h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    return (percent * h) / 100;
}

/**
 * Calculates viewport width percentage
 * @param {number} percent - Percentage of viewport width
 * @returns {number} Calculated width in pixels
 * @public
 */
export function vw(percent) {
    const w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    return (percent * w) / 100;
}

/**
 * Calculates screen height percentage
 * @param {number} percent - Percentage of screen height
 * @returns {number} Calculated height in pixels
 * @public
 */
export function sh(percent) {
    const h = Math.max(screen.height || 0);
    return (percent * h) / 100;
}

/**
 * Calculates screen width percentage
 * @param {number} percent - Percentage of screen width
 * @returns {number} Calculated width in pixels
 * @public
 */
export function sw(percent) {
    const w = Math.max(screen.width || 0);
    return (percent * w) / 100;
}

// ===============================
// Display/Visibility Related Functions
// ===============================
/**
 * Shows the file drop zone and adjusts UI elements
 * @param {boolean} [focused=false] - Whether the drop zone should be in focused state
 * @param {boolean} [hideBookshelf=false] - Whether the bookshelf should be hidden
 * @public
 */
export function showDropZone(focused = false, hideBookshelf = false) {
    // Hide setting menu
    triggerCustomEvent("hideSettingsMenu");
    if (isVariableDefined($(".dot-menu__checkbox"))) {
        $(".dot-menu__checkbox").prop("checked", false);
    }
    if (isVariableDefined($(".bookinfo-menu"))) {
        $(".bookinfo-menu").remove();
    }

    if (
        isVariableDefined(CONFIG.DOM_ELEMENT.DROPZONE) &&
        isVariableDefined(CONFIG.DOM_ELEMENT.DROPZONE_TEXT) &&
        isVariableDefined(CONFIG.DOM_ELEMENT.DROPZONE_IMG)
    ) {
        // To avoid scrollbar from appearing when dropping a file
        CONFIG.DOM_ELEMENT.BODY.style.overflow = "hidden";

        let c = null;
        // const filter = CONFIG.RUNTIME_VARS.STYLE.mainColor_inactive_filter;
        if (focused) {
            c = CONFIG.RUNTIME_VARS.STYLE.mainColor_active;
            CONFIG.DOM_ELEMENT.DROPZONE.style.borderColor = c;
            // filter = CONFIG.RUNTIME_VARS.STYLE.mainColor_active_filter;
        } else {
            c = CONFIG.RUNTIME_VARS.STYLE.mainColor_inactive;
            // CONFIG.DOM_ELEMENT.DROPZONE.style.borderColor = c;
            // $("#dropZone").css("border-color", "var(--main-color-inactive)");
            CONFIG.DOM_ELEMENT.DROPZONE.style.borderColor = "var(--main-color-inactive)";
            // filter = CONFIG.RUNTIME_VARS.STYLE.mainColor_inactive_filter;
        }
        // const filter = CONFIG.RUNTIME_VARS.STYLE.toGray_filter;
        CONFIG.DOM_ELEMENT.DROPZONE.style.visibility = "visible";
        CONFIG.DOM_ELEMENT.DROPZONE.style.zIndex = "999";
        // CONFIG.DOM_ELEMENT.DROPZONE.style.borderColor = c;
        CONFIG.DOM_ELEMENT.DROPZONE_TEXT.style.visibility = "visible";
        CONFIG.DOM_ELEMENT.DROPZONE_TEXT.style.zIndex = "1000";
        // CONFIG.DOM_ELEMENT.DROPZONE_TEXT.style.color = c;
        CONFIG.DOM_ELEMENT.DROPZONE_IMG.style.visibility = "visible";
        CONFIG.DOM_ELEMENT.DROPZONE_IMG.style.zIndex = "1001";
        // CONFIG.DOM_ELEMENT.DROPZONE_IMG.style.setProperty("filter", filter);

        // Fix icons location with/without scrollbar
        CONFIG.RUNTIME_VARS.STYLE.ui_btnOffset = "0px";

        // Hide bookshelf trigger button if bookshelf is opened
        triggerCustomEvent("hideBookshelfTriggerBtn");

        if (hideBookshelf) {
            triggerCustomEvent("hideBookshelf");
        } else {
            triggerCustomEvent("showBookshelf");
        }
    }
}

/**
 * Hides the file drop zone and adjusts UI elements
 * @param {boolean} [showBookshelfTriggerBtn=true] - Whether to show the bookshelf trigger button
 * @public
 */
export function hideDropZone(showBookshelfTriggerBtn = true) {
    if (
        isVariableDefined(CONFIG.DOM_ELEMENT.DROPZONE) &&
        isVariableDefined(CONFIG.DOM_ELEMENT.DROPZONE_TEXT) &&
        isVariableDefined(CONFIG.DOM_ELEMENT.DROPZONE_IMG)
    ) {
        // To restore scrollbar
        CONFIG.DOM_ELEMENT.BODY.style.overflow = "visible";

        // Hide drop zone
        CONFIG.DOM_ELEMENT.DROPZONE.style.visibility = "hidden";
        CONFIG.DOM_ELEMENT.DROPZONE.style.zIndex = "1";
        CONFIG.DOM_ELEMENT.DROPZONE_TEXT.style.visibility = "hidden";
        CONFIG.DOM_ELEMENT.DROPZONE_TEXT.style.zIndex = "2";
        CONFIG.DOM_ELEMENT.DROPZONE_IMG.style.visibility = "hidden";
        CONFIG.DOM_ELEMENT.DROPZONE_IMG.style.zIndex = "3";

        // Fix icons location with/without scrollbar
        // CONFIG.RUNTIME_VARS.STYLE.ui_btnOffset =
        //     (-1 * parseInt(CONFIG.RUNTIME_VARS.STYLE.ui_scrollBarWidth)).toString() + "px";

        // Show bookshelf trigger button if a book is opened
        if (showBookshelfTriggerBtn) {
            triggerCustomEvent("showBookshelfTriggerBtn");
        }
    }
}

/**
 * Resets the drop zone state, hiding or showing the drop zone based on the content container
 * @param {boolean} [force=false] - Whether to force the drop zone state to be reset
 * @public
 */
export function resetDropZoneState(force = false) {
    if (CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.innerHTML === "") {
        hideContent(force);
        showDropZone();
    } else {
        hideDropZone();
        showContent(force);
        CONFIG.VARS.INIT = false;
    }
}

/**
 * Shows the loading screen and adjusts button offsets
 * @public
 */
export function showLoadingScreen() {
    CONFIG.DOM_ELEMENT.LOADING_SCREEN.style.visibility = "visible";

    // Fix icons location with/without scrollbar
    CONFIG.RUNTIME_VARS.STYLE.ui_btnOffset = "0px";

    // Hide bookshelf trigger button if bookshelf is opened
    triggerCustomEvent("hideBookshelfTriggerBtn");
}

/**
 * Hides the loading screen
 * @param {boolean} [showBookshelfTriggerBtn=true] - Whether to show the bookshelf trigger button
 * @public
 */
export function hideLoadingScreen(showBookshelfTriggerBtn = true) {
    CONFIG.DOM_ELEMENT.LOADING_SCREEN.style.visibility = "hidden";

    // Fix icons location with/without scrollbar
    // CONFIG.RUNTIME_VARS.STYLE.ui_btnOffset = (-1 * parseInt(CONFIG.RUNTIME_VARS.STYLE.ui_scrollBarWidth)).toString() + "px";

    // Show bookshelf trigger button if bookshelf is closed
    if (showBookshelfTriggerBtn) {
        triggerCustomEvent("showBookshelfTriggerBtn");
    }
}

/**
 * Shows main content containers (content, TOC, pagination, progress)
 * @param {boolean} [force=false] - Whether to force the content state to be reset
 * @public
 */
export function showContent(force = false) {
    if (force) {
        CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.style.display = "block";
        CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.display = "block";
        CONFIG.DOM_ELEMENT.PAGINATION_CONTAINER.style.display = "block";
        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.display = "block";
    }
    CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.style.visibility = "visible";
    CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.visibility = "visible";
    CONFIG.DOM_ELEMENT.PAGINATION_CONTAINER.style.visibility = "visible";
    CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.visibility = "visible";
}

/**
 * Hides main content containers (content, TOC, pagination, progress)
 * @param {boolean} [force=false] - Whether to force the content state to be reset
 * @public
 */
export function hideContent(force = false) {
    CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.style.visibility = "hidden";
    CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.visibility = "hidden";
    CONFIG.DOM_ELEMENT.PAGINATION_CONTAINER.style.visibility = "hidden";
    CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.visibility = "hidden";
    if (force) {
        CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.style.display = "none";
        CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.display = "none";
        CONFIG.DOM_ELEMENT.PAGINATION_CONTAINER.style.display = "none";
        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.display = "none";
    }
}

/**
 * Resets all UI elements to their initial state and clears content, TOC, and pagination containers
 * @param {boolean} [refreshBookshelf=true] - Whether to refresh the bookshelf
 * @param {boolean} [hardRefresh=true] - Whether to perform a hard refresh of the bookshelf
 * @param {boolean} [sortBookshelf=true] - Whether to sort the bookshelf after refresh
 * @returns {Promise<void>}
 * @public
 *
 * @see resetVars
 * @see setLanguage
 * @see showDropZone
 * @see hideLoadingScreen
 * @see hideContent
 */
export async function resetUI(
    refreshBookshelf = true,
    hardRefresh = true,
    sortBookshelf = true,
    inFileLoadCallback = false
) {
    if (refreshBookshelf) {
        // Trigger bookshelf refresh event with parameters
        triggerCustomEvent("refreshBookList", {
            hardRefresh,
            sortBookshelf,
        });
    }
    triggerCustomEvent("updateUILanguage", {
        lang: CONFIG.RUNTIME_VARS.WEB_LANG,
        saveToLocalStorage: true,
    });
    resetVars();
    if (!inFileLoadCallback) {
        hideContent();
        hideLoadingScreen();
        showDropZone();
    }
}

/**
 * Resets global variables to their default values
 * Clears file content, titles, and reading progress
 * @public
 */
export function resetVars() {
    CONFIG.VARS.reset();
    CONFIG.RUNTIME_VARS.STORE_PREV_WINDOW_WIDTH = window.innerWidth;

    setTitle();
    CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.innerHTML = "";
    CONFIG.DOM_ELEMENT.TOC_CONTAINER.innerHTML = "";
    CONFIG.DOM_ELEMENT.PROGRESS_TITLE.innerHTML = "";
    CONFIG.DOM_ELEMENT.PROGRESS_CONTENT.innerHTML = "";
    CONFIG.DOM_ELEMENT.FOOTNOTE_CONTAINER.innerHTML = "";
}

// ===============================
// Layout/Positioning Related Functions
// ===============================
/**
 * Initializes the light/dark mode
 * @param {boolean} [silence=false] - Whether to suppress console logs
 * @public
 * @see getUIMode
 * @see setUIMode
 */
export function initUIMode(silence = false) {
    CONFIG.DOM_ELEMENT.DARK_MODE_TOGGLE.checked = !getUIMode(silence);
    setUIMode(!CONFIG.DOM_ELEMENT.DARK_MODE_TOGGLE.checked, silence);
    CONFIG.RUNTIME_VARS.STYLE.ui_Mode = !CONFIG.DOM_ELEMENT.DARK_MODE_TOGGLE.checked ? "light" : "dark";
    // console.log(CONFIG.RUNTIME_VARS.STYLE.ui_Mode);
    // CONFIG.DOM_ELEMENT.DROPZONE.dataset.title = CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_dropZone;
    CONFIG.DOM_ELEMENT.DARK_MODE_ACTUAL_BUTTON.dataset.title = CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_modeToggle;
    setTimeout(function () {
        CONFIG.RUNTIME_VARS.STYLE.darkMode_animation = CONFIG.RUNTIME_VARS.STYLE.darkMode_default_animation;
    }, 1000);
}

/**
 * Updates the Table of Contents UI and related container positions
 * @param {boolean} isIncreasing - Whether the window width is increasing
 * @public
 * @see reader.generatePagination
 */
export function updatePaginationCalculations(isIncreasing) {
    if (isVariableDefined(CONFIG.DOM_ELEMENT.PAGINATION_CONTAINER)) {
        if (!isIncreasing) {
            if (
                CONFIG.DOM_ELEMENT.PAGINATION_CONTAINER.offsetWidth >
                    CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.offsetWidth * 0.5 &&
                parseInt(CONFIG.RUNTIME_VARS.STYLE.ui_numPaginationItems) > 5
            ) {
                CONFIG.RUNTIME_VARS.STYLE.ui_numPaginationItems = (
                    parseInt(CONFIG.RUNTIME_VARS.STYLE.ui_numPaginationItems) - 2
                ).toString();
                CONFIG.RUNTIME_VARS.STYLE.ui_numPaginationItems = Math.max(
                    parseInt(CONFIG.RUNTIME_VARS.STYLE.ui_numPaginationItems),
                    5
                ).toString();
                reader.generatePagination();
            }
        } else {
            if (
                CONFIG.DOM_ELEMENT.PAGINATION_CONTAINER.offsetWidth +
                    2 *
                        (CONFIG.DOM_ELEMENT.PAGINATION_CONTAINER.offsetWidth /
                            (parseInt(CONFIG.RUNTIME_VARS.STYLE.ui_numPaginationItems) + 2)) <
                    CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.offsetWidth * 0.5 &&
                parseInt(CONFIG.RUNTIME_VARS.STYLE.ui_numPaginationItems) < 9
            ) {
                CONFIG.RUNTIME_VARS.STYLE.ui_numPaginationItems = (
                    parseInt(CONFIG.RUNTIME_VARS.STYLE.ui_numPaginationItems) + 2
                ).toString();
                CONFIG.RUNTIME_VARS.STYLE.ui_numPaginationItems = Math.min(
                    parseInt(CONFIG.RUNTIME_VARS.STYLE.ui_numPaginationItems),
                    9
                ).toString();
                reader.generatePagination();
            }
        }
    }
}

/**
 * Updates the Table of Contents UI and related container positions
 * @param {boolean} isIncreasing - Whether the window width is increasing
 * @public
 * @see reader.generatePagination
 * @deprecated
 */
export function updateTOCUI(isIncreasing) {
    const maxWidth = parseFloat(CONFIG.RUNTIME_VARS.STYLE.ui_maxWidth);
    const tocWidthPercent =
        100 -
        parseInt(CONFIG.RUNTIME_VARS.STYLE.ui_contentWidth) -
        parseInt(CONFIG.RUNTIME_VARS.STYLE.ui_windowLeftRightMargin) * 2 -
        parseInt(CONFIG.RUNTIME_VARS.STYLE.ui_gapWidth);
    const tocWidth = vw(100) <= maxWidth ? tocWidthPercent : (tocWidthPercent * maxWidth) / vw(100);
    CONFIG.RUNTIME_VARS.STYLE.ui_tocWidth = tocWidth.toString();

    if (isVariableDefined(CONFIG.DOM_ELEMENT.TOC_CONTAINER)) {
        CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.width = CONFIG.RUNTIME_VARS.STYLE.ui_tocWidth + "%";
        CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.height = CONFIG.RUNTIME_VARS.STYLE.ui_tocHeight + "%";
        if (CONFIG.DOM_ELEMENT.TOC_CONTAINER.scrollHeight > window.innerHeight * 0.5) {
            CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.height = "50%";
        }

        CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.left = `calc(${
            CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.getBoundingClientRect().x
        }px - ${CONFIG.DOM_ELEMENT.TOC_CONTAINER.getBoundingClientRect().width}px - ${
            CONFIG.RUNTIME_VARS.STYLE.ui_gapWidth
        }% - ${CONFIG.RUNTIME_VARS.STYLE.ui_windowLeftRightMargin}%)`;
    }

    if (isVariableDefined(CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER)) {
        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.width = CONFIG.RUNTIME_VARS.STYLE.ui_tocWidth + "%";
        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.left = `calc(${
            CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.getBoundingClientRect().x
        }px - ${CONFIG.DOM_ELEMENT.TOC_CONTAINER.getBoundingClientRect().width}px - ${
            CONFIG.RUNTIME_VARS.STYLE.ui_gapWidth
        }% - ${CONFIG.RUNTIME_VARS.STYLE.ui_windowLeftRightMargin}%)`;
    }

    if (isVariableDefined(CONFIG.DOM_ELEMENT.PAGINATION_CONTAINER)) {
        updatePaginationCalculations(isIncreasing);
        const paginationLeftPercent =
            parseInt(CONFIG.RUNTIME_VARS.STYLE.ui_contentWidth) / 2 +
            parseInt(CONFIG.RUNTIME_VARS.STYLE.ui_contentMarginLeft);
        const paginationLeft =
            vw(100) <= maxWidth
                ? paginationLeftPercent
                : (((paginationLeftPercent * maxWidth) / 100 + (vw(100) - maxWidth) / 2) / vw(100)) * 100;
        CONFIG.RUNTIME_VARS.STYLE.ui_paginationCenter = paginationLeft.toString();
        CONFIG.DOM_ELEMENT.PAGINATION_CONTAINER.style.left = CONFIG.RUNTIME_VARS.STYLE.ui_paginationCenter + "%";
    }
}

/**
 * Sets up main content UI layout and positioning
 * Calculates and applies dimensions for content, TOC, and progress containers
 * Handles responsive layout based on screen width and orientation
 * @param {boolean} [silence=false] - Whether to suppress console logs
 * @param {boolean} [setUIMode=true] - Whether to set the UI mode
 * @public
 * @deprecated
 */
export function setMainContentUI(silence = false, setUIMode = true) {
    // console.log("setMainContentUI");

    // console.log(CONFIG.RUNTIME_VARS.STYLE.mainColor_active);
    // console.log(hexToHSL(CONFIG.RUNTIME_VARS.STYLE.mainColor_active));
    // console.log(hexToHSL(CONFIG.RUNTIME_VARS.STYLE.mainColor_active, 1.5));
    // console.log(HSLToHex(...hexToHSL(CONFIG.RUNTIME_VARS.STYLE.mainColor_active)));
    // console.log(HSLToHex(...hexToHSL(CONFIG.RUNTIME_VARS.STYLE.mainColor_active, 1.5)));

    // import { Color, Solver } from './lib/css-filter-gen.js';
    // const rgb = hexToRGB(CONFIG.RUNTIME_VARS.STYLE.mainColor_active);
    // const color = new Color(rgb[0], rgb[1], rgb[2]);
    // const solver = new Solver(color);
    // const result = solver.solve(10);
    // console.log(result.filter);

    /**
     * Dark mode
     */
    if (setUIMode) {
        initUIMode(silence);
    }

    /**
     * UI calculations
     */
    const maxWidth = (sh(100) / 9) * 16;
    // const maxWidth = sh(100) * 2;
    CONFIG.RUNTIME_VARS.STYLE.ui_maxWidth = `${maxWidth}px`;

    // Account for TOC area visibility
    const TOC_visibility = toBool(localStorage.getItem("show_toc"), false) ?? CONFIG.CONST_CONFIG.SHOW_TOC_AREA;
    if (TOC_visibility) {
        CONFIG.RUNTIME_VARS.STYLE.ui_contentWidth = CONFIG.RUNTIME_VARS.STYLE.ui_contentWidth_default;
        CONFIG.RUNTIME_VARS.STYLE.ui_gapWidth = CONFIG.RUNTIME_VARS.STYLE.ui_gapWidth_default;
    } else {
        CONFIG.RUNTIME_VARS.STYLE.ui_gapWidth = "0";
        CONFIG.RUNTIME_VARS.STYLE.ui_contentWidth = (
            100 -
            parseInt(CONFIG.RUNTIME_VARS.STYLE.ui_windowLeftRightMargin) * 2
        ).toString();
    }

    // windowWith = windowLeftRightMargin + tocWidth + gapWidth + contentWidth + windowLeftRightMargin;
    CONFIG.RUNTIME_VARS.STYLE.ui_contentMarginLeft = (
        100 -
        parseInt(CONFIG.RUNTIME_VARS.STYLE.ui_contentWidth) -
        parseInt(CONFIG.RUNTIME_VARS.STYLE.ui_windowLeftRightMargin)
    ).toString();
    // console.log("IN SETMAINCONTENTUI: CONFIG.RUNTIME_VARS.STYLE.ui_contentMarginLeft: " + CONFIG.RUNTIME_VARS.STYLE.ui_contentMarginLeft);

    /**
     * TOC calculations
     */
    const tocWidthPercent =
        100 -
        parseInt(CONFIG.RUNTIME_VARS.STYLE.ui_contentWidth) -
        parseInt(CONFIG.RUNTIME_VARS.STYLE.ui_windowLeftRightMargin) * 2 -
        parseInt(CONFIG.RUNTIME_VARS.STYLE.ui_gapWidth);
    const tocWidth = vw(100) <= maxWidth ? tocWidthPercent : (tocWidthPercent * maxWidth) / vw(100);
    CONFIG.RUNTIME_VARS.STYLE.ui_tocWidth = tocWidth.toString();

    /**
     * Pagination calculations
     */
    const paginationLeftPercent =
        parseInt(CONFIG.RUNTIME_VARS.STYLE.ui_contentWidth) / 2 +
        parseInt(CONFIG.RUNTIME_VARS.STYLE.ui_contentMarginLeft);
    const paginationLeft =
        vw(100) <= maxWidth
            ? paginationLeftPercent
            : (((paginationLeftPercent * maxWidth) / 100 + (vw(100) - maxWidth) / 2) / vw(100)) * 100;
    CONFIG.RUNTIME_VARS.STYLE.ui_paginationCenter = paginationLeft.toString();

    /**
     * Apply main content calculations
     */
    if (isVariableDefined(CONFIG.DOM_ELEMENT.CONTENT_CONTAINER)) {
        CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.style.width = CONFIG.RUNTIME_VARS.STYLE.ui_contentWidth + "%";
        CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.style.marginTop = "0px";
        CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.style.marginRight = "0px";
        CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.style.marginBottom = "0px";
        CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.style.marginLeft = CONFIG.RUNTIME_VARS.STYLE.ui_contentMarginLeft + "%";
    }

    /**
     * Apply TOC calculations
     */
    if (isVariableDefined(CONFIG.DOM_ELEMENT.TOC_CONTAINER)) {
        CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.width = CONFIG.RUNTIME_VARS.STYLE.ui_tocWidth + "%";
        CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.height = CONFIG.RUNTIME_VARS.STYLE.ui_tocHeight + "%";
        CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.marginTop = "0px";
        CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.marginRight = "0px";
        CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.marginBottom = "0px";
        CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.marginLeft = CONFIG.RUNTIME_VARS.STYLE.ui_windowLeftRightMargin + "%";

        CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.left = `calc(${
            CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.getBoundingClientRect().x
        }px - ${CONFIG.DOM_ELEMENT.TOC_CONTAINER.getBoundingClientRect().width}px - ${
            CONFIG.RUNTIME_VARS.STYLE.ui_gapWidth
        }% - ${CONFIG.RUNTIME_VARS.STYLE.ui_windowLeftRightMargin}%)`;
    }

    /**
     * Apply pagination calculations
     */
    if (isVariableDefined(CONFIG.DOM_ELEMENT.PAGINATION_CONTAINER)) {
        CONFIG.DOM_ELEMENT.PAGINATION_CONTAINER.style.left = CONFIG.RUNTIME_VARS.STYLE.ui_paginationCenter + "%";
    }

    /**
     * Apply progress calculations
     */
    if (isVariableDefined(CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER)) {
        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.width = CONFIG.RUNTIME_VARS.STYLE.ui_tocWidth + "%";
        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.marginTop = "2.5em";
        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.marginRight = "0";
        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.marginBottom = "2.5em";
        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.marginLeft =
            CONFIG.RUNTIME_VARS.STYLE.ui_windowLeftRightMargin + "%";
        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.top = "75%";

        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.left = `calc(${
            CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.getBoundingClientRect().x
        }px - ${CONFIG.DOM_ELEMENT.TOC_CONTAINER.getBoundingClientRect().width}px - ${
            CONFIG.RUNTIME_VARS.STYLE.ui_gapWidth
        }% - ${CONFIG.RUNTIME_VARS.STYLE.ui_windowLeftRightMargin}%)`;
    }

    /**
     * Apply message indicator calculations
     */
    if (isVariableDefined(CONFIG.DOM_ELEMENT.MESSAGE_INDICATOR)) {
        CONFIG.DOM_ELEMENT.MESSAGE_INDICATOR.style.left = CONFIG.RUNTIME_VARS.STYLE.ui_paginationCenter + "%";
    }
}

/**
 * Adjusts UI layout based on screen orientation (portrait/landscape)
 * Handles responsive design for TOC, content, and progress containers
 * @public
 * @see setMainContentUI
 * @deprecated
 */
export function setMainContentUI_onRatio() {
    if (window.innerWidth < window.innerHeight) {
        // Portrait mode
        CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.display = "none";
        CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.width = "36%";
        // CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.height = '75%';
        CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.backgroundColor = CONFIG.RUNTIME_VARS.STYLE.bgColor;
        CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.marginLeft = "0%";
        CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.paddingLeft = CONFIG.RUNTIME_VARS.STYLE.ui_windowLeftRightMargin + "%";
        CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.border = "1px solid " + CONFIG.RUNTIME_VARS.STYLE.borderColor;
        CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.borderBottom = "none";
        CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.boxShadow =
            "0 0 1px " +
            CONFIG.RUNTIME_VARS.STYLE.shadowColor +
            ", 0 0 2px " +
            CONFIG.RUNTIME_VARS.STYLE.shadowColor +
            ", 0 0 4px " +
            CONFIG.RUNTIME_VARS.STYLE.shadowColor +
            ", 0 0 8px " +
            CONFIG.RUNTIME_VARS.STYLE.shadowColor +
            ", 0 0 16px " +
            CONFIG.RUNTIME_VARS.STYLE.shadowColor;
        CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.clipPath = "inset(-16px -16px 0px -16px)";
        CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.style.marginLeft =
            CONFIG.RUNTIME_VARS.STYLE.ui_windowLeftRightMargin + "%";
        CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.style.width =
            parseInt(CONFIG.RUNTIME_VARS.STYLE.ui_contentWidth) +
            parseInt(CONFIG.RUNTIME_VARS.STYLE.ui_contentMarginLeft) -
            parseInt(CONFIG.RUNTIME_VARS.STYLE.ui_windowLeftRightMargin) +
            "%";
        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.display = "none";
        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.width = "36%";
        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.backgroundColor = CONFIG.RUNTIME_VARS.STYLE.bgColor;
        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.marginTop = "0";
        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.marginBottom = "0";
        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.marginLeft = "0";
        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.paddingTop = "3em";
        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.paddingBottom = "3em";
        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.paddingLeft =
            CONFIG.RUNTIME_VARS.STYLE.ui_windowLeftRightMargin + "%";
        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.border = "1px solid " + CONFIG.RUNTIME_VARS.STYLE.borderColor;
        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.borderTop = "none";
        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.boxShadow =
            "0 0 1px " +
            CONFIG.RUNTIME_VARS.STYLE.shadowColor +
            ", 0 0 2px " +
            CONFIG.RUNTIME_VARS.STYLE.shadowColor +
            ", 0 0 4px " +
            CONFIG.RUNTIME_VARS.STYLE.shadowColor +
            ", 0 0 8px " +
            CONFIG.RUNTIME_VARS.STYLE.shadowColor +
            ", 0 0 16px " +
            CONFIG.RUNTIME_VARS.STYLE.shadowColor;
        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.clipPath = "inset(1px -16px -16px -16px)";
        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.setProperty("top", "calc(75% - 1px)");
        CONFIG.DOM_ELEMENT.PAGINATION_CONTAINER.style.left = "50%";
        CONFIG.DOM_ELEMENT.MESSAGE_INDICATOR.style.left = "50%";
    } else {
        // Landscape mode
        CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.display = "block";
        CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.width = CONFIG.RUNTIME_VARS.STYLE.ui_tocWidth + "%";
        // CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.height = CONFIG.RUNTIME_VARS.STYLE.ui_tocHeight + '%';
        CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.backgroundColor = "transparent";
        CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.border = "none";
        CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.boxShadow = "none";
        CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.clipPath = "none";
        CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.clipPath = "none";
        CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.style.marginLeft = CONFIG.RUNTIME_VARS.STYLE.ui_contentMarginLeft + "%";
        CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.style.width = CONFIG.RUNTIME_VARS.STYLE.ui_contentWidth + "%";
        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.display = "block";
        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.width = CONFIG.RUNTIME_VARS.STYLE.ui_tocWidth + "%";
        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.backgroundColor = "transparent";
        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.marginTop = "3em";
        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.marginRight = "0";
        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.marginBottom = "3em";
        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.paddingTop = "0";
        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.paddingBottom = "0";
        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.border = "none";
        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.boxShadow = "none";
        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.clipPath = "none";
        CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.top = "75%";
        CONFIG.DOM_ELEMENT.PAGINATION_CONTAINER.style.left = CONFIG.RUNTIME_VARS.STYLE.ui_paginationCenter + "%";
        CONFIG.DOM_ELEMENT.MESSAGE_INDICATOR.style.left = CONFIG.RUNTIME_VARS.STYLE.ui_paginationCenter + "%";
    }
}

/**
 * Toggles TOC and progress container visibility based on screen orientation
 * @param {boolean} [initial=false] - Whether this is the initial call
 * @public
 * @deprecated
 */
export function setTOC_onRatio(initial = false) {
    if (window.innerWidth < window.innerHeight) {
        // Portrait mode
        if (initial) {
            CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.display = "none";
            CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.display = "none";
        } else {
            if (CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.display == "block") {
                CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.display = "none";
                CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.display = "none";
            } else {
                CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.display = "block";
                CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.display = "block";
            }
        }
    }
}

// ===============================
// UI Components
// ===============================
/**
 * Sets up the help button
 * @public
 */
export function setHelpButton() {
    const showHelperBtn = toBool(localStorage.getItem("show_helper_btn"), false) ?? CONFIG.CONST_CONFIG.SHOW_HELPER_BTN;
    if (showHelperBtn && !isVariableDefined(CONFIG.DOM_ELEMENT.HELP_BUTTON)) {
        const helpButton = document.createElement("div");
        helpButton.id = "help-btn";
        helpButton.classList.add("btn-icon", "hasTitle");
        helpButton.dataset.title = CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_help;
        helpButton.innerHTML = ICONS.HELP;
        helpButton.addEventListener("click", async () => {
            await PopupManager.showHelpPopup();
        });
        CONFIG.DOM_ELEMENT.MAIN_BTN_WRAPPER.appendChild(helpButton);
    }
}

/**
 * Toggles the help button visibility
 * @param {boolean} visible - Whether to show or hide the help button
 * @public
 */
export function toggleHelpButton(visible = false) {
    const isHelpButtonDefined = isVariableDefined(CONFIG.DOM_ELEMENT.HELP_BUTTON);
    if (visible) {
        if (isHelpButtonDefined) {
            CONFIG.DOM_ELEMENT.HELP_BUTTON.style.display = "";
        } else {
            setHelpButton();
        }
    } else {
        if (isHelpButtonDefined) {
            CONFIG.DOM_ELEMENT.HELP_BUTTON.style.display = "none";
        }
    }
}

/**
 * Sets up the custom cursor
 * @public
 */
export function setCustomCursor() {
    const enableCustomCursor =
        toBool(localStorage.getItem("enable_custom_cursor"), false) ?? CONFIG.CONST_CONFIG.ENABLE_CUSTOM_CURSOR;
    if (enableCustomCursor) {
        if (typeof IPadCursor !== "undefined") {
            IPadCursor.init({
                defaultBackgroundColor: "color-mix(in srgb, var(--fontInfoColor), transparent 15%)",
                activeBackgroundColor: "color-mix(in srgb, var(--mainColor_inactive), transparent 15%)",
                hoverBackgroundColor: "color-mix(in srgb, var(--fontInfoColor), transparent 15%)",
                hoverStyle: 2,
                glowEnabled: false,
                verticalBarWhenHoveringTextEnabled: false,
                hoverSelector:
                    "a:not([class^='page-input-container']), button, div[class^='btn-icon'], div[class^='cover-container'], div[class^='bookFinished_badge'], div[class^='bookNotRead_badge'], div[class^='delete-btn-wrapper'], div[class^='bookinfo-menu-btn'], span[class^='tooltip-icon'], div[class^='sidebar-splitview-divider']",
            });
        } else {
            console.error("IPadCursor object is undefined");
        }
    } else {
        if (typeof IPadCursor !== "undefined") {
            IPadCursor.destroy();
        } else {
            console.error("IPadCursor object is undefined");
        }
    }
}

/**
 * Toggles the custom cursor visibility
 * @param {boolean} enabled - Whether to enable or disable the custom cursor
 * @public
 */
export function toggleCustomCursor(enabled = true) {
    if (enabled) {
        setCustomCursor();
    } else {
        if (typeof IPadCursor !== "undefined") {
            IPadCursor.destroy();
        } else {
            console.error("IPadCursor object is undefined");
        }
    }
}

/**
 * Sets up the custom tooltip
 * @public
 */
export function setCustomTooltip() {
    /**
     * Sets up the custom tooltip
     * @public
     */
    const attribute = CONFIG.CONST_UI.CUSTOM_TOOLTIP_CONFIG.attribute ?? "data-title";
    tippy.delegate(document.body, {
        ...CONFIG.CONST_UI.CUSTOM_TOOLTIP_CONFIG,
        content(reference) {
            return reference.getAttribute(attribute);
        },
        target: `[${attribute}]`,
    });

    /**
     * Updates the custom tooltip content
     * @public
     */
    document.addEventListener("updateCustomTooltip", () => {
        document.querySelectorAll(`[${attribute}]`).forEach((el) => {
            if (el._tippy) {
                el._tippy.setContent(el.getAttribute(attribute));
            }
        });
    });
}
