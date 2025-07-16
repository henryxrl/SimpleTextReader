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
 * - Custom event trigger
 * - SVG manipulation
 *
 * @module client/app/utils/base
 * @requires client/app/config/constants
 */

import * as CONFIG_CONST from "../config/constants.js";

/**
 * Removes the hashbang (#!) from the current URL using the History API.
 * @public
 * @throws {Error} If History API is not supported by the browser
 * @see {@link https://developer.mozilla.org/docs/Web/API/History/pushState}
 */
export function removeHashbang() {
    const currentPath = window.location.pathname;
    if (window.location.hash) {
        history.pushState("", document.title, currentPath);
    }
}

/**
 * Removes file extension from a filename
 * @public
 * @param {string} filename - The filename to process
 * @returns {string} Filename without extension
 */
export function removeFileExtension(filename) {
    return filename.replace(CONFIG_CONST.CONST_FILE.EXT_REGEX, "");
}

/**
 * Formats byte size to human readable format using SI or IEC units
 * @public
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
 * @public
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
 * @public
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
 * @public
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
 * @public
 * @param {*} v - The variable to check
 * @returns {boolean} True if variable is defined and valid
 */
export function isVariableDefined(v) {
    return v !== "undefined" && v !== "" && v !== null && v !== undefined && v !== NaN;
}

/**
 * Converts UTC timestamp to local date/time string
 * @public
 * @param {string|number} utcTimestamp - UTC timestamp to convert
 * @returns {string} Localized date/time string
 */
export function convertUTCTimestampToLocalString(utcTimestamp) {
    return new Date(parseInt(utcTimestamp) + new Date().getTimezoneOffset() * 60000).toLocaleString();
}

/**
 * Generates a random float between two numbers
 * @public
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random float between min and max
 */
