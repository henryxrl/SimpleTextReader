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
 * @module modules/ui/cover-generator
 * @requires modules/text/text-processor
 * @requires utils/base
 */

import { TextProcessor } from "../text/text-processor.js";
import { calculateRectangleSimilarity } from "../../utils/base.js";

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
 * @property {CanvasRenderingContext2D} ctx - Canvas rendering context
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

    /**
     * Creates a new CoverGenerator instance if none exists
     * @constructor
     * @public
     * @throws {Error} When attempting to create multiple instances
     */
    constructor() {
        if (CoverGenerator.#instance) {
            throw new Error("Use getCoverGenerator()");
        }

        // Text layout constants
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

        CoverGenerator.#instance = this;
    }

    /**
     * Gets the singleton instance of CoverGenerator
     * @static
     * @returns {CoverGenerator} The singleton instance
     * @public
     */
    static getInstance() {
        if (!CoverGenerator.#instance) {
            CoverGenerator.#instance = new CoverGenerator();
        }
        return CoverGenerator.#instance;
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
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
     */
    updateSettings(settings, ctx) {
        this.settings = settings;
        this.ctx = ctx;

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
     */
    generate(settings, ctx) {
        this.updateSettings(settings, ctx);

        this.ctx.clearRect(0, 0, this.settings.width, this.settings.height);

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
            // Background configuration
            background: [
                {
                    rect: `0, 0, ${width}, ${width}`, // Top rectangle
                    color: coverColor1,
                },
                {
                    rect: `0, ${this.rect1Height}, ${width}, ${this.rect2Height}`, // Bottom rectangle
                    color: coverColor2,
                },
            ],
            // Text configuration
            text: [
                {
                    color: textColor1,
                    font: `0px ${font1}`,
                    pos: `${width / 2}, ${this.rect1Height / 2 + 5}`,
                    text: bookTitle,
                },
                {
                    color: textColor2,
                    font: `0px ${font2}`,
                    pos: `${width / 2}, ${this.rect1Height + this.rect2Height / 2}`,
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
     */
    #drawBackground(data) {
        const rect = this.#parseRect(data.rect);
        this.ctx.fillStyle = data.color;
        this.ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }

    /**
     * Splits author name text into multiple lines with optimal distribution
     * @private
     * @param {string} str - Author name text to split
     * @param {number} maxWidth - Maximum width allowed for each line
     * @returns {Array} Array containing [lines array, maximum line width]
     */
    #splitAuthorText(str, maxWidth) {
        const totalWidth = this.ctx.measureText(str).width;

        // Return directly if text fits in one line
        if (totalWidth <= maxWidth) {
            return [[str], totalWidth];
        }

        // For western text, split by spaces
        if (!TextProcessor.getLanguage(str) && str.includes(" ")) {
            const words = str.split(" ");
            const lines = ["", "", ""];
            let currentLine = 0;

            words.forEach((word) => {
                const testLine = lines[currentLine] + (lines[currentLine] ? " " : "") + word;
                const testWidth = this.ctx.measureText(testLine).width;

                if (testWidth <= maxWidth || currentLine === 2) {
                    lines[currentLine] = testLine;
                } else if (currentLine < 2) {
                    currentLine++;
                    lines[currentLine] = word;
                }
            });

            // Force split into multiple lines if only first line has content
            if (!lines[1] && lines[0]) {
                const words = lines[0].split(" ");
                const lineCount = Math.min(3, words.length);
                const wordsPerLine = Math.ceil(words.length / lineCount);

                for (let i = 0; i < lineCount; i++) {
                    const start = i * wordsPerLine;
                    const end = Math.min(start + wordsPerLine, words.length);
                    lines[i] = words.slice(start, end).join(" ");
                }
            }

            const maxLineWidth = Math.max(...lines.map((line) => this.ctx.measureText(line).width));

            // Remove empty lines
            return [lines.filter((line) => line), maxLineWidth];
        }

        // For East Asian text, distribute characters evenly
        const charCount = str.length;
        const lineCount = Math.min(3, Math.ceil(charCount / 4));
        const charsPerLine = Math.ceil(charCount / lineCount);
        const lines = [];

        for (let i = 0; i < lineCount; i++) {
            const start = i * charsPerLine;
            const end = Math.min(start + charsPerLine, charCount);
            lines.push(str.slice(start, end));
        }

        const maxLineWidth = Math.max(...lines.map((line) => this.ctx.measureText(line).width));

        return [lines, maxLineWidth];
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
    #drawText(data, textHeight, isAuthor = false) {
        if (!data.text.trim()) return;

        const [lines, finalFontSize] = this.#getFontSize(
            data.text.trim(),
            data.font,
            this.textWidth,
            textHeight,
            isAuthor
        );

        const pos = this.#parsePos(data.pos);

        Object.assign(this.ctx, {
            fillStyle: data.color,
            font: data.font.replace(this.regex.fontValue, finalFontSize),
            textAlign: "center",
            textBaseline: "middle",
        });

        this.#printLines(lines, pos.x, pos.y, finalFontSize * this.lineHeightMultiplier);
    }

    /**
     * Prints an array of text lines with vertical centering
     * @private
     * @param {string[]} lines - Array of text lines to print
     * @param {number} x - X coordinate for text alignment
     * @param {number} y - Y coordinate for vertical centering
     * @param {number} lineHeight - Height between lines
     */
    #printLines(lines, x, y, lineHeight) {
        const centerY = y - (lineHeight * (lines.length - 1)) / 2;
        lines.forEach((line, i) => {
            this.ctx.fillText(line, x, centerY + lineHeight * i);
        });
    }

    /**
     * Splits East Asian text into evenly distributed lines
     * @private
     * @param {string} str - Input text to split
     * @param {number} maxWidth - Maximum width allowed for each line
     * @returns {Array} Array containing [lines array, maximum line width]
     */
    #splitEastAsianText(str, maxWidth) {
        const totalWidth = this.ctx.measureText(str).width;
        const charCount = str.length;

        // Return if text fits in one line
        if (totalWidth <= maxWidth) {
            return [[str], totalWidth];
        }

        // Calculate ideal number of lines
        // 1. First calculate maximum possible lines based on character count
        let maxPossibleLines;
        if (charCount <= 4) {
            maxPossibleLines = 2;
        } else if (charCount <= 8) {
            maxPossibleLines = 3;
        } else if (charCount <= 15) {
            maxPossibleLines = 4;
        } else {
            maxPossibleLines = Math.min(5, Math.ceil(charCount / 4));
        }

        // 2. Ensure each line has at least as many characters as the number of lines
        let idealLines = maxPossibleLines;
        while (idealLines > 1) {
            const charsPerLine = Math.floor(charCount / idealLines);
            if (charsPerLine >= idealLines) {
                break;
            }
            idealLines--;
        }

        // Calculate characters per line
        const charsPerLine = Math.ceil(charCount / idealLines);

        // Distribute characters to lines
        const lines = [];
        let remainingChars = str.split("");
        let maxLineWidth = 0;

        while (remainingChars.length > 0) {
            // Special handling for last line
            const isLastLine = remainingChars.length <= charsPerLine;
            const currentLineChars = isLastLine ? remainingChars : remainingChars.splice(0, charsPerLine);

            const line = currentLineChars.join("");
            const lineWidth = this.ctx.measureText(line).width;

            maxLineWidth = Math.max(maxLineWidth, lineWidth);
            lines.push(line);

            if (isLastLine) {
                break;
            }
        }

        // Optimize last line
        if (lines.length > 1) {
            const lastLine = lines[lines.length - 1];
            if (lastLine.length < lines[0].length / 2) {
                lines.pop();
                const chars = lastLine.split("");
                let lineIndex = 0;
                while (chars.length > 0) {
                    lines[lineIndex] += chars.shift();
                    lineIndex = (lineIndex + 1) % lines.length;
                }
            }
        }

        // Recalculate maximum line width
        maxLineWidth = Math.max(...lines.map((line) => this.ctx.measureText(line).width));

        return [lines, maxLineWidth];
    }

    /**
     * Fits a string into lines that do not exceed the maximum width
     * @private
     * @param {string} str - The input string to fit
     * @param {number} maxWidth - The maximum width allowed for each line
     * @param {boolean} [isAuthor=false] - Flag indicating if the string is an author name
     * @returns {Array} Array containing [lines array, maximum line width]
     */
    #fittingString(str, maxWidth, isAuthor = false) {
        // Handle empty string
        if (!str.trim()) {
            return [[""], 0];
        }

        // Check if it's an author name
        if (isAuthor) {
            return this.#splitAuthorText(str, maxWidth);
        }

        // Handle East Asian text
        if (TextProcessor.getLanguage(str)) {
            str = str.replace(/ /g, "");
            return this.#splitEastAsianText(str, maxWidth);
        }

        // Western text handling logic
        const width = this.ctx.measureText(str).width;
        if (width <= maxWidth) {
            return [[str], width];
        }

        if (str.includes(" ")) {
            return this.#handleMultipleWords(str.split(" "), maxWidth, [], []);
        }

        return this.#handleSingleWord(str, maxWidth, [], []);
    }

    /**
     * Handles the splitting of a single long word into multiple lines
     * @private
     * @param {string} str - The input string to split
     * @param {number} maxWidth - The maximum width allowed for each line
     * @param {string[]} strs - Array to store the resulting lines
     * @param {number[]} savedWidths - Array to store the widths of the resulting lines
     * @returns {Array} Array containing [lines array, maximum line width]
     */
    #handleSingleWord(str, maxWidth, strs, savedWidths) {
        const numCharLowerBound = 3;
        let idx = 0;

        if (str.length > numCharLowerBound) {
            for (let i = 1; i <= str.length; i++) {
                let s = str.substring(idx, i).trim();

                // Handle numbers
                while (!isNaN(s.slice(-1))) {
                    i++;
                    if (i > str.length) {
                        i = str.length;
                        s = str.substring(idx, i).trim();
                        break;
                    }
                    s = str.substring(idx, i).trim();
                }

                // Handle punctuation
                if (this.regex.isPunctuation.test(str.substring(i, i + 1).trim())) {
                    i += 2;
                    if (i > str.length) i = str.length;
                    s = str.substring(idx, i).trim();
                }

                const w = this.ctx.measureText(s).width;
                if (w >= maxWidth) {
                    i = Math.max(1, i - 1);
                    strs.push(str.substring(idx, i).trim());
                    savedWidths.push(this.ctx.measureText(str.substring(idx, i).trim()).width);
                    idx = i;
                }
            }
        }

        if (idx < str.length) {
            strs.push(str.substring(idx));
            savedWidths.push(this.ctx.measureText(str.substring(idx)).width);
        }

        return [strs, Math.max(...savedWidths)];
    }

    /**
     * Handles the splitting of multiple words into lines that fit within the maximum width
     * @private
     * @param {string[]} texts - Array of words to process
     * @param {number} maxWidth - The maximum width allowed for each line
     * @param {string[]} strs - Array to store the resulting lines
     * @param {number[]} savedWidths - Array to store the widths of the resulting lines
     * @returns {Array} Array containing [lines array, maximum line width]
     */
    #handleMultipleWords(texts, maxWidth, strs, savedWidths) {
        // Handle long words
        for (let i = 0; i < texts.length; i++) {
            if (texts[i].length > 20) {
                const splitResult = this.#splitLongWord(texts[i], maxWidth);
                texts.splice(i, 1, ...splitResult);
            }
        }

        // Split text into lines
        let currentLine = [];
        for (const word of texts) {
            const testLine = [...currentLine, word];
            const lineWidth = this.ctx.measureText(testLine.join(" ")).width;

            if (lineWidth > maxWidth && currentLine.length > 0) {
                strs.push(currentLine.join(" "));
                savedWidths.push(this.ctx.measureText(currentLine.join(" ")).width);
                currentLine = [word];
            } else {
                currentLine = testLine;
            }
        }

        if (currentLine.length > 0) {
            strs.push(currentLine.join(" "));
            savedWidths.push(this.ctx.measureText(currentLine.join(" ")).width);
        }

        return [strs, Math.max(...savedWidths)];
    }

    /**
     * Splits a long word into segments that fit within the maximum width
     * @private
     * @param {string} word - The long word to split
     * @param {number} maxWidth - The maximum width allowed for each segment
     * @returns {string[]} Array containing the split word segments
     */
    #splitLongWord(word, maxWidth) {
        let sub = word.slice(0, 20);
        let subWidth = this.ctx.measureText(sub).width;

        while (subWidth < maxWidth && sub.length < word.length) {
            sub = word.slice(0, sub.length + 1);
            subWidth = this.ctx.measureText(sub).width;
        }

        while (subWidth > maxWidth && sub.length > 0) {
            sub = word.slice(0, sub.length - 1);
            subWidth = this.ctx.measureText(sub).width;
        }

        return [sub, word.slice(sub.length)];
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

        let bestResult = null;
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
                this.ctx.font = font.replace(this.regex.fontValue, fontSize);

                let lines = [];
                let lineWidth = 0;

                if (targetLines === 1) {
                    // Use full text for single line
                    lines = [str.trim()];
                    lineWidth = this.ctx.measureText(lines[0]).width;
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
                        lineWidth = Math.max(lineWidth, this.ctx.measureText(line).width);
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
                    bestResult = lines;
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
        return [bestResult, bestFontSize];
    }

    /**
     * Handles the layout adjustment when the author name is empty
     * @private
     */
    #handleEmptyAuthor() {
        this.coverStyle.background[1].color = this.coverStyle.background[0].color;
        this.rect1Height += this.rect2Height;
        this.textHeightRect1 = this.rect1Height - 2 * this.settings.padding;
        this.coverStyle.text[0].pos = `${this.settings.width / 2}, ${this.rect1Height / 2}`;
    }

    /**
     * Draws all cover elements including background and text
     * @private
     * @param {Object} data - Cover element data
     * @param {Array} data.background - Array of background elements to draw
     * @param {Array} data.text - Array of text elements to draw
     */
    #drawAll(data) {
        (data.background || []).forEach((bg) => this.#drawBackground(bg));
        const text = data.text || [];
        this.#drawText(text[0], this.textHeightRect1, false); // book title
        this.#drawText(text[1], this.textHeightRect2, true); // author name
    }
}

/**
 * Gets or creates the CoverGenerator instance
 * @returns {CoverGenerator} Singleton CoverGenerator instance
 * @public
 */
export function getCoverGenerator() {
    return CoverGenerator.getInstance();
}
