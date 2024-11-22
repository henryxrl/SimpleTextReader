/*! Color-Picker 0.12.0 MIT | https://github.com/yairEO/color-picker */
!(function (t, e) {
    "object" == typeof exports && "undefined" != typeof module
        ? e(exports)
        : "function" == typeof define && define.amd
        ? define(["exports"], e)
        : e(((t = "undefined" != typeof globalThis ? globalThis : t || self).ColorPicker = {}));
})(this, function (t) {
    "use strict";
    var e = (t) => new DOMParser().parseFromString(t.trim(), "text/html").body.firstElementChild,
        s = {
            color: "white",
            onInput: (t) => t,
            onChange: (t) => t,
            buttons: {
                undo: { icon: "↶", title: "Undo" },
                format: { icon: "⇆", title: "Switch Color Format" },
                add: { icon: "+", title: "Add to Swatches" },
            },
        };
    const i = (t) =>
            t
                .match(/\((.*)\)/)[1]
                .split(",")
                .map(Number),
        o = (t) =>
            Object.assign(
                [0, 0, 0, 1],
                t
                    .match(/\((.*)\)/)[1]
                    .split(",")
                    .map((t, e) => (3 != e || t.includes("%") ? parseFloat(t) : 100 * parseFloat(t)))
            ),
        a = (t) => `hsla(${t.h}, ${t.s}%, ${t.l}%, ${t.a}%)`,
        n = (t) => t.toFixed(1).replace(".0", ""),
        h = (t) => {
            const [e, s, i, o] = ((t) => t.match(/\w\w/g))(t),
                [a, n, h] = [e, s, i].map((t) => parseInt(t, 16));
            return `rgba(${a},${n},${h},${o ? (parseInt(o, 16) / 255).toFixed(2) : 1})`;
        },
        r = (t) => {
            var e,
                s = document.createElement("canvas").getContext("2d");
            return (s.fillStyle = t), "#" == (e = s.fillStyle)[0] ? e : l(e);
        },
        l = (t) => {
            const [e, s, o, a] = i(t),
                n = "#" + [e, s, o].map((t) => t.toString(16).padStart(2, "0")).join("");
            return 3 == t.length
                ? n
                : n +
                      Math.round(255 * a)
                          .toString(16)
                          .padStart(2, "0");
        },
        c = (t) => {
            let [e, s, o, a] = i(t);
            (e /= 255), (s /= 255), (o /= 255);
            let h = Math.max(e, s, o),
                r = Math.min(e, s, o),
                l = h - r,
                c = 0,
                u = 0,
                d = ((h + r) / 2).toPrecision(5);
            return (
                l &&
                    ((u = d > 0.5 ? l / (2 - h - r) : l / (h + r)),
                    (c = h == e ? (s - o) / l + (s < o ? 6 : 0) : (c = h == s ? (o - e) / l + 2 : (e - s) / l + 4)),
                    (c /= 6)),
                { h: n(360 * c), s: n(100 * u), l: n(100 * d), a: n(100 * a) }
            );
        },
        u = (t, e) => (
            (e = (e + "").toLowerCase()),
            (t = r(t)),
            "hex" == e ? t : e.startsWith("hsl") ? a(c(h(t))) : e.startsWith("rgb") ? h(t) : t
        );
    function d({ name: t, min: e = 0, max: s = 100, value: i }) {
        return `<div class="range color-picker__${t}" title="${t}" style="--min:${e}; --max:${s};">\n            <input type="range" name="${t}" value="${i}" min="${e}" max="${s}">\n            <output></output>\n            <div class='range__progress'></div>\n          </div>`;
    }
    function p(t) {
        const {
            buttons: { undo: e, format: s },
        } = this.settings;
        return `\n    <div class='color-picker__value cp-checkboard'>\n      <input name='value' inputmode='decimal' placeholder='CSS Color' value='${r(
            a(t)
        )}'>\n      <button title='${e.title}' name="undo">${e.icon}</button>\n      <button title='${s.title}' name='format'>${s.icon}</button>\n      <div></div>\n    </div>\n  `;
    }
    function S(t, e) {
        const {
            buttons: { add: s },
        } = this.settings;
        return `\n    <div class='color-picker__swatches' style='--initial-len:${
            e.length
        }'>\n      <button name='addSwatch' title='${s.title}'>${s.icon}</button>\n      ${t.map((t) => m(t, e.includes(t))).join("")}\n    </div>\n  `;
    }
    function m(t, e) {
        return `<div class="cp-checkboard color-picker__swatch" title="${t}" style="--c:${t}">${e ? "" : '<button name="removeSwatch">&times;</button>'}</div>`;
    }
    var g = Object.freeze({
        __proto__: null,
        scope: function () {
            const { h: t, s: e, l: s, a: i } = this.color;
            return `\n    <div class='${`color-picker ${this.settings.className || ""}`.trim()}'>\n      ${d({
                name: "hue",
                value: t,
                max: "360",
            })}\n      ${d({ name: "saturation", value: e })}\n      ${d({ name: "lightness", value: s })}\n      ${d({
                name: "alpha",
                value: i,
            })}\n      <output></output>\n      ${p.call(this, this.color)}\n      ${
                this.swatches ? S.call(this, this.swatches, this.initialSwatches) : ""
            }\n    </div>\n  `;
        },
        slider: d,
        swatch: m,
        swatches: S,
        value: p,
    });
    function v() {
        this.syncGlobalSwatchesWithLocal();
    }
    function w(t) {
        t.preventDefault();
        const { value: e, max: s } = t.target,
            i = -1 * Math.sign(t.deltaY);
        e && s && ((t.target.value = Math.min(Math.max(+e + i, 0), +s)), C.call(this, t));
    }
    function f(t) {
        "Escape" == t.key && this.settings.onClickOutside(t);
    }
    function b(t) {
        this.DOM.scope.contains(t.target) || this.settings.onClickOutside(t);
    }
    function C(t) {
        const { name: e, value: s, type: i } = t.target;
        "range" == i && this.setColor({ ...this.color, [e[0]]: +s });
    }
    function _(t) {
        const { type: e } = t.target;
        ("range" != e && "text" != e) || (this.history.last = this.color);
    }
    function y(t) {
        this.setColor(this.getHSLA(t.target.value)), this.DOM.value.blur();
    }
    function O(t) {
        const { name: e, parentNode: s, classList: i, title: o } = t.target;
        "format" == e
            ? this.swithFormat()
            : "undo" == e
            ? this.history.undo()
            : "addSwatch" == e
            ? this.addSwatch()
            : "removeSwatch" == e
            ? this.removeSwatch(s, s.title)
            : i.contains("color-picker__swatch") &&
              o &&
              ((this.history.last = this.color), this.setColor(this.getHSLA(o)));
    }
    var $ = Object.freeze({
        __proto__: null,
        bindEvents: function () {
            [
                ["scope", "input", C],
                ["scope", "change", _],
                ["scope", "click", O],
                ["scope", "wheel", w],
                ["value", "change", y],
            ].forEach(([t, e, s]) => this.DOM[t].addEventListener(e, s.bind(this), { pasive: !1 })),
                window.addEventListener("storage", v.bind(this)),
                this.settings.onClickOutside &&
                    (document.body.addEventListener("click", b.bind(this)),
                    window.addEventListener("keydown", f.bind(this)));
        },
    });
    function M() {
        const t = () => this.settings.onChange(this.CSSColor),
            e = this.setColor.bind(this);
        return {
            _value: [this.color],
            get pop() {
                return this._value.pop();
            },
            get previous() {
                return this._value[this._value.length - 2];
            },
            set last(e) {
                this._value.push(e), t();
            },
            undo() {
                if (this._value.length > 1) {
                    this.pop;
                    let s = this._value[this._value.length - 1];
                    return e(s), t(), s;
                }
            },
        };
    }
    const x = (t, e) => t.some((t) => r(t) == r(e)),
        D = "@yaireo/color-picker/swatches";
    var k = Object.freeze({
        __proto__: null,
        addSwatch: function (t = this.CSSColor) {
            if (x(this.swatches, t)) return;
            const s = e(this.templates.swatch(t));
            s.classList.add("cp_remove"),
                this.DOM.swatches.prepend(s),
                setTimeout(() => s.classList.remove("cp_remove"), 0),
                this.swatches.unshift(t),
                this.sharedSwatches.unshift(t),
                this.getSetGlobalSwatches(this.sharedSwatches);
        },
        getSetGlobalSwatches: function (t) {
            const e = this.settings.swatchesLocalStorage,
                s = "string" == typeof e ? e : "";
            return (
                e && t && (localStorage.setItem(D + s, t.join(";")), dispatchEvent(new Event("storage"))),
                localStorage[D + s]?.split(";").filter(String) || []
            );
        },
        removeSwatch: function (t, e) {
            t.classList.add("cp_remove"), setTimeout(() => t.remove(), 200);
            const s = (t) => t != e;
            (this.swatches = this.swatches.filter(s)),
                (this.sharedSwatches = this.sharedSwatches.filter(s)),
                this.getSetGlobalSwatches(this.sharedSwatches);
        },
        syncGlobalSwatchesWithLocal: function () {
            (this.sharedSwatches = this.getSetGlobalSwatches()),
                (this.swatches = this.sharedSwatches.concat(this.initialSwatches)),
                this.DOM.swatches &&
                    setTimeout(() => {
                        const t = e(this.templates.swatches.call(this, this.swatches, this.initialSwatches));
                        this.DOM.swatches.replaceWith(t), (this.DOM.swatches = t);
                    }, 500);
        },
    });
    function F(t) {
        this.settings = Object.assign({}, s, t);
        const { color: e, defaultFormat: i, swatches: o } = this.settings;
        (this.DOM = {}),
            (this.sharedSwatches = this.getSetGlobalSwatches()),
            (this.initialSwatches = o || []),
            (this.swatches = o && this.sharedSwatches.concat(this.initialSwatches)),
            (this.color = u(e, i)),
            (this.history = M.call(this)),
            this.init();
    }
    (F.prototype = {
        templates: g,
        ...k,
        ...$,
        getColorFormat: (t) => ("#" == t[0] ? "hex" : t.indexOf("hsl") ? (t.indexOf("rgb") ? "" : "rgba") : "hsla"),
        getHSLA(t) {
            let e;
            if (t)
                return t + "" == "[object Object]" && Object.keys(t).join("").startsWith("hsl")
                    ? t
                    : ((this.colorFormat = this.getColorFormat(t)),
                      t.indexOf("hsla")
                          ? ((t = r(t)), (t = h(t)), (e = c(t)))
                          : ((e = o(t)), (e = { h: e[0], s: e[1], l: e[2], a: e[3] })),
                      e);
        },
        swithFormat() {
            switch (this.colorFormat) {
                case "":
                case "hex":
                    this.colorFormat = "rgba";
                    break;
                case "rgba":
                    this.colorFormat = "hsla";
                    break;
                case "hsla":
                    this.colorFormat = "hex";
            }
            this.setCSSColor(), (this.DOM.value.value = this.CSSColor);
        },
        updateRangeSlider(t, e) {
            const s = this.DOM.scope.querySelector(`input[name="${t}"]`);
            s &&
                ((s.value = e),
                s.parentNode.style.setProperty("--value", e),
                s.parentNode.style.setProperty("--text-value", JSON.stringify("" + Math.round(e))),
                this.updateCSSVar(t, e));
        },
        setCSSColor() {
            (this.CSSColor = r(a(this.color))),
                "rgba" == this.colorFormat
                    ? (this.CSSColor = h(this.CSSColor))
                    : "hsla" == this.colorFormat && (this.CSSColor = a(this.color)),
                this.DOM.scope && this.DOM.scope.setAttribute("data-color-format", this.colorFormat),
                this.settings.onInput(this.CSSColor);
        },
        setColor(t) {
            t &&
                ((t = this.getHSLA(t)),
                (this.color = t),
                this.setCSSColor(),
                this.DOM.scope && this.updateAllCSSVars(),
                this.DOM.value && (this.DOM.value.value = this.CSSColor));
        },
        updateCSSVar(t, e) {
            this.DOM.scope.style.setProperty(`--${t}`, e);
        },
        updateAllCSSVars() {
            const t = this.NamedHSLA(this.color);
            Object.entries(t).forEach(([t, e]) => {
                this.updateRangeSlider(t, e);
            });
        },
        NamedHSLA: (t) => ({ hue: t.h, saturation: t.s, lightness: t.l, alpha: t.a }),
        build() {
            const t = this.templates.scope.call(this);
            (this.DOM.scope = e(t)),
                (this.DOM.value = this.DOM.scope.querySelector('input[name="value"]')),
                (this.DOM.swatches = this.DOM.scope.querySelector(".color-picker__swatches"));
        },
        init() {
            this.build(), this.setColor(this.color), this.bindEvents();
        },
    }),
        (t.CSStoHSLA = o),
        (t.HSLAtoCSS = a),
        (t.any_to_hex = r),
        (t.changeColorFormat = u),
        (t.default = F),
        (t.hex_rgba = h),
        (t.rgba_hsla = c),
        Object.defineProperty(t, "__esModule", { value: !0 });
});
