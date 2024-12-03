/**
 * @fileoverview Base utility functions for the application
 *
 * This module provides fundamental utility functions for:
 * - Size and dimension calculations
 * - Color manipulation and conversion
 * - DOM element manipulation and checks
 * - String and number formatting
 * - File handling
 * - Viewport and visibility detection
 * - Data type validation
 *
 * @module utils/base
 * @requires config/constants
 * @requires config/variables-dom
 */

import * as CONFIG_CONST from "../config/constants.js";

/**
 * Removes the hashbang (#!) from the current URL using the History API.
 * @throws {Error} If History API is not supported by the browser
 * @see {@link https://developer.mozilla.org/docs/Web/API/History/pushState|MDN History.pushState}
 */
export function removeHashbang() {
    const currentPath = window.location.pathname;
    if (window.location.hash) {
        history.pushState("", document.title, currentPath);
    }
}

/**
 * Removes file extension from a filename
 * @param {string} filename - The filename to process
 * @returns {string} Filename without extension
 */
export function removeFileExtension(filename) {
    return filename.replace(CONFIG_CONST.CONST_FILE.EXT_REGEX, "");
}

/**
 * Formats byte size to human readable format using SI or IEC units
 * @param {number} bytes - The size in bytes
 * @param {string} units - Unit system to use ('si' or 'iec')
 * @returns {string} Formatted size string (e.g., "1.5 MB" or "1.5 MiB")
 */
