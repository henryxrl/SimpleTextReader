/**
 * @fileoverview
 * Font Baseline Offset Visual Measurement Tool
 *
 * This script measures visual baseline and alignment offsets for a collection of fonts
 * by rendering them in a browser using Puppeteer, taking screenshots, and scanning pixels.
 *
 * It compares each font to a reference font (e.g., "kinghwa") and outputs a JSON
 * mapping each font to its normalized vertical and horizontal offset (relative to font size).
 *
 * Supported features:
 * - Headless or interactive browser
 * - Font preloading with timeout or manual skip
 * - Screenshot and scan for top/bottom/left/right/center alignment
 * - Debug mode with visual overlays and PNG export
 * - Unicode subset font support (e.g. split Chinese fonts)
 *
 * Output:
 *   /client/fonts/font_baseline_offsets.json
 *
 * Usage:
 *   node dev/measure_font_baselines.js
 */

import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import serveStatic from "serve-static";
import finalhandler from "finalhandler";
import http from "http";
import { fileURLToPath } from "url";
import { createCanvas, loadImage } from "canvas";

/** ====================== CONFIGURATION ====================== **/

const DEBUG = false; // Set true for screenshots and devtools.
const FONT_SIZE = 100; // px
const TEXT = "易笺"; // Text sample for measurement.
const FONT_LOAD_TIMER = 60000; // ms
const HTML_DIV_WIDTH = 400; // px
const HTML_DIV_HEIGHT = 400; // px
const HTML_WIDTH = 540; // px: extra horizontal space for overflows.
const HTML_HEIGHT = 960; // px: extra vertical space for overflows.
const X_BASELINE = 50; // px: where to align left of text.
const Y_BASELINE = 50; // px: where to align top of text.
const BG_COLOR = "#a6c6e2";
const OUTPUT_FILE = "fonts/font_baseline_offsets.json";
const REFERENCE_FONT = "kinghwa"; // Reference font (should be included in the css files)
const SCAN_VERTICAL_DIRECTION = "vertical"; // "vertical" or "bottom-up" or "top-down"
const SCAN_HORIZONTAL_DIRECTION = "horizontal"; // "horizontal" or "left-right" or "right-left"

/** ====================== BROWSER-RELATED VARIABLES ====================== **/

let browser = null;
let page = null;

/** ====================== PATH RESOLUTION ====================== **/

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../client");
const fontsDir = path.join(rootDir, "fonts");

/** ====================== FONT COLLECTION ====================== **/

/**
 * Get all split font CSS files.
 * Only considers files named local-*.css or remote-*.css.
 */
const cssFiles = fs
    .readdirSync(fontsDir)
    .filter((f) => f.endsWith(".css") && (f.startsWith("local-") || f.startsWith("remote-")))
    .map((f) => `/fonts/${f}`);

/**
 * Font family list for measurement.
 */
const allFonts = ["fzskbxk", ...cssFiles.map((f) => f.replace(/^\/fonts\/(local-|remote-)/, "").replace(/\.css$/, ""))];

/** ====================== UTILITY FUNCTIONS ====================== **/

/**
 * Merges multiple measurement objects (e.g. vertical + horizontal)
 * and keeps only non-null values from each.
 *
 * @param  {...object} objects - Objects to merge
 * @returns {object} Merged object with non-null values
 */
function mergeNonNullValues(...objects) {
    const result = {};
    for (const obj of objects) {
        for (const key in obj) {
            if (obj[key] != null) {
                result[key] = obj[key];
            } else if (!(key in result)) {
                result[key] = null;
            }
        }
    }
    return result;
}

/** ====================== BROWSER-RELATED FUNCTIONS ====================== **/

/**
 * Waits for font loading, or allows user to press any key to skip waiting.
 * Useful for preloading fonts that load asynchronously (e.g. Unicode subsets).
 *
 * @param {number} timeout - Maximum time to wait (ms)
 * @returns {Promise<void>}
 */
