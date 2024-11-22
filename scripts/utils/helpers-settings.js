/**
 * @fileoverview Settings helper functions for managing UI settings and preferences
 *
 * This module provides utility functions for:
 * - CSS manipulation and style management
 * - Creating UI setting elements (selectors, ranges, color pickers)
 * - Font management and validation
 * - Language switching for settings UI
 *
 * @module utils/helpers-settings
 * @requires config/index
 * @requires utils/base
 */

import * as CONFIG from "../config/index.js";
import { findStringIndex, isVariableDefined, simulateClick } from "./base.js";

/**
 * Gets CSS property value for a specific selector
 * @param {string} sel - CSS selector
 * @param {string} prop - CSS property name
 * @returns {string|null} Property value or null if not found
 * @public
 */
export function getCSS(sel, prop) {
    for (const sheet of document.styleSheets) {
        for (const rule of sheet.cssRules) {
            if (rule.selectorText === sel) {
                return rule.style.getPropertyValue(prop);
            }
        }
    }
    return null;
}

/**
 * Sets CSS property value for a specific selector
 * @param {string} sel - CSS selector
 * @param {string} prop - CSS property name
 * @param {string} val - New property value
 * @param {string} def - Default value if val is undefined
 * @public
 */
export function setCSS(sel, prop, val, def) {
    for (const sheet of document.styleSheets) {
        for (const rule of sheet.cssRules) {
            if (rule.selectorText === sel) {
                const finalValue = val || def;
                rule.style.setProperty(prop, finalValue);
                console.log(`${sel} { ${prop}: ${finalValue} }`);
            }
        }
    }
}

/**
 * Creates a dropdown selector element
 * @param {string} id - Element ID
 * @param {Array<string>} values - Array of option values
 * @param {Array<string>} texts - Array of option display texts
 * @returns {HTMLElement} Created selector element
 * @public
 */
export function createSelectorItem(id, values, texts) {
    const settingItem = document.createElement("div");
    settingItem.setAttribute("class", "settingItem-wrapper");

    const settingItemText = document.createElement("span");
    settingItemText.setAttribute("class", "settingItem-span");
    settingItemText.setAttribute("id", `settingLabel-${id}`);
    settingItemText.onselectstart = () => false;
    settingItemText.onmousedown = () => false;

    const settingItemInput = document.createElement("select");
    settingItemInput.setAttribute("id", id);

    values.forEach((value, i) => {
        const option = document.createElement("option");
        option.setAttribute("value", value);
        option.innerText = texts[i];
        settingItemInput.appendChild(option);
    });

    settingItem.appendChild(settingItemText);
    settingItem.appendChild(settingItemInput);
    return settingItem;
}

/**
 * Creates a grouped dropdown selector element
 * @param {string} id - Element ID
 * @param {Array<Array<string>>} values - Array of option value groups
 * @param {Array<Array<string>>} texts - Array of option text groups
 * @param {Array<string>} groups - Array of group labels
 * @param {boolean} isFont - Whether this is a font selector
 * @returns {HTMLElement} Created grouped selector element
 * @private
 */
function createSelectorWithGroupItem(id, values, texts, groups, isFont = false) {
    const settingItem = document.createElement("div");
    settingItem.setAttribute("class", "settingItem-wrapper");

    const settingItemText = document.createElement("span");
    settingItemText.setAttribute("class", "settingItem-span");
    settingItemText.setAttribute("id", `settingLabel-${id}`);
    settingItemText.onselectstart = () => false;
    settingItemText.onmousedown = () => false;

    const settingItemInput = document.createElement("select");
    settingItemInput.setAttribute("id", id);

    groups.forEach((group, i) => {
        const optgroup = document.createElement("optgroup");
        optgroup.setAttribute("label", group);

        values[i].forEach((value, j) => {
            const option = document.createElement("option");
            option.setAttribute("value", value);
            option.innerText = texts[i][j];

            if (isFont) {
                option.style.fontFamily = value;
            }

            optgroup.appendChild(option);
        });

        settingItemInput.appendChild(optgroup);
    });

    settingItem.appendChild(settingItemText);
    settingItem.appendChild(settingItemInput);
    return settingItem;
}

