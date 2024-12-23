/**
 * @fileoverview DropdownSelector module for converting standard HTML select elements into custom-styled dropdown selectors.
 *
 * This module supports optgroup tags and allows handling selection events through an event listener function.
 * Credit: http://jsfiddle.net/BB3JK/47/
 *
 * @module modules/components/dropdown-selector
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
 * @param {Array} eventListeners - Array of event listeners with func and params properties
 * @param {Object} options - Additional options for the dropdown selector
 */
class DropdownSelector {
    /**
     * Constructor for DropdownSelector
     * @param {jQuery} $selectElement - jQuery selector object
     * @param {number} defaultIdx - Default option index
     * @param {Array} eventListeners - Array of event listeners with func and params properties
     * @param {Object} options - Additional options for the dropdown selector
     * @param {Function} options.groupClassResolver - Function to get additional classes for optgroup labels
     * @param {ActionButton[]} [options.actionButtons] - Array of action button configurations
     * @public
     */
    constructor($selectElement, defaultIdx, eventListeners = [], options = {}) {
        this.$selectElement = $selectElement;
        this.defaultIdx = defaultIdx;
        this.eventListeners = eventListeners;
        this.options = options;
        this.$selectElement.data("dropdownSelector", this);
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
        this.$styledSelect.html(`<span>${allOptions.eq(this.defaultIdx).text()}</span>`);
        this.$styledSelect.attr("style", allOptions.eq(this.defaultIdx).attr("style"));

        // Insert an unordered list after the styled div and cache it
        this.$list = $("<ul />", {
            class: "select-options",
        }).insertAfter(this.$styledSelect);

        // Check and handle optgroup tags
        $this.children("optgroup, option").each((_, element) => {
            const $element = $(element);
            if ($element.is("optgroup")) {
                const label = $element.attr("label");

                // Use groupClassResolver to get additional classes
                const additionalClasses = this.options.groupClassResolver?.(label) || "";
                const additionalClassesText = additionalClasses ? ` ${additionalClasses}` : "";

                // If the current element is an optgroup, add a label for the group
                $("<li />", {
                    text: label,
                    rel: label,
                    class: `optgroup-label${additionalClassesText}`,
                    "data-optgroup": true,
                }).appendTo(this.$list);

                // Iterate over each option in the optgroup
                $element.children("option").each((i, option) => {
                    const $option = $(option);

                    // Create option container
                    const $li = $("<li />", {
                        class: `optgroup-option${additionalClassesText}`,
                        id: i,
                        rel: $option.val(),
                        style: $option.attr("style"),
                    });

                    // Add text container
                    $("<span />", {
                        class: "option-text",
                        text: $option.text(),
                    }).appendTo($li);

                    // Add action buttons if configured
                    if (this.options.actionButtons?.length > 0) {
                        const $actionContainer = $("<div />", {
                            class: "option-actions",
                        });

                        this.options.actionButtons.forEach((button) => {
                            // Check if button should be shown
                            if (button.shouldShow && !button.shouldShow($option.val(), $option.text(), $li)) {
                                return;
                            }

                            const $btn = $("<div />", {
                                class: `option-action ${button.className || ""}`,
                                html: button.html,
                            });

                            // Add click event listener
                            $btn.on("click", (e) => {
                                e.stopPropagation();
                                button.onClick($option.val(), $option.text(), e, $li, this);
                            });

                            // Add scroll event listener
                            $btn.on("wheel", (e) => {
                                e.preventDefault();
                                const $container = $btn.closest(".select-options");
                                $container.scrollTop($container.scrollTop() + e.originalEvent.deltaY);
                            });

                            $actionContainer.append($btn);
                        });

                        $li.append($actionContainer);
                    }

                    $li.appendTo(this.$list);
                });
            } else {
                // Handle regular options (not in optgroup)
                const $option = $(element);

                const $li = $("<li />", {
                    class: "option",
                    rel: $option.val(),
                    style: $option.attr("style"),
                });

                $("<span />", {
                    class: "option-text",
                    text: $option.text(),
                }).appendTo($li);

                $li.appendTo(this.$list);
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
     * Removes an option item from the dropdown selector
     * @param {string} value - The value of the option item to remove
     * @param {boolean} [removeGroup=true] - Whether to remove the group label if it becomes empty
     * @returns {boolean} - Whether the removal was successful
     */
    removeItem(value, removeGroup = true) {
        try {
            // 1. Find the original option
            const $originalOption = this.$selectElement.find(`option[value="${value}"]`);
            if ($originalOption.length === 0) {
                return false;
            }

            const $optgroup = $originalOption.parent("optgroup");
            const $customOption = this.$list.find(`li[rel="${value}"]`);

            // 2. Get the required information - multiple ways to check the selected state
            const wasSelected =
                this.$selectElement.val() === value || // Check the current value of the select
                $customOption.hasClass("is-selected") || // Check the selected state in the UI
                this.$styledSelect.text().trim() === $originalOption.text().trim(); // Check the displayed text
            const groupLabel = $optgroup.length > 0 ? $optgroup.attr("label") : null;
            const hasOtherOptions =
                $optgroup.length > 0 ? $optgroup.children("option").not($originalOption).length > 0 : false;

            // 3. If it was selected, find the new option
            let firstAvailable = null;
            if (wasSelected) {
                firstAvailable = this.$selectElement.find("option").not($originalOption).first();
            }

            // 4. Perform the deletion operation
            $customOption.remove();
            $originalOption.remove();

            // 5. If the group is empty, remove it
            if (removeGroup && $optgroup.length > 0 && !hasOtherOptions) {
                // this.$list.find(`li.optgroup-label:contains("${groupLabel}")`).remove();
                this.$list.find(`li.optgroup-label[rel="${groupLabel}"]`).remove();
                $optgroup.remove();
            }

            // 6. If the selection needs to be updated
            if (wasSelected && firstAvailable && firstAvailable.length > 0) {
                this.$selectElement.val(firstAvailable.val());
                this.$styledSelect.html(
                    `<span>${this.$list.find(`li[rel="${firstAvailable.val()}"] .option-text`).text()}</span>`
                );
                this.$styledSelect.attr("style", firstAvailable.attr("style"));
                this.$list.find("li.is-selected").removeClass("is-selected");
                this.$list.find(`li[rel="${firstAvailable.val()}"]`).addClass("is-selected");
                this.eventListeners.forEach((listener) => {
                    listener.func(...(listener.params || []));
                });
            }

            return true;
        } catch (error) {
            console.error("Error removing option:", error);
            return false;
        }
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
                // Get the boundary of the settings menu
                const settingsMenu = this.$styledSelect.closest("#settings-menu")[0];
                const settingsRect = settingsMenu.getBoundingClientRect();
                const selectRect = this.$styledSelect[0].getBoundingClientRect();

                // Calculate the available space within the settings menu
                const bottomPadding = parseInt(
                    getComputedStyle(document.getElementById("setting-bottom-row")).paddingBottom
                );
                const bottomSpace = settingsRect.bottom - selectRect.bottom - bottomPadding;
                const dropdownHeight = parseInt(getComputedStyle(this.$list[0]).maxHeight);

                // If there's not enough space below, add the dropup class
                // console.log("Available space in settings:", bottomSpace);
                // console.log("Dropdown height:", dropdownHeight);
                if (bottomSpace < dropdownHeight) {
                    this.$list.addClass("dropup");
                } else {
                    this.$list.removeClass("dropup");
                }

                // Close other open dropdown lists
                $("div.select-styled.active").each(function () {
                    $(this).removeClass("active").next("ul.select-options").hide();
                });

                // Show the current option list
                this.$styledSelect.addClass("active").next("ul.select-options").show();

                // Scroll to the selected item
                const $selectedItem = this.$list.find("li.is-selected");
                if ($selectedItem.length > 0) {
                    const containerTop = this.$list.scrollTop();
                    const selectedPosition = $selectedItem.position().top;

                    // To display the selected item on the top of the list
                    // this.$list.scrollTop(selectedPosition + containerTop);

                    // To display the selected item in the center of the list
                    const containerHeight = this.$list.height();
                    const itemHeight = $selectedItem.outerHeight();
                    const scrollPosition = selectedPosition + containerTop - (containerHeight - itemHeight) / 2;
                    this.$list.scrollTop(scrollPosition);
                }
            }
        });

        // When a list item is clicked, hide the unordered list and update the styled div to show the selected item
        // Update the select element to have the value of the equivalent option
        this.$listItems.on("click", (e) => {
            e.stopPropagation();
            this.$styledSelect.html(`<span>${$(e.target).text()}</span>`).removeClass("active");
            this.$styledSelect.attr("style", $(e.target).attr("style"));
            this.$selectElement.val($(e.target).attr("rel"));
            this.$list.find("li.is-selected").removeClass("is-selected");
            this.$list.find('li[rel="' + $(e.target).attr("rel") + '"]').addClass("is-selected");
            this.$list.hide();
            this.eventListeners.forEach((listener) => {
                listener.func(...(listener.params || []));
            });
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
 * @param {Array} eventListeners - Array of event listeners with func and params properties
 * @param {Object} options - Additional options for the dropdown selector
 * @returns {DropdownSelector} A new instance of DropdownSelector
 * @public
 */
export function getDropdownSelector($selectElement, defaultIdx, eventListeners = [], options = {}) {
    return new DropdownSelector($selectElement, defaultIdx, eventListeners, options);
}
