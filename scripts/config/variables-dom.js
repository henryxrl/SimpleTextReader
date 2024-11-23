/**
 * @fileoverview Runtime configuration
 *
 * Defines and exports runtime configuration based on URL parameters.
 *
 * @requires modules/file/css-global-variables
 */

import { CSSGlobalVariables } from "../modules/file/css-global-variables.js";

/**
 * URL parameters
 * @type {Object}
 * @property {boolean} noBookshelf - Whether bookshelf feature is disabled
 * @property {boolean} noSettings - Whether settings feature is disabled
 * @property {boolean} pageBreakMode - Whether page break on title is disabled
 * @property {boolean} printDatabase - Whether to print database
 * @property {boolean} upgradeDB - Whether to upgrade database
 */
const urlParams = new URLSearchParams(window.location.search);
const noBookshelf = urlParams.has("no-bookshelf");
const noSettings = urlParams.has("no-settings");
const pageBreakMode = urlParams.has("no-pagebreak-on-title");
const printDatabase = urlParams.has("print-db");
const upgradeDB = urlParams.has("upgrade-db");
console.log("Enable bookshelf:", !noBookshelf);
console.log("Enable settings:", !noSettings);
console.log("Enable page break on title:", !pageBreakMode);
console.log("Print database:", printDatabase);
console.log("Upgrade database:", upgradeDB);

/**
 * Runtime configuration
 * @type {Object}
 * @property {boolean} ENABLE_BOOKSHELF - Whether bookshelf feature is enabled
 * @property {boolean} ENABLE_SETTINGS - Whether settings feature is enabled
 * @property {boolean} PAGE_BREAK_ON_TITLE - Whether page break on title is enabled
 * @property {boolean} PRINT_DATABASE - Whether to print database
 * @property {boolean} UPGRADE_DB - Whether to upgrade database
 */
export const RUNTIME_CONFIG = {
    ENABLE_BOOKSHELF: !noBookshelf,
    ENABLE_SETTINGS: !noSettings,
    PAGE_BREAK_ON_TITLE: !pageBreakMode,
    PRINT_DATABASE: printDatabase,
    UPGRADE_DB: upgradeDB,
};

/**
 * Runtime variables
 * @type {Object}
 * @property {CSSGlobalVariables} STYLE - Global CSS variables
 * @property {number} STORE_PREV_WINDOW_WIDTH - Previous window width
 * @property {boolean} RESPECT_USER_LANG_SETTING - Whether to respect user's language setting
 * @property {string} WEB_LANG - Web page language
 */
export const RUNTIME_VARS = {
    // UI-related variables
    STYLE: new CSSGlobalVariables(),
    STORE_PREV_WINDOW_WIDTH: window.innerWidth,
    RESPECT_USER_LANG_SETTING: document.documentElement.getAttribute("respectUserLangSetting") === "true",
    WEB_LANG: document.documentElement.getAttribute("webLANG"),
};

/**
 * DOM element references
 * @type {Object}
 * @property {HTMLElement} DROPZONE - File drop zone element (getter)
 * @property {HTMLElement} LOADING_SCREEN - Loading screen element (getter)
 * @property {HTMLElement} DROPZONE_TEXT_IMG_WRAPPER - Wrapper for drop zone text and image (getter)
 * @property {HTMLElement} DROPZONE_TEXT - Drop zone text element (getter)
 * @property {HTMLElement} DROPZONE_IMG - Drop zone image element (getter)
 * @property {HTMLElement} CONTENT_CONTAINER - Main content container (getter)
 * @property {HTMLElement} TOC_CONTAINER - Table of contents container (getter)
 * @property {HTMLElement} TOC_LIST - Table of contents list container (getter)
 * @property {HTMLElement} TOC_SCROLLER - Table of contents list scroller container (getter)
 * @property {HTMLElement} PAGINATION_CONTAINER - Pagination container (getter)
 * @property {HTMLElement} PAGINATION_INDICATOR - Pagination indicator element (getter)
 * @property {HTMLElement} PROGRESS_CONTAINER - Progress container (getter)
 * @property {HTMLElement} PROGRESS_TITLE - Progress title element (getter)
 * @property {HTMLElement} PROGRESS_CONTENT - Progress content element (getter)
 * @property {HTMLElement} FOOTNOTE_CONTAINER - Footnote container (getter)
 * @property {HTMLElement} DARK_MODE_ACTUAL_BUTTON - Dark mode toggle button (getter)
 * @property {HTMLElement} DARK_MODE_TOGGLE - Dark mode toggle wrapper (getter)
 * @property {HTMLElement} SETTINGS_BUTTON - Settings button (getter)
 * @property {HTMLElement} SETTINGS_MENU - Settings menu (getter)
 * @property {HTMLElement} BOOKSHELF_BUTTON - Bookshelf button (getter)
 * @property {function} GET_TITLE - Getter for a title element by its ID
 * @property {function} GET_LINE - Getter for a line element by its ID
 * @readonly
 */
export const DOM_ELEMENT = Object.freeze({
    get DROPZONE() {
        return document.getElementById("dropZone");
    },
    get LOADING_SCREEN() {
        return document.getElementById("loading");
    },
    get DROPZONE_TEXT_IMG_WRAPPER() {
        return document.getElementById("dropZoneTextImgWrapper");
    },
    get DROPZONE_TEXT() {
        return document.getElementById("dropZoneText");
    },
    get DROPZONE_IMG() {
        return document.getElementById("dropZoneImg");
    },
    get CONTENT_CONTAINER() {
        return document.getElementById("content");
    },
    get TOC_CONTAINER() {
        return document.getElementById("tocContent");
    },
    get TOC_LIST() {
        return document.getElementById("tocList");
    },
    get TOC_SCROLLER() {
        return document.getElementById("tocScroller");
    },
    get PAGINATION_CONTAINER() {
        return document.getElementById("pagination");
    },
    get PAGINATION_INDICATOR() {
        return document.getElementById("pageProcessing");
    },
    get PROGRESS_CONTAINER() {
        return document.getElementById("progress");
    },
    get PROGRESS_TITLE() {
        return document.getElementById("progress-title");
    },
    get PROGRESS_CONTENT() {
        return document.getElementById("progress-content");
    },
    get FOOTNOTE_CONTAINER() {
        return document.getElementById("footnote-content");
    },
    get DARK_MODE_ACTUAL_BUTTON() {
        return document.getElementById("toggle-btn");
    },
    get DARK_MODE_TOGGLE() {
        return document.getElementById("toggle");
    },
    get SETTINGS_BUTTON() {
        return document.getElementById("STRe-setting-btn");
    },
    get SETTINGS_MENU() {
        return document.getElementById("settings-menu");
    },
    get BOOKSHELF_BUTTON() {
        return document.getElementById("STRe-bookshelf-btn");
    },
    GET_TITLE(titleID) {
        return document.getElementById(`title_${titleID}`);
    },
    GET_LINE(lineID) {
        return document.getElementById(`line${lineID}`);
    },
});