export function randomFloatFromInterval(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Finds the index of a string within concatenated arrays
 * @public
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
 * @public
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
 * @public
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
 * @public
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
 * @public
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
 * @private
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
 * @public
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
 * @public
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
 * @public
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
 * @public
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
 * @public
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
 * @public
 * @param {HTMLElement} elem - Element to click
 * @returns {boolean} True if event was dispatched successfully
 */
export function simulateClick(elem) {
    const e = new MouseEvent("click", {
        view: window,
        bubbles: true,
        cancelable: true,
    });
    console.log("simulateClick");
    return elem.dispatchEvent(e);
}

/**
 * Checks if text ellipsis is active on an element
 * @public
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} True if ellipsis is active
 */
export function isEllipsisActive(element) {
    if (!(element instanceof HTMLElement)) {
        console.warn("Invalid element provided to isEllipsisActive");
        return false;
    }

    // Check if element has footnote indicator
    function getFootnoteIndicator(el) {
        const footnote = el.querySelector('a[rel="footnote"]');
        return {
            has: !!footnote,
            node: footnote,
        };
    }
    let footnoteWidth = 0;
    const hasFootnote = getFootnoteIndicator(element);
    if (hasFootnote.has) {
        footnoteWidth = hasFootnote.node.getBoundingClientRect().width;
    }

    // Get the computed styles
    const computedStyle = window.getComputedStyle(element);
    const font = computedStyle.font || `${computedStyle.fontSize} ${computedStyle.fontFamily}`;

    // Create a canvas element to measure text width
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    context.font = font;

    // Measure the actual width of the text in pixels
    const text = element.textContent.trim();
    const textWidth = context.measureText(text).width + footnoteWidth;

    // Compare the text width with the element's visible width
    // return textWidth > element.clientWidth;
    return textWidth > element.getBoundingClientRect().width;
}

/**
 * Calculates the similarity between two rectangles A (reference) and B (incoming)
 * based on area and aspect ratio.
 * @public
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
 * @public
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
 * Adds footnotes to the DOM (for { [markerCode]: { [order]: {content, ...} } } structure).
 * @public
 * @param {Object} footnotesObj - The nested footnotes object.
 * @param {HTMLElement} footnoteContainer - Footnote container element
 * @note Calling this function will create a visible list of all footnotes in the DOM.
 *       While this approach works, it is not optimal for documents with many footnotes,
 *       as it can add a large number of DOM elements and impact performance.
 *       For better scalability and performance, use the Footnotes popup system with
 *       setFootnoteLookup() to display footnotes dynamically as needed.
 */
export function addFootnotesToDOM(footnotesObj, footnoteContainer) {
    footnoteContainer.innerHTML = "";

    // Gather entries in markerCode, then order order.
    const entries = [];
    for (const markerCode of Object.keys(footnotesObj).sort((a, b) => Number(a) - Number(b))) {
        const ordersObj = footnotesObj[markerCode];
        for (const order of Object.keys(ordersObj).sort((a, b) => Number(a) - Number(b))) {
            const footnote = ordersObj[order];
            // Compose footnote HTML string with correct id (same as anchor href)
            entries.push({
                html: `<li id="fn-${markerCode}-${order}">${footnote.content}</li>`,
                markerCode,
                order,
            });
        }
    }

    // Create an ordered list for display (optional; or use a custom wrapper)
    const ol = document.createElement("ol");
    entries.forEach(({ html }) => {
        const tempElement = document.createElement("div");
        tempElement.innerHTML = html;
        ol.appendChild(tempElement.firstChild);
    });

    footnoteContainer.appendChild(ol);
}

/**
 * Pairs anchors and footnotes from a unified timeline.
 * @param {Array} timeline - Array of events (anchors and footnotes) in chronological order.
 * @returns {Object} pairedFootnotes: { [markerCode]: [footnote or notfound HTML] }
 */
export function pairAnchorsAndFootnotes(timeline) {
    const pairedFootnotes = {};
    const anchorQueue = [];
    let lastType = null;

    // Check timeline
    if (!Array.isArray(timeline)) {
        // console.warn("Invalid timeline provided to pairAnchorsAndFootnotes");
        return pairedFootnotes;
    }

    // Pair anchors and footnotes
    timeline.forEach((item) => {
        if (item.type === CONFIG_CONST.CONST_FOOTNOTE.TYPES.ANCHOR) {
            if (lastType === CONFIG_CONST.CONST_FOOTNOTE.TYPES.FOOTNOTE) {
                // Flush excessive anchors from previous group
                anchorQueue.forEach((a) => {
                    if (!pairedFootnotes[a.markerCode]) pairedFootnotes[a.markerCode] = [];
                    pairedFootnotes[a.markerCode][a.index] = CONFIG_CONST.CONST_FOOTNOTE.NOTFOUND;
                });
                anchorQueue.length = 0;
            }
            anchorQueue.push(item);
            lastType = CONFIG_CONST.CONST_FOOTNOTE.TYPES.ANCHOR;
        } else if (item.type === CONFIG_CONST.CONST_FOOTNOTE.TYPES.FOOTNOTE) {
            const idx = anchorQueue.findIndex((a) => a.markerCode === item.markerCode);
            if (idx !== -1) {
                const anchor = anchorQueue.splice(idx, 1)[0];
                if (!pairedFootnotes[item.markerCode]) pairedFootnotes[item.markerCode] = [];
                pairedFootnotes[item.markerCode][anchor.index] = item.content;
            } else {
                // Unpaired footnote, handle if needed
            }
            lastType = CONFIG_CONST.CONST_FOOTNOTE.TYPES.FOOTNOTE;
        }
    });

    // Final flush: leftover anchors after all events
    if (anchorQueue.length > 0) {
        anchorQueue.forEach((a) => {
            if (!pairedFootnotes[a.markerCode]) pairedFootnotes[a.markerCode] = [];
            pairedFootnotes[a.markerCode][a.index] = CONFIG_CONST.CONST_FOOTNOTE.NOTFOUND;
        });
    }

    return pairedFootnotes;
}

/**
 * Triggers a custom event
 * @public
 * @param {string} eventName - Event name
 * @param {Object} detail - Event detail
 * @param {boolean} bubbles - Whether to bubble the event
 * @param {boolean} cancelable - Whether the event is cancelable
 */
export function triggerCustomEvent(eventName, detail = {}, bubbles = true, cancelable = true) {
    const e = new CustomEvent(eventName, {
        detail,
        bubbles,
        cancelable,
    });
    document.dispatchEvent(e);
}

/**
 * Dynamically sets the stroke-dasharray and stroke-dashoffset for SVG paths for animation
 * @public
 * @param {HTMLElement} container - Container element
 */
export function setSvgPathLength(container) {
    const paths = container.querySelectorAll("svg .tofill");
    paths.forEach((path) => {
        const len = path.getTotalLength() + 1;
        path.style.setProperty("--ui_svgPathLength", len);
    });
}

/**
 * Constructs a notification message from an array of items.
 * @public
 * @param {string} baseText - The base notification text.
 * @param {Array<string>} itemList - The list of items to include in the message.
 * @param {Object} [options={}] - Additional options.
 * @param {string} [options.language="zh"] - The language of the notification ("en" or "zh").
 * @param {number} [options.maxItems=3] - The maximum number of items to display.
 * @param {string} [options.messageSuffix=""] - The suffix for additional items (e.g., "more files").
 * @returns {string} - The constructed notification message.
 */
export function constructNotificationMessageFromArray(baseText, itemList, options = {}) {
    if (itemList.length === 0) {
        return "";
    }

    const language = options.language ?? "zh";
    const maxItems = options.maxItems ?? 3;
    const messageSuffix = options.messageSuffix ?? "";

    const isEnglish = language === "en";
    const baseTextSuffix = isEnglish ? (itemList.length > 1 ? "s: " : ": ") : "：";
    const suffixMore =
        itemList.length > maxItems
            ? (isEnglish ? ` ${messageSuffix}` : messageSuffix).replace("xxx", itemList.length - maxItems)
            : "";
    const itemNames = itemList
        .slice(0, maxItems)
        .map((item) => (isEnglish ? `"${truncateText(item)}"` : `“${truncateText(item)}”`))
        .join(",\n");
    const moreItems = itemList.length > maxItems ? `,\n...${suffixMore}` : "";

    return `${baseText}${baseTextSuffix}\n${itemNames}${moreItems}`;
}

/**
 * Fetches JSON data from a URL
 * @private
 * @async
 * @param {string} url - The URL of the JSON file to fetch
 * @param {Object} [options={}] - Additional options
 * @param {Function} [options.transform] - Function to transform the fetched data
 * @param {*} [options.defaultValue] - Default value to return if the fetch fails
 * @param {string} [options.errorPrefix="Error fetching data"] - Error prefix for console logs
 * @returns {Promise<*>} A promise that resolves to the fetched data, or the default value if the fetch fails
 */
async function fetchJSON(
    url,
    { transform = (data) => data, defaultValue = null, errorPrefix = "Error fetching data" } = {}
) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return transform(data);
    } catch (error) {
        console.error(`${errorPrefix}:`, error);
        return defaultValue;
    }
}

