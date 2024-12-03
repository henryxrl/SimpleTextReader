/**
 * @fileoverview Webpage initialization script
 *
 * This script determines the language settings for the web application based on the user's browser settings
 * and local storage preferences. It sets the language attributes on the HTML document element accordingly.
 *
 * The script respects user language settings if the `respectUserLangSetting` flag is set to true.
 * Otherwise, it defaults to the browser's language settings.
 *
 * The script also checks if the page was opened as no-UI mode from extension, and sets the `isOpenedAsNoUI` attribute on the HTML document element accordingly.
 *
 * @module modules/features/init-webage
 */

(async function () {
    /**
     * Flag to determine if user language settings should be respected
     */
    const respectUserLangSetting = false;
    document.documentElement.setAttribute("respectUserLangSetting", respectUserLangSetting);
    // console.log("Respect user language settings: " + document.documentElement.getAttribute("respectUserLangSetting"));

    /**
     * Get the browser's language settings
     */
    const browser_LANGs = navigator.languages || [navigator.userLanguage] || [navigator.browserLanguage] || [
            navigator.language,
        ] || ["zh"];
    const browser_LANG = browser_LANGs.includes("zh") ? "zh" : navigator.language.split("-")[0];
    console.log("Browser language: " + browser_LANG);

    /**
     * Get the user's preferred language from local storage or use the browser's language
     */
    const user_LANG = localStorage.getItem("UILang") || browser_LANG;
    let webLANG = "";
    if (respectUserLangSetting) {
        webLANG = user_LANG;
    } else {
        webLANG = browser_LANG;
    }

    /**
     * Set the web language attribute on the HTML document element
     */
    document.documentElement.setAttribute("webLANG", webLANG);
    document.documentElement.setAttribute("data-lang", webLANG);
    console.log("App set to language: " + webLANG);

    /**
     * Check if the page was opened as no-UI mode from extension
     */
    const api = typeof chrome !== "undefined" ? chrome : typeof browser !== "undefined" ? browser : null;

    /**
     * Wait for the storage API to be available
     * @returns {Promise<boolean>}
     */
    const waitForStorage = async () => {
        const maxAttempts = 10;
        const delayMs = 100;

        for (let i = 0; i < maxAttempts; i++) {
            if (api?.storage?.local) {
                return true;
            }
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
        return false;
    };

    /**
     * Check if the page was opened as no-UI mode from extension
     * @returns {Promise<boolean>}
     */
    const checkOpenedAsNoUI = async () => {
        // 等待 storage API 初始化
        const storageAvailable = await waitForStorage();
        if (!storageAvailable) {
            // console.warn("Storage API not available");
            return false;
        }

        return new Promise((resolve) => {
            api.storage.local.get(["openedAsNoUI"], (result) => {
                if (api.runtime.lastError) {
                    console.warn("Storage get error:", api.runtime.lastError);
                    resolve(false);
                    return;
                }
                resolve(!!result.openedAsNoUI);
            });
        });
    };

    /**
     * Check if the page was opened as no-UI mode from extension
     * @returns {Promise<boolean>}
     */
    const openedAsNoUI = await checkOpenedAsNoUI();
    document.documentElement.setAttribute("openedAsNoUI", openedAsNoUI);
})();