export function formatBytes(bytes, units = "si") {
    // Handle special cases
    if ([-1, 0, 1].includes(bytes)) {
        return `${bytes} Byte${bytes === 1 ? "" : "s"}`;
    }

    const UNITS_CONFIG = {
        si: {
            base: 1000, // 10^3
            units: ["Bytes", "kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"],
        },
        iec: {
            base: 1024, // 2^10
            units: ["Bytes", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"],
        },
    };

    const config = UNITS_CONFIG[units.toLowerCase()] || UNITS_CONFIG.iec;
    const absBytes = Math.abs(bytes);
    const exponent = Math.floor(Math.log(absBytes) / Math.log(config.base));
    const value = (absBytes / Math.pow(config.base, exponent)) * Math.sign(bytes);

    return `${value >= 99.995 || exponent === 0 ? value.toFixed(0) : value.toFixed(2)} ${config.units[exponent]}`;
}

/**
 * Simplified version of byte size formatting using SI units
 * @param {number} bytes - The size in bytes
 * @param {number} decimals - Number of decimal places to show
 * @returns {string} Formatted size string
 */
export function formatBytes_simple(bytes, decimals = 2) {
    if (!+bytes) return "0 Bytes";

    const k = 1000;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Gets the size of an element in pixels
 * Credit: https://stackoverflow.com/questions/10463518/converting-em-to-px-in-javascript-and-getting-default-font-size
 * @param {string} size - CSS size value (e.g., "1em")
 * @param {HTMLElement} parent - Parent element for context
 * @returns {number} Size in pixels
 */
export function getSize(size = "1em", parent = document.body) {
    let l = document.createElement("div");
    l.style.visibility = "hidden";
    l.style.boxSize = "content-box";
    l.style.position = "absolute";
    l.style.maxHeight = "none";
    l.style.height = size;
    parent.appendChild(l);
    size = l.clientHeight;
    l.remove();
    return size;
}

/**
 * Gets precise size measurement in pixels with better accuracy for large values
 * @param {string} size - CSS size value (e.g., "1em")
 * @param {HTMLElement} parent - Parent element for context
 * @returns {number} Precise size in pixels, or -1 if parent is undefined
 */
export function getSizePrecise(size = "1em", parent = document.body) {
    if (isVariableDefined(parent)) {
        let l = document.createElement("div"),
            i = 1,
            s,
            t;
        l.style.visibility = "hidden";
        l.style.boxSize = "content-box";
        l.style.position = "absolute";
        l.style.maxHeight = "none";
        l.style.height = size;
        parent.appendChild(l);
        t = l.clientHeight;
        do {
            if (t > 1789569.6) {
                break;
            }
            s = t;
            i *= 10;
            l.style.height = `calc(${i}*${size})`;
            t = l.clientHeight;
        } while (t !== s * 10);
        l.remove();
        return t / i;
    } else {
        return -1;
    }
}

/**
 * Checks if a variable is defined and has a valid value
 * @param {*} v - The variable to check
 * @returns {boolean} True if variable is defined and valid
 */
export function isVariableDefined(v) {
    return v !== "undefined" && v !== "" && v !== null && v !== undefined && v !== NaN;
}

/**
 * Converts UTC timestamp to local date/time string
 * @param {string|number} utcTimestamp - UTC timestamp to convert
 * @returns {string} Localized date/time string
 */
export function convertUTCTimestampToLocalString(utcTimestamp) {
    return new Date(parseInt(utcTimestamp) + new Date().getTimezoneOffset() * 60000).toLocaleString();
}

/**
 * Generates a random float between two numbers
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random float between min and max
 */
export function randomFloatFromInterval(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Finds the index of a string within concatenated arrays
 * @param {Array<string>[]} arrays - Array of string arrays to search in
 * @param {string} searchString - String to search for
 * @returns {number} Index of the string, or -1 if not found
 */
export function findStringIndex(arrays, searchString) {
    let totalOffset = 0;

    // Loop through each sub-array
    for (let i = 0; i < arrays.length; i++) {
        const currentArray = arrays[i];
        const index = currentArray.indexOf(searchString);

        // If the string is found in the current array
        if (index !== -1) {
            return totalOffset + index;
        }

        // Update the offset by adding the length of the current array
        totalOffset += currentArray.length;
    }

    // Return -1 if the string is not found in any array
    return -1;
}

/**
 * Converts hex color to RGB array
 * @param {string} hex - Hex color string (e.g., "#FF0000")
 * @returns {number[]|null} Array of [r,g,b] values or null if invalid
 */
export function hexToRGB(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => {
        return r + r + g + g + b + b;
    });

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : null;
}

/**
 * Converts hex color to HSL array with optional lightness adjustment
 * @param {string} H - Hex color string
 * @param {number} lightness_percent - Lightness adjustment factor (default: 1)
 * @returns {number[]} Array of [hue, saturation, lightness] values
 */
export function hexToHSL(H, lightness_percent = 1) {
    // Convert hex to RGB first
    let r = 0,
        g = 0,
        b = 0;
    if (H.length == 4) {
        r = "0x" + H[1] + H[1];
        g = "0x" + H[2] + H[2];
        b = "0x" + H[3] + H[3];
    } else if (H.length == 7) {
        r = "0x" + H[1] + H[2];
        g = "0x" + H[3] + H[4];
        b = "0x" + H[5] + H[6];
    }
    // Then to HSL
    r /= 255;
    g /= 255;
    b /= 255;
    let cmin = Math.min(r, g, b),
        cmax = Math.max(r, g, b),
        delta = cmax - cmin,
        h = 0,
        s = 0,
        l = 0;

    if (delta == 0) h = 0;
    else if (cmax == r) h = ((g - b) / delta) % 6;
    else if (cmax == g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;

    h = Math.round(h * 60);

    if (h < 0) h += 360;

    l = (cmax + cmin) / 2;
    s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);

    l = Math.min(l * lightness_percent, 100).toFixed(1);

    // return "hsl(" + h + "," + s + "%," + l + "%)";
    return [h, s, l];
}

/**
 * Converts HSL values to hex color string
 * @param {number} h - Hue value (0-360)
 * @param {number} s - Saturation value (0-100)
 * @param {number} l - Lightness value (0-100)
 * @returns {string} Hex color string
 */
export function HSLToHex(h, s, l) {
    s /= 100;
    l /= 100;

    let c = (1 - Math.abs(2 * l - 1)) * s,
        x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
        m = l - c / 2,
        r = 0,
        g = 0,
        b = 0;

    if (0 <= h && h < 60) {
        r = c;
        g = x;
        b = 0;
    } else if (60 <= h && h < 120) {
        r = x;
        g = c;
        b = 0;
    } else if (120 <= h && h < 180) {
        r = 0;
        g = c;
        b = x;
    } else if (180 <= h && h < 240) {
        r = 0;
        g = x;
        b = c;
    } else if (240 <= h && h < 300) {
        r = x;
        g = 0;
        b = c;
    } else if (300 <= h && h < 360) {
        r = c;
        g = 0;
        b = x;
    }
    // Having obtained RGB, convert channels to hex
    r = Math.round((r + m) * 255).toString(16);
    g = Math.round((g + m) * 255).toString(16);
    b = Math.round((b + m) * 255).toString(16);

    // Prepend 0s, if necessary
    if (r.length == 1) r = "0" + r;
    if (g.length == 1) g = "0" + g;
    if (b.length == 1) b = "0" + b;

    return "#" + r + g + b;
}

/**
 * Shade, Blend and Convert a Web Color
 * Credit: https://github.com/PimpTrizkit/PJs/wiki/12.-Shade,-Blend-and-Convert-a-Web-Color-(pSBC.js)#stackoverflow-archive-begin
 * Version 4.1
 * @param {number} p - Amount to shade (-1 to 1)
 * @param {string} c0 - First color
 * @param {string} c1 - Second color (optional)
 * @param {boolean} l - Linear blend (optional)
 * @returns {string|null} Resulting color or null if invalid
 */
export const pSBC = (p, c0, c1, l) => {
    let r,
        g,
        b,
        P,
        f,
        t,
        h,
        m = Math.round,
        a = typeof c1 == "string";
    if (
        typeof p != "number" ||
        p < -1 ||
        p > 1 ||
        typeof c0 != "string" ||
        (c0[0] != "r" && c0[0] != "#") ||
        (c1 && !a)
    )
        return null;
    (h = c0.length > 9),
        (h = a ? (c1.length > 9 ? true : c1 == "c" ? !h : false) : h),
        (f = pSBC.pSBCr(c0)),
        (P = p < 0),
        (t = c1 && c1 != "c" ? pSBC.pSBCr(c1) : P ? { r: 0, g: 0, b: 0, a: -1 } : { r: 255, g: 255, b: 255, a: -1 }),
        (p = P ? p * -1 : p),
        (P = 1 - p);
    if (!f || !t) return null;
    if (l) (r = m(P * f.r + p * t.r)), (g = m(P * f.g + p * t.g)), (b = m(P * f.b + p * t.b));
    else
        (r = m((P * f.r ** 2 + p * t.r ** 2) ** 0.5)),
            (g = m((P * f.g ** 2 + p * t.g ** 2) ** 0.5)),
            (b = m((P * f.b ** 2 + p * t.b ** 2) ** 0.5));
    (a = f.a), (t = t.a), (f = a >= 0 || t >= 0), (a = f ? (a < 0 ? t : t < 0 ? a : a * P + t * p) : 0);
    if (h) return "rgb" + (f ? "a(" : "(") + r + "," + g + "," + b + (f ? "," + m(a * 1000) / 1000 : "") + ")";
    else
        return (
            "#" +
            (4294967296 + r * 16777216 + g * 65536 + b * 256 + (f ? m(a * 255) : 0))
                .toString(16)
                .slice(1, f ? undefined : -2)
        );
};

/**
 * Helper function for pSBC to parse color values
 * @param {string} d - Color string to parse
 * @returns {Object|null} Color object or null if invalid
 */
pSBC.pSBCr = (d) => {
    const i = parseInt;
    let n = d.length,
        x = {};
    if (n > 9) {
        const [r, g, b, a] = (d = d.split(","));
        n = d.length;
        if (n < 3 || n > 4) return null;
        (x.r = i(r[3] == "a" ? r.slice(5) : r.slice(4))), (x.g = i(g)), (x.b = i(b)), (x.a = a ? parseFloat(a) : -1);
    } else {
        if (n == 8 || n == 6 || n < 4) return null;
        if (n < 6) d = "#" + d[1] + d[1] + d[2] + d[2] + d[3] + d[3] + (n > 4 ? d[4] + d[4] : "");
        d = i(d.slice(1), 16);
        if (n == 9 || n == 5)
            (x.r = (d >> 24) & 255),
                (x.g = (d >> 16) & 255),
                (x.b = (d >> 8) & 255),
                (x.a = Math.round((d & 255) / 0.255) / 1000);
        else (x.r = d >> 16), (x.g = (d >> 8) & 255), (x.b = d & 255), (x.a = -1);
    }
    return x;
};

/**
 * Inverts a hex color with optional black/white mode and alpha
 * @param {string} hex - Hex color to invert
 * @param {boolean} bw - Black/white mode
 * @param {number} alpha - Alpha value (0-1)
 * @returns {string} Inverted hex color
 */
export function invertColor(hex, bw, alpha = 1) {
    if (hex.indexOf("#") === 0) {
        hex = hex.slice(1);
    }
    // convert 3-digit hex to 6-digits.
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (hex.length !== 6) {
        throw new Error("Invalid HEX color.");
    }
    let r = parseInt(hex.slice(0, 2), 16),
        g = parseInt(hex.slice(2, 4), 16),
        b = parseInt(hex.slice(4, 6), 16),
        a = "FF";
    if (bw) {
        // https://stackoverflow.com/a/3943023/112731
        return r * 0.299 + g * 0.587 + b * 0.114 > 186 ? "#000000" : "#FFFFFF";
    }
    // invert color components
    r = (255 - r).toString(16);
    g = (255 - g).toString(16);
    b = (255 - b).toString(16);

    // add transparency
    if (parseFloat(alpha) <= 1 && parseFloat(alpha) >= 0) {
        a = Math.round(Math.min(Math.max(parseFloat(alpha) || 1, 0), 1) * 255).toString(16);
    }

    // pad each with zeros and return
    return "#" + padZero(r) + padZero(g) + padZero(b) + padZero(a);
}

/**
 * Checks if an element is visible in the viewport
 * Credit: https://www.javascripttutorial.net/dom/css/check-if-an-element-is-visible-in-the-viewport/
 * @param {HTMLElement} el - Element to check
 * @returns {boolean} True if element is visible
 */
export function isInViewport(el) {
    try {
        const rect = el.getBoundingClientRect();

        // Get all child elements
        const children = el.querySelectorAll("*");
        let extendedRect = { top: rect.top, bottom: rect.bottom };

        // Extend the rect to account for margins of all child elements
        children.forEach((child) => {
            const childRect = child.getBoundingClientRect();
            const style = getComputedStyle(child);

            // Parse the computed margin values for the child
            const marginTop = parseFloat(style.marginTop) || 0;
            const marginBottom = parseFloat(style.marginBottom) || 0;

            // Extend the boundaries
            extendedRect.top = Math.min(extendedRect.top, childRect.top - marginTop);
            extendedRect.bottom = Math.max(extendedRect.bottom, childRect.bottom + marginBottom);
        });

        // Check if any part of the extended rect is in the viewport
        return (
            extendedRect.bottom >= 0 &&
            extendedRect.top <= (window.innerHeight || document.documentElement.clientHeight)
        );
    } catch (error) {
        return false;
    }
}

/**
 * Checks if an element is visible within a container's viewport
 * @param {HTMLElement} container - Container element
 * @param {HTMLElement} el - Element to check
 * @param {number} margin - Margin to consider (default: 0)
 * @returns {boolean} True if element is visible in container
 */
export function isInContainerViewport(container, el, margin = 0) {
    try {
        const containerRect = container.getBoundingClientRect();
        const rect = el.getBoundingClientRect();
        return rect.top >= containerRect.top + margin && rect.bottom <= containerRect.bottom - margin;
    } catch (error) {
        return false;
    }
}

/**
 * Creates an HTML element from a string
 * @param {string} htmlString - HTML string to convert
 * @returns {HTMLElement} Created element
 */
export function createElementFromHTML(htmlString) {
    const div = document.createElement("div");
    div.innerHTML = htmlString.trim();
    return div.firstElementChild;
}

/**
 * Pads a string with leading zeros
 * @param {string|number} str - String to pad
 * @param {number} len - Desired length (default: 2)
 * @returns {string} Padded string
 */
export function padZero(str, len) {
    len = len || 2;
    const zeros = new Array(len).join("0");
    return (zeros + str).slice(-len);
}

/**
 * Simulates a click event on an element
 * @param {HTMLElement} elem - Element to click
 * @returns {boolean} True if event was dispatched successfully
 */
export function simulateClick(elem) {
    const event = new MouseEvent("click", {
        view: window,
        bubbles: true,
        cancelable: true,
    });
    console.log("simulateClick");
    return elem.dispatchEvent(event);
}

/**
 * Checks if text ellipsis is active on a jQuery element
 * @param {jQuery} $jQueryObject - jQuery element to check
 * @returns {boolean} True if ellipsis is active
 */
export function isEllipsisActive($jQueryObject) {
    if (!$jQueryObject || !$jQueryObject.jquery) {
        console.warn("Invalid jQuery object provided to isEllipsisActive");
        return false;
    }
    const element = $jQueryObject[0];

    if (!element) return false;

    // Get the computed styles
    const computedStyle = window.getComputedStyle(element);
    const font = computedStyle.font || `${computedStyle.fontSize} ${computedStyle.fontFamily}`;

    // Create a canvas element to measure text width
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    context.font = font;

    // Measure the actual width of the text in pixels
    const text = element.textContent.trim();
    const textWidth = context.measureText(text).width;

    // Compare the text width with the element's visible width
    return textWidth > element.clientWidth;
}

/**
 * Converts a URL to a File object
 * @param {string} url - URL to convert
 * @param {string} filename - Desired filename
 * @returns {Promise<File>} File object
 * @throws {Error} If the file cannot be fetched from the URL
 */
export async function URLToFileObject(url, filename) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch the file from the URL: ${url}`);
    }
    const data = await response.blob();
    return new File([data], filename, { type: data.type });
}

/**
 * Calculates the similarity between two rectangles A (reference) and B (incoming)
 * based on area and aspect ratio.
 *
 * @param {Object} rectA - The reference rectangle with fixed dimensions.
 * @param {number} rectA.width - The width of rectangle A.
 * @param {number} rectA.height - The height of rectangle A.
 * @param {Object} rectB - The incoming rectangle to compare.
 * @param {number} rectB.width - The width of rectangle B.
 * @param {number} rectB.height - The height of rectangle B.
 * @returns {number} - A similarity score between 0 and 1 (1 means identical).
 */
export function calculateRectangleSimilarity(rectA, rectB) {
    // Calculate the area of both rectangles
    const areaA = rectA.width * rectA.height;
    const areaB = rectB.width * rectB.height;

    // Calculate the area similarity (1 means identical area)
    const areaSimilarity = 1 - Math.abs((areaB - areaA) / areaA);

    // // Calculate the aspect ratio of both rectangles
    // const aspectRatioA = rectA.width / rectA.height;
    // const aspectRatioB = rectB.width / rectB.height;

    // // Calculate the aspect ratio similarity (1 means identical ratio)
    // const aspectRatioSimilarity = 1 - Math.abs((aspectRatioB - aspectRatioA) / aspectRatioA);

    // // Combine the area and aspect ratio similarity with equal weighting
    // const similarityScore = 0.5 * areaSimilarity + 0.5 * aspectRatioSimilarity;

    const similarityScore = areaSimilarity;

    // Ensure the similarity score is within the range [0, 1]
    return Math.max(0, Math.min(1, similarityScore));
}

/**
 * Returns the element height including margins
 * @param {HTMLElement} element - Element to measure
 * @returns {number} Element height including margins
 */
export function outerHeight(element) {
    const height = element?.offsetHeight ?? 0;
    if (height === 0) return 0;

    const style = window.getComputedStyle(element) ?? null;
    if (style === null) return 0;

    return ["top", "bottom"]
        .map((side) => parseInt(style[`margin-${side}`]))
        .reduce((total, side) => total + side, height);
}

/**
 * Adds footnotes to the DOM
 * @param {Array<string>} footnotes - Array of footnote strings
 * @param {HTMLElement} footnoteContainer - Footnote container element
 */
export function addFootnotesToDOM(footnotes, footnoteContainer) {
    footnotes.forEach((footnote) => {
        const tempElement = document.createElement("div");
        tempElement.innerHTML = footnote;
        footnoteContainer.appendChild(tempElement.firstChild);
    });
}

/**
 * Triggers a custom event
 * @param {string} eventName - Event name
 * @param {Object} detail - Event detail
 * @param {boolean} bubbles - Whether to bubble the event
 * @param {boolean} cancelable - Whether the event is cancelable
 */
export function triggerCustomEvent(eventName, detail = {}, bubbles = true, cancelable = true) {
    const event = new CustomEvent(eventName, {
        detail,
        bubbles,
        cancelable,
    });

    document.dispatchEvent(event);
}