/**
 * Gets the font configurations
 * @returns {Object} Font configurations
 * @returns {Array<Object>} system_fonts - System fonts
 * @returns {Array<Object>} custom_fonts - Custom fonts
 * @returns {Array<string>} fallback_fonts - Fallback fonts
 * @private
 */
function getFontConfigs() {
    return {
        system_fonts: [
            { en: "Helvetica", zh: "Helvetica" },
            {
                en: "Noto Sans",
                zh: "Noto Sans",
                linuxVariant: "Noto Sans CJK",
                label_en: "Noto Sans",
            },
            { en: "Roboto", zh: "Roboto" },
            { en: "Times New Roman", zh: "Times New Roman" },
            { en: "Consolas", zh: "Consolas" },
            {
                en: "Microsoft YaHei",
                zh: "微软雅黑",
                macVariant: "PingFang SC",
                linuxVariant: "WenQuanYi Zen Hei",
                label_zh: "微软雅黑",
            },
            {
                en: "SimSun",
                zh: "宋体",
                macVariant: "SongTi SC",
                linuxVariant: "AR PL UMing CN",
                label_zh: "宋体",
            },
            {
                en: "Source Han Sans",
                zh: "思源黑体",
                linuxVariant: "Source Han Sans CN",
                label_zh: "思源黑体",
            },
            {
                en: "KaiTi",
                zh: "楷体",
                macVariant: "KaiTi SC",
                linuxVariant: "WenQuanYi Zen Hei Sharp",
                label_zh: "楷体",
            },
            {
                en: "HeiTi",
                zh: "黑体",
                macVariant: "Heiti SC",
                linuxVariant: "Noto Sans CJK",
                label_zh: "黑体",
            },
            {
                en: "FangSong",
                zh: "仿宋",
                macVariant: "FangSong SC",
                linuxVariant: "AR PL UKai CN",
                label_zh: "仿宋",
            },
        ],
        custom_fonts: [
            {
                en: "title",
                zh: "title",
                label_zh: CONFIG.RUNTIME_VARS.STYLE.ui_font_title_label_zh,
                label_en: CONFIG.RUNTIME_VARS.STYLE.ui_font_title_label_en,
            },
            {
                en: "body",
                zh: "body",
                label_zh: CONFIG.RUNTIME_VARS.STYLE.ui_font_body_label_zh,
                label_en: CONFIG.RUNTIME_VARS.STYLE.ui_font_body_label_en,
            },
            { en: "fzkai", zh: "fzkai", label_zh: "方正楷体", label_en: "FZKaiTi" },
            {
                en: "ui",
                zh: "ui",
                label_zh: CONFIG.RUNTIME_VARS.STYLE.ui_font_ui_label_zh,
                label_en: CONFIG.RUNTIME_VARS.STYLE.ui_font_ui_label_en,
            },
            {
                en: "kinghwa",
                zh: "kinghwa",
                label_zh: "京華老宋体",
                label_en: "KingHwa_OldSong",
            },
        ],
        fallback_fonts: ["ui", "serif", "sans-serif", "monospace"],
    };
}

/**
 * Checks if a font is available in the system
 * @param {string} font - Font name to check
 * @returns {boolean} True if font is available
 * @private
 */
function isFontAvailable(font) {
    const testString = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const testSize = "72px";
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    const measureText = (font) => {
        context.font = `${testSize} ${font}`;
        return context.measureText(testString).width;
    };

    const { system_fonts, custom_fonts, fallback_fonts } = getFontConfigs();
    const fallbackWidth = measureText(fallback_fonts[0]);
    const testFontWidth = measureText(`${font}, ${fallback_fonts[0]}`);

    return testFontWidth !== fallbackWidth;
}

/**
 * Gets valid font information from a list of fonts
 * Validates font availability and formats labels
 * @param {Array<{en: string, zh: string, label_en?: string, label_zh?: string}>} fontList - List of font objects
 * @param {boolean} checkAvailability - Whether to check if fonts are available in system
 * @returns {{
 *   names: Array<string>,
 *   labels: Array<string>,
 *   labels_zh: Array<string>
 * }} Object containing validated font names and labels
 * @private
 */
