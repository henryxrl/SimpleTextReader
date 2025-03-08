/**
 * @fileoverview Settings module for managing UI and style configurations.
 *
 * This module provides functionality for:
 * - Managing user interface settings (language, fonts, colors)
 * - Handling light/dark mode preferences
 * - Storing and retrieving settings from localStorage
 * - Creating and managing the settings menu interface
 * - Applying settings to the application in real-time
 *
 * The settings are organized into several categories:
 * - Font settings (system fonts, custom fonts, fallback fonts)
 * - Color settings (light/dark mode colors)
 * - UI settings (line height, font size, pagination)
 * - Language settings
 *
 * @module client/app/modules/features/settings
 * @requires client/app/config
 * @requires client/app/config/icons
 * @requires client/app/lib/css-global-variables
 * @requires client/app/modules/components/dropdown-selector
 * @requires client/app/modules/components/custom-custom-color-picker
 * @requires client/app/utils/base
 * @requires client/app/utils/helpers-settings
 * @requires client/app/utils/helpers-reader
 */

import * as CONFIG from "../../config/index.js";
import { ICONS } from "../../config/icons.js";
import { CSSGlobalVariables } from "../../lib/css-global-variables.js";
import { getDropdownSelector } from "../components/dropdown-selector.js";
import { getColorPicker } from "../components/custom-color-picker.js";
import {
    isVariableDefined,
    HSLToHex,
    hexToHSL,
    pSBC,
    triggerCustomEvent,
    setSvgPathLength,
    fetchVersion,
    toBool,
} from "../../utils/base.js";
import {
    setRangeValue,
    setColorValue,
    setSelectorValue,
    setCheckboxValue,
    createRangeItem,
    createColorItem,
    createSelectorItem,
    createFontSelectorItem,
    createCheckboxItem,
    createSeparatorItem,
    createSeparatorItemWithText,
    findFontIndex,
    changeLanguageSelectorItemLanguage,
    changeFontSelectorItemLanguage,
    handleSettingsClose,
} from "../../utils/helpers-settings.js";
import { setTitle } from "../../utils/helpers-reader.js";

/**
 * Class representing the settings menu interface.
 * Manages the creation, display, and interaction of the settings modal dialog.
 * Handles tabs for general settings, theme customization, reader preferences, and about information.
 *
 * @class
 * @property {Object} #TAB_IDS - Private constant containing tab definitions and their display order
 * @property {Object} #TAB_ORDER - Private constant containing sorted tab order
 * @property {Promise<string>} #versionPromise - Private cached promise for version number
 * @property {Object} settingsObj - Reference to the main settings object containing actual settings values
 * @property {HTMLElement} settingsMenu - The main settings menu container element
 * @property {HTMLElement} overlay - The overlay element that dims the background
 * @property {string} defaultTab - The ID of the default tab to show
 */
