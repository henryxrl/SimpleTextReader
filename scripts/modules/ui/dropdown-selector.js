/**
 * @fileoverview DropdownSelector module for converting standard HTML select elements into custom-styled dropdown selectors.
 *
 * This module supports optgroup tags and allows handling selection events through an event listener function.
 * Credit: http://jsfiddle.net/BB3JK/47/
 *
 * @module modules/ui/dropdown-selector
 */

/**
 * DropdownSelector class for converting standard HTML select elements into custom-styled dropdown selectors.
 * @private
 * @class
 *
 * @description
 * This class provides functionality to:
 * - Hide the original select element and replace it with a styled div
 * - Support optgroup tags for grouped options
 * - Handle selection events with a custom event listener
 *
 * @param {jQuery} $selectElement - jQuery selector object for the select element
 * @param {number} defaultIdx - Index of the default option
 * @param {function} eventListenerFunc - Event listener function to handle selection events
 * @param {Array} eventListenerFuncParameters - Parameters for the event listener function
 */
class DropdownSelector {
    /**
     * Constructor for DropdownSelector
     * @param {jQuery} $selectElement - jQuery selector object
     * @param {number} defaultIdx - Default option index
     * @param {function} eventListenerFunc - Event listener function
     * @param {Array} eventListenerFuncParameters - Parameters for the event listener function
     * @public
     */
    constructor($selectElement, defaultIdx, eventListenerFunc, eventListenerFuncParameters) {
        this.$selectElement = $selectElement;
        this.defaultIdx = defaultIdx;
        this.eventListenerFunc = eventListenerFunc;
        this.eventListenerFuncParameters = eventListenerFuncParameters;

        this.#init();
    }

    /**
     * Initializes the dropdown selector by setting up the custom-styled elements and event bindings.
     */
    #init() {
        // Cache the select element and count the number of options (ignoring optgroup)
        const $this = this.$selectElement;
        const allOptions = $this.find("option"); // Find all options, including those in optgroup
        const numberOfOptions = allOptions.length;

        // Hide the select element
        $this.addClass("select-hidden");

        // Wrap the select element in a div
        $this.wrap('<div class="select"></div>');

        // Insert a styled div above the hidden select element
        $this.after('<div class="select-styled"></div>');

        // Cache the styled div
        this.$styledSelect = $this.next("div.select-styled");

        // Ensure defaultIdx is within valid range
        if (this.defaultIdx < 0 || this.defaultIdx >= numberOfOptions) {
            this.defaultIdx = 0; // Fallback to the first option if defaultIdx is invalid
        }

        // Display the default selected option in the styled div
        this.$styledSelect.text(allOptions.eq(this.defaultIdx).text());
        this.$styledSelect.attr("style", allOptions.eq(this.defaultIdx).attr("style"));

        // Insert an unordered list after the styled div and cache it
        this.$list = $("<ul />", {
            class: "select-options",
        }).insertAfter(this.$styledSelect);

        // Check and handle optgroup tags
        $this.children("optgroup, option").each((_, element) => {
            const $element = $(element);
            if ($element.is("optgroup")) {
                // If the current element is an optgroup, add a label for the group
                $("<li />", {
                    text: $element.attr("label"),
                    class: "optgroup-label",
                    "data-optgroup": true,
                }).appendTo(this.$list);

                // Iterate over each option in the optgroup
                $element.children("option").each((_, option) => {
                    $("<li />", {
                        text: $(option).text(),
                        rel: $(option).val(),
                        class: "optgroup-option",
                        style: $(option).attr("style"),
                    }).appendTo(this.$list);
                });
            } else {
                // If the current element is a regular option, add it directly
                $("<li />", {
                    text: $element.text(),
                    rel: $element.val(),
                    class: "option",
                    style: $element.attr("style"),
                }).appendTo(this.$list);
            }
        });

        // Cache list items (excluding optgroup-label)
        this.$listItems = this.$list.children("li").not(".optgroup-label");

        // Bind events
        this.#bindEvents();

        // Select the default index item in the dropdown list
        this.$list.find('li[rel="' + allOptions.eq(this.defaultIdx).val() + '"]').addClass("is-selected");
    }

    /**
     * Binds events to the custom-styled dropdown elements for interaction.
     */
    #bindEvents() {
        // Show or hide the unordered list when the styled div is clicked
        this.$styledSelect.on("click", (e) => {
            e.stopPropagation();
            // If the current element is already active
            if (this.$styledSelect.hasClass("active")) {
                // Directly hide the current option list and remove the active class
                this.$styledSelect.removeClass("active").next("ul.select-options").hide();
            } else {
                // Close other open dropdown lists
                $("div.select-styled.active").each(function () {
                    $(this).removeClass("active").next("ul.select-options").hide();
                });
                // Show the current option list
                this.$styledSelect.addClass("active").next("ul.select-options").show();
            }
        });

        // When a list item is clicked, hide the unordered list and update the styled div to show the selected item
        // Update the select element to have the value of the equivalent option
        this.$listItems.on("click", (e) => {
            e.stopPropagation();
            this.$styledSelect.text($(e.target).text()).removeClass("active");
            this.$styledSelect.attr("style", $(e.target).attr("style"));
            this.$selectElement.val($(e.target).attr("rel"));
            this.$list.find("li.is-selected").removeClass("is-selected");
            this.$list.find('li[rel="' + $(e.target).attr("rel") + '"]').addClass("is-selected");
            this.$list.hide();
            this.eventListenerFunc(...this.eventListenerFuncParameters);
        });

        // Hide the unordered list when clicking outside of it
        $(document).on("click", () => {
            this.$styledSelect.removeClass("active");
            this.$list.hide();
        });

        // Disable click events on optgroup labels
        $(".optgroup-label").on("click", (e) => {
            e.stopPropagation();
        });
    }
}

/**
 * Creates a new DropdownSelector instance for a select element
 * @param {jQuery} $selectElement - jQuery selector object for the select element
 * @param {number} defaultIdx - Index of the default option
 * @param {function} eventListenerFunc - Event listener function to handle selection events
 * @param {Array} eventListenerFuncParameters - Parameters for the event listener function
 * @returns {DropdownSelector} A new instance of DropdownSelector
 * @public
 */
export function getDropdownSelector($selectElement, defaultIdx, eventListenerFunc, eventListenerFuncParameters) {
    return new DropdownSelector($selectElement, defaultIdx, eventListenerFunc, eventListenerFuncParameters);
}