function getValidFontInfo(fontList, checkAvailability = true) {
    const fontInfo = {
        names: [],
        labels: [],
        labels_zh: [],
    };

    fontList.forEach((font) => {
        let fontName = null;
        const displayLabel = font.label_en || font.en; // Use the localized name if available
        const displayLabel_zh = font.label_zh || font.zh; // Use the localized name if available

        // Only check for system font availability if requested (for custom fonts, skip availability check)
        if (checkAvailability) {
            if (isFontAvailable(font.en)) {
                fontName = font.en;
            } else if (isFontAvailable(font.zh)) {
                fontName = font.zh;
            }

            // macOS-specific font check
            if (!fontName && font.macVariant && isFontAvailable(font.macVariant)) {
                fontName = font.macVariant;
            }

            // Linux-specific font check
            if (!fontName && font.linuxVariant && isFontAvailable(font.linuxVariant)) {
                fontName = font.linuxVariant;
            }
        } else {
            fontName = font.en; // For custom fonts, use the name directly since they exist in the CSS
        }

        // If a valid font name is found, add it along with the display labels
        if (fontName) {
            fontInfo.names.push(fontName);
            fontInfo.labels.push(displayLabel);
            fontInfo.labels_zh.push(displayLabel_zh);
        }
    });

    return [fontInfo.names, fontInfo.labels, fontInfo.labels_zh];
}

/**
 * Updates the language of font selector options and groups
 * @param {jQuery} $selector - jQuery selector element
 * @param {string} lang - Target language code ('en' or 'zh')
 * @public
 */
export function changeFontSelectorItemLanguage($selector, lang) {
    // if the selector exists, change the language of the options
    if ($selector && $selector.length) {
        // Flatten the array of arrays for English and Chinese labels
        const flatFilteredFontLabels = CONFIG.VARS.FILTERED_FONT_LABELS.flat();
        const flatFilteredFontLabelsZh = CONFIG.VARS.FILTERED_FONT_LABELS_ZH.flat();

        // Get all the group labels inside the select
        let $groups = $selector.closest(".select").children(".select-options").find(".optgroup-label");
        if ($groups && $groups.length) {
            // Loop through each group label and update the text based on the language
            $groups.each(function (i, group) {
                if (lang === "en") {
                    group.innerText = CONFIG.VARS.FONT_GROUPS[i]; // Use English group labels
                } else if (lang === "zh") {
                    group.innerText = CONFIG.VARS.FONT_GROUPS_ZH[i]; // Use Chinese group labels
                }
            });
        }

        // Get the current text inside the .select-styled div
        let $selectedOption = $selector.closest(".select").children(".select-styled");
        let currentText = $selectedOption.text().trim();
        let selectedIndex = -1;

        // Get all the options inside the select, including those in optgroups
        let $options = $selector.closest(".select").children(".select-options").find(".optgroup-option");
        // Loop through each option and update the text based on the language
        $options.each(function (i, option) {
            // Check if the current option matches the text in .select-styled div
            if (option.innerText.trim() === currentText) {
                selectedIndex = i; // Capture the index of the selected option
            }

            if (lang === "en") {
                option.innerText = flatFilteredFontLabels[i]; // Use flattened English labels
            } else if (lang === "zh") {
                option.innerText = flatFilteredFontLabelsZh[i]; // Use flattened Chinese labels
            }
        });

        // Update the selected option text based on the language
        if (lang === "en") {
            $selectedOption.text(flatFilteredFontLabels[selectedIndex]); // Set to English label
        } else if (lang === "zh") {
            $selectedOption.text(flatFilteredFontLabelsZh[selectedIndex]); // Set to Chinese label
        }
    }
}

/**
 * Creates font selector elements for both English and Chinese
 * @param {string} id - Element ID
 * @returns {Array<HTMLElement>} Array containing [englishSelector, chineseSelector]
 * @public
 */
