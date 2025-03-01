/**
 * @fileoverview Footnotes handling module
 *
 * Original code by Lukas Mathis (http://ignorethecode.net/blog/2010/04/20/footnotes/)
 * Modified by Matt Gemmell (http://mattgemmell.com/)
 * Modernized refactored version
 *
 * @module client/app/modules/features/footnotes
 */

/**
 * Footnotes class for handling the display, positioning, and interaction of footnotes on a page
 * @private
 * @class
 */
class Footnotes {
    static #instance = null;

    /**
     * Creates a new Footnotes instance if none exists
     * @public
     * @throws {Error} When attempting to create multiple instances
     */
    constructor() {
        if (Footnotes.#instance) {
            throw new Error("Use getFootnotes()");
        }

        // Timer for delaying the hiding of footnotes
        this.timeout = null;

        // Layout constants
        this.MARGINS = 20; // Total margin value
        this.SINGLE_MARGIN = this.MARGINS / 2; // Single side margin
        this.MAX_WIDTH = 400; // Maximum width of footnotes
        this.MAX_HEIGHT = 300; // Maximum height of footnotes

        // Bind event handler methods to the instance to ensure correct `this` context
        this.footnoteover = this.#footnoteover.bind(this);
        this.footnoteoout = this.#footnoteoout.bind(this);
        this.divover = this.#divover.bind(this);

        // Initialize after DOM is fully loaded
        jQuery(() => this.setup());

        // Add cleanup method
        this.cleanup = this.#cleanup.bind(this);

        Footnotes.#instance = this;
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
        clearTimeout(this.timeout); // Clear any existing timeout for hiding the footnote
        jQuery("#footnotediv").stop().remove(); // Remove any existing footnote div

        const $link = jQuery(e.currentTarget);
        const id = $link.attr("href").slice(1); // Get the target footnote ID
        const position = $link.offset(); // Get the link position

        const div = this.#createFootnoteDiv(id, position);
        this.#positionDiv(div, position);
    }

    /**
     * Creates the footnote display div
     * @private
     * @param {string} id - Footnote ID
     * @param {Object} position - Position information object
     * @returns {jQuery} Created footnote div jQuery object
     */
    #createFootnoteDiv(id, position) {
        // Create the footnote container
        const div = jQuery("<div>", {
            id: "footnotediv",
            mouseover: this.divover,
            mouseout: this.footnoteoout,
        });

        // Get and clean the footnote content
        const footnoteContent = jQuery(`#${id}`)
            .html()
            .replace(/<a[^>]*rev="footnote">.*<\/a>/g, "");

        // Create a close button for touch devices
        const closeLink =
            "ontouchstart" in window
                ? jQuery("<a>", {
                      id: "footnotecloselink",
                      href: "#",
                      click: (e) => {
                          e.preventDefault();
                          jQuery("#footnotediv").remove();
                      },
                  })
                : null;

        // Calculate the maximum dimensions
        const maxWidth = Math.min(jQuery(window).width() - this.MARGINS, this.MAX_WIDTH);
        const maxHeight = Math.min(jQuery(window).height() - this.MARGINS, this.MAX_HEIGHT);

        // Set the div content and style
        div.html(footnoteContent)
            .append(closeLink)
            .css({
                position: "absolute",
                width: "auto",
                maxWidth: `${maxWidth}px`,
                maxHeight: `${maxHeight}px`,
                opacity: 1.0,
                overflow: "auto",
                zIndex: 9000,
            });

        jQuery(document.body).append(div);
        return div;
    }

    /**
     * Positions the footnote div
     * @private
     * @param {jQuery} div - Footnote div jQuery object
     * @param {Object} position - Target position information
     */
    #positionDiv(div, position) {
        const $window = jQuery(window);
        const actual_width = div.width();
        const bodyOffset = jQuery(document.body).offset();

        // Calculate the horizontal position
        let left = position.left;
        if (left + (this.MARGINS + actual_width) > $window.width() + $window.scrollLeft()) {
            // If it exceeds the right boundary, adjust to the left
            left = $window.width() - (this.MARGINS + actual_width) + $window.scrollLeft() - 12;
        }

        // Calculate the vertical position
        let top = position.top + this.MARGINS;
        if (top + div.height() > $window.height() + $window.scrollTop()) {
            // If it exceeds the bottom boundary, display above the link
            top = position.top - div.height() - this.SINGLE_MARGIN;
        }

        // Apply the position
        div.css({
            left: left - bodyOffset.left,
            top: top - bodyOffset.top,
        });
    }

    /**
     * Handles the mouseout event for footnotes
     * Sets a timeout to hide the footnote
     * @private
     */
    #footnoteoout() {
        this.timeout = setTimeout(() => {
            jQuery("#footnotediv").remove();
        }, 500);
    }

    /**
     * Handles the mouseover event for footnote divs
     * Cancels the timeout for hiding the footnote
     * @private
     */
    #divover() {
        clearTimeout(this.timeout);
        jQuery("#footnotediv").stop();
    }

    /**
     * Cleanup method
     * @private
     */
    #cleanup() {
        jQuery("a[rel='footnote']").off("mouseover mouseout");
        jQuery("#footnotediv").remove();
        clearTimeout(this.timeout);
    }
}

/**
 * Initializes or retrieves the Footnotes instance
 * @returns {Footnotes} Singleton Footnotes instance
 * @public
 */
export function getFootnotes() {
    const instance = Footnotes.getInstance();
    instance.setup();
    return instance;
}
