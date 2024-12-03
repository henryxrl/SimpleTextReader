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
 * @module utils/helpers-ui
 * @requires config/index
 * @requires utils/base
 * @requires modules/features/reader
 * @requires utils/helpers-reader
 */

import * as CONFIG from "../config/index.js";
import { isVariableDefined, triggerCustomEvent } from "./base.js";
import { reader } from "../modules/features/reader.js";
import { setTitle } from "./helpers-reader.js";

// ===============================
// UI Mode Related Functions
// ===============================
/**
 * Sets the UI theme mode and updates related settings
 * @param {boolean} mode - True for light mode, false for dark mode
 * @public
 */
export function setUIMode(mode) {
    const theme = mode ? "light" : "dark";
    console.log(`UI mode set to ${theme}.`);

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
 * @returns {boolean} True for light mode, false for dark mode
 * @public
 */
export function getUIMode() {
    const storedMode = localStorage.getItem("UIMode");
    if (isVariableDefined(storedMode)) {
        const mode = JSON.parse(storedMode);
        console.log(`UI mode is ${mode ? "light" : "dark"}.`);
        return mode;
    }
    console.log("UI mode is light by default.");
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
 * @public
 */
export function showDropZone(focused = false) {
    // Hide setting menu
    triggerCustomEvent("hideSettingMenu");
    if (isVariableDefined($(".dot-menu__checkbox"))) {
        $(".dot-menu__checkbox").prop("checked", false);
    }
    if (isVariableDefined($(".bookInfoMenu"))) {
        $(".bookInfoMenu").remove();
    }

    if (
        isVariableDefined(CONFIG.DOM_ELEMENT.DROPZONE) &&
        isVariableDefined(CONFIG.DOM_ELEMENT.DROPZONE_TEXT) &&
        isVariableDefined(CONFIG.DOM_ELEMENT.DROPZONE_IMG)
    ) {
        let c = null;
        // let filter = CONFIG.RUNTIME_VARS.STYLE.mainColor_inactive_filter;
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
        let filter = CONFIG.RUNTIME_VARS.STYLE.toGray_filter;
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
        return 0;
    } else {
        return 1;
    }
}

/**
 * Hides the file drop zone and adjusts UI elements
 * @public
 */
export function hideDropZone() {
    if (
        isVariableDefined(CONFIG.DOM_ELEMENT.DROPZONE) &&
        isVariableDefined(CONFIG.DOM_ELEMENT.DROPZONE_TEXT) &&
        isVariableDefined(CONFIG.DOM_ELEMENT.DROPZONE_IMG)
    ) {
        CONFIG.DOM_ELEMENT.DROPZONE.style.visibility = "hidden";
        CONFIG.DOM_ELEMENT.DROPZONE.style.zIndex = "1";
        CONFIG.DOM_ELEMENT.DROPZONE_TEXT.style.visibility = "hidden";
        CONFIG.DOM_ELEMENT.DROPZONE_TEXT.style.zIndex = "2";
        CONFIG.DOM_ELEMENT.DROPZONE_IMG.style.visibility = "hidden";
        CONFIG.DOM_ELEMENT.DROPZONE_IMG.style.zIndex = "3";

        // Fix icons location with/without scrollbar
        CONFIG.RUNTIME_VARS.STYLE.ui_btnOffset =
            (-1 * parseInt(CONFIG.RUNTIME_VARS.STYLE.ui_scrollBarWidth)).toString() + "px";

        // Show bookshelf trigger button if a book is opened
        triggerCustomEvent("showBookshelfTriggerBtn");
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
 * @public
 */
export function hideLoadingScreen() {
    CONFIG.DOM_ELEMENT.LOADING_SCREEN.style.visibility = "hidden";

    // Fix icons location with/without scrollbar
    // CONFIG.RUNTIME_VARS.STYLE.ui_btnOffset = (-1 * parseInt(CONFIG.RUNTIME_VARS.STYLE.ui_scrollBarWidth)).toString() + "px";

    // Show bookshelf trigger button if bookshelf is closed
    triggerCustomEvent("showBookshelfTriggerBtn");
}

/**
 * Shows main content containers (content, TOC, pagination, progress)
 * @public
 */
export function showContent() {
    CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.style.visibility = "visible";
    CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.visibility = "visible";
    CONFIG.DOM_ELEMENT.PAGINATION_CONTAINER.style.visibility = "visible";
    CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.visibility = "visible";
}

/**
 * Hides main content containers (content, TOC, pagination, progress)
 * @public
 */
export function hideContent() {
    CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.style.visibility = "hidden";
    CONFIG.DOM_ELEMENT.TOC_CONTAINER.style.visibility = "hidden";
    CONFIG.DOM_ELEMENT.PAGINATION_CONTAINER.style.visibility = "hidden";
    CONFIG.DOM_ELEMENT.PROGRESS_CONTAINER.style.visibility = "hidden";
}

/**
 * Resets all UI elements to their initial state and clears content, TOC, and pagination containers
 * @param {boolean} [refreshBookshelf=true] - Whether to refresh the bookshelf list
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
export async function resetUI(refreshBookshelf = true, hardRefresh = true, sortBookshelf = true) {
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
    showDropZone();
    hideLoadingScreen();
    hideContent();
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
 * Updates the Table of Contents UI and related container positions
 * @param {boolean} isIncreasing - Whether the window width is increasing
 * @public
 * @see reader.generatePagination
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
 * @public
 */
export function setMainContentUI() {
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

    // Dark mode
    CONFIG.DOM_ELEMENT.DARK_MODE_TOGGLE.checked = !getUIMode();
    setUIMode(!CONFIG.DOM_ELEMENT.DARK_MODE_TOGGLE.checked);
    CONFIG.RUNTIME_VARS.STYLE.ui_Mode = !CONFIG.DOM_ELEMENT.DARK_MODE_TOGGLE.checked ? "light" : "dark";
    // console.log(CONFIG.RUNTIME_VARS.STYLE.ui_Mode);
    CONFIG.DOM_ELEMENT.DROPZONE_TEXT_IMG_WRAPPER.title = CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_dropZone;
    CONFIG.DOM_ELEMENT.DARK_MODE_ACTUAL_BUTTON.title = CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_modeToggle;
    setTimeout(function () {
        CONFIG.RUNTIME_VARS.STYLE.darkMode_animation = CONFIG.RUNTIME_VARS.STYLE.darkMode_default_animation;
    }, 1000);

    // UI calculations
    const maxWidth = (sh(100) / 9) * 16;
    // const maxWidth = sh(100) * 2;
    CONFIG.RUNTIME_VARS.STYLE.ui_maxWidth = `${maxWidth}px`;

    // windowWith = windowLeftRightMargin + tocWidth + gapWidth + contentWidth + windowLeftRightMargin;
    CONFIG.RUNTIME_VARS.STYLE.ui_contentMarginLeft = (
        100 -
        parseInt(CONFIG.RUNTIME_VARS.STYLE.ui_contentWidth) -
        parseInt(CONFIG.RUNTIME_VARS.STYLE.ui_windowLeftRightMargin)
    ).toString();
    // console.log("IN SETMAINCONTENTUI: CONFIG.RUNTIME_VARS.STYLE.ui_contentMarginLeft: " + CONFIG.RUNTIME_VARS.STYLE.ui_contentMarginLeft);

    const tocWidthPercent =
        100 -
        parseInt(CONFIG.RUNTIME_VARS.STYLE.ui_contentWidth) -
        parseInt(CONFIG.RUNTIME_VARS.STYLE.ui_windowLeftRightMargin) * 2 -
        parseInt(CONFIG.RUNTIME_VARS.STYLE.ui_gapWidth);
    const tocWidth = vw(100) <= maxWidth ? tocWidthPercent : (tocWidthPercent * maxWidth) / vw(100);
    CONFIG.RUNTIME_VARS.STYLE.ui_tocWidth = tocWidth.toString();

    // Calculate pagination position
    const paginationLeftPercent =
        parseInt(CONFIG.RUNTIME_VARS.STYLE.ui_contentWidth) / 2 +
        parseInt(CONFIG.RUNTIME_VARS.STYLE.ui_contentMarginLeft);
    const paginationLeft =
        vw(100) <= maxWidth
            ? paginationLeftPercent
            : (((paginationLeftPercent * maxWidth) / 100 + (vw(100) - maxWidth) / 2) / vw(100)) * 100;
    CONFIG.RUNTIME_VARS.STYLE.ui_paginationCenter = paginationLeft.toString();

    // Main content
    if (isVariableDefined(CONFIG.DOM_ELEMENT.CONTENT_CONTAINER)) {
        CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.style.width = CONFIG.RUNTIME_VARS.STYLE.ui_contentWidth + "%";
        CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.style.marginTop = "0px";
        CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.style.marginRight = "0px";
        CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.style.marginBottom = "0px";
        CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.style.marginLeft = CONFIG.RUNTIME_VARS.STYLE.ui_contentMarginLeft + "%";
    }

    // TOC
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

    // Pagination
    if (isVariableDefined(CONFIG.DOM_ELEMENT.PAGINATION_CONTAINER)) {
        CONFIG.DOM_ELEMENT.PAGINATION_CONTAINER.style.left = CONFIG.RUNTIME_VARS.STYLE.ui_paginationCenter + "%";
    }

    // Progress
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
}

/**
 * Adjusts UI layout based on screen orientation (portrait/landscape)
 * Handles responsive design for TOC, content, and progress containers
 * @public
 * @see setMainContentUI
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
    }
}

/**
 * Toggles TOC and progress container visibility based on screen orientation
 * @param {boolean} [initial=false] - Whether this is the initial call
 * @public
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
