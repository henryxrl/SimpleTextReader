/**
 * @fileoverview Runtime configuration
 *
 * Defines and exports runtime configuration based on URL parameters.
 *
 * @module client/app/config/variables-dom
 * @requires client/app/utils/base
 * @requires client/app/lib/css-global-variables
 */

import { toBool } from "../utils/base.js";
import CSSVars from "../lib/css-global-variables.js";

/**
 * URL parameters
 * @type {Object}
 * @property {boolean} noBookshelf - Whether bookshelf feature is disabled
 * @property {boolean} noFontpool - Whether fontpool feature is disabled
 * @property {boolean} noSettings - Whether settings feature is disabled
 * @property {boolean} noFastOpen - Whether fast open of books is disabled
 * @property {boolean} pageBreakMode - Whether page break on title is disabled
 * @property {boolean} alwaysProcess - Whether to always process books upon opening
 * @property {boolean} printDatabase - Whether to print database
 * @property {boolean} upgradeDB - Whether to upgrade database
 */
const urlParams = new URLSearchParams(window.location.search);
const noBookshelf = urlParams.has("no-bookshelf");
const noFontpool = urlParams.has("no-custom-fonts");
const noSettings = urlParams.has("no-settings");
const noFastOpen = urlParams.has("no-fast-open");
const pageBreakMode = urlParams.has("no-pagebreak-on-title");
const alwaysProcess = urlParams.has("always-process");
const printDatabase = urlParams.has("print-db");
const upgradeDB = urlParams.has("upgrade-db");
console.log("Enable bookshelf:", !noBookshelf);
console.log("Enable custom fonts:", !noFontpool);
console.log("Enable settings:", !noSettings);
console.log("Enable fast open of books:", !noFastOpen);
console.log("Enable page break on title:", !pageBreakMode);
console.log("Always process books upon opening:", alwaysProcess);
console.log("Print database:", printDatabase);
console.log("Upgrade database:", upgradeDB);

/**
 * Runtime configuration
 * @type {Object}
 * @property {boolean} ENABLE_BOOKSHELF - Whether bookshelf feature is enabled
 * @property {boolean} ENABLE_FONTPOOL - Whether fontpool feature is enabled
 * @property {boolean} ENABLE_SETTINGS - Whether settings feature is enabled
 * @property {boolean} ENABLE_FAST_OPEN - Whether fast open of books is enabled
 * @property {boolean} PAGE_BREAK_ON_TITLE - Whether page break on title is enabled
 * @property {boolean} ALWAYS_PROCESS - Whether to always process
 * @property {boolean} PRINT_DATABASE - Whether to print database
 * @property {boolean} UPGRADE_DB - Whether to upgrade database
 */
export const RUNTIME_CONFIG = {
    ENABLE_BOOKSHELF: !noBookshelf,
    ENABLE_FONTPOOL: !noFontpool,
    ENABLE_SETTINGS: !noSettings,
    ENABLE_FAST_OPEN: !noFastOpen,
    PAGE_BREAK_ON_TITLE: !pageBreakMode,
    ALWAYS_PROCESS: alwaysProcess,
    PRINT_DATABASE: printDatabase,
    UPGRADE_DB: upgradeDB,
};

/**
 * Runtime variables
 * @type {Object}
 * @property {CSSGlobalVariables} STYLE - Global CSS variables
 * @property {number} STORE_PREV_WINDOW_WIDTH - Previous window width
 * @property {boolean} RESPECT_USER_LANG_SETTING - Whether to respect user's language setting
 * @property {boolean} RESPECT_USER_LANG_SETTING_DEFAULT - Whether to respect user's language setting (default value)
 * @property {string} WEB_LANG - Web page language
 * @property {string} APP_VERSION - Application version
 * @property {string} APP_VERSION_DATE - Application version date
 * @property {Object} APP_CHANGELOG - Application changelog
 * @property {Object} FONT_BASELINE_OFFSETS - Font baseline offsets
 * @property {Map} ELEMENTS_TO_TRUNCATE - DOM elements that need to be truncated
 */
export const RUNTIME_VARS = {
    // UI-related variables
    STYLE: CSSVars({
        normalize: (name) => name.replace(/__/g, "-"),
    }),
    STORE_PREV_WINDOW_WIDTH: window.innerWidth,
    RESPECT_USER_LANG_SETTING:
        toBool(localStorage.getItem("respectUserLangSetting"), false) ??
        toBool(document.documentElement.getAttribute("respectUserLangSetting")),
    RESPECT_USER_LANG_SETTING_DEFAULT: false,
    WEB_LANG: document.documentElement.getAttribute("webLANG"),
    APP_VERSION: "1.0.0",
    APP_VERSION_DATE: "2023-07-09",
    APP_CHANGELOG: {},
    FONT_BASELINE_OFFSETS: {},
    ELEMENTS_TO_TRUNCATE: new Map(),
};

