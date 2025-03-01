/**
 * @fileoverview TextDecoder adapter for different environments
 */

/**
 * Get TextDecoder class based on environment
 * @returns {Promise<typeof TextDecoder>} TextDecoder class
 */
export const getTextDecoderClass = async () => {
    // Node.js environment
    if (typeof self === "undefined") {
        const { TextDecoder } = await import("util");
        return TextDecoder;
    }

    // Frontend or Web Worker
    return TextDecoder;
};
