/**
 * @fileoverview TextProcessorCore module for handling text processing tasks
 * that do not involve DOM manipulation. This class is designed to perform all non-UI related processing.
 *
 * This module provides various static methods for processing text content,
 * including handling titles, footnotes, and optimizing text by removing unwanted
 * symbols and ads.
 *
 * @module shared/core/text/text-processor-core
 * @requires shared/utils/logger
 * @requires shared/adapters/jschardet
 * @requires shared/core/text/regex-rules
 * @requires shared/core/text/bracket-processor
 * @requires client/app/config/constants
 * @requires client/app/config/variables
 */

import { Logger } from "../../utils/logger.js";
import { getJschardet } from "../../adapters/jschardet.js";
import { REGEX_RULES, generateAdsRules } from "./regex-rules.js";
import { BracketProcessor } from "./bracket-processor.js";
import * as CONFIG_CONST from "../../../client/app/config/constants.js";
import * as CONFIG_VAR from "../../../client/app/config/variables.js";

/**
 * Initialize jschardet
 * @type {import("jschardet").default}
 */
const jschardet = await getJschardet();

/**
 * @class TextProcessorCore
 * @description Class for processing text content.
 */
export class TextProcessorCore {
    /**
     * @private
     * @type {Logger} Logger instance
     * @static
     */
    static #logger = Logger.getLogger(TextProcessorCore, false);

