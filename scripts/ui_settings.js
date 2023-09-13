// Get css variables
style = new CSSGlobalVariables();
// console.log('Style loaded.')
// console.log(style);

// let p_lineHeight_default = getCSS(":root", "--p_lineHeight");
// let p_fontSize_default = getCSS(":root", "--p_fontSize");
// let light_mainColor_active_default = getCSS(":root", "--mainColor_active");
// let light_mainColor_inactive_default = getCSS(":root", "--mainColor_inactive");
// let light_fontColor_default = getCSS(":root", "--fontColor");
// let light_bgColor_default = getCSS(":root", "--bgColor");
// let dark_mainColor_active_default = getCSS('[data-theme="dark"]', "--mainColor_active");
// let dark_mainColor_inactive_default = getCSS('[data-theme="dark"]', "--mainColor_inactive");
// let dark_fontColor_default = getCSS('[data-theme="dark"]', "--fontColor");
// let dark_bgColor_default = getCSS('[data-theme="dark"]', "--bgColor");
// let pagination_bottom_default = getCSS("#pagination", "bottom");
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


let settingsBtn = document.getElementById("STRe-setting-btn");
if (isVariableDefined(settingsBtn)) {
    settingsBtn.addEventListener("click", (e) => {
        if (settingsMenu_shown) {
            hideSettingMenu();
        } else {
            showSettingMenu();
        }
    });
}

loadSettings();
applySettings();
initiateSettingMenu();


//
// Main functions
//
function loadSettings() {
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

    setNumericValue("setting_p_lineHeight", p_lineHeight);
    setNumericValue("setting_p_fontSize", p_fontSize);
    setColorValue("setting_light_mainColor_active", light_mainColor_active);
    setColorValue("setting_light_fontColor", light_fontColor);
    setColorValue("setting_light_bgColor", light_bgColor);
    setColorValue("setting_dark_mainColor_active", dark_mainColor_active);
    setColorValue("setting_dark_fontColor", dark_fontColor);
    setColorValue("setting_dark_bgColor", dark_bgColor);
    setNumericValue("setting_pagination_bottom", pagination_bottom);
    setNumericValue("setting_pagination_opacity", pagination_opacity);
}

function applySettings() {
    // setCSS(":root", "--p_lineHeight", p_lineHeight, p_lineHeight_default);
    // setCSS(":root", "--p_fontSize", p_fontSize, p_fontSize_default);
    // setCSS(":root", "--mainColor_active", light_mainColor_active, light_mainColor_active_default);
    // setCSS(":root", "--mainColor_inactive", light_mainColor_inactive, light_mainColor_inactive_default);
    // setCSS(":root", "--fontColor", light_fontColor, light_fontColor_default);
    // setCSS(":root", "--bgColor", light_bgColor, light_bgColor_default);
    // setCSS('[data-theme="dark"]', "--mainColor_active", dark_mainColor_active, dark_mainColor_active_default);
    // setCSS('[data-theme="dark"]', "--mainColor_inactive", dark_mainColor_inactive, dark_mainColor_inactive_default);
    // setCSS('[data-theme="dark"]', "--fontColor", dark_fontColor, dark_fontColor_default);
    // setCSS('[data-theme="dark"]', "--bgColor", dark_bgColor, dark_bgColor_default);
    // setCSS("#pagination", "bottom", pagination_bottom, pagination_bottom_default);
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

    if (style.ui_Mode == "dark") {
        style.mainColor_active = style.darkMode_mainColor_active;
        style.mainColor_inactive = style.darkMode_mainColor_inactive;
        style.fontColor = style.darkMode_fontColor;
        style.bgColor = style.darkMode_bgColor;
    }
}

