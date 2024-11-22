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
    MIN_CHARS: 100,
    MAX_CHARS: 1500,
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
