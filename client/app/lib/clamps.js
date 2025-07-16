/**
 * @fileoverview
 * ClampJS: A modern singleton ES6 class for multi-line text truncation (line clamp) with ellipsis, as a polyfill for CSS -webkit-line-clamp.
 *
 * - Uses native -webkit-line-clamp if available, falls back to JavaScript implementation if not.
 * - Designed as a singleton to avoid global namespace pollution.
 * - Uses ES6 private fields/methods for encapsulation.
 *
 * Usage:
 *   import { getClamps } from './clampjs.js';
 *   const clamp = getClamps();
 *   if (!clamp.supportsNativeClamp()) {
 *       clamp.clamp(document.querySelectorAll('.cover-text'));
 *   }
 *
 * @Package: Clamps
 * @Url: https://github.com/laurenashpole/clamps
 * @Author: Lauren Ashpole
 * @Email: lauren@laurenashpole.com
 * @Date: 2019-02-27
 * @License: MIT
 * @Modified: Converted to ES Module and optimized by Henry Xu
 *
 * @module client/app/lib/clamps
 */

/**
 * Clamps class for multi-line text truncation with ellipsis.
 * @class
 * @classdesc Handles text truncation with ellipsis, using native -webkit-line-clamp if available, otherwise falling back to JavaScript implementation.
 * @requires window.getComputedStyle
 */
class Clamps {
    /** @type {boolean} Whether to enable debug mode. */
    #DEBUG = false;

    /** @type {boolean} Whether native -webkit-line-clamp is supported. */
    #supportsNativeClamp;

    /** @type {string} Ellipsis to use (default: …). */
    #ellipsis = "\u2026";

    /** @type {Clamps} The singleton instance. */
    static #instance = null;

    /**
     * Constructor (private - use getInstance).
     * @throws {Error} If called directly (use getInstance).
     */
    constructor() {
        if (Clamps.#instance) {
            throw new Error("Use getClamps()");
        }
        // Set up support flag for native clamp.
        this.#supportsNativeClamp = this.#checkNativeSupport();
    }

    /**
     * Get the singleton instance of Clamps.
     * @returns {Clamps} The singleton instance.
     */
    static getInstance() {
        if (!Clamps.#instance) {
            Clamps.#instance = new Clamps();
        }
        return Clamps.#instance;
    }

    /**
     * Detects native -webkit-line-clamp support.
     * @returns {boolean} True if native support is present, false otherwise.
     * @private
     */
    #checkNativeSupport() {
        if (this.#DEBUG) return false;
        if (typeof window === "undefined" || !window.getComputedStyle) return false;
        const div = document.createElement("div");
        return "webkitLineClamp" in div.style || "lineClamp" in div.style || "-webkit-line-clamp" in div.style;
    }

    /**
     * Public method to check if native line-clamp is supported.
     * @returns {boolean}
     * @public
     */
    supportsNativeClamp() {
        return this.#supportsNativeClamp;
    }

    /**
     * Truncates text for each element to fit max-height with ellipsis, if native line-clamp is unsupported.
     * @param {HTMLElement|HTMLElement[]} elements - Element(s) to clamp.
     * @public
     */
    clamp(elements) {
        if (this.#supportsNativeClamp) return;
        if (elements instanceof HTMLElement) elements = [elements];
        if (!elements || (Array.isArray(elements) && elements.length === 0)) return;
        for (const el of elements) {
            if (el instanceof HTMLElement) this.#clampLine(el);
        }
    }

    /**
     * Truncate single element's text to fit max-height with ellipsis.
     * @param {HTMLElement} el
     * @private
     */
    #clampLine(el) {
        const maxHeight = this.#getMaxHeight(el);
        const textNode = this.#getTextNode(el);
        if (maxHeight === textNode.clientHeight) return;
        for (let i = textNode.childNodes.length - 1; i >= 0; i--) {
            const node = textNode.childNodes[i];
            if (node && (node.nodeType === 1 || node.nodeType === 3)) {
                const bestLen = this.#findBestTruncationBinarySearch(textNode, node, maxHeight);
                // const bestLen = this.#findBestTruncationLinear(textNode, node, maxHeight);
                this.#applyEllipsis(node, node.textContent, bestLen);
            }
        }
    }

    /**
     * Finds the maximal prefix length of `text` that, when set as node's textContent + ellipsis, does not exceed maxHeight.
     * Uses binary search for performance.
     * @param {HTMLElement} measureBox - The container used for measurement (height is checked on this).
     * @param {HTMLElement} node - The text node (should be in DOM).
     * @param {number} maxHeight - The max allowed height in px.
     * @returns {number} The maximal substring length (can be 0).
     */
    #findBestTruncationBinarySearch(measureBox, node, maxHeight) {
        const text = node.textContent || "";
        let low = 0,
            high = text.length,
            bestFit = 0;
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            this.#applyEllipsis(node, text, mid);
            if (measureBox.clientHeight > maxHeight) {
                high = mid - 1;
            } else {
                bestFit = mid;
                low = mid + 1;
            }
        }
        return bestFit;
    }

    /**
     * Finds the maximal prefix length of `text` that, when set as node's textContent + ellipsis, does not exceed maxHeight.
     * @param {HTMLElement} measureBox - The container used for measurement (height is checked on this).
     * @param {HTMLElement} node - The text node (should be in DOM).
     * @param {number} maxHeight - The max allowed height in px.
     * @returns {number} The maximal substring length (can be 0).
     */
    #findBestTruncationLinear(measureBox, node, maxHeight) {
        const text = node.textContent || "";
        let bestFit = text.length;
        while (measureBox.clientHeight > maxHeight && bestFit > 1) {
            this.#applyEllipsis(node, text, --bestFit);
        }
        return bestFit;
    }

    /**
     * Applies ellipsis to the text node.
     * @param {HTMLElement} node - The text node (should be in DOM).
     * @param {string} text - The full text to clamp.
     * @param {number} bestFit - The maximal substring length (can be 0).
     */
    #applyEllipsis(node, text, bestFit) {
        if (bestFit >= text.length) {
            node.textContent = text;
        } else {
            node.textContent = text.substring(0, bestFit) + this.#ellipsis;
        }
    }

    /**
     * Moves all child nodes into a wrapper div (for measurement and truncation).
     * @param {HTMLElement} el
     * @returns {HTMLDivElement} Wrapper div with content.
     * @private
     */
    #getTextNode(el) {
        const wrapper = document.createElement("div");
        while (el.firstChild) wrapper.appendChild(el.firstChild);
        el.appendChild(wrapper);
        return wrapper;
    }

    /**
     * Returns the max height (in px) to clamp to.
     * @param {HTMLElement} el
     * @returns {number}
     * @private
     */
    #getMaxHeight(el) {
        const style = window.getComputedStyle(el);
        return style["max-height"] === "none"
            ? Math.ceil(parseFloat(style.height))
            : Math.ceil(parseFloat(style["max-height"]));
    }
}

/**
 * Get the singleton instance of Clamps.
 * @returns {Clamps} The singleton instance.
 */
export function getClamps() {
    return Clamps.getInstance();
}
