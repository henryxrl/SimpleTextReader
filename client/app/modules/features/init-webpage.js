/**
 * @fileoverview Webpage initialization script
 *
 * This script first sets up SVG sprite, then determines the language settings for the web application based on the user's browser settings
 * and local storage preferences. It sets the language attributes on the HTML document element accordingly.
 *
 * The script respects user language settings if the `respectUserLangSetting` flag is set to true.
 * Otherwise, it defaults to the browser's language settings.
 *
 * The script also checks if the page was opened as no-UI mode from extension, and sets the `isOpenedAsNoUI` attribute on the HTML document element accordingly.
 *
 * @module client/app/modules/features/init-webpage
 * @requires client/app/config/icons
 * @requires client/app/utils/base
 */

import { createSvgSprite } from "../../config/icons.js";
import { toBool, triggerCustomEvent, getStylesheet } from "../../utils/base.js";

/**
 * Toggle console.time
 */
window.consoleTime = false;

/**
 * Initialize the webpage
 */
(function () {
    if (window.consoleTime) console.time("[time] Initialize Webpage");
    // setupReaderUISplitViewParams();
    setupLanguageSettings();
    setupUITheme();
    setupSVGSprite();
    if (window.consoleTime) console.timeEnd("[time] Initialize Webpage");

    if (window.consoleTime) console.time("[time][background] Load Fonts and Check No-UI Mode");
    Promise.all([loadFontsInBackground(), checkAndSetNoUIMode()])
        .then(() => {
            if (window.consoleTime) console.timeEnd("[time][background] Load Fonts and Check No-UI Mode");
        })
        .catch((error) => {
            console.error("[ERROR] Initializing failed:", error);
        });
})();

/**
 * Setup reader UI splitview params
 */
function setupReaderUISplitViewParams() {
    const root = document.documentElement;
    const savedTOCWidth = localStorage.getItem("toc-width");
    if (savedTOCWidth) {
        root.style.setProperty("--sidebar-splitview-sidebar-width", `${savedTOCWidth}vw`);
    }
}

/**
 * Setup language settings
 */
function setupLanguageSettings() {
    /**
     * Flag to determine if user language settings should be respected
     * If not, then the book's language will be used
     */
    const respectUserLangSetting = toBool(localStorage.getItem("respectUserLangSetting"), false) ?? false;
    document.documentElement.setAttribute("respectUserLangSetting", respectUserLangSetting);
    // console.log("Respect user language settings: ", document.documentElement.getAttribute("respectUserLangSetting"));

    /**
     * Get the browser's language settings
     */
    const browser_LANGs = navigator.languages || [navigator.userLanguage] || [navigator.browserLanguage] || [
            navigator.language,
        ] || ["zh"];
    // const browser_LANG = browser_LANGs.includes("zh") ? "zh" : navigator.language.split("-")[0];
    const browser_LANG = browser_LANGs.includes("zh") ? "zh" : "en";
    localStorage.setItem("browser_LANG", browser_LANG);
    console.log("Browser language: ", browser_LANG);

    /**
     * Get the user's preferred language from local storage or use the browser's language
     */
    const user_LANG = localStorage.getItem("UILang") || browser_LANG;
    const webLANG = respectUserLangSetting ? user_LANG : browser_LANG;

    /**
     * Set the web language attribute on the HTML document element
     */
    document.documentElement.setAttribute("lang", webLANG);
    document.documentElement.setAttribute("webLANG", webLANG);
    document.documentElement.setAttribute("data-lang", webLANG);
    console.log("App set to language: ", webLANG);
}

/**
 * Setup UI theme
 */
function setupUITheme() {
    const uiMode = toBool(localStorage.getItem("UIMode"), false) ?? true;
    const theme = uiMode ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", theme);
}

/**
 * Load fonts in the background
 */