/**
 * Fetches the version number from a JSON file.
 * @public
 * @async
 * @param {string} url - The URL of the JSON file containing the version.
 * @returns {Promise<string>} A promise that resolves to the version number, or an empty string if not found.
 */
export async function fetchVersion(url = "version.json") {
    return fetchJSON(url, {
        transform: (data) => (data?.version ? `v${data?.version}` : ""),
        defaultValue: "",
        errorPrefix: "Error fetching version",
    });
}

/**
 * Fetches the complete version data from a JSON file.
 * @public
 * @async
 * @param {string} url - The URL of the JSON file containing the version data.
 * @returns {Promise<Object>} A promise that resolves to the version data object, or null if not found.
 */
export async function fetchVersionData(url = "version.json") {
    return fetchJSON(url, {
        transform: (data) => data ?? null,
        defaultValue: null,
        errorPrefix: "Error fetching version data",
    });
}

/**
 * Fetches the help text from a JSON file.
 * @public
 * @async
 * @param {string} url - The URL of the JSON file containing the help text.
 * @returns {Promise<Object>} A promise that resolves to the help text object, or null if not found.
 */
export async function fetchHelpText(url = "help.json") {
    return fetchJSON(url, {
        transform: (data) => data ?? null,
        defaultValue: null,
        errorPrefix: "Error fetching help text",
    });
}

