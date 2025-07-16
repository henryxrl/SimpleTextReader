/**
 * @fileoverview Cover Generator module for creating book covers
 *
 * This module provides functionality for:
 * - Generating dynamic book covers with titles and author names
 * - Smart text layout for both Western and East Asian text
 * - Automatic font size adjustment
 * - Responsive design with configurable dimensions
 * - Two-section layout with customizable colors
 * - Text positioning and line breaking optimization
 *
 * @module client/app/modules/components/cover-generator
 * @requires client/app/lib/clamps
 * @requires client/app/config/variables-dom
 * @requires shared/core/callback/callback-registry
 * @requires client/app/modules/text/text-processor
 * @requires client/app/utils/base
 */

import { getClamps } from "../../lib/clamps.js";
import { RUNTIME_VARS } from "../../config/variables-dom.js";
import { cbReg } from "../../../../shared/core/callback/callback-registry.js";
import { TextProcessor } from "../text/text-processor.js";
import { calculateRectangleSimilarity, getFontOffsets, debounce } from "../../utils/base.js";

/**
 * CoverGenerator class for creating dynamic book covers
 * @private
 * @class
 * @classdesc Handles the generation of book covers with customizable layouts and text positioning
 * Features:
 * - Singleton pattern ensures only one generator instance exists
 * - Two-section layout with separate colors
 * - Smart text sizing and positioning
 * - Different handling for Western and East Asian text
 * - Automatic line breaking and text distribution
 * - Font size optimization based on available space
 *
 * @property {Object} settings - Cover generation settings
 * @property {HTMLElement} container - DOM element to place the cover inside
 * @property {number} minTitleFontSize - Minimum font size for title (13)
 * @property {number} minAuthorFontSize - Minimum font size for author name (8)
 * @property {number} maxTitleFontSize - Maximum font size for title (100)
 * @property {number} maxAuthorFontSize - Maximum font size for author name (28)
 * @property {number} lineHeightMultiplier - Line height multiplier (1.5)
 * @property {number} titleFontSizeIncrement - Font size increment for title (4)
 * @property {number} authorFontSizeIncrement - Font size increment for author name (2)
 * @property {number} countLimit - Maximum attempts for font size adjustment (50)
 */
class CoverGenerator {
    static #instance = null;
    #id = 0;

    /**
     * Creates a new CoverGenerator instance if none exists
     * @constructor
     * @param {Object} baselineOffsets - The font baseline offsets object
     * @public
     * @throws {Error} When attempting to create multiple instances
     */
    constructor(baselineOffsets = {}) {
        if (CoverGenerator.#instance) {
            throw new Error("Use getCoverGenerator()");
        }

        // Font baseline offsets
        this.baselineOffsets = baselineOffsets;

        // Text layout constants
        this.bookLeft = 8; // Book left margin due to the book edge pattern on the left
        this.minMargin = 8; // Minimum margin between text and cover edge
        this.minTitleFontSize = 13; // Minimum title font size
        this.minAuthorFontSize = 8; // Minimum author font size
        this.maxTitleFontSize = 100; // Maximum title font size
        this.maxAuthorFontSize = 28; // Maximum author font size

        this.lineHeightMultiplier = 1.5; // Line height multiplier
        this.titleFontSizeIncrement = 4; // Title font size increment
        this.authorFontSizeIncrement = 2; // Author name font size increment
        this.countLimit = 50; // Maximum attempts for font size adjustment

        // Regular expressions
        this.regex = {
            fontValue: /(?<value>\d+\.?\d*)/, // Match font size value
            isPunctuation: TextProcessor.REGEX_IS_PUNCTUATION, // Punctuation matching
        };

        // Register truncate event for rendering long book cover text
        this.clamps = getClamps();
        cbReg.add(
            "truncateBookCoverText",
            debounce((delay = 0) => {
                if (this.clamps.supportsNativeClamp()) return;
                setTimeout(() => {
                    requestAnimationFrame(() => {
                        RUNTIME_VARS.ELEMENTS_TO_TRUNCATE.forEach((value, key) => {
                            if (!document.body.contains(key)) {
                                RUNTIME_VARS.ELEMENTS_TO_TRUNCATE.delete(key);
                            } else if (this.clamps) {
                                requestAnimationFrame(() => {
                                    // shave(key, value.maxHeight, { spaces: value.spaces });
                                    this.clamps.clamp(key);
                                });
                            }
                        });
                    });
                }, delay);
            }, 50)
        );

        // Initialize instance
        CoverGenerator.#instance = this;
    }