async function loadFontsInBackground() {
    // Fonts to load
    const fontsToLoad = ["kinghwa", "qiji", "wenkai", "fzskbxk", "fzkai"];

    // Global font status tracker
    window.FONT_STATUS = {}; // Stores: { "font-name": "loading" | "loaded" | "failed" }

    // Initialize all fonts as "loading"
    fontsToLoad.forEach((font) => (window.FONT_STATUS[font] = "loading"));

    // Load fonts
    if (window.consoleTime) console.time("[time][background] All fonts loaded");
    await Promise.allSettled(
        fontsToLoad.map(async (font) => {
            if (window.consoleTime) console.time(`[time][background] Load Font "${font}"`);

            try {
                await document.fonts.load(`12px ${font}`);
                window.FONT_STATUS[font] = "loaded";
                _finalizeSingleFontLoading(font);
            } catch {
                window.FONT_STATUS[font] = "failed";
                console.warn(`[FAILED] "${font}" failed to load`);
            } finally {
                if (window.consoleTime) console.timeEnd(`[time][background] Load Font "${font}"`);
            }
        })
    );

    // Now wait for full loading confirmation
    if (window.consoleTime) console.timeEnd("[time][background] All fonts loaded");
    console.log("Final font status:", window.FONT_STATUS);
    requestAnimationFrame(() => {
        triggerCustomEvent("refreshBookList", {
            hardRefresh: false,
            sortBookshelf: true,
        });
    });

    /**
     * Finalizes font loading status and updates the UI accordingly.
     * @param {string} font - The font to finalize.
     */
    function _finalizeSingleFontLoading(font) {
        if (window.FONT_STATUS[font] !== "failed") {
            // Remove loading indicators
            document.querySelectorAll(`option[value="${font}"], li[rel="${font}"]`).forEach((el) => {
                // Reset data-status attributes
                el.setAttribute("data-status", "");
                el.removeAttribute("data-status");
                el.offsetHeight; // Forces reflow (if needed)

                // If it's an <li>, check for .option-actions and remove loading-button
                if (el.matches("li[rel]")) {
                    el.querySelectorAll(".option-actions").forEach((optionAction) => {
                        if (optionAction.querySelector(".option-action.loading-button")) {
                            optionAction.remove();
                        }
                    });
                }
            });

            // Switch to full UI font
            // if (font === "wenkai") {
            //     _switchToFullUIFont();
            // }

            // Trigger custom event
            requestAnimationFrame(() => {
                triggerCustomEvent("refreshBookList", {
                    hardRefresh: false,
                    sortBookshelf: true,
                });
            });
        }

        console.log(`"${font}" is fully loaded`);
    }

    /**
     * Switch the UI font from the subset version to the full version dynamically
     */
    function _switchToFullUIFont() {
        console.log("[INFO] Switching UI font to full version...");

        // Firefox-specific fix: Temporarily hide text to prevent multiple flashes
        const isFirefox = navigator.userAgent.includes("Firefox");
        if (isFirefox) {
            document.body.style.visibility = "hidden"; // Hide text to prevent flash
        }

        // Inject new @font-face rule for full UI font
        const newFontFaceRule = `
            @font-face {
                font-family: "ui";
                src: local("霞鹜文楷 屏幕阅读版"), local("霞鹜文楷 GB 屏幕阅读版"), local("LXGW WenKai Screen"),
                    local("LXGW WenKai GB Screen"), url(/client/fonts/LXGWWenKaiScreen.woff2) format("woff2");
                font-display: swap;
            }
        `;
        document.styleSheets[0].insertRule(newFontFaceRule, document.styleSheets[0].cssRules.length);

        // Slight delay to let rendering stabilize before forcing the font switch
        requestAnimationFrame(() => {
            setTimeout(() => {
                document.body.style.fontFamily = "ui"; // Apply full font

                if (isFirefox) {
                    setTimeout(() => {
                        document.body.style.visibility = "visible"; // Restore text
                    }, 50); // Delay un-hiding to ensure stability
                }

                console.log("[INFO] UI font switched successfully.");

                // // Optional: Remove old subset font rule AFTER transition
                // setTimeout(() => {
                //     const existingRules = getStylesheet().cssRules;
                //     for (let i = 0; i < existingRules.length; i++) {
                //         if (existingRules[i].cssText.includes("font-family: ui")) {
                //             console.log("[INFO] Deleting existing subsetted font rule...");
                //             document.styleSheets[0].deleteRule(i);
                //             break;
                //         }
                //     }
                // }, 500); // Ensure a smooth transition before removing the subset font
            }, 50); // Small delay before applying font to prevent flickering
        });
    }
}

/**
 * Create SVG sprite
 */
function setupSVGSprite() {
    document.body.insertBefore(createSvgSprite(), document.body.firstChild);
}

/**
 * Check if the page was opened as no-UI mode from extension
 * @async
 * @returns {Promise<boolean>}
 */
async function checkAndSetNoUIMode() {
    /**
     * Get the API object
     */
    const api = typeof chrome !== "undefined" ? chrome : typeof browser !== "undefined" ? browser : null;

    /**
     * Wait for the storage API to be available
     * @param {number} maxAttempts - Maximum number of attempts to check for storage API
     * @param {number} delayMs - Delay in milliseconds between attempts
     * @returns {Promise<boolean>}
     */
    const _waitForStorage = async (maxAttempts = 10, delayMs = 100) => {
        for (let i = 0; i < maxAttempts; i++) {
            if (api?.storage?.local) return true;
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
        return false;
    };

    /**
     * Check if the page was opened as no-UI mode from extension
     * @returns {Promise<boolean>}
     */
    const _checkOpenedAsNoUI = async () => {
        // Wait for storage API to be available
        const storageAvailable = await _waitForStorage();
        if (!storageAvailable) return false;

        const result = await new Promise((resolve) => {
            api.storage.local.get(["openedAsNoUI"], (res) =>
                resolve(api.runtime.lastError ? false : !!res.openedAsNoUI)
            );
        });

        return result;
    };

    /**
     * Check if the page was opened as no-UI mode from extension
     * @returns {Promise<boolean>}
     */
    const openedAsNoUI = await _checkOpenedAsNoUI();
    document.documentElement.setAttribute("openedAsNoUI", openedAsNoUI);
}
