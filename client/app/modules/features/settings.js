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
 * @requires client/app/config/index
 * @requires client/app/config/icons
 * @requires shared/core/callback/callback-registry
 * @requires client/app/modules/components/dropdown-selector
 * @requires client/app/modules/components/custom-custom-color-picker
 * @requires client/app/modules/components/popup-manager
 * @requires client/app/utils/base
 * @requires client/app/utils/helpers-settings
 * @requires client/app/utils/helpers-reader
 * @requires client/app/utils/helpers-ui
 */

import * as CONFIG from "../../config/index.js";
import { ICONS } from "../../config/icons.js";
import { cbReg } from "../../../../shared/core/callback/callback-registry.js";
import { getDropdownSelector } from "../components/dropdown-selector.js";
import { getColorPicker } from "../components/custom-color-picker.js";
import { PopupManager } from "../components/popup-manager.js";
import {
    isVariableDefined,
    HSLToHex,
    hexToHSL,
    pSBC,
    toBool,
    handleGlobalWheel,
    snakeToCamel,
    fetchVersionData,
    fetchVersion,
    setDeep,
    getFontOffsets,
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
import { updateVersionData, getCurrentDisplayLanguage } from "../../utils/helpers-ui.js";

/**
 * Array of setting definitions used to configure the application's settings UI and logic.
 *
 * Each object in the array represents a single setting, and defines how it appears and behaves in the settings menu.
 * Common fields for each setting include:
 *   - key:         {string}    Unique identifier for the setting (used in storage and code)
 *   - type:        {string}    Type of setting input ('checkbox', 'range', 'color', 'select', 'font', etc.)
 *   - tab:         {string}    Name of the settings tab where the setting is grouped ('general', 'theme', etc.)
 *   - label:       {string}    Localization key or label to display in the UI
 *   - default:     {any}       Default value for this setting
 *   - options:     {Array}     (Optional) Array of option values for 'select' inputs
 *   - optionLabels:{Array}     (Optional) Array of display labels for select options
 *   - min:         {number}    (Optional) Minimum value (for range settings)
 *   - max:         {number}    (Optional) Maximum value (for range settings)
 *   - step:        {number}    (Optional) Step size (for range settings)
 *   - unit:        {string}    (Optional) Unit for range input (e.g., 'em', 'px', '%')
 *   - palette:     {Array}     (Optional) Array of color swatch values for color pickers
 *   - persist:     {boolean}   Whether to persist this setting in localStorage
 *   - hidden:      {boolean}   Whether to hide this setting in the UI (e.g., computed or system value)
 *   - bind:        {string|Array<string>}  Path(s) to runtime variable(s) this setting should update
 *   - inputRef:    {string}    (Optional) Label of another setting item whose input element should be used
 *                              for computing this setting’s value (useful for derived/computed values)
 *   - getValue:    {Function}  (Optional) Custom function to compute the value from the input (for derived settings)
 *   - onApply:     {Function}  (Optional) Custom function to run after this value is set (side effects, etc.)
 *
 * @constant
 * @type {Array<Object>}
 * @memberof module:client/app/modules/features/settings
 */
const SETTINGS_SCHEMA = [
    // ==== General Tab ====
    {
        key: "ui_language",
        type: "select",
        tab: "general",
        label: "setting_ui_language",
        bind: "CONFIG.RUNTIME_VARS.STYLE.ui_LANG",
        default: CONFIG.RUNTIME_VARS.STYLE.ui_LANG_default,
        options: ["auto", ...Object.keys(CONFIG.CONST_UI.LANGUAGE_MAPPING)],
        optionLabels: [CONFIG.RUNTIME_VARS.STYLE.ui_language_text, ...Object.values(CONFIG.CONST_UI.LANGUAGE_MAPPING)],
        persist: true,
    },
    {
        key: "show_filter_bar",
        type: "checkbox",
        tab: "general",
        label: "setting_show_filter_bar",
        bind: "CONFIG.CONST_CONFIG.SHOW_FILTER_BAR",
        default: CONFIG.CONST_CONFIG.SHOW_FILTER_BAR_DEFAULT,
        persist: true,
    },
    {
        key: "show_helper_btn",
        type: "checkbox",
        tab: "general",
        label: "setting_show_helper_btn",
        bind: "CONFIG.CONST_CONFIG.SHOW_HELPER_BTN",
        default: CONFIG.CONST_CONFIG.SHOW_HELPER_BTN_DEFAULT,
        persist: true,
    },
    {
        key: "enable_custom_cursor",
        type: "checkbox",
        tab: "general",
        label: "setting_enable_custom_cursor",
        bind: "CONFIG.CONST_CONFIG.ENABLE_CUSTOM_CURSOR",
        default: CONFIG.CONST_CONFIG.ENABLE_CUSTOM_CURSOR_DEFAULT,
        persist: true,
    },
    {
        key: "auto_open_last_book",
        type: "checkbox",
        tab: "general",
        label: "setting_auto_open_last_book",
        bind: "CONFIG.CONST_CONFIG.AUTO_OPEN_LAST_BOOK",
        default: CONFIG.CONST_CONFIG.AUTO_OPEN_LAST_BOOK_DEFAULT,
        persist: true,
    },
    {
        key: "infinite_scroll_mode",
        type: "checkbox",
        tab: "general",
        label: "setting_infinite_scroll_mode",
        bind: "CONFIG.CONST_CONFIG.INFINITE_SCROLL_MODE",
        default: CONFIG.CONST_CONFIG.INFINITE_SCROLL_MODE_DEFAULT,
        persist: true,
    },

    // ==== Theme Tab (Light) ====
    {
        key: "light_mainColor_active",
        type: "color",
        tab: "theme",
        label: "setting_light_mainColor_active",
        bind: "CONFIG.RUNTIME_VARS.STYLE.mainColor_active",
        default: CONFIG.RUNTIME_VARS.STYLE.mainColor_active_default,
        palette: ["#2F5086"],
        persist: true,
    },
    {
        key: "light_mainColor_inactive",
        type: "color",
        tab: "theme",
        label: "setting_light_mainColor_inactive",
        bind: "CONFIG.RUNTIME_VARS.STYLE.mainColor_inactive",
        default: CONFIG.RUNTIME_VARS.STYLE.mainColor_inactive_default,
        hidden: true, // auto-calculated via getValue, not shown in UI
        persist: true,
        inputRef: "setting_light_mainColor_active",
        getValue: function ($input) {
            // Always derive from the "active" color input
            const mainColorActive = $input.val() || this.defaults.light_mainColor_active;
            const mainColorInactive = HSLToHex(...hexToHSL(mainColorActive, 1.5));
            // const mainColorInactive = pSBC(0.25, mainColorActive, false, true); // 25% lighter (linear)
            return mainColorInactive;
        },
    },
    {
        key: "light_fontColor",
        type: "color",
        tab: "theme",
        label: "setting_light_fontColor",
        bind: "CONFIG.RUNTIME_VARS.STYLE.fontColor",
        default: CONFIG.RUNTIME_VARS.STYLE.fontColor_default,
        palette: ["black"],
        persist: true,
    },
    {
        key: "light_bgColor",
        type: "color",
        tab: "theme",
        label: "setting_light_bgColor",
        bind: "CONFIG.RUNTIME_VARS.STYLE.bgColor",
        default: CONFIG.RUNTIME_VARS.STYLE.bgColor_default,
        palette: ["#FDF3DF"],
        persist: true,
    },

    // ==== Theme Tab (Dark) ====
    {
        key: "dark_mainColor_active",
        type: "color",
        tab: "theme",
        label: "setting_dark_mainColor_active",
        bind: "CONFIG.RUNTIME_VARS.STYLE.darkMode_mainColor_active",
        default: CONFIG.RUNTIME_VARS.STYLE.darkMode_mainColor_active_default,
        palette: ["#6096BB"],
        persist: true,
    },
    {
        key: "dark_mainColor_inactive",
        type: "color",
        tab: "theme",
        label: "setting_dark_mainColor_inactive",
        bind: "CONFIG.RUNTIME_VARS.STYLE.darkMode_mainColor_inactive",
        default: CONFIG.RUNTIME_VARS.STYLE.darkMode_mainColor_inactive_default,
        hidden: true, // auto-calculated via getValue, not shown in UI
        persist: true,
        inputRef: "setting_dark_mainColor_active",
        getValue: function ($input) {
            // Always derive from the "active" color input
            const mainColorActive = $input.val() || this.defaults.dark_mainColor_active;
            const mainColorInactive = HSLToHex(...hexToHSL(mainColorActive, 0.5));
            // const mainColorInactive = pSBC(-0.25, mainColorActive, false, true);   // 25% darker (linear)
            return mainColorInactive;
        },
    },
    {
        key: "dark_fontColor",
        type: "color",
        tab: "theme",
        label: "setting_dark_fontColor",
        bind: "CONFIG.RUNTIME_VARS.STYLE.darkMode_fontColor",
        default: CONFIG.RUNTIME_VARS.STYLE.darkMode_fontColor_default,
        palette: ["#F2E6CE"],
        persist: true,
    },
    {
        key: "dark_bgColor",
        type: "color",
        tab: "theme",
        label: "setting_dark_bgColor",
        bind: "CONFIG.RUNTIME_VARS.STYLE.darkMode_bgColor",
        default: CONFIG.RUNTIME_VARS.STYLE.darkMode_bgColor_default,
        palette: ["#0D1018"],
        persist: true,
    },

    // ==== Content-Style Tab ====
    {
        key: "title_font",
        type: "select-font",
        tab: "content-style",
        label: "setting_title_font",
        bind: [
            "CONFIG.RUNTIME_VARS.STYLE.title_font",
            "CONFIG.RUNTIME_VARS.STYLE.fontFamily_title",
            "CONFIG.RUNTIME_VARS.STYLE.fontFamily_title_zh",
            "CONFIG.RUNTIME_VARS.STYLE.fontFamily_title_en",
        ],
        default: `${CONFIG.RUNTIME_VARS.STYLE.fontFamily_title}, ${CONFIG.RUNTIME_VARS.STYLE.fontFamily_ui}`,
        persist: true,
        getValue: function ($input) {
            const selected = $input.closest(".select").children(".select-options").children(".is-selected").attr("rel");
            return `${selected}, ${CONFIG.RUNTIME_VARS.STYLE.fontFamily_ui}` || this.defaults.title_font;
        },
    },
    {
        key: "body_font",
        type: "select-font",
        tab: "content-style",
        label: "setting_body_font",
        bind: [
            "CONFIG.RUNTIME_VARS.STYLE.body_font",
            "CONFIG.RUNTIME_VARS.STYLE.fontFamily_body",
            "CONFIG.RUNTIME_VARS.STYLE.fontFamily_body_zh",
            "CONFIG.RUNTIME_VARS.STYLE.fontFamily_body_en",
        ],
        default: `${CONFIG.RUNTIME_VARS.STYLE.fontFamily_body}, ${CONFIG.RUNTIME_VARS.STYLE.fontFamily_ui}`,
        persist: true,
        getValue: function ($input) {
            const selected = $input.closest(".select").children(".select-options").children(".is-selected").attr("rel");
            return `${selected}, ${CONFIG.RUNTIME_VARS.STYLE.fontFamily_ui}` || this.defaults.body_font;
        },
    },
    {
        key: "p_fontSize",
        type: "range",
        tab: "content-style",
        label: "setting_p_fontSize",
        bind: "CONFIG.RUNTIME_VARS.STYLE.p_fontSize",
        default: CONFIG.RUNTIME_VARS.STYLE.p_fontSize_default,
        min: 1,
        max: 3,
        step: 0.5,
        unit: "em",
        persist: true,
        onApply: function (value) {
            const match = value.match(/^([\d.]+)([a-z%]+)?$/i);
            const num = match ? parseFloat(match[1]) : 1;
            const unit = match && match[2] ? match[2] : "em";

            CONFIG.RUNTIME_VARS.STYLE.footnote_fontSize = `${(num * 2) / 3}${unit}`;
        },
    },
    {
        key: "p_lineHeight",
        type: "range",
        tab: "content-style",
        label: "setting_p_lineHeight",
        bind: "CONFIG.RUNTIME_VARS.STYLE.p_lineHeight",
        default: CONFIG.RUNTIME_VARS.STYLE.p_lineHeight_default,
        min: 1,
        max: 3,
        step: 0.5,
        unit: "em",
        persist: true,
    },
    {
        key: "p_paragraphSpacing",
        type: "range",
        tab: "content-style",
        label: "setting_p_paragraphSpacing",
        bind: "CONFIG.RUNTIME_VARS.STYLE.p_paragraphSpacing",
        default: CONFIG.RUNTIME_VARS.STYLE.p_paragraphSpacing_default,
        min: 1,
        max: 3,
        step: 0.5,
        unit: "em",
        persist: true,
    },
    {
        key: "p_paragraphIndent",
        type: "checkbox",
        tab: "content-style",
        label: "setting_p_paragraphIndent",
        bind: "CONFIG.RUNTIME_VARS.STYLE.p_paragraphIndent",
        default: toBool(CONFIG.RUNTIME_VARS.STYLE.p_paragraphIndent_default, false),
        persist: true,
        onApply: function (value) {
            CONFIG.RUNTIME_VARS.STYLE.p_paragraphIndent_value = value
                ? CONFIG.RUNTIME_VARS.STYLE.p_paragraphIndent_value_true
                : CONFIG.RUNTIME_VARS.STYLE.p_paragraphIndent_value_false;
        },
    },
    {
        key: "p_textAlign",
        type: "checkbox",
        tab: "content-style",
        label: "setting_p_textAlign",
        bind: "CONFIG.RUNTIME_VARS.STYLE.p_textAlign",
        default: toBool(CONFIG.RUNTIME_VARS.STYLE.p_textAlign_default, false),
        persist: true,
        onApply: function (value) {
            CONFIG.RUNTIME_VARS.STYLE.p_textAlign_value = value
                ? CONFIG.RUNTIME_VARS.STYLE.p_textAlign_value_true
                : CONFIG.RUNTIME_VARS.STYLE.p_textAlign_value_false;
        },
    },

    // ==== Reader Tab ====
    {
        key: "show_toc",
        type: "checkbox",
        tab: "reader",
        label: "setting_show_toc",
        bind: "CONFIG.CONST_CONFIG.SHOW_TOC_AREA",
        default: CONFIG.CONST_CONFIG.SHOW_TOC_AREA_DEFAULT,
        persist: true,
    },
    {
        key: "toc_width",
        type: "range",
        tab: "reader",
        label: "setting_toc_width",
        bind: "CONFIG.RUNTIME_VARS.STYLE.sidebar__splitview__sidebar__inner__width",
        default: CONFIG.RUNTIME_VARS.STYLE.sidebar__splitview__sidebar__inner__width__default,
        min: 50,
        max: 100,
        step: 10,
        unit: "%",
        persist: true,
    },
    {
        key: "main_content_width",
        type: "range",
        tab: "reader",
        label: "setting_main_content_width",
        bind: "CONFIG.RUNTIME_VARS.STYLE.sidebar__splitview__content__inner__width",
        default: CONFIG.RUNTIME_VARS.STYLE.sidebar__splitview__content__inner__width__default,
        min: 50,
        max: 100,
        step: 10,
        unit: "%",
        persist: true,
    },
    {
        key: "show_content_boundary_lines",
        type: "checkbox",
        tab: "reader",
        label: "setting_show_content_boundary_lines",
        bind: "CONFIG.RUNTIME_VARS.STYLE.sidebar__splitview__show__content__boundary__lines",
        default: toBool(CONFIG.RUNTIME_VARS.STYLE.sidebar__splitview__show__content__boundary__lines, false),
        persist: true,
    },
    {
        key: "pagination_bottom",
        type: "range",
        tab: "reader",
        label: "setting_pagination_bottom",
        bind: "CONFIG.RUNTIME_VARS.STYLE.ui_paginationBottom",
        default: CONFIG.RUNTIME_VARS.STYLE.ui_paginationBottom_default,
        min: 1,
        max: 30,
        step: 1,
        unit: "px",
        persist: true,
    },
    {
        key: "pagination_opacity",
        type: "range",
        tab: "reader",
        label: "setting_pagination_opacity",
        bind: "CONFIG.RUNTIME_VARS.STYLE.ui_paginationOpacity",
        default: CONFIG.RUNTIME_VARS.STYLE.ui_paginationOpacity_default,
        min: 0,
        max: 1,
        step: 0.1,
        unit: "",
        persist: true,
    },

    // ==== Shortcuts Tab ====
    {
        key: "arrow_left",
        type: "checkbox",
        tab: "shortcuts",
        label: "setting_arrow_left",
        bind: "CONFIG.CONST_CONFIG.SHORTCUTS.arrow_left",
        default: CONFIG.CONST_CONFIG.SHORTCUTS.arrow_left_default,
        persist: true,
    },
    {
        key: "arrow_right",
        type: "checkbox",
        tab: "shortcuts",
        label: "setting_arrow_right",
        bind: "CONFIG.CONST_CONFIG.SHORTCUTS.arrow_right",
        default: CONFIG.CONST_CONFIG.SHORTCUTS.arrow_right_default,
        persist: true,
    },
    {
        key: "page_up",
        type: "checkbox",
        tab: "shortcuts",
        label: "setting_page_up",
        bind: "CONFIG.CONST_CONFIG.SHORTCUTS.page_up",
        default: CONFIG.CONST_CONFIG.SHORTCUTS.page_up_default,
        persist: true,
    },
    {
        key: "page_down",
        type: "checkbox",
        tab: "shortcuts",
        label: "setting_page_down",
        bind: "CONFIG.CONST_CONFIG.SHORTCUTS.page_down",
        default: CONFIG.CONST_CONFIG.SHORTCUTS.page_down_default,
        persist: true,
    },
    {
        key: "esc",
        type: "checkbox",
        tab: "shortcuts",
        label: "setting_esc",
        bind: "CONFIG.CONST_CONFIG.SHORTCUTS.esc",
        default: CONFIG.CONST_CONFIG.SHORTCUTS.esc_default,
        persist: true,
    },
];

/**
 * Array of menu schema definitions describing the UI layout of the settings menu.
 *
 * Each object in the array represents a single tab in the settings menu, and
 * defines its display order, label, and the sections/items to render.
 * Common fields for each tab include:
 *   - id:        {string}    Unique identifier for the tab (used as DOM id and reference)
 *   - order:     {number}    Display order of this tab (lower = earlier)
 *   - label:     {string}    (Optional) Localization key or label for the tab (for display)
 *   - active:    {boolean}   (Optional) If true, this tab is shown as active on menu open
 *   - hidden:    {boolean}   (Optional) If true, this tab is not shown in the menu
 *   - custom:    {boolean}   (Optional) If true, tab is rendered with custom logic (not generic)
 *   - content:   {Array<Object>} Array of section definitions within the tab
 *
 * Each section object in `content` defines a group separator and its items:
 *   - section:   {string}    Localization key or label for the section separator
 *   - order:     {number}    Display order of this section within the tab
 *   - items:     {Array<string>} Ordered list of setting keys (referencing SETTINGS_SCHEMA) to show in this section
 *
 * @constant
 * @type {Array<Object>}
 * @memberof module:client/app/modules/features/settings
 */
const MENU_SCHEMA = [
    {
        id: "content-style",
        order: 1,
        active: true, // Default active tab
        content: [
            {
                section: "setting_separator_font",
                order: 1,
                items: ["title_font", "body_font", "p_fontSize"],
            },
            {
                section: "setting_separator_paragraph",
                order: 2,
                items: ["p_lineHeight", "p_paragraphSpacing", "p_paragraphIndent", "p_textAlign"],
            },
        ],
    },
    {
        id: "theme",
        order: 2,
        content: [
            {
                section: "setting_separator_light",
                order: 1,
                items: ["light_mainColor_active", "light_fontColor", "light_bgColor"],
            },
            {
                section: "setting_separator_dark",
                order: 2,
                items: ["dark_mainColor_active", "dark_fontColor", "dark_bgColor"],
            },
        ],
    },
    {
        id: "reader",
        order: 3,
        content: [
            {
                section: "setting_separator_toc",
                order: 1,
                items: ["show_toc", "toc_width"],
            },
            {
                section: "setting_separator_main_content",
                order: 2,
                items: ["main_content_width", "show_content_boundary_lines"],
            },
            {
                section: "setting_separator_pagination",
                order: 3,
                items: ["pagination_bottom", "pagination_opacity"],
            },
        ],
    },
    {
        id: "general",
        order: 5,
        content: [
            {
                section: "setting_separator_ui",
                order: 1,
                items: ["ui_language", "show_filter_bar", "show_helper_btn", "enable_custom_cursor"],
            },
            {
                section: "setting_separator_behavior",
                order: 2,
                items: ["auto_open_last_book", "infinite_scroll_mode"],
            },
        ],
    },
    {
        id: "shortcuts",
        order: 4,
        content: [
            {
                section: "setting_separator_shortcuts",
                order: 1,
                items: ["arrow_left", "arrow_right", "page_up", "page_down", "esc"],
            },
        ],
    },
    {
        id: "about",
        order: 100,
        custom: true, // Custom/manual tab, not from SETTINGS_SCHEMA
    },
];

/**
 * Class representing the settings menu interface.
 * Manages the creation, display, and interaction of the settings modal dialog.
 * Handles tabs for general settings, theme customization, reader preferences, and about information.
 *
 * @class
 * @property {Object} #SETTINGS_MAP - Private constant containing a map of settings keys to their definitions
 * @property {Object} settingsObj - Reference to the main settings object containing actual settings values
 * @property {HTMLElement} settingsMenu - The main settings menu container element
 * @property {HTMLElement} overlay - The overlay element that dims the background
 * @property {string} defaultTab - The ID of the default tab to show
 */
class SettingsMenu {
    /**
     * Private constant containing a map of settings keys to their definitions
     * @type {Object}
     */
    #SETTINGS_MAP = Object.fromEntries(SETTINGS_SCHEMA.map((def) => [def.key, def]));

    /**
     * Creates an instance of SettingsMenu.
     * Initializes the menu with references to settings and default configurations.
     *
     * @constructor
     * @param {Object} settingsObj - The main settings object containing all settings values and methods
     */
    constructor(settingsObj) {
        this.settingsObj = settingsObj;
        this.settingsMenu = null;
        this.overlay = null;
        this.isShowing = false;

        // Ensure one tab is marked active in MENU_SCHEMA
        if (!MENU_SCHEMA.some((tab) => tab.active)) {
            MENU_SCHEMA.sort((a, b) => a.order - b.order)[0].active = true;
        }

        // Find the default tab (first active, otherwise first by order)
        const defaultTabObj =
            MENU_SCHEMA.find((tab) => tab.active) || MENU_SCHEMA.slice().sort((a, b) => a.order - b.order)[0];

        this.defaultTab = defaultTabObj.id;

        this.#init();
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
     * @throws {Error} If required DOM elements cannot be created or initialized
     */
    #init() {
        // Create the settings menu main container and overlay
        this.settingsMenu = this.#createMainContainer();
        this.overlay = this.#createOverlay();

        // Create the settings menu elements
        const topRow = this.#createTopRow();
        const settingsContainer = this.#createSettingsContainer();
        const tabContainer = this.#createTabContainer();
        const settingsContent = this.#createSettingsContent();
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
     * @param {boolean} [showAnimation=true] - Whether to show the animation when showing the menu
     * @throws {Error} If menu initialization fails
     */
    show(showAnimation = true) {
        this.isShowing = true;
        if (!this.settingsMenu) {
            this.#init();
        }

        if (!showAnimation) {
            this.settingsMenu.classList.add("no-animation");
            this.overlay.classList.add("no-animation");
        } else {
            this.settingsMenu.classList.remove("no-animation");
            this.overlay.classList.remove("no-animation");
        }

        // Show the menu
        this.settingsMenu.style.display = "flex";
        this.settingsMenu.style.zIndex = "10001";
        // this.settingsMenu.style.visibility = "visible";
        this.settingsMenu.classList.remove("hide");
        this.settingsMenu.classList.add("show");
        CONFIG.VARS.IS_SETTINGS_MENU_SHOWN = true;

        // Show the overlay
        this.overlay.style.display = "block";
        this.overlay.style.zIndex = "10000";
        // this.overlay.style.visibility = "visible";
        this.overlay.classList.remove("hide");
        this.overlay.classList.add("show");

        // Add ESC key listener
        document.addEventListener("click", this.#handleClose);
        document.addEventListener("keydown", this.#handleClose, true);

        // Add global wheel event handler
        // Disable page scrolling when settings menu is open
        document.body.style.overflow = "hidden";
        document.addEventListener("wheel", this.#handleGlobalWheel, { passive: false });

        requestAnimationFrame(() => {
            this.isShowing = false;
        });
    }

    /**
     * Hides the settings menu modal and its overlay.
     * Resets the menu's visibility state and removes focus from settings button.
     *
     * @param {boolean} [showAnimation=true] - Whether to show the animation when hiding the menu
     */
    hide(showAnimation = true) {
        // Hide the menu
        if (this.settingsMenu) {
            if (!showAnimation) {
                this.settingsMenu.classList.add("no-animation");
            } else {
                this.settingsMenu.classList.remove("no-animation");
            }

            this.settingsMenu.classList.remove("show");
            this.settingsMenu.classList.add("hide");
            // this.settingsMenu.style.display = "none";
            // this.settingsMenu.style.zIndex = "-1";
            // this.settingsMenu.style.visibility = "hidden";

            const tempMenu = this.settingsMenu;
            setTimeout(() => {
                if (tempMenu) {
                    tempMenu.style.display = "none";
                    tempMenu.style.zIndex = "-1";
                    // tempMenu.style.visibility = "hidden";
                }
            }, 150);
        }
        CONFIG.VARS.IS_SETTINGS_MENU_SHOWN = false;

        // Hide the overlay
        if (this.overlay) {
            if (!showAnimation) {
                this.overlay.classList.add("no-animation");
            } else {
                this.overlay.classList.remove("no-animation");
            }

            this.overlay.classList.remove("show");
            this.overlay.classList.add("hide");
            // this.overlay.style.display = "none";
            // this.overlay.style.zIndex = "-1";
            // this.overlay.style.visibility = "hidden";

            const tempOverlay = this.overlay;
            setTimeout(() => {
                if (tempOverlay) {
                    tempOverlay.style.display = "none";
                    tempOverlay.style.zIndex = "-1";
                    // tempOverlay.style.visibility = "hidden";
                }
            }, 150);
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

        // Remove handleClose event listeners
        document.removeEventListener("click", this.#handleClose);
        document.removeEventListener("keydown", this.#handleClose, true);
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
        CONFIG.VARS.IS_SETTINGS_MENU_SHOWN = false;
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
        // menu.style.visibility = "hidden";
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
        // overlay.style.visibility = "hidden";
        overlay.style.zIndex = "-1";

        overlay.addEventListener(
            "wheel",
            (e) => {
                e.preventDefault();
                e.stopPropagation();
            },
            { passive: false }
        );

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

        [...MENU_SCHEMA]
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .forEach((tabDef) => {
                if (tabDef.hidden) return; // skip hidden tabs
                const tabButton = document.createElement("button");
                tabButton.className = "tab-button";
                tabButton.setAttribute("data-tab", tabDef.id);
                tabButton.setAttribute("id", `setting-tab-${tabDef.id}`);
                tabButton.setAttribute("type", "button");
                tabButton.setAttribute("aria-label", tabDef.id);
                tabButton.addEventListener("click", () => this.switchTab(tabDef.id));
                tabContainer.appendChild(tabButton);
            });

        return tabContainer;
    }

    /**
     * Creates the content section for the settings menu.
     * @returns {HTMLElement} The created settings content element
     */
    #createSettingsContent() {
        const content = document.createElement("div");
        content.className = "settings-content";

        [...MENU_SCHEMA]
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .forEach((tabDef) => {
                if (tabDef.hidden) return; // skip hidden tabs
                // Handle custom tabs (like "about") here if needed, e.g.:
                if (tabDef.custom) {
                    content.appendChild(this.#createAboutTab());
                } else {
                    content.appendChild(this.#createTabFromSchema(tabDef));
                }
            });

        return content;
    }

    /**
     * Generates a tab element and its settings items from MENU_SCHEMA and SETTINGS_SCHEMA.
     * @param {Object} tabDef - Tab definition from MENU_SCHEMA.
     * @returns {HTMLElement} The generated tab content element.
     */
    #createTabFromSchema(tabDef) {
        const tab = document.createElement("div");
        tab.id = tabDef.id;
        tab.className = "tab-content" + (tabDef.active ? " active" : "");

        if (!tabDef.content) return tab;

        // Sort sections by order
        const sections = [...tabDef.content].sort((a, b) => (a.order || 0) - (b.order || 0));

        for (const section of sections) {
            // Add section separator
            if (section.section !== undefined && section.section !== null) {
                if (section.section === "") {
                    tab.appendChild(createSeparatorItem());
                } else {
                    tab.appendChild(createSeparatorItemWithText(section.section));
                }
            }
            if (!section.items) continue;

            // Sort items by order
            const items = [...section.items].sort((a, b) => (a.order || 0) - (b.order || 0));

            for (const itemId of items) {
                const def = this.#SETTINGS_MAP[itemId];
                if (!def || def.hidden) continue; // skip undefined or hidden items

                // Choose the right UI helper
                let el = null;
                switch (def.type) {
                    case "checkbox":
                        el = createCheckboxItem(
                            def.label,
                            this.settingsObj.values[def.key],
                            this.settingsObj.saveSettings.bind(this.settingsObj)
                        );
                        break;
                    case "select":
                        el = createSelectorItem(def.label, def.options, def.optionLabels);
                        break;
                    case "select-font":
                        const fontSelectorArray = createFontSelectorItem(def.label);
                        const language = !CONFIG.RUNTIME_VARS.RESPECT_USER_LANG_SETTING
                            ? CONFIG.RUNTIME_VARS.STYLE.ui_LANG
                            : this.settingsObj.values.ui_language;
                        // Use index 1 for zh, else 0
                        const langIdx = language === "zh" ? 1 : 0;
                        el = fontSelectorArray[langIdx] || fontSelectorArray[0];
                        break;
                    case "color":
                        el = createColorItem(
                            def.label,
                            this.settingsObj.values[def.key],
                            def.palette || [],
                            this.settingsObj.saveSettings.bind(this.settingsObj)
                        );
                        break;
                    case "range":
                        let parsed = parseFloat(this.settingsObj.values[def.key]);
                        if (Number.isInteger(def.step) || String(def.step) === "1") {
                            parsed = Math.round(parsed);
                        }
                        el = createRangeItem(
                            def.label,
                            parsed,
                            {
                                min: def.min,
                                max: def.max,
                                step: def.step,
                                unit: def.unit,
                            },
                            this.settingsObj.saveSettings.bind(this.settingsObj)
                        );
                        break;
                    default:
                        // fallback
                        continue;
                }
                if (el) tab.appendChild(el);
            }
        }
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
                <img class="about-icon" src="./client/images/icon256.png" alt="Logo">
                <h2 class="about-title" id="settingLabel-about_title"></h2>
                <button id="settingLabel-about_version_date" class="about-version noIndent about-btn">v${CONFIG.RUNTIME_VARS.APP_VERSION} (${CONFIG.RUNTIME_VARS.APP_VERSION_DATE})</button>

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
            cbReg.go("updateFontBaselineOffsets");
            // cbReg.go("refreshBookList", {
            //     hardRefresh: false,
            //     sortBookshelf: true,
            // });
            cbReg.go("updateFilterBar");
            cbReg.go("startBookshelfLoop");

            PopupManager.showNotification({
                iconName: "SETTINGS",
                text: CONFIG.RUNTIME_VARS.STYLE.ui_notification_text_settingsReset,
                zIndex: 10005,
            });
        });
        return resetButton;
    }

    /**
     * Creates the version display for the settings menu.
     * @returns {HTMLElement} The created version display element
     */
    #createVersionDisplay() {
        const versionDisplay = document.createElement("button");
        versionDisplay.id = "settings-version-display";
        versionDisplay.className = "about-btn";
        versionDisplay.textContent = `v${CONFIG.RUNTIME_VARS.APP_VERSION}`;
        return versionDisplay;
    }

    /**
     * Initializes event listeners for the settings menu.
     */
    #initializeEventListeners() {
        document.getElementById("settings-version-display").addEventListener("click", () => {
            this.switchTab("about");
            this.fetchAndUpdateVersionData();
        });

        document.getElementById("settingLabel-about_version_date").addEventListener("click", () => {
            this.hide(false);
            this.fetchAndUpdateVersionData();
            PopupManager.showChangelogPopup({
                version: CONFIG.RUNTIME_VARS.APP_VERSION,
                changelog: CONFIG.RUNTIME_VARS.APP_CHANGELOG,
                previousVersions: CONFIG.CONST_CONFIG.CHANGELOG_SHOW_PREVIOUS_VERSIONS,
                forceShow: true,
                willClose: () => {
                    this.show(false);
                },
            });
        });
    }

    /**
     * Initializes components for the settings menu.
     */
    #initializeComponents() {
        setTimeout(() => {
            getColorPicker({
                callbackOnInput: () => {
                    // cbReg.go("updateAllBookCovers");
                    this.settingsObj.saveSettings(false, false, true);
                },
                callbackOnChange: () => {
                    this.settingsObj.saveSettings(false, false, true);
                },
            });
        }, 200);

        this.#initializeInputValues();
        this.#initializeSelectors();
    }

    /**
     * Initializes input values for the settings menu (needed for range items).
     */
    #initializeInputValues() {
        document.getElementById("setting_p_lineHeight").value = parseFloat(this.settingsObj.values.p_lineHeight);
        document.getElementById("setting_p_paragraphSpacing").value = parseFloat(
            this.settingsObj.values.p_paragraphSpacing
        );
        document.getElementById("setting_p_fontSize").value = parseFloat(this.settingsObj.values.p_fontSize);
        document.getElementById("setting_toc_width").value = parseInt(this.settingsObj.values.toc_width);
        document.getElementById("setting_main_content_width").value = parseInt(
            this.settingsObj.values.main_content_width
        );
        document.getElementById("setting_pagination_bottom").value = parseFloat(
            this.settingsObj.values.pagination_bottom
        );
        document.getElementById("setting_pagination_opacity").value = parseFloat(
            this.settingsObj.values.pagination_opacity
        );
    }

    /**
     * Initializes selectors for the settings menu (needed for dropdown items).
     */
    #initializeSelectors() {
        // Language selector
        const languageIndex =
            this.settingsObj.values.ui_language === "auto" || !this.settingsObj.respectUserLangSetting
                ? 0
                : Object.keys(CONFIG.CONST_UI.LANGUAGE_MAPPING).indexOf(this.settingsObj.values.ui_language) + 1;
        getDropdownSelector(
            $("#setting_ui_language"),
            languageIndex,
            [
                {
                    func: this.settingsObj.saveSettings.bind(this.settingsObj),
                    params: [true, true],
                },
                // {
                //     func: cbReg.go.bind(cbReg),
                //     params: [
                //         "refreshBookList",
                //         {
                //             hardRefresh: false,
                //             sortBookshelf: true,
                //         },
                //     ],
                // },
                {
                    func: cbReg.go.bind(cbReg),
                    params: ["updateFilterBar"],
                },
            ],
            {
                $parent: $("#settings-menu"),
            }
        );

        // Title font and body font selectors
        const titleFontConfig = this.#createFontSelectorConfig(
            "#setting_title_font",
            this.settingsObj.values.title_font
        );
        const bodyFontConfig = this.#createFontSelectorConfig("#setting_body_font", this.settingsObj.values.body_font);
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
                {
                    func: cbReg.go.bind(cbReg),
                    params: [
                        "updateAllBookCoversAfterFontsLoaded",
                        // { message: `${element} => ${fontValue}` }
                    ],
                },
                {
                    func: cbReg.go.bind(cbReg),
                    params: ["startBookshelfLoop"],
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
                        onClick: (value, text, e, $element, currentDropdownSelector) => {
                            if ($element.data("group") !== "custom") return;
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
                                cbReg.go("deleteCustomFont", {
                                    fontFamily: value,
                                });
                            }
                        },
                        shouldShow: (value, text, $element) => {
                            return $element.hasClass("optgroup-option") && $element.attr("data-group") === "custom";
                        },
                    },
                    {
                        className: "loading-button",
                        html: ICONS.LOADING,
                        shouldShow: (value, text, $element) => {
                            return $element.hasClass("optgroup-option") && $element.attr("data-status") === "loading";
                        },
                    },
                ],
                $parent: $("#settings-menu"),
            },
        };
    }

    /**
     * Updates the version UI for the settings menu.
     * @param {string} version - The version number
     * @param {string} date - The date of the version
     */
    updateVersionUI(version, date) {
        document.getElementById("settingLabel-about_version_date").textContent = `v${version} (${date})`;
        document.getElementById("settings-version-display").textContent = `v${version}`;
    }

    /**
     * Fetches the version data and updates the version UI for the settings menu.
     */
    fetchAndUpdateVersionData() {
        fetchVersionData().then((versionData) => {
            updateVersionData(versionData);
            this.updateVersionUI(CONFIG.RUNTIME_VARS.APP_VERSION, CONFIG.RUNTIME_VARS.APP_VERSION_DATE);
        });
    }

    /**
     * Handles closing events for the settings menu (click outside or ESC key).
     * @param {Event} e - The event object (either mouse click or keydown)
     */
    #handleClose = (e) => {
        // Don't close the settings menu if it's in the process of being shown
        if (this.isShowing) {
            return;
        }

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
        if (CONFIG.VARS.IS_SETTINGS_MENU_SHOWN) {
            handleGlobalWheel(e, document.getElementById("settings-menu"));
        }
    };
}

