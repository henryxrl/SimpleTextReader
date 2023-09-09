// ------------------------------------------------
// Module <Settings>
// ------------------------------------------------

class SettingBase {
    type = "";

    constructor(id, desc, defaultValue) {
        this.id = id;
        this.desc = desc;
        this.defaultValue = defaultValue;
        this.value = defaultValue;
    };

    genInputElm(attrs = "") {
        return `<input type="${this.type}" id="${this.id}" value="${this.value}" ${attrs} />`;
    }
    genLabelElm(attrs = "") {
        return `<span id="${this.id}-lbl" ${attrs}>${this.desc}</span>`;
    }
    getInputVal() {
        this.value = document.getElementById(this.id).value || this.defaultValue;
        return this;
    }
    setVal(value) {
        this.value = (value == null) ? this.defaultValue : value;
        return this;
    }
}

class SettingText extends SettingBase {
    type = "text";
}

class SettingCheckbox extends SettingBase {
    type = "checkbox";

    constructor(id, desc, defaultValue) {
        super(id, desc, !!defaultValue);
    }
    genInputElm(attrs = "") {
        if (this.value == null) this.value = this.defaultValue;
        return `<input type="${this.type}" id="${this.id}" ${this.value ? "checked" : ""} ${attrs} />`;
    }
    genLabelElm(attrs = "") {
        return `<label id="${this.id}-lbl" for="${this.id}" ${attrs}>${this.desc}</label>`;
    }
    getInputVal() {
        this.value = document.getElementById(this.id).checked;
        return this;
    }
}

class SettingSelect extends SettingText {
    type = "select";

    constructor(id, desc, defaultValue, options) {
        super(id, desc, defaultValue);
        this.options = options;
    }
    genInputElm(attrs = "") {
        if (this.value == null) this.value = this.defaultValue;
        let str = `<select id="${this.id}" ${attrs}>`;
        for (const k in this.options) {
            str += `<option value="${k}" ${(k == this.value) ? "selected" : ""}>${this.options[k]}<option>`;
        }
        str += "</select>";
        return str;
    }
}

// Float
class SettingNumber extends SettingText {
    type = "number";

    constructor(id, desc, defaultValue) {
        super(id, desc, isNaN(defaultValue) ? 0 : parseFloat(defaultValue));
    }
    genInputElm(attrs = "") {
        return super.genInputElm(`step="any" ` + attrs);
    }
    getInputVal() {
        super.getInputVal();
        this.value = parseFloat(this.value) || this.defaultValue;
        return this;
    }
}

// Int
class SettingInt extends SettingText {
    type = "number";

    constructor(id, desc, defaultValue) {
        super(id, desc, isNaN(defaultValue) ? 0 : Math.floor(parseFloat(defaultValue)));
    }
    genInputElm(attrs = "") {
        return super.genInputElm(`step="1" ` + attrs);
    }
    getInputVal() {
        super.getInputVal();
        console.log(this.value)
        this.value = Math.floor(parseFloat(this.value)) || this.defaultValue;
        return this;
    }
}

class SettingGroupBase {
    id = "";
    desc = "";
    settings = {};

    constructor(id, desc) {
        this.id = id;
        this.desc = desc;
    }

    getInputVals() {
        for (const k in this.settings) {
            this.settings[k].getInputVal();
        }
        return this;
    }
    exportValues() {
        let stObj = {};
        for (const k in this.settings) {
            stObj[k] = this.settings[k].value;
        }
        return stObj;
    }
    importValues(stObj) {
        for (const k in this.settings) {
            this.settings[k].setVal((k in stObj) ? stObj[k] : null);
        }
        return this;
    }

    genHTML() {
        return `<div>需要重载 ${this.id}(${this.desc}) 参数设置类 getHTML() 函数</div>`;
    }
    apply() {
        throw new Error(`SettingGroup ${this.id}(${this.desc}) apply() not implicated!`);
    }
}

