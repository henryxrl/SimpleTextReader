/**
 * @fileoverview Utility functions for API communication and file handling
 *
 * This module provides core utilities for:
 * - Making authenticated API requests
 * - Handling file operations
 * - Converting web sources to File objects
 *
 * @module client/app/utils/helpers-server
 * @requires client/app/config/constants
 * @requires shared/config/shared-config
 */

import * as CONFIG_CONST from "../config/constants.js";
import { SHARED_CONFIG } from "../../../shared/config/shared-config.js";

/**
 * Converts a web source (URL or Response) to a File object or metadata
 * @async
 * @param {string|Response} input - URL or Response object to convert
 * @param {boolean} [loadContent=true] - Whether to load file content
 * @param {string} [forcedFilename=null] - Override filename if needed
 * @returns {Promise<File|Object>} File object or metadata
 * @throws {Error} If conversion fails
 */
const createFileObjectFromWebSource = (() => {
    /**
     * Validate the input parameters
     * @param {string|Response} input - The input URL or Response object
     * @param {boolean} loadContent - Whether to load the file content
     * @param {string} forcedFilename - The forced filename
     * @throws {TypeError} If the input parameters are invalid
     */
    function validateInput(input, loadContent, forcedFilename) {
        if (!(input instanceof Response) && typeof input !== "string") {
            throw new TypeError("Input must be a Response object or a string URL");
        }
        if (typeof loadContent !== "boolean") {
            throw new TypeError("loadContent must be a boolean");
        }
        if (forcedFilename !== null && typeof forcedFilename !== "string") {
            throw new TypeError("forcedFilename must be null or a string");
        }
    }

    /**
     * Get the Response object and the file name
     * @param {string|Response} input - URL or Response object
     * @param {string} [forcedFilename=null] - Override filename if needed
     * @param {boolean} [loadContent=true] - Whether to load the file content
     * @returns {Promise<{response: Response, filename: string}>} Response object and filename
     */
    async function getResponseAndFilename(input, forcedFilename, loadContent) {
        let response, filename;

        if (input instanceof Response) {
            response = input;
            filename =
                forcedFilename ||
                response.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/['"]/g, "") ||
                "unknown_file";
        } else if (typeof input === "string" && input) {
            filename = forcedFilename || decodeURIComponent(input.split("/").pop());
            if (loadContent) {
                response = await fetch(input);
                if (!response.ok) {
                    const errorMessage = await response.text().catch(() => "No error message available");
                    throw new Error(`Failed to fetch the file (${response.status}): ${errorMessage}`);
                }
            }
        }

        if (!filename || typeof filename !== "string") {
            throw new TypeError("Could not determine valid filename");
        }

        return { response, filename };
    }

    /**
     * Get the metadata from the response
     * @param {Response} response - The response object
     * @param {string} filename - The filename
     * @param {string|Response} input - The input URL or Response object
     * @returns {Promise<Object>} The metadata
     */
    async function getMetadata(response, filename, input) {
        if (!(response instanceof Response)) {
            throw new TypeError("Response must be a Response object");
        }

        const metadata = await response.json();
        if (!metadata || typeof metadata !== "object") {
            throw new TypeError("Invalid metadata format");
        }
        // console.log("Response metadata:", metadata);

        // Validate required metadata fields
        const requiredFields = ["isEastern", "encoding", "size"];
        for (const field of requiredFields) {
            if (!(field in metadata) && !(field in metadata?.metadata)) {
                throw new TypeError(`Missing required metadata field: ${field}`);
            }
        }

        return Promise.resolve({
            name: filename,
            path: input instanceof Response ? metadata.metadata?.path : input,
            type: CONFIG_CONST.CONST_FILE.SUPPORTED_FILE_TYPE,
            isEastern: Boolean(metadata.metadata?.isEastern) ?? true,
            encoding: String(metadata.metadata?.encoding) ?? "utf-8",
            size: Number(metadata.metadata?.size) ?? 0,
        });
    }

    /**
     * Create a raw file object
     * @param {Response} response - The response object
     * @param {string} filename - The filename
     * @returns {Promise<File>} The file object
     */
    async function createRawFileObject(response, filename) {
        if (!(response instanceof Response)) {
            throw new TypeError("Response must be a Response object");
        }

        const contentType = response.headers.get("Content-Type") || "";
        const [mimeType, charset] = contentType.split(";").map((s) => s.trim());
        const fileType = mimeType || CONFIG_CONST.CONST_FILE.SUPPORTED_FILE_TYPE;

        // Retrieve metadata from response headers
        const isEastern = response.headers.get("X-Is-Eastern");
        const encoding = response.headers.get("X-Encoding");
        // console.log("isEastern:", isEastern);
        // console.log("encoding:", encoding);

        try {
            const data = await response.arrayBuffer();
            const file = new File([data], filename, { type: fileType });

            // Use Object.defineProperties to add custom properties
            Object.defineProperties(file, {
                isEastern: {
                    value: isEastern === "true",
                    writable: false,
                    enumerable: true,
                },
                encoding: {
                    value: encoding || "utf-8",
                    writable: false,
                    enumerable: true,
                },
            });

            return file;
        } catch (error) {
            response.body?.cancel();
            throw new Error(`Failed to process file ${filename}: ${error.message}`);
        } finally {
            if (response.body && !response.body.locked) {
                await response.body.cancel();
            }
        }
    }

    /**
     * Main function to create a file object from a web source
     * @async
     * @param {string|Response} input - The input URL or Response object
     * @param {boolean} [loadContent=true] - Whether to load the file content
     * @param {string} [forcedFilename=null] - Override filename if needed
     * @returns {Promise<File|Object>} File object or metadata
     * @throws {Error} If any error occurs during the process
     */
    return async function (input, loadContent = true, forcedFilename = null) {
        // console.log("createFileObjectFromWebSource:", { input, loadContent, forcedFilename });

        // Validate input
        validateInput(input, loadContent, forcedFilename);

        let response;
        try {
            // 1. Get the Response object and the file name
            const { response: resp, filename } = await getResponseAndFilename(input, forcedFilename, loadContent);
            response = resp;

            // 2. If only metadata is needed, return immediately
            if (!loadContent) {
                return await getMetadata(response, filename, input);
            }

            // 3. Process the file content
            const contentType = response.headers.get("Content-Type") || "";

            // 3a. Processed JSON file
            if (contentType.includes("application/json")) {
                const jsonData = await response.json();
                if (!jsonData || typeof jsonData !== "object") {
                    throw new TypeError("Invalid JSON response");
                }
                // console.log("Processed JSON file:", jsonData);
                return jsonData;
            }

            // 3b. Raw file
            return await createRawFileObject(response, filename);
        } catch (error) {
            if (response?.body) {
                response.body.cancel();
            }
            throw error;
        }
    };
})();

/**
 * Fetches a file from the server with authentication
 * @async
 * @param {string} filename - Name of the file to fetch
 * @param {boolean} [loadContent=true] - Whether to load the file content
 * @returns {Promise<File|Object>} File object or metadata
 * @throws {Error} If authentication or fetch fails
 */
export const fetchAuthenticatedFile = (() => {
    /**
     * Makes an authenticated API request with consistent headers and error handling
     * @async
     * @param {string} url - The URL to send the request to
     * @param {Object} [options={}] - Fetch options
     * @param {string} [options.method] - HTTP method
     * @param {Object} [options.headers] - Additional headers
     * @param {string|Object} [options.body] - Request body
     * @returns {Promise<Response>} The fetch response
     * @throws {Error} If the request fails
     */
    async function fetchApi(url, options = {}) {
        const defaultHeaders = {
            Accept: "application/json",
            "Content-Type": "application/json",
        };

        const response = await fetch(url, {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers,
            },
            credentials: "include",
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        return response;
    }

    /**
     * Fetches an access token for the given filename
     * @async
     * @param {string} filename - The filename to fetch the token for
     * @returns {Promise<Object>} The access token and expiration time
     * @throws {Error} If the token request fails
     */
    async function getAccessToken(filename) {
        const tokenResponse = await fetchApi(SHARED_CONFIG.API.URL.BOOK_REQUEST, {
            method: "POST",
            body: JSON.stringify({ filename }),
        });
        return tokenResponse.json();
    }

    /**
     * Fetches the file content using the provided token
     * @async
     * @param {string} token - The access token
     * @param {boolean} loadContent - Whether to load the file content
     * @returns {Promise<Response>} The fetch response
     * @throws {Error} If the file fetch fails
     */
    async function fetchFileWithToken(token, loadContent) {
        return await fetchApi(SHARED_CONFIG.API.URL.BOOK_FETCH, {
            method: "POST",
            body: JSON.stringify({ token, loadContent }),
        });
    }

    /**
     * Handles token errors by checking the response status and throwing an error if necessary
     * @async
     * @param {Response} response - The fetch response
     * @throws {Error} If the token is expired
     */
    async function handleTokenError(response) {
        if (response.status === 403) {
            const error = await response.json();
            if (error.error === "Token expired") {
                throw new Error("Access token expired. Please try again.");
            }
        }
    }

    /**
     * Main function to fetch an authenticated file
     * @async
     * @param {string} filename - The filename to fetch
     * @param {boolean} [loadContent=true] - Whether to load the file content
     * @returns {Promise<File|Object>} The file object or metadata
     * @throws {Error} If any error occurs during the process
     */
    return async function (filename, loadContent = true) {
        try {
            // console.log("fetchAuthenticatedFile:", { filename, loadContent });

            // 1. Get access token
            const { token, expiresIn } = await getAccessToken(filename);

            // 2. Fetch file content using token
            // Use token quickly before it expires
            const fileResponse = await fetchFileWithToken(token, loadContent);
            await handleTokenError(fileResponse);

            // 3. Process response
            return await createFileObjectFromWebSource(fileResponse, loadContent, filename);
        } catch (error) {
            console.error(`Error fetching file ${filename}:`, error);
            throw error;
        }
    };
})();
