injectCustomIcon('images/icon.png', 'image/png');



var css_path_ui_variables;
injectCustomLink('css/ui_variables.css', function(path) {
    // console.log("css_path_ui_variables: ", path);
    css_path_ui_variables = path;
});
var css_path_ui;
injectCustomLink('css/ui.css', function(path) {
    // console.log("css_path_ui: ", path);
    css_path_ui = path;
});
var css_path_reader;
injectCustomLink('css/reader.css', function(path) {
    // console.log("css_path_reader: ", path);
    css_path_reader = path;
});
var css_path_footnotes;
injectCustomLink('css/footnotes.css', function(path) {
    // console.log("css_path_footnotes: ", path);
    css_path_footnotes = path;
});


var font_path_title;
injectCustomFont('fonts/qiji-combo.woff', 'font/woff', function(path) {
    // console.log("font_path_title: ", path);
    font_path_title = path;
});
var font_path_body;
injectCustomFont('fonts/FZSKBXKK.woff2', 'font/woff2', function(path) {
    // console.log("font_path_body: ", path);
    font_path_body = path;
});
var font_path_ui;
injectCustomFont('fonts/LXGWWenKai-Regular.woff2', 'font/woff2', function(path) {
    // console.log("font_path_ui: ", path);
    font_path_ui = path;
});



var img_path_drop;
injectCustomImage('images/drop.png', 'image/png', function(path) {
    // console.log("img_path_drop: ", path);
    img_path_drop = path;
});
var img_path_stamp_CN;
injectCustomImage('images/stamp_CN.png', 'image/png', function(path) {
    // console.log("img_path_stamp_CN: ", path);
    img_path_stamp_CN = path;
});
var img_path_stamp_EN;
injectCustomImage('images/stamp_EN.png', 'image/png', function(path) {
    // console.log("img_path_stamp_EN: ", path);
    img_path_stamp_EN = path;
});
var img_path_note_CN;
injectCustomImage('images/note_CN.png', 'image/png', function(path) {
    // console.log("img_path_note_CN: ", path);
    img_path_note_CN = path;
});
var img_path_note_EN;
injectCustomImage('images/note_EN.png', 'image/png', function(path) {
    // console.log("img_path_note_EN: ", path);
    img_path_note_EN = path;
});


var js_path_jquery;
injectCustomJs('scripts/jquery.min.js', function(path) {
    // console.log("js_path_jquery: ", path);
    js_path_jquery = path;
});
var js_path_jschardet;
injectCustomJs('scripts/jschardet.min.js', function(path) {
    // console.log("js_path_jschardet: ", path);
    js_path_jschardet = path;
});
var js_path_css_global_variables;
injectCustomJs('scripts/css-global-variables.js', function(path) {
    // console.log("js_path_css_global_variables: ", path);
    js_path_css_global_variables = path;
});
var js_path_regex_rules;
injectCustomJs('scripts/regex_rules.js', function(path) {
    // console.log("js_path_regex_rules: ", path);
    js_path_regex_rules = path;
});
var js_path_utilities;
injectCustomJs('scripts/utilities.js', function(path) {
    // console.log("js_path_utilities: ", path);
    js_path_utilities = path;
});


