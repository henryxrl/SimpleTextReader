(function () {
    const respectUserLangSetting = false;
    document.documentElement.setAttribute(
        "respectUserLangSetting",
        respectUserLangSetting
    );
    // console.log("Respect user language settings: " + document.documentElement.getAttribute("respectUserLangSetting"));

    const browser_LANGs = navigator.languages || [navigator.userLanguage] || [
            navigator.browserLanguage,
        ] || [navigator.language] || ["zh"];
    const browser_LANG = browser_LANGs.includes("zh")
        ? "zh"
        : navigator.language.split("-")[0];
    console.log("Browser language: " + browser_LANG);
    const user_LANG = localStorage.getItem("UILang") || browser_LANG;
    let webLANG = "";
    if (respectUserLangSetting) {
        webLANG = user_LANG;
    } else {
        webLANG = browser_LANG;
    }
    document.documentElement.setAttribute("webLANG", webLANG);
    document.documentElement.setAttribute("data-lang", webLANG);
    console.log("App set to language: " + webLANG);
})();