function saveSettings() {
    p_lineHeight = $("#setting_p_lineHeight").val() + 'em' || p_lineHeight_default;
    p_fontSize = $("#setting_p_fontSize").val() + 'em' || p_fontSize_default;
    light_mainColor_active = $("#setting_light_mainColor_active").val() || light_mainColor_active_default;
    light_mainColor_inactive = HSLToHex(...hexToHSL(($("#setting_light_mainColor_active").val() || light_mainColor_active_default), 1.5));
    light_fontColor = $("#setting_light_fontColor").val() || light_fontColor_default;
    light_bgColor = $("#setting_light_bgColor").val() || light_bgColor_default;
    dark_mainColor_active = $("#setting_dark_mainColor_active").val() || dark_mainColor_active_default;
    dark_mainColor_inactive = HSLToHex(...hexToHSL(($("#setting_dark_mainColor_active").val() || dark_mainColor_active_default), 0.5));
    dark_fontColor = $("#setting_dark_fontColor").val() || dark_fontColor_default;
    dark_bgColor = $("#setting_dark_bgColor").val() || dark_bgColor_default;
    pagination_bottom = $("#setting_pagination_bottom").val() + 'px' || pagination_bottom_default;
    pagination_opacity = $("#setting_pagination_opacity").val() || pagination_opacity_default;

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
    // hideSettingMenu();
}

function initiateSettingMenu() {
    removeSettingMenu();
    
    let settingsMenu = document.createElement('div');
    settingsMenu.setAttribute('id', 'settings-menu');
    if (style.ui_LANG === "EN") {
        settingsMenu.setAttribute('style', 'font-size:1em;')
    }
    
    // let settingLineHeight = createMenuItem("行高", "setting_p_lineHeight", p_lineHeight);
    let settingLineHeight = createRangeItem((style.ui_LANG === "CN" ? style.ui_lightHeight_CN : style.ui_lightHeight_EN), "setting_p_lineHeight", parseFloat(p_lineHeight), 1, 3, 0.5, unit='em');
    // let settingFontSize = createMenuItem("字号", "setting_p_fontSize", p_fontSize);
    let settingFontSize = createRangeItem((style.ui_LANG === "CN" ? style.ui_fontSize_CN : style.ui_fontSize_EN), "setting_p_fontSize", parseFloat(p_fontSize), 1, 3, 0.5, unit='em');
    // let settingLightMainColorActive = createMenuItem("日间主题色", "setting_light_mainColor_active", light_mainColor_active);
    let settingLightMainColorActive = createColorItem((style.ui_LANG === "CN" ? style.ui_lightMode_mainColor_CN : style.ui_lightMode_mainColor_EN), "setting_light_mainColor_active", light_mainColor_active, savedValues=["#2F5086"]);
    // let settingLightFontColor = createMenuItem("日间字符色", "setting_light_fontColor", light_fontColor);
    let settingLightFontColor = createColorItem((style.ui_LANG === "CN" ? style.ui_lightMode_fontColor_CN : style.ui_lightMode_fontColor_EN), "setting_light_fontColor", light_fontColor, savedValues=["black"]);
    // let settingLightBgColor = createMenuItem("日间背景色", "setting_light_bgColor", light_bgColor);
    let settingLightBgColor = createColorItem((style.ui_LANG === "CN" ? style.ui_lightMode_bgColor_CN : style.ui_lightMode_bgColor_EN), "setting_light_bgColor", light_bgColor, savedValues=["#FDF3DF"]);
    // let settingDarkMainColorActive = createMenuItem("夜间主题色", "setting_dark_mainColor_active", dark_mainColor_active);
    let settingDarkMainColorActive = createColorItem((style.ui_LANG === "CN" ? style.ui_darkMode_mainColor_CN : style.ui_darkMode_mainColor_EN), "setting_dark_mainColor_active", dark_mainColor_active, savedValues=["#6096BB"]);
    // let settingDarkFontColor = createMenuItem("夜间字符色", "setting_dark_fontColor", dark_fontColor);
    let settingDarkFontColor = createColorItem((style.ui_LANG === "CN" ? style.ui_darkMode_fontColor_CN : style.ui_darkMode_fontColor_EN), "setting_dark_fontColor", dark_fontColor, savedValues=["#F2E6CE"]);
    // let settingDarkBgColor = createMenuItem("夜间背景色", "setting_dark_bgColor", dark_bgColor);
    let settingDarkBgColor = createColorItem((style.ui_LANG === "CN" ? style.ui_darkMode_bgColor_CN : style.ui_darkMode_bgColor_EN), "setting_dark_bgColor", dark_bgColor, savedValues=["#0D1018"]);
    // let settingPaginationBottom = createMenuItem("分页条与底部距离", "setting_pagination_bottom", pagination_bottom);
    let settingPaginationBottom = createRangeItem((style.ui_LANG === "CN" ? style.ui_pagination2pageBottom_dist_CN : style.ui_pagination2pageBottom_dist_EN), "setting_pagination_bottom", parseFloat(pagination_bottom), 1, 30, 1, unit='px');
    // let settingPaginationOpacity = createMenuItem("分页条透明度", "setting_pagination_opacity", pagination_opacity);
    let settingPaginationOpacity = createRangeItem((style.ui_LANG === "CN" ? style.ui_pagination_transparency_CN : style.ui_pagination_transparency_EN), "setting_pagination_opacity", parseFloat(pagination_opacity), 0, 1, 0.1, unit='');

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
    settingReset.innerText = (style.ui_LANG === "CN" ? style.ui_reset_CN : style.ui_reset_EN);
    settingButtons.appendChild(settingReset);
    settingsMenu.appendChild(settingButtons);

    document.body.appendChild(settingsMenu);
    setTimeout(myColor_init, 200);

    document.addEventListener('click', handleClickOutsideBox);
    // settingsMenu_shown = true;

    // manually set settings value
    document.getElementById("setting_p_lineHeight").value = parseFloat(p_lineHeight);
    document.getElementById("setting_p_fontSize").value = parseFloat(p_fontSize);
    document.getElementById("setting_pagination_bottom").value = parseFloat(pagination_bottom);
    document.getElementById("setting_pagination_opacity").value = parseFloat(pagination_opacity);
}