export function createFontSelectorItem(id) {
    // Get valid font info
    const { system_fonts, custom_fonts, fallback_fonts } = getFontConfigs();
    const system_fonts_info = getValidFontInfo(system_fonts, true);
    const custom_fonts_info = getValidFontInfo(custom_fonts, false);

    // Create the font values array
    CONFIG.VARS.FILTERED_FONT_NAMES = [custom_fonts_info[0], system_fonts_info[0]];
    CONFIG.VARS.FILTERED_FONT_LABELS = [custom_fonts_info[1], system_fonts_info[1]];
    CONFIG.VARS.FILTERED_FONT_LABELS_ZH = [custom_fonts_info[2], system_fonts_info[2]];
    CONFIG.VARS.FONT_GROUPS = [
        CONFIG.RUNTIME_VARS.STYLE.ui_font_group_custom_en,
        CONFIG.RUNTIME_VARS.STYLE.ui_font_group_system_en,
    ];
    CONFIG.VARS.FONT_GROUPS_ZH = [
        CONFIG.RUNTIME_VARS.STYLE.ui_font_group_custom_zh,
        CONFIG.RUNTIME_VARS.STYLE.ui_font_group_system_zh,
    ];

    // Create the font selector element
    let fontSelector = createSelectorWithGroupItem(
        id,
        CONFIG.VARS.FILTERED_FONT_NAMES,
        CONFIG.VARS.FILTERED_FONT_LABELS,
        CONFIG.VARS.FONT_GROUPS,
        true
    );
    let fontSelector_zh = createSelectorWithGroupItem(
        id,
        CONFIG.VARS.FILTERED_FONT_NAMES,
        CONFIG.VARS.FILTERED_FONT_LABELS_ZH,
        CONFIG.VARS.FONT_GROUPS_ZH,
        true
    );

    return [fontSelector, fontSelector_zh];
}

/**
 * Finds the index of a font in the filtered font arrays
 * @param {string} fontName - Font name to find
 * @returns {number} Index of the font, or -1 if not found
 * @public
 */
export function findFontIndex(fontName) {
    const fontName_single = fontName.split(",")[0].trim();

    // First try to find the index in the custom_fonts array
    const idx1 = findStringIndex(CONFIG.VARS.FILTERED_FONT_NAMES, fontName_single);

    // If the font is found in the custom_fonts array, return the index
    if (idx1 !== -1) {
        return idx1;
    }

    // If the font is not found in the custom_fonts array, try to find it in the system_fonts array
    const idx2 = findStringIndex(CONFIG.VARS.FILTERED_FONT_LABELS, fontName_single);

    // If found in the system_fonts array, return the index + the length of the custom_fonts array
    if (idx2 !== -1) {
        return idx2;
    }

    // If the font is not found in either array, return -1
    return -1;
}

/**
 * Creates a range slider element
 * @param {string} id - Element ID
 * @param {number} value - Initial value
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {number} step - Step increment
 * @param {string} unit - Unit suffix (e.g., 'px', 'em')
 * @param {Function} func - Callback function to execute on input change
 * @returns {HTMLElement} Created range slider element
 * @public
 */
export function createRangeItem(id, value, min, max, step, unit, func) {
    const settingItem = document.createElement("div");
    settingItem.setAttribute("class", "settingItem-wrapper");
    const settingItemText = document.createElement("span");
    settingItemText.setAttribute("class", "settingItem-span");
    settingItemText.setAttribute("id", `settingLabel-${id}`);
    settingItemText.onselectstart = () => false;
    settingItemText.onmousedown = () => false;
    const settingItemInput = document.createElement("div");
    settingItemInput.setAttribute("class", "range-slider");
    settingItemInput.setAttribute(
        "style",
        `--min:${min}; --max:${max}; --step:${step};` +
            `--value:${value}; --text-value:"${JSON.stringify(value)}"; --suffix:"${unit}";` +
            `--ticks-color:${CONFIG.RUNTIME_VARS.STYLE.bgColor};`
    );
    const settingItemInputRange = document.createElement("input");
    settingItemInputRange.setAttribute("class", "range-slider-input");
    settingItemInputRange.setAttribute("type", "range");
    settingItemInputRange.setAttribute("id", id);
    settingItemInputRange.setAttribute("value", value);
    settingItemInputRange.setAttribute("min", min);
    settingItemInputRange.setAttribute("max", max);
    settingItemInputRange.setAttribute("step", step);
    settingItemInputRange.addEventListener("input", (e) => {
        e.target.parentNode.style.setProperty("--value", e.target.value);
        e.target.parentNode.style.setProperty("--text-value", JSON.stringify(e.target.value));
        func();
    });
    const settingItemInputOutput = document.createElement("output");
    settingItemInputOutput.setAttribute("class", "range-slider-output");
    settingItemInputOutput.setAttribute("style", `--thumb-text-color:${CONFIG.RUNTIME_VARS.STYLE.bgColor};`);
    const settingItemInputProgress = document.createElement("div");
    settingItemInputProgress.setAttribute("class", "range-slider__progress");
    settingItemInput.appendChild(settingItemInputRange);
    settingItemInput.appendChild(settingItemInputOutput);
    settingItemInput.appendChild(settingItemInputProgress);
    settingItem.appendChild(settingItemText);
    settingItem.appendChild(settingItemInput);
    return settingItem;
}