// Load resources in order!!
var interval = setInterval(function() {
    if (isVariableDefined(css_path_ui_variables) && isVariableDefined(css_path_ui) && isVariableDefined(css_path_reader) && isVariableDefined(css_path_footnotes) && isVariableDefined(font_path_title) && isVariableDefined(font_path_body) && isVariableDefined(font_path_ui) && isVariableDefined(img_path_drop) && isVariableDefined(img_path_stamp_CN) && isVariableDefined(img_path_stamp_EN) && isVariableDefined(img_path_note_CN) && isVariableDefined(img_path_note_EN) && isVariableDefined(js_path_jquery) && isVariableDefined(js_path_jschardet) && isVariableDefined(js_path_css_global_variables) && isVariableDefined(js_path_regex_rules) && isVariableDefined(js_path_utilities)) {
        console.log('Resources that are required to load first are loaded.');
        clearInterval(interval);


        var js_path_footnotes;
        injectCustomJs('scripts/footnotes.js', function(path) {
            // console.log("js_path_footnotes: ", path);
            js_path_footnotes = path;
        });
        var js_path_ui_variables;
        injectCustomJs('scripts/ui_variables.js', function(path) {
            // console.log("js_path_ui_variables: ", path);
            js_path_ui_variables = path;
        });
        var js_path_processText;
        injectCustomJs('scripts/processText.js', function(path) {
            // console.log("js_path_processText: ", path);
            js_path_processText = path;
        });



        var interval2 = setInterval(function() {
            if (isVariableDefined(css_path_ui_variables) && isVariableDefined(css_path_ui) && isVariableDefined(css_path_reader) && isVariableDefined(css_path_footnotes) && isVariableDefined(font_path_title) && isVariableDefined(font_path_body) && isVariableDefined(font_path_ui) && isVariableDefined(img_path_drop) && isVariableDefined(img_path_stamp_CN) && isVariableDefined(img_path_stamp_EN) && isVariableDefined(img_path_note_CN) && isVariableDefined(img_path_note_EN) && isVariableDefined(js_path_jquery) && isVariableDefined(js_path_jschardet) && isVariableDefined(js_path_css_global_variables) && isVariableDefined(js_path_regex_rules) && isVariableDefined(js_path_utilities) && isVariableDefined(js_path_footnotes) && isVariableDefined(js_path_ui_variables) && isVariableDefined(js_path_processText)) {
                console.log('Subsequent resources are loaded.');
                clearInterval(interval2);

                var js_path_ui_helpers;
                injectCustomJs('scripts/ui_helpers.js', function(path) {
                    // console.log("js_path_ui_helpers: ", path);
                    js_path_ui_helpers = path;
                });



                var interval3 = setInterval(function() {
                    if (isVariableDefined(css_path_ui_variables) && isVariableDefined(css_path_ui) && isVariableDefined(css_path_reader) && isVariableDefined(css_path_footnotes) && isVariableDefined(font_path_title) && isVariableDefined(font_path_body) && isVariableDefined(font_path_ui) && isVariableDefined(img_path_drop) && isVariableDefined(img_path_stamp_CN) && isVariableDefined(img_path_stamp_EN) && isVariableDefined(img_path_note_CN) && isVariableDefined(img_path_note_EN) && isVariableDefined(js_path_jquery) && isVariableDefined(js_path_jschardet) && isVariableDefined(js_path_css_global_variables) && isVariableDefined(js_path_regex_rules) && isVariableDefined(js_path_utilities) && isVariableDefined(js_path_footnotes) && isVariableDefined(js_path_ui_variables) && isVariableDefined(js_path_processText) && isVariableDefined(js_path_ui_helpers)) {
                        console.log('UI related resources are loaded.');
                        clearInterval(interval3);

                        var js_path_ui;
                        injectCustomJs('scripts/ui.js', function(path) {
                            // console.log("js_path_ui: ", path);
                            js_path_ui = path;
                        });



                        var interval4 = setInterval(function() {
                            if (isVariableDefined(css_path_ui_variables) && isVariableDefined(css_path_ui) && isVariableDefined(css_path_reader) && isVariableDefined(css_path_footnotes) && isVariableDefined(font_path_title) && isVariableDefined(font_path_body) && isVariableDefined(font_path_ui) && isVariableDefined(img_path_drop) && isVariableDefined(img_path_stamp_CN) && isVariableDefined(img_path_stamp_EN) && isVariableDefined(img_path_note_CN) && isVariableDefined(img_path_note_EN) && isVariableDefined(js_path_jquery) && isVariableDefined(js_path_jschardet) && isVariableDefined(js_path_css_global_variables) && isVariableDefined(js_path_regex_rules) && isVariableDefined(js_path_utilities) && isVariableDefined(js_path_footnotes) && isVariableDefined(js_path_ui_variables) && isVariableDefined(js_path_processText) && isVariableDefined(js_path_ui_helpers) && isVariableDefined(js_path_ui)) {
                                console.log('All resources are loaded.');
                                clearInterval(interval4);

                                var js_path_receive_loaded_variables;
                                injectAllCustomResources('scripts_extension/Chrome/no-ui/receive_loaded_variables.js', function(path) {
                                    console.log("All custom resources loaded.");
                                    // console.log("img_path_drop: ", img_path_drop);
                                    // console.log("img_path_stamp_CN: ", img_path_stamp_CN);
                                    // console.log("img_path_stamp_EN: ", img_path_stamp_EN);
                                    // console.log("img_path_note_CN: ", img_path_note_CN);
                                    // console.log("img_path_note_EN: ", img_path_note_EN);
                                    // console.log("js_path_jquery: ", js_path_jquery);
                                    // console.log("js_path_jschardet: ", js_path_jschardet);
                                    // console.log("js_path_css_global_variables: ", js_path_css_global_variables);
                                    // console.log("js_path_regex_rules: ", js_path_regex_rules);
                                    // console.log("js_path_utilities: ", js_path_utilities);
                                    // console.log("js_path_footnotes: ", js_path_footnotes);
                                    // console.log("js_path_ui_variables: ", js_path_ui_variables);
                                    // console.log("js_path_ui_helpers: ", js_path_ui_helpers);
                                    // console.log("js_path_ui: ", js_path_ui);
                                    // console.log("js_path_processText: ", js_path_processText);

                                    // console.log("js_path_receive_loaded_variables: ", path);
                                    js_path_receive_loaded_variables = path;

                                    var js_path_file_handler;
                                    injectCustomJs('scripts_extension/Chrome/no-ui/file_handler.js', function(path) {
                                        // console.log("js_path_file_handler: ", path);
                                        js_path_file_handler = path;
                                    });
                                });
                            }
                        }, 500);
                    }
                }, 500);
            }
        }, 500);
    }
}, 500);