    /**
     * Build basic regular expressions
     */
    static #_REGEX_IS_TITLE = null;
    static updateRegexIsTitle() {
        this.#_REGEX_IS_TITLE = new RegExp(REGEX_RULES.TITLES.join("|"), "iu");
    }
    static get #REGEX_IS_TITLE() {
        if (!this.#_REGEX_IS_TITLE) {
            this.updateRegexIsTitle();
        }
        return this.#_REGEX_IS_TITLE;
    }
    static #REGEX_IS_EASTERN = new RegExp(REGEX_RULES.LANGUAGE);
    static REGEX_IS_PUNCTUATION = new RegExp(REGEX_RULES.PUNCTUATION);
    static #REGEX_IS_FOOTNOTE = new RegExp(REGEX_RULES.FOOTNOTE);
    static #REGEX_FILENAME_AD = new RegExp(
        `${REGEX_RULES.BRACKET_BOOKNAME_LEFT_NOSPACE}${REGEX_RULES.BOOK_EDITION}${REGEX_RULES.BRACKET_BOOKNAME_RIGHT_NOSPACE}`
    );
    static #REGEX_BOOKNAME_AD1 = new RegExp(
        `^(\\s*(${CONFIG_CONST.CONST_FILE.BOOKNAME_TOKEN_ZH}(${REGEX_RULES.COLON})+)?)`
    );
    // static #REGEX_BOOKNAME_AD2 = new RegExp(`${REGEX_RULES.BRACKET_LEFT_NOSPACE}${REGEX_RULES.BRACKET_RIGHT_NOSPACE}`, "g");
    // static #REGEX_BOOKNAME_AD3 = new RegExp(`${REGEX_RULES.COLON_NOSPACE}`, "g");
    static #REGEX_BOOKNAME_AD2 = new RegExp(`^${REGEX_RULES.BRACKET_BOOKNAME_LEFT_NOSPACE}`, "");
    static #REGEX_BOOKNAME_AD3 = new RegExp(`${REGEX_RULES.BRACKET_BOOKNAME_RIGHT_NOSPACE}$`, "");
    static #REGEX_BOOKNAME_AD4 = new RegExp(`^${REGEX_RULES.COLON_NOSPACE}`);
    static #REGEX_SYMBOLS = new RegExp(REGEX_RULES.SYMBOLS, "g");

    /**
     * Cache regular expressions
     */
    static #CACHED_ADS_REGEX = null;
    static #CACHED_BOOK_AND_AUTHOR = null;

    /**
     * Other variables
     * @type {number} Footnote index
     * @type {boolean} Whether to apply drop cap formatting
     */
    static #footnoteIndex = 0;
    static #shouldDropCap = false;

    /**
     * Process text content line by line
     * @param {string} str - The text line to process.
     * @param {number} lineNumber - The current line number.
     * @param {boolean} isTitleOrEndPage - Whether the line is a title or end page.
     * @param {Object} bookAndAuthor - The book and author information.
     * @param {boolean} isEasternLan - Whether the language is Eastern.
     * @returns {[HTMLElement, string]} Processed DOM element and type identifier.
     * @public
     */
    static process(
        str,
        lineNumber,
        isTitleOrEndPage = false,
        bookAndAuthor = CONFIG_VAR.VARS.BOOK_AND_AUTHOR,
        isEasternLan = CONFIG_VAR.VARS.IS_EASTERN_LAN
    ) {
        if (isTitleOrEndPage) {
            const current = str.trim();
            if (current.slice(1, 3) === "h1" || current.slice(1, 5) === "span") {
                this.#shouldDropCap = false;
                const content = this.#removeHtmlTags(current);
                return {
                    type: "title",
                    tag: current.slice(1, 3) === "h1" ? "h1" : "span",
                    content: current,
                    charCount: content.length,
                    lineNumber,
                    elementType: "t",
                };
            } else {
                this.#shouldDropCap = false;
                const content = this.#removeHtmlTags(current);
                return {
                    type: "span",
                    tag: "span",
                    content: current,
                    charCount: content.length,
                    lineNumber,
                    elementType: "e",
                };
            }
        } else {
            const current = this.optimize(str.trim(), bookAndAuthor);
            if (current !== "") {
                if (this.#REGEX_IS_TITLE.test(current)) {
                    this.#shouldDropCap = true;
                    const content = current.replace(":", " ").replace("：", " ");
                    const content2 = this.#removeHtmlTags(content);
                    return {
                        type: "heading",
                        tag: "h2",
                        content,
                        charCount: content2.length,
                        lineNumber,
                        elementType: "h",
                    };
                } else {
                    if (this.#shouldDropCap && !isEasternLan) {
                        const isPunctuation = this.REGEX_IS_PUNCTUATION.test(current[0]);
                        if (isPunctuation) {
                            let index = 0;
                            while (this.REGEX_IS_PUNCTUATION.test(current[index])) {
                                index++;
                            }
                            this.#shouldDropCap = false;
                            const content = this.#removeHtmlTags(current);
                            return {
                                type: "paragraph",
                                tag: "p",
                                className: "first",
                                dropCap: {
                                    content: current.slice(0, index + 1).toUpperCase(),
                                },
                                content: current.slice(index + 1),
                                charCount: content.length,
                                lineNumber,
                                elementType: "p",
                            };
                        } else {
                            this.#shouldDropCap = false;
                            const content = this.#removeHtmlTags(current);
                            return {
                                type: "paragraph",
                                tag: "p",
                                className: "first",
                                dropCap: {
                                    content: current[0].toUpperCase(),
                                },
                                content: current.slice(1),
                                charCount: content.length,
                                lineNumber,
                                elementType: "p",
                            };
                        }
                    } else {
                        this.#shouldDropCap = false;
                        const content = this.#removeHtmlTags(current);
                        return {
                            type: "paragraph",
                            tag: "p",
                            content: current,
                            charCount: content.length,
                            lineNumber,
                            elementType: "p",
                        };
                    }
                }
            } else {
                this.#shouldDropCap = false;
                return {
                    type: "empty",
                    tag: "span",
                    content: current,
                    charCount: current.length,
                    lineNumber,
                    elementType: "e",
                };
            }
        }
    }

    /**
     * Check if text is in Eastern language
     * @param {string} str - The text to check.
     * @returns {boolean} Whether the text is in Eastern language.
     * @public
     */
    static getLanguage(str) {
        const current = str.trim();
        return this.#REGEX_IS_EASTERN.test(current);
    }

    /**
     * Get the language and encoding of a book
     * @param {Object} file - The file object.
     * @returns {Promise<{isEastern: boolean, encoding: string}>} The language and encoding of the book.
     * @public
     */
    static async getLanguageAndEncodingFromBook(file) {
        try {
            const fileSample = file.slice(0, CONFIG_CONST.CONST_FILE.LOOKUP_SAMPLE_SMALL);
            const buffer = await fileSample.arrayBuffer();
            return await this.getLanguageAndEncodingFromBookBuffer(buffer);
        } catch (error) {
            console.error("Error detecting encoding:", error);
            return {
                isEastern: true,
                encoding: "utf-8",
            };
        }
    }

    /**
     * Get the language and encoding of a book from a buffer
     * @param {ArrayBuffer} buffer - The buffer to get the language and encoding from.
     * @returns {Promise<{isEastern: boolean, encoding: string}>} The language and encoding of the book.
     * @public
     */
    static async getLanguageAndEncodingFromBookBuffer(buffer) {
        try {
            let tempBuffer = new Uint8Array(buffer);

            // If sample is too small, copy until reaching required size
            while (tempBuffer.byteLength < CONFIG_CONST.CONST_FILE.LOOKUP_SAMPLE_SMALL) {
                tempBuffer = new Uint8Array([...tempBuffer, ...tempBuffer]);
            }

            const text = String.fromCharCode.apply(null, tempBuffer);
            const detected = jschardet.detect(text).encoding || "utf-8";
            const encoding = detected.toLowerCase() === "ascii" ? "utf-8" : detected;
            return {
                isEastern: TextProcessorCore.getLanguage(new TextDecoder(encoding).decode(tempBuffer)),
                encoding,
            };
        } catch (error) {
            console.error("Error detecting encoding:", error);
            return {
                isEastern: true,
                encoding: "utf-8",
            };
        }
    }

    /**
     * Extract title information
     * @param {string} str - The text to extract title from.
     * @returns {[string, Array, Object, boolean]} Title, title groups, named groups, and whether it is custom only.
     * @public
     */
    static getTitle(str) {
        const current = str.trim();
        const isMatch = this.#REGEX_IS_TITLE.test(current);
        if (isMatch) {
            const { titleGroups, namedGroups, isCustomOnly } = this.#getTitleGroups(current);
            // console.log("titleGroups", { titleGroups, namedGroups, isCustomOnly });
            return [current.replace(":", " ").replace("：", " "), titleGroups, namedGroups, isCustomOnly];
        } else {
            return ["", [], {}, false];
        }
    }

    /**
     * Get title groups
     * @param {string} str - The text to extract title groups from.
     * @returns {Object} Title groups, named groups, and whether it is custom only. Format: { titleGroups: Array, namedGroups: { base: Array, custom: Array }, isCustomOnly: boolean }
     * @private
     */
    static #getTitleGroups(str) {
        const current = str.trim();
        const allMatches = current.match(this.#REGEX_IS_TITLE);

        // console.log("Raw matches:", allMatches);
        // console.log("Match type:", Object.prototype.toString.call(allMatches));
        // console.log("Match keys:", Object.keys(allMatches));
        // console.log("Match length:", allMatches.length);

        if (!allMatches) {
            return {
                titleGroups: [],
                namedGroups: {},
                isCustomOnly: false,
            };
        }

        // Capture title groups
        const titleGroups = [];
        for (let i = 0; i < allMatches.length; i++) {
            if (allMatches[i] !== undefined) {
                titleGroups.push(allMatches[i]);
            }
        }

        // Capture named groups
        let namedGroups = {};
        let isCustomOnly = false;
        const rawNamedGroups = allMatches.groups
            ? Object.entries(allMatches.groups)
                  .filter(([_, value]) => value !== undefined)
                  .map(([key, _]) => key)
            : [];

        // Format named groups
        if (rawNamedGroups.length > 0) {
            const groupedRules = rawNamedGroups.reduce((acc, groupName) => {
                const [ruleGroup, ruleIndex] = groupName.split("__");
                if (!acc[ruleGroup]) {
                    acc[ruleGroup] = [];
                }
                acc[ruleGroup].push(parseInt(ruleIndex));
                return acc;
            }, {});
            namedGroups = groupedRules;
            isCustomOnly = "custom" in groupedRules && !("base" in groupedRules);
        }

        return {
            titleGroups,
            namedGroups,
            isCustomOnly,
        };
    }

    /**
     * Escape special characters in regular expression
     * @param {string} str - The string to escape special characters from.
     * @returns {string} Escaped string.
     * @private
     */
    static #safeREStr(str) {
        return str.replaceAll(/(.)/g, "\\$1");
    }

    /**
     * Extract book name and author information
     * @param {string} str - The text containing book name and author information.
     * @returns {Object} Object containing book name and author information.
     * @public
     */
    static getBookNameAndAuthor(str) {
        const current = str.trim().replace(this.#REGEX_FILENAME_AD, "");

        let bookInfo = {
            bookName: current,
            author: "",
            bookNameRE: current,
            authorRE: "",
        };

        // Add book naming rule: book name.[author].txt
        const m = current.match(/^(?<name>.+)\.\[(?<author>.+)\]$/i);
        if (m) {
            bookInfo.bookName = m.groups["name"];
            bookInfo.author = m.groups["author"];
        } else if (this.#REGEX_IS_EASTERN.test(current)) {
            const pos = current.toLowerCase().lastIndexOf(CONFIG_CONST.CONST_FILE.AUTHOR_TOKEN_ZH);
            if (pos !== -1) {
                // this.#logger.log(current.slice(0, pos).replace(this.#REGEX_BOOKNAME_AD1, "").replace(this.#REGEX_BOOKNAME_AD2, "").replace(this.#REGEX_BOOKNAME_AD3, "").trim());
                // this.#logger.log(current.slice(pos + 2).replace(this.#REGEX_BOOKNAME_AD4, "").replace(this.#REGEX_BOOKNAME_AD3, "").replace(this.#REGEX_BOOKNAME_AD2, "").trim());
                const bookName = current
                    .slice(0, pos)
                    .replace(this.#REGEX_BOOKNAME_AD1, "")
                    // .replace(this.#REGEX_BOOKNAME_AD2, "")
                    // .replace(this.#REGEX_BOOKNAME_AD3, "")
                    .trim();
                const author = current
                    .slice(pos + 2)
                    .replace(this.#REGEX_BOOKNAME_AD4, "")
                    .trim();

                // Remove imbalanced brackets and their content, then strip balanced brackets
                bookInfo.bookName = BracketProcessor.processBracketsAndTrim(bookName);
                bookInfo.author = BracketProcessor.processBracketsAndTrim(author);
            } else {
                const pos2 = current.toLowerCase().lastIndexOf(CONFIG_CONST.CONST_FILE.AUTHOR_TOKEN_EN);
                if (pos2 !== -1) {
                    // this.#logger.log(current.slice(0, pos2).replace(this.#REGEX_BOOKNAME_AD1, "").replace(this.#REGEX_BOOKNAME_AD2, "").replace(this.#REGEX_BOOKNAME_AD3, "").trim());
                    // this.#logger.log(current.slice(pos2 + 4).replace(this.#REGEX_BOOKNAME_AD4, "").replace(this.#REGEX_BOOKNAME_AD3, "").replace(this.#REGEX_BOOKNAME_AD2, "").trim());
                    const bookName = current
                        .slice(0, pos2)
                        .replace(this.#REGEX_BOOKNAME_AD1, "")
                        // .replace(this.#REGEX_BOOKNAME_AD2, "")
                        // .replace(this.#REGEX_BOOKNAME_AD3, "")
                        .trim();
                    const author = current
                        .slice(pos2 + 4)
                        .replace(this.#REGEX_BOOKNAME_AD4, "")
                        .trim();

                    // Remove imbalanced brackets and their content, then strip balanced brackets
                    bookInfo.bookName = BracketProcessor.processBracketsAndTrim(bookName);
                    bookInfo.author = BracketProcessor.processBracketsAndTrim(author);
                }
                // No complete book name and author info
                // Treat file name as book name and application name as author
                bookInfo.bookName = BracketProcessor.processBracketsAndTrim(current);
                bookInfo.author = "";
            }
        } else {
            const pos = current.toLowerCase().lastIndexOf(CONFIG_CONST.CONST_FILE.AUTHOR_TOKEN_EN);
            if (pos !== -1) {
                // this.#logger.log(current.slice(0, pos).replace(this.#REGEX_BOOKNAME_AD1, "").replace(this.#REGEX_BOOKNAME_AD2, "").replace(this.#REGEX_BOOKNAME_AD3, "").trim());
                // this.#logger.log(ccurrent.slice(pos + 4).replace(this.#REGEX_BOOKNAME_AD4, "").replace(this.#REGEX_BOOKNAME_AD3, "").replace(this.#REGEX_BOOKNAME_AD2, "").trim());
                const bookName = current
                    .slice(0, pos)
                    .replace(this.#REGEX_BOOKNAME_AD1, "")
                    // .replace(this.#REGEX_BOOKNAME_AD2, "")
                    // .replace(this.#REGEX_BOOKNAME_AD3, "")
                    .trim();
                const author = current
                    .slice(pos + 4)
                    .replace(this.#REGEX_BOOKNAME_AD4, "")
                    .trim();

                // Remove imbalanced brackets and their content, then strip balanced brackets
                bookInfo.bookName = BracketProcessor.processBracketsAndTrim(bookName);
                bookInfo.author = BracketProcessor.processBracketsAndTrim(author);
            } else {
                // No complete book name and author info
                // Treat file name as book name and application name as author
                bookInfo.bookName = current;
                bookInfo.author = "";
            }
        }
        // If book name is empty but author is not
        if (bookInfo.bookName === "" && bookInfo.author !== "") {
            bookInfo.bookName = bookInfo.author;
            bookInfo.author = "";
        }
        bookInfo.bookNameRE = this.#safeREStr(bookInfo.bookName);
        bookInfo.authorRE = this.#safeREStr(bookInfo.author);
        return bookInfo;
    }

    /**
     * Handle footnotes
     * @param {string} str - The text containing footnotes.
     * @returns {string} Processed text.
     * @public
     */
    static makeFootNote(str, resetIndex = false) {
        let current = str.trim();

        // Find if footnote characters exist
        if (this.#REGEX_IS_FOOTNOTE.test(current)) {
            const allMatches = current.match(this.#REGEX_IS_FOOTNOTE);

            if (allMatches.length == 1 && current.indexOf(allMatches[0]) == 0) {
                // This is the actual footnote itself
                return { line: "", footnote: current.slice(1) };
            } else {
                // main text
                for (let i in allMatches) {
                    // If resetIndex is true, reset the footnote index
                    if (resetIndex) {
                        this.#footnoteIndex = 0;
                    } else {
                        this.#footnoteIndex++;
                    }
                    // this.#logger.log("footnote.length", { CONFIG_VAR.VARS.FOOTNOTES.length });
                    // this.#logger.log("Found footnote", { allMatches[i] });
                    const curIndex = current.indexOf(allMatches[i]);
                    current = `${current.slice(0, curIndex)}<a rel="footnote" href="#fn${
                        this.#footnoteIndex
                    }"><img class="footnote_img"/></a>${current.slice(curIndex + 1)}`;
                    CONFIG_VAR.VARS.FOOTNOTES.push(allMatches[i]);
                }
            }
        }

        return { line: current, footnote: "" };
    }

    /**
     * Optimize text content
     * Remove unwanted symbols and ads
     * @param {string} str - The text to optimize.
     * @returns {string} Optimized text.
     * @private
     */
    static optimize(str, bookAndAuthor = CONFIG_VAR.VARS.BOOK_AND_AUTHOR) {
        let current = str.trim();

        // Remove symbols
        current = current.replace(this.#REGEX_SYMBOLS, "").trim();

        // Remove ads from different sources using the new generateAdsRules
        // Check if ads regex cache needs to be updated
        if (bookAndAuthor !== this.#CACHED_BOOK_AND_AUTHOR) {
            this.#updateAdsRegexCache(bookAndAuthor);
        }

        // Use cached regular expressions to remove ads
        this.#CACHED_ADS_REGEX.forEach((regex) => {
            current = current.replace(regex, "").trim();
        });

        return current.trim();
    }

    /**
     * Update ads regex cache
     * @private
     */
    static #updateAdsRegexCache(bookAndAuthor) {
        const adsRules = generateAdsRules(bookAndAuthor);
        this.#CACHED_ADS_REGEX = Object.values(adsRules).map((getRules) => new RegExp(getRules().join("|"), "i"));
        this.#CACHED_BOOK_AND_AUTHOR = bookAndAuthor;
    }

    /**
     * Remove HTML tags from a line
     * @param {string} line - The line to remove HTML tags from.
     * @returns {string} Line without HTML tags.
     * @private
     */
    static #removeHtmlTags(line) {
        if (!line) return "";

        // Remove all HTML tags
        const cleanText = line
            .replace(/<[^>]*>/g, "") // Remove HTML tags
            .replace(/&nbsp;/g, " ") // Replace common HTML entities
            .trim();

        return cleanText;
    }
}