async function waitForFontLoadOrKeypress(timeout = FONT_LOAD_TIMER) {
    return new Promise((resolve) => {
        if (!process.stdin.isTTY) {
            console.log("非交互终端，跳过按键检测，等待超时...");
            setTimeout(resolve, timeout);
            return;
        }

        console.log(`等待 ${timeout / 1000} 秒以确保字体加载完毕，或按任意键跳过...`);

        const onKeypress = () => {
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdin.removeListener("data", onKeypress);
            console.log("已检测到按键，跳过剩余等待！");
            resolve();
        };

        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on("data", onKeypress);

        setTimeout(() => {
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdin.removeListener("data", onKeypress);
            console.log("已到达最大等待时间，继续...");
            resolve();
        }, timeout);
    });
}

/**
 * Preloads all fonts with the test text into a visible <table> so that
 * their Unicode subsets are loaded into memory before actual measurement.
 *
 * @returns {Promise<void>}
 */
async function preloadFontSubsets() {
    console.log("正在预加载所有字体的 Unicode 子集...");
    await page.evaluate(
        ({ allFonts, TEXT }) => {
            const table = document.createElement("table");
            table.style.position = "absolute";
            table.style.opacity = "1";
            table.style.fontSize = "25px";
            table.style.borderCollapse = "collapse";

            allFonts.forEach((font) => {
                const tr = document.createElement("tr");

                const tdName = document.createElement("td");
                tdName.textContent = font;
                tdName.style.padding = "4px 8px";
                tdName.style.border = "1px solid #ccc";
                tdName.style.fontFamily = "sans-serif";

                const tdSample = document.createElement("td");
                tdSample.textContent = TEXT;
                tdSample.style.fontFamily = `"${font}"`;
                tdSample.style.padding = "4px 8px";
                tdSample.style.border = "1px solid #ccc";

                tr.appendChild(tdName);
                tr.appendChild(tdSample);
                table.appendChild(tr);
            });

            document.body.appendChild(table);
        },
        { allFonts, TEXT }
    );

    await waitForFontLoadOrKeypress();
    console.log("预加载完成！");
}

/**
 * Renders a test string using the given font into a DOM element and optionally
 * takes a screenshot for pixel scanning.
 *
 * @param {string} font - Font family name
 * @param {boolean} isHorizontalScan - Whether to render text horizontally (true) or vertically (false)
 * @param {boolean} isRef - Whether this is the reference font (affects file naming and debug)
 * @param {boolean} waitForFontLoad - Whether to delay rendering to wait for font
 * @param {boolean} takeScreenshot - Whether to return screenshot buffer
 * @returns {Promise<Buffer|null>} Screenshot PNG buffer or null
 */
async function renderAndScreenshot(
    font,
    isHorizontalScan = true,
    isRef = false,
    waitForFontLoad = false,
    takeScreenshot = true
) {
    // Clean the body each time to avoid artifacts
    await page.evaluate(() => (document.body.innerHTML = ""));
    // Insert a new test div for the font
    await page.evaluate(
        ({
            font,
            FONT_SIZE,
            TEXT,
            BG_COLOR,
            HTML_DIV_WIDTH,
            HTML_DIV_HEIGHT,
            X_BASELINE,
            Y_BASELINE,
            isHorizontalScan,
        }) => {
            const div = document.createElement("div");
            div.className = "font-test";
            div.style.background = BG_COLOR;
            div.style.width = HTML_DIV_WIDTH + "px";
            div.style.height = HTML_DIV_HEIGHT + "px";
            div.style.position = "relative";
            const p = document.createElement("span");
            p.className = "test-text";
            p.style.fontFamily = `"${font}"`;
            p.style.fontSize = FONT_SIZE + "px";
            p.style.top = Y_BASELINE + "px";
            p.style.left = X_BASELINE + "px";
            if (isHorizontalScan) {
                p.textContent = TEXT;
            } else {
                p.innerHTML = TEXT.split("").join("<br>");
            }
            div.appendChild(p);
            document.body.appendChild(div);
        },
        {
            font,
            FONT_SIZE,
            TEXT,
            BG_COLOR,
            HTML_DIV_WIDTH,
            HTML_DIV_HEIGHT,
            X_BASELINE,
            Y_BASELINE,
            isHorizontalScan,
        }
    );
    // Wait for font to fully load and render
    if (waitForFontLoad) {
        console.log(`等待 ${font} 加载...`);
        await new Promise((resolve) => setTimeout(resolve, FONT_LOAD_TIMER));
    }
    // Screenshot only the relevant div (not full page)
    const el = await page.$(".font-test");
    const image = takeScreenshot ? await el.screenshot({ encoding: "binary" }) : null;
    if (DEBUG && takeScreenshot) {
        fs.writeFileSync(
            path.join(rootDir, `test${isRef ? "-ref" : ""}-${font}-${isHorizontalScan ? "tb" : "lr"}.png`),
            image
        );
    }
    return image;
}

