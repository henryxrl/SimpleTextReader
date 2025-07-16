/**
 * @fileoverview Application constants configuration
 *
 * Defines and exports various constant values used throughout the application, including:
 * - File-related constants
 * - UI-related constants
 * - Font-related constants
 * - Pagination constants
 * - Database-related constants
 *
 * @module client/app/config/constants
 */

/**
 * Supported file extensions
 * @type {string}
 */
const SUPPORTED_FILE_EXT = ".txt";

/**
 * Supported font extensions
 * @type {string[]}
 */
const SUPPORTED_FONT_EXT = [".ttf", ".otf"];

/**
 * Configuration constants
 * @type {Object}
 * @property {number} CHANGELOG_SHOW_PREVIOUS_VERSIONS - Number of previous versions to show in the changelog
 * @property {boolean} CHANGELOG_FORCE_SHOW - Whether to force show the changelog
 * @property {boolean} SHOW_FILTER_BAR - Whether to show the filter bar
 * @property {boolean} SHOW_FILTER_BAR_DEFAULT - Whether to show the filter bar (default value)
 * @property {boolean} SHOW_HELPER_BTN - Whether to show the helper button
 * @property {boolean} SHOW_HELPER_BTN_DEFAULT - Whether to show the helper button (default value)
 * @property {boolean} AUTO_OPEN_LAST_BOOK - Whether to auto-open last book
 * @property {boolean} AUTO_OPEN_LAST_BOOK_DEFAULT - Whether to auto-open last book (default value)
 * @property {boolean} INFINITE_SCROLL_MODE - Whether to use infinite scroll mode
 * @property {boolean} INFINITE_SCROLL_MODE_DEFAULT - Whether to use infinite scroll mode (default value)
 * @property {number} INFINITE_SCROLL_MODE_THRESHOLD - Threshold for infinite scroll mode
 * @property {boolean} SHOW_TOC_AREA - Whether to show the TOC area
 * @property {boolean} SHOW_TOC_AREA_DEFAULT - Whether to show the TOC area (default value)
 * @property {boolean} ENABLE_CUSTOM_CURSOR - Whether to enable custom cursor
 * @property {boolean} ENABLE_CUSTOM_CURSOR_DEFAULT - Whether to enable custom cursor (default value)
 * @property {Object} SHORTCUTS - Object containing shortcut settings
 * @property {boolean} SHORTCUTS.arrow_left - Whether to enable left arrow shortcut
 * @property {boolean} SHORTCUTS.arrow_right - Whether to enable right arrow shortcut
 * @property {boolean} SHORTCUTS.page_up - Whether to enable page up shortcut
 * @property {boolean} SHORTCUTS.page_down - Whether to enable page down shortcut
 * @property {boolean} SHORTCUTS.esc - Whether to enable escape shortcut
 */
export const CONST_CONFIG = {
    CHANGELOG_SHOW_PREVIOUS_VERSIONS: 2,
    CHANGELOG_FORCE_SHOW: false,
    SHOW_FILTER_BAR: true,
    SHOW_FILTER_BAR_DEFAULT: true,
    SHOW_HELPER_BTN: true,
    SHOW_HELPER_BTN_DEFAULT: true,
    AUTO_OPEN_LAST_BOOK: true,
    AUTO_OPEN_LAST_BOOK_DEFAULT: true,
    INFINITE_SCROLL_MODE: false,
    INFINITE_SCROLL_MODE_DEFAULT: false,
    INFINITE_SCROLL_MODE_THRESHOLD: 1200,
    SHOW_TOC_AREA: true,
    SHOW_TOC_AREA_DEFAULT: true,
    ENABLE_CUSTOM_CURSOR: false,
    ENABLE_CUSTOM_CURSOR_DEFAULT: false,
    SHORTCUTS: {
        arrow_left: true,
        arrow_left_default: true,
        arrow_right: true,
        arrow_right_default: true,
        page_up: true,
        page_up_default: true,
        page_down: true,
        page_down_default: true,
        esc: true,
        esc_default: true,
    },
};