class SettingsMenu {
    /**
     * Private constant containing tab definitions and their display order
     * @type {Object}
     */
    #TAB_IDS = {
        GENERAL: { id: "general", order: 3 },
        THEME: { id: "theme", order: 2 },
        READER: { id: "reader", order: 1 },
        ABOUT: { id: "about", order: 4 },
    };

    /**
     * Private constant containing sorted tab order
     * @type {Object}
     */
    #TAB_ORDER = Object.values(this.#TAB_IDS).sort((a, b) => a.order - b.order);

    /**
     * Private cached promise for version number
     * @type {Promise<string>}
     */
    #versionPromise = null;

    /**
     * Creates an instance of SettingsMenu.
     * Initializes the menu with references to settings and default configurations.
     *
     * @note
     * This constructor is asynchronous and returns a promise that resolves with the initialized instance.
     * Must be awaited when creating an instance.
     *
     * @constructor
     * @async
     * @param {Object} settingsObj - The main settings object containing all settings values and methods
     * @returns {Promise<SettingsMenu>} A promise that resolves with the initialized instance
     */
    constructor(settingsObj) {
        return (async () => {
            this.settingsObj = settingsObj;
            this.settingsMenu = null;
            this.overlay = null;
            this.defaultTab = this.#TAB_ORDER[0].id;

            await this.#init();
            return this;
        })();
    }

    /**
     * Initializes and creates the settings menu interface.
     * Creates the complete modal dialog including:
     * - Main container and overlay
     * - Tab navigation
     * - Content sections for each tab
     * - Bottom row with reset button and version
     * Also sets up event listeners and initializes components like color pickers and dropdowns.
     *
     * @async
     * @returns {Promise<void>} Resolves when the menu is fully initialized and rendered
     * @throws {Error} If required DOM elements cannot be created or initialized
     */
    async #init() {
        // Create the settings menu main container and overlay
        this.settingsMenu = this.#createMainContainer();
        this.overlay = this.#createOverlay();

        // Create the settings menu elements
        const topRow = this.#createTopRow();
        const settingsContainer = this.#createSettingsContainer();
        const tabContainer = this.#createTabContainer();
        const settingsContent = await this.#createSettingsContent();
        const bottomRow = this.#createBottomRow();

        // Append the elements to the settings menu
        settingsContainer.appendChild(tabContainer);
        settingsContainer.appendChild(settingsContent);
        this.settingsMenu.appendChild(topRow);
        this.settingsMenu.appendChild(settingsContainer);
        this.settingsMenu.appendChild(bottomRow);

        // Append the settings menu and overlay to the document body
        document.body.appendChild(this.overlay);
        document.body.appendChild(this.settingsMenu);

        // Initialize event listeners and components
        this.#initializeEventListeners();
        this.#initializeComponents();

        // Show the first tab by default
        this.switchTab(this.defaultTab);
    }

    /**
     * Shows the settings menu modal and its overlay.
     * If the menu hasn't been initialized yet, initializes it first.
     *
     * @async
     * @returns {Promise<void>} Resolves when the menu is fully visible
     * @throws {Error} If menu initialization fails
     */
    async show() {
        if (!this.settingsMenu) {
            await this.init();
        }

        // Show the menu
        this.settingsMenu.style.display = "flex";
        this.settingsMenu.style.zIndex = "9999";
        this.settingsMenu.style.visibility = "visible";
        CONFIG.VARS.SETTINGS_MENU_SHOWN = true;

        // Show the overlay
        this.overlay.style.display = "block";
        this.overlay.style.zIndex = "9998";
        this.overlay.style.visibility = "visible";

        // Add ESC key listener
        document.addEventListener("keydown", this.#handleClose, true);

        // Add global wheel event handler
        // Disable page scrolling when settings menu is open
        document.body.style.overflow = "hidden";
        document.addEventListener("wheel", this.#handleGlobalWheel, { passive: false });
    }

    /**
     * Hides the settings menu modal and its overlay.
     * Resets the menu's visibility state and removes focus from settings button.
     */
    hide() {
        // Hide the menu
        if (this.settingsMenu) {
            this.settingsMenu.style.display = "none";
            this.settingsMenu.style.zIndex = "-1";
            this.settingsMenu.style.visibility = "hidden";
        }
        CONFIG.VARS.SETTINGS_MENU_SHOWN = false;

        // Hide the overlay
        if (this.overlay) {
            this.overlay.style.display = "none";
            this.overlay.style.zIndex = "-1";
            this.overlay.style.visibility = "hidden";
        }

        // Manually remove focus from settings button
        const settingsBtn = CONFIG.DOM_ELEMENT.SETTINGS_BUTTON;
        if (settingsBtn) {
            settingsBtn.blur();
        }

        // Remove global wheel event handler
        // Enable page scrolling when settings menu is closed
        document.body.style.overflow = "";
        document.removeEventListener("wheel", this.#handleGlobalWheel, { passive: false });
    }

    /**
     * Removes the settings menu and its event listeners from the DOM.
     * Cleans up all resources associated with the menu.
     */
    remove() {
        // Remove the menu
        if (this.settingsMenu) {
            this.settingsMenu.remove();
            this.settingsMenu = null;
        }

        // Remove the overlay
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }

        // Remove event listeners
        document.removeEventListener("click", this.#handleClose);
        document.removeEventListener("keydown", this.#handleClose, true);

        // Reset any other state if necessary
        CONFIG.VARS.SETTINGS_MENU_SHOWN = false;
    }

    /**
     * Switches the active tab in the settings menu
     * @param {string} tabId - The ID of the tab to switch to
     */
    switchTab(tabId) {
        document.querySelectorAll(".tab-button").forEach((btn) => btn.classList.remove("active"));
        document.querySelector(`[data-tab="${tabId}"]`).classList.add("active");

        document.querySelectorAll(".tab-content").forEach((content) => content.classList.remove("active"));
        document.getElementById(tabId).classList.add("active");
    }

    /**
     * Creates the main container for the settings menu.
     * @returns {HTMLElement} The created settings menu container element
     */
    #createMainContainer() {
        const menu = document.createElement("div");
        menu.setAttribute("id", "settings-menu");
        menu.className = "settings-modal";
        menu.style.display = "none";
        menu.style.visibility = "hidden";
        menu.style.zIndex = "-1";

        this.#addScrollHandler(menu);
        return menu;
    }

    /**
     * Adds a scroll handler to the settings menu container.
     * @param {HTMLElement} container - The settings menu container element
     */
    #addScrollHandler(container) {
        container.addEventListener(
            "wheel",
            (e) => {
                // Prevent event from bubbling up to the document
                e.stopPropagation();
                e.preventDefault();

                // Get the current scrolling target element
                const target = e.target;

                // Check if the target element is within a scrollable container
                const scrollableParent = target.closest(
                    ".settings-tabs, .settings-content, .tab-content.active, .select-options"
                );

                if (scrollableParent) {
                    // Check if there is a dropdown open
                    const dropdowns = document.querySelectorAll(".select-options[style*='display: block']");
                    if (dropdowns.length > 0) {
                        const isInsideDropdown = target.closest(".select-options");

                        // Prevent scrolling if the target is not within the open dropdown
                        if (!isInsideDropdown) {
                            e.preventDefault();
                            e.stopPropagation();
                            return;
                        }
                    }

                    // Get the actual element to scroll (if within settings-content, use its first tab-content.active)
                    const scrollTarget = scrollableParent.classList.contains("settings-content")
                        ? scrollableParent.querySelector(".tab-content.active") || scrollableParent
                        : scrollableParent;

                    // Calculate the new scroll position
                    const newScrollTop = scrollTarget.scrollTop + e.deltaY;

                    // Apply the scroll
                    scrollTarget.scrollTop = newScrollTop;
                }
            },
            { passive: false }
        );
    }

    /**
     * Creates the overlay element for the settings menu.
     * @returns {HTMLElement} The created overlay element
     */
    #createOverlay() {
        const overlay = document.createElement("div");
        overlay.setAttribute("id", "settings-overlay");
        overlay.className = "settings-overlay";
        overlay.style.display = "none";
        overlay.style.visibility = "hidden";
        overlay.style.zIndex = "-1";

        overlay.addEventListener("wheel", (e) => {
            e.preventDefault();
            e.stopPropagation();
        });

        return overlay;
    }

    /**
     * Creates the settings container for the settings menu.
     * @returns {HTMLElement} The created settings container element
     */
    #createSettingsContainer() {
        const container = document.createElement("div");
        container.className = "settings-container";
        return container;
    }

    /**
     * Creates the tab container for the settings menu.
     * @returns {HTMLElement} The created tab container element
     */
    #createTabContainer() {
        const tabContainer = document.createElement("div");
        tabContainer.className = "settings-tabs";

        this.#TAB_ORDER.forEach((tab) => {
            const tabButton = document.createElement("button");
            tabButton.className = "tab-button";
            tabButton.setAttribute("data-tab", tab.id);
            tabButton.setAttribute("id", `setting-tab-${tab.id}`);
            tabButton.setAttribute("type", "button");
            tabButton.setAttribute("aria-label", tab.id);
            tabButton.addEventListener("click", () => this.switchTab(tab.id));
            tabContainer.appendChild(tabButton);
        });

        return tabContainer;
    }

    /**
     * Creates the content section for the settings menu.
     * @async
     * @returns {HTMLElement} The created settings content element
     */
    async #createSettingsContent() {
        const content = document.createElement("div");
        content.className = "settings-content";

        content.appendChild(this.#createGeneralTab());
        content.appendChild(this.#createThemeTab());
        content.appendChild(await this.#createReaderTab());
        content.appendChild(this.#createAboutTab());

        return content;
    }

    /**
     * Creates the general tab for the settings menu.
     * @returns {HTMLElement} The created general tab element
     */
    #createGeneralTab() {
        const tab = document.createElement("div");
        tab.id = "general";
        tab.className = "tab-content active"; // Show this by default

        /**
         * Language
         */
        tab.appendChild(createSeparatorItemWithText("setting_separator_ui"));

        tab.appendChild(
            createSelectorItem(
                "setting_uilanguage",
                ["auto", ...Object.keys(CONFIG.CONST_UI.LANGUAGE_MAPPING)],
                [CONFIG.RUNTIME_VARS.STYLE.ui_language_text, ...Object.values(CONFIG.CONST_UI.LANGUAGE_MAPPING)]
            )
        );

        tab.appendChild(
            createCheckboxItem(
                "setting_show_filter_bar",
                this.settingsObj.show_filter_bar,
                this.settingsObj.saveSettings.bind(this.settingsObj)
            )
        );

        /**
         * Behavior
         */
        tab.appendChild(createSeparatorItemWithText("setting_separator_behavior"));
        // tab.appendChild(createSeparatorItem());

        tab.appendChild(
            createCheckboxItem(
                "setting_auto_open_last_book",
                this.settingsObj.auto_open_last_book,
                this.settingsObj.saveSettings.bind(this.settingsObj)
            )
        );

        return tab;
    }

    /**
     * Creates the theme tab for the settings menu.
     * @returns {HTMLElement} The created theme tab element
     */
    #createThemeTab() {
        const tab = document.createElement("div");
        tab.id = "theme";
        tab.className = "tab-content";

        /**
         * Light theme
         */
        tab.appendChild(createSeparatorItemWithText("setting_separator_light"));

        tab.appendChild(
            createColorItem(
                "setting_light_mainColor_active",
                this.settingsObj.light_mainColor_active,
                ["#2F5086"],
                this.settingsObj.saveSettings.bind(this.settingsObj)
            )
        );

        tab.appendChild(
            createColorItem(
                "setting_light_fontColor",
                this.settingsObj.light_fontColor,
                ["black"],
                this.settingsObj.saveSettings.bind(this.settingsObj)
            )
        );

        tab.appendChild(
            createColorItem(
                "setting_light_bgColor",
                this.settingsObj.light_bgColor,
                ["#FDF3DF"],
                this.settingsObj.saveSettings.bind(this.settingsObj)
            )
        );

        /**
         * Dark theme
         */
        tab.appendChild(createSeparatorItemWithText("setting_separator_dark"));
        // tab.appendChild(createSeparatorItem());

        tab.appendChild(
            createColorItem(
                "setting_dark_mainColor_active",
                this.settingsObj.dark_mainColor_active,
                ["#6096BB"],
                this.settingsObj.saveSettings.bind(this.settingsObj)
            )
        );

        tab.appendChild(
            createColorItem(
                "setting_dark_fontColor",
                this.settingsObj.dark_fontColor,
                ["#F2E6CE"],
                this.settingsObj.saveSettings.bind(this.settingsObj)
            )
        );

        tab.appendChild(
            createColorItem(
                "setting_dark_bgColor",
                this.settingsObj.dark_bgColor,
                ["#0D1018"],
                this.settingsObj.saveSettings.bind(this.settingsObj)
            )
        );

        return tab;
    }

    /**
     * Creates the reader tab for the settings menu.
     * @async
     * @returns {HTMLElement} The created reader tab element
     */
    async #createReaderTab() {
        const tab = document.createElement("div");
        tab.id = "reader";
        tab.className = "tab-content";

        /**
         * Fonts
         */
        tab.appendChild(createSeparatorItemWithText("setting_separator_font"));

        const settingTitleFont_ = await createFontSelectorItem("setting_title_font");
        const settingBodyFont_ = await createFontSelectorItem("setting_body_font");
        const language = !CONFIG.RUNTIME_VARS.RESPECT_USER_LANG_SETTING
            ? CONFIG.RUNTIME_VARS.STYLE.ui_LANG
            : this.settingsObj.ui_language;
        if (language === "zh") {
            tab.appendChild(settingTitleFont_[1]);
            tab.appendChild(settingBodyFont_[1]);
        } else {
            tab.appendChild(settingTitleFont_[0]);
            tab.appendChild(settingBodyFont_[0]);
        }

        tab.appendChild(
            createRangeItem(
                "setting_p_fontSize",
                parseFloat(this.settingsObj.p_fontSize),
                1,
                3,
                0.5,
                "em",
                this.settingsObj.saveSettings.bind(this.settingsObj)
            )
        );

        /**
         * Paragraph
         */
        tab.appendChild(createSeparatorItemWithText("setting_separator_paragraph"));
        // tab.appendChild(createSeparatorItem());

        tab.appendChild(
            createRangeItem(
                "setting_p_lineHeight",
                parseFloat(this.settingsObj.p_lineHeight),
                1,
                3,
                0.5,
                "em",
                this.settingsObj.saveSettings.bind(this.settingsObj)
            )
        );

        tab.appendChild(
            createRangeItem(
                "setting_p_paragraphSpacing",
                parseFloat(this.settingsObj.p_paragraphSpacing),
                1,
                3,
                0.5,
                "em",
                this.settingsObj.saveSettings.bind(this.settingsObj)
            )
        );

        tab.appendChild(
            createCheckboxItem(
                "setting_p_paragraphIndent",
                this.settingsObj.p_paragraphIndent,
                this.settingsObj.saveSettings.bind(this.settingsObj)
            )
        );

        tab.appendChild(
            createCheckboxItem(
                "setting_p_textAlign",
                this.settingsObj.p_textAlign,
                this.settingsObj.saveSettings.bind(this.settingsObj)
            )
        );

        /**
         * Pagination
         */
        tab.appendChild(createSeparatorItemWithText("setting_separator_pagination"));
        // tab.appendChild(createSeparatorItem());

        tab.appendChild(
            createRangeItem(
                "setting_pagination_bottom",
                parseFloat(this.settingsObj.pagination_bottom),
                1,
                30,
                1,
                "px",
                this.settingsObj.saveSettings.bind(this.settingsObj)
            )
        );

        tab.appendChild(
            createRangeItem(
                "setting_pagination_opacity",
                parseFloat(this.settingsObj.pagination_opacity),
                0,
                1,
                0.1,
                "",
                this.settingsObj.saveSettings.bind(this.settingsObj)
            )
        );

        return tab;
    }

    /**
     * Creates the about tab for the settings menu.
     * @returns {HTMLElement} The created about tab element
     */
    #createAboutTab() {
        const tab = document.createElement("div");
        tab.id = "about";
        tab.className = "tab-content";

        tab.innerHTML = `
            <div class="about-container prevent-select">
                <img class="about-icon" src="./client/images/icon.png" alt="Logo">
                <h2 class="about-title" id="settingLabel-about_title"></h2>
                <p class="about-version noIndent">v${CONFIG.RUNTIME_VARS.APP_VERSION} (${CONFIG.RUNTIME_VARS.APP_VERSION_DATE})</p>

                <hr class="about-divider">
                
                <p class="about-text noIndent">
                    <span id="settingLabel-about_github"></span>
                    <span class="about-btns">
                        <button class="about-btn">
                            ${ICONS.GITHUB}
                            <a href="https://github.com/henryxrl/SimpleTextReader" target="_blank" class="about-link">SimpleTextReader</a>
                        </button>
                    </span>
                </p>

                <p class="about-text noIndent">
                    <span id="settingLabel-about_extensions"></span>
                    <span class="about-btns">
                        <button class="about-btn">
                            ${ICONS.CHROME}
                            <a href="https://chrome.google.com/webstore/detail/%E6%98%93%E7%AC%BA/dbanahlbopbjpgdkecmclbbonhpohcaf" target="_blank" class="about-link">Chrome</a>
                        </button>
                        <span class="about-btn-separator">|</span>
                        <button class="about-btn">
                            ${ICONS.FIREFOX}
                            <a href="https://addons.mozilla.org/firefox/addon/yijian/" target="_blank" class="about-link">Firefox</a>
                        </button>
                        <span class="about-btn-separator">|</span>
                        <button class="about-btn">
                            ${ICONS.EDGE}
                            <a href="https://microsoftedge.microsoft.com/addons/detail/pabihehbdhldbdliffaddllmjlknmpak" target="_blank" class="about-link">Edge</a>
                        </button>
                    </span>
                </p>

                <p class="about-text noIndent">
                    <span id="settingLabel-about_copyright"></span>
                    <span class="about-btns">
                        <button class="about-btn">
                            <!--${ICONS.GITHUB}-->
                            <a href="https://github.com/henryxrl" target="_blank" class="about-link">Henry Xu</a>
                        </button>
                    </span>
                    <!--<span class="about-btn-separator">•</span>
                    <span id="settingLabel-about_license"></span>-->
                </p>
            </div>
        `;

        return tab;
    }

    /**
     * Creates the top row of the settings menu.
     * This creates a spacer element at the top of the settings modal.
     * @returns {HTMLElement} The created top row element
     */
    #createTopRow() {
        const topRow = document.createElement("div");
        topRow.setAttribute("id", "settings-top-row");
        return topRow;
    }

    /**
     * Creates the bottom row for the settings menu.
     * @returns {HTMLElement} The created bottom row element
     */
    #createBottomRow() {
        const bottomRow = document.createElement("div");
        bottomRow.id = "settings-bottom-row";

        bottomRow.appendChild(this.#createResetButton());
        bottomRow.appendChild(this.#createVersionDisplay());

        return bottomRow;
    }

    /**
     * Creates the reset button for the settings menu.
     * @returns {HTMLElement} The created reset button element
     */
    #createResetButton() {
        const resetButton = document.createElement("button");
        resetButton.setAttribute("id", "settings-reset-btn");
        resetButton.setAttribute("aria-label", "settings-reset-btn");
        resetButton.addEventListener("click", (e) => {
            this.settingsObj.loadDefaultSettings();
            this.settingsObj.saveSettings(true, true);
            triggerCustomEvent("refreshBookList", {
                hardRefresh: false,
                sortBookshelf: true,
            });
        });
        return resetButton;
    }

    /**
     * Creates the version display for the settings menu.
     * @returns {HTMLElement} The created version display element
     */
    #createVersionDisplay() {
        const versionDisplay = document.createElement("div");
        versionDisplay.id = "settings-version-display";
        versionDisplay.className = "prevent-select";
        versionDisplay.textContent = "v" + CONFIG.RUNTIME_VARS.APP_VERSION;
        return versionDisplay;
    }

    /**
     * Initializes event listeners for the settings menu.
     */
    #initializeEventListeners() {
        document.addEventListener("click", this.#handleClose);
    }

    /**
     * Initializes components for the settings menu.
     */
    #initializeComponents() {
        setTimeout(() => {
            getColorPicker(this.settingsObj.saveSettings.bind(this.settingsObj));
        }, 200);

        this.#initializeInputValues();
        this.#initializeSelectors();
    }

    /**
     * Initializes input values for the settings menu.
     */
    #initializeInputValues() {
        document.getElementById("setting_p_lineHeight").value = parseFloat(this.settingsObj.p_lineHeight);
        document.getElementById("setting_p_fontSize").value = parseFloat(this.settingsObj.p_fontSize);
        document.getElementById("setting_pagination_bottom").value = parseFloat(this.settingsObj.pagination_bottom);
        document.getElementById("setting_pagination_opacity").value = parseFloat(this.settingsObj.pagination_opacity);
    }

    /**
     * Initializes selectors for the settings menu.
     */
    #initializeSelectors() {
        // Language selector
        const languageIndex = this.settingsObj.ui_language
            ? Object.keys(CONFIG.CONST_UI.LANGUAGE_MAPPING).indexOf(this.settingsObj.ui_language) + 1
            : 0;
        getDropdownSelector(
            $("#setting_uilanguage"),
            languageIndex,
            [
                {
                    func: this.settingsObj.saveSettings.bind(this.settingsObj),
                    params: [true, true],
                },
                {
                    func: triggerCustomEvent,
                    params: [
                        "refreshBookList",
                        {
                            hardRefresh: false,
                            sortBookshelf: true,
                        },
                    ],
                },
            ],
            {
                $parent: $("#settings-menu"),
            }
        );

        // Title font and body font selectors
        const titleFontConfig = this.#createFontSelectorConfig("#setting_title_font", this.settingsObj.title_font);
        const bodyFontConfig = this.#createFontSelectorConfig("#setting_body_font", this.settingsObj.body_font);
        getDropdownSelector(
            titleFontConfig.element,
            titleFontConfig.index,
            titleFontConfig.callbacks,
            titleFontConfig.options
        );
        getDropdownSelector(
            bodyFontConfig.element,
            bodyFontConfig.index,
            bodyFontConfig.callbacks,
            bodyFontConfig.options
        );
    }

    /**
     * Create font selector configuration
     * @param {string} element - The element to create the font selector for
     * @param {string} fontValue - The font value to set
     * @returns {Object} The font selector configuration
     */
    #createFontSelectorConfig(element, fontValue) {
        return {
            element: $(`${element}`),
            index: findFontIndex(fontValue),
            callbacks: [
                {
                    func: this.settingsObj.saveSettings.bind(this.settingsObj),
                    params: [false, false],
                },
            ],
            options: {
                groupClassResolver: (label) => {
                    return label === CONFIG.RUNTIME_VARS.STYLE.ui_font_group_custom_en ||
                        label === CONFIG.RUNTIME_VARS.STYLE.ui_font_group_custom_zh
                        ? "custom-font"
                        : "";
                },
                actionButtons: [
                    {
                        className: "delete-button",
                        html: ICONS.DELETE_BOOK,
                        onClick: async (value, text, e, $element, currentDropdownSelector) => {
                            // Find and save the other dropdown selectors
                            const $currentSelect = currentDropdownSelector.$selectElement;
                            const $allSelects = $(".select-hidden"); // All hidden select elements
                            const $otherSelects = $allSelects.not($currentSelect); // Exclude the current select

                            // Remove the option from the current dropdown
                            const removed = currentDropdownSelector.removeItem(value);

                            // If the option item is successfully removed, handle the other dropdowns
                            if (removed) {
                                // For each other dropdown,emove the same option
                                $otherSelects.each(function () {
                                    const otherDropdownSelector = $(this).data("dropdownSelector");
                                    if (otherDropdownSelector) {
                                        otherDropdownSelector.removeItem(value);
                                    }
                                });

                                // Trigger the delete font event
                                triggerCustomEvent("deleteCustomFont", {
                                    fontFamily: value,
                                });
                            }
                        },
                        shouldShow: (value, text, $element) => {
                            return $element.hasClass("optgroup-option") && $element.hasClass("custom-font");
                        },
                    },
                ],
                $parent: $("#settings-menu"),
            },
        };
    }

    /**
     * Handles closing events for the settings menu (click outside or ESC key).
     * @param {Event} e - The event object (either mouse click or keydown)
     */
    #handleClose = (e) => {
        // If it's a keydown event, check if it's the Escape key
        if (e.type === "keydown") {
            if (e.key !== "Escape") return;
            e.stopPropagation();
        }

        // Handle the close event
        const actions = handleSettingsClose(e, e.type === "keydown");
        if (actions) {
            if (actions.shouldSave) {
                this.settingsObj.saveSettings();
            }

            if (actions.shouldHide) {
                // Check if there are any open dropdowns
                const openDropdowns = document.querySelectorAll('.select-options[style*="display: block"]');
                if (openDropdowns.length > 0) {
                    // Close all open dropdowns
                    openDropdowns.forEach((dropdown) => {
                        dropdown.style.display = "none";
                        const parent = dropdown.closest(".select");
                        if (parent) {
                            const styledElement = parent.querySelector(".select-styled");
                            if (styledElement) {
                                styledElement.classList.remove("active");
                            }
                        }
                    });
                    // Do not close the settings menu
                    return;
                }

                // Check if there is an open color picker
                if (actions.closedColorPicker) {
                    // Do not close the settings menu, because the color picker was just closed
                    return;
                }

                // If there are no open dropdowns or color picker, close the settings menu
                this.hide();
            }

            // Only remove the keydown event listener when Escape key is pressed
            if (e.type === "keydown") {
                const hasOpenDropdown =
                    document.querySelectorAll('.select-options[style*="display: block"]').length > 0;
                if (!actions.closedColorPicker && !hasOpenDropdown) {
                    document.removeEventListener("keydown", this.#handleClose, true);
                }
            }
        } else if (e.type === "keydown") {
            // Remove the keydown event listener when Escape key is pressed but no action is taken
            document.removeEventListener("keydown", this.#handleClose, true);
        }
    };

    /**
     * Handles global wheel events to prevent scrolling when the settings menu is open.
     * @param {WheelEvent} e - The wheel event object
     */
    #handleGlobalWheel = (e) => {
        if (CONFIG.VARS.SETTINGS_MENU_SHOWN) {
            e.preventDefault();
            e.stopPropagation();
        }
    };

    /**
     * Fetches the version number from a JSON file.
     * @async
     * @returns {Promise<string>} A promise that resolves to the version number, or an empty string if not found.
     */
    async #getVersion() {
        if (CONFIG.RUNTIME_VARS.APP_VERSION) {
            return Promise.resolve(CONFIG.RUNTIME_VARS.APP_VERSION);
        }

        if (!this.#versionPromise) {
            this.#versionPromise = fetchVersion()
                .then((version) => {
                    CONFIG.RUNTIME_VARS.APP_VERSION = version;
                    return version;
                })
                .catch((error) => {
                    console.error("Failed to fetch version:", error);
                    return "";
                });
        }

        return this.#versionPromise;
    }
}

