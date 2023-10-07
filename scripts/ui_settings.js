// Get css variables
style = new CSSGlobalVariables();
// console.log('Style loaded.')
// console.log(style);

// Initialize variables
const ui_language_mapping = {
    "zh": "简体中文",
    "en": "English"
}
let ui_language_default = style.ui_LANG;
let p_lineHeight_default = style.p_lineHeight;
let p_fontSize_default = style.p_fontSize;
let light_mainColor_active_default = style.mainColor_active;
let light_mainColor_inactive_default = style.mainColor_inactive;
let light_fontColor_default = style.fontColor;
let light_bgColor_default = style.bgColor;
let dark_mainColor_active_default = style.darkMode_mainColor_active;
let dark_mainColor_inactive_default = style.darkMode_mainColor_inactive;
let dark_fontColor_default = style.darkMode_fontColor;
let dark_bgColor_default = style.darkMode_bgColor;
let pagination_bottom_default = style.ui_paginationBottom;
let pagination_opacity_default = style.ui_paginationOpacity;

let ui_language;
let p_lineHeight;
let p_fontSize;
let light_mainColor_active;
let light_mainColor_inactive;
let light_fontColor;
let light_bgColor;
let dark_mainColor_active;
let dark_mainColor_inactive;
let dark_fontColor;
let dark_bgColor;
let pagination_bottom;
let pagination_opacity;

let settingsMenu_shown = false;
let isColorPickerOpen = [false, false];


// Initialiize settings button
$(`<div id="STRe-setting-btn" class="btn-icon hasTitle" title="${style.ui_tooltip_settings}">
    <svg class="icon-nofill" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path class="tofill" fill-rule="evenodd" clip-rule="evenodd" d="M11.567 9.8895C12.2495 8.90124 12.114 7.5637 11.247 6.7325C10.3679 5.88806 9.02339 5.75928 7.99998 6.4215C7.57983 6.69308 7.25013 7.0837 7.05298 7.5435C6.85867 7.99881 6.80774 8.50252 6.90698 8.9875C7.00665 9.47472 7.25054 9.92071 7.60698 10.2675C7.97021 10.6186 8.42786 10.8563 8.92398 10.9515C9.42353 11.049 9.94062 11.0001 10.413 10.8105C10.8798 10.6237 11.2812 10.3033 11.567 9.8895Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path class="tofill" fill-rule="evenodd" clip-rule="evenodd" d="M12.433 17.8895C11.7504 16.9012 11.886 15.5637 12.753 14.7325C13.6321 13.8881 14.9766 13.7593 16 14.4215C16.4202 14.6931 16.7498 15.0837 16.947 15.5435C17.1413 15.9988 17.1922 16.5025 17.093 16.9875C16.9933 17.4747 16.7494 17.9207 16.393 18.2675C16.0298 18.6186 15.5721 18.8563 15.076 18.9515C14.5773 19.0481 14.0614 18.9988 13.59 18.8095C13.1222 18.6234 12.7197 18.3034 12.433 17.8895V17.8895Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path class="tofill" d="M12 7.75049C11.5858 7.75049 11.25 8.08627 11.25 8.50049C11.25 8.9147 11.5858 9.25049 12 9.25049V7.75049ZM19 9.25049C19.4142 9.25049 19.75 8.9147 19.75 8.50049C19.75 8.08627 19.4142 7.75049 19 7.75049V9.25049ZM6.857 9.25049C7.27121 9.25049 7.607 8.9147 7.607 8.50049C7.607 8.08627 7.27121 7.75049 6.857 7.75049V9.25049ZM5 7.75049C4.58579 7.75049 4.25 8.08627 4.25 8.50049C4.25 8.9147 4.58579 9.25049 5 9.25049V7.75049ZM12 17.2505C12.4142 17.2505 12.75 16.9147 12.75 16.5005C12.75 16.0863 12.4142 15.7505 12 15.7505V17.2505ZM5 15.7505C4.58579 15.7505 4.25 16.0863 4.25 16.5005C4.25 16.9147 4.58579 17.2505 5 17.2505V15.7505ZM17.143 15.7505C16.7288 15.7505 16.393 16.0863 16.393 16.5005C16.393 16.9147 16.7288 17.2505 17.143 17.2505V15.7505ZM19 17.2505C19.4142 17.2505 19.75 16.9147 19.75 16.5005C19.75 16.0863 19.4142 15.7505 19 15.7505V17.2505ZM12 9.25049H19V7.75049H12V9.25049ZM6.857 7.75049H5V9.25049H6.857V7.75049ZM12 15.7505H5V17.2505H12V15.7505ZM17.143 17.2505H19V15.7505H17.143V17.2505Z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
</div>`)
.click(() => {
    if (settingsMenu_shown) {
        hideSettingMenu();
    } else {
        showSettingMenu();
    }
})
.appendTo($("#btnWrapper"))
// .hide();