    /**
     * Gets the singleton instance of CoverGenerator
     * @static
     * @returns {CoverGenerator} The singleton instance
     * @public
     */
    static getInstance(baselineOffsets = {}) {
        if (!CoverGenerator.#instance) {
            CoverGenerator.#instance = new CoverGenerator(baselineOffsets);
        }
        return CoverGenerator.#instance;
    }

    /**
     * Updates the font baseline offsets for the cover generator
     * @param {Object} baselineOffsets - The font baseline offsets object
     * @public
     */
    updateFontBaselineOffsets(baselineOffsets) {
        this.baselineOffsets = baselineOffsets;
    }

    /**
     * Updates settings and context for new cover generation
     * @param {Object} settings - Cover settings
     * @param {number} settings.width - Cover width
     * @param {number} settings.height - Cover height
     * @param {number} settings.padding - Cover padding
     * @param {number} settings.bottomRectHeightRatio - Height ratio of bottom rectangle
     * @param {string} settings.coverColor1 - Top section background color
     * @param {string} settings.coverColor2 - Bottom section background color
     * @param {string} settings.textColor1 - Top section text color
     * @param {string} settings.textColor2 - Bottom section text color
     * @param {string} settings.font1 - Title font family
     * @param {string} settings.font2 - Author name font family
     * @param {string} settings.bookTitle - Book title text
     * @param {string} settings.authorName - Author name text
     * @param {HTMLElement} container - DOM element to place the cover inside
     * @public
     */
    updateSettings(settings, container) {
        this.settings = settings;
        this.container = container;
        this.#id++;

        // Calculate cover basic dimensions
        this.rect1Height = settings.height * (1 - settings.bottomRectHeightRatio); // Top rectangle height
        this.rect2Height = settings.height * settings.bottomRectHeightRatio; // Bottom rectangle height
        this.textWidth = settings.width - 2 * settings.padding; // Text area width
        this.textHeightRect1 = this.rect1Height - 2 * settings.padding; // Top text area height
        this.textHeightRect2 = this.rect2Height - 1 * settings.padding; // Bottom text area height

        // Initialize cover style
        this.coverStyle = this.#initCoverStyle();
    }

    /**
     * Generates the book cover by rendering all elements onto the canvas
     * @public
     * @param {Object} settings - Cover settings
     * @param {HTMLElement} container - DOM element to place the cover inside
     */
    generate(settings, container) {
        this.updateSettings(settings, container);

        this.container.innerHTML = "";

        if (!this.settings.authorName.trim()) {
            this.#handleEmptyAuthor();
        }

        this.#drawAll(this.coverStyle);
    }

    /**
     * Initializes cover style configuration
     * @private
     * @returns {Object} Cover style configuration object containing background and text settings
     * @property {Array} background - Background rectangles configuration
     * @property {Array} text - Text elements configuration
     */
    #initCoverStyle() {
        const { width, coverColor1, coverColor2, textColor1, textColor2, font1, font2, bookTitle, authorName } =
            this.settings;

