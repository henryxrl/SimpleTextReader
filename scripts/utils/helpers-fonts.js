/**
 * @fileoverview Font handling helper functions for font validation and management
 *
 * This module provides utility functions for:
 * - Font file format validation (TTF/OTF)
 * - Font name extraction from font files
 * - Font rendering validation for both English and Chinese characters
 * - Font reference pixel caching and comparison
 * - Canvas-based font testing and image saving
 *
 * @module utils/helpers-fonts
 * @requires config/constants
 * @requires utils/base
 */

import * as CONFIG_CONST from "../config/constants.js";
import { removeFileExtension } from "./base.js";

/**
 * Extracts the font name from a font file
 * @param {File} file - The font file to extract the font name from
 * @returns {Object} An object containing the font name in English and Chinese
 */
export async function extractFontName(file) {
    const buffer = await file.arrayBuffer();
    const dataView = new DataView(buffer);
    let fontNames = {};

    const getString = (offset, length, encoding = "utf-16be") => {
        const bytes = new Uint8Array(buffer, offset, length);
        const decoder = new TextDecoder(encoding);
        return decoder.decode(bytes);
    };

    // Read the offset and length of the 'name' table
    const tableCount = dataView.getUint16(4); // Number of tables
    let nameTableOffset, nameTableLength;

    for (let i = 0; i < tableCount; i++) {
        const offset = 12 + i * 16;
        const tag = getString(offset, 4, "ascii");
        if (tag === "name") {
            nameTableOffset = dataView.getUint32(offset + 8);
            nameTableLength = dataView.getUint32(offset + 12);
            break;
        }
    }

    if (!nameTableOffset) {
        console.error("No 'name' table found in this font.");
        return null;
    }

    // Parse the 'name' table
    const nameTable = new DataView(buffer, nameTableOffset, nameTableLength);
    const nameRecordCount = nameTable.getUint16(2);
    const stringStorageOffset = nameTable.getUint16(4);

    for (let i = 0; i < nameRecordCount; i++) {
        const recordOffset = 6 + i * 12;
        const platformID = nameTable.getUint16(recordOffset);
        const nameID = nameTable.getUint16(recordOffset + 6);
        const length = nameTable.getUint16(recordOffset + 8);
        const offset = nameTable.getUint16(recordOffset + 10) + stringStorageOffset;

        if (nameID === 1) {
            // NameID 1: Font Family Name
            let encoding = platformID === 3 ? "utf-16be" : "utf-8";
            let fontName = getString(nameTableOffset + offset, length, encoding);
            const uniqueId = generateUniqueId();

            if (/[\u4e00-\u9fff]/.test(fontName)) {
                fontNames["zh"] =
                    sanitizeFontFamilyName(fontName, true).trim() ??
                    sanitizeFontFamilyName(removeFileExtension(file.name)).trim() ??
                    `字体-${uniqueId}`;
            } else {
                fontNames["en"] =
                    sanitizeFontFamilyName(fontName).trim() ??
                    sanitizeFontFamilyName(removeFileExtension(file.name)).trim() ??
                    `font-${uniqueId}`;
            }
        }
    }

    return fontNames;
}

/**
 * Sanitizes a font family name by removing invalid characters
 * @param {string} fontFamily - The font family name to sanitize
 * @param {boolean} removeSpace - Whether to remove spaces
 * @returns {string} The sanitized font family name
 */
