// ------------------------------------------------
// Module <Settings>
// ------------------------------------------------

class STReSettingBase {
    id = "";
    desc = "";
    type = "";
    value = null;
    defaultValue = null;

    constructor(id, desc, defaultValue) {
        this.id = id;
        this.desc = desc;
        this.defaultValue = defaultValue;
    };

    static genAttr(a, v) { return (v != null) ? `${a}="${v}"` : ""; }
    static genICS(id, cls, style) { return this.genAttr("id", id) + " " + this.genAttr("class", cls) + " " + this.genAttr("style", style); }

    genInput(cls=null, style=null) {
        if (this.value == null) this.value = this.defaultValue;
        return `<input type="${this.type}" ${STReSettingBase.genICS(this.id, cls, style)} ${STReSettingBase.genAttr("value", this.value)} />`;
    }
    genLabel(cls=null, style=null) {
        return `<span ${STReSettingBase.genICS(this.id+"-lbl", cls, style)}>${this.desc}</span>`;
    }
    collect() { this.value = document.getElementById(this.id).value || this.defaultValue; }
}

class STReSettingText extends STReSettingBase {
    type = "text";
}

class STReSettingCheckbox extends STReSettingBase {
    type = "checkbox";

    genInput(cls=null, style=null) {
        if (this.value == null) this.value = this.defaultValue;
        return `<input type="${this.type}" ${STReSettingBase.genICS(this.id, cls, style)} ${STReSettingBase.genAttr("checked", this.value?"checked":null)} />`;
    }
    genLabel(cls=null, style=null) {
        return `<label ${STReSettingBase.genICS(this.id+"-lbl", cls, style)} ${STReSettingBase.genAttr("for", this.id)}>${this.desc}</label>`;
    }
    collect() { this.value = document.getElementById(this.id).checked; }
}

class STReSettingSelect extends STReSettingBase {
    type = "select";

    constructor(id, desc,defaultValue, options) {
        super(id, desc, defaultValue);
        this.options = options;
    }
    genInput(cls=null, style=null) {
        if (this.value == null) this.value = this.defaultValue;
        let str = `<select ${STReSettingBase.genICS(this.id, cls, style)}>`;
        for (k in this.options) {
            str += `<option value="${k}" ${(k == this.value) ? "selected" : ""}>${this.options[k]}<option>`;
        }
        str += "</select>";
        return str;
    }
}

class STReSettingGroupBase {
    id = "";
    desc = "";
    settings = {};

    constructor(id, desc) {
        this.id = id;
        this.desc = desc;
    }

    collectSettings() {
        for (const k in this.settings) {
            this.settings[k].collect();
        }
    }
    genHTML() { return ""; }
    apply() { return true; }
}

class STReSettingGroupFOS extends STReSettingGroupBase {
    constructor() {
        super("setting-group-FoS", "云端书库");
        this.settings["enable"] = new STReSettingCheckbox(this.id+"-enable", "启用", false);
        this.settings["WebDAV"] = new STReSettingText(this.id+"-WebDAV", "WebDAV 地址", "/books");
    }
    genHTML() {
        let html = `<div class="sub-cap">${this.desc}</div>`;
        html += `<div class="setting-group setting-group-fos fn-setting-wrapper">`;
        let st = this.settings["enable"];
        html += `<div class="row">${st.genInput()} ${st.genLabel()}</div>`;
        st = this.settings["WebDAV"];
        html += `${st.genLabel("lv-2")} ${st.genInput(null, "width:20rem;")}`;
        html += "</div>";
        return html;
    }
}

let stFOS = new STReSettingGroupFOS();
$(`<dialog id="settingDlg"></dialog>`).append(stFOS.genHTML()).appendTo("body").get(0).showModal();
