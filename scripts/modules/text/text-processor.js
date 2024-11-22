/**
 * @fileoverview Text Processor - Processes text content
 *
 * This module provides a class for processing text content, including:
 * - Extracting book name and author information
 * - Checking text language
 * - Extracting title groups
 * - Handling footnotes
 * - Creating DOM elements from processed text structure
 *
 * @module modules/text/text-processor
 * @requires modules/text/text-processor-worker
 * @requires modules/text/text-processor-dom
 * @requires config/variables
 * @requires config/variables-dom
 */
import { TextProcessorWorker } from "./text-processor-worker.js";
import { TextProcessorDOM } from "./text-processor-dom.js";
import * as CONFIG_VAR from "../../config/variables.js";
import * as CONFIG_DOM from "../../config/variables-dom.js";

/**
 * @class TextProcessor
 * @description Class for processing text content.
 */
export class TextProcessor {
    /**
     * Regular expressions
     * @type {RegExp}
     * @public
     */
    static REGEX_IS_PUNCTUATION = TextProcessorWorker.REGEX_IS_PUNCTUATION;

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
        // 1. Process text and get structure
        const structure = TextProcessorWorker.process(str, lineNumber, totalLines, to_drop_cap);

        // 2. Create DOM elements
        return TextProcessorDOM.createFromStructure(structure);
    }

    /**
     * Extract book name and author information
     * @param {string} str - The text containing book name and author information.
     * @returns {Object} Object containing book name and author information.
     * @public
     */
    static getBookNameAndAuthor(str) {
        return TextProcessorWorker.getBookNameAndAuthor(str);
    }

    /**
     * Check if text is in Eastern language
     * @param {string} str - The text to check.
     * @returns {boolean} Whether the text is in Eastern language.
     * @public
     */
    static getLanguage(str) {
        return TextProcessorWorker.getLanguage(str);
    }

    /**
     * Get title groups
     * @param {string} str - The text to extract title groups from.
     * @returns {Array} Title groups.
     * @public
     */
    static getTitle(str) {
        return TextProcessorWorker.getTitle(str);
    }

    /**
     * Handle footnotes
     * @param {string} str - The text containing footnotes.
     * @returns {string} Processed text.
     * @public
     */
    static makeFootNote(str) {
        const { line, footnote } = TextProcessorWorker.makeFootNote(str);
        if (line === "") {
            // This is the actual footnote itself
            const tempLi = document.createElement("li");
            tempLi.id = `fn${CONFIG_VAR.VARS.FOOTNOTE_PROCESSED_COUNTER}`;
            tempLi.innerText = footnote;
            CONFIG_DOM.DOM_ELEMENT.FOOTNOTE_CONTAINER.appendChild(tempLi);
            CONFIG_VAR.VARS.FOOTNOTE_PROCESSED_COUNTER++;
        }
        return line;
    }
}