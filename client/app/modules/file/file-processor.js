/**
 * @fileoverview FileProcessor module for processing files
 *
 * @module client/app/modules/file/file-processor
 * @requires client/app/config/index
 * @requires shared/core/callback/callback-registry
 * @requires shared/core/file/file-processor-core
 * @requires client/app/modules/components/cover-animation
 * @requires client/app/utils/base
 * @requires client/app/utils/helpers-worker
 */

import * as CONFIG from "../../config/index.js";
import { cbReg } from "../../../../shared/core/callback/callback-registry.js";
import { FileProcessorCore } from "../../../../shared/core/file/file-processor-core.js";
import { CoverAnimation } from "../components/cover-animation.js";
import { getFootnotes } from "../features/footnotes.js";
import {
    randomFloatFromInterval,
    addFootnotesToDOM,
    getBookCoverCanvas,
    pairAnchorsAndFootnotes,
} from "../../utils/base.js";
import { createWorker } from "../../utils/helpers-worker.js";

/**
 * Chunked file processor
 * @public
 */
export class FileProcessor extends FileProcessorCore {
    /**
     * Constructor
     * @param {File} file
     * @param {boolean} isEastern - Whether the file is in Eastern language
     * @param {string} encoding - File encoding
     * @public
     */
    constructor(file, isEastern = null, encoding = null) {
        super(file.size, isEastern, encoding);

        this.file = file;
        this.initialChunk = this.file.slice(0, this.initialChunkSize);
        this.worker = createWorker("client/app/modules/file/file-processor-worker.js", import.meta.url);
    }

    /**
     * Detect file encoding and language
     * @returns {Promise<void>}
     * @public
     */
    async detectEncodingAndLanguage() {
        // console.log("detectEncodingAndLanguage");
        await super.detectEncodingAndLanguage(this.file);

        // Change UI language based on detected language... or not?
        // CONFIG.RUNTIME_VARS.RESPECT_USER_LANG_SETTING = (document.documentElement.getAttribute("respectUserLangSetting") === "true");
        // console.log("this.isEasternLan: ", this.isEasternLan);
        if (!CONFIG.RUNTIME_VARS.RESPECT_USER_LANG_SETTING) {
            cbReg.go("updateUILanguage", {
                lang: this.isEasternLan ? "zh" : "en",
                saveToLocalStorage: false,
            });
        }
    }

