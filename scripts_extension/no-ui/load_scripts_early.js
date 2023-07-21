var img_path_loading = injectCustomImage('images/loading_geometry.gif', 'image/gif');
var img_path_drop = injectCustomImage('images/drop.png', 'image/png');
var img_path_stamp_CN = injectCustomImage('images/stamp_CN.png', 'image/png');
var img_path_stamp_EN = injectCustomImage('images/stamp_EN.png', 'image/png');
var img_path_note_CN = injectCustomImage('images/note_CN.png', 'image/png');
var img_path_note_EN = injectCustomImage('images/note_EN.png', 'image/png');


injectCustomLink('css/ui_variables.css');
injectCustomLink('css/ui.css');
injectCustomLink('css/reader.css');
injectCustomLink('css/footnotes.css');


injectCustomJs('scripts/jquery.min.js');
injectCustomJs('scripts/jschardet.min.js');
injectCustomJs('scripts/css-global-variables.js');


var font_path_title = injectCustomFont('fonts/qiji-combo.woff', 'font/woff');
var font_path_body = injectCustomFont('fonts/FZSKBXKK.woff2', 'font/woff2');
var font_path_ui = injectCustomFont('fonts/LXGWWenKai-Regular.woff2', 'font/woff2');


let temp = document.createElement('script');
temp.setAttribute('type', 'text/javascript');
temp.setAttribute('charset', 'utf-8');
temp.src = chrome.runtime.getURL('scripts_extension/no-ui/receive_loaded_variables.js');
temp.onload = function() {
    var evt = new CustomEvent("injectCustomJsLoaded", {
        detail: {
            "font_path_title": font_path_title,
            "font_path_body": font_path_body,
            "font_path_ui": font_path_ui,
            "img_path_drop": img_path_drop,
            "img_path_loading": img_path_loading,
            "img_path_stamp_CN": img_path_stamp_CN,
            "img_path_stamp_EN": img_path_stamp_EN,
            "img_path_note_CN": img_path_note_CN,
            "img_path_note_EN": img_path_note_EN
        }
    });
    document.dispatchEvent(evt);
};
document.documentElement.appendChild(temp);


injectCustomJs('scripts/regex_rules.js');
injectCustomJs('scripts/ui_helpers.js');
injectCustomJs('scripts/utilities.js');
injectCustomJs('scripts/footnotes.js');


function injectCustomJs(jsPath)
{
    let temp = document.createElement('script');
    temp.setAttribute('type', 'text/javascript');
    temp.setAttribute('charset', 'utf-8');
    temp.src = chrome.runtime.getURL(jsPath);
    document.documentElement.appendChild(temp);
}

function injectCustomFont(fontPath, fontType)
{
    let temp = document.createElement('link');
    temp.type = fontType;
    temp.rel = 'preload';
    temp.as = 'font';
    temp.crossOrigin = 'anonymous';
    temp.href = chrome.runtime.getURL(fontPath);
    document.documentElement.appendChild(temp);
    return temp.href;
}

function injectCustomImage(imgPath, imgType)
{
    let temp = document.createElement('link');
    temp.type = imgType;
    temp.rel = 'preload';
    temp.as = 'image';
    temp.href = chrome.runtime.getURL(imgPath);
    document.documentElement.appendChild(temp);
    return temp.href;
}

function injectCustomLink(linkPath)
{
    let temp = document.createElement('link');
    temp.type = 'text/css';
    temp.rel = 'stylesheet';
    temp.href = chrome.runtime.getURL(linkPath);
    document.documentElement.appendChild(temp);
}