        return {
            // Cover configuration
            emptyAuthor: !authorName.trim(),
            // Background configuration
            background: [
                {
                    rect: `0, 0, ${width}, ${width}`, // Top rectangle
                    // color: coverColor1,
                },
                {
                    rect: `0, ${this.rect1Height}, ${width}, ${this.rect2Height}`, // Bottom rectangle
                    // color: coverColor2,
                },
            ],
            // Text configuration
            text: [
                {
                    // color: textColor1,
                    font: `0px ${font1}`,
                    pos: `${this.bookLeft + (width - this.bookLeft) / 2}, ${this.rect1Height / 2}`,
                    text: bookTitle,
                },
                {
                    // color: textColor2,
                    font: `0px ${font2}`,
                    pos: `${this.bookLeft + (width - this.bookLeft) / 2}, ${this.rect1Height + this.rect2Height / 2}`,
                    text: authorName,
                },
            ],
        };
    }

    /**
     * Parses position string into coordinates
     * @private
     * @param {string} str - Position string in format "x, y"
     * @returns {{x: number, y: number}} Coordinate object
     */
    #parsePos(str) {
        const [x, y] = str.split(",").map((s) => parseInt(s.trim(), 10));
        return { x, y };
    }

    /**
     * Parses rectangle string into rectangle object
     * @private
     * @param {string} str - Rectangle string in format "x, y, width, height"
     * @returns {{x: number, y: number, w: number, h: number}} Rectangle object
     */
    #parseRect(str) {
        const [x, y, w, h] = str.split(",").map((s) => parseInt(s.trim(), 10));
        return { x, y, w, h };
    }

    /**
     * Draws background rectangle
     * @private
     * @param {Object} data - Background data
     * @param {string} data.rect - Rectangle dimensions in format "x, y, width, height"
     * @param {string} data.color - Background color
     * @param {number} index - Background index
     * @param {boolean} emptyAuthor - Whether the author name is empty
     */
    #drawBackground(data, index, emptyAuthor = false) {
        const rect = this.#parseRect(data.rect);
        const div = document.createElement("div");
        div.classList.add("cover-background");
        div.classList.add(index === 0 || emptyAuthor ? "top" : "bottom");
        div.id = `cover-background-${this.#id}-${index}`;
        Object.assign(div.style, {
            left: `${rect.x}px`,
            top: `${rect.y}px`,
            width: `${rect.w}px`,
            height: `${rect.h}px`,
        });
        this.container.appendChild(div);
    }

    /**
     * Draws text element with automatic size and position adjustment
     * @private
     * @param {Object} data - Text element configuration
     * @param {string} data.text - Text content to draw
     * @param {string} data.color - Text color in CSS format
     * @param {string} data.font - Font specification (e.g., "20px Arial")
     * @param {string} data.pos - Position in format "x, y"
     * @param {number} maxHeight - Maximum height allowed for text block
     * @param {boolean} isAuthor - Whether this text is author name (affects sizing and layout)
     * @throws {Error} When text data is invalid or missing required properties
     */
    #drawText(data, isAuthor = false) {
        if (!data.text.trim()) return;

        const div = document.createElement("div");
        div.classList.add("cover-text");
        div.classList.add(isAuthor ? "author" : "bookName");
        div.id = `cover-text-${this.#id}-${isAuthor ? 1 : 0}`;

        const smallMaxHeight = isAuthor ? this.textHeightRect2 : this.textHeightRect1;
        const largeMaxHeight = isAuthor ? this.rect2Height - 2 * this.minMargin : this.rect1Height - 2 * this.minMargin;

        const [lines, finalFontSize] = this.#getFontSize(
            data.text.trim(),
            data.font,
            this.textWidth,
            smallMaxHeight,
            isAuthor
        );
        const fontOffset = getFontOffsets(
            data.font.split(",")[0].split(" ")[1].trim(),
            finalFontSize,
            this.baselineOffsets
        );
        // console.log(lines, finalFontSize, data.font, fontOffset);

        const lineHeightPx = finalFontSize * this.lineHeightMultiplier;
        const isSingleLineText = this.#isSingleLineText(lines, finalFontSize, isAuthor);
        const pos = this.#parsePos(data.pos);

        // Use #drawWrappedText to wrap text to fit into the text area
        // let modifiedLines = lines;
        // if (isSingleLineText) {
        //     modifiedLines = this.#drawWrappedText(
        //         data.text,
        //         data.font,
        //         finalFontSize,
        //         data.font.replace(this.regex.fontValue, "0").trim(),
        //         isAuthor,
        //         this.textWidth,
        //         smallMaxHeight,
        //         lineHeightPx,
        //         true
        //     );
        // }

        Object.assign(div.style, {
            left: pos.x - fontOffset.horizontalOffset + fontOffset.fontSizeUnit,
            top: pos.y - fontOffset.verticalOffset + fontOffset.fontSizeUnit,
            // height: textHeight + "px",
            width: `${this.textWidth}px`,
            maxWidth: `${this.settings.width - 2 * this.minMargin}px`,
            maxHeight: `${isSingleLineText ? smallMaxHeight : largeMaxHeight}px`,
            fontSize: `${finalFontSize}px`,
            lineHeight: this.lineHeightMultiplier,
            display: "-webkit-box",
            "-webkit-line-clamp": `${isSingleLineText ? Math.floor(smallMaxHeight / lineHeightPx) : lines.length}`,
            "-webkit-box-orient": "vertical",
            overflow: "hidden",
        });
        div.innerHTML = lines.map(this.#escapeHTML).join("<br>");
        this.container.appendChild(div);

        // Truncate the text and add ellipsis if the browser doesn't support -webkit-line-clamp
        if (isSingleLineText && !this.clamps.supportsNativeClamp()) {
            RUNTIME_VARS.ELEMENTS_TO_TRUNCATE.set(div, {
                maxHeight: smallMaxHeight,
                spaces: false, // To be compatible with shave.js
                font: data.font.replace(this.regex.fontValue, "").replace("px", "").trim(),
                fontSize: finalFontSize,
            });
        }
    }

    /**
     * Wraps text to fit into a given maxWidth and maxHeight, line by line.
     * Supports truncation with ellipsis and reports overflow pixels if one more line is added.
     *
     * @param {string} text - The text to wrap.
     * @param {string} font - The full CSS font string (e.g. "normal 20px serif").
     * @param {number} fontSize - Font size in pixels.
     * @param {string} fontFamily - Font family.
     * @param {boolean} isAuthor - Whether the text is for author (affects layout).
     * @param {number} maxWidth - Maximum width allowed for each line.
     * @param {number} maxHeight - Maximum total height allowed.
     * @param {number} lineHeightPx - Line height in pixels.
     * @param {boolean} [useEllipsis=false] - Whether to append "…" on the last line when truncated.
     * @returns {{ lines: string[], overflowPx: number }} - Wrapped lines and overflow info.
     */
    #drawWrappedText(
        text,
        font,
        fontSize,
        fontFamily,
        isAuthor,
        maxWidth,
        maxHeight,
        lineHeightPx,
        useEllipsis = false
    ) {
        const words = text.split("");
        const lines = [];
        let currentLine = "";

        for (let i = 0; i < words.length; i++) {
            const testLine = currentLine + words[i];
            const width = this.#measureLineWidth(testLine, font, fontSize, fontFamily, isAuthor);
            if (width > maxWidth && currentLine !== "") {
                lines.push(currentLine);
                currentLine = words[i];
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) lines.push(currentLine);

        const maxLines = Math.floor(maxHeight / lineHeightPx);
        const wasTruncated = lines.length > maxLines;
        let visibleLines = lines.slice(0, maxLines);

        if (useEllipsis && wasTruncated && visibleLines.length > 0) {
            const lastLine = visibleLines[visibleLines.length - 1];
            let truncated = lastLine;
            while (truncated.length > 0) {
                const testLine = truncated + "…";
                const testWidth = this.#measureLineWidth(testLine, font, fontSize, fontFamily, isAuthor);
                if (testWidth < maxWidth) {
                    visibleLines[visibleLines.length - 1] = testLine;
                    break;
                }
                truncated = truncated.slice(0, -1); // Remove one char
            }
            // If even "…" alone doesn't fit, fallback to just ellipsis
            if (truncated.length === 0) visibleLines[visibleLines.length - 1] = "…";
        }

        return visibleLines;
    }

    /**
     * Checks if the text is a single line text
     * @private
     * @param {Array} lines - The lines of text
     * @param {number} fontSize - The font size
     * @param {boolean} isAuthor - Whether the text is an author name
     * @returns {boolean} True if the text is a single line text, false otherwise
     */
    #isSingleLineText(lines, fontSize, isAuthor) {
        return (
            (isAuthor && lines.length === 1 && fontSize === this.minAuthorFontSize) ||
            (!isAuthor && lines.length === 1 && fontSize === this.minTitleFontSize)
        );
    }

    /**
     * Calculates the optimal font size and line breaks for a given text
     * @private
     * @param {string} str - The input string to process
     * @param {string} font - The font specification (e.g., "20px Arial")
     * @param {number} maxWidth - The maximum width allowed for the text block
     * @param {number} maxHeight - The maximum height allowed for the text block
     * @param {boolean} [isAuthor=false] - Flag indicating if the text is an author name
     * @returns {Array} Array containing [lines array, optimal font size]
     */
    #getFontSize(str, font, maxWidth, maxHeight, isAuthor = false) {
        const isChinese = TextProcessor.getLanguage(str);

        // For non-Chinese text, split by spaces
        let words = isChinese ? str.split("") : str.split(" ").filter((word) => word.length > 0);

        // const defaultFontSize = isAuthor ? parseInt(maxHeight / 6) : parseInt(maxHeight / 10);
        // console.log(`${isAuthor ? "author" : "book"} size: ${defaultFontSize}`); // author: 8, book: 13
        const defaultFontSize = isAuthor ? this.minAuthorFontSize : this.minTitleFontSize;
        const fontSizeIncrement = isAuthor ? this.authorFontSizeIncrement : this.titleFontSizeIncrement;
        const maxFontSize = isAuthor ? this.maxAuthorFontSize : this.maxTitleFontSize;
        const referenceRect = { width: maxWidth, height: maxHeight };

        let bestLines = null;
        let bestFontSize = null;
        let bestScore = -1;
        let totalTrials = 0;

        // Calculate maximum possible lines (should not exceed word count for non-Chinese)
        const maxPossibleLines = Math.min(words.length, isAuthor ? 3 : 5);

        for (let targetLines = 1; targetLines <= maxPossibleLines && totalTrials < this.countLimit; targetLines++) {
            // console.log(`\n=== Trying ${targetLines} line(s) layout ===`);

            // Check if there are enough words to split into lines
            if (words.length < targetLines) {
                // console.log(`Skipping ${targetLines} lines as text is too short`);
                continue;
            }

            let fontSize = defaultFontSize;
            while (fontSize <= maxFontSize) {
                totalTrials++;
                this.container.style.fontFamily = font.replace(this.regex.fontValue, "0").trim();

                let lines = [];
                let lineWidth = 0;

                // Force Chinese titles with 3 characters to fit on one line
                if (targetLines === 1 || (!isAuthor && isChinese && str.length === 3)) {
                    // Use full text for single line
                    lines = [str.trim()];
                    const fontFamily = font.replace(this.regex.fontValue, "0").trim();
                    lineWidth = this.#measureLineWidth(lines[0], font, fontSize, fontFamily, isAuthor);
                } else {
                    // Distribute words evenly across lines
                    const wordsPerLine = Math.ceil(words.length / targetLines);
                    let validSplit = true;

                    for (let i = 0; i < targetLines && validSplit; i++) {
                        const start = i * wordsPerLine;
                        const end = Math.min(start + wordsPerLine, words.length);
                        const line = words
                            .slice(start, end)
                            .join(isChinese ? "" : " ")
                            .trim();

                        if (line.length === 0) {
                            // console.log(`Invalid line split detected for ${targetLines} lines, skipping this line count`);
                            validSplit = false;
                            break;
                        }

                        lines.push(line);
                        const fontFamily = font.replace(this.regex.fontValue, "0").trim();
                        lineWidth = Math.max(
                            lineWidth,
                            this.#measureLineWidth(line, font, fontSize, fontFamily, isAuthor)
                        );
                    }

                    if (!validSplit) {
                        break;
                    }
                }

                const textHeight = fontSize * (targetLines + (targetLines - 1) * (this.lineHeightMultiplier - 1));
                const refArea = referenceRect.width * referenceRect.height;
                const currentArea = lineWidth * textHeight;
                let score = calculateRectangleSimilarity(referenceRect, { width: lineWidth, height: textHeight });

                // console.log(
                //     `Text: ${str}, FontSize: ${fontSize}, Score: ${score.toFixed(3)}, Lines: ${targetLines}\n` +
                //     `Areas: Ref=${refArea.toFixed(0)} Current=${currentArea.toFixed(0)} (${(currentArea/refArea*100).toFixed(1)}%)\n` +
                //     `Dimensions: Width=${lineWidth.toFixed(1)}/${maxWidth} Height=${textHeight.toFixed(1)}/${maxHeight}`
                // );

                // Check if dimensions exceed boundaries
                if (lineWidth > maxWidth || textHeight > maxHeight) {
                    // console.log(`Overflow detected for ${targetLines} line(s), moving to next line count`);
                    break;
                }

                if (score > bestScore) {
                    bestScore = score;
                    bestLines = lines;
                    bestFontSize = fontSize;
                    // console.log(`New best score for "${str}": ${score.toFixed(3)} at fontSize ${fontSize} with ${targetLines} line(s)`);
                }

                fontSize += fontSizeIncrement;
            }
        }

        if (bestScore === -1) {
            // console.log(`Using initial result for "${str}" with fontSize ${defaultFontSize}`);
            return [[str], defaultFontSize];
        }

        // console.log(`Final result for "${str}": fontSize=${bestFontSize}, score=${bestScore.toFixed(3)}`);
        return [bestLines, bestFontSize];
    }

    /**
     * Uses a hidden DOM node to measure line width (and avoids reflow)
     * @private
     * @param {string} text - Text to measure
     * @param {string} font - Font specification (e.g., "20px Arial")
     * @param {number} fontSize - Font size
     * @param {number} maxWidth - Maximum width allowed for the text block
     * @returns {number} Line width
     */
    #measureLineWidth(text, font, fontSize, fontFamily, isAuthor) {
        if (!this._measureDiv) {
            this._measureDiv = document.createElement("div");
            Object.assign(this._measureDiv.style, {
                position: "absolute",
                left: "-9999px",
                top: "-9999px",
                visibility: "hidden",
                whiteSpace: "pre", // important: prevent wrapping
                pointerEvents: "none",
            });
            document.body.appendChild(this._measureDiv);
        }
        this._measureDiv.className = isAuthor ? "cover-text author" : "cover-text bookName";
        this._measureDiv.style.fontSize = `${fontSize}px`;
        this._measureDiv.style.fontFamily = fontFamily;
        // Optional: handle bold/italic
        // this._measureDiv.style.fontWeight = ...
        this._measureDiv.textContent = text;
        return this._measureDiv.scrollWidth;
    }

    /**
     * Handles the layout adjustment when the author name is empty
     * @private
     */
    #handleEmptyAuthor() {
        this.rect1Height += this.rect2Height;
        this.textHeightRect1 = this.rect1Height - 2 * this.settings.padding;
        this.coverStyle.text[0].pos = `${this.bookLeft + (this.settings.width - this.bookLeft) / 2}, ${
            this.rect1Height / 2
        }`;
    }

    /**
     * Draws all cover elements including background and text
     * @private
     * @param {Object} data - Cover element data
     * @param {Array} data.background - Array of background elements to draw
     * @param {Array} data.text - Array of text elements to draw
     */
    #drawAll(data) {
        (data.background || []).forEach((bg, index) => this.#drawBackground(bg, index, data.emptyAuthor));
        const text = data.text || [];
        this.#drawText(text[0], false); // book title
        this.#drawText(text[1], true); // author name
    }

    /**
     * Escape HTML for display
     * @private
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    #escapeHTML(text) {
        return text.replace(
            /[&<>"']/g,
            (s) =>
                ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#39;",
                }[s])
        );
    }
}

/**
 * Gets or creates the CoverGenerator instance
 * @returns {CoverGenerator} Singleton CoverGenerator instance
 * @public
 */
export function getCoverGenerator(baselineOffsets = {}) {
    return CoverGenerator.getInstance(baselineOffsets);
}