/**
 * Settings module for managing UI and style configurations.
 * @private
 * @namespace
 */
const settings = {
    enabled: false,
    settingsMenu: null,

    /*
     * Default settings
     */
    browser_LANG: localStorage.getItem("browser_LANG") || "zh",
    respectUserLangSetting_default: CONFIG.RUNTIME_VARS.RESPECT_USER_LANG_SETTING,
    ui_language_default: CONFIG.RUNTIME_VARS.STYLE.ui_LANG,
    p_lineHeight_default: CONFIG.RUNTIME_VARS.STYLE.p_lineHeight,
    p_paragraphSpacing_default: CONFIG.RUNTIME_VARS.STYLE.p_paragraphSpacing,
    p_paragraphIndent_default: toBool(CONFIG.RUNTIME_VARS.STYLE.p_paragraphIndent),
    p_textAlign_default: toBool(CONFIG.RUNTIME_VARS.STYLE.p_textAlign),
    p_fontSize_default: CONFIG.RUNTIME_VARS.STYLE.p_fontSize,
    light_mainColor_active_default: CONFIG.RUNTIME_VARS.STYLE.mainColor_active,
    light_mainColor_inactive_default: CONFIG.RUNTIME_VARS.STYLE.mainColor_inactive,
    light_fontColor_default: CONFIG.RUNTIME_VARS.STYLE.fontColor,
    light_bgColor_default: CONFIG.RUNTIME_VARS.STYLE.bgColor,
    dark_mainColor_active_default: CONFIG.RUNTIME_VARS.STYLE.darkMode_mainColor_active,
    dark_mainColor_inactive_default: CONFIG.RUNTIME_VARS.STYLE.darkMode_mainColor_inactive,
    dark_fontColor_default: CONFIG.RUNTIME_VARS.STYLE.darkMode_fontColor,
    dark_bgColor_default: CONFIG.RUNTIME_VARS.STYLE.darkMode_bgColor,
    title_font_default: CONFIG.RUNTIME_VARS.STYLE.fontFamily_title,
    body_font_default: CONFIG.RUNTIME_VARS.STYLE.fontFamily_body,
    pagination_bottom_default: CONFIG.RUNTIME_VARS.STYLE.ui_paginationBottom,
    pagination_opacity_default: CONFIG.RUNTIME_VARS.STYLE.ui_paginationOpacity,
    show_filter_bar_default: CONFIG.CONST_CONFIG.SHOW_FILTER_BAR,
    auto_open_last_book_default: CONFIG.CONST_CONFIG.AUTO_OPEN_LAST_BOOK,

    /*
     * Current settings
     */
    respectUserLangSetting: null,
    ui_language: null,
    p_lineHeight: null,
    p_paragraphSpacing: null,
    p_paragraphIndent: null,
    p_textAlign: null,
    p_fontSize: null,
    light_mainColor_active: null,
    light_mainColor_inactive: null,
    light_fontColor: null,
    light_bgColor: null,
    dark_mainColor_active: null,
    dark_mainColor_inactive: null,
    dark_fontColor: null,
    dark_bgColor: null,
    title_font: null,
    body_font: null,
    pagination_bottom: null,
    pagination_opacity: null,
    show_filter_bar: null,
    auto_open_last_book: null,

    /**
     * Loads user settings from local storage or falls back to default values.
     * Settings include:
     * - UI language (if user language setting is respected)
     * - Paragraph line height and font size
     * - Light mode colors (main active/inactive, font, background)
     * - Dark mode colors (main active/inactive, font, background)
     * - Title and body fonts
     * - Pagination position and opacity
     * - Auto-open last book
     *
     * @public
     * @method loadSettings
     * @memberof settings
     * @instance
     */
    loadSettings() {
        this.respectUserLangSetting =
            toBool(localStorage.getItem("respectUserLangSetting"), false) ??
            toBool(document.documentElement.getAttribute("respectUserLangSetting"));
        if (this.respectUserLangSetting) {
            this.ui_language = localStorage.getItem("UILang") || this.ui_language_default;
        }
        this.p_lineHeight = localStorage.getItem("p_lineHeight") || this.p_lineHeight_default;
        this.p_paragraphSpacing = localStorage.getItem("p_paragraphSpacing") || this.p_paragraphSpacing_default;
        this.p_paragraphIndent =
            toBool(localStorage.getItem("p_paragraphIndent"), false) ?? this.p_paragraphIndent_default;
        this.p_textAlign = toBool(localStorage.getItem("p_textAlign"), false) ?? this.p_textAlign_default;
        this.p_fontSize = localStorage.getItem("p_fontSize") || this.p_fontSize_default;
        this.light_mainColor_active =
            localStorage.getItem("light_mainColor_active") || this.light_mainColor_active_default;
        this.light_mainColor_inactive =
            localStorage.getItem("light_mainColor_inactive") || this.light_mainColor_inactive_default;
        this.light_fontColor = localStorage.getItem("light_fontColor") || this.light_fontColor_default;
        this.light_bgColor = localStorage.getItem("light_bgColor") || this.light_bgColor_default;
        this.dark_mainColor_active =
            localStorage.getItem("dark_mainColor_active") || this.dark_mainColor_active_default;
        this.dark_mainColor_inactive =
            localStorage.getItem("dark_mainColor_inactive") || this.dark_mainColor_inactive_default;
        this.dark_fontColor = localStorage.getItem("dark_fontColor") || this.dark_fontColor_default;
        this.dark_bgColor = localStorage.getItem("dark_bgColor") || this.dark_bgColor_default;
        this.title_font = localStorage.getItem("title_font") || this.title_font_default;
        this.body_font = localStorage.getItem("body_font") || this.body_font_default;
        this.pagination_bottom = localStorage.getItem("pagination_bottom") || this.pagination_bottom_default;
        this.pagination_opacity = localStorage.getItem("pagination_opacity") || this.pagination_opacity_default;
        this.show_filter_bar = toBool(localStorage.getItem("show_filter_bar"), false) ?? this.show_filter_bar_default;
        this.auto_open_last_book =
            toBool(localStorage.getItem("auto_open_last_book"), false) ?? this.auto_open_last_book_default;

        // console.log(CONFIG.RUNTIME_VARS.RESPECT_USER_LANG_SETTING);
        // console.log(localStorage.getItem("respectUserLangSetting"));
        // console.log(this.respectUserLangSetting);
        // console.log(localStorage.getItem("UILang"));
        // console.log(this.ui_language_default);
        // console.log(localStorage.getItem("p_lineHeight"));
        // console.log(this.p_lineHeight_default);
        // console.log(localStorage.getItem("p_paragraphSpacing"));
        // console.log(this.p_paragraphSpacing_default);
        // console.log(localStorage.getItem("p_paragraphIndent"));
        // console.log(this.p_paragraphIndent_default);
        // console.log(localStorage.getItem("p_textAlign"));
        // console.log(this.p_textAlign_default);
        // console.log(localStorage.getItem("p_fontSize"));
        // console.log(this.p_fontSize_default);
        // console.log(localStorage.getItem("light_mainColor_active"));
        // console.log(this.light_mainColor_active_default);
        // console.log(localStorage.getItem("light_mainColor_inactive"));
        // console.log(this.light_mainColor_inactive_default);
        // console.log(localStorage.getItem("light_fontColor"));
        // console.log(this.light_fontColor_default);
        // console.log(localStorage.getItem("light_bgColor"));
        // console.log(this.light_bgColor_default);
        // console.log(localStorage.getItem("dark_mainColor_active"));
        // console.log(this.dark_mainColor_active_default);
        // console.log(localStorage.getItem("dark_mainColor_inactive"));
        // console.log(this.dark_mainColor_inactive_default);
        // console.log(localStorage.getItem("dark_fontColor"));
        // console.log(this.dark_fontColor_default);
        // console.log(localStorage.getItem("dark_bgColor"));
        // console.log(this.dark_bgColor_default);
        // console.log(localStorage.getItem("title_font"));
        // console.log(this.title_font_default);
        // console.log(localStorage.getItem("body_font"));
        // console.log(this.body_font_default);
        // console.log(localStorage.getItem("pagination_bottom"));
        // console.log(this.pagination_bottom_default);
        // console.log(localStorage.getItem("pagination_opacity"));
        // console.log(this.pagination_opacity_default);
        // console.log(localStorage.getItem("show_filter_bar"));
        // console.log(this.show_filter_bar_default);
        // console.log(localStorage.getItem("auto_open_last_book"));
        // console.log(this.auto_open_last_book_default);
    },

    /**
     * Resets all settings to their default values.
     * This includes:
     * - UI language (if language setting is enabled)
     * - Text styling (line height, font size)
     * - Light mode colors (main colors, font color, background)
     * - Dark mode colors
     * - Font families
     * - Pagination settings
     * - Auto-open last book
     *
     * Note: This function only loads the default values into memory,
     * it does not save them to localStorage or apply them to the UI.
     * Use saveSettings() to persist changes.
     *
     * @public
     * @method loadDefaultSettings
     * @memberof settings
     * @instance
     */
    loadDefaultSettings() {
        // console.log("loadDefaultSettings");
        this.respectUserLangSetting = this.respectUserLangSetting_default;
        if (this.respectUserLangSetting) {
            // console.log("loadDefaultSettings: RESPECT_USER_LANG_SETTING");
            this.ui_language = this.ui_language_default;
        }
        this.p_lineHeight = this.p_lineHeight_default;
        this.p_paragraphSpacing = this.p_paragraphSpacing_default;
        this.p_paragraphIndent = this.p_paragraphIndent_default;
        this.p_textAlign = this.p_textAlign_default;
        this.p_fontSize = this.p_fontSize_default;
        this.light_mainColor_active = this.light_mainColor_active_default;
        this.light_mainColor_inactive = this.light_mainColor_inactive_default;
        this.light_fontColor = this.light_fontColor_default;
        this.light_bgColor = this.light_bgColor_default;
        this.dark_mainColor_active = this.dark_mainColor_active_default;
        this.dark_mainColor_inactive = this.dark_mainColor_inactive_default;
        this.dark_fontColor = this.dark_fontColor_default;
        this.dark_bgColor = this.dark_bgColor_default;
        this.title_font = this.title_font_default;
        this.body_font = this.body_font_default;
        this.pagination_bottom = this.pagination_bottom_default;
        this.pagination_opacity = this.pagination_opacity_default;
        this.show_filter_bar = this.show_filter_bar_default;
        this.auto_open_last_book = this.auto_open_last_book_default;

        if (this.respectUserLangSetting) {
            setSelectorValue(
                "setting_uilanguage",
                Object.keys(CONFIG.CONST_UI.LANGUAGE_MAPPING).indexOf(this.ui_language) + 1
            );
        } else {
            setSelectorValue("setting_uilanguage", 0);
        }
        setRangeValue("setting_p_lineHeight", this.p_lineHeight);
        setRangeValue("setting_p_paragraphSpacing", this.p_paragraphSpacing);
        setCheckboxValue("setting_p_paragraphIndent", this.p_paragraphIndent);
        setCheckboxValue("setting_p_textAlign", this.p_textAlign);
        setRangeValue("setting_p_fontSize", this.p_fontSize);
        setColorValue("setting_light_mainColor_active", this.light_mainColor_active);
        setColorValue("setting_light_fontColor", this.light_fontColor);
        setColorValue("setting_light_bgColor", this.light_bgColor);
        setColorValue("setting_dark_mainColor_active", this.dark_mainColor_active);
        setColorValue("setting_dark_fontColor", this.dark_fontColor);
        setColorValue("setting_dark_bgColor", this.dark_bgColor);
        setSelectorValue("setting_title_font", findFontIndex(this.title_font));
        setSelectorValue("setting_body_font", findFontIndex(this.body_font));
        setRangeValue("setting_pagination_bottom", this.pagination_bottom);
        setRangeValue("setting_pagination_opacity", this.pagination_opacity);
        setCheckboxValue("setting_show_filter_bar", this.show_filter_bar);
        setCheckboxValue("setting_auto_open_last_book", this.auto_open_last_book);
    },

    /**
     * Applies the current settings to the application's configuration.
     * Updates all style-related configuration variables including:
     * - UI language (if enabled)
     * - Text styling (line height, font size)
     * - Light mode colors (main colors, font color, background)
     * - Dark mode colors
     * - Font families for different elements
     * - Pagination settings
     * - Auto-open last book
     *
     * Also handles the special case for dark mode, where it updates
     * the active color settings based on the current theme.
     *
     * @public
     * @method applySettings
     * @memberof settings
     * @instance
     */
    applySettings() {
        CONFIG.RUNTIME_VARS.RESPECT_USER_LANG_SETTING = this.respectUserLangSetting;
        if (this.respectUserLangSetting) {
            CONFIG.RUNTIME_VARS.STYLE.ui_LANG = this.ui_language;
        }
        CONFIG.RUNTIME_VARS.STYLE.p_lineHeight = this.p_lineHeight;
        CONFIG.RUNTIME_VARS.STYLE.p_paragraphSpacing = this.p_paragraphSpacing;
        CONFIG.RUNTIME_VARS.STYLE.p_paragraphIndent = this.p_paragraphIndent;
        CONFIG.RUNTIME_VARS.STYLE.p_paragraphIndent_value = this.p_paragraphIndent
            ? CONFIG.RUNTIME_VARS.STYLE.p_paragraphIndent_value_true
            : CONFIG.RUNTIME_VARS.STYLE.p_paragraphIndent_value_false;
        CONFIG.RUNTIME_VARS.STYLE.p_textAlign = this.p_textAlign;
        CONFIG.RUNTIME_VARS.STYLE.p_textAlign_value = this.p_textAlign
            ? CONFIG.RUNTIME_VARS.STYLE.p_textAlign_value_true
            : CONFIG.RUNTIME_VARS.STYLE.p_textAlign_value_false;
        CONFIG.RUNTIME_VARS.STYLE.p_fontSize = this.p_fontSize;
        CONFIG.RUNTIME_VARS.STYLE.mainColor_active = this.light_mainColor_active;
        CONFIG.RUNTIME_VARS.STYLE.mainColor_inactive = this.light_mainColor_inactive;
        CONFIG.RUNTIME_VARS.STYLE.fontColor = this.light_fontColor;
        CONFIG.RUNTIME_VARS.STYLE.bgColor = this.light_bgColor;
        CONFIG.RUNTIME_VARS.STYLE.darkMode_mainColor_active = this.dark_mainColor_active;
        CONFIG.RUNTIME_VARS.STYLE.darkMode_mainColor_inactive = this.dark_mainColor_inactive;
        CONFIG.RUNTIME_VARS.STYLE.darkMode_fontColor = this.dark_fontColor;
        CONFIG.RUNTIME_VARS.STYLE.darkMode_bgColor = this.dark_bgColor;
        CONFIG.RUNTIME_VARS.STYLE.title_font = this.title_font;
        CONFIG.RUNTIME_VARS.STYLE.body_font = this.body_font;
        CONFIG.RUNTIME_VARS.STYLE.fontFamily_title = this.title_font;
        CONFIG.RUNTIME_VARS.STYLE.fontFamily_body = this.body_font;
        CONFIG.RUNTIME_VARS.STYLE.fontFamily_title_zh = this.title_font;
        CONFIG.RUNTIME_VARS.STYLE.fontFamily_body_zh = this.body_font;
        CONFIG.RUNTIME_VARS.STYLE.fontFamily_title_en = this.title_font;
        CONFIG.RUNTIME_VARS.STYLE.fontFamily_body_en = this.body_font;
        CONFIG.RUNTIME_VARS.STYLE.ui_paginationBottom = this.pagination_bottom;
        CONFIG.RUNTIME_VARS.STYLE.ui_paginationOpacity = this.pagination_opacity;
        CONFIG.CONST_CONFIG.SHOW_FILTER_BAR = this.show_filter_bar;
        CONFIG.CONST_CONFIG.AUTO_OPEN_LAST_BOOK = this.auto_open_last_book;

        if (CONFIG.RUNTIME_VARS.STYLE.ui_Mode === "dark") {
            CONFIG.RUNTIME_VARS.STYLE.mainColor_active = CONFIG.RUNTIME_VARS.STYLE.darkMode_mainColor_active;
            CONFIG.RUNTIME_VARS.STYLE.mainColor_inactive = CONFIG.RUNTIME_VARS.STYLE.darkMode_mainColor_inactive;
            CONFIG.RUNTIME_VARS.STYLE.fontColor = CONFIG.RUNTIME_VARS.STYLE.darkMode_fontColor;
            CONFIG.RUNTIME_VARS.STYLE.bgColor = CONFIG.RUNTIME_VARS.STYLE.darkMode_bgColor;
        }

        // Apply UI changes
        triggerCustomEvent("toggleFilterBar");
    },

    /**
     * Saves the current settings to local storage and applies them.
     * Retrieves values from UI elements and saves them to:
     * - Local storage for persistence
     * - Current settings object for immediate use
     *
     * The function handles:
     * - UI language selection
     * - Text styling (line height, font size)
     * - Color schemes for both light and dark modes
     * - Font selections
     * - Pagination settings
     *
     * @public
     * @method saveSettings
     * @memberof settings
     * @instance
     * @param {boolean} [toSetLanguage=false] - Whether to set the language based on the current settings
     * @param {boolean} [forceSetLanguage=false] - Whether to forcefully set the language regardless of user settings
     */
    saveSettings(toSetLanguage = false, forceSetLanguage = false) {
        // console.log("saveSettings", { toSetLanguage, forceSetLanguage });

        // Save settings to variables
        this.respectUserLangSetting = !(
            $("#setting_uilanguage")
                .closest(".select")
                .children(".select-options")
                .children(".is-selected")
                .attr("rel") === "auto" ?? this.respectUserLangSetting_default
        );
        if (this.respectUserLangSetting) {
            this.ui_language =
                $("#setting_uilanguage")
                    .closest(".select")
                    .children(".select-options")
                    .children(".is-selected")
                    .attr("rel") || this.ui_language_default;
        }
        this.p_lineHeight = $("#setting_p_lineHeight").val() + "em" || this.p_lineHeight_default;
        this.p_paragraphSpacing = $("#setting_p_paragraphSpacing").val() + "em" || this.p_paragraphSpacing_default;
        this.p_paragraphIndent = $("#setting_p_paragraphIndent").is(":checked") ?? this.p_paragraphIndent_default;
        this.p_textAlign = $("#setting_p_textAlign").is(":checked") ?? this.p_textAlign_default;
        this.p_fontSize = $("#setting_p_fontSize").val() + "em" || this.p_fontSize_default;
        this.light_mainColor_active = $("#setting_light_mainColor_active").val() || this.light_mainColor_active_default;
        this.light_mainColor_inactive = HSLToHex(
            ...hexToHSL($("#setting_light_mainColor_active").val() || this.light_mainColor_active_default, 1.5)
        );
        // this.light_mainColor_inactive = pSBC(0.25, ($("#setting_light_mainColor_active").val() || this.light_mainColor_active_default), false, true);   // 25% lighter (linear)
        this.light_fontColor = $("#setting_light_fontColor").val() || this.light_fontColor_default;
        this.light_bgColor = $("#setting_light_bgColor").val() || this.light_bgColor_default;
        this.dark_mainColor_active = $("#setting_dark_mainColor_active").val() || this.dark_mainColor_active_default;
        this.dark_mainColor_inactive = HSLToHex(
            ...hexToHSL($("#setting_dark_mainColor_active").val() || this.dark_mainColor_active_default, 0.5)
        );
        // this.dark_mainColor_inactive = pSBC(-0.25, ($("#setting_dark_mainColor_active").val() || this.dark_mainColor_active_default), false, true);   // 25% darker (linear)
        this.dark_fontColor = $("#setting_dark_fontColor").val() || this.dark_fontColor_default;
        this.dark_bgColor = $("#setting_dark_bgColor").val() || this.dark_bgColor_default;
        this.title_font =
            $("#setting_title_font")
                .closest(".select")
                .children(".select-options")
                .children(".is-selected")
                .attr("rel") || this.title_font_default;
        this.body_font =
            $("#setting_body_font")
                .closest(".select")
                .children(".select-options")
                .children(".is-selected")
                .attr("rel") || this.body_font_default;
        this.pagination_bottom = $("#setting_pagination_bottom").val() + "px" || this.pagination_bottom_default;
        this.pagination_opacity = $("#setting_pagination_opacity").val() || this.pagination_opacity_default;
        this.show_filter_bar = $("#setting_show_filter_bar").is(":checked") ?? this.show_filter_bar_default;
        this.auto_open_last_book = $("#setting_auto_open_last_book").is(":checked") ?? this.auto_open_last_book_default;

        // Save settings to local storage
        if (forceSetLanguage || (this.respectUserLangSetting && toSetLanguage)) {
            const lang = this.respectUserLangSetting
                ? this.ui_language || CONFIG.RUNTIME_VARS.STYLE.ui_LANG
                : CONFIG.VARS.INIT
                ? this.browser_LANG
                : CONFIG.VARS.IS_EASTERN_LAN
                ? "zh"
                : "en";
            let tempSaveToLocalStorage = true;
            if (!this.respectUserLangSetting && !CONFIG.VARS.INIT) {
                tempSaveToLocalStorage = false;
            }
            this.setLanguage(lang, tempSaveToLocalStorage);
            changeLanguageSelectorItemLanguage($("#setting_uilanguage"), lang);
            changeFontSelectorItemLanguage($("#setting_title_font"), lang);
            changeFontSelectorItemLanguage($("#setting_body_font"), lang);
        }

        localStorage.setItem("respectUserLangSetting", this.respectUserLangSetting);
        document.documentElement.setAttribute("respectUserLangSetting", this.respectUserLangSetting);
        if (this.respectUserLangSetting) {
            localStorage.setItem("UILang", this.ui_language);
        }
        localStorage.setItem("p_lineHeight", this.p_lineHeight);
        localStorage.setItem("p_paragraphSpacing", this.p_paragraphSpacing);
        localStorage.setItem("p_paragraphIndent", this.p_paragraphIndent);
        localStorage.setItem("p_textAlign", this.p_textAlign);
        localStorage.setItem("p_fontSize", this.p_fontSize);
        localStorage.setItem("light_mainColor_active", this.light_mainColor_active);
        localStorage.setItem("light_mainColor_inactive", this.light_mainColor_inactive);
        localStorage.setItem("light_fontColor", this.light_fontColor);
        localStorage.setItem("light_bgColor", this.light_bgColor);
        localStorage.setItem("dark_mainColor_active", this.dark_mainColor_active);
        localStorage.setItem("dark_mainColor_inactive", this.dark_mainColor_inactive);
        localStorage.setItem("dark_fontColor", this.dark_fontColor);
        localStorage.setItem("dark_bgColor", this.dark_bgColor);
        localStorage.setItem("title_font", this.title_font);
        localStorage.setItem("body_font", this.body_font);
        localStorage.setItem("pagination_bottom", this.pagination_bottom);
        localStorage.setItem("pagination_opacity", this.pagination_opacity);
        localStorage.setItem("show_filter_bar", this.show_filter_bar);
        localStorage.setItem("auto_open_last_book", this.auto_open_last_book);

        this.applySettings();

        // Trigger updateAllBookCovers event
        triggerCustomEvent("updateAllBookCovers");
    },

    /**
     * Sets the UI language and updates related elements
     *
     * @public
     * @method setLanguage
     * @memberof settings
     * @instance
     * @param {string} lang - Language code ('en' or 'zh')
     * @param {boolean} saveToLocalStorage - Whether to save language preference
     */
    setLanguage(lang, saveToLocalStorage = true, consoleLog = false) {
        // console.log("setLanguage", { lang, saveToLocalStorage });
        if (saveToLocalStorage) {
            CONFIG.RUNTIME_VARS.WEB_LANG = lang;
            localStorage.setItem("UILang", lang);
        }

        CONFIG.RUNTIME_VARS.STYLE.ui_LANG = lang;
        document.documentElement.setAttribute("data-lang", CONFIG.RUNTIME_VARS.STYLE.ui_LANG);
        CONFIG.RUNTIME_VARS.STYLE = new CSSGlobalVariables();

        const isDefaultTitle =
            document.title === CONFIG.RUNTIME_VARS.STYLE.ui_title_zh ||
            document.title === CONFIG.RUNTIME_VARS.STYLE.ui_title_en;
        if (isDefaultTitle) {
            setTitle();
        }

        // Reset tooltips for specific elements
        // Reset all tooltips
        // document.querySelectorAll(".hasTitle").forEach((el) => {
        // console.log(el);
        // });
        // Optimization: Only reset visible tooltips
        const tooltips = {
            darkModeButton: CONFIG.DOM_ELEMENT.DARK_MODE_ACTUAL_BUTTON,
            bookshelfButton: CONFIG.DOM_ELEMENT.BOOKSHELF_BUTTON,
            settingsButton: CONFIG.DOM_ELEMENT.SETTINGS_BUTTON,
            dropZone: CONFIG.DOM_ELEMENT.DROPZONE,
        };

        if (isVariableDefined(tooltips.darkModeButton)) {
            tooltips.darkModeButton.title = CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_modeToggle;
        }
        if (isVariableDefined(tooltips.bookshelfButton)) {
            tooltips.bookshelfButton.title = CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_goToBookshelf;
        }
        if (isVariableDefined(tooltips.settingsButton)) {
            tooltips.settingsButton.title = CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_settings;
        }
        if (isVariableDefined(tooltips.dropZone)) {
            tooltips.dropZone.title = CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_dropZone;
        }

        if (consoleLog) {
            console.log(`Language set to "${lang}".`);
        }
    },

    /**
     * Enables the settings functionality.
     * When enabled, the module will:
     * - Load saved settings or defaults
     * - Apply the settings to the application
     * - Initialize the settings menu
     *
     * Only performs these actions if the module is not already enabled.
     *
     * @public
     * @async
     * @method enable
     * @memberof settings
     * @instance
     * @returns {Object} The settings instance for method chaining
     */
    async enable() {
        if (!this.enabled) {
            this.enabled = true;
            this.loadSettings();
            this.applySettings();
            if (!this.settingsMenu) {
                this.settingsMenu = await new SettingsMenu(this);
            }
            // console.log("Module <Settings> enabled.");

            // Listen to the updateUILanguage event
            document.addEventListener("updateUILanguage", (e) => {
                const { lang, saveToLocalStorage } = e.detail;
                this.setLanguage(lang, saveToLocalStorage);
                changeLanguageSelectorItemLanguage($("#setting_uilanguage"), lang);
                changeFontSelectorItemLanguage($("#setting_title_font"), lang);
                changeFontSelectorItemLanguage($("#setting_body_font"), lang);
            });

            // Listen to the loadSettings event
            document.addEventListener("loadSettings", (e) => {
                this.loadSettings();
            });

            // Listen to the applySettings event
            document.addEventListener("applySettings", (e) => {
                this.applySettings();
            });

            // Listen to the hideSettingsMenu event
            document.addEventListener("hideSettingsMenu", (e) => {
                if (this.settingsMenu) {
                    this.settingsMenu.hide();
                }
            });

            // Listen to the customFontsLoaded event
            document.addEventListener("customFontsLoaded", async (e) => {
                if (this.settingsMenu) {
                    this.settingsMenu.remove();
                    this.settingsMenu = null;
                    this.settingsMenu = await new SettingsMenu(this);
                }
            });

            // Trigger updateUILanguage event
            triggerCustomEvent("updateUILanguage", {
                lang: CONFIG.RUNTIME_VARS.WEB_LANG,
                saveToLocalStorage: true,
            });
        }
        return this;
    },

    /**
     * Disables the settings functionality.
     * When disabled, the module will:
     * - Remove the settings menu from DOM
     * - Remove the settings button
     * - Set enabled state to false
     *
     * Only performs these actions if the module is currently enabled.
     *
     * @public
     * @method disable
     * @memberof settings
     * @instance
     * @returns {Object} The settings instance for method chaining
     */
    disable() {
        if (this.enabled) {
            if (this.settingsMenu) {
                this.settingsMenu.remove();
                this.settingsMenu = null;
            }
            $("#STRe-setting-btn").remove();
            this.enabled = false;
            console.log("Module <Settings> disabled.");
        }
        return this;
    },

    /**
     * Initializes the settings module by creating the settings button.
     * Creates a button with:
     * - SVG icon for settings
     * - Click handler to toggle settings menu
     * - Tooltip with settings label
     * - Proper positioning in the button wrapper
     *
     * The button is created with all necessary event listeners and
     * visual elements, ready to be used for opening/closing the settings menu.
     *
     * @public
     * @async
     * @method init
     * @memberof settings
     * @instance
     */
    async init() {
        const $button =
            $(`<div id="STRe-setting-btn" class="btn-icon hasTitle" title="${CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_settings}">
            ${ICONS.SETTINGS}
            </div>`);

        $button.on("click", () => {
            (async () => {
                // setSvgPathLength($button.get(0));
                if (!this.settingsMenu) {
                    this.settingsMenu = await new SettingsMenu(this);
                }

                if (CONFIG.VARS.SETTINGS_MENU_SHOWN) {
                    this.settingsMenu.hide();
                } else {
                    await this.settingsMenu.show();
                }
            })();
        });
        $button.appendTo($("#btnWrapper"));
        // .hide();
    },
};

/**
 * Initializes the settings module
 * @public
 * @async
 */
export async function initSettings() {
    // Enable settings functionality
    if (CONFIG.RUNTIME_CONFIG.ENABLE_SETTINGS) {
        await settings.init();
        await settings.enable();
    }
}
