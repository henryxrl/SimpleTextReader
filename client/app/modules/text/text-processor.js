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
 * @module client/app/modules/text/text-processor
 * @requires shared/core/text/text-processor-core
 * @requires client/app/modules/text/text-processor-dom
 * @requires client/app/config/variables
 * @requires client/app/config/variables-dom
 */

import { TextProcessorCore } from "../../../../shared/core/text/text-processor-core.js";
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
    static REGEX_IS_PUNCTUATION = TextProcessorCore.REGEX_IS_PUNCTUATION;

    /**
     * Process text content line by line and create DOM elements
     * @param {string} str - The text line to process.
     * @param {number} lineNumber - The current line number.
     * @param {boolean} isTitlePageOrEndPage - Whether the line is a title or end page.
     * @returns {[HTMLElement, string]} Processed DOM element and type identifier.
     * @public
     */
    static processAndCreateDOM(str, lineNumber, isTitlePageOrEndPage = false) {
        // 1. Process text and get structure
        const structure = TextProcessorCore.process(str, lineNumber, isTitlePageOrEndPage);

        // 2. Create DOM elements
        return TextProcessorDOM.createFromStructure(structure);
    }

    /**
     * Create DOM elements from structure
     * @param {Object} structure - The structure to create DOM elements from.
     * @returns {HTMLElement} The created DOM element.
     * @public
     */
    static createDOM(structure) {
        return TextProcessorDOM.createFromStructure(structure);
    }

    /**
     * Extract book name and author information
     * @param {string} str - The text containing book name and author information.
     * @returns {Object} Object containing book name and author information.
     * @public
     */
    static getBookNameAndAuthor(str) {
        return TextProcessorCore.getBookNameAndAuthor(str);
    }

    /**
     * Check if text is in Eastern language
     * @param {string} str - The text to check.
     * @returns {boolean} Whether the text is in Eastern language.
     * @public
     */
    static getLanguage(str) {
        return TextProcessorCore.getLanguage(str);
    }

    /**
     * Get the language and encoding of a book
     * @async
     * @param {Object} file - The file object.
     * @returns {Promise<{isEastern: boolean, encoding: string}>} The language and encoding of the book.
     * @public
     */
    static async getLanguageAndEncodingFromBook(file) {
        return await TextProcessorCore.getLanguageAndEncodingFromBook(file);
    }

    /**
     * Get title groups
     * @param {string} str - The text to extract title groups from.
     * @returns {Array} Title groups.
     * @public
     */
    static getTitle(str) {
        return TextProcessorCore.getTitle(str);
    }

    /**
     * Handle footnotes
     * @param {string} str - The input line of text (main content or footnote definition).
     * @param {Array} markerTimeline - Tracks chronological appearance of anchors/footnotes.
     * @param {number} lineNumber - The line number in the text.
     * @param {Object} anchorCounters - Object tracking anchor counters for this marker in the file.
     * @returns {string} Processed text.
     * @public
     */
    static makeFootNote(str, markerTimeline, lineNumber, anchorCounters) {
        const { line, marker, footnote } = TextProcessorCore.makeFootNote(
            str,
            markerTimeline,
            lineNumber,
            anchorCounters
        );
        if (line === "") {
            // This is the actual footnote itself
            CONFIG_VAR.VARS.FOOTNOTE_PROCESSED_COUNTER++;
        }
        return line;
    }
}
