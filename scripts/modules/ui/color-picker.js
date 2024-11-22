/**
 * @fileoverview Custom Color Picker implementation using @yaireo/color-picker library
 *
 * @module modules/ui/color-picker
 * @requires @yaireo/position
 * @requires @yaireo/color-picker
 */

// Since "@yaireo/position" is used as a script file rather than a Node module (ES export)
position = position.default;

// Get ColorPicker and utility functions from window object
const { default: ColorPicker, any_to_hex, changeColorFormat } = window.ColorPicker;

/**
 * MyColorPicker class for managing color picker instances
 * @private
 * @class
 * @classdesc Creates and manages color pickers for all elements with 'myColor' class.
 * Features:
 * - Singleton pattern ensures only one manager instance exists
 * - Automatic positioning relative to input elements
 * - Swatch management with local storage support
 * - Responsive layout with ResizeObserver
 * - Click-outside handling
 * - Real-time color updates
 * - Multiple color format support (HEX, RGBA, HSLA)
 * @property {Function} func - Callback function for color changes
 * @property {MyColorPicker|null} #instance - Private static instance of the color picker manager
 */
class MyColorPicker {
    static #instance = null;

    /**
     * Creates a new MyColorPicker instance if none exists
     * @constructor
     * @param {Function} func - Callback function to be called when color picker input changes
     * @throws {Error} When attempting to create multiple instances
     * @public
     */
    constructor(func) {
        if (MyColorPicker.#instance) {
            throw new Error("Use MyColorPicker.getInstance()");
        }
        this.func = func;
        this.#init();
    }

    /**
     * Gets the singleton instance of MyColorPicker
     * @static
     * @param {Function} func - Callback function for color changes
     * @returns {MyColorPicker} The singleton instance
     * @public
     */
    static getInstance(func) {
        if (!MyColorPicker.#instance) {
            MyColorPicker.#instance = new MyColorPicker(func);
        } else if (func) {
            MyColorPicker.#instance.func = func; // Update callback function
        }
        return MyColorPicker.#instance;
    }

    /**
     * Initializes color pickers for all elements with 'myColor' class
     * @private
     * @fires ResizeObserver#callback
     * @fires IntersectionObserver#callback
     *
     * For each color input element:
     * - Creates a new ColorPicker instance
     * - Sets up position observers for responsive layout
     * - Configures intersection observers for visibility
     * - Binds event handlers for user interactions
     * - Initializes swatches if enabled
     *
     * @listens click - Handles click-outside events
     * @listens input - Handles color value changes
     */
    #init() {
        // Iterate through all color inputs and instantiate new ColorPicker instances
        document.querySelectorAll(".myColor").forEach((colorInput) => {
            const observerCallback = (entries) => {
                if (!cPicker.DOM.scope.classList.contains("hidden")) {
                    position({
                        target: cPicker.DOM.scope,
                        ref: colorInput,
                        placement: colorInput.dataset.placement || "center above",
                        offset: [20],
                    });
                }
            };

            // Create observers to monitor color picker size and visibility changes
            const resizeObserver = new ResizeObserver(observerCallback);
            const intersectionObserver = new IntersectionObserver(observerCallback, {
                root: document,
                threshold: 1,
            });

            // Create a new ColorPicker instance
            const cPicker = new ColorPicker({
                color: colorInput.value, // Accepts formats: HEX(A), RGB(A), HSL(A)
                defaultFormat: "hex",
                swatches: colorInput.dataset.swatches === "false" ? false : JSON.parse(colorInput.dataset.swatches),
                swatchesLocalStorage: true,

                // When clicking anywhere outside the color picker
                onClickOutside: (e) => {
                    let showPicker = false;
                    const isTargetColorInput = e.target === colorInput;
                    const pickerElem = cPicker.DOM.scope;

                    if (isTargetColorInput) showPicker = true;
                    if (e.key === "Escape") showPicker = false;

                    // Remove color picker from DOM
                    showPicker ? this.#showColorPicker(pickerElem) : this.#hideColorPicker(pickerElem);

                    if (isTargetColorInput) observerCallback();
                },

                // Called when color input changes
                onInput: (c) => {
                    colorInput.value = c;
                    colorInput.style.setProperty("--color", c);
                    this.func();
                },

                // onChange: console.log
            });

            // Set initial position for color picker
            cPicker.DOM.scope.setAttribute("positioned", true);
            // document.body.appendChild(cPicker.DOM.scope)

            // Observe document body and color picker changes
            resizeObserver.observe(document.body);
            intersectionObserver.observe(cPicker.DOM.scope);
            observerCallback();

            // Assign a custom property to color-input element pointing to its corresponding color-picker instance
            colorInput._colorPicker = cPicker;
        });
    }

    /**
     * Shows the color picker element
     * @param {HTMLElement} pickerElem - The color picker DOM element to show
     * @throws {Error} When pickerElem is null or undefined
     * @fires ColorPicker#show
     * @private
     */
    #showColorPicker(pickerElem) {
        // If picker is not yet in DOM:
        if (!document.body.contains(pickerElem)) {
            // Append picker to DOM
            document.body.appendChild(pickerElem);
        }
    }

    /**
     * Hides the color picker element
     * @param {HTMLElement} pickerElem - The color picker DOM element to hide
     * @fires ColorPicker#hide
     * @private
     */
    #hideColorPicker(pickerElem) {
        pickerElem.remove();
    }
}

/**
 * Creates and initializes a new ColorPicker instance
 * @param {Function} func - Callback function to be called when color picker input changes
 * @returns {MyColorPicker} New ColorPicker instance
 * @public
 */
export function getColorPicker(func) {
    return MyColorPicker.getInstance(func);
}
