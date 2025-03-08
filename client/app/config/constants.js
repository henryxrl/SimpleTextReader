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
 * @property {boolean} SHOW_FILTER_BAR - Whether to show the filter bar
 * @property {boolean} AUTO_OPEN_LAST_BOOK - Whether to auto-open last book
 */
export const CONST_CONFIG = {
    SHOW_FILTER_BAR: true,
    AUTO_OPEN_LAST_BOOK: true,
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
 * UI-related constants
 * @type {Object}
 * @property {Object} LANGUAGE_MAPPING - Mapping of language codes to display names
 * @readonly
 */
export const CONST_UI = Object.freeze({
    LANGUAGE_MAPPING: {
        zh: "简体中文",
        en: "English",
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
 * @property {Array} FALLBACK_FONTS - Fallback fonts
 * @property {Object} FONT_MAPPING - Mapping of font names to CSS font family names
 * @readonly
 */
export const CONST_FONT = Object.freeze({
    MAX_CUSTOM_FONTS: 3,
    SUPPORTED_FONT_EXT,
    SUPPORTED_FONT_TYPES: ["font/ttf", "font/otf"],
    SYSTEM_FONTS: [
        { en: "Helvetica", zh: "Helvetica" },
        {
            en: "Noto Sans",
            zh: "Noto Sans",
            linuxVariant: "Noto Sans CJK",
            label_en: "Noto Sans",
        },
        { en: "Roboto", zh: "Roboto" },
        { en: "Times New Roman", zh: "Times New Roman" },
        { en: "Consolas", zh: "Consolas" },
        {
            en: "Microsoft YaHei",
            zh: "微软雅黑",
            macVariant: "PingFang SC",
            linuxVariant: "WenQuanYi Zen Hei",
            label_zh: "微软雅黑",
        },
        {
            en: "SimSun",
            zh: "宋体",
            macVariant: "SongTi SC",
            linuxVariant: "AR PL UMing CN",
            label_zh: "宋体",
        },
        {
            en: "Source Han Sans",
            zh: "思源黑体",
            linuxVariant: "Source Han Sans CN",
            label_zh: "思源黑体",
        },
        {
            en: "KaiTi",
            zh: "楷体",
            macVariant: "KaiTi SC",
            linuxVariant: "WenQuanYi Zen Hei Sharp",
            label_zh: "楷体",
        },
        {
            en: "HeiTi",
            zh: "黑体",
            macVariant: "Heiti SC",
            linuxVariant: "Noto Sans CJK",
            label_zh: "黑体",
        },
        {
            en: "FangSong",
            zh: "仿宋",
            macVariant: "FangSong SC",
            linuxVariant: "AR PL UKai CN",
            label_zh: "仿宋",
        },
    ],
    APP_FONTS: [
        {
            en: "kinghwa",
            zh: "kinghwa",
            label_zh: "京華老宋体",
            label_en: "KingHwa_OldSong",
        },
        {
            en: "qiji",
            zh: "qiji",
            label_zh: "黄令东齐伋复刻体",
            label_en: "QIJIC",
        },
        {
            en: "fzskbxk",
            zh: "fzskbxk",
            label_zh: "方正宋刻本秀楷",
            label_en: "FZSongKeBenXiuKai",
        },
        { en: "fzkai", zh: "fzkai", label_zh: "方正楷体", label_en: "FZKaiTi" },
        {
            en: "wenkai",
            zh: "wenkai",
            label_zh: "霞鹜文楷",
            label_en: "LXGW WenKai",
        },
    ],
    FALLBACK_FONTS: ["ui", "serif", "sans-serif", "monospace"],
    FONT_MAPPING: {
        ui: "wenkai",
        title: "kinghwa",
        body: "kinghwa",
    },
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
