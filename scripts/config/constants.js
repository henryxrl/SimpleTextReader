/**
 * @fileoverview Application constants configuration
 *
 * Defines and exports various constant values used throughout the application, including:
 * - File-related constants
 * - UI-related constants
 */

/**
 * Supported file extensions
 * @type {string}
 */
const SUPPORTED_EXT = ".txt";

/**
 * File-related constants
 * @type {Object}
 * @property {number} LOOKUP_SAMPLE_SMALL - Number of bytes used for encoding detection
 * @property {number} LOOKUP_SAMPLE - Number of bytes used for encoding detection
 * @property {string} SUPPORTED_EXT - Supported file extension
 * @property {RegExp} EXT_REGEX - Regular expression for matching file extension
 * @property {string} AUTHOR_TOKEN_ZH - Author token for Chinese
 * @property {string} AUTHOR_TOKEN_EN - Author token for English
 * @readonly
 */
export const CONST_FILE = Object.freeze({
    LOOKUP_SAMPLE_SMALL: 4096,
    LOOKUP_SAMPLE: 65536,
    SUPPORTED_EXT,
    EXT_REGEX: new RegExp(`(${SUPPORTED_EXT})$`, "i"),
    AUTHOR_TOKEN_ZH: "作者",
    AUTHOR_TOKEN_EN: " by ",
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
 * @property {Array} SYSTEM_FONTS - System fonts
 * @property {Array} CUSTOM_FONTS - Custom fonts
 * @property {Array} FALLBACK_FONTS - Fallback fonts
 * @property {Object} FONT_MAPPING - Mapping of font names to CSS font family names
 * @readonly
 */
export const CONST_FONT = Object.freeze({
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
    CUSTOM_FONTS: [
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
