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
 * @module modules/ui/settings
 * @requires config
 * @requires file/css-global-variables
 * @requires dropdown-selector
 * @requires color-picker
 * @requires utils/base
 * @requires utils/helpers-settings
 * @requires utils/helpers-reader
 */

import * as CONFIG from "../../config/index.js";
import { CSSGlobalVariables } from "../file/css-global-variables.js";
import { getDropdownSelector } from "./dropdown-selector.js";
import { getColorPicker } from "./color-picker.js";
import { isVariableDefined, HSLToHex, hexToHSL, pSBC } from "../../utils/base.js";
import {
    setRangeValue,
    setColorValue,
    setSelectorValue,
    createRangeItem,
    createColorItem,
    createSelectorItem,
    createFontSelectorItem,
    findFontIndex,
    changeFontSelectorItemLanguage,
    handleClickOutsideBox,
} from "../../utils/helpers-settings.js";
import { setTitle } from "../../utils/helpers-reader.js";

/**
 * Settings module for managing UI and style configurations.
 * @private
 * @namespace
 */
const settings = {
    enabled: false,

    // Default settings
    ui_language_default: CONFIG.RUNTIME_VARS.STYLE.ui_LANG,
    p_lineHeight_default: CONFIG.RUNTIME_VARS.STYLE.p_lineHeight,
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

    // Current settings
    ui_language: null,
    p_lineHeight: null,
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

    /**
     * Loads user settings from local storage or falls back to default values.
     * Settings include:
     * - UI language (if user language setting is respected)
     * - Paragraph line height and font size
     * - Light mode colors (main active/inactive, font, background)
     * - Dark mode colors (main active/inactive, font, background)
     * - Title and body fonts
     * - Pagination position and opacity
     *
     * @public
     * @method loadSettings
     * @memberof settings
     * @instance
     */
    loadSettings() {
        if (CONFIG.RUNTIME_VARS.RESPECT_USER_LANG_SETTING) {
            this.ui_language = localStorage.getItem("UILang") || this.ui_language_default;
        }
        this.p_lineHeight = localStorage.getItem("p_lineHeight") || this.p_lineHeight_default;
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

        // console.log(localStorage.getItem("UILang"));
        // console.log(this.ui_language_default);
        // console.log(localStorage.getItem("p_lineHeight"));
        // console.log(this.p_lineHeight_default);
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
        if (CONFIG.RUNTIME_VARS.RESPECT_USER_LANG_SETTING) {
            this.ui_language = this.ui_language_default;
        }
        this.p_lineHeight = this.p_lineHeight_default;
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

        if (CONFIG.RUNTIME_VARS.RESPECT_USER_LANG_SETTING) {
            setSelectorValue(
                "setting_uilanguage",
                Object.keys(CONFIG.CONST_UI.LANGUAGE_MAPPING).indexOf(this.ui_language)
            );
        }
        setRangeValue("setting_p_lineHeight", this.p_lineHeight);
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
        if (CONFIG.RUNTIME_VARS.RESPECT_USER_LANG_SETTING) {
            CONFIG.RUNTIME_VARS.STYLE.ui_LANG = this.ui_language;
        }
        CONFIG.RUNTIME_VARS.STYLE.p_lineHeight = this.p_lineHeight;
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

        if (CONFIG.RUNTIME_VARS.STYLE.ui_Mode === "dark") {
            CONFIG.RUNTIME_VARS.STYLE.mainColor_active = CONFIG.RUNTIME_VARS.STYLE.darkMode_mainColor_active;
            CONFIG.RUNTIME_VARS.STYLE.mainColor_inactive = CONFIG.RUNTIME_VARS.STYLE.darkMode_mainColor_inactive;
            CONFIG.RUNTIME_VARS.STYLE.fontColor = CONFIG.RUNTIME_VARS.STYLE.darkMode_fontColor;
            CONFIG.RUNTIME_VARS.STYLE.bgColor = CONFIG.RUNTIME_VARS.STYLE.darkMode_bgColor;
        }
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
     *
     * @fires bookshelf#updatePagination - When pagination settings are changed
     * @fires bookshelf#updateFontFamily - When font settings are changed
     * @fires bookshelf#updateColors - When color settings are changed
     */
    saveSettings(toSetLanguage = false, forceSetLanguage = false) {
        // console.log("saveSettings");
        if (CONFIG.RUNTIME_VARS.RESPECT_USER_LANG_SETTING) {
            this.ui_language =
                $("#setting_uilanguage")
                    .closest(".select")
                    .children(".select-options")
                    .children(".is-selected")
                    .attr("rel") || this.ui_language_default;
        }
        this.p_lineHeight = $("#setting_p_lineHeight").val() + "em" || this.p_lineHeight_default;
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

        if (forceSetLanguage || (CONFIG.RUNTIME_VARS.RESPECT_USER_LANG_SETTING && toSetLanguage)) {
            const lang = this.ui_language || CONFIG.RUNTIME_VARS.STYLE.ui_LANG;
            this.setLanguage(lang);
            changeFontSelectorItemLanguage($("#setting_title_font"), lang);
            changeFontSelectorItemLanguage($("#setting_body_font"), lang);
        }

        if (CONFIG.RUNTIME_VARS.RESPECT_USER_LANG_SETTING) {
            localStorage.setItem("UILang", this.ui_language);
        }
        localStorage.setItem("p_lineHeight", this.p_lineHeight);
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

        this.applySettings();

        // Trigger updateAllBookCovers event
        document.dispatchEvent(new CustomEvent("updateAllBookCovers"));
    },

    /**
     * Sets the UI language and updates related elements
     * @param {string} lang - Language code ('en' or 'zh')
     * @param {boolean} saveToLocalStorage - Whether to save language preference
     */
    setLanguage(lang, saveToLocalStorage = true) {
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
        // reset all tooltips
        // document.querySelectorAll(".hasTitle").forEach((el) => {
        // console.log(el);
        // });
        // only reset visible tooltips
        const tooltips = {
            darkModeButton: CONFIG.DOM_ELEMENT.DARK_MODE_ACTUAL_BUTTON,
            bookshelfButton: CONFIG.DOM_ELEMENT.BOOKSHELF_BUTTON,
            settingsButton: CONFIG.DOM_ELEMENT.SETTINGS_BUTTON,
        };

        if (isVariableDefined(tooltips.darkModeButton)) {
            tooltips.darkModeButton.title = CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_modeToggle;
        }
        if (isVariableDefined(tooltips.bookshelfButton)) {
            tooltips.bookshelfButton.title = CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_goToLibrary;
        }
        if (isVariableDefined(tooltips.settingsButton)) {
            tooltips.settingsButton.title = CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_settings;
        }

        console.log(`Language set to "${lang}".`);
    },

    /**
     * Creates and initializes the settings menu interface.
     *
     * Creates a menu with controls for:
     * - Language selection (if enabled)
     * - Text styling (line height, font size)
     * - Color pickers for light/dark modes
     * - Font selectors
     * - Pagination controls
     * - Reset button
     *
     * The menu includes:
     * - Event listeners for outside clicks
     * - Color picker initialization
     * - Dropdown selectors for fonts and language
     * - Range inputs for numeric values
     * - Scroll event handling for nested menus
     *
     * @public
     * @method initiateSettingMenu
     * @memberof settings
     * @instance
     *
     * @fires getColorPicker - Initializes color picker components
     * @fires getDropdownSelector - Initializes dropdown selection components
     */
    async initiateSettingMenu() {
        const settingsMenu = document.createElement("div");
        settingsMenu.setAttribute("id", "settings-menu");

        // Initial styles
        settingsMenu.style.display = "none";
        settingsMenu.style.visibility = "hidden";
        settingsMenu.style.zIndex = "-1";
        settingsMenu.style.transition = "none";

        // Prevent scrolling the outer page when scrolling within the settings menu
        settingsMenu.addEventListener("wheel", function (event) {
            const target = event.target;

            // If the target is inside a scrollable list (UL or OL), check its scroll status
            let scrollableParent = null;

            // Find the scrollable parent (UL or OL that actually has scrollable content)
            if (target.tagName === "LI") {
                scrollableParent = target.closest("ul, ol");
            }

            if (scrollableParent) {
                // Get scrollable elements (for dropdown menu)
                const maxScrollTop = scrollableParent.scrollHeight - scrollableParent.clientHeight;

                if (
                    (event.deltaY < 0 && scrollableParent.scrollTop === 0) ||
                    (event.deltaY > 0 && scrollableParent.scrollTop >= maxScrollTop)
                ) {
                    // Prevent scrolling from bubbling up when reaching the top or bottom of UL/OL element
                    event.preventDefault();
                }

                return; // Allow scrolling within the scrollable UL/OL itself
            }

            // Handle scrolling within the settings-menu itself
            const deltaY = event.deltaY;
            const contentHeight = settingsMenu.scrollHeight; // Total height of the content in settings-menu
            const visibleHeight = settingsMenu.offsetHeight; // Visible height of settings-menu
            const scrollTop = settingsMenu.scrollTop; // Current scroll position

            // Prevent scrolling the parent when at the top or bottom of the settings-menu
            if ((deltaY < 0 && scrollTop === 0) || (deltaY > 0 && scrollTop + visibleHeight >= contentHeight)) {
                event.preventDefault(); // Prevent scrolling the outer page
            }

            // Stop the scroll event from propagating to the outer document
            event.stopPropagation();
        });

        let settingUILanguage = null;
        if (CONFIG.RUNTIME_VARS.RESPECT_USER_LANG_SETTING) {
            settingUILanguage = createSelectorItem(
                "setting_uilanguage",
                Object.keys(CONFIG.CONST_UI.LANGUAGE_MAPPING),
                Object.values(CONFIG.CONST_UI.LANGUAGE_MAPPING)
            );
        }
        const settingLineHeight = createRangeItem(
            "setting_p_lineHeight",
            parseFloat(this.p_lineHeight),
            1,
            3,
            0.5,
            "em",
            this.saveSettings.bind(this)
        );
        const settingFontSize = createRangeItem(
            "setting_p_fontSize",
            parseFloat(this.p_fontSize),
            1,
            3,
            0.5,
            "em",
            this.saveSettings.bind(this)
        );
        const settingLightMainColorActive = createColorItem(
            "setting_light_mainColor_active",
            this.light_mainColor_active,
            ["#2F5086"],
            this.saveSettings.bind(this)
        );
        const settingLightFontColor = createColorItem(
            "setting_light_fontColor",
            this.light_fontColor,
            ["black"],
            this.saveSettings.bind(this)
        );
        const settingLightBgColor = createColorItem(
            "setting_light_bgColor",
            this.light_bgColor,
            ["#FDF3DF"],
            this.saveSettings.bind(this)
        );
        const settingDarkMainColorActive = createColorItem(
            "setting_dark_mainColor_active",
            this.dark_mainColor_active,
            ["#6096BB"],
            this.saveSettings.bind(this)
        );
        const settingDarkFontColor = createColorItem(
            "setting_dark_fontColor",
            this.dark_fontColor,
            ["#F2E6CE"],
            this.saveSettings.bind(this)
        );
        const settingDarkBgColor = createColorItem(
            "setting_dark_bgColor",
            this.dark_bgColor,
            ["#0D1018"],
            this.saveSettings.bind(this)
        );
        const settingTitleFont_ = await createFontSelectorItem("setting_title_font");
        const settingTitleFont_en = settingTitleFont_[0];
        const settingTitleFont_zh = settingTitleFont_[1];
        const settingBodyFont_ = await createFontSelectorItem("setting_body_font");
        const settingBodyFont_en = settingBodyFont_[0];
        const settingBodyFont_zh = settingBodyFont_[1];
        const settingPaginationBottom = createRangeItem(
            "setting_pagination_bottom",
            parseFloat(this.pagination_bottom),
            1,
            30,
            1,
            "px",
            this.saveSettings.bind(this)
        );
        const settingPaginationOpacity = createRangeItem(
            "setting_pagination_opacity",
            parseFloat(this.pagination_opacity),
            0,
            1,
            0.1,
            "",
            this.saveSettings.bind(this)
        );

        if (CONFIG.RUNTIME_VARS.RESPECT_USER_LANG_SETTING) {
            settingsMenu.appendChild(settingUILanguage);
        }
        settingsMenu.appendChild(settingLineHeight);
        settingsMenu.appendChild(settingFontSize);
        settingsMenu.appendChild(settingLightMainColorActive);
        settingsMenu.appendChild(settingLightFontColor);
        settingsMenu.appendChild(settingLightBgColor);
        settingsMenu.appendChild(settingDarkMainColorActive);
        settingsMenu.appendChild(settingDarkFontColor);
        settingsMenu.appendChild(settingDarkBgColor);
        // settingsMenu.appendChild(settingTitleFont);
        // settingsMenu.appendChild(settingBodyFont);
        const language = !CONFIG.RUNTIME_VARS.RESPECT_USER_LANG_SETTING
            ? CONFIG.RUNTIME_VARS.STYLE.ui_LANG
            : this.ui_language;
        if (language === "zh") {
            settingsMenu.appendChild(settingTitleFont_zh);
            settingsMenu.appendChild(settingBodyFont_zh);
        } else {
            settingsMenu.appendChild(settingTitleFont_en);
            settingsMenu.appendChild(settingBodyFont_en);
        }
        settingsMenu.appendChild(settingPaginationBottom);
        settingsMenu.appendChild(settingPaginationOpacity);

        const settingButtons = document.createElement("div");
        settingButtons.setAttribute("style", "padding:4px;");
        const settingReset = document.createElement("button");
        settingReset.setAttribute("id", "setting-reset-btn");
        settingReset.setAttribute("type", "button");
        settingReset.addEventListener("click", (e) => {
            this.loadDefaultSettings();
            this.saveSettings(false, true);
        });
        settingButtons.appendChild(settingReset);
        settingsMenu.appendChild(settingButtons);
        document.body.appendChild(settingsMenu);

        // Add click event listener
        document.addEventListener("click", (event) => {
            const actions = handleClickOutsideBox(event);
            if (actions) {
                if (actions.shouldSave) {
                    this.saveSettings();
                }
                if (actions.shouldHide) {
                    this.hideSettingMenu();
                }
            }
        });
        // settingsMenu_shown = true;

        // Render color picker
        setTimeout(() => {
            getColorPicker(this.saveSettings.bind(this));
        }, 200);

        // Manually set settings value
        document.getElementById("setting_p_lineHeight").value = parseFloat(this.p_lineHeight);
        document.getElementById("setting_p_fontSize").value = parseFloat(this.p_fontSize);
        document.getElementById("setting_pagination_bottom").value = parseFloat(this.pagination_bottom);
        document.getElementById("setting_pagination_opacity").value = parseFloat(this.pagination_opacity);

        // Render selector
        if (CONFIG.RUNTIME_VARS.RESPECT_USER_LANG_SETTING) {
            getDropdownSelector(
                $("#setting_uilanguage"),
                Object.keys(CONFIG.CONST_UI.LANGUAGE_MAPPING).indexOf(this.ui_language),
                this.saveSettings.bind(this),
                [true, true]
            );
        }
        getDropdownSelector($("#setting_title_font"), findFontIndex(this.title_font), this.saveSettings.bind(this), [
            false,
            false,
        ]);
        getDropdownSelector($("#setting_body_font"), findFontIndex(this.body_font), this.saveSettings.bind(this), [
            false,
            false,
        ]);
    },

    /**
     * Displays the settings menu by setting its visibility and z-index.
     * If the menu doesn't exist, it will be created first.
     *
     * The menu is displayed by:
     * - Setting display to "block"
     * - Setting a high z-index to ensure it's above other elements
     * - Setting visibility to "visible"
     * - Updating the global menu state
     *
     * @public
     * @method showSettingMenu
     * @memberof settings
     * @instance
     *
     * @see initiateSettingMenu
     */
    async showSettingMenu() {
        const menu = CONFIG.DOM_ELEMENT.SETTINGS_MENU;
        if (!menu) {
            await this.initiateSettingMenu();
        }

        menu.style.display = "block"; // or "initial"
        menu.style.zIndex = "9999";
        menu.style.visibility = "visible";
        CONFIG.VARS.SETTINGS_MENU_SHOWN = true;
    },

    /**
     * Hides the settings menu by adjusting its visibility properties.
     *
     * The menu is hidden by:
     * - Setting display to "none"
     * - Setting a negative z-index
     * - Setting visibility to "hidden"
     * - Updating the global menu state
     * - Removing focus from the settings button
     *
     * @public
     * @method hideSettingMenu
     * @memberof settings
     * @instance
     */
    hideSettingMenu() {
        const menu = CONFIG.DOM_ELEMENT.SETTINGS_MENU;
        if (menu) {
            menu.style.display = "none";
            menu.style.zIndex = "-1";
            menu.style.visibility = "hidden";
        }

        CONFIG.VARS.SETTINGS_MENU_SHOWN = false;

        // Manually remove focus
        const settingsBtn = CONFIG.DOM_ELEMENT.SETTINGS_BUTTON;
        if (settingsBtn) {
            settingsBtn.blur();
        }
    },

    /**
     * Removes the settings menu from the DOM and detaches the click event listener.
     * This completely removes the menu rather than just hiding it, which is useful for:
     * - Complete cleanup when disabling settings
     * - Ensuring a fresh state when re-creating the menu
     * - Removing event listeners to prevent memory leaks
     *
     * @public
     * @method removeSettingMenu
     * @memberof settings
     * @instance
     *
     * @see hideSettingMenu
     * @see initiateSettingMenu
     */
    removeSettingMenu() {
        const menu = CONFIG.DOM_ELEMENT.SETTINGS_MENU;
        if (isVariableDefined(menu)) {
            menu.remove();
            // Remove click event listener
            document.removeEventListener("click", handleClickOutsideBox);
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
     * @method enable
     * @memberof settings
     * @instance
     * @returns {Object} The settings instance for method chaining
     *
     * @see loadSettings
     * @see applySettings
     * @see initiateSettingMenu
     */
    async enable() {
        if (!this.enabled) {
            this.enabled = true;
            this.loadSettings();
            this.applySettings();
            await this.initiateSettingMenu();
            // console.log("Module <Settings> enabled.");

            // Listen to the updateUILanguage event
            document.addEventListener("updateUILanguage", (event) => {
                const { lang, saveToLocalStorage } = event.detail;
                this.setLanguage(lang, saveToLocalStorage);
                changeFontSelectorItemLanguage($("#setting_title_font"), lang);
                changeFontSelectorItemLanguage($("#setting_body_font"), lang);
            });

            // Listen to the loadSettings event
            document.addEventListener("loadSettings", (event) => {
                this.loadSettings();
            });

            // Listen to the applySettings event
            document.addEventListener("applySettings", (event) => {
                this.applySettings();
            });

            // Listen to the hideSettingMenu event
            document.addEventListener("hideSettingMenu", (event) => {
                this.hideSettingMenu();
            });

            // Dispatch updateUILanguage event
            document.dispatchEvent(
                new CustomEvent("updateUILanguage", {
                    detail: {
                        lang: CONFIG.RUNTIME_VARS.WEB_LANG,
                        saveToLocalStorage: true,
                    },
                })
            );
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
     *
     * @see removeSettingMenu
     */
    disable() {
        if (this.enabled) {
            this.removeSettingMenu();
            $("#STRe-setting-btn").remove();
            this.enabled = false;
            // console.log("Module <Settings> disabled.");
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
     * @method init
     * @memberof settings
     * @instance
     *
     * @see showSettingMenu
     * @see hideSettingMenu
     */
    async init() {
        $(`<div id="STRe-setting-btn" class="btn-icon hasTitle" title="${CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_settings}">
            <svg class="icon-nofill" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path class="tofill" fill-rule="evenodd" clip-rule="evenodd" d="M11.567 9.8895C12.2495 8.90124 12.114 7.5637 11.247 6.7325C10.3679 5.88806 9.02339 5.75928 7.99998 6.4215C7.57983 6.69308 7.25013 7.0837 7.05298 7.5435C6.85867 7.99881 6.80774 8.50252 6.90698 8.9875C7.00665 9.47472 7.25054 9.92071 7.60698 10.2675C7.97021 10.6186 8.42786 10.8563 8.92398 10.9515C9.42353 11.049 9.94062 11.0001 10.413 10.8105C10.8798 10.6237 11.2812 10.3033 11.567 9.8895Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path class="tofill" fill-rule="evenodd" clip-rule="evenodd" d="M12.433 17.8895C11.7504 16.9012 11.886 15.5637 12.753 14.7325C13.6321 13.8881 14.9766 13.7593 16 14.4215C16.4202 14.6931 16.7498 15.0837 16.947 15.5435C17.1413 15.9988 17.1922 16.5025 17.093 16.9875C16.9933 17.4747 16.7494 17.9207 16.393 18.2675C16.0298 18.6186 15.5721 18.8563 15.076 18.9515C14.5773 19.0481 14.0614 18.9988 13.59 18.8095C13.1222 18.6234 12.7197 18.3034 12.433 17.8895V17.8895Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path class="tofill" d="M12 7.75049C11.5858 7.75049 11.25 8.08627 11.25 8.50049C11.25 8.9147 11.5858 9.25049 12 9.25049V7.75049ZM19 9.25049C19.4142 9.25049 19.75 8.9147 19.75 8.50049C19.75 8.08627 19.4142 7.75049 19 7.75049V9.25049ZM6.857 9.25049C7.27121 9.25049 7.607 8.9147 7.607 8.50049C7.607 8.08627 7.27121 7.75049 6.857 7.75049V9.25049ZM5 7.75049C4.58579 7.75049 4.25 8.08627 4.25 8.50049C4.25 8.9147 4.58579 9.25049 5 9.25049V7.75049ZM12 17.2505C12.4142 17.2505 12.75 16.9147 12.75 16.5005C12.75 16.0863 12.4142 15.7505 12 15.7505V17.2505ZM5 15.7505C4.58579 15.7505 4.25 16.0863 4.25 16.5005C4.25 16.9147 4.58579 17.2505 5 17.2505V15.7505ZM17.143 15.7505C16.7288 15.7505 16.393 16.0863 16.393 16.5005C16.393 16.9147 16.7288 17.2505 17.143 17.2505V15.7505ZM19 17.2505C19.4142 17.2505 19.75 16.9147 19.75 16.5005C19.75 16.0863 19.4142 15.7505 19 15.7505V17.2505ZM12 9.25049H19V7.75049H12V9.25049ZM6.857 7.75049H5V9.25049H6.857V7.75049ZM12 15.7505H5V17.2505H12V15.7505ZM17.143 17.2505H19V15.7505H17.143V17.2505Z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            </div>`)
            .on("click", () => {
                (async () => {
                    if (CONFIG.VARS.SETTINGS_MENU_SHOWN) {
                        this.hideSettingMenu();
                    } else {
                        await this.showSettingMenu();
                    }
                })();
            })
            .appendTo($("#btnWrapper"));
        // .hide();
    },
};

/**
 * Initializes the settings module
 * @public
 */
export async function initSettings() {
    // Enable settings functionality
    if (CONFIG.RUNTIME_CONFIG.ENABLE_SETTINGS) {
        await settings.init();
        await settings.enable();
    }
}
