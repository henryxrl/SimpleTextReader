/**
 * @fileoverview Server configuration module
 *
 * This module centralizes all server configurations including:
 * - Environment variables
 * - Server settings
 * - API endpoints
 * - File system paths
 * - File configuration
 * - Session configuration
 * - Token configuration
 * - Security configuration
 *
 * The configuration is immutable (Object.freeze) to prevent runtime modifications.
 *
 * @module server/app/config/config
 * @requires path
 * @requires dotenv
 * @requires url
 * @requires shared/config/shared-config
 */

import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { SHARED_CONFIG } from "../../../shared/config/shared-config.js";

/**
 * Load environment variables from .env file
 */
dotenv.config();

/**
 * Get the current file name and directory to set up the project root and server root
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "../../../");
const SERVER_ROOT = path.resolve(PROJECT_ROOT, "server");

/**
 * Router tokens
 */
const TOKEN_API_BASE = SHARED_CONFIG.API.URL.BASE;
const TOKEN_API_DETAILS = "/details";

/**
 * Configuration for the server
 * @type {Object}
 * @property {Object} ENV - Environment variables
 * @property {Object} SERVER - Server configuration
 * @property {Object} API - API paths
 * @property {Object} PATH - File system paths
 * @property {Object} SESSION - Session configuration
 * @property {Object} TOKEN - Token configuration
 * @property {Object} FILE - File configuration
 */
export const config = Object.freeze({
    /**
     * Environment variables
     * @type {Object}
     * @property {string} NODE_ENV - Node environment
     * @property {string} SESSION_SECRET - Session secret key
     */
    ENV: {
        NODE_ENV: process.env.NODE_ENV || "development",
        SESSION_SECRET: process.env.SESSION_SECRET || "default-secret-key",
    },

    /**
     * Server configuration
     * @type {Object}
     * @property {number} PORT - Server port
     * @property {string} URL - Server URL
     */
    SERVER: {
        PORT: SHARED_CONFIG.PORT,
        get URL() {
            return `http://localhost:${this.PORT}`;
        },
    },

    /**
     * API paths
     * @type {Object}
     * @property {Object} URL - API URLs
     * @property {Object} TOKEN - Token API details
     */
    API: {
        URL: {
            BASE: TOKEN_API_BASE,
            API_DETAILS: TOKEN_API_BASE + TOKEN_API_DETAILS,
            CONFIG: SHARED_CONFIG.API.URL.CONFIG,
            CONFIG_UPDATE: SHARED_CONFIG.API.URL.CONFIG_UPDATE,
            LIBRARY: SHARED_CONFIG.API.URL.LIBRARY,
            BOOK_REQUEST: SHARED_CONFIG.API.URL.BOOK_REQUEST,
            BOOK_FETCH: SHARED_CONFIG.API.URL.BOOK_FETCH,
        },
        TOKEN: {
            API_DETAILS: TOKEN_API_DETAILS,
            CONFIG: SHARED_CONFIG.API.TOKEN.CONFIG,
            CONFIG_UPDATE: SHARED_CONFIG.API.TOKEN.CONFIG_UPDATE,
            LIBRARY: SHARED_CONFIG.API.TOKEN.LIBRARY,
            BOOK_REQUEST: SHARED_CONFIG.API.TOKEN.BOOK_REQUEST,
            BOOK_FETCH: SHARED_CONFIG.API.TOKEN.BOOK_FETCH,
        },
    },

    /**
     * File system paths
     * @type {Object}
     * @property {string} ROOT - Project root
     * @property {string} SERVER - Server root
     * @property {string} LIBRARY - Library root
     * @property {string} UPLOADS - Uploads root
     * @property {string} PROCESSED_BOOKS - Processed books root
     */
    PATH: {
        ROOT: PROJECT_ROOT,
        SERVER: SERVER_ROOT,
        LIBRARY: path.resolve(PROJECT_ROOT, "books_one"),
        UPLOADS: path.resolve(PROJECT_ROOT, "uploads"),
        PROCESSED_BOOKS: path.resolve(PROJECT_ROOT, "processed_books"),
    },

    /**
     * File configuration
     * @type {Object}
     * @property {number} MAX_FILE_SIZE - Maximum file size
     * @property {string[]} SUPPORTED_FONT_EXT - Supported font extensions
     * @property {string[]} SUPPORTED_FILE_EXT - Supported file extensions
     * @property {string[]} SUPPORTED_FILE_TYPE - Supported file types
     * @property {string[]} SUPPORTED_FONT_TYPES - Supported font types
     */
    FILE: {
        MAX_FILE_SIZE: SHARED_CONFIG.MAX_FILE_SIZE,
        SUPPORTED_FONT_EXT: SHARED_CONFIG.SUPPORTED_FONT_EXT,
        SUPPORTED_FILE_EXT: SHARED_CONFIG.SUPPORTED_FILE_EXT,
        SUPPORTED_FILE_TYPE: SHARED_CONFIG.SUPPORTED_FILE_TYPE,
        SUPPORTED_FONT_TYPES: SHARED_CONFIG.SUPPORTED_FONT_TYPES,
    },

    /**
     * Session configuration
     * @type {Object}
     * @property {string} secret - Session secret key
     * @property {string} name - Session name
     * @property {boolean} resave - Whether to resave session
     * @property {boolean} saveUninitialized - Whether to save uninitialized session
     * @property {Object} cookie - Session cookie configuration
     */
    get SESSION() {
        return {
            secret: this.ENV.SESSION_SECRET,
            name: "sessionId",
            resave: false,
            saveUninitialized: false,
            cookie: {
                secure: this.ENV.NODE_ENV === "production",
                httpOnly: true,
                sameSite: "strict",
                maxAge: 24 * 60 * 60 * 1000, // 24 hours
            },
        };
    },

    /**
     * Token configuration
     * @type {Object}
     * @property {number} EXPIRY - Token expiry time
     * @property {number} CLEANUP_INTERVAL - Token cleanup interval
     */
    TOKEN: {
        EXPIRY: 5 * 60 * 1000, // 5 minutes
        CLEANUP_INTERVAL: 60 * 1000, // 1 minute
    },

    /**
     * Security configuration
     * @type {Object}
     * @property {Object} HTTPS - HTTPS settings
     * @property {Object} HEADERS - Security headers
     */
    SECURITY: {
        // HTTPS settings
        HTTPS: {
            ENABLED: process.env.NODE_ENV === "production",
            HSTS_MAX_AGE: 31536000, // 1 year in seconds
            INCLUDE_SUBDOMAINS: true,
        },

        // Security headers
        HEADERS: {
            // HTTP Strict Transport Security
            HSTS: {
                enabled: true,
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true,
            },

            // Content Security Policy
            CSP: {
                enabled: true,
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", "data:", "blob:"],
                    fontSrc: ["'self'", "data:", "blob:", "https://fontsapi.zeoseven.com"],
                    connectSrc: ["'self'"],
                    objectSrc: ["'none'"],
                    baseUri: ["'self'"],
                    formAction: ["'self'"],
                    frameAncestors: ["'none'"],
                },
            },

            // Other security headers
            GENERAL: {
                // Prevent clickjacking
                frameOptions: "DENY",
                // Prevent XSS attacks
                xssProtection: "1; mode=block",
                // Prevent MIME type sniffing
                noSniff: "nosniff",
                // Control referrer information
                referrerPolicy: "strict-origin-when-cross-origin",
            },
        },
    },
});