// Initialize settings menu
loadSettings();
applySettings();
initiateSettingMenu();


//
// Main functions
//
function loadSettings() {
    if (respectUserLangSetting)
        ui_language = localStorage.getItem("UILang") || ui_language_default;
    p_lineHeight = localStorage.getItem("p_lineHeight") || p_lineHeight_default;
    p_fontSize = localStorage.getItem("p_fontSize") || p_fontSize_default;
    light_mainColor_active = localStorage.getItem("light_mainColor_active") || light_mainColor_active_default;
    light_mainColor_inactive = localStorage.getItem("light_mainColor_inactive") || light_mainColor_inactive_default;
    light_fontColor = localStorage.getItem("light_fontColor") || light_fontColor_default;
    light_bgColor = localStorage.getItem("light_bgColor") || light_bgColor_default;
    dark_mainColor_active = localStorage.getItem("dark_mainColor_active") || dark_mainColor_active_default;
    dark_mainColor_inactive = localStorage.getItem("dark_mainColor_inactive") || dark_mainColor_inactive_default;
    dark_fontColor = localStorage.getItem("dark_fontColor") || dark_fontColor_default;
    dark_bgColor = localStorage.getItem("dark_bgColor") || dark_bgColor_default;
    pagination_bottom = localStorage.getItem("pagination_bottom") || pagination_bottom_default;
    pagination_opacity = localStorage.getItem("pagination_opacity") || pagination_opacity_default;

    // console.log(localStorage.getItem("UILang"));
    // console.log(ui_language_default);
    // console.log(localStorage.getItem("p_lineHeight"));
    // console.log(p_lineHeight_default);
    // console.log(localStorage.getItem("p_fontSize"));
    // console.log(p_fontSize_default);
    // console.log(localStorage.getItem("light_mainColor_active"));
    // console.log(light_mainColor_active_default);
    // console.log(localStorage.getItem("light_mainColor_inactive"));
    // console.log(light_mainColor_inactive_default);
    // console.log(localStorage.getItem("light_fontColor"));
    // console.log(light_fontColor_default);
    // console.log(localStorage.getItem("light_bgColor"));
    // console.log(light_bgColor_default);
    // console.log(localStorage.getItem("dark_mainColor_active"));
    // console.log(dark_mainColor_active_default);
    // console.log(localStorage.getItem("dark_mainColor_inactive"));
    // console.log(dark_mainColor_inactive_default);
    // console.log(localStorage.getItem("dark_fontColor"));
    // console.log(dark_fontColor_default);
    // console.log(localStorage.getItem("dark_bgColor"));
    // console.log(dark_bgColor_default);
    // console.log(localStorage.getItem("pagination_bottom"));
    // console.log(pagination_bottom_default);
    // console.log(localStorage.getItem("pagination_opacity"));
    // console.log(pagination_opacity_default);
}