/**
 * Fetches the font baseline offsets from a JSON file.
 * @public
 * @async
 * @param {string} url - The URL of the JSON file containing the font baseline offsets.
 * @returns {Promise<Object>} A promise that resolves to the font baseline offsets object, or null if not found.
 */
export async function fetchFontBaselineOffsets(url = "font_baseline_offsets.json") {
    return fetchJSON(url, {
        transform: (data) => data ?? null,
        defaultValue: null,
        errorPrefix: "Error fetching font baseline offsets",
    });
}

/**
 * Gets the canvas element associated with the current book
 * @public
 * @param {string} bookName - The name of the book
 * @returns {HTMLCanvasElement|null}
 */
export function getBookCoverCanvas(bookName) {
    const bookElement = document.querySelector(`.book[data-filename="${bookName}"]`);
    return bookElement?.querySelector(".cover-canvas");
}

/**
 * Compares two dates
 * @public
 * @param {string} dateString1 - The first date string
 * @param {string} dateString2 - The second date string
 * @returns {boolean} true if dateString1 is later, false if dateString1 is earlier, null if both dates are invalid
 */
export function compareDates(dateString1, dateString2) {
    // Convert strings to Date objects
    const date1 = new Date(dateString1);
    const date2 = new Date(dateString2);

    const isValidDate1 = !isNaN(date1);
    const isValidDate2 = !isNaN(date2);

    // Handle invalid dates
    if (!isValidDate1 && !isValidDate2) {
        return null; // Both are invalid
    }
    if (isValidDate1 && !isValidDate2) {
        return true; // date1 is larger because date2 is invalid
    }
    if (!isValidDate1 && isValidDate2) {
        return false; // date2 is larger because date1 is invalid
    }

    // Compare valid dates
    return date1 > date2;
}

/**
 * Converts a value to a boolean
 * @public
 * @param {*} val - The value to convert
 * @param {boolean} [forceConvert=true] - Whether to force conversion
 * @returns {boolean} The converted boolean value
 */
export function toBool(val, forceConvert = true) {
    if (typeof val === "boolean") return val;
    if (typeof val === "string") {
        const str = val.trim().toLowerCase();
        if (str === "true") return true;
        if (str === "false") return false;
    }
    return forceConvert ? Boolean(val) : val;
}

/**
 * Enables scrolling on the document
 * @public
 */
export function enableScroll() {
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
    document.body.style.overscrollBehavior = "";
    document.documentElement.style.overscrollBehavior = "";
}

/**
 * Disables scrolling on the document
 * @public
 */
export function disableScroll() {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overscrollBehavior = "none";
}

/**
 * Checks if an element is within a specified container or an array of containers
 * @public
 * @param {Element} element - The element to check
 * @param {Element|Element[]|HTMLCollection|(Element|HTMLCollection)[]} containers - The container or an array of containers
 * @returns {boolean} true if the element is within the container, false otherwise
 */
export function isElementInContainer(element, containers) {
    // Prevent errors if element is null/undefined
    if (!element) return false;

    // Convert input to a flat array, filtering out invalid values
    const flatContainers = []
        .concat(containers || [])
        .flatMap((container) => (container instanceof HTMLCollection ? Array.from(container) : container))
        .filter(Boolean);

    // Check if the element is inside any of the containers
    return flatContainers.some((container) =>
        container && typeof container.contains === "function"
            ? element === container || container.contains(element)
            : false
    );
}

/**
 * Kills inertia scrolling
 * @private
 * @param {number} [duration=100] - The duration to keep the document body from scrolling
 */
