/**
 * @fileoverview Helper functions for worker creation and module imports in different environments
 * @module client/app/utils/helpers-worker
 * @requires shared/utils/logger
 */

import { Logger } from "../../../shared/utils/logger.js";

/**
 * Logger instance
 */
const logger = Logger.getLogger("HelpersWorker", false);

/**
 * Checks if running in extension environment
 * @returns {boolean}
 */
function isExtension() {
    return !!(
        // Test by protocol
        (
            location.protocol === "chrome-extension:" || // Chrome/Edge
            location.protocol === "moz-extension:" || // Firefox
            location.protocol === "safari-extension:" || // Safari
            // Test by runtime API
            (typeof chrome !== "undefined" && chrome?.runtime?.id) || // Chrome/Edge
            (typeof browser !== "undefined" && browser?.runtime?.id) || // Firefox
            (typeof safari !== "undefined" && safari?.extension)
        ) // Safari
    );
}

/**
 * Gets extension URL for a path
 * @param {string} path - Path to the file
 * @returns {string} Full URL
 */
function getExtensionUrl(path) {
    // Clean the path first
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;

    // Chrome/Edge
    if (location.protocol === "chrome-extension:") {
        if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
            return chrome.runtime.getURL(cleanPath);
        }
        return `${location.origin}/${cleanPath}`;
    }

    // Firefox
    if (location.protocol === "moz-extension:") {
        if (typeof browser !== "undefined" && browser.runtime?.getURL) {
            return browser.runtime.getURL(cleanPath);
        }
        return `${location.origin}/${cleanPath}`;
    }

    // Safari
    if (location.protocol === "safari-extension:") {
        if (typeof safari !== "undefined" && safari.extension?.baseURI) {
            return safari.extension.baseURI + cleanPath;
        }
        return `${location.origin}/${cleanPath}`;
    }

    throw new Error("Unable to get URL in extension environment.");
}

/**
 * Resolve the absolute URL for a worker script based on a base URL and a relative/absolute path.
 *
 * If the absolutePath is already a full URL, it returns as is.
 * Otherwise, it tries to replace the matching path segment in baseUrl with absolutePath.
 *
 * Priority order:
 * 1. Equivalent path replacement (e.g., shared replaces client)
 * 2. Longest common subsequence
 * 3. Direct concatenation
 *
 * @param {string} absolutePath - The worker script path, can be relative to the app root.
 * @param {string} baseUrl - The base URL, usually the current script's URL.
 * @returns {string} The resolved absolute URL for the worker script.
 */
function resolveWorkerUrl(absolutePath, baseUrl) {
    if (/^https?:\/\//.test(absolutePath)) {
        // If already an absolute URL, return directly
        return absolutePath;
    }

    const base = new URL(baseUrl);
    const baseParts = base.pathname.split("/").filter(Boolean);
    const absParts = absolutePath.split("/").filter(Boolean);
    // console.log("baseParts", baseParts);
    // console.log("absParts", absParts);

    // Define equivalent paths at the same level
    const equivalentPaths = ["client", "shared", "server"];

    // Priority 1: Check if absParts starts with an equivalent path
    const firstAbsPart = absParts[0];
    if (equivalentPaths.includes(firstAbsPart)) {
        // Find the position of any equivalent path in baseParts
        let equivalentIndex = -1;
        for (let i = 0; i < baseParts.length; i++) {
            if (equivalentPaths.includes(baseParts[i])) {
                equivalentIndex = i;
                break;
            }
        }

        if (equivalentIndex !== -1) {
            // Replace from the equivalent path position
            const resultParts = [...baseParts.slice(0, equivalentIndex), ...absParts];
            return base.origin + "/" + resultParts.join("/");
        }
    }

    // Priority 2: Try to find the position where absParts matches a subarray in baseParts
    let startIndex = -1;
    for (let i = 0; i <= baseParts.length - absParts.length; i++) {
        let match = true;
        for (let j = 0; j < absParts.length; j++) {
            if (baseParts[i + j] !== absParts[j]) {
                match = false;
                break;
            }
        }
        if (match) {
            startIndex = i;
            break;
        }
    }

    // Priority 3: Try to find the longest common subsequence
    let maxCommonLength = 0;
    let bestStartIndex = -1;
    for (let i = 0; i < baseParts.length; i++) {
        for (let j = 0; j < absParts.length; j++) {
            let commonLength = 0;
            while (
                i + commonLength < baseParts.length &&
                j + commonLength < absParts.length &&
                baseParts[i + commonLength] === absParts[j + commonLength]
            ) {
                commonLength++;
            }
            if (commonLength > maxCommonLength) {
                maxCommonLength = commonLength;
                bestStartIndex = i;
            }
        }
    }

    let resultParts;
    if (startIndex !== -1) {
        // If a full match is found, replace from startIndex
        resultParts = [...baseParts.slice(0, startIndex), ...absParts];
    } else if (maxCommonLength > 0) {
        // If any common subsequence is found, replace from its start
        resultParts = [...baseParts.slice(0, bestStartIndex), ...absParts];
    } else {
        // If no commonality, just append
        resultParts = [...baseParts, ...absParts];
    }

    const workerUrl = base.origin + "/" + resultParts.join("/");
    // console.log("workerUrl", workerUrl);
    return workerUrl;
}