/** ====================== IMAGE ANALYSIS FUNCTIONS ====================== **/

/**
 * Scans image data from a screenshot to find the visual edge of text pixels
 * in a given direction. Supports four directions:
 * - "top-down"
 * - "bottom-up"
 * - "left-right"
 * - "right-left"
 *
 * Optionally draws a debug line on the image canvas.
 *
 * @param {Uint8ClampedArray} imageData - Image pixel data
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {"top-down"|"bottom-up"|"left-right"|"right-left"} direction - Scan direction
 * @param {object} options
 * @param {CanvasRenderingContext2D} [options.ctx] - Optional canvas context for drawing debug line
 * @param {boolean} [options.toSave] - Whether to save PNG file after drawing line
 * @param {string} [options.font] - Font name (for debug output)
 * @param {string} [options.dir] - Direction label (used in filename)
 * @param {boolean} [options.isRef] - Whether this is a reference font
 * @returns {number} The row or column index of the first text pixel
 */
function scanImageForTextPixel(
    imageData,
    width,
    height,
    direction = "bottom-up",
    { ctx = null, toSave = true, font = "", dir = "bottom-up", isRef = false } = {}
) {
    const threshold = 8;
    const bgRgb =
        /^#/.test(BG_COLOR) && BG_COLOR.length === 7
            ? [
                  parseInt(BG_COLOR.slice(1, 3), 16),
                  parseInt(BG_COLOR.slice(3, 5), 16),
                  parseInt(BG_COLOR.slice(5, 7), 16),
              ]
            : [0, 0, 0];

    function drawDebugLine(pos, lineColor = "red") {
        if (!ctx) return;
        ctx.beginPath();
        if (direction.includes("top") || direction.includes("bottom")) {
            ctx.moveTo(0, pos);
            ctx.lineTo(ctx.canvas.width, pos);
        } else {
            ctx.moveTo(pos, 0);
            ctx.lineTo(pos, ctx.canvas.height);
        }
        ctx.strokeStyle = lineColor;
        ctx.stroke();
        if (toSave) {
            fs.writeFileSync(
                path.join(rootDir, `test${isRef ? "-ref" : ""}-${font}-${dir}-result.png`),
                ctx.canvas.toBuffer("image/png")
            );
        }
    }

    const outer =
        direction === "bottom-up" || direction === "right-left"
            ? { start: direction === "bottom-up" ? height - 1 : width - 1, end: -1, step: -1 }
            : { start: 0, end: direction === "top-down" ? height : width, step: 1 };

    const isVertical = direction === "top-down" || direction === "bottom-up";

    for (let i = outer.start; i !== outer.end; i += outer.step) {
        for (let j = 0; j < (isVertical ? width : height); j++) {
            const row = isVertical ? i : j;
            const col = isVertical ? j : i;
            const idx = (row * width + col) * 4;
            const [r, g, b, a] = [imageData[idx], imageData[idx + 1], imageData[idx + 2], imageData[idx + 3]];
            if (
                a > 0 &&
                (Math.abs(r - bgRgb[0]) > threshold ||
                    Math.abs(g - bgRgb[1]) > threshold ||
                    Math.abs(b - bgRgb[2]) > threshold)
            ) {
                if (DEBUG) {
                    console.log(`Found text pixel at ${isVertical ? "row" : "col"}: ${i}`);
                    drawDebugLine(i, isVertical ? "red" : "blue");
                }
                return i;
            }
        }
    }

    return isVertical ? height - 1 : width - 1;
}

/**
 * Measures the visual offsets of a font by scanning a screenshot
 * for its top/bottom/left/right pixel edges. Can measure in:
 * - "vertical" (top-down + bottom-up average)
 * - "horizontal" (left-right + right-left average)
 * - or a specific direction
 *
 * Returns an object mapping each direction to its measured value.
 *
 * @param {string} font - Font name
 * @param {Buffer} pngBuffer - Screenshot buffer (PNG)
 * @param {"vertical"|"horizontal"|"top-down"|"bottom-up"|"left-right"|"right-left"} direction - Scan mode
 * @param {boolean} isRef - Whether this is the reference font
 * @returns {Promise<object>} An object with keys: top-down, bottom-up, vertical, left-right, right-left, horizontal
 */