function loadDefaultSettings() {
    if (respectUserLangSetting)
        ui_language = ui_language_default;
    p_lineHeight = p_lineHeight_default;
    p_fontSize = p_fontSize_default;
    light_mainColor_active = light_mainColor_active_default;
    light_mainColor_inactive = light_mainColor_inactive_default;
    light_fontColor = light_fontColor_default;
    light_bgColor = light_bgColor_default;
    dark_mainColor_active = dark_mainColor_active_default;
    dark_mainColor_inactive = dark_mainColor_inactive_default;
    dark_fontColor = dark_fontColor_default;
    dark_bgColor = dark_bgColor_default;
    pagination_bottom = pagination_bottom_default;
    pagination_opacity = pagination_opacity_default;

    if (respectUserLangSetting)
        setSelectorValue("setting_uilanguage", ui_language);
    setRangeValue("setting_p_lineHeight", p_lineHeight);
    setRangeValue("setting_p_fontSize", p_fontSize);
    setColorValue("setting_light_mainColor_active", light_mainColor_active);
    setColorValue("setting_light_fontColor", light_fontColor);
    setColorValue("setting_light_bgColor", light_bgColor);
    setColorValue("setting_dark_mainColor_active", dark_mainColor_active);
    setColorValue("setting_dark_fontColor", dark_fontColor);
    setColorValue("setting_dark_bgColor", dark_bgColor);
    setRangeValue("setting_pagination_bottom", pagination_bottom);
    setRangeValue("setting_pagination_opacity", pagination_opacity);
}

function applySettings() {
    if (respectUserLangSetting)
        style.ui_LANG = ui_language;
    style.p_lineHeight = p_lineHeight;
    style.p_fontSize = p_fontSize;
    style.mainColor_active = light_mainColor_active;
    style.mainColor_inactive = light_mainColor_inactive;
    style.fontColor = light_fontColor;
    style.bgColor = light_bgColor;
    style.darkMode_mainColor_active = dark_mainColor_active;
    style.darkMode_mainColor_inactive = dark_mainColor_inactive;
    style.darkMode_fontColor = dark_fontColor;
    style.darkMode_bgColor = dark_bgColor;
    style.ui_paginationBottom = pagination_bottom;
    style.ui_paginationOpacity = pagination_opacity;

    if (style.ui_Mode === "dark") {
        style.mainColor_active = style.darkMode_mainColor_active;
        style.mainColor_inactive = style.darkMode_mainColor_inactive;
        style.fontColor = style.darkMode_fontColor;
        style.bgColor = style.darkMode_bgColor;
    }
}

function saveSettings(toSetLanguage = false) {
    if (respectUserLangSetting)
        ui_language = $("#setting_uilanguage").closest(".select").children(".select-options").children(".is-selected").attr("rel") || ui_language_default;
    p_lineHeight = $("#setting_p_lineHeight").val() + 'em' || p_lineHeight_default;
    p_fontSize = $("#setting_p_fontSize").val() + 'em' || p_fontSize_default;
    light_mainColor_active = $("#setting_light_mainColor_active").val() || light_mainColor_active_default;
    light_mainColor_inactive = HSLToHex(...hexToHSL(($("#setting_light_mainColor_active").val() || light_mainColor_active_default), 1.5));
    // light_mainColor_inactive = pSBC(0.25, ($("#setting_light_mainColor_active").val() || light_mainColor_active_default), false, true);   // 25% lighter (linear)
    light_fontColor = $("#setting_light_fontColor").val() || light_fontColor_default;
    light_bgColor = $("#setting_light_bgColor").val() || light_bgColor_default;
    dark_mainColor_active = $("#setting_dark_mainColor_active").val() || dark_mainColor_active_default;
    dark_mainColor_inactive = HSLToHex(...hexToHSL(($("#setting_dark_mainColor_active").val() || dark_mainColor_active_default), 0.5));
    // dark_mainColor_inactive = pSBC(-0.25, ($("#setting_dark_mainColor_active").val() || dark_mainColor_active_default), false, true);   // 25% darker (linear)
    dark_fontColor = $("#setting_dark_fontColor").val() || dark_fontColor_default;
    dark_bgColor = $("#setting_dark_bgColor").val() || dark_bgColor_default;
    pagination_bottom = $("#setting_pagination_bottom").val() + 'px' || pagination_bottom_default;
    pagination_opacity = $("#setting_pagination_opacity").val() || pagination_opacity_default;

    if (respectUserLangSetting && toSetLanguage)
        setLanguage(ui_language);

    if (respectUserLangSetting)
        localStorage.setItem("UILang", ui_language);
    localStorage.setItem("p_lineHeight", p_lineHeight);
    localStorage.setItem("p_fontSize", p_fontSize);
    localStorage.setItem("light_mainColor_active", light_mainColor_active);
    localStorage.setItem("light_mainColor_inactive", light_mainColor_inactive);
    localStorage.setItem("light_fontColor", light_fontColor);
    localStorage.setItem("light_bgColor", light_bgColor);
    localStorage.setItem("dark_mainColor_active", dark_mainColor_active);
    localStorage.setItem("dark_mainColor_inactive", dark_mainColor_inactive);
    localStorage.setItem("dark_fontColor", dark_fontColor);
    localStorage.setItem("dark_bgColor", dark_bgColor);
    localStorage.setItem("pagination_bottom", pagination_bottom);
    localStorage.setItem("pagination_opacity", pagination_opacity);
    
    applySettings();

    if (typeof bookshelf !== "undefined" && isVariableDefined(bookshelf))
        bookshelf.updateAllBookCovers();
}