/**
 * Creates a color picker element
 * @param {string} id - Element ID
 * @param {string} value - Initial color value
 * @param {Array<string>} savedValues - Array of preset color values
 * @param {Function} func - Callback function to execute on input change
 * @returns {HTMLElement} Created color picker element
 * @throws {TypeError} If savedValues is not an array
 * @public
 */
export function createColorItem(id, value, savedValues, func) {
    // Check if savedValues is an array
    if (!Array.isArray(savedValues)) {
        throw new TypeError("savedValues must be an array");
    }

    let settingItem = document.createElement("div");
    settingItem.setAttribute("class", "settingItem-wrapper");
    let settingItemText = document.createElement("span");
    settingItemText.setAttribute("class", "settingItem-span");
    settingItemText.setAttribute("id", `settingLabel-${id}`);
    settingItemText.onselectstart = function () {
        return false;
    };
    settingItemText.onmousedown = function () {
        return false;
    };
    let settingItemInput = document.createElement("input");
    settingItemInput.setAttribute("id", id);
    settingItemInput.setAttribute("class", "myColor"); // use yaireo's color picker; at the moment, it doesn't work with the oninput event.
    // settingItemInput.setAttribute("type", "color");     // use the default color picker
    settingItemInput.setAttribute("inputmode", "none");
    settingItemInput.setAttribute("value", value);
    settingItemInput.setAttribute("data-swatches", JSON.stringify(savedValues));
    settingItemInput.setAttribute("data-placement", "center below");
    // settingItemInput.setAttribute("style", `--color:${value}; --colorInverted:${invertColor(CONFIG.RUNTIME_VARS.STYLE.bgColor, false, 0.5)};`);
    settingItemInput.setAttribute(
        "style",
        `--color:${value}; --colorInverted:${CONFIG.RUNTIME_VARS.STYLE.borderColor};`
    );
    settingItemInput.addEventListener("input", (e) => {
        func();
    });
    settingItem.appendChild(settingItemText);
    settingItem.appendChild(settingItemInput);
    return settingItem;
}

/**
 * Sets the value of a selector element
 * @param {string} id - Element ID
 * @param {number} selectedIndex - Index of the selected option
 * @public
 */
export function setSelectorValue(id, selectedIndex) {
    // Get the select element by ID
    const $select = document.getElementById(id);
    if (!$select) {
        console.error(`Element with id '${id}' not found.`);
        return;
    }

    // Get all <option> elements inside the <select> (flattening across optgroups, if any)
    const $options = Array.from($select.querySelectorAll("option"));

    // Ensure the selectedIndex is within the valid range
    if (selectedIndex < 0 || selectedIndex >= $options.length) {
        console.error(`Selected index '${selectedIndex}' is out of bounds.`);
        return;
    }

    // Set the selected option in the native <select> element
    $select.selectedIndex = selectedIndex;
    const selectedValue = $options[selectedIndex].value;
    const selectedText = $options[selectedIndex].text;
    const selectedAttr = $options[selectedIndex].getAttribute("style");

    // Get the custom dropdown elements
    const $customSelect = $select.closest(".select");
    const $styledSelect = $customSelect.querySelector(".select-styled");
    let $customOptions = Array.from(
        $customSelect.querySelectorAll(".select-options li.optgroup-option, .select-options li")
    ); // Handle both cases
    // If $customOptions contains optgroup-label elements, remove them
    $customOptions = $customOptions.filter(($li) => !$li.classList.contains("optgroup-label"));

    // Update the visible styled select text
    $styledSelect.textContent = selectedText;
    $styledSelect.setAttribute("style", selectedAttr);

    // Remove 'is-selected' from all custom options and set it on the correct one
    $customOptions.forEach(($li, index) => {
        if (index === selectedIndex) {
            $li.classList.add("is-selected");
        } else {
            $li.classList.remove("is-selected");
        }
    });
}

