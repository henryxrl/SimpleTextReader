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
 * Creates a worker with proper URL handling
 * @param {string} absolutePath - Absolute path to worker file
 * @param {string} baseUrl - Base URL (import.meta.url from caller)
 * @param {Object} options - Worker options
 * @returns {Worker} Created worker
 */
export function createWorker(absolutePath, baseUrl, options = { type: "module" }) {
    try {
        if (absolutePath.startsWith(".")) {
            throw new Error("Worker path must not start with '.'");
        }

        let workerUrl;
        if (isExtension()) {
            workerUrl = getExtensionUrl(absolutePath);
        } else {
            // Extract the path part from baseUrl and absolutePath
            const currentPath = new URL(baseUrl).pathname;
            const targetPath = absolutePath;

            // Split both paths into arrays
            const currentParts = currentPath.split("/").filter(Boolean);
            const targetParts = targetPath.split("/").filter(Boolean);

            // Find the length of the common prefix
            let commonPrefixLength = 0;
            while (
                commonPrefixLength < currentParts.length - 1 &&
                commonPrefixLength < targetParts.length &&
                currentParts[commonPrefixLength] === targetParts[commonPrefixLength]
            ) {
                commonPrefixLength++;
            }

            // Calculate the number of back steps
            const backSteps = currentParts.length - commonPrefixLength - 1;

            // Build the relative path
            const relativePath = "../".repeat(backSteps) + targetParts.slice(commonPrefixLength).join("/");
            workerUrl = new URL(relativePath, baseUrl).href;
        }

        logger.log("Creating worker", {
            absolutePath,
            baseUrl,
            workerUrl,
            isExtension: isExtension(),
        });
        return new Worker(workerUrl, options);
    } catch (error) {
        console.error("Failed to create worker:", error);
        throw new Error(`Failed to create worker: ${error.message}`);
    }
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
                if (path.startsWith(".")) {
                    throw new Error("Module path must not start with '.'");
                }

                let moduleUrl;
                if (isExtension()) {
                    moduleUrl = getExtensionUrl(path);
                } else {
                    // Use the same logic as createWorker
                    const currentPath = new URL(baseUrl).pathname;
                    const targetPath = path;

                    const currentParts = currentPath.split("/").filter(Boolean);
                    const targetParts = targetPath.split("/").filter(Boolean);

                    let commonPrefixLength = 0;
                    while (
                        commonPrefixLength < currentParts.length - 1 &&
                        commonPrefixLength < targetParts.length &&
                        currentParts[commonPrefixLength] === targetParts[commonPrefixLength]
                    ) {
                        commonPrefixLength++;
                    }

                    const backSteps = currentParts.length - commonPrefixLength - 1;
                    const relativePath = "../".repeat(backSteps) + targetParts.slice(commonPrefixLength).join("/");
                    moduleUrl = new URL(relativePath, baseUrl).href;
                }

                logger.log("Importing module:", { path, moduleUrl });
                const module = await import(moduleUrl);

                if (module.default) {
                    return module.default;
                } else {
                    const namedExports = Object.keys(module);
                    if (namedExports.length === 1) {
                        return module[namedExports[0]];
                    }
                    return module;
                }
            })
        );
        return imports;
    } catch (error) {
        console.error("Failed to import dependencies:", error);
        throw error;
    }
}
