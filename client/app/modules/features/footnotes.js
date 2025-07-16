/**
 * @fileoverview Footnotes handling module
 *
 * Original code by Lukas Mathis (http://ignorethecode.net/blog/2010/04/20/footnotes/)
 * Modified by Matt Gemmell (http://mattgemmell.com/)
 * Modernized refactored version
 *
 * @module client/app/modules/features/footnotes
 * @requires client/app/config/index.js
 * @requires shared/core/callback/callback-registry.js
 */

import * as CONFIG from "../../config/index.js";
import { cbReg } from "../../../../shared/core/callback/callback-registry.js";

/**
 * Footnotes class for handling the display, positioning, and interaction of footnotes on a page
 * @private
 * @class
 */
class Footnotes {
    static #instance = null;

    /**
     * Creates a new Footnotes instance if none exists
     * @constructor
     * @public
     * @throws {Error} When attempting to create multiple instances
     */
    constructor() {
        if (Footnotes.#instance) {
            throw new Error("Use getFootnotes()");
        }

        // Footnote image class name
        this.FOOTNOTE_IMG_CLASS = ".footnote_img";

        // Footnote div id
        this.FOOTNOTE_DIV_ID = "#footnotediv";

        // Timer for delaying the hiding of footnotes
        this.timeout = null;
        this.footnoteTimeout = 1000;

        // Layout constants
        this.EXCEED_RIGHT = false; // Whether the footnote div exceeds the right boundary
        this.EXCEED_BOTTOM = false; // Whether the footnote div exceeds the bottom boundary
        this.MARGINS = 20; // Total margin value
        this.PADDING_TB = 5;
        this.PADDING_LR = 12;
        this.SINGLE_MARGIN = this.MARGINS / 2; // Single side margin
        this.MAX_WIDTH = 400; // Maximum width of footnotes
        this.MAX_HEIGHT = 300; // Maximum height of footnotes
        this.SCALE = 1; // Scale factor for the footnote div, updates in #createFootnoteDiv
        this.SHADOW_SIZE = 5; // Shadow size, updates in #positionDiv
        this.ARROW_WIDTH = 8; // Arrow width, updates in #positionDiv
        this.ARROW_HEIGHT = 10; // Arrow height, updates in #positionDiv

        // Bind event handler methods to the instance to ensure correct `this` context
        this.footnoteover = this.#footnoteover.bind(this);
        this.footnoteoout = this.#footnoteoout.bind(this);
        this.divover = this.#divover.bind(this);

        // Initialize after DOM is fully loaded
        jQuery(() => this.setup());

        // Add cleanup method
        this.cleanup = this.#cleanup.bind(this);

        // Register callbacks
        cbReg.register("footnotes:hide", () => {
            clearTimeout(this.timeout); // Clear any existing timeout for hiding the footnote
            jQuery(this.FOOTNOTE_DIV_ID).stop().remove();
            this.EXCEED_RIGHT = false;
            this.EXCEED_BOTTOM = false;
        });
        cbReg.register("footnotes:cleanup", this.cleanup);

        // Add global event listeners
        document.addEventListener("click", () => {
            cbReg.go("footnotes:hide");
        });

        // Set instance
        Footnotes.#instance = this;
    }

    /**
     * Sets the lookup function for footnote content.
     * @param {function} lookupFunc - function(linenumber, markerCode, order): string
     */
    setFootnoteLookup(lookupFunc) {
        this._lookupFootnote = lookupFunc;
    }

    /**
     * Gets the singleton instance of Footnotes
     * @returns {Footnotes} The singleton instance
     * @public
     */
    static getInstance() {
        if (!Footnotes.#instance) {
            Footnotes.#instance = new Footnotes();
        }
        return Footnotes.#instance;
    }