/**
 * Sets the value of a range slider element
 * @param {string} id - Element ID
 * @param {number} value - New value
 * @public
 */
export function setRangeValue(id, value) {
    let temp_item = document.getElementById(id);
    temp_item.value = parseFloat(value);
    temp_item.parentElement.style.setProperty("--value", parseFloat(value));
    temp_item.parentElement.style.setProperty("--text-value", `"${JSON.stringify(parseFloat(value))}"`);
}

/**
 * Sets the value of a color picker element
 * @param {string} id - Element ID
 * @param {string} value - New color value
 * @public
 */
export function setColorValue(id, value) {
    let temp_item = document.getElementById(id);
    temp_item.value = value;
    temp_item.style.setProperty("--color", value);
    // document.querySelectorAll(".myColor").forEach((colorInput) => {
    //     if (colorInput.id == id) {
    //         console.log(colorInput.id);
    //         colorInput.value = value;
    //         colorInput.style.setProperty("--color", value);
    //         console.log(colorInput._colorPicker.color, value);
    //         colorInput._colorPicker.color = {h: 0, s: 0, l: 0, a: '100'};
    //         console.log(colorInput._colorPicker.DOM.scope);
    //         colorInput._colorPicker.DOM.scope.style.setProperty("--hue", 0);
    //         colorInput._colorPicker.DOM.scope.style.setProperty("--saturation", 0);
    //         colorInput._colorPicker.DOM.scope.style.setProperty("--lightness", 0);
    //         colorInput._colorPicker.DOM.scope.style.setProperty("--alpha", 100);
    //         colorInput._colorPicker.DOM.scope.querySelectorAll(".range").forEach((range) => {
    //             if (range.title == "hue") {
    //                 range.style.setProperty("--value", 0);
    //                 range.style.setProperty("--text-value", `"${JSON.stringify(0)}"`);
    //             } else if (range.title == "saturation") {
    //                 range.style.setProperty("--value", 0);
    //                 range.style.setProperty("--text-value", `"${JSON.stringify(0)}"`);
    //             } else if (range.title == "lightness") {
    //                 range.style.setProperty("--value", 0);
    //                 range.style.setProperty("--text-value", `"${JSON.stringify(0)}"`);
    //             } else if (range.title == "alpha") {
    //                 range.style.setProperty("--value", 100);
    //                 range.style.setProperty("--text-value", `"${JSON.stringify(100)}"`);
    //             }
    //         });
    //         // simulateClick(colorInput._colorPicker.DOM.scope);

    //         console.log(colorInput._colorPicker.color)

    //     }
    // });
    // $(window).trigger('resize');
    // temp_item.style.display = "none";
    // temp_item.style.display = "block";
}

/**
 * Handles click outside the settings menu
 * @param {Event} event - Click event
 * @public
 */
export function handleClickOutsideBox(event) {
    const settingsMenu = CONFIG.DOM_ELEMENT.SETTINGS_MENU;
    const settingsBtn = CONFIG.DOM_ELEMENT.SETTINGS_BUTTON;
    const colorPickerArray = document.getElementsByClassName("color-picker");
    CONFIG.VARS.IS_COLOR_PICKER_OPEN.push(isVariableDefined(colorPickerArray) && colorPickerArray.length > 0);
    CONFIG.VARS.IS_COLOR_PICKER_OPEN.shift();
    // console.log(colorPickerArray, CONFIG.VARS.IS_COLOR_PICKER_OPEN);
    if (!settingsMenu) return;
    if (!settingsMenu.contains(event.target) && !settingsBtn.contains(event.target)) {
        if (CONFIG.VARS.SETTINGS_MENU_SHOWN) {
            if (CONFIG.VARS.IS_COLOR_PICKER_OPEN[0]) {
                // if color picker was open before the click
                // do nothing as the click is to close the color picker
                return;
            } else {
                return {
                    shouldSave: true,
                    shouldHide: true,
                };
            }
        }
    }
}