/**
 * @fileoverview Language initialization script
 *
 * This script determines the language settings for the web application based on the user's browser settings
 * and local storage preferences. It sets the language attributes on the HTML document element accordingly.
 *
 * The script respects user language settings if the `respectUserLangSetting` flag is set to true.
 * Otherwise, it defaults to the browser's language settings.
 */

(function () {
    // Flag to determine if user language settings should be respected
    const respectUserLangSetting = false;
    document.documentElement.setAttribute("respectUserLangSetting", respectUserLangSetting);
    // console.log("Respect user language settings: " + document.documentElement.getAttribute("respectUserLangSetting"));

    // Determine the browser's language settings
    const browser_LANGs = navigator.languages || [navigator.userLanguage] || [navigator.browserLanguage] || [
            navigator.language,
        ] || ["zh"];
    const browser_LANG = browser_LANGs.includes("zh") ? "zh" : navigator.language.split("-")[0];
    console.log("Browser language: " + browser_LANG);

    // Determine the user's preferred language from local storage or use the browser's language
    const user_LANG = localStorage.getItem("UILang") || browser_LANG;
    let webLANG = "";
    if (respectUserLangSetting) {
        webLANG = user_LANG;
    } else {
        webLANG = browser_LANG;
    }

    // Set the language attributes on the HTML document element
    document.documentElement.setAttribute("webLANG", webLANG);
    document.documentElement.setAttribute("data-lang", webLANG);
    console.log("App set to language: " + webLANG);
})();