var settingMgr = {

    enabled: false,
    ITEM_SETTINGS: "Settings",
    ON_KEYDOWN: document.onkeydown,

    groups: {},

    show() {
        if (this.enabled) {
            let dlg = $(`<dialog id="settingDlg">
				<div class="dlg-cap">设置</div>
				<span class="dlg-body"></span>
				<div class="dlg-foot"></div>
				</dialog>`).bind("cancel", () => this.hide());
            dlg.find(".dlg-cap").append($(`<span class="dlg-close">&times;</span>`).click(() => this.hide()));
            dlg.find(".dlg-foot").append($(`<button>恢复默认</button>`).click(() => this.reset().apply().hide()));
            dlg.find(".dlg-foot").append($(`<button style="float:right;">应用</button>`).click(() => this.save().apply().hide()))
            let container = dlg.find(".dlg-body");
            for (k in this.groups) {
                let sg = this.groups[k];
                container.append(sg.genHTML());
            }
            freezeContent();
            dlg.appendTo("body");
            dlg[0].showModal();
        }
        return this;
    },

    hide() {
        if (this.enabled) {
            $("#settingDlg").remove();
            unfreezeContent();
        }
        return this;
    },

    load(group = "") {
        let stObj = JSON.parse(localStorage.getItem(this.ITEM_SETTINGS)) || {};
        if (group) {
            if (group in this.groups) {
                this.groups[group].importValues(stObj[group] || {});
            }
        } else {
            for (const grp in this.groups) {
                this.groups[grp].importValues(stObj[grp] || {});
            }
        }
        return this;
    },

    save() {
        let stObj = {};
        for (const grp in this.groups) {
            stObj[grp] = this.groups[grp].getInputVals().exportValues();
        }
        localStorage.setItem(this.ITEM_SETTINGS, JSON.stringify(stObj));
        return this;
    },

    reset() {
        if (this.enabled) {
            localStorage.removeItem(this.ITEM_SETTINGS);
            this.load();
        }
        return this;
    },

    apply(group = "") {
        if (this.enabled) {
            if (group) {
                if (group in this.groups) {
                    this.groups[group].apply();
                }
            } else {
                for (const grp in this.groups) {
                    this.groups[grp].apply();
                }
            }
        }
        return this;
    },

    enable() {
        if (!this.enabled) {
            $("#STRe-setting-btn").show();
            this.enabled = true;
            console.log("Module <Settings> enabled.");
        }
        return this;
    },

    disable() {
        if (this.enabled) {
            this.hide().reset().load().apply();
            $("#STRe-setting-btn").hide();
            this.enabled = false;
            console.log("Module <Settings> disabled.");
        }
        return this;
    },

    init() {
        $(`<div id="STRe-setting-btn" class="btn-icon">
		<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
			<path stroke="none" d="M12 8a4 4 0 0 1 4 4a4 4 0 0 1-4 4a4 4 0 0 1-4-4a4 4 0 0 1 4-4m0 2a2 2 0 0 0-2 2a2 2 0 0 0 2 2a2 2 0 0 0 2-2a2 2 0 0 0-2-2m-2 12c-.25 0-.46-.18-.5-.42l-.37-2.65c-.63-.25-1.17-.59-1.69-.99l-2.49 1.01c-.22.08-.49 0-.61-.22l-2-3.46a.493.493 0 0 1 .12-.64l2.11-1.66L4.5 12l.07-1l-2.11-1.63a.493.493 0 0 1-.12-.64l2-3.46c.12-.22.39-.31.61-.22l2.49 1c.52-.39 1.06-.73 1.69-.98l.37-2.65c.04-.24.25-.42.5-.42h4c.25 0 .46.18.5.42l.37 2.65c.63.25 1.17.59 1.69.98l2.49-1c.22-.09.49 0 .61.22l2 3.46c.13.22.07.49-.12.64L19.43 11l.07 1l-.07 1l2.11 1.63c.19.15.25.42.12.64l-2 3.46c-.12.22-.39.31-.61.22l-2.49-1c-.52.39-1.06.73-1.69.98l-.37 2.65c-.04.24-.25.42-.5.42h-4m1.25-18l-.37 2.61c-1.2.25-2.26.89-3.03 1.78L5.44 7.35l-.75 1.3L6.8 10.2a5.55 5.55 0 0 0 0 3.6l-2.12 1.56l.75 1.3l2.43-1.04c.77.88 1.82 1.52 3.01 1.76l.37 2.62h1.52l.37-2.61c1.19-.25 2.24-.89 3.01-1.77l2.43 1.04l.75-1.3l-2.12-1.55c.4-1.17.4-2.44 0-3.61l2.11-1.55l-.75-1.3l-2.41 1.04a5.42 5.42 0 0 0-3.03-1.77L12.75 4h-1.5Z"/>
		</svg></div>`)
            .click(() => this.show())
            .prependTo($("#btnWrapper"))
            .hide();
        return this;
    },
}