function isVariableDefined(v) {
    return (v !== "undefined" && v !== "" && v !== null && v !== undefined && v !== NaN);
}

function injectAllCustomResources(jsPath, callback) {
    // console.log("injectAllCustomResources");
    let temp = document.createElement('script');
    temp.setAttribute('type', 'text/javascript');
    temp.setAttribute('charset', 'utf-8');
    temp.src = chrome.runtime.getURL(jsPath);
    temp.onload = function() {
        var evt = new CustomEvent("injectCustomResourcesLoaded", {
            detail: {
                "img_path_drop": img_path_drop,
                "img_path_stamp_CN": img_path_stamp_CN,
                "img_path_stamp_EN": img_path_stamp_EN,
                "img_path_note_CN": img_path_note_CN,
                "img_path_note_EN": img_path_note_EN,
                "js_path_jquery": js_path_jquery,
                "js_path_jschardet": js_path_jschardet,
                "js_path_css_global_variables": js_path_css_global_variables,
                "js_path_regex_rules": js_path_regex_rules,
                // "js_path_utilities": js_path_utilities,
                // "js_path_footnotes": js_path_footnotes,
                // "js_path_ui_variables": js_path_ui_variables,
                // "js_path_ui_helpers": js_path_ui_helpers,
                // "js_path_ui": js_path_ui,
                // "js_path_processText": js_path_processText,
            }
        });
        document.dispatchEvent(evt);

        callback(this.src);
    };
    document.head.appendChild(temp);
}

function injectCustomJs(jsPath, callback) {
    let temp = document.createElement('script');
    temp.setAttribute('type', 'text/javascript');
    temp.setAttribute('charset', 'utf-8');
    temp.src = chrome.runtime.getURL(jsPath);
    temp.onload = function() {
        // var jsName = jsPath.split("/").pop().replace(".js", "");
        // var evt = new CustomEvent(`injectCustomJsLoaded_${jsName}`, {
        //     detail: {
        //         "loaded": this.src
        //     }
        // });
        // document.dispatchEvent(evt);
        callback(this.src);
    };
    document.head.appendChild(temp);
    // return temp.src;
}

function injectCustomIcon(iconPath, iconType)
{
    let temp = document.createElement('link');
    temp.type = iconType;
    temp.rel = 'icon';
    temp.as = 'image';
    temp.href = chrome.runtime.getURL(iconPath);
    document.head.appendChild(temp);
}

function injectCustomFont(fontPath, fontType, callback) {
    let temp = document.createElement('link');
    temp.type = fontType;
    temp.rel = 'preload';
    temp.as = 'font';
    temp.crossOrigin = 'anonymous';
    temp.href = chrome.runtime.getURL(fontPath);
    temp.onload = function() {
        // var fontName = fontPath.split("/").pop().replace(".woff2", "").replace(".woff", "");
        // var evt = new CustomEvent(`injectCustomFontLoaded_${fontName}`, {
        //     detail: {
        //         "loaded": this.href
        //     }
        // });
        // document.dispatchEvent(evt);
        callback(this.href);
    };
    document.head.appendChild(temp);
    // return temp.href;
}

function injectCustomLink(linkPath, callback) {
    let temp = document.createElement('link');
    temp.type = 'text/css';
    temp.rel = 'stylesheet';
    temp.href = chrome.runtime.getURL(linkPath);
    temp.crossOrigin = 'anonymous';
    temp.onload = function() {
        // var linkName = linkPath.split("/").pop().replace(".css", "");
        // var evt = new CustomEvent(`injectCustomLinkLoaded_${linkName}`, {
        //     detail: {
        //         "loaded": this.href
        //     }
        // });
        // document.dispatchEvent(evt);
        // console.log("link loaded: ", this.href)
        callback(this.href);
    };
    document.head.appendChild(temp);
    // return temp.href;
}