async function measureVisualOffsets(font, pngBuffer, direction, isRef = false) {
    const img = await loadImage(pngBuffer);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height).data;

    const result = {
        "top-down": null,
        "bottom-up": null,
        vertical: null,
        "left-right": null,
        "right-left": null,
        horizontal: null,
    };

    const needVertical = direction === "vertical" || direction === "top-down" || direction === "bottom-up";
    const needHorizontal = direction === "horizontal" || direction === "left-right" || direction === "right-left";

    if (needVertical) {
        if (direction !== "top-down" && direction !== "vertical") {
            result["bottom-up"] = scanImageForTextPixel(imageData, width, height, "bottom-up", {
                font,
                ctx,
                dir: direction,
                isRef,
            });
        }
        if (direction !== "bottom-up" && direction !== "vertical") {
            result["top-down"] = scanImageForTextPixel(imageData, width, height, "top-down", {
                font,
                ctx,
                dir: direction,
                isRef,
            });
        }
        if (direction === "vertical") {
            result["bottom-up"] = scanImageForTextPixel(imageData, width, height, "bottom-up", {
                font,
                ctx,
                dir: direction,
                toSave: false,
                isRef,
            });
            result["top-down"] = scanImageForTextPixel(imageData, width, height, "top-down", {
                font,
                ctx,
                dir: direction,
                isRef,
            });
        }

        const top = result["top-down"];
        const bottom = result["bottom-up"];
        if (top != null && bottom != null) {
            result["vertical"] = (top + bottom) / 2;
        } else {
            result["vertical"] = top ?? bottom;
        }
    }

    if (needHorizontal) {
        if (direction !== "left-right" && direction !== "horizontal") {
            result["right-left"] = scanImageForTextPixel(imageData, width, height, "right-left", {
                font,
                ctx,
                dir: direction,
                isRef,
            });
        }
        if (direction !== "right-left" && direction !== "horizontal") {
            result["left-right"] = scanImageForTextPixel(imageData, width, height, "left-right", {
                font,
                ctx,
                dir: direction,
                isRef,
            });
        }
        if (direction === "horizontal") {
            result["right-left"] = scanImageForTextPixel(imageData, width, height, "right-left", {
                font,
                ctx,
                dir: direction,
                toSave: false,
                isRef,
            });
            result["left-right"] = scanImageForTextPixel(imageData, width, height, "left-right", {
                font,
                ctx,
                dir: direction,
                isRef,
            });
        }

        const left = result["left-right"];
        const right = result["right-left"];
        if (left != null && right != null) {
            result["horizontal"] = (left + right) / 2;
        } else {
            result["horizontal"] = left ?? right;
        }
    }

    return result;
}

/** ====================== MAIN ENTRY ====================== **/

/**
 * Set up a static server at a random port.
 */
const PORT = 34123 + Math.floor(Math.random() * 1000);
const serve = serveStatic(rootDir, { index: false });
const server = http.createServer((req, res) => serve(req, res, finalhandler(req, res)));
server.listen(PORT, async () => {
    await main(PORT);
});

/**
 * Main script logic:
 * - Launch Puppeteer
 * - Preload all font subsets
 * - Render & screenshot a reference font to get baseline
 * - Measure all other fonts
 * - Output normalized offsets to JSON
 * - Cleanup
 */
async function main() {
    console.log(`静态服务器已启动: http://127.0.0.1:${PORT}`);

    // ---------- Generate test HTML ----------
    const testHtml = `
<html>
  <head>
    <style>
      html, body { margin:0; padding:0; background: ${BG_COLOR}; }
      .font-test {
        width: ${HTML_DIV_WIDTH}px;
        height: ${HTML_DIV_HEIGHT}px;
        background: ${BG_COLOR};
        position: relative;
      }
      .test-text {
        position: absolute;
        top: ${Y_BASELINE}px;
        left: ${X_BASELINE}px;
        font-size: ${FONT_SIZE}px;
        line-height: 1;
        margin: 0;
        padding: 0;
      }
    </style>
    <link rel="stylesheet" href="/css/variables.css" />
    <link rel="stylesheet" href="/css/main.css" />
    ${cssFiles.map((f) => `<link rel="stylesheet" href="${f}" />`).join("\n")}
  </head>
  <body></body>
</html>
    `;
    fs.writeFileSync(path.join(rootDir, "font-test.html"), testHtml, "utf-8");

    // ---------- Puppeteer Launch ----------
    browser = await puppeteer.launch({
        headless: false,
        devtools: DEBUG,
        defaultViewport: {
            width: HTML_WIDTH,
            height: HTML_HEIGHT,
        },
    });
    page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/font-test.html`);

    // ---------- Preload all fonts ----------
    console.log("正在渲染所有字体...");
    await preloadFontSubsets();
    console.log("所有字体渲染完成！\n");

    // ---------- Measure reference font's offsets ----------
    console.log("正在测量参考字体...");
    const refPngVertical = await renderAndScreenshot(REFERENCE_FONT, true, true);
    const refOffsetVertical = await measureVisualOffsets(REFERENCE_FONT, refPngVertical, SCAN_VERTICAL_DIRECTION, true);
    const refPngHorizontal = await renderAndScreenshot(REFERENCE_FONT, false, true);
    const refOffsetHorizontal = await measureVisualOffsets(
        REFERENCE_FONT,
        refPngHorizontal,
        SCAN_HORIZONTAL_DIRECTION,
        true
    );
    const refOffset = mergeNonNullValues(refOffsetVertical, refOffsetHorizontal);
    console.log(`参考字体: ${REFERENCE_FONT}; 偏移量: ${JSON.stringify(refOffset, null, 2)}`);
    console.log("参考字体测量完成！\n");

    // ---------- Measure each font's offset relative to reference ----------
    const offsets = {};
    console.log("正在测量垂直偏移量...");
    for (let font of allFonts) {
        const png = await renderAndScreenshot(font);
        const offsetVertical = await measureVisualOffsets(font, png, SCAN_VERTICAL_DIRECTION);
        const offsetVerticalPx = offsetVertical.vertical - refOffset.vertical;
        const normalizedOffsetVertical = offsetVerticalPx / FONT_SIZE;
        if (!offsets[font]) offsets[font] = {};
        offsets[font]["vertical"] = normalizedOffsetVertical;
        console.log(
            `${font} [垂直]: 偏移量: ${JSON.stringify(offsetVertical, null, 2)};
相对偏移量(px): ${offsetVertical.vertical} - ${refOffset.vertical} = ${offsetVerticalPx};
归一化: ${normalizedOffsetVertical};\n`
        );
    }
    console.log("垂直偏移量测量完成！\n");

    console.log("正在测量水平偏移量...");
    for (let font of allFonts) {
        const png = await renderAndScreenshot(font, false);
        const offsetHorizontal = await measureVisualOffsets(font, png, SCAN_HORIZONTAL_DIRECTION);
        const offsetHorizontalPx = offsetHorizontal.horizontal - refOffset.horizontal;
        const normalizedOffsetHorizontal = offsetHorizontalPx / FONT_SIZE;
        if (!offsets[font]) offsets[font] = {};
        offsets[font]["horizontal"] = normalizedOffsetHorizontal;
        console.log(
            `${font} [水平]: 偏移量: ${JSON.stringify(offsetHorizontal, null, 2)};
相对偏移量(px): ${offsetHorizontal.horizontal} - ${refOffset.horizontal} = ${offsetHorizontalPx};
归一化: ${normalizedOffsetHorizontal};\n`
        );
    }
    console.log("水平偏移量测量完成！\n");

    // ---------- Write output JSON ----------
    fs.writeFileSync(path.join(rootDir, OUTPUT_FILE), JSON.stringify(offsets, null, 0), "utf-8");
    console.log(`结果已保存到 ${OUTPUT_FILE}`);

    // ---------- Cleanup ----------
    await browser.close();
    server.close();
    fs.unlinkSync(path.join(rootDir, "font-test.html"));
    console.log("静态服务器已关闭，临时页面已删除");
    process.exit(0);
}