/**
 * File-related constants
 * @type {Object}
 * @property {number} LOOKUP_SAMPLE_SMALL - Number of bytes used for encoding detection
 * @property {number} LOOKUP_SAMPLE - Number of bytes used for encoding detection
 * @property {number} MAX_FILE_SIZE - Maximum file size
 * @property {string} SUPPORTED_FILE_EXT - Supported file extension
 * @property {RegExp} EXT_REGEX - Regular expression for matching file extension
 * @property {string} SUPPORTED_FILE_TYPE - Supported file type
 * @property {string} AUTHOR_TOKEN_ZH - Author token for Chinese
 * @property {string} AUTHOR_TOKEN_EN - Author token for English
 * @property {string} BOOKNAME_TOKEN_ZH - Book name token for Chinese
 * @readonly
 */
export const CONST_FILE = Object.freeze({
    LOOKUP_SAMPLE_SMALL: 4096,
    LOOKUP_SAMPLE: 65536,
    MAX_FILE_SIZE: 1024 * 1024 * 128, // 128MB
    SUPPORTED_FILE_EXT,
    EXT_REGEX: new RegExp(`(${SUPPORTED_FILE_EXT}|${SUPPORTED_FONT_EXT.join("|")})$`, "i"),
    SUPPORTED_FILE_TYPE: "text/plain",
    AUTHOR_TOKEN_ZH: "作者",
    AUTHOR_TOKEN_EN: " by ",
    BOOKNAME_TOKEN_ZH: "书名",
});

/**
 * Pagination constants
 * @type {Object}
 * @property {number} MIN_LINES - Minimum number of lines required for pagination
 * @property {number} MAX_LINES - Maximum number of lines allowed per page
 * @property {number} MIN_CHARS - Minimum number of characters allowed per page
 * @property {number} MAX_CHARS - Maximum number of characters allowed per page
 * @property {number} BALANCE_RATIO - Ratio to balance page lengths
 * @property {number} TITLE_BUFFER - Number of lines to buffer before a title
 * @property {boolean} USE_CHAR_COUNT - Whether to use character count for pagination
 * @property {number} CHAR_MULTIPLIER - Multiplier for character count
 * @readonly
 */
export const CONST_PAGINATION = Object.freeze({
    MIN_LINES: 15,
    MAX_LINES: 100,
    MIN_CHARS: 500,
    MAX_CHARS: 2500,
    BALANCE_RATIO: 2,
    TITLE_BUFFER: 3,
    USE_CHAR_COUNT: null, // null means auto-detect
    CHAR_MULTIPLIER: 3,
});

/**
 * Footnote-related constants
 * @type {Object}
 * @property {Object} TYPES - Footnote types
 * @property {string} TYPES.ANCHOR - Anchor type
 * @property {string} TYPES.FOOTNOTE - Footnote type
 * @property {string} NOTFOUND - Not found footnote
 * @readonly
 */
export const CONST_FOOTNOTE = Object.freeze({
    TYPES: {
        ANCHOR: "anchor",
        FOOTNOTE: "footnote",
    },
    NOTFOUND: '<span class="footnote-notfound"></span>',
});

/**
 * UI-related constants
 * @type {Object}
 * @property {Object} LANGUAGE_MAPPING - Mapping of language codes to display names
 * @property {Object} CUSTOM_TOOLTIP_CONFIG - Configuration for the custom tooltip
 * @property {Object} SIDEBAR_SPLITVIEW_CONFIG - Configuration for the sidebar splitview
 * @property {Object} COVER_GENERATOR_CONFIG - Configuration for the cover generator
 * @readonly
 */
