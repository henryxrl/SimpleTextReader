/**
 * @fileoverview Settings helper functions for managing UI settings and preferences
 *
 * This module provides utility functions for:
 * - CSS manipulation and style management
 * - Creating UI setting elements (selectors, ranges, color pickers)
 * - Font management and validation
 * - Language switching for settings UI
 *
 * @module client/app/utils/helpers-settings
 * @requires client/app/config/index
 * @requires client/app/utils/base
 */

import * as CONFIG from "../config/index.js";
import { findStringIndex, isVariableDefined, simulateClick, toBool, getStylesheet } from "./base.js";

/**
 * Cache for loaded fonts
 * @type {Map<string, boolean>}
 * @private
 */
const fontCache = new Map();

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
    settingItemInput.setAttribute("aria-label", id);

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
 * @param {Array<string>} statuses - Array of font statuses
 * @param {boolean} isFont - Whether this is a font selector
 * @returns {HTMLElement} Created grouped selector element
 * @private
 */
function createSelectorWithGroupItem(id, values, texts, groups, statuses, isFont = false) {
    const settingItem = document.createElement("div");
    settingItem.setAttribute("class", "settingItem-wrapper");

    const settingItemText = document.createElement("span");
    settingItemText.setAttribute("class", "settingItem-span");
    settingItemText.setAttribute("id", `settingLabel-${id}`);
    settingItemText.onselectstart = () => false;
    settingItemText.onmousedown = () => false;

    const settingItemInput = document.createElement("select");
    settingItemInput.setAttribute("id", id);
    settingItemInput.setAttribute("aria-label", id);

    groups.forEach((group, i) => {
        const optgroup = document.createElement("optgroup");
        optgroup.setAttribute("label", group);

        values[i].forEach((value, j) => {
            const option = document.createElement("option");
            option.setAttribute("value", value);
            if (statuses[i]?.[j] !== undefined && statuses[i][j] !== true) {
                option.setAttribute("data-status", statuses[i][j]);
            }
            option.innerText = texts[i][j];

            if (isFont) {
                option.style.fontFamily = `${value}, ${CONFIG.CONST_FONT.FALLBACK_FONTS.join(",")}`;
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
 * Updates the language of a language selector item
 * @param {jQuery} $selector - jQuery selector element
 * @param {string} lang - Target language code ('en' or 'zh')
 * @public
 */
export function changeLanguageSelectorItemLanguage($selector, lang) {
    if ($selector && $selector.length) {
        // console.log("changeLanguageSelectorItemLanguage", { $selector, lang });
        // console.log(CONFIG.RUNTIME_VARS.STYLE.ui_language_text);

        // Get the current text inside the .select-styled div
        let $selectedOption = $selector.closest(".select").children(".select-styled");
        let currentText = $selectedOption.find("span").text().trim();
        // console.log("currentText:", currentText);
        if (
            currentText === CONFIG.RUNTIME_VARS.STYLE.ui_language_text_zh ||
            currentText === CONFIG.RUNTIME_VARS.STYLE.ui_language_text_en
        ) {
            $selectedOption.find("span").text(CONFIG.RUNTIME_VARS.STYLE.ui_language_text);
        }

        // Get all the options inside the select
        let $option = $selector.closest(".select").children(".select-options").find(".option").first();
        $option.find(".option-text").text(CONFIG.RUNTIME_VARS.STYLE.ui_language_text);
    }
}

/**
 * Checks if a font is available in the system
 * @param {string} font - Font name to check
 * @returns {boolean} True if font is available
 * @private
 */
function isFontAvailable(font) {
    // If the font is not defined, return false
    if (!font || font === "" || font === "undefined") {
        return false;
    }

    // If the font is already cached, return the cached result
    if (fontCache.has(font)) {
        // Update the cache based on the font status
        if (window.FONT_STATUS[font] === "loaded") {
            fontCache.set(font, true);
        }
        if (window.FONT_STATUS[font] === "failed") {
            fontCache.set(font, false);
        }
        if (window.FONT_STATUS[font] === "loading") {
            fontCache.set(font, "loading");
        }
        return fontCache.get(font);
    }

    // Step 1: Check if the font is defined in @font-face in CSS
    let isFontFaceDefined = false;
    const variablesStylesheet = getStylesheet();
    if (variablesStylesheet) {
        try {
            // Loop through all the rules in variables.css
            for (const rule of variablesStylesheet.cssRules) {
                // Check if the rule is a CSSFontFaceRule
                if (rule instanceof CSSFontFaceRule) {
                    const fontFamily = rule.style.getPropertyValue("font-family").replace(/['"]/g, "").trim();
                    if (fontFamily === font) {
                        isFontFaceDefined = true;
                        break;
                    }
                }
            }
        } catch (e) {
            console.warn("Cannot read cssRules from variables.css:", e);
        }
    } else {
        console.warn("variables.css not found.");
    }

    try {
        // Step 2: Check if font is already available using the Font Loading API
        // console.log(`${font}: ${document.fonts.check(`12px "${font}"`)}`);
        if (document.fonts.check(`12px "${font}"`) && !isFontFaceDefined) {
            // Additional check to confirm no fallback
            const fallbackWidth = measureText(CONFIG.CONST_FONT.FALLBACK_FONTS.join(",")); // Known fallback font
            const testWidth = measureText(`${font}, ${CONFIG.CONST_FONT.FALLBACK_FONTS.join(",")}`);

            if (testWidth === fallbackWidth) {
                // Font is falling back to default, not actually available
                fontCache.set(font, false);
                return false;
            }

            fontCache.set(font, true);
            return true;
        }

        // Step 3: If font is defined in @font-face but not loaded yet, try loading it
        if (isFontFaceDefined) {
            try {
                // Don't load the font if it's already loaded
                if (document.fonts.check(`12px "${font}"`)) {
                    fontCache.set(font, true);
                    return true;
                }

                // Check the font status
                if (window.FONT_STATUS[font] === "loaded") {
                    fontCache.set(font, true);
                    return true;
                }

                if (window.FONT_STATUS[font] === "failed") {
                    fontCache.set(font, false);
                    return false;
                }

                if (window.FONT_STATUS[font] === "loading") {
                    fontCache.set(font, "loading");
                    return "loading";
                }
            } catch (e) {
                // console.warn(`Failed to load font ${font}:`, e);
                fontCache.set(font, false);
                return false;
            }
        }

        // If not defined in @font-face, it's not available
        fontCache.set(font, false);
        return false;
    } catch {
        // Step 4: Fallback to measureText if Font Loading API is not available
        // console.warn("Font Loading API not available, falling back to measureText");

        const fallbackWidth = measureText(CONFIG.CONST_FONT.FALLBACK_FONTS.join(","));
        const testFontWidth = measureText(`${font}, ${CONFIG.CONST_FONT.FALLBACK_FONTS.join(",")}`);
        // console.log(`${font} defined in @font-face: ${isFontFaceDefined}`);
        // console.log(`${font}, ${CONFIG.CONST_FONT.FALLBACK_FONTS.join(",")}: ${testFontWidth}`);
        // console.log(`${CONFIG.CONST_FONT.FALLBACK_FONTS.join(",")}: ${fallbackWidth}`);
        // if (isFontFaceDefined) {
        //     console.log(`${font}, ${CONFIG.CONST_FONT.FALLBACK_FONTS.join(",")}: ${testFontWidth}`);
        //     console.log(`${CONFIG.CONST_FONT.FALLBACK_FONTS.join(",")}: ${fallbackWidth}`);
        // }

        // Return true if either:
        // 1. Font is defined in @font-face AND successfully loaded (width different from fallback)
        // 2. Font is installed in system (width different from fallback)
        const isAvailable =
            (isFontFaceDefined && testFontWidth !== fallbackWidth) ||
            (!isFontFaceDefined && testFontWidth !== fallbackWidth);
        fontCache.set(font, isAvailable);
        return isAvailable;
    }
}

/**
 * Measures the width of a text string (Optimized with cached canvas)
 * @param {string} font - Font name
 * @returns {number} Width of the text string
 * @private
 */
const measureText = (() => {
    const testString =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789零一二三四五六七八九十百千万亿易笺藏书";
    const testSize = "72px";

    // Cache the canvas for reuse
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    return function (font) {
        context.font = `${testSize} ${font}`;
        return context.measureText(testString).width;
    };
})();

/**
 * Gets valid font information from a list of fonts
 * Validates font availability and formats labels
 * @param {Array<{en: string, zh: string, label_en?: string, label_zh?: string}>} fontList - List of font objects
 * @param {boolean} checkAvailability - Whether to check if fonts are available in system
 * @returns {Array<Array<string>>} Array containing [names, labels, labels_zh]
 * @private
 */
function getValidFontInfo(fontList, checkAvailability = true) {
    const fontInfo = {
        names: [],
        labels: [],
        labels_zh: [],
        statuses: [],
    };

    for (const font of fontList) {
        let fontName = null;
        let fontStatus = false; // Default status if font isn't found
        const displayLabel = font.label_en || font.en; // Use the localized name if available
        const displayLabel_zh = font.label_zh || font.zh; // Use the localized name if available

        // Only check for system font availability if requested (for custom fonts, skip availability check)
        if (checkAvailability) {
            // console.log(
            //     `${displayLabel_zh}: ${
            //         (await isFontAvailable(font.en)) ||
            //         (await isFontAvailable(font.zh)) ||
            //         (await isFontAvailable(font.macVariant)) ||
            //         (await isFontAvailable(font.linuxVariant))
            //     }`
            // );

            let status = isFontAvailable(font.en);
            if (status !== false) {
                fontName = font.en;
                fontStatus = status;
            }

            if (!fontName) {
                status = isFontAvailable(font.zh);
                if (status !== false) {
                    fontName = font.zh;
                    fontStatus = status;
                }
            }

            // macOS-specific font check
            if (!fontName && font.macVariant) {
                status = isFontAvailable(font.macVariant);
                if (status !== false) {
                    fontName = font.macVariant;
                    fontStatus = status;
                }
            }

            // Linux-specific font check
            if (!fontName && font.linuxVariant) {
                status = isFontAvailable(font.linuxVariant);
                if (status !== false) {
                    fontName = font.linuxVariant;
                    fontStatus = status;
                }
            }
        } else {
            fontName = font.en; // For custom fonts, use the name directly since they exist in the CSS
            fontStatus = true;
        }

        // If a valid font name is found, add it along with the display labels
        if (fontName) {
            fontInfo.names.push(fontName);
            fontInfo.labels.push(displayLabel);
            fontInfo.labels_zh.push(displayLabel_zh);
            fontInfo.statuses.push(fontStatus);
        }
    }

    return [fontInfo.names, fontInfo.labels, fontInfo.labels_zh, fontInfo.statuses];
}

/**
 * Gets valid custom font information from a map
 * @param {Map<string, {en: string, zh: string, label_en?: string, label_zh?: string}>} fontMap - Map of custom fonts
 * @returns {Array<Array<string>>} Array containing [names, labels, labels_zh]
 * @private
 */
function getValidCustomFontInfo(fontMap) {
    const fontInfo = {
        names: [],
        labels: [],
        labels_zh: [],
    };

    Object.entries(fontMap).forEach(([key, value]) => {
        fontInfo.names.push(key);
        fontInfo.labels.push(value.label_en ?? value.en);
        fontInfo.labels_zh.push(value.label_zh ?? value.zh);
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
        // console.log("flatFilteredFontLabels:", flatFilteredFontLabels);
        // console.log("flatFilteredFontLabelsZh:", flatFilteredFontLabelsZh);

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
        let currentText = $selectedOption.find("span").text().trim();
        let selectedIndex = -1;

        // Get all the options inside the select, including those in optgroups
        let $options = $selector.closest(".select").children(".select-options").find(".optgroup-option");
        // Loop through each option and update the text based on the language
        $options.each(function (i, option) {
            // Check if the current option matches the text in .select-styled div
            const optionText = $(option).find(".option-text").text().trim();
            if (optionText === currentText) {
                selectedIndex = i; // Capture the index of the selected option
            }

            if (lang === "en") {
                $(option).find(".option-text").text(flatFilteredFontLabels[i]); // Use flattened English labels
            } else if (lang === "zh") {
                $(option).find(".option-text").text(flatFilteredFontLabelsZh[i]); // Use flattened Chinese labels
            }
        });

        // Update the selected option text based on the language
        if (lang === "en") {
            $selectedOption.find("span").text(flatFilteredFontLabels[selectedIndex]); // Set to English label
        } else if (lang === "zh") {
            $selectedOption.find("span").text(flatFilteredFontLabelsZh[selectedIndex]); // Set to Chinese label
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
    const system_fonts_info = getValidFontInfo(CONFIG.CONST_FONT.SYSTEM_FONTS, true);
    const app_fonts_info = getValidFontInfo(CONFIG.CONST_FONT.APP_FONTS, true);
    const custom_fonts_info = getValidCustomFontInfo(CONFIG.VARS.CUSTOM_FONTS);

    // Create the font values array
    const hasCustomFonts = custom_fonts_info.every((arr) => arr.length > 0);

    // Base font arrays that are always included
    const fontArrays = {
        names: [app_fonts_info[0], system_fonts_info[0]],
        labels: [app_fonts_info[1], system_fonts_info[1]],
        labels_zh: [app_fonts_info[2], system_fonts_info[2]],
        statuses: [app_fonts_info[3], system_fonts_info[3]],
        groups_en: [CONFIG.RUNTIME_VARS.STYLE.ui_font_group_app_en, CONFIG.RUNTIME_VARS.STYLE.ui_font_group_system_en],
        groups_zh: [CONFIG.RUNTIME_VARS.STYLE.ui_font_group_app_zh, CONFIG.RUNTIME_VARS.STYLE.ui_font_group_system_zh],
    };

    // Insert custom fonts if available
    if (hasCustomFonts) {
        fontArrays.names.splice(1, 0, custom_fonts_info[0]);
        fontArrays.labels.splice(1, 0, custom_fonts_info[1]);
        fontArrays.labels_zh.splice(1, 0, custom_fonts_info[2]);
        fontArrays.statuses.splice(1, 0, custom_fonts_info[3]);
        fontArrays.groups_en.splice(1, 0, CONFIG.RUNTIME_VARS.STYLE.ui_font_group_custom_en);
        fontArrays.groups_zh.splice(1, 0, CONFIG.RUNTIME_VARS.STYLE.ui_font_group_custom_zh);
    }

    // Update CONFIG.VARS with the prepared arrays
    Object.assign(CONFIG.VARS, {
        FILTERED_FONT_NAMES: fontArrays.names,
        FILTERED_FONT_LABELS: fontArrays.labels,
        FILTERED_FONT_LABELS_ZH: fontArrays.labels_zh,
        FONT_GROUPS: fontArrays.groups_en,
        FONT_GROUPS_ZH: fontArrays.groups_zh,
        FONT_STATUS: fontArrays.statuses,
    });

    // Create the font selector element
    const fontSelector = createSelectorWithGroupItem(
        id,
        CONFIG.VARS.FILTERED_FONT_NAMES,
        CONFIG.VARS.FILTERED_FONT_LABELS,
        CONFIG.VARS.FONT_GROUPS,
        CONFIG.VARS.FONT_STATUS,
        true
    );
    const fontSelector_zh = createSelectorWithGroupItem(
        id,
        CONFIG.VARS.FILTERED_FONT_NAMES,
        CONFIG.VARS.FILTERED_FONT_LABELS_ZH,
        CONFIG.VARS.FONT_GROUPS_ZH,
        CONFIG.VARS.FONT_STATUS,
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
    let fontName_single = fontName.split(",")[0].trim();
    // console.log("fontName_single:", fontName_single);

    // First try to find the index in the custom_fonts array
    fontName_single = CONFIG.CONST_FONT.FONT_MAPPING[fontName_single] || fontName_single;
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
 * @param {Object} rangeConfig - Range configuration object
 * @param {number} rangeConfig.min - Minimum value
 * @param {number} rangeConfig.max - Maximum value
 * @param {number} rangeConfig.step - Step increment
 * @param {string} rangeConfig.unit - Unit suffix (e.g., 'px', 'em')
 * @param {Array<string>} [rangeConfig.textValues] - Array of text values for the slider (optional)
 * @param {Function} func - Callback function to execute on input change
 * @param {boolean} note - Whether to display a note in the tooltip
 * @returns {HTMLElement} Created range slider element
 * @public
 */
export function createRangeItem(id, value, rangeConfig, func, note = false) {
    const { min, max, step, unit, textValues = null } = rangeConfig;

    const rangeLength = Math.floor((max - min) / step) + 1;
    const isValidTextValues = Array.isArray(textValues) && textValues.length === rangeLength;

    const getTextValue = (value) => {
        if (!isValidTextValues) return String(value);
        const index = Math.floor((value - min) / step);
        return textValues[index];
    };

    const getUnitValue = () => {
        if (!isValidTextValues) return unit;
        return "";
    };

    const settingItem = document.createElement("div");
    settingItem.setAttribute("class", "settingItem-wrapper");
    const settingItemText = document.createElement("span");
    settingItemText.setAttribute("class", "settingItem-span");
    settingItemText.setAttribute("id", `settingLabel-${id}`);
    settingItemText.onselectstart = () => false;
    settingItemText.onmousedown = () => false;

    if (note) {
        settingItemText.innerHTML = `<span class='tooltip-icon'>${CONFIG.RUNTIME_VARS.STYLE.ui_setting_note_indicator}</span>`;
        const tooltip = document.createElement("div");
        tooltip.setAttribute("class", "tooltip");
        tooltip.setAttribute("id", `tooltip-${id}`);
        settingItemText.appendChild(tooltip);
    }

    const settingItemInput = document.createElement("div");
    settingItemInput.setAttribute("class", "range-slider");
    settingItemInput.setAttribute(
        "style",
        `--min:${min}; --max:${max}; --step:${step};` +
            `--value:${value}; --text-value:${JSON.stringify(getTextValue(value))}; --suffix:"${getUnitValue()}";` +
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
        const value = e.target.value;
        e.target.parentNode.style.setProperty("--value", value);
        e.target.parentNode.style.setProperty("--text-value", JSON.stringify(getTextValue(value)));
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
 * @param {boolean} note - Whether to display a note in the tooltip
 * @returns {HTMLElement} Created color picker element
 * @throws {TypeError} If savedValues is not an array
 * @public
 */
export function createColorItem(id, value, savedValues, func, note = false) {
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

    if (note) {
        settingItemText.innerHTML = `<span class='tooltip-icon'>${CONFIG.RUNTIME_VARS.STYLE.ui_setting_note_indicator}</span>`;
        const tooltip = document.createElement("div");
        tooltip.setAttribute("class", "tooltip");
        tooltip.setAttribute("id", `tooltip-${id}`);
        settingItemText.appendChild(tooltip);
    }

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
 * Creates a checkbox item element
 * @param {string} id - Element ID
 * @param {boolean} value - New boolean value
 * @param {function} func - Function to call when the checkbox is clicked
 * @param {boolean} note - Whether to display a note in the tooltip
 * @returns {HTMLElement} Created checkbox item element
 */
export function createCheckboxItem(id, value, func, note = false) {
    const settingItem = document.createElement("div");
    settingItem.setAttribute("class", "settingItem-wrapper");

    const settingItemText = document.createElement("span");
    settingItemText.setAttribute("class", "settingItem-span");
    settingItemText.setAttribute("id", `settingLabel-${id}`);
    settingItemText.onselectstart = () => false;
    settingItemText.onmousedown = () => false;

    if (note) {
        settingItemText.innerHTML = `<span class='tooltip-icon'>${CONFIG.RUNTIME_VARS.STYLE.ui_setting_note_indicator}</span>`;
        const tooltip = document.createElement("div");
        tooltip.setAttribute("class", "tooltip");
        tooltip.setAttribute("id", `tooltip-${id}`);
        settingItemText.appendChild(tooltip);
    }

    const settingItemInput = document.createElement("label");
    settingItemInput.setAttribute("class", "switch");

    const settingItemCheckbox = document.createElement("input");
    settingItemCheckbox.setAttribute("type", "checkbox");
    settingItemCheckbox.setAttribute("id", id);
    if (value) {
        settingItemCheckbox.setAttribute("checked", "checked");
    }
    settingItemCheckbox.addEventListener("change", () => {
        func();
    });

    const settingItemSwitch = document.createElement("div");
    settingItemSwitch.setAttribute("class", "switch__gfx");

    settingItemInput.appendChild(settingItemCheckbox);
    settingItemInput.appendChild(settingItemSwitch);

    settingItem.appendChild(settingItemText);
    settingItem.appendChild(settingItemInput);

    return settingItem;
}

/**
 * Creates a separator item element
 * @param {string} id - Element ID
 * @returns {HTMLElement} Created separator item element
 */
export function createSeparatorItem() {
    const separator = document.createElement("div");
    separator.setAttribute("class", "settingItem-divider");
    return separator;
}

/**
 * Creates a separator item element with text in the middle
 * @param {string} id - Element ID
 * @returns {HTMLElement} Created separator item element
 */
export function createSeparatorItemWithText(id) {
    const separator = document.createElement("div");
    separator.setAttribute("class", "settingItem-separator");

    const separatorText = document.createElement("span");
    separatorText.setAttribute("class", "settingItem-separator-span");
    separatorText.setAttribute("id", `settingLabel-${id}`);

    separator.appendChild(separatorText);
    return separator;
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

    // Get all the corresponding option text inside the .select-options -> .optgroup-option -> .option-text or .option -> .option-text elements
    const $optionsText = Array.from(
        $select.parentElement
            .querySelector(".select-options")
            .querySelectorAll(".optgroup-option .option-text, .option .option-text")
    );

    // Ensure the selectedIndex is within the valid range
    if (selectedIndex < 0 || selectedIndex >= $options.length) {
        console.error(`Selected index '${selectedIndex}' is out of bounds.`);
        return;
    }

    // Set the selected option in the native <select> element
    $select.selectedIndex = selectedIndex;
    const selectedValue = $options[selectedIndex].value;
    const selectedText = $optionsText[selectedIndex].innerText ?? $options[selectedIndex].text;
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
    const $styledSelectSpan = $styledSelect.querySelector("span") || document.createElement("span");
    $styledSelectSpan.textContent = selectedText;
    if (!$styledSelect.contains($styledSelectSpan)) {
        $styledSelect.appendChild($styledSelectSpan);
    }
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
}

/**
 * Sets the value of a checkbox element
 * @param {string} id - Element ID
 * @param {boolean} value - New boolean value
 * @public
 */
export function setCheckboxValue(id, value) {
    let temp_item = document.getElementById(id);
    temp_item.checked = toBool(value);
    temp_item.style.setProperty("--checked", temp_item.checked ? "1" : "0");
}

/**
 * Handles the closing of the settings menu
 * @param {Event} e - Click event
 * @public
 */
export function handleSettingsClose(e, isEscKey = false) {
    const settingsMenu = CONFIG.DOM_ELEMENT.SETTINGS_MENU;
    const settingsBtn = CONFIG.DOM_ELEMENT.SETTINGS_BUTTON;
    const colorPickerArray = document.getElementsByClassName("color-picker");
    CONFIG.VARS.IS_COLOR_PICKER_OPEN.push(isVariableDefined(colorPickerArray) && colorPickerArray.length > 0);
    CONFIG.VARS.IS_COLOR_PICKER_OPEN.shift();
    // console.log("colorPickerArray:", colorPickerArray);
    // console.log("CONFIG.VARS.IS_COLOR_PICKER_OPEN[0]:", CONFIG.VARS.IS_COLOR_PICKER_OPEN[0]);
    if (!settingsMenu) return;
    if ((!settingsMenu.contains(e.target) && !settingsBtn.contains(e.target)) || isEscKey) {
        // console.log("CONFIG.VARS.IS_SETTINGS_MENU_SHOWN:", CONFIG.VARS.IS_SETTINGS_MENU_SHOWN);
        if (CONFIG.VARS.IS_SETTINGS_MENU_SHOWN) {
            if (CONFIG.VARS.IS_COLOR_PICKER_OPEN[0]) {
                // console.log("color picker was open before the click");
                // if color picker was open before the click
                // do nothing as the click is to close the color picker

                if (isEscKey) {
                    // close the color picker
                    // document.body.click();
                    // Create a click event outside the color picker
                    const clickEvent = new MouseEvent("click", {
                        bubbles: true,
                        cancelable: true,
                        clientX: 10, // Ensure it's outside the color picker
                        clientY: 10,
                    });
                    // Trigger the click event
                    document.body.dispatchEvent(clickEvent);
                }

                return {
                    shouldSave: true,
                    shouldHide: false,
                    closedColorPicker: true,
                };
            } else {
                // console.log("color picker was not open before the click");
                return {
                    shouldSave: true,
                    shouldHide: true,
                    closedColorPicker: false,
                };
            }
        }
    }
}