    /**
     * Sets up the footnotes event listeners
     * Adds mouseover event listeners to all footnote links
     * @public
     */
    setup() {
        jQuery("a[rel='footnote']")
            .off("mouseover mouseout") // Remove any existing event handlers
            .on("mouseover", this.footnoteover)
            .on("mouseout", this.footnoteoout);
    }

    /**
     * Handles the mouseover event for footnote links
     * @private
     * @param {Event} e - Mouse event object
     */
    #footnoteover(e) {
        // Remove any existing footnote div
        cbReg.go("footnotes:hide");

        // Get the footnote link
        const $link = jQuery(e.currentTarget);
        const id = $link.attr("href").slice(1); // Get the target footnote ID

        // Create the footnote div and position it
        const div = this.#createFootnoteDiv(id, $link[0]);
        this.#positionDiv(div, $link[0]);
    }

    /**
     * Creates the footnote display div
     * @private
     * @param {string} id - Footnote ID
     * @param {HTMLElement|null} anchorEl - The anchor element (for metadata), optional
     * @returns {jQuery} Created footnote div jQuery object
     */
    #createFootnoteDiv(id, anchorEl = null) {
        // Create the footnote container
        const div = jQuery("<div>", {
            id: "footnotediv",
            mouseover: this.divover,
            mouseout: this.footnoteoout,
        });

        // Get and clean the footnote content
        let footnoteContent = "";
        // Use JS object lookup if available
        if (anchorEl && this._lookupFootnote) {
            const markerCode = anchorEl.getAttribute("data-marker-code");
            const index = anchorEl.getAttribute("data-index");
            footnoteContent = this._lookupFootnote(markerCode, index) || CONFIG.CONST_FOOTNOTE.NOTFOUND;
        } else {
            // fallback to old DOM method if needed
            footnoteContent =
                jQuery(`#${id}`)
                    .html()
                    ?.replace(/<a[^>]*rev="footnote">.*<\/a>/g, "") || CONFIG.CONST_FOOTNOTE.NOTFOUND;
        }

        // Create a close button for touch devices
        const closeLink =
            "ontouchstart" in window
                ? jQuery("<a>", {
                      id: "footnotecloselink",
                      href: "#",
                      click: (e) => {
                          e.preventDefault();
                          cbReg.go("footnotes:hide");
                      },
                  })
                : null;

        // Calculate the maximum dimensions
        const maxWidth = Math.min(jQuery(window).width() - this.MARGINS, this.MAX_WIDTH);
        const maxHeight = Math.min(jQuery(window).height() - this.MARGINS, this.MAX_HEIGHT);
        this.SCALE = parseFloat(CONFIG.RUNTIME_VARS.STYLE.p_fontSize) / 1.5 || 1;

        // Set the div content and style
        div.html(`<span>${footnoteContent}</span>`)
            .append(closeLink)
            .css({
                position: "absolute",
                minWidth: `${this.MAX_WIDTH / 10}px`,
                maxWidth: `${maxWidth * this.SCALE}px`,
                maxHeight: `${maxHeight * this.SCALE}px`,
                padding: `${this.PADDING_TB}px ${this.PADDING_LR}px`,
                opacity: 1.0,
                overflow: "visible",
                zIndex: 9000,
            });

        jQuery(document.body).append(div);
        return div;
    }

    /**
     * Positions the footnote div
     * @private
     * @param {jQuery} div - Footnote div jQuery object
     * @param {HTMLElement|null} anchorEl - The anchor element (for metadata), optional
     */
    #positionDiv(div, anchorEl = null) {
        // Get the window offset
        const $window = jQuery(window);

        // Get the body offset
        const bodyOffset = jQuery(document.body).offset();

        // Get the indicator element and its position
        const $indicator = jQuery(anchorEl).find("img").first();
        const indicatorRect = this.#getOuterRect($indicator);

        // Get the actual width of the footnote div
        const footnoteRect = this.#getOuterRect(div);

        // Calculate the horizontal position
        let left = indicatorRect.left - (footnoteRect.width / 10) * this.SCALE;
        if (left + (this.MARGINS + footnoteRect.width) > $window.width() + $window.scrollLeft()) {
            // If it exceeds the right boundary, adjust to the left
            this.EXCEED_RIGHT = true;
            left = $window.width() - (this.MARGINS + footnoteRect.width) + $window.scrollLeft() - 12;
        }

        // Calculate the vertical position
        const footnoteOffset = indicatorRect.height + this.SINGLE_MARGIN * this.SCALE;
        let top = indicatorRect.top + footnoteOffset;
        if (top + this.MARGINS + footnoteRect.height > $window.height() + $window.scrollTop()) {
            // If it exceeds the bottom boundary, display above the link
            this.EXCEED_BOTTOM = true;
            top = indicatorRect.top + indicatorRect.height;
            top -= footnoteOffset;
            top -= footnoteRect.height;
        }

        // Apply the position
        div.css({
            left: left - bodyOffset.left,
            top: top - bodyOffset.top,
        });

        // Calculate the arrow position
        const indicatorCenter = indicatorRect.left + indicatorRect.width / 2;
        const arrowLeft = indicatorCenter - left;

        // Apply the arrow position and other styles
        div[0].style.setProperty("--footnote-shadow-size", `${this.SHADOW_SIZE * this.SCALE}px`);
        div[0].style.setProperty("--footnote-arrow-left", `${arrowLeft}px`);
        div[0].style.setProperty("--footnote-arrow-height", `${this.ARROW_HEIGHT * this.SCALE}px`);
        div[0].style.setProperty("--footnote-arrow-width", `${this.ARROW_WIDTH * this.SCALE}px`);
        if (arrowLeft < 0 || arrowLeft > div.width()) {
            div[0].style.setProperty("--footnote-arrow-width", "0px");
        }
        if (this.EXCEED_BOTTOM) {
            div[0].style.setProperty("--footnote-arrow-top", `${div.height() + this.SINGLE_MARGIN}px`);
            div[0].classList.remove("arrow-up");
            div[0].classList.add("arrow-down");
        } else {
            div[0].style.setProperty("--footnote-arrow-top", `${this.ARROW_HEIGHT * this.SCALE}px`);
            div[0].classList.add("arrow-up");
            div[0].classList.remove("arrow-down");
        }
    }

    /**
     * Get the outer rectangle of an element
     * @private
     * @param {jQuery} $el - jQuery object
     * @returns {Object} - Object with top, left, width, and height
     */
    #getOuterRect($el) {
        const dom = $el[0];
        const style = getComputedStyle(dom);
        const rect = $el.offset();

        // Note: Need to add margin (offset already includes border and padding)
        const top = rect.top - parseFloat(style.marginTop);
        const left = rect.left - parseFloat(style.marginLeft);
        const width = $el.outerWidth(true); // true: include margin
        const height = $el.outerHeight(true); // true: include margin

        return { top, left, width, height };
    }

    /**
     * Handles the mouseout event for footnotes
     * Sets a timeout to hide the footnote
     * @private
     */
    #footnoteoout() {
        this.timeout = setTimeout(() => {
            cbReg.go("footnotes:hide");
        }, this.footnoteTimeout);
    }

    /**
     * Handles the mouseover event for footnote divs
     * Cancels the timeout for hiding the footnote
     * @private
     */
    #divover() {
        clearTimeout(this.timeout);
        jQuery(this.FOOTNOTE_DIV_ID).stop();
    }

    /**
     * Cleanup method
     * @private
     */
    #cleanup() {
        jQuery("a[rel='footnote']").off("mouseover mouseout");
        cbReg.go("footnotes:hide");
        clearTimeout(this.timeout);
    }
}

/**
 * Retrieves (or initializes if needed) the Footnotes instance
 * @returns {Footnotes} Singleton Footnotes instance
 * @public
 */
export function getFootnotes() {
    const instance = Footnotes.getInstance();
    instance.setup();
    return instance;
}
