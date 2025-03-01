/**
 * @fileoverview Shared configuration between frontend and backend
 *
 * @module shared/config/shared-config
 * @requires client/app/config/constants
 */

import { CONST_FONT, CONST_FILE } from "../../client/app/config/constants.js";

/**
 * Definitions of the backend variables
 */
const PORT = "8866";
const BASE_URL = "/api";
const CONFIG_TOKEN = "/config";
const CONFIG_UPDATE_TOKEN = "/update";
const LIBRARY_TOKEN = "/library";
const BOOK_REQUEST_TOKEN = "/request-book";
const BOOK_FETCH_TOKEN = "/fetch-book";

/**
 * @type {Object}
 * @property {number} MAX_FILE_SIZE - The maximum file size
 * @property {string} SUPPORTED_FILE_TYPE - The supported file type
 * @property {string[]} SUPPORTED_FONT_TYPES - The supported font types
 * @property {string[]} SUPPORTED_FILE_EXT - The supported file extensions
 * @property {string[]} SUPPORTED_FONT_EXT - The supported font extensions
 * @property {number} PORT - The port number for the server
 * @property {Object} API - The API configuration
 * @property {Object} API.URL - The API URL configuration
 * @property {Object} API.TOKEN - The API token configuration
 */
export const SHARED_CONFIG = Object.freeze({
    MAX_FILE_SIZE: CONST_FILE.MAX_FILE_SIZE,
    SUPPORTED_FILE_TYPE: CONST_FILE.SUPPORTED_FILE_TYPE,
    SUPPORTED_FONT_TYPES: CONST_FONT.SUPPORTED_FONT_TYPES,
    SUPPORTED_FILE_EXT: CONST_FILE.SUPPORTED_FILE_EXT,
    SUPPORTED_FONT_EXT: CONST_FONT.SUPPORTED_FONT_EXT,
    PORT: PORT,
    API: {
        URL: {
            BASE: BASE_URL,
            CONFIG: BASE_URL + CONFIG_TOKEN,
            CONFIG_UPDATE: BASE_URL + CONFIG_TOKEN + CONFIG_UPDATE_TOKEN,
            LIBRARY: BASE_URL + LIBRARY_TOKEN,
            BOOK_REQUEST: BASE_URL + LIBRARY_TOKEN + BOOK_REQUEST_TOKEN,
            BOOK_FETCH: BASE_URL + LIBRARY_TOKEN + BOOK_FETCH_TOKEN,
        },
        TOKEN: {
            LIBRARY: LIBRARY_TOKEN,
            BOOK_REQUEST: BOOK_REQUEST_TOKEN,
            BOOK_FETCH: BOOK_FETCH_TOKEN,
            CONFIG: CONFIG_TOKEN,
            CONFIG_UPDATE: CONFIG_TOKEN + CONFIG_UPDATE_TOKEN,
        },
    },
});
