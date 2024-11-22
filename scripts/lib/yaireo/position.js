/**
 * Skipped minification because the original files appears to be already minified.
 * Original file: /npm/@yaireo/position@1.1.1/dist/position.umd.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
/**
 * @yaireo/position - Position a DOM element at a certain X,Y or next to another element
 *
 * @version v1.1.1
 * @homepage https://jsbin.com/beqosub/edit?html,css,output
 */

/**
 * @yaireo/position - Position a DOM element at a certain X,Y or next to another element
 *
 * @version v1.1.1
 * @homepage https://jsbin.com/beqosub/edit?html,css,output
 */

(function (a, b) {
    if ("function" == typeof define && define.amd) define(["exports"], b);
    else if ("undefined" != typeof exports) b(exports);
    else {
        var c = { exports: {} };
        b(c.exports), (a.position = c.exports);
    }
})("undefined" == typeof globalThis ? ("undefined" == typeof self ? this : self) : globalThis, function (a) {
    "use strict";
    var b = Math.round;
    Object.defineProperty(a, "__esModule", { value: !0 }), (a.default = void 0);
    /**
     * positions a DOM element next to a certain position
     * @param {HTMLElement} target DOM element node
     * @param {Object} ref node reference for positioning or just {x,y} coordinates
     * @param {String} placement [above/below/center & left/right/center] or mix of two (only works if "ref" is an HTML Element)
     * @param {Array} prevPlacement used when calculated new position overflows
     * @param {Array} offset distance (in pixels) from original placement position ("10px 20px" or just "10px" for both horizontal & vertical)
     */ const c = (a) => {
        var e,
            { target: f, ref: g, offset: h, placement: i, prevPlacement: j, useRaf: l = !0, track: k } = a,
            m = { x: g.x, y: g.y, h: 0, w: 0 },
            n = g && g.x ? { ...g } : {},
            o = document.documentElement,
            p = { w: o.clientWidth, h: o.clientHeight },
            q = { w: f.clientWidth, h: f.clientHeight }; // [horizontal, vertical]
        // if "ref" is a DOM element, get [x,y] coordinates and adjust according to desired placement
        if (
            ((d = l ? d : (a) => a()),
            (j = j || []),
            (i = (i || " ").split(" ").map((b, a) => (b ? b : ["center", "below"][a]))),
            (h = h ? [h[0] || 0, h[1] || h[0] || 0] : [0, 0]),
            g.parentNode &&
                ((e = g.ownerDocument.defaultView),
                (n = g.getBoundingClientRect()),
                (m.x = n.x),
                (m.y = n.y),
                (m.w = n.width),
                (m.h = n.height),
                e != e.parent))
        )
            // if ref element is within an iframe, get it's position relative to the viewport and not its local window
            for (let a of e.parent.document.getElementsByTagName("iframe"))
                if (a.contentWindow === e) {
                    let b = a.getBoundingClientRect();
                    (m.x += b.x), (m.y += b.y);
                } // horizontal
        "left" == i[0] ? (m.x -= q.w + h[0]) : "right" == i[0] ? (m.x += m.w + h[0]) : (m.x -= q.w / 2 - m.w / 2),
            "above" == i[1] ? (m.y -= q.h + h[1]) : "below" == i[1] ? (m.y += m.h + h[1]) : (m.y -= q.h / 2 - m.h / 2);
        const r = { top: 0 > m.y, bottom: m.y + q.h > p.h, left: 0 > m.x, right: m.x + q.w > p.w },
            s = (b) => c({ ...a, placement: b.join(" "), prevPlacement: i }); // horizontal fix for overflows
        if (r.left && "right" != j[0]) return s(["right", i[1]]);
        if (r.right && "left" != j[0]) return s(["left", i[1]]); // vertical fix for overflows
        if (r.bottom && "above" != j[1]) return s([i[0], "above"]);
        if (r.top && "below" != j[1]) return s([i[0], "below"]); // update target's position
        // auto-reposition on any ancestor scroll
        if (
            (d(() => {
                f.setAttribute("positioned", !0),
                    f.setAttribute("data-placement", i.join(" ")),
                    f.setAttribute(
                        "data-pos-overflow",
                        Object.entries(r)
                            .reduce((a, [b, c]) => (c ? `${a} ${b}` : a), "")
                            .trim()
                    ),
                    [
                        ["pos-left", r.right ? p.w - q.w : m.x],
                        ["pos-top", m.y], // pos.y > offset[1] ? pos.y : 0
                        ["pos-target-width", q.w],
                        ["pos-target-height", q.h],
                        ["pos-ref-width", n.width || 0],
                        ["pos-ref-height", n.height || 0],
                        ["pos-ref-left", n.x],
                        ["pos-ref-top", n.y],
                        ["window-scroll-y", window.scrollY],
                        ["window-scroll-x", window.scrollX],
                    ].forEach(([a, c]) => f.style.setProperty("--" + a, b(c)));
            }),
            k?.scroll && !f.position__trackedScroll)
        ) {
            (f.position__trackedScroll = !0),
                window.addEventListener(
                    "scroll",
                    function (b) {
                        b.target.contains(refElement) && c(a);
                    },
                    !0
                );
        }
        return { pos: m, placement: i };
    };
    let d = requestAnimationFrame || ((a) => setTimeout(a, 1e3 / 60));
    a.default = c;
});