/**
 * Validates and resolves URL for a given path
 * @param {string} path - The path to resolve
 * @param {string} baseUrl - Base URL for resolution
 * @param {string} context - Context for error messages (e.g., "worker", "module")
 * @returns {string} Resolved URL
 * @throws {Error} If path is invalid
 */
function resolveUrl(path, baseUrl, context = "resource") {
    // Validate path
    if (path.startsWith(".")) {
        throw new Error(`${context} path must not start with '.'`);
    }

    // Resolve URL based on environment
    if (isExtension()) {
        return getExtensionUrl(path);
    } else {
        return resolveWorkerUrl(path, baseUrl);
    }
}

/**
 * Creates a worker with proper URL handling
 * @param {string} absolutePath - Absolute path to worker file
 * @param {string} baseUrl - Base URL (import.meta.url from caller)
 * @param {Object} options - Worker options
 * @returns {Worker} Created worker
 */
export function createWorker(absolutePath, baseUrl, options = { type: "module" }) {
    try {
        const workerUrl = resolveUrl(absolutePath, baseUrl, "worker");

        logger.log("Creating worker", {
            absolutePath,
            baseUrl,
            workerUrl,
            isExtension: isExtension(),
        });

        return new Worker(workerUrl, options);
    } catch (error) {
        const errorMessage = `Failed to create worker for path '${absolutePath}': ${error.message}`;
        logger.error(errorMessage);
        throw new Error(errorMessage);
    }
}

/**
 * Extracts the default export from a module
 * @param {Object} module - The imported module
 * @returns {*} The default export or the module itself
 */
function extractDefaultExport(module) {
    if (module.default) {
        return module.default;
    }

    const namedExports = Object.keys(module);
    if (namedExports.length === 1) {
        return module[namedExports[0]];
    }

    return module;
}

/**
 * Imports dependencies with proper path handling
 * @param {Array<string>} absolutePaths - Array of absolute paths (must not start with ".")
 * @param {string} baseUrl - Base URL (import.meta.url from caller)
 * @returns {Promise<Array>} Imported modules
 */
export async function importDependencies(absolutePaths, baseUrl) {
    try {
        const imports = await Promise.all(
            absolutePaths.map(async (path) => {
                const moduleUrl = resolveUrl(path, baseUrl, "module");

                logger.log("Importing module:", { path, moduleUrl });
                const module = await import(moduleUrl);

                return extractDefaultExport(module);
            })
        );

        return imports;
    } catch (error) {
        const errorMessage = `Failed to import dependencies: ${error.message}`;
        logger.error(errorMessage);
        throw new Error(errorMessage);
    }
}