function killInertiaScrolling(duration = 100) {
    document.body.style.overflow = "hidden";
    clearTimeout(window.scrollResetTimer);
    window.scrollResetTimer = setTimeout(() => {
        // Re-enable scrolling after a short delay
        document.body.style.overflow = "";
    }, duration);
}

/**
 * Handles global wheel events, preventing scroll on all elements except the element
 * @public
 * @param {WheelEvent} e - The wheel event
 * @param {Element} element - The element to check
 * @param {number} [duration=100] - The duration to keep the document body from scrolling
 */
export function handleGlobalWheel(e, element, duration = 100) {
    if (element && !isElementInContainer(e.target, element)) {
        e.preventDefault();
        e.stopPropagation();
        killInertiaScrolling(duration);
    }
}

/**
 * Shows a Unicode clock on the dropzone text
 * @public
 * @param {number} [quarter=1] - The quarter of the clock to show
 */
export function showUnicodeClock(quarter = 1) {
    const sanitizedQuarter = quarter % 4;
    console.log("showUnicodeClock", quarter);
    const dropzoneText = document.getElementById("dropzone-text");
    dropzoneText.classList.remove(
        "dropzone-text-loading-text",
        "dropzone-text-loading-text-1",
        "dropzone-text-loading-text-2",
        "dropzone-text-loading-text-3",
        "dropzone-text-loading-text-4"
    );
    dropzoneText.classList.add(`dropzone-text-loading-text-${sanitizedQuarter}`);
}

/**
 * Debounces a function
 * @public
 * @param {Function} func - The function to debounce
 * @param {number} wait - The wait time in milliseconds
 * @returns {Function} The debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const context = this;
        const later = () => {
            clearTimeout(timeout);
            func.apply(context, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Creates a stylesheet element
 * @public
 * @param {string} href - The href of the stylesheet
 * @returns {HTMLLinkElement} The created stylesheet element, or the existing stylesheet element if it already exists
 */
export function createStylesheet(href) {
    // Check if the stylesheet already exists, if so, return it
    const fileName = href.split("/").pop();
    const existingStylesheet = getStylesheet(fileName);
    if (existingStylesheet) {
        return existingStylesheet;
    }

    // Create the stylesheet element
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
    return link;
}

/**
 * Retrieves the stylesheet object for a given name
 * @param {string} name - The name of the stylesheet to retrieve
 * @returns {CSSStyleSheet | null} The stylesheet object, or null if not found.
 */
export function getStylesheet(name = "variables.css") {
    for (const sheet of document.styleSheets) {
        try {
            if (sheet.href && sheet.href.includes(name)) {
                return sheet;
            }
        } catch (e) {
            console.warn("Cannot access stylesheet:", sheet.href, e);
        }
    }
    return null;
}

/**
 * Polyfill for requestIdleCallback because Safari does not support it
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback
 */
export function requestIdleCallbackPolyfill() {
    if (typeof window.requestIdleCallback === "undefined") {
        window.requestIdleCallback = function (cb) {
            const start = Date.now();
            return setTimeout(() => {
                cb({
                    didTimeout: false,
                    timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
                });
            }, 1);
        };

        window.cancelIdleCallback = function (id) {
            clearTimeout(id);
        };
    }
}

/**
 * Adds a callback to be executed when the DOM is ready
 * @public
 * @param {Function} callback - The callback to execute
 */
export function onReady(callback) {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", callback);
    } else {
        callback(); // Already loaded, just run it
    }
}

/**
 * Gets the scroll position of the book content
 * @public
 * @returns {number} The scroll position of the book content
 */
export function getScrollY() {
    if (typeof window.scrollY === "number") {
        return window.scrollY || document.documentElement.scrollTop;
    } else if (typeof window.__scrollY__ === "function") {
        return window.__scrollY__();
    } else {
        return document.documentElement.scrollTop || 0;
    }
}