function initiateSettingMenu() {
    removeSettingMenu();
    
    let settingsMenu = document.createElement("div");
    settingsMenu.setAttribute("id", "settings-menu");
    
    let settingUILanguage = null;
    if (respectUserLangSetting)
        settingUILanguage = createSelectorItem("setting_uilanguage", Object.keys(ui_language_mapping), Object.values(ui_language_mapping));
    let settingLineHeight = createRangeItem("setting_p_lineHeight", parseFloat(p_lineHeight), 1, 3, 0.5, unit='em');
    let settingFontSize = createRangeItem("setting_p_fontSize", parseFloat(p_fontSize), 1, 3, 0.5, unit='em');
    let settingLightMainColorActive = createColorItem("setting_light_mainColor_active", light_mainColor_active, savedValues=["#2F5086"]);
    let settingLightFontColor = createColorItem("setting_light_fontColor", light_fontColor, savedValues=["black"]);
    let settingLightBgColor = createColorItem("setting_light_bgColor", light_bgColor, savedValues=["#FDF3DF"]);
    let settingDarkMainColorActive = createColorItem("setting_dark_mainColor_active", dark_mainColor_active, savedValues=["#6096BB"]);
    let settingDarkFontColor = createColorItem("setting_dark_fontColor", dark_fontColor, savedValues=["#F2E6CE"]);
    let settingDarkBgColor = createColorItem("setting_dark_bgColor", dark_bgColor, savedValues=["#0D1018"]);
    let settingPaginationBottom = createRangeItem("setting_pagination_bottom", parseFloat(pagination_bottom), 1, 30, 1, unit='px');
    let settingPaginationOpacity = createRangeItem("setting_pagination_opacity", parseFloat(pagination_opacity), 0, 1, 0.1, unit='');

    if (respectUserLangSetting)
        settingsMenu.appendChild(settingUILanguage);
    settingsMenu.appendChild(settingLineHeight);
    settingsMenu.appendChild(settingFontSize);
    settingsMenu.appendChild(settingLightMainColorActive);
    settingsMenu.appendChild(settingLightFontColor);
    settingsMenu.appendChild(settingLightBgColor);
    settingsMenu.appendChild(settingDarkMainColorActive);
    settingsMenu.appendChild(settingDarkFontColor);
    settingsMenu.appendChild(settingDarkBgColor);
    settingsMenu.appendChild(settingPaginationBottom);
    settingsMenu.appendChild(settingPaginationOpacity);

    let settingButtons = document.createElement('div');
    settingButtons.setAttribute('style', 'padding:4px;');
    let settingReset = document.createElement('button');
    settingReset.setAttribute('id', 'setting-reset-btn');
    settingReset.setAttribute('type', 'button');
    settingReset.addEventListener("click", (e) => {
        loadDefaultSettings();
        saveSettings();
    });
    settingButtons.appendChild(settingReset);
    settingsMenu.appendChild(settingButtons);
    document.body.appendChild(settingsMenu);
    
    // add click event listener
    document.addEventListener('click', handleClickOutsideBox);
    // settingsMenu_shown = true;

    // render color picker
    setTimeout(myColor_init, 200);

    // manually set settings value
    document.getElementById("setting_p_lineHeight").value = parseFloat(p_lineHeight);
    document.getElementById("setting_p_fontSize").value = parseFloat(p_fontSize);
    document.getElementById("setting_pagination_bottom").value = parseFloat(pagination_bottom);
    document.getElementById("setting_pagination_opacity").value = parseFloat(pagination_opacity);

    // render selector
    if (respectUserLangSetting)
        selector_init(saveSettings, Object.keys(ui_language_mapping).indexOf(ui_language));
}

