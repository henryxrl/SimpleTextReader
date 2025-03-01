/**
 * @fileoverview Security middleware and utilities
 *
 * Provides functions for:
 * - Path sanitization
 * - File validation
 * - Security checks
 * - HTTPS enforcement
 * - Security headers
 *
 * @module server/app/middleware/security
 * @requires path
 * @requires server/app/config/config
 */

import path from "path";
import { config } from "../config/config.js";

/**
 * Validates and sanitizes file path to prevent directory traversal
 * @param {string} filename - Raw filename from user input
 * @param {string[]} allowedExtensions - Array of allowed file extensions
 * @param {string} basePath - Base path for the library
 * @returns {string|null} Sanitized filename or null if invalid
 */
export function sanitizeFilePath(
    filename,
    allowedExtensions = config.FILE.SUPPORTED_FILE_EXT,
    basePath = config.PATH.LIBRARY
) {
    if (!filename) return null;

    // 1. Basic validation
    if (typeof filename !== "string") return null;
    if (filename.length > 255) return null; // Prevent overly long file names

    // 2. Check for dangerous characters
    const dangerousChars = /[<>:"/\\|?*\x00-\x1F]/g;
    if (dangerousChars.test(filename)) {
        console.log("[Security] Dangerous characters in filename:", filename);
        return null;
    }

    // 3. Normalize the path
    const normalizedPath = path.normalize(filename);
    const safeFilename = path.basename(normalizedPath);

    // 4. Check file extension
    if (!allowedExtensions.includes(path.extname(safeFilename))) {
        console.log("[Security] Invalid file extension:", filename);
        return null;
    }

    // 5. Build and validate full path
    const libraryDir = path.resolve(basePath);
    const fullPath = path.resolve(libraryDir, safeFilename);

    if (!fullPath.startsWith(libraryDir)) {
        console.log("[Security] Directory traversal attempt:", {
            requested: filename,
            resolved: fullPath,
            allowedDir: libraryDir,
        });
        return null;
    }

    return safeFilename;
}

/**
 * Forces HTTPS in production environment
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next function
 */
const enforceHttps = (req, res, next) => {
    // Check if running behind a proxy
    const isProxied = req.headers["x-forwarded-proto"] === "https";

    // Skip HTTPS enforcement in development or when already on HTTPS
    if (!config.SECURITY.HTTPS.ENABLED || isProxied) {
        return next();
    }

    console.log("config.SECURITY.HTTPS.ENABLED", config.SECURITY.HTTPS.ENABLED);
    console.log("isProxied", isProxied);
    console.log("process.env.NODE_ENV", process.env.NODE_ENV);
    // In production, only enforce HTTPS when not behind a proxy
    if (process.env.NODE_ENV === "production" && !isProxied) {
        // Build HTTPS URL and redirect
        const httpsUrl = `https://${req.headers.host}${req.url}`;
        console.log(`[Security] Redirecting to HTTPS: ${httpsUrl}`);
        return res.redirect(301, httpsUrl);
    }

    next();
};

/**
 * Adds security headers to responses
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next function
 */
const securityHeaders = (req, res, next) => {
    const { HEADERS } = config.SECURITY;

    // Only enable HSTS in production
    if (HEADERS.HSTS.enabled && process.env.NODE_ENV === "production") {
        const hstsValue = [
            `max-age=${HEADERS.HSTS.maxAge}`,
            HEADERS.HSTS.includeSubDomains ? "includeSubDomains" : "",
            HEADERS.HSTS.preload ? "preload" : "",
        ]
            .filter(Boolean)
            .join("; ");

        res.setHeader("Strict-Transport-Security", hstsValue);
    }

    // Content Security Policy
    if (HEADERS.CSP.enabled) {
        const cspValue = Object.entries(HEADERS.CSP.directives)
            .map(([key, value]) => {
                // Convert camelCase to kebab-case
                const directive = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
                return `${directive} ${value.join(" ")}`;
            })
            .join("; ");

        res.setHeader("Content-Security-Policy", cspValue);
    }

    // General security headers
    const { GENERAL } = HEADERS;
    res.setHeader("X-Frame-Options", GENERAL.frameOptions);
    res.setHeader("X-XSS-Protection", GENERAL.xssProtection);
    res.setHeader("X-Content-Type-Options", GENERAL.noSniff);
    res.setHeader("Referrer-Policy", GENERAL.referrerPolicy);

    next();
};

/**
 * Combined security middleware
 * @type {Array<Function>}
 */
export const security = [enforceHttps, securityHeaders];