function sanitizeFontFamilyName(fontFamily, removeSpace = false) {
    // Allow only alphanumeric characters, spaces, hyphens, and underscores
    const sanitized = fontFamily.replace(/[{}[\];:'"<>?=+()*&^%$#@!~\\|`\.]/g, "-");
    if (removeSpace) {
        return sanitized.replace(/\s+/g, "");
    }
    return sanitized;
}

/**
 * Generates a unique ID
 * @returns {string} A unique ID
 */
function generateUniqueId() {
    // Generate a random string using Math.random() and Date.now()
    return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

/**
 * Generates a reference hash for font validation
 * @returns {string} A reference hash
 */
function generateReferenceHash() {
    const config = encodeURIComponent(JSON.stringify(CONFIG_CONST.CONST_FONT_VALIDATION_CONFIG));
    // console.log("config", config);
    return btoa(config);
}

/**
 * Saves a canvas as an image
 * @param {HTMLCanvasElement} canvas - The canvas to save
 * @param {string} name - The name of the canvas
 * @param {boolean} consoleLog - Whether to log to the console
 */
function saveCanvasAsImage(canvas, type, fontName = "", consoleLog = false) {
    // console.log("saveCanvasAsImage", type, fontName);
    try {
        const now = new Date();
        const timestamp =
            now.getHours().toString().padStart(2, "0") +
            now.getMinutes().toString().padStart(2, "0") +
            now.getSeconds().toString().padStart(2, "0") +
            now.getMilliseconds().toString().padStart(3, "0");
        const fontPrefix = type.startsWith("test-") && fontName ? `-${fontName.slice(0, 10)}` : "";
        const filename = `font-${type}${fontPrefix}-${timestamp}.png`;

        const link = document.createElement("a");
        link.download = filename;
        link.href = canvas.toDataURL();

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        if (consoleLog) {
            console.log(`Saving ${filename}`);
        }
    } catch (e) {
        console.warn("Failed to save canvas as image:", e);
    }
}

/**
 * Retrieves cached reference pixels for font validation
 * @param {boolean} saveCanvas - Whether to save the canvas as an image
 * @param {boolean} consoleLog - Whether to log to the console
 * @returns {Object} An object containing the reference pixels
 */
async function getReferencePixels(saveCanvas = false, consoleLog = false) {
    const CACHE_KEY = "fontValidationReference";
    const currentHash = generateReferenceHash();
    // console.log("currentHash", currentHash);

    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const { hash, pixels } = JSON.parse(cached);
            if (hash === currentHash) {
                if (consoleLog) {
                    console.log("Using cached font reference");
                }
                return pixels;
            }
        }
    } catch (e) {
        console.warn("Failed to read font reference cache:", e);
    }

    await document.fonts.ready;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    canvas.width = CONFIG_CONST.CONST_FONT_VALIDATION_CONFIG.canvas.width;
    canvas.height = CONFIG_CONST.CONST_FONT_VALIDATION_CONFIG.canvas.height;

    // Test English reference font
    ctx.font = `${CONFIG_CONST.CONST_FONT_VALIDATION_CONFIG.fontSize} ${CONFIG_CONST.CONST_FONT_VALIDATION_CONFIG.defaultFonts.en}`;
    ctx.fillStyle = "black";
    ctx.fillText(
        CONFIG_CONST.CONST_FONT_VALIDATION_CONFIG.testStrings.en,
        CONFIG_CONST.CONST_FONT_VALIDATION_CONFIG.text.x,
        CONFIG_CONST.CONST_FONT_VALIDATION_CONFIG.text.y
    );
    const enReferencePixels = countNonEmptyPixels(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (saveCanvas) {
        saveCanvasAsImage(canvas, "reference-en", "", consoleLog);
    }

    // Test Chinese reference font
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${CONFIG_CONST.CONST_FONT_VALIDATION_CONFIG.fontSize} ${CONFIG_CONST.CONST_FONT_VALIDATION_CONFIG.defaultFonts.zh}`;
    ctx.fillText(
        CONFIG_CONST.CONST_FONT_VALIDATION_CONFIG.testStrings.zh,
        CONFIG_CONST.CONST_FONT_VALIDATION_CONFIG.text.x,
        CONFIG_CONST.CONST_FONT_VALIDATION_CONFIG.text.y
    );
    const zhReferencePixels = countNonEmptyPixels(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (saveCanvas) {
        saveCanvasAsImage(canvas, "reference-zh", "", consoleLog);
    }

    const referencePixels = { en: enReferencePixels, zh: zhReferencePixels };

    try {
        localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
                hash: currentHash,
                pixels: referencePixels,
            })
        );
    } catch (e) {
        console.warn("Failed to cache font reference:", e);
    }

    return referencePixels;
}

/**
 * Counts the number of non-empty pixels in an image data
 * @param {ImageData} imageData - The image data to count the non-empty pixels from
 * @returns {number} The number of non-empty pixels
 */
function countNonEmptyPixels(imageData) {
    let count = 0;
    for (let i = 0; i < imageData.data.length; i += 4) {
        if (imageData.data[i + 3] > 0) count++;
    }
    return count;
}

/**
 * Validate a font file, including file format and font rendering
 * @param {File} file - The font file to validate
 * @param {boolean} saveCanvas - Whether to save the canvas as an image
 * @param {boolean} consoleLog - Whether to log to the console
 * @returns {Promise<{isValid: boolean, reason?: string, type?: number}>} An object containing the validation result
 * - isValid: true if the font file is valid, false otherwise
 * - reason: The reason why the font file is not valid
 * - type: 0 or -1 if the font file is not valid, 1 if the font file is valid
 * @throws {Error} If the font file is not valid
 */
async function isValidFontFile(file, saveCanvas = false, consoleLog = false) {
    try {
        // 1. First check file format (magic number check)
        const buffer = await file.slice(0, 4).arrayBuffer();
        const uint8Array = new Uint8Array(buffer);
        const OTF_MAGIC = [0x4f, 0x54, 0x54, 0x4f]; // "OTTO"
        const TTF_MAGIC = [0x00, 0x01, 0x00, 0x00]; // TrueType

        const isOTF = uint8Array.every((byte, index) => byte === OTF_MAGIC[index]);
        const isTTF = uint8Array.every((byte, index) => byte === TTF_MAGIC[index]);

        if (!isOTF && !isTTF) {
            return {
                isValid: false,
                reason: "Invalid file format - must be TXT, TTF or OTF",
                type: -1,
            };
        }

        // 2. Second check font rendering
        const tempFontName = `font-${generateUniqueId()}`;
        const tempUrl = URL.createObjectURL(file);
        const testFontFace = new FontFace(tempFontName, `url(${tempUrl})`);

        try {
            await testFontFace.load();
            const fontName = removeFileExtension(file.name);
            const referencePixels = await getReferencePixels(saveCanvas, consoleLog);
            if (consoleLog) {
                console.log("referencePixels", referencePixels);
            }

            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            canvas.width = CONFIG_CONST.CONST_FONT_VALIDATION_CONFIG.canvas.width;
            canvas.height = CONFIG_CONST.CONST_FONT_VALIDATION_CONFIG.canvas.height;

            // Test English font
            document.fonts.add(testFontFace);
            ctx.font = `${CONFIG_CONST.CONST_FONT_VALIDATION_CONFIG.fontSize} "${tempFontName}"`;
            ctx.fillText(
                CONFIG_CONST.CONST_FONT_VALIDATION_CONFIG.testStrings.en,
                CONFIG_CONST.CONST_FONT_VALIDATION_CONFIG.text.x,
                CONFIG_CONST.CONST_FONT_VALIDATION_CONFIG.text.y
            );
            const testEnImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const enTestPixels = countNonEmptyPixels(testEnImageData);
            if (saveCanvas) {
                saveCanvasAsImage(canvas, "test-en", fontName, consoleLog);
            }

            // Test Chinese font
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillText(
                CONFIG_CONST.CONST_FONT_VALIDATION_CONFIG.testStrings.zh,
                CONFIG_CONST.CONST_FONT_VALIDATION_CONFIG.text.x,
                CONFIG_CONST.CONST_FONT_VALIDATION_CONFIG.text.y
            );
            const testZhImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const zhTestPixels = countNonEmptyPixels(testZhImageData);
            if (saveCanvas) {
                saveCanvasAsImage(canvas, "test-zh", fontName, consoleLog);
            }

            // Calculate ratio
            const enPixelRatio = enTestPixels / referencePixels.en;
            const zhPixelRatio = zhTestPixels / referencePixels.zh;

            // Add detailed debug information
            if (consoleLog) {
                console.log(`Font "${file.name}" validation - English:`, {
                    referencePixels: referencePixels.en,
                    testPixels: enTestPixels,
                    referenceRatio: `(${CONFIG_CONST.CONST_FONT_VALIDATION_CONFIG.ratio.min}, ${CONFIG_CONST.CONST_FONT_VALIDATION_CONFIG.ratio.max})`,
                    ratio: enPixelRatio,
                });

                console.log(`Font "${file.name}" validation - Chinese:`, {
                    referencePixels: referencePixels.zh,
                    testPixels: zhTestPixels,
                    referenceRatio: `(${CONFIG_CONST.CONST_FONT_VALIDATION_CONFIG.ratio.min}, ${CONFIG_CONST.CONST_FONT_VALIDATION_CONFIG.ratio.max})`,
                    ratio: zhPixelRatio,
                });
            }

            // Clean up resources
            document.fonts.delete(testFontFace);

            // Check rendering result
            // 1. Ensure enough pixels are rendered (not blank or space)
            // 2. Ensure the number of rendered pixels is similar to the reference font (allow some error)
            if (
                enPixelRatio < CONFIG_CONST.CONST_FONT_VALIDATION_CONFIG.ratio.min ||
                enPixelRatio > CONFIG_CONST.CONST_FONT_VALIDATION_CONFIG.ratio.max ||
                zhPixelRatio < CONFIG_CONST.CONST_FONT_VALIDATION_CONFIG.ratio.min ||
                zhPixelRatio > CONFIG_CONST.CONST_FONT_VALIDATION_CONFIG.ratio.max
            ) {
                return {
                    isValid: false,
                    reason: "Font may not render characters properly",
                    type: 0,
                };
            }

            return {
                isValid: true,
                reason: "",
                type: 1,
            };
        } finally {
            URL.revokeObjectURL(tempUrl);
        }
    } catch (error) {
        return {
            isValid: false,
            reason: error.message || "Font validation failed",
            type: -1,
        };
    }
}

/**
 * Validate a font file
 * @param {File} file - The font file to validate
 * @param {boolean} saveCanvas - Whether to save the canvas as an image
 * @param {boolean} consoleLog - Whether to log to the console
 * @returns {Promise<Object>} An object containing the validation result
 */
export async function validateFontFile(file, saveCanvas = false, consoleLog = false) {
    try {
        const validation = await isValidFontFile(file, saveCanvas, consoleLog);
        if (!validation.isValid) {
            console.warn(validation.reason);
        }
        return validation;
    } catch (error) {
        console.error(error);
        return {
            isValid: false,
            reason: error.message || "Font validation failed",
            type: -1,
        };
    }
}
