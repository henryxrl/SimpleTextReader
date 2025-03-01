/**
 * @fileoverview Jschardet adapter for detecting encoding
 *
 * @module shared/adapters/jschardet
 */

/**
 * @function getJschardet
 * @description Get the Jschardet module
 * @returns {Promise<Object>} The Jschardet module
 */
export const getJschardet = async () => {
    // Frontend or Web Worker: use global variable
    if (typeof self !== "undefined") {
        return self.jschardet; // self is available in both browsers and Workers
    }
    // Node.js environment
    const jschardet = await import("../../server/node_modules/jschardet/src/index.js");
    return jschardet.default;
};