function showSettingMenu() {
    initiateSettingMenu();
    document.getElementById("settings-menu").style.zIndex = "9999";
    document.getElementById("settings-menu").style.visibility = "inherit";
    settingsMenu_shown = true;
}

function hideSettingMenu() {
    // $("#settings-menu").remove();
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

function createMenuItem(text, id, value) {
    let settingItem = document.createElement('div');
    let settingItemText = document.createElement('span');
    settingItemText.setAttribute('onselectstart', 'return false;');
    settingItemText.setAttribute('onmousedown', 'return false;');
    settingItemText.setAttribute('style', 'display:inline-block;width:10rem');
    settingItemText.innerText = text;
    let settingItemInput = document.createElement('input');
    settingItemInput.setAttribute('type', 'text');
    settingItemInput.setAttribute('size', '10');
    settingItemInput.setAttribute('id', id);
    settingItemInput.setAttribute('value', value);
    settingItem.appendChild(settingItemText);
    settingItem.appendChild(settingItemInput);
    return settingItem;
}

function createRangeItem(text, id, value, min, max, step, unit='') {
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
    if (style.ui_LANG === "EN") {
        settingItemText.setAttribute('style', 'width:16rem;')
    }
    settingItemText.setAttribute('onselectstart', 'return false;');
    settingItemText.setAttribute('onmousedown', 'return false;');
    settingItemText.innerText = text;
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

function createColorItem(text, id, value, savedValues=[]) {
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
    if (style.ui_LANG === "EN") {
        settingItemText.setAttribute('style', 'width:16rem;')
    }
    settingItemText.setAttribute('onselectstart', 'return false;');
    settingItemText.setAttribute('onmousedown', 'return false;');
    settingItemText.innerText = text;
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

function setNumericValue(id, value) {
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
    $(window).trigger('resize');
    temp_item.style.display = "none";
    temp_item.style.display = "block";
}