/**
 * Converts a snake_case string to camelCase.
 *
 * @param {string} str - The snake_case input string.
 * @returns {string} The converted camelCase string.
 *
 * @example
 *   snakeToCamel("pagination_bottom"); // returns "paginationBottom"
 *   snakeToCamel("some_long_snake_case"); // returns "someLongSnakeCase"
 */
export function snakeToCamel(str) {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Sets a deeply nested property on an object, given a dot/bracket notation path.
 *
 * @param {Object} obj - The object to set the property on.
 * @param {string|string[]} path - The path to the property (dot/bracket notation or array of keys).
 * @param {*} value - The value to set.
 * @returns {boolean} True if set successfully, false if failed.
 *
 * @example
 * setDeep(CONFIG, 'CONST_CONFIG.SHOW_FILTER_BAR', true);
 * setDeep(CONFIG, ['CONST_CONFIG', 'SHOW_FILTER_BAR'], true);
 * setDeep(window, 'foo.bar[2].baz', 123);
 */
export function setDeep(obj, path, value) {
    if (typeof path === "string") {
        // Split dot/bracket notation into keys, e.g. a.b[1].c => ['a','b','1','c']
        path = path
            .replace(/\[(\w+)\]/g, ".$1") // convert [key] to .key
            .replace(/^\./, "") // remove leading dot
            .split(".");
    }
    if (!Array.isArray(path)) return false;
    let cur = obj;
    for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        // If prop doesn't exist or isn't an object, create plain object
        if (!(key in cur) || (typeof cur[key] !== "object" && typeof cur[key] !== "function")) {
            cur[key] = {};
        }
        cur = cur[key];
    }
    cur[path[path.length - 1]] = value;
    return true;
}

/**
 * Checks if the browser is Safari
 * @public
 * @returns {boolean} True if the browser is Safari, false otherwise
 */
export function isSafari() {
    const ua = navigator.userAgent;
    const isSafari = /^((?!chrome|chromium|android).)*safari/i.test(ua);
    return isSafari;
}

/**
 * Checks if the browser is Firefox-based
 * @public
 * @returns {boolean} True if the browser is Firefox-based, false otherwise
 */
export function isFirefoxBased() {
    const ua = navigator.userAgent.toLowerCase();
    return ua.includes("firefox") && !ua.includes("seamonkey");
}

/**
 * Detects if the current environment is Windows.
 * Supports both Node.js and browser environments.
 * @returns {boolean} True if running on Windows, false otherwise.
 */
export function isWindows() {
    // Node.js
    if (typeof process !== "undefined" && process.platform) {
        return process.platform === "win32";
    }
    // Browser
    if (typeof navigator !== "undefined") {
        return /Win/.test(navigator.platform) || /Windows/.test(navigator.userAgent);
    }
    // Fallback (unknown environment)
    return false;
}

/**
 * Detects if the current environment is macOS.
 * Supports both Node.js and browser environments.
 * @returns {boolean} True if running on macOS, false otherwise.
 */
export function isMac() {
    // Node.js
    if (typeof process !== "undefined" && process.platform) {
        return process.platform === "darwin";
    }
    // Browser
    if (typeof navigator !== "undefined") {
        return /Mac/.test(navigator.platform) || /Mac OS X/.test(navigator.userAgent);
    }
    // Fallback (unknown environment)
    return false;
}

/**
 * Computes the vertical and horizontal offsets for font alignment based on baseline offsets.
 * @param {string} fontName - The CSS font-family name (should match the key in baselineOffsets).
 * @param {number|string|HTMLElement|Array<number|string|HTMLElement>} fontSizeOrElement - Font size as a number, CSS string (e.g., "18px"), or HTMLElement to extract from, or an array of these.
 * @param {Object} baselineOffsets - Mapping: { fontFamily: normalizedOffset }.
 * @returns {Object|Array<Object>} Object with { fontSizeValue, fontSizeUnit, baselineOffset, verticalOffset, horizontalOffset } or an array of these.
 *    - fontSizeValue: Numeric font size.
 *    - fontSizeUnit: Unit (e.g., "px").
 *    - baselineVerticalOffset: Normalized vertical baseline offset (usually per 1 fontSize).
 *    - baselineHorizontalOffset: Normalized horizontal baseline offset (usually per 1 fontSize).
 *    - verticalOffset: The actual pixel vertical offset to apply (baselineVerticalOffset * fontSizeValue), or 0 if not found.
 *    - horizontalOffset: The actual pixel horizontal offset to apply (baselineHorizontalOffset * fontSizeValue), or 0 if not found.
 */