settingMgr.init().enable();

// 设置示例
/*
class SettingGroupExample extends SettingGroupBase {
    constructor() {
        super("setting-group-Example", "示例设置");
        this.settings["setting-1"] = new SettingCheckbox(this.id + "-setting-1", "是/否", true);
        this.settings["setting-2"] = new SettingText(this.id + "-setting-2", "字符串", "default loooooooooooooooong text");
        this.settings["setting-3"] = new SettingNumber(this.id + "-setting-3", "数字", 0.1);
        this.settings["setting-4"] = new SettingInt(this.id + "-setting-4", "整数", 1);
    }
    genHTML() {
        let sts = this.settings;
        let html = `<div class="sub-cap">${this.desc}</div>
            <div class="setting-group setting-group-example">
            <div class="row">${sts["setting-1"].genLabelElm()} ${sts["setting-1"].genInputElm()}</div>
            ${sts["setting-2"].genLabelElm()} ${sts["setting-2"].genInputElm()}
            ${sts["setting-3"].genLabelElm()} ${sts["setting-3"].genInputElm()}
            ${sts["setting-4"].genLabelElm()} ${sts["setting-4"].genInputElm()}
            </div>`;
        return html;
    }
    apply() {
        return this;
    }
}

settingMgr.groups["Example"] = new SettingGroupExample();
settingMgr.load("Example").apply("Example");
// */

// --------------------------------------
// 界面参数设置
class SettingCSS extends SettingText {
    getCSS(sel = "", prop = "") {
        for (const sheet of document.styleSheets) {
            for (const rule of sheet.cssRules) {
                if (rule.selectorText === (sel || this.selector)) {
                    return rule.style.getPropertyValue(prop || this.property);
                }
            }
        }
        return null;
    }
    setCSS(val = null, sel = "", prop = "") {
        for (const sheet of document.styleSheets) {
            for (const rule of sheet.cssRules) {
                if (rule.selectorText === (sel || this.selector)) {
                    rule.style.setProperty(prop || this.property, (val == null) ? this.value : val);
                }
            }
        }
    }
    constructor(id, desc, selector, property, defaultValue = null) {
        super(id, desc, defaultValue);
        this.selector = selector;
        this.property = property;
        if (defaultValue == null) {
            this.defaultValue = this.getCSS();
        }
    }
}

class SettingGroupUI extends SettingGroupBase {
    constructor() {
        super("setting-group-UI", "界面参数");
        this.settings["p_lineHeight"] = new SettingCSS(this.id + "-p_lineHeight", "行高", ":root", "--p_lineHeight");
        this.settings["p_fontSize"] = new SettingCSS(this.id + "-p_fontSize", "字号", ":root", "--p_fontSize");
        this.settings["fontColor"] = new SettingCSS(this.id + "-fontColor", "日间字符色", ":root", "--fontColor");
        this.settings["bgColor"] = new SettingCSS(this.id + "-bgColor", "日间背景色", ":root", "--bgColor");
        this.settings["dark_fontColor"] = new SettingCSS(this.id + "-dark_fontColor", "夜间字符色", `[data-theme="dark"]`, "--fontColor");
        this.settings["dark_bgColor"] = new SettingCSS(this.id + "-dark_bgColor", "夜间背景色", `[data-theme="dark"]`, "--bgColor");
        this.settings["pagination_bottom"] = new SettingCSS(this.id + "-pagination_bottom", "分页条与底部距离", "#pagination", "bottom");
        this.settings["pagination_opacity"] = new SettingCSS(this.id + "-pagination_opacity", "分页条透明度(0.0~1.0)", "#pagination", "opacity", "1");
    }

    genHTML() {
        let html = `<div class="sub-cap">${this.desc}</div>`;
        html += `<div class="setting-group setting-group-UI">`;
        for (const k in this.settings) {
            let st = this.settings[k];
            html += st.genLabelElm() + st.genInputElm(`style="width:6rem;"`);
        }
        html += "</div>";
        return html;
    }

    apply() {
        for (const k in this.settings) {
            this.settings[k].setCSS();
        }
        return this;
    }
}

settingMgr.groups["UI"] = new SettingGroupUI();
settingMgr.load("UI").apply("UI");