export const CONST_UI = Object.freeze({
    LANGUAGE_MAPPING: {
        zh: "简体中文",
        en: "English",
    },
    CUSTOM_TOOLTIP_CONFIG: {
        attribute: "data-title",
        animation: "scale",
        animateFill: false,
        delay: [1000, 0],
        arrow: false,
        placement: "top",
        followCursor: "initial",
        theme: "custom-tooltip",
        offset: [0, 16],
    },
    SIDEBAR_SPLITVIEW_CONFIG: {
        elements: {
            outer: ".sidebar-splitview-outer",
            container: ".sidebar-splitview-container",
            divider: ".sidebar-splitview-divider",
            dragTooltip: ".sidebar-splitview-dragTooltip",
            toggleButton: ".sidebar-splitview-toggle",
        },
        storageKey: "sidebar-splitview-toc-width",
        sidebarStyle: {
            showSidebar: true,
            showDragTooltip: false,
            showToggleButton: false,
            autoHide: true,
            customTitles: true,
            proxyScroll: true,
            patchWindowScroll: true,
        },
    },
    COVER_GENERATOR_CONFIG: {
        USE_CANVAS: false,
    },
});

/**
 * Font-related constants
 * @type {Object}
 * @property {number} MAX_CUSTOM_FONTS - Maximum number of custom fonts
 * @property {string[]} SUPPORTED_FONT_EXT - Supported font extensions
 * @property {string[]} SUPPORTED_FONT_TYPES - Supported font types
 * @property {Array} SYSTEM_FONTS - System fonts
 * @property {Array} APP_FONTS - Custom fonts
 * @readonly
 */
export const CONST_FONT = Object.freeze({
    MAX_CUSTOM_FONTS: 3,
    SUPPORTED_FONT_EXT,
    SUPPORTED_FONT_TYPES: ["font/ttf", "font/otf"],
    FONT_BASELINE_OFFSET_JSON: "./client/fonts/font_baseline_offsets.json",
    SYSTEM_FONTS: [
        {
            en: "Microsoft YaHei",
            zh: "微软雅黑",
            macVariant: "PingFang SC",
            linuxVariant: "WenQuanYi Zen Hei",
            label_zh: "微软雅黑",
        },
        {
            en: "Source Han Sans",
            zh: "思源黑体",
            linuxVariant: "Source Han Sans CN",
            label_zh: "思源黑体",
        },
        {
            en: "HeiTi",
            zh: "黑体",
            macVariant: "Heiti SC",
            linuxVariant: "Noto Sans CJK",
            label_zh: "黑体",
        },
        {
            en: "KaiTi",
            zh: "楷体",
            macVariant: "KaiTi SC",
            linuxVariant: "WenQuanYi Zen Hei Sharp",
            label_zh: "楷体",
        },
        {
            en: "SimSun",
            zh: "宋体",
            macVariant: "SongTi SC",
            linuxVariant: "AR PL UMing CN",
            label_zh: "宋体",
        },
        {
            en: "FangSong",
            zh: "仿宋",
            macVariant: "FangSong SC",
            linuxVariant: "AR PL UKai CN",
            label_zh: "仿宋",
        },
        { en: "Roboto", zh: "Roboto" },
        { en: "Helvetica", zh: "Helvetica" },
        { en: "Times New Roman", zh: "Times New Roman" },
        {
            en: "Noto Sans",
            zh: "Noto Sans",
            linuxVariant: "Noto Sans CJK",
            label_en: "Noto Sans",
        },
        { en: "Consolas", zh: "Consolas" },
    ],
    APP_FONTS: [
        {
            en: "kinghwa",
            zh: "kinghwa",
            label_zh: "京華老宋體",
            label_en: "KingHwa OldSong",
            isSplitFont: true,
        },
        {
            en: "wenkai",
            zh: "wenkai",
            label_zh: "霞鹜文楷",
            label_en: "LXGW WenKai",
            isSplitFont: true,
        },
        {
            en: "zhuque",
            zh: "zhuque",
            label_zh: "朱雀仿宋",
            label_en: "ZhuQue FangSong",
            isSplitFont: true,
        },
        {
            en: "fzskbxk",
            zh: "fzskbxk",
            label_zh: "方正宋刻本秀楷",
            label_en: "FZ SongKeBen XiuKai",
            isSplitFont: false,
        },
    ],
    REMOTE_FONTS: [
        {
            en: "QIJIC",
            zh: "QIJIC",
            label_zh: "黄令东齐伋复刻体",
            label_en: "QIJIC",
            isSplitFont: true,
        },
        {
            en: "dongguan",
            zh: "dongguan",
            label_zh: "上图东观体",
            label_en: "ST DongGuanTi",
            isSplitFont: true,
        },
        {
            en: "quanlai",
            zh: "quanlai",
            label_zh: "全瀨體",
            label_en: "Allseto",
            isSplitFont: true,
        },
        {
            en: "hwmc",
            zh: "hwmc",
            label_zh: "匯文明朝體",
            label_en: "Huiwen Mincho",
            isSplitFont: true,
        },
        {
            en: "hwfs",
            zh: "hwfs",
            label_zh: "匯文仿宋",
            label_en: "Huiwen Fangsong",
            isSplitFont: true,
        },
        {
            en: "hwzk",
            zh: "hwzk",
            label_zh: "匯文正楷",
            label_en: "Huiwen ZhengKai",
            isSplitFont: true,
        },
        {
            en: "tsangeryumo",
            zh: "tsangeryumo",
            label_zh: "仓耳与墨",
            label_en: "Tsanger YuMo",
            isSplitFont: true,
        },
        {
            en: "tsangeryuyang",
            zh: "tsangeryuyang",
            label_zh: "仓耳渔阳体",
            label_en: "Tsanger YuYangT",
            isSplitFont: true,
        },
        {
            en: "clearhan",
            zh: "clearhan",
            label_zh: "屏显臻宋",
            label_en: "ClearHan Serif",
            isSplitFont: true,
        },
        {
            en: "neoxihei",
            zh: "neoxihei",
            label_zh: "霞鹜新晰黑",
            label_en: "LXGW Neo XiHei",
            isSplitFont: true,
        },
        {
            en: "chillroundm",
            zh: "chillroundm",
            label_zh: "寒蝉半圆体",
            label_en: "Chill RoundM",
            isSplitFont: true,
        },
        {
            en: "chillkai",
            zh: "chillkai",
            label_zh: "寒蝉正楷体",
            label_en: "Chill Kai",
            isSplitFont: true,
        },
    ],
});