function showSettingMenu() {
    initiateSettingMenu();
    document.getElementById("settings-menu").style.zIndex = "9999";
    document.getElementById("settings-menu").style.visibility = "inherit";
    settingsMenu_shown = true;
}

function hideSettingMenu() {
    document.getElementById("settings-menu").style.zIndex = "-1";
    document.getElementById("settings-menu").style.visibility = "hidden";
    settingsMenu_shown = false;

    removeSettingMenu();

    // manually remove focus
    const settingsBtn = document.getElementById("STRe-setting-btn");
    settingsBtn.blur();
}


//
// Helper functions
//
function handleClickOutsideBox(event) {  
    const settingsMenu = document.getElementById('settings-menu');
    const settingsBtn = document.getElementById("STRe-setting-btn");
    const colorPickerArray = document.getElementsByClassName('color-picker');
    isColorPickerOpen.push((isVariableDefined(colorPickerArray)) && (colorPickerArray.length > 0));
    isColorPickerOpen.shift();
    // console.log(colorPickerArray, isColorPickerOpen);
    if (!settingsMenu) return;
    if ((!settingsMenu.contains(event.target)) && (!settingsBtn.contains(event.target))) {
        if (settingsMenu_shown) {
            if (isColorPickerOpen[0]) {
                // if color picker was open before the click
                // do nothing as the click is to close the color picker
                return;
            } else {
                saveSettings();
                hideSettingMenu();
            }
        }
    }
}

function removeSettingMenu() {
    if (isVariableDefined(document.getElementById('settings-menu'))) {
        document.getElementById('settings-menu').remove();
        // remove click event listener
        document.removeEventListener('click', handleClickOutsideBox);
    }
}

function getCSS(sel, prop) {
    for (const sheet of document.styleSheets) {
        for (const rule of sheet.cssRules) {
            if (rule.selectorText === sel) {
                return rule.style.getPropertyValue(prop);
            }
        }
    }
    return null;
}

function setCSS(sel, prop, val, def) {
    for (const sheet of document.styleSheets) {
        for (const rule of sheet.cssRules) {
            if (rule.selectorText === sel) {
                rule.style.setProperty(prop, val?val:def);
                console.log(sel + " { " + prop + " : " + (val?val:def) + " }");
            }
        }
    }
}

function createSelectorItem(id, values, texts) {
    let settingItem = document.createElement('div');
    settingItem.setAttribute('class', 'settingItem-wrapper');
    let settingItemText = document.createElement('span');
    settingItemText.setAttribute('class', 'settingItem-span');
    settingItemText.setAttribute('id', `settingLabel-${id}`);
    settingItemText.onselectstart = function() { return false; };
    settingItemText.onmousedown = function() { return false; };
    let settingItemInput = document.createElement('select');
    settingItemInput.setAttribute('id', id);
    values.forEach(function(value, i) {
        let option = document.createElement('option');
        option.setAttribute('value', value);
        option.innerText = texts[i];
        settingItemInput.appendChild(option);
    });
    settingItem.appendChild(settingItemText);
    settingItem.appendChild(settingItemInput);
    return settingItem;
}