export function getFontOffsets(fontName, fontSizeOrElement, baselineOffsets) {
    // Helper for one item
    function calcOne(fsOrEl) {
        let fontSizeValue = 0;
        let fontSizeUnit = "px";
        // Clean font name: trim and remove quotes if present
        const key = (fontName || "").trim().replace(/^['"]|['"]$/g, "");

        // 1. Parse font size from number, string, or HTMLElement
        if (typeof fsOrEl === "number") {
            fontSizeValue = fsOrEl;
        } else if (typeof fsOrEl === "string") {
            const match = fsOrEl.match(/^([\d.]+)([a-z%]+)$/i);
            if (match) {
                fontSizeValue = parseFloat(match[1]);
                fontSizeUnit = match[2];
            }
        } else if (fsOrEl instanceof HTMLElement) {
            const fontSize = getComputedStyle(fsOrEl).getPropertyValue("font-size");
            const match = fontSize.match(/^([\d.]+)([a-z%]+)$/i);
            if (match) {
                fontSizeValue = parseFloat(match[1]);
                fontSizeUnit = match[2];
            }
        }

        // 1.5. Convert em to px
        if (fontSizeUnit === "em") {
            fontSizeValue = getSizePrecise(`${fontSizeValue}${fontSizeUnit}`);
            fontSizeUnit = "px";
        }

        // 2. Find offset
        const baselineOffset = baselineOffsets?.[key] ?? { vertical: 0, horizontal: 0 };
        const baselineVerticalOffset = baselineOffset.vertical;
        const baselineHorizontalOffset = baselineOffset.horizontal;

        // 3. Compute actual pixel offset
        let verticalOffset =
            isFinite(baselineVerticalOffset) && isFinite(fontSizeValue) ? baselineVerticalOffset * fontSizeValue : 0;
        let horizontalOffset =
            isFinite(baselineHorizontalOffset) && isFinite(fontSizeValue)
                ? baselineHorizontalOffset * fontSizeValue
                : 0;

        // console.log(fontSizeValue, fontSizeUnit, baselineOffset, verticalOffset);
        let result = {
            fontSizeValue,
            fontSizeUnit,
            baselineVerticalOffset,
            baselineHorizontalOffset,
            verticalOffset,
            horizontalOffset,
        };

        // Only adjust horizontal offset in Firefox or not on Mac
        if (!isMac() || isFirefoxBased()) {
            result.verticalOffset = 0;
        }

        return result;
    }

    // If input is an array, map over it
    if (Array.isArray(fontSizeOrElement)) {
        return fontSizeOrElement.map(calcOne);
    }
    // If input is an object, map over it
    if (typeof fontSizeOrElement === "object") {
        return Object.fromEntries(Object.entries(fontSizeOrElement).map(([key, value]) => [key, calcOne(value)]));
    }
    // Otherwise, single value
    return calcOne(fontSizeOrElement);
}

/**
 * Truncates a text to a maximum length
 * @param {string} text - The text to truncate
 * @param {number} maxLength - The maximum length of the text
 * @returns {string} The truncated text
 */
export function truncateText(text, maxLength = 50) {
    // Check if maxLength is a positive integer
    if (typeof maxLength !== "number" || maxLength <= 0) {
        maxLength = 100;
    }
    // Check if text is a string
    if (typeof text !== "string") {
        return "";
    }
    // Check if text is empty
    if (!text) return "";
    // Check if text is longer than maxLength
    if (text.length > maxLength) {
        return text.slice(0, maxLength) + "...";
    }
    return text;
}
