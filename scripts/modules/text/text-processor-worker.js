/**
 * @fileoverview TextProcessorWorker module for handling text processing tasks
 * that do not involve DOM manipulation. This class is designed to run in a
 * background worker and perform all non-UI related processing.
 *
 * This module provides various static methods for processing text content,
 * including handling titles, footnotes, and optimizing text by removing unwanted
 * symbols and ads.
 *
 * @module modules/text/text-processor-worker
 * @requires regex
 * @requires config/constants
 * @requires config/variables
 */

import { REGEX_RULES, generateAdsRules } from "./regex.js";
import * as CONFIG_CONST from "../../config/constants.js";
import * as CONFIG_VAR from "../../config/variables.js";

/**
 * @class TextProcessorWorker
 * @description Class for processing text content in a worker thread.
 */
export class TextProcessorWorker {
    /**
     * Build basic regular expressions
     */
    static #REGEX_IS_TITLE = new RegExp(REGEX_RULES.TITLES.join("|"), "i");
    static #REGEX_IS_EASTERN = new RegExp(REGEX_RULES.LANGUAGE);
    static REGEX_IS_PUNCTUATION = new RegExp(REGEX_RULES.PUNCTUATION);
    static #REGEX_IS_FOOTNOTE = new RegExp(REGEX_RULES.FOOTNOTE);
    static #REGEX_FILENAME_AD = new RegExp(
        `${REGEX_RULES.BRACKET_BOOKNAME_LEFT_NOSPACE}${REGEX_RULES.BOOK_EDITION}${REGEX_RULES.BRACKET_BOOKNAME_RIGHT_NOSPACE}`
    );
    static #REGEX_BOOKNAME_AD1 = new RegExp(`^(\\s*(书名(${REGEX_RULES.COLON})+)?)`);
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
     * Batch process text content (deprecated)
     * @param {string} str - The text content to process.
     * @returns {string} Processed HTML string.
     * @deprecated Use the process() method instead.
     * @public
     */
    static process_batch(str) {
        let to_drop_cap = false;
        let arr = str.split("\n");
        let newArr = [];
        for (let i = 0; i < arr.length; i++) {
            let current = arr[i].trim();
            if (current !== "") {
                if (this.#REGEX_IS_TITLE.test(current)) {
                    newArr.push(`<h2>${current.replace(":", "").replace("：", "")}</h2>`);
                    to_drop_cap = true;
                } else {
                    if (to_drop_cap && !CONFIG_VAR.VARS.IS_EASTERN_LAN) {
                        let isPunctuation = this.REGEX_IS_PUNCTUATION.test(current[0]);
                        if (isPunctuation) {
                            let index = 0;
                            while (this.REGEX_IS_PUNCTUATION.test(current[index])) {
                                index++;
                            }
                            newArr.push(
                                `<p class="first"><span class="dropCap">${current.slice(
                                    0,
                                    index + 1
                                )}</span>${current.slice(index + 1)}</p>`
                            );
                        } else {
                            newArr.push(
                                `<p class="first"><span class="dropCap">${current[0]}</span>${current.slice(1)}</p>`
                            );
                        }
                        to_drop_cap = false;
                    } else {
                        newArr.push(`<p>${current}</p>`);
                        to_drop_cap = false;
                    }
                }
            }
        }
        return newArr.join("");
    }

    /**
     * Process text content line by line
     * @param {string} str - The text line to process.
     * @param {number} lineNumber - The current line number.
     * @param {number} totalLines - The total number of lines.
     * @param {boolean} to_drop_cap - Whether to apply drop cap formatting.
     * @returns {[HTMLElement, string]} Processed DOM element and type identifier.
     * @public
     */
    static process(str, lineNumber, totalLines, to_drop_cap) {
        if (lineNumber < CONFIG_VAR.VARS.TITLE_PAGE_LINE_NUMBER_OFFSET || lineNumber === totalLines - 1) {
            let current = str.trim();
            if (current.slice(1, 3) === "h1" || current.slice(1, 5) === "span") {
                return {
                    type: "title",
                    tag: current.slice(1, 3) === "h1" ? "h1" : "span",
                    content: current,
                    lineNumber,
                    elementType: "t",
                };
            } else {
                return {
                    type: "span",
                    content: current,
                    lineNumber,
                    elementType: "e",
                };
            }
        } else {
            let current = this.#optimization(str.trim());
            if (current !== "") {
                if (this.#REGEX_IS_TITLE.test(current)) {
                    return {
                        type: "heading",
                        tag: "h2",
                        content: current.replace(":", "").replace("：", ""),
                        lineNumber,
                        elementType: "h",
                    };
                } else {
                    if (to_drop_cap && !CONFIG_VAR.VARS.IS_EASTERN_LAN) {
                        const isPunctuation = this.REGEX_IS_PUNCTUATION.test(current[0]);
                        if (isPunctuation) {
                            let index = 0;
                            while (this.REGEX_IS_PUNCTUATION.test(current[index])) {
                                index++;
                            }
                            return {
                                type: "paragraph",
                                tag: "p",
                                className: "first",
                                dropCap: {
                                    content: current.slice(0, index + 1),
                                },
                                content: current.slice(index + 1),
                                lineNumber,
                                elementType: "p",
                            };
                        } else {
                            return {
                                type: "paragraph",
                                tag: "p",
                                className: "first",
                                dropCap: {
                                    content: current[0],
                                },
                                content: current.slice(1),
                                lineNumber,
                                elementType: "p",
                            };
                        }
                    } else {
                        return {
                            type: "paragraph",
                            tag: "p",
                            content: current,
                            lineNumber,
                            elementType: "p",
                        };
                    }
                }
            } else {
                return {
                    type: "empty",
                    tag: "span",
                    content: current,
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
     * Extract title information
     * @param {string} str - The text to extract title from.
     * @returns {[string, Array]} Title and title groups.
     * @public
     */
    static getTitle(str) {
        const current = str.trim();
        if (this.#REGEX_IS_TITLE.test(current)) {
            const titleGroups = this.#getTitleGroups(current);
            // console.log(titleGroups);
            return [current.replace(":", "").replace("：", ""), titleGroups.filter((item) => item !== undefined)];
        } else {
            return ["", []];
        }
    }

    /**
     * Get title groups
     * @param {string} str - The text to extract title groups from.
     * @returns {Array} Title groups.
     * @private
     */
    static #getTitleGroups(str) {
        const current = str.trim();
        let titleGroups = [];
        const allMatches = current.match(this.#REGEX_IS_TITLE);
        for (let i in allMatches) {
            titleGroups.push(allMatches[i]);
        }
        return titleGroups;
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
                // console.log(current.slice(0, pos).replace(this.#REGEX_BOOKNAME_AD1, "").replace(this.#REGEX_BOOKNAME_AD2, "").replace(this.#REGEX_BOOKNAME_AD3, "").trim());
                // console.log(current.slice(pos + 2).replace(this.#REGEX_BOOKNAME_AD4, "").replace(this.#REGEX_BOOKNAME_AD3, "").replace(this.#REGEX_BOOKNAME_AD2, "").trim());
                const bookName = current
                    .slice(0, pos)
                    .replace(this.#REGEX_BOOKNAME_AD1, "")
                    .replace(this.#REGEX_BOOKNAME_AD2, "")
                    .replace(this.#REGEX_BOOKNAME_AD3, "")
                    .trim();
                const author = current
                    .slice(pos + 2)
                    .replace(this.#REGEX_BOOKNAME_AD4, "")
                    .trim();

                // Remove imbalanced brackets and their content
                bookInfo.bookName = this.#ignoreContentFromUnbalancedBracketIndex(bookName);
                bookInfo.author = this.#ignoreContentFromUnbalancedBracketIndex(author);
            } else {
                const pos2 = current.toLowerCase().lastIndexOf(CONFIG_CONST.CONST_FILE.AUTHOR_TOKEN_EN);
                if (pos2 !== -1) {
                    // console.log(current.slice(0, pos2).replace(this.#REGEX_BOOKNAME_AD1, "").replace(this.#REGEX_BOOKNAME_AD2, "").replace(this.#REGEX_BOOKNAME_AD3, "").trim());
                    // console.log(current.slice(pos2 + 4).replace(this.#REGEX_BOOKNAME_AD4, "").replace(this.#REGEX_BOOKNAME_AD3, "").replace(this.#REGEX_BOOKNAME_AD2, "").trim());
                    const bookName = current
                        .slice(0, pos2)
                        .replace(this.#REGEX_BOOKNAME_AD1, "")
                        .replace(this.#REGEX_BOOKNAME_AD2, "")
                        .replace(this.#REGEX_BOOKNAME_AD3, "")
                        .trim();
                    const author = current
                        .slice(pos2 + 4)
                        .replace(this.#REGEX_BOOKNAME_AD4, "")
                        .trim();

                    // Remove imbalanced brackets and their content
                    bookInfo.bookName = this.#ignoreContentFromUnbalancedBracketIndex(bookName);
                    bookInfo.author = this.#ignoreContentFromUnbalancedBracketIndex(author);
                }
                // No complete book name and author info
                // Treat file name as book name and application name as author
                bookInfo.bookName = current;
                bookInfo.author = "";
            }
        } else {
            const pos = current.toLowerCase().lastIndexOf(CONFIG_CONST.CONST_FILE.AUTHOR_TOKEN_EN);
            if (pos !== -1) {
                // console.log(current.slice(0, pos).replace(this.#REGEX_BOOKNAME_AD1, "").replace(this.#REGEX_BOOKNAME_AD2, "").replace(this.#REGEX_BOOKNAME_AD3, "").trim());
                // console.log(ccurrent.slice(pos + 4).replace(this.#REGEX_BOOKNAME_AD4, "").replace(this.#REGEX_BOOKNAME_AD3, "").replace(this.#REGEX_BOOKNAME_AD2, "").trim());
                const bookName = current
                    .slice(0, pos)
                    .replace(this.#REGEX_BOOKNAME_AD1, "")
                    .replace(this.#REGEX_BOOKNAME_AD2, "")
                    .replace(this.#REGEX_BOOKNAME_AD3, "")
                    .trim();
                const author = current
                    .slice(pos + 4)
                    .replace(this.#REGEX_BOOKNAME_AD4, "")
                    .trim();

                // Remove imbalanced brackets and their content
                bookInfo.bookName = this.#ignoreContentFromUnbalancedBracketIndex(bookName);
                bookInfo.author = this.#ignoreContentFromUnbalancedBracketIndex(author);
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
    static makeFootNote(str) {
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
                    // console.log("footnote.length: ", CONFIG_VAR.VARS.FOOTNOTES.length);
                    // console.log("Found footnote: ", allMatches[i]);
                    const curIndex = current.indexOf(allMatches[i]);
                    current = `${current.slice(0, curIndex)}<a rel="footnote" href="#fn${
                        CONFIG_VAR.VARS.FOOTNOTES.length
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
    static #optimization(str) {
        let current = str.trim();

        // Remove symbols
        current = current.replace(this.#REGEX_SYMBOLS, "").trim();

        // Remove ads from different sources using the new generateAdsRules
        // Check if ads regex cache needs to be updated
        if (CONFIG_VAR.VARS.BOOK_AND_AUTHOR !== this.#CACHED_BOOK_AND_AUTHOR) {
            this.#updateAdsRegexCache();
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
    static #updateAdsRegexCache() {
        const adsRules = generateAdsRules(CONFIG_VAR.VARS.BOOK_AND_AUTHOR);
        this.#CACHED_ADS_REGEX = Object.values(adsRules).map((getRules) => new RegExp(getRules().join("|"), "i"));
        this.#CACHED_BOOK_AND_AUTHOR = CONFIG_VAR.VARS.BOOK_AND_AUTHOR;
    }

    /**
     * Check if brackets are balanced
     * Credit: Credit: https://stackoverflow.com/questions/14334740/missing-parentheses-with-regex
     * @param {string} str - The text to check.
     * @returns {[boolean, string]} Boolean indicating if brackets are balanced and string of unbalanced brackets.
     * @private
     */
    static #checkBalancedBrackets(str) {
        let s;
        str = str.replace(/[^{}[\]()（）《》「」『』﹁﹂﹃﹄【】]/g, "");
        while (s != str) {
            s = str;
            str = str.replace(/{}|\[]|\(\)|（）|《》|「」|『』|﹁﹂|﹃﹄|【】/g, "");
        }
        return [!str, str];
    }

    /**
     * Get index of first unbalanced bracket
     * Credit: https://stackoverflow.com/questions/30771362/check-if-string-contains-the-substrings-sequence-of-characters-in-order-but-no
     * @param {string} orig_str - The original text.
     * @param {string} unbalanced_brackets_str - The string of unbalanced brackets.
     * @returns {number} Index of first unbalanced bracket, or -1 if not found.
     * @private
     */
    static #getFirstUnbalancedBracketIndex(orig_str, unbalanced_brackets_str) {
        // Keep track of our position in the orig_str.
        let index = 0;
        let indices = [];

        // Iterate through all of the characters in the unbalanced_brackets_str.
        for (const character of unbalanced_brackets_str) {
            // Find the current character starting from the last character we stopped on.
            index = orig_str.indexOf(character, index + 1);
            indices.push(index);
            // If the method returned -1, the character was not found, so the result is false.
            if (index === -1) {
                return -1;
            }
        }

        // If we reach this point, that means all characters were found, so the result is true.
        return indices[0];
    }

    /**
     * Ignore content from unbalanced brackets
     * @param {string} orig_str - The original text.
     * @returns {string} Processed text.
     * @private
     */
    static #ignoreContentFromUnbalancedBracketIndex(orig_str) {
        const [isBalanced, unbalancedBrackets] = this.#checkBalancedBrackets(orig_str);
        if (!isBalanced) {
            const idx = this.#getFirstUnbalancedBracketIndex(orig_str, unbalancedBrackets);
            return idx !== -1 ? orig_str.slice(0, idx) : orig_str;
        }
        return orig_str;
    }
}