function createRangeItem(id, value, min, max, step, unit='') {
    // <div class="settingItem-wrapper">
    //     <span class="settingItem-span">行高</span>
    //     <div class="range-slider" style="--min:1; --max:3; --step:0.5; --value:1.5; --text-value:&quot;1.5&quot;; --suffix:'em';--ticks-color:white;">
    //         <input class="range-slider-input" type="range" id="setting_p_lineHeight" value="1.5" min="1" max="3" step="0.5" oninput="this.parentNode.style.setProperty(&quot;--value&quot;,this.value); this.parentNode.style.setProperty(&quot;--text-value&quot;, JSON.stringify(this.value))">
    //         <output class="range-slider-output"></output>
    //         <div class="range-slider__progress"></div>
    //     </div>
    // </div>
    let settingItem = document.createElement('div');
    settingItem.setAttribute('class', 'settingItem-wrapper');
    let settingItemText = document.createElement('span');
    settingItemText.setAttribute('class', 'settingItem-span');
    settingItemText.setAttribute('id', `settingLabel-${id}`);
    settingItemText.onselectstart = function() { return false; };
    settingItemText.onmousedown = function() { return false; };
    let settingItemInput = document.createElement('div');
    settingItemInput.setAttribute('class', 'range-slider');
    settingItemInput.setAttribute('style', '--min:' + min + '; --max:' + max + '; --step:' + step + '; --value:' + value + '; --text-value:"' + JSON.stringify(value) + '"; --suffix:"' + unit + '";--ticks-color:' + style.bgColor + ';');
    let settingItemInputRange = document.createElement('input');
    settingItemInputRange.setAttribute('class', 'range-slider-input');
    settingItemInputRange.setAttribute('type', 'range');
    settingItemInputRange.setAttribute('id', id);
    settingItemInputRange.setAttribute('value', value);
    settingItemInputRange.setAttribute('min', min);
    settingItemInputRange.setAttribute('max', max);
    settingItemInputRange.setAttribute('step', step);
    settingItemInputRange.addEventListener("input", (e) => {
        e.target.parentNode.style.setProperty("--value", e.target.value);
        e.target.parentNode.style.setProperty("--text-value", JSON.stringify(e.target.value));
        saveSettings();
    });
    let settingItemInputOutput = document.createElement('output');
    settingItemInputOutput.setAttribute('class', 'range-slider-output');
    settingItemInputOutput.setAttribute('style', '--thumb-text-color:' + style.bgColor + ';');
    let settingItemInputProgress = document.createElement('div');
    settingItemInputProgress.setAttribute('class', 'range-slider__progress');
    settingItemInput.appendChild(settingItemInputRange);
    settingItemInput.appendChild(settingItemInputOutput);
    settingItemInput.appendChild(settingItemInputProgress);
    settingItem.appendChild(settingItemText);
    settingItem.appendChild(settingItemInput);
    return settingItem;
}

function createColorItem(id, value, savedValues=[]) {
    // <div class="settingItem-wrapper">
    //     <span class="settingItem-span">日间字符色</span>
    //     <input
    //         id="setting_light_fontColor"
    //         class="myColor"
    //         inputmode="none"
    //         value="black"
    //         data-swatches='["LightCoral", "MediumSeaGreen", "#3680FA99"]'
    //         data-placement="center below"
    //     />
    // </div>
    let settingItem = document.createElement('div');
    settingItem.setAttribute('class', 'settingItem-wrapper');
    let settingItemText = document.createElement('span');
    settingItemText.setAttribute('class', 'settingItem-span');
    settingItemText.setAttribute('id', `settingLabel-${id}`);
    settingItemText.onselectstart = function() { return false; };
    settingItemText.onmousedown = function() { return false; };
    let settingItemInput = document.createElement('input');
    settingItemInput.setAttribute('id', id);
    settingItemInput.setAttribute('class', 'myColor');       // use yaireo's color picker; at the moment, it doesn't work with the oninput event.
    // settingItemInput.setAttribute('type', 'color');     // use the default color picker
    settingItemInput.setAttribute('inputmode', 'none');
    settingItemInput.setAttribute('value', value);
    settingItemInput.setAttribute('data-swatches', JSON.stringify(savedValues));
    settingItemInput.setAttribute('data-placement', 'center below');
    // settingItemInput.setAttribute('style', '--color:' + value + '; --colorInverted:' + invertColor(style.bgColor, false, 0.5) + ';');
    settingItemInput.setAttribute('style', '--color:' + value + '; --colorInverted:' + style.borderColor + ';');
    settingItemInput.addEventListener("input", (e) => {
        saveSettings();
    });
    settingItem.appendChild(settingItemText);
    settingItem.appendChild(settingItemInput);
    return settingItem;
}

function setSelectorValue(id, value) {
    let temp_item = document.getElementById(id);
    temp_item.value = value;
}

function setRangeValue(id, value) {
    let temp_item = document.getElementById(id);
    temp_item.value = parseFloat(value);
    temp_item.parentElement.style.setProperty("--value", parseFloat(value));
    temp_item.parentElement.style.setProperty("--text-value", `"${JSON.stringify(parseFloat(value))}"`);
}

function setColorValue(id, value) {
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