    /**
     * Process book metadata
     * @returns {Promise<void>}
     * @public
     */
    async processBookMetadata() {
        const { bookName, author, bookNameRE, authorRE } = await this.#sendWorkerMessage("processMetadata", {
            fileName: this.file.name,
        });

        this.bookMetadata = { bookName, author, bookNameRE, authorRE };
        this.title_page_line_number_offset = author !== "" ? 3 : 2;
        this.seal_rotate_en = `${randomFloatFromInterval(-50, 80)}deg`;
        this.seal_left = randomFloatFromInterval(0, 1);
    }

    /**
     * Process initial chunk
     * @returns {Promise<void>}
     * @public
     */
    async processInitialChunk() {
        // Generate title page
        const titlePageResult = await this.#generateTitlePage();
        let endPageResult = null;

        if (this.file.size <= this.initialChunkSize) {
            // Generate end page
            endPageResult = await this.#generateEndPage();
        }

        return await this.#processInitialChunk({
            titlePageLines: titlePageResult.lines,
            titlePageTitles: titlePageResult.titles,
            endPageLines: endPageResult?.lines ?? null,
            endPageTitles: endPageResult?.titles ?? null,
        });
    }

    /**
     * Process remaining content
     * @returns {Promise<void>}
     * @public
     */
    async processRemainingContent() {
        // Generate title page and end page
        const titlePageResult = await this.#generateTitlePage();
        const endPageResult = await this.#generateEndPage();

        return await this.#processRemainingContent({
            titlePageLines: titlePageResult.lines,
            titlePageTitles: titlePageResult.titles,
            endPageLines: endPageResult.lines,
            endPageTitles: endPageResult.titles,
        });
    }

    /**
     * Process initial chunk (first 1MB)
     * @param {Object} extraContent - Additional content for processing
     * @returns {Promise<{lines: Array<string>, titles: Array<Array<number>>, footnotes: Array<Array<string>>, footnoteCounter: number, pageBreaks: Array<number>}>}
     * @private
     */
    async #processInitialChunk(extraContent) {
        const options = {
            chunk: this.initialChunk,
            sliceLineOffset: this.initialChunkLineOffset,
        };

        return await this.#processContent("processInitialChunk", options, extraContent);
    }

    /**
     * Process remaining content in background
     * @param {Object} extraContent - Additional content for processing
     * @returns {Promise<{lines: Array<string>, titles: Array<Array<number>>, footnotes: Array<Array<string>>, footnoteCounter: number, pageBreaks: Array<number>}>}
     * @private
     */
    async #processRemainingContent(extraContent) {
        if (this.file.size <= this.initialChunkSize) {
            this.isProcessingComplete = true;
            return;
        }

        const options = {
            file: this.file,
            chunkStart: 0,
        };

        return await this.#processContent("processRemainingContent", options, extraContent);
    }

    /**
     * Process content (initial chunk or remaining content) in background
     * @param {string} operation - The operation to perform ("processInitialChunk" or "processRemainingContent")
     * @param {Object} options - Additional options for the operation
     * @param {Object} extraContent - Additional content for processing
     * @returns {Promise<{lines: Array<string>, titles: Array<Array<number>>, footnotes: Array<Array<string>>, footnoteCounter: number, pageBreaks: Array<number>}>}
     * @private
     */
    async #processContent(operation, options, extraContent) {
        const result = await this.#sendWorkerMessage(operation, {
            ...options,
            extraContent,
            title_page_line_number_offset: this.title_page_line_number_offset,
            pageBreakOnTitle: CONFIG.RUNTIME_CONFIG.PAGE_BREAK_ON_TITLE,
        });

        // Merge processing results
        this.processedLines = result.htmlLines;
        this.titles = result.titles;
        this.titles_ind = result.titles_ind;
        this.footnotes = result.footnotes;
        this.footnoteCounter = result.footnoteCounter;
        this.pageBreaks = result.pageBreaks;

        // [Deprecated] Add footnotes to DOM
        // addFootnotesToDOM(this.footnotes, CONFIG.DOM_ELEMENT.FOOTNOTE_CONTAINER);
        // [New] Set the lookup function for the current chunk/footnotes
        const pairedFootnotes = pairAnchorsAndFootnotes(this.footnotes);
        getFootnotes().setFootnoteLookup((markerCode, index) => {
            // console.log("LOOKUP:", markerCode, index, pairedFootnotes[markerCode][index], pairedFootnotes[markerCode]);
            // console.log("footnotes: ", this.footnotes);
            index = Number(index);
            return pairedFootnotes[markerCode]?.[index] || CONFIG.CONST_FOOTNOTE.NOTFOUND;
        });

        if (operation === "processRemainingContent") {
            this.isProcessingComplete = true;
        }

        return result;
    }

    /**
     * Generate title page
     * @returns {Promise<{lines: Array<string>, titles: Array<Array<number>>}>}
     * @private
     */
    async #generateTitlePage() {
        const { titlePageLines } = await this.#sendWorkerMessage("generateTitlePage", {
            styles: {
                h1_lineHeight: CONFIG.RUNTIME_VARS.STYLE.h1_lineHeight,
            },
        });

        return {
            lines: titlePageLines,
            titles: [[CONFIG.RUNTIME_VARS.STYLE.ui_titlePage, 0, CONFIG.RUNTIME_VARS.STYLE.ui_titlePage, false]],
        };
    }

    /**
     * Generate end page
     * @returns {Promise<{lines: Array<string>, titles: Array<Array<number>>}>}
     * @private
     */
    async #generateEndPage() {
        const { endPageLine } = await this.#sendWorkerMessage("generateEndPage", {
            totalLines: this.processedLines.length,
        });

        return {
            lines: [endPageLine],
            titles: [
                [
                    CONFIG.RUNTIME_VARS.STYLE.ui_endPage,
                    this.processedLines.length - 1,
                    CONFIG.RUNTIME_VARS.STYLE.ui_endPage,
                    false,
                ],
            ],
        };
    }

    /**
     * Set progress callback
     * @param {Function} callback
     * @public
     */
    setProgressCallback(callback) {
        this.onProgress = callback;
    }

    /**
     * Sends a message to the Worker and handles the response
     * @param {string} operation - Type of operation to perform
     * @param {Object} [data={}] - Additional data to send
     * @returns {Promise<any>} Result of the operation
     * @private
     */
    async #sendWorkerMessage(operation, data = {}) {
        let animation = null;

        return new Promise((resolve, reject) => {
            /**
             * Handler for Worker messages
             * @param {MessageEvent} e - Message event from Worker
             */
            const handler = (e) => {
                const { type, error, ...result } = e.data;

                if (type === "processingProgress") {
                    // console.log(`Processing ${operation}:`, {
                    //     filename: this.file.name,
                    //     stage: result.stage,
                    //     processedLines: result.processedLines,
                    //     totalLines: result.totalLines,
                    //     percentage: result.percentage,
                    // });

                    const canvas = getBookCoverCanvas(this.file.name);
                    if (canvas) {
                        if (!animation) {
                            animation = CoverAnimation.create(canvas);
                        }
                        animation.start(result.percentage);
                    }
                    return;
                }

                if (type === `${operation}Complete`) {
                    if (animation) {
                        animation.stop();
                        animation.reset();
                    }

                    this.worker.onmessage = null;
                    resolve(result);
                } else if (type === "error") {
                    if (animation) {
                        animation.stop();
                    }
                    reject(new Error(error));
                }
            };

            this.worker.onmessage = handler;
            this.worker.postMessage({
                operation,
                encoding: this.encoding,
                isEasternLan: this.isEasternLan,
                metadata: this.bookMetadata,
                ...data,
            });
        });
    }

    /**
     * Destroy the file processor
     * @public
     */
    destroy() {
        WebSocketClient.removeListener("processingProgress");
        if (this.animation) {
            this.animation.stop();
            this.animation = null;
        }
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
    }
}