/**
 * DOM element references
 * @type {Object}
 * @property {HTMLElement} BODY - Body element (getter)
 * @property {HTMLElement} LOADING_SCREEN - Loading screen element (getter)
 * @property {HTMLElement} DROPZONE - File drop zone element (getter)
 * @property {HTMLElement} DROPZONE_OVERLAY - Drop zone overlay element (getter)
 * @property {HTMLElement} DROPZONE_CONTENT_WRAPPER - Wrapper for drop zone text and image (getter)
 * @property {HTMLElement} DROPZONE_TEXT - Drop zone text element (getter)
 * @property {HTMLElement} DROPZONE_IMG - Drop zone image element (getter)
 * @property {HTMLElement} BOOKSHELF - Bookshelf element (getter)
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
 * @property {HTMLElement} MAIN_BTN_WRAPPER - Main button wrapper (getter)
 * @property {HTMLElement} DARK_MODE_ACTUAL_BUTTON - Dark mode toggle button (getter)
 * @property {HTMLElement} DARK_MODE_TOGGLE - Dark mode toggle wrapper (getter)
 * @property {HTMLElement} SETTINGS_BUTTON - Settings button (getter)
 * @property {HTMLElement} SETTINGS_MENU - Settings menu (getter)
 * @property {HTMLElement} BOOKSHELF_BUTTON - Bookshelf button (getter)
 * @property {HTMLElement} HELP_BUTTON - Help button (getter)
 * @property {HTMLElement} SCROLL_TOP_BUTTON - Scroll to top button (getter)
 * @property {HTMLElement} SCROLL_BOTTOM_BUTTON - Scroll to bottom button (getter)
 * @property {HTMLElement} REMOVE_BOOK_BUTTONS - Remove book buttons (getter)
 * @property {HTMLElement} BOOK_INFO_BUTTONS - Book info buttons (getter)
 * @property {HTMLElement} BOOK_COVER_CONTAINERS - Book cover containers (getter)
 * @property {function} GET_TITLE - Getter for a title element by its ID
 * @property {function} GET_LINE - Getter for a line element by its ID
 * @property {HTMLElement} NOTIFICATION_CONTAINER - Getter for the notification container (getter)
 * @property {HTMLElement} MESSAGE_INDICATOR - Getter for the message indicator (getter)
 * @property {HTMLElement} TOC_SPLITVIEW_DIVIDER - Getter for the TOC splitview divider (getter)
 * @property {HTMLElement} TOC_SPLITVIEW_TOGGLE - Getter for the TOC splitview toggle (getter)
 * @readonly
 */
export const DOM_ELEMENT = Object.freeze({
    get BODY() {
        return document.body;
    },
    get LOADING_SCREEN() {
        return document.getElementById("loading");
    },
    get DROPZONE() {
        return document.getElementById("dropZone");
    },
    get DROPZONE_OVERLAY() {
        return document.getElementById("global-drop-overlay");
    },
    get DROPZONE_CONTENT_WRAPPER() {
        return document.getElementById("dropzone-content-wrapper");
    },
    get DROPZONE_TEXT() {
        return document.getElementById("dropzone-text");
    },
    get DROPZONE_IMG() {
        return document.getElementById("dropzone-img");
    },
    get BOOKSHELF() {
        return document.getElementById("bookshelf");
    },
    get CONTENT_CONTAINER() {
        return document.getElementById("content");
    },
    get TOC_CONTAINER() {
        return document.getElementById("toc-content");
    },
    get TOC_LIST() {
        return document.getElementById("toc-list");
    },
    get TOC_SCROLLER() {
        return document.getElementById("toc-scroller");
    },
    get PAGINATION_CONTAINER() {
        return document.getElementById("pagination");
    },
    get PAGINATION_INDICATOR() {
        return document.getElementById("pagination-indicator");
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
    get MAIN_BTN_WRAPPER() {
        return document.getElementById("main-btn-wrapper");
    },
    get DARK_MODE_ACTUAL_BUTTON() {
        return document.getElementById("darkmode-toggle-btn");
    },
    get DARK_MODE_TOGGLE() {
        return document.getElementById("darkmode-toggle");
    },
    get SETTINGS_BUTTON() {
        return document.getElementById("setting-btn");
    },
    get SETTINGS_MENU() {
        return document.getElementById("settings-menu");
    },
    get BOOKSHELF_BUTTON() {
        return document.getElementById("bookshelf-btn");
    },
    get HELP_BUTTON() {
        return document.getElementById("help-btn");
    },
    get SCROLL_TOP_BUTTON() {
        return document.getElementById("scroll-top-btn");
    },
    get SCROLL_BOTTOM_BUTTON() {
        return document.getElementById("scroll-bottom-btn");
    },
    get REMOVE_BOOK_BUTTONS() {
        return document.querySelectorAll(".bookshelf .book .delete-btn");
    },
    get BOOK_INFO_BUTTONS() {
        return document.querySelectorAll(".bookshelf .book .bookinfo-menu-btn");
    },
    get BOOK_COVER_CONTAINERS() {
        return document.querySelectorAll(".bookshelf .book .cover-container");
    },
    GET_TITLE(titleID) {
        return document.getElementById(`title_${titleID}`);
    },
    GET_LINE(lineID) {
        return document.getElementById(`line${lineID}`);
    },
    get NOTIFICATION_CONTAINER() {
        return document.getElementById("notification-container");
    },
    get MESSAGE_INDICATOR() {
        return document.getElementById("message-indicator");
    },
    get TOC_SPLITVIEW_DIVIDER() {
        return document.querySelector(".sidebar-splitview-divider");
    },
    get TOC_SPLITVIEW_TOGGLE() {
        return document.querySelector(".sidebar-splitview-toggle");
    },
});