/**
 * Settings module for managing UI and style configurations.
 * @private
 * @namespace
 */
const settings = {
    /*
     * Module state
     */
    enabled: false,
    settingsMenu: null,

    /*
     * Language settings
     */
    browser_LANG: localStorage.getItem("browser_LANG") ?? "zh",
    respectUserLangSetting: null,

    /*
     * Settings from schema
     */
    defaults: Object.fromEntries(SETTINGS_SCHEMA.map((item) => [item.key, item.default])),
    values: Object.fromEntries(SETTINGS_SCHEMA.map((item) => [item.key, item.default])),
    types: Object.fromEntries(SETTINGS_SCHEMA.map((item) => [item.key, item.type])),

    /**
     * Loads a user setting from localStorage, falling back to an alternate key or the default value.
     * Handles checkbox types by converting stored values to boolean.
     *
     * @public
     * @method loadSettingWithFallback
     * @memberof settings
     * @instance
     * @param {string} key - The primary localStorage key to retrieve.
     * @param {string|null} [key_alt=null] - An optional alternate key to use if the primary key is not found.
     * @returns {*} The resolved setting value, using the following priority:
     *  1. Value from localStorage under `key`
     *  2. Value from localStorage under `key_alt` (if provided)
     *  3. Default value from the settings schema
     *  Checkbox types are automatically converted to boolean.
     */
    loadSettingWithFallback(key, key_alt = null) {
        let val = null;
        if (key_alt !== null && key_alt !== undefined) {
            val = localStorage.getItem(key_alt);
        }
        if (val === null || val === undefined) {
            val = localStorage.getItem(key);
        }
        if (val === null || val === undefined) {
            val = this.defaults[key];
        }
        if (this.types[key] === "checkbox") val = toBool(val, false);
        return val;
    },

    /**
     * Saves a user setting based on the value of an input element, with optional unit and per-setting value computation.
     * Supports checkboxes, range sliders, color pickers, selects, and custom logic via the schema's `getValue` function.
     * Falls back to the default value if the input is empty or invalid.
     *
     * @public
     * @method saveSettingFromInput
     * @memberof settings
     * @instance
     * @param {string} key - The setting key to save.
     * @param {jQuery} $input - The jQuery input element from which to read the value.
     * @param {string} [unit=""] - An optional unit string to append to the value (e.g., "em", "%").
     * @returns {*} The final saved value (after applying unit, computation, or default fallback).
     */
    saveSettingFromInput(key, $input, unit = "") {
        const sanitizedUnit = unit ?? "";
        const def = SETTINGS_SCHEMA.find((item) => item.key === key);
        let value;

        // 1. Prefer per-schema getValue function if defined
        if (def && typeof def.getValue === "function") {
            value = def.getValue.call(this, $input);
        } else {
            // 2. Fallback to built-in logic by type
            switch (this.types[key]) {
                case "checkbox":
                    value = $input.is(":checked");
                    break;
                case "range":
                    value = $input.val() + sanitizedUnit;
                    break;
                case "color":
                case "select":
                case "select-font":
                    value = $input.val();
                    break;
                default:
                    value = $input.val() + sanitizedUnit;
                    break;
            }
        }
        if (value === undefined || value === null || value === sanitizedUnit) {
            value = this.defaults[key];
        }
        if (def.persist) {
            localStorage.setItem(key, value);
        }
        return value;
    },

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
        // Special case: respectUserLangSetting (not in manifest)
        this.respectUserLangSetting =
            toBool(localStorage.getItem("respectUserLangSetting"), false) ??
            toBool(document.documentElement.getAttribute("respectUserLangSetting"));

        // Loop through all settings from schema
        for (const def of SETTINGS_SCHEMA) {
            // Special case: language selection (ui_language) depends on respectUserLangSetting
            if (def.key === "ui_language") {
                if (this.respectUserLangSetting) {
                    this.values[def.key] = this.loadSettingWithFallback(def.key, "UILang");
                }
                continue;
            }

            // All other settings from schema
            this.values[def.key] = this.loadSettingWithFallback(def.key);
        }
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

        // Special case: respectUserLangSetting (not in manifest)
        this.respectUserLangSetting = CONFIG.RUNTIME_VARS.RESPECT_USER_LANG_SETTING_DEFAULT;

        // Loop through all settings from schema
        for (const def of SETTINGS_SCHEMA) {
            // Special case: language selection (ui_language) depends on respectUserLangSetting
            if (def.key === "ui_language") {
                if (this.respectUserLangSetting) {
                    this.values.ui_language = this.defaults.ui_language;
                }
                continue;
            }

            // All other settings from schema
            this.values[def.key] = this.defaults[def.key];
        }

        // Sync settings to UI
        if (this.respectUserLangSetting) {
            setSelectorValue(
                "setting_ui_language",
                Object.keys(CONFIG.CONST_UI.LANGUAGE_MAPPING).indexOf(this.values.ui_language) + 1
            );
        } else {
            setSelectorValue("setting_ui_language", 0);
        }

        for (const def of SETTINGS_SCHEMA) {
            if (def.hidden) continue;
            if (def.key === "ui_language") continue;
            if (def.type === "range") {
                setRangeValue(def.label, this.values[def.key]);
            }
            if (def.type === "checkbox") {
                setCheckboxValue(def.label, this.values[def.key]);
            }
            if (def.type === "color") {
                setColorValue(def.label, this.values[def.key]);
            }
            if (def.type === "select-font") {
                setSelectorValue(def.label, findFontIndex(this.values[def.key]));
            }
            // if (def.type === "select") {
            //     setSelectorValue(def.label, findFontIndex(this.values[def.key]));
            // }
        }
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
     * @param {boolean} [colorOnly=false] - Whether to only apply color settings
     */
    applySettings(colorOnly = false) {
        // Hide footnotes
        cbReg.go("footnotes:hide");

        // Helper: applies schema-based settings, can be filtered by type or key
        const applySchema = (filter) => {
            for (const def of SETTINGS_SCHEMA) {
                if (filter && !filter(def)) continue;

                // 1. Handle variable binding
                if (def.bind) {
                    const binds = Array.isArray(def.bind) ? def.bind : [def.bind];
                    for (const bindPath of binds) {
                        // Example: "CONFIG.RUNTIME_VARS.STYLE.p_fontSize"
                        // We'll use a simple `eval` here for direct path (or use a utility function for deep object set in prod)
                        try {
                            // eval(`${bindPath} = this.values[def.key]`);
                            setDeep(CONFIG, bindPath.replace(/^CONFIG\./, ""), this.values[def.key]);
                        } catch (e) {
                            console.warn(`Failed to bind setting '${def.key}' to '${bindPath}':`, e);
                        }
                    }
                }
                // 2. Handle onApply (side-effects/derived vars)
                if (typeof def.onApply === "function") {
                    try {
                        def.onApply.call(this, this.values[def.key]);
                    } catch (e) {
                        console.warn(`Failed to call onApply for setting '${def.key}':`, e);
                    }
                }
            }
        };

        // Helper: applies dark mode styles
        const applyDarkModeStyles = () => {
            CONFIG.RUNTIME_VARS.STYLE.mainColor_active = CONFIG.RUNTIME_VARS.STYLE.darkMode_mainColor_active;
            CONFIG.RUNTIME_VARS.STYLE.mainColor_inactive = CONFIG.RUNTIME_VARS.STYLE.darkMode_mainColor_inactive;
            CONFIG.RUNTIME_VARS.STYLE.fontColor = CONFIG.RUNTIME_VARS.STYLE.darkMode_fontColor;
            CONFIG.RUNTIME_VARS.STYLE.bgColor = CONFIG.RUNTIME_VARS.STYLE.darkMode_bgColor;
        };

        if (colorOnly) {
            applySchema((def) => def.type === "color");
            if (CONFIG.RUNTIME_VARS.STYLE.ui_Mode === "dark") {
                applyDarkModeStyles();
            }
            return;
        }

        // Special case: respectUserLangSetting (not in manifest)
        CONFIG.RUNTIME_VARS.RESPECT_USER_LANG_SETTING = this.respectUserLangSetting;
        if (this.respectUserLangSetting) {
            CONFIG.RUNTIME_VARS.STYLE.ui_LANG = this.values.ui_language;
        }

        // Apply all settings except ui_language
        applySchema((def) => def.key !== "ui_language");

        // Theme adjustments (mode-specific), and other non-schema code
        if (CONFIG.RUNTIME_VARS.STYLE.ui_Mode === "dark") {
            applyDarkModeStyles();
        }

        if (
            toBool(CONFIG.RUNTIME_VARS.STYLE.sidebar__splitview__show__content__boundary__lines, false) &&
            CONFIG.RUNTIME_VARS.STYLE.sidebar__splitview__content__inner__width !== "100%"
        ) {
            CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.classList.add("has-custom-width");
        } else {
            CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.classList.remove("has-custom-width");
        }

        // Update font baseline offsets
        cbReg.go("updateFontBaselineOffsets");

        // Apply filter bar visibility
        cbReg.go("toggleFilterBar");

        // Apply infinite scroll mode
        cbReg.go("toggleInfiniteScroll");

        // Apply TOC area visibility
        cbReg.go("toggleTOCArea");

        // Apply help button visibility
        cbReg.go("toggleHelpBtn");

        // Apply custom cursor visibility
        cbReg.go("toggleCustomCursor");
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
     * @param {boolean} [colorOnly=false] - Whether to only save color settings
     */
    saveSettings(toSetLanguage = false, forceSetLanguage = false, colorOnly = false) {
        // console.log("saveSettings", { toSetLanguage, forceSetLanguage });

        // Helper: update values from schema
        const updateValuesFromInputs = (filterType = null) => {
            // Loop through all settings from schema
            for (const def of SETTINGS_SCHEMA) {
                if (filterType && def.type !== filterType) continue;
                if (!filterType && def.key === "ui_language") continue;
                const inputLabel = def.inputRef || def.label; // Prefer inputRef if present
                this.values[def.key] = this.saveSettingFromInput(def.key, $(`#${inputLabel}`), def.unit);
            }
        };

        if (colorOnly) {
            updateValuesFromInputs("color");
            this.applySettings(true);
            cbReg.go("updateAllBookCovers", { colorOnly: colorOnly });
            return;
        }

        // Special case: respectUserLangSetting (not in manifest)
        const selectedLang =
            $("#setting_ui_language")
                .closest(".select")
                .children(".select-options")
                .children(".is-selected")
                .attr("rel") || this.defaults.ui_language;
        if (selectedLang === "auto") {
            this.respectUserLangSetting = false;
            this.values.ui_language = "auto";
        } else {
            this.respectUserLangSetting = true;
            this.values.ui_language = selectedLang;
        }
        if (this.respectUserLangSetting) {
            this.values.ui_language =
                $("#setting_ui_language")
                    .closest(".select")
                    .children(".select-options")
                    .children(".is-selected")
                    .attr("rel") || this.defaults.ui_language;
        }

        // Update all other values
        updateValuesFromInputs();

        // Save language settings to local storage
        if (forceSetLanguage || (this.respectUserLangSetting && toSetLanguage)) {
            let lang = this.respectUserLangSetting
                ? this.values.ui_language || CONFIG.RUNTIME_VARS.STYLE.ui_LANG
                : this.browser_LANG;
            this.setLanguage(lang, true);
            if (!this.respectUserLangSetting && !CONFIG.VARS.INIT) {
                lang = CONFIG.VARS.IS_EASTERN_LAN ? "zh" : "en";
                this.setLanguage(lang, false);
            }
            changeLanguageSelectorItemLanguage($("#setting_ui_language"), lang);
            changeFontSelectorItemLanguage($("#setting_title_font"), lang);
            changeFontSelectorItemLanguage($("#setting_body_font"), lang);
        }

        localStorage.setItem("respectUserLangSetting", this.respectUserLangSetting);
        document.documentElement.setAttribute("respectUserLangSetting", this.respectUserLangSetting);
        if (this.respectUserLangSetting) {
            localStorage.setItem("UILang", this.values.ui_language);
        }

        this.applySettings();

        // Trigger updateAllBookCovers event
        cbReg.go("updateAllBookCovers", { colorOnly: colorOnly });
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
        // Force update the CSS variables cache
        CONFIG.RUNTIME_VARS.STYLE.refresh();

        const isDefaultTitle =
            document.title === CONFIG.RUNTIME_VARS.STYLE.ui_title_zh ||
            document.title === CONFIG.RUNTIME_VARS.STYLE.ui_title_en;
        if (isDefaultTitle) {
            setTitle();
        }

        // Reset all hardcoded elements' language
        const elements = {
            darkModeButton: CONFIG.DOM_ELEMENT.DARK_MODE_ACTUAL_BUTTON,
            bookshelfButton: CONFIG.DOM_ELEMENT.BOOKSHELF_BUTTON,
            settingsButton: CONFIG.DOM_ELEMENT.SETTINGS_BUTTON,
            helpButton: CONFIG.DOM_ELEMENT.HELP_BUTTON,
            dropZone: CONFIG.DOM_ELEMENT.DROPZONE,
            tocSplitviewDivider: CONFIG.DOM_ELEMENT.TOC_SPLITVIEW_DIVIDER,
            tocSplitviewToggle: CONFIG.DOM_ELEMENT.TOC_SPLITVIEW_TOGGLE,
            scrollTopButton: CONFIG.DOM_ELEMENT.SCROLL_TOP_BUTTON,
            scrollBottomButton: CONFIG.DOM_ELEMENT.SCROLL_BOTTOM_BUTTON,
            removeBookButtons: CONFIG.DOM_ELEMENT.REMOVE_BOOK_BUTTONS,
            bookInfoButtons: CONFIG.DOM_ELEMENT.BOOK_INFO_BUTTONS,
            bookCoverContainers: CONFIG.DOM_ELEMENT.BOOK_COVER_CONTAINERS,
        };

        if (isVariableDefined(elements.darkModeButton)) {
            elements.darkModeButton.dataset.title = CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_modeToggle;
        }
        if (isVariableDefined(elements.bookshelfButton)) {
            elements.bookshelfButton.dataset.title = CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_goToBookshelf;
        }
        if (isVariableDefined(elements.settingsButton)) {
            elements.settingsButton.dataset.title = CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_settings;
        }
        if (isVariableDefined(elements.helpButton)) {
            elements.helpButton.dataset.title = CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_help;
        }
        // if (isVariableDefined(elements.dropZone)) {
        //     elements.dropZone.dataset.title = CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_dropZone;
        // }
        if (isVariableDefined(elements.tocSplitviewDivider)) {
            elements.tocSplitviewDivider.dataset.title = CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_divider;
        }
        if (isVariableDefined(elements.tocSplitviewToggle)) {
            elements.tocSplitviewToggle.dataset.title = CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_toggleButton;
        }
        // console.log("CONFIG.VARS.IS_BOOK_OPENED", CONFIG.VARS.IS_BOOK_OPENED);
        if (!CONFIG.VARS.IS_BOOK_OPENED) {
            if (isVariableDefined(elements.scrollTopButton)) {
                elements.scrollTopButton.dataset.title = CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_bookshelf_scrollTop;
            }
            if (isVariableDefined(elements.scrollBottomButton)) {
                elements.scrollBottomButton.dataset.title = CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_bookshelf_scrollBottom;
            }
            if (isVariableDefined(elements.removeBookButtons)) {
                elements.removeBookButtons.forEach((el) => {
                    el.dataset.title = CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_removeBook;
                });
            }
            if (isVariableDefined(elements.bookInfoButtons)) {
                elements.bookInfoButtons.forEach((el) => {
                    el.dataset.title = CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_bookInfo;
                });
            }
            if (isVariableDefined(elements.bookCoverContainers)) {
                elements.bookCoverContainers.forEach((el) => {
                    el.dataset.title = CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_book_altClick;
                });
            }
        }

        // Update tooltips content
        cbReg.go("updateCustomTooltip");

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
     * @method enable
     * @memberof settings
     * @instance
     * @returns {Object} The settings instance for method chaining
     */
    enable() {
        if (!this.enabled) {
            this.enabled = true;
            if (!CONFIG.VARS.CUSTOM_FONTS_LOADED) {
                CONFIG.VARS.CUSTOM_FONTS = JSON.parse(localStorage.getItem("custom_fonts")) || {};
            }
            this.loadSettings();
            this.applySettings();
            if (!this.settingsMenu) {
                this.settingsMenu = new SettingsMenu(this);
            }
            CONFIG.VARS.SETTINGS_INITIALIZED = true;
            // console.log("Module <Settings> enabled.");

            // Listen to the updateUILanguage event
            cbReg.add("updateUILanguage", (e) => {
                const { lang, saveToLocalStorage } = e;
                this.setLanguage(lang, saveToLocalStorage);
                changeLanguageSelectorItemLanguage($("#setting_ui_language"), lang);
                changeFontSelectorItemLanguage($("#setting_title_font"), lang);
                changeFontSelectorItemLanguage($("#setting_body_font"), lang);
            });

            // Listen to the loadSettings event
            cbReg.add("loadSettings", () => {
                this.loadSettings();
            });

            // Listen to the applySettings event
            cbReg.add("applySettings", () => {
                this.applySettings();
            });

            // Listen to the hideSettingsMenu event
            cbReg.add("hideSettingsMenu", () => {
                if (this.settingsMenu) {
                    this.settingsMenu.hide();
                }
            });

            // Listen to the customFontsLoaded event
            cbReg.add("customFontsLoaded", () => {
                if (this.settingsMenu) {
                    this.settingsMenu.remove();
                    this.settingsMenu = null;
                    this.settingsMenu = new SettingsMenu(this);
                }
            });

            cbReg.add("updateFontBaselineOffsets", () => {
                const elements_title = Object.fromEntries(
                    Object.entries({
                        toc: CONFIG.RUNTIME_VARS.STYLE.toc_fontSize,
                        h1: CONFIG.RUNTIME_VARS.STYLE.h1_fontSize,
                        h1Author: CONFIG.RUNTIME_VARS.STYLE.h1_fontSize_author,
                        h2: CONFIG.RUNTIME_VARS.STYLE.h2_fontSize,
                        h3: CONFIG.RUNTIME_VARS.STYLE.h3_fontSize,
                        h4: CONFIG.RUNTIME_VARS.STYLE.h4_fontSize,
                        h5: CONFIG.RUNTIME_VARS.STYLE.h5_fontSize,
                        h6: CONFIG.RUNTIME_VARS.STYLE.h6_fontSize,
                    }).filter(([key, el]) => {
                        if (!el) return false;
                        if (el instanceof HTMLElement) {
                            return el.id.includes("line") || el.id.includes("toc");
                        }
                        return true;
                    })
                );
                const elements_body = Object.fromEntries(
                    Object.entries({
                        p: CONFIG.RUNTIME_VARS.STYLE.p_fontSize,
                        footnote: CONFIG.RUNTIME_VARS.STYLE.footnote_fontSize,
                    }).filter(([key, el]) => {
                        if (!el) return false;
                        if (el instanceof HTMLElement) {
                            return el.id.includes("line");
                        }
                        return true;
                    })
                );

                const titleFontOffset = getFontOffsets(
                    CONFIG.RUNTIME_VARS.STYLE.fontFamily_title.split(",")[0].trim(),
                    elements_title,
                    CONFIG.RUNTIME_VARS.FONT_BASELINE_OFFSETS
                );
                const bodyFontOffset = getFontOffsets(
                    CONFIG.RUNTIME_VARS.STYLE.fontFamily_body.split(",")[0].trim(),
                    elements_body,
                    CONFIG.RUNTIME_VARS.FONT_BASELINE_OFFSETS
                );
                // console.log("titleFontOffset", titleFontOffset);
                // console.log("bodyFontOffset", bodyFontOffset);

                CONFIG.RUNTIME_VARS.STYLE.toc_text_span_top = `${titleFontOffset.toc.verticalOffset * -1}${
                    titleFontOffset.toc.fontSizeUnit
                }`;
                CONFIG.RUNTIME_VARS.STYLE.toc_text_span_left = `${titleFontOffset.toc.horizontalOffset * -1}${
                    titleFontOffset.toc.fontSizeUnit
                }`;
                CONFIG.RUNTIME_VARS.STYLE.h1_top = `${titleFontOffset.h1.verticalOffset * -1}${
                    titleFontOffset.h1.fontSizeUnit
                }`;
                CONFIG.RUNTIME_VARS.STYLE.h1_left = `${titleFontOffset.h1.horizontalOffset * -1}${
                    titleFontOffset.h1.fontSizeUnit
                }`;
                CONFIG.RUNTIME_VARS.STYLE.h1_author_top = `${titleFontOffset.h1Author.verticalOffset * -1}${
                    titleFontOffset.h1Author.fontSizeUnit
                }`;
                CONFIG.RUNTIME_VARS.STYLE.h1_author_left = `${titleFontOffset.h1Author.horizontalOffset * -1}${
                    titleFontOffset.h1Author.fontSizeUnit
                }`;
                CONFIG.RUNTIME_VARS.STYLE.h2_top = `${titleFontOffset.h2.verticalOffset * -1}${
                    titleFontOffset.h2.fontSizeUnit
                }`;
                CONFIG.RUNTIME_VARS.STYLE.h2_left = `${titleFontOffset.h2.horizontalOffset * -1}${
                    titleFontOffset.h2.fontSizeUnit
                }`;
                CONFIG.RUNTIME_VARS.STYLE.h3_top = `${titleFontOffset.h3.verticalOffset * -1}${
                    titleFontOffset.h3.fontSizeUnit
                }`;
                CONFIG.RUNTIME_VARS.STYLE.h3_left = `${titleFontOffset.h3.horizontalOffset * -1}${
                    titleFontOffset.h3.fontSizeUnit
                }`;
                CONFIG.RUNTIME_VARS.STYLE.h4_top = `${titleFontOffset.h4.verticalOffset * -1}${
                    titleFontOffset.h4.fontSizeUnit
                }`;
                CONFIG.RUNTIME_VARS.STYLE.h4_left = `${titleFontOffset.h4.horizontalOffset * -1}${
                    titleFontOffset.h4.fontSizeUnit
                }`;
                CONFIG.RUNTIME_VARS.STYLE.h5_top = `${titleFontOffset.h5.verticalOffset * -1}${
                    titleFontOffset.h5.fontSizeUnit
                }`;
                CONFIG.RUNTIME_VARS.STYLE.h5_left = `${titleFontOffset.h5.horizontalOffset * -1}${
                    titleFontOffset.h5.fontSizeUnit
                }`;
                CONFIG.RUNTIME_VARS.STYLE.h6_top = `${titleFontOffset.h6.verticalOffset * -1}${
                    titleFontOffset.h6.fontSizeUnit
                }`;
                CONFIG.RUNTIME_VARS.STYLE.h6_left = `${titleFontOffset.h6.horizontalOffset * -1}${
                    titleFontOffset.h6.fontSizeUnit
                }`;
                CONFIG.RUNTIME_VARS.STYLE.p_top = `${bodyFontOffset.p.verticalOffset * -1}${
                    bodyFontOffset.p.fontSizeUnit
                }`;
                CONFIG.RUNTIME_VARS.STYLE.p_left = `${bodyFontOffset.p.horizontalOffset * -1}${
                    bodyFontOffset.p.fontSizeUnit
                }`;
                CONFIG.RUNTIME_VARS.STYLE.footnote_top = `${bodyFontOffset.footnote.verticalOffset * -1}${
                    bodyFontOffset.footnote.fontSizeUnit
                }`;
                CONFIG.RUNTIME_VARS.STYLE.footnote_left = `${bodyFontOffset.footnote.horizontalOffset * -1}${
                    bodyFontOffset.footnote.fontSizeUnit
                }`;
            });

            // Trigger updateUILanguage event
            cbReg.go("updateUILanguage", {
                lang: CONFIG.RUNTIME_VARS.WEB_LANG,
                saveToLocalStorage: true,
            });
            // Use the language of the book if a book is already opened
            cbReg.go("updateUILanguage", {
                lang: getCurrentDisplayLanguage(),
                saveToLocalStorage: false,
            });

            if (window.fetchVersionDataPromise) {
                window.fetchVersionDataPromise.then(() => {
                    // Update the version UI for the settings menu
                    this.settingsMenu.updateVersionUI(
                        CONFIG.RUNTIME_VARS.APP_VERSION,
                        CONFIG.RUNTIME_VARS.APP_VERSION_DATE
                    );

                    // Show the changelog popup
                    PopupManager.showChangelogPopup({
                        version: CONFIG.RUNTIME_VARS.APP_VERSION,
                        changelog: CONFIG.RUNTIME_VARS.APP_CHANGELOG,
                        previousVersions: CONFIG.CONST_CONFIG.CHANGELOG_SHOW_PREVIOUS_VERSIONS,
                        forceShow: CONFIG.CONST_CONFIG.CHANGELOG_FORCE_SHOW,
                    });
                });
            }
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
            $("#setting-btn").remove();
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
     * @method init
     * @memberof settings
     * @instance
     */
    init() {
        const $button =
            $(`<div id="setting-btn" class="btn-icon hasTitle" data-title="${CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_settings}">
            ${ICONS.SETTINGS}
            </div>`);

        $button.on("click", () => {
            (() => {
                // setSvgPathLength($button.get(0));
                if (!this.settingsMenu) {
                    this.settingsMenu = new SettingsMenu(this);
                }

                if (CONFIG.VARS.IS_SETTINGS_MENU_SHOWN) {
                    this.settingsMenu.hide();
                } else {
                    this.settingsMenu.show();
                }
            })();
        });

        // Insert the button at the end
        // $button.appendTo($("#main-btn-wrapper"));
        // Insert the button before the last icon
        // const $icons = $("#main-btn-wrapper").children();
        // if ($icons.length > 0) {
        //     $button.insertBefore($icons.last()); // Insert before the last icon
        // } else {
        //     $("#main-btn-wrapper").append($button); // If no icons exist, just append
        // }
        // Insert the button after the "darkmode-toggle-btn"
        $("#darkmode-toggle-btn").after($button);

        // .hide();
    },
};

/**
 * Initializes the settings module
 * @public
 */
export function initSettings() {
    // Enable settings functionality
    if (CONFIG.RUNTIME_CONFIG.ENABLE_SETTINGS) {
        settings.enable();
        settings.init();
    }
}