/**
 * Font validation configuration
 * @type {Object}
 * @property {string} fontSize - Font size
 * @property {Object} testStrings - Test strings
 * @property {Object} defaultFonts - Default fonts
 * @property {Object} canvas - Canvas configuration
 * @property {Object} text - Text configuration
 * @property {Object} ratio - Ratio configuration
 * @readonly
 */
export const CONST_FONT_VALIDATION_CONFIG = Object.freeze({
    fontSize: "12px",
    testStrings: {
        en: "The quick brown fox",
        zh: "测试文字",
    },
    defaultFonts: {
        en: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Ubuntu'",
        zh: "system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', 'WenQuanYi Micro Hei', 'Noto Sans CJK SC', 'SimSun', 'Heiti SC', sans-serif",
    },
    canvas: {
        width: 300,
        height: 50,
    },
    text: {
        x: 10,
        y: 20,
    },
    ratio: {
        min: 0.333,
        max: 3.0,
    },
});

/**
 * Database-related constants
 * @type {Object}
 * @property {string} DB_NAME - Database name
 * @property {number} DB_VERSION - Database version
 * @property {Object[]} DB_STORES - Database stores
 * @private
 */
export const CONST_DB = Object.freeze({
    DB_NAME: "SimpleTextReader",
    DB_VERSION: 3,
    DB_STORES: [
        {
            name: "bookfiles",
            options: { keyPath: "name" },
            index: 0,
        },
        {
            name: "bookProcessed",
            options: { keyPath: "name" },
            index: 1,
        },
        {
            name: "fontfiles",
            options: { keyPath: "name" },
            index: 2,
        },
    ],
});
