/**
 * @fileoverview FileProcessor module for processing files
 *
 * @module modules/file/file-processor
 * @requires config/index
 * @requires modules/text/text-processor-worker
 * @requires utils/base
 */

import * as CONFIG from "../../config/index.js";
import { TextProcessorWorker } from "../text/text-processor-worker.js";
import { randomFloatFromInterval, addFootnotesToDOM, triggerCustomEvent } from "../../utils/base.js";

/**
 * Chunked file processor
 * @public
 */
export class FileProcessor {
    /**
     * Constructor
     * @param {File} file
     * @public
     */
    constructor(file) {
        this.worker = this.#createWorker();

        this.file = file;
        this.sampleSize = CONFIG.CONST_FILE.LOOKUP_SAMPLE_SMALL;
        this.fileSample = this.file.slice(0, this.sampleSize);
        this.initialChunkSize = 1024 * 1024; // 1MB
        this.initialChunk = this.file.slice(0, this.initialChunkSize);
        this.initialChunkLineOffset = this.file.size <= this.initialChunkSize ? 0 : 1; // Ignoring the last line of the initial chunk if file.size <= chunk size. This is to avoid cutting a paragraph in half.

        // Book metadata
        this.encoding = "utf-8";
        this.isEasternLan = true;
        this.bookMetadata = null;
        this.title_page_line_number_offset = 0;
        this.seal_rotate_en = "";
        this.seal_left = -1;

        // Processing state
        this.processedLines = [];
        this.titles = [];
        this.titles_ind = {};
        this.footnotes = [];
        this.footnoteCounter = 0;
        this.currentLineNumber = 0;

        // Pagination
        this.pageBreaks = [];
        this.prevChunkInfo = {
            startLine: 0,
            content: [],
            titles: [],
            pageBreaks: [],
        };
        this.OVERLAP_SIZE = 0.2; // 20% overlap

        // Flags
        this.isProcessingComplete = false;
        this.isInitialChunkProcessed = false;
    }

    /**
     * Detect file encoding and language
     * @returns {Promise<void>}
     * @public
     */
    async detectEncodingAndLanguage() {
        try {
            const buffer = await this.fileSample.arrayBuffer();
            let tempBuffer = new Uint8Array(buffer);

            // If sample is too small, copy until reaching required size
            while (tempBuffer.byteLength < CONFIG.CONST_FILE.LOOKUP_SAMPLE_SMALL) {
                tempBuffer = new Uint8Array([...tempBuffer, ...tempBuffer]);
            }

            const text = String.fromCharCode.apply(null, tempBuffer);
            const detected = jschardet.detect(text).encoding || "utf-8";
            this.encoding = detected.toLowerCase() === "ascii" ? "utf-8" : detected;
            this.isEasternLan = TextProcessorWorker.getLanguage(new TextDecoder(this.encoding).decode(tempBuffer));
        } catch (error) {
            console.error("Error detecting encoding:", error);
            this.encoding = "utf-8";
            this.isEasternLan = true;
        }
        this.#handleLanguageDetection();
    }

    /**
     * Process book metadata
     * @returns {Promise<void>}
     * @public
     */
    async processBookMetadata() {
        return new Promise((resolve, reject) => {
            const handler = (e) => {
                const { type, bookName, author, bookNameRE, authorRE, error } = e.data;

                if (type === "metadataProcessed") {
                    this.worker.onmessage = null;
                    this.bookMetadata = { bookName, author, bookNameRE, authorRE };
                    this.title_page_line_number_offset = author !== "" ? 3 : 2;
                    this.seal_rotate_en = `${randomFloatFromInterval(-50, 80)}deg`;
                    this.seal_left = randomFloatFromInterval(0, 1);
                    resolve();
                } else if (type === "error") {
                    reject(new Error(error));
                }
            };

            this.worker.onmessage = handler;
            this.worker.postMessage({
                operation: "processMetadata",
                fileName: this.file.name,
            });
        });
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

        return this.#processInitialChunk({
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
        // Generate end page
        const endPageResult = await this.#generateEndPage();
        return this.#processRemainingContent({
            titlePageLines: null,
            titlePageTitles: null,
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
            prevChunkInfo: this.prevChunkInfo,
        };

        return this.#processContent("processInitialChunk", options, extraContent);
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
            chunkStart: this.initialChunkSize,
            prevChunkInfo: this.prevChunkInfo,
        };

        return this.#processContent("processRemainingContent", options, extraContent);
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
        const responseType =
            operation === "processInitialChunk" ? "initialChunkProcessed" : "remainingContentProcessed";

        return new Promise((resolve, reject) => {
            const handler = (e) => {
                const {
                    type,
                    lines,
                    titles,
                    titles_ind,
                    currentLineNumber,
                    footnoteCounter,
                    footnotes,
                    pageBreaks,
                    prevContentStartLineNumber,
                    prevContentLines,
                    prevContentTitles,
                    prevContentPageBreaks,
                    error,
                } = e.data;

                if (type === responseType) {
                    this.worker.onmessage = null;
                    this.prevChunkInfo.startLine = prevContentStartLineNumber;
                    this.prevChunkInfo.content = prevContentLines;
                    this.prevChunkInfo.titles = prevContentTitles;
                    this.prevChunkInfo.pageBreaks = prevContentPageBreaks;

                    // Merge processing results
                    this.processedLines = this.processedLines.concat(lines);
                    this.titles = this.titles.concat(titles);
                    this.titles_ind = { ...this.titles_ind, ...titles_ind };
                    this.footnotes = this.footnotes.concat(footnotes);
                    this.footnoteCounter += footnoteCounter;
                    this.currentLineNumber = currentLineNumber;
                    this.pageBreaks = this.pageBreaks.concat(pageBreaks);

                    // Add footnotes to DOM
                    addFootnotesToDOM(this.footnotes, CONFIG.DOM_ELEMENT.FOOTNOTE_CONTAINER);

                    if (operation === "processRemainingContent") {
                        this.isProcessingComplete = true;
                    }

                    resolve({ lines, titles, titles_ind, currentLineNumber, footnoteCounter, footnotes, pageBreaks });
                } else if (type === "error") {
                    reject(new Error(error));
                }
            };

            this.worker.onmessage = handler;
            this.worker.postMessage({
                operation,
                ...options,
                extraContent,
                overlapSize: this.OVERLAP_SIZE,
                encoding: this.encoding,
                isEasternLan: this.isEasternLan,
                metadata: this.bookMetadata,
                startLineNumber: this.currentLineNumber,
                startTitleIndex: this.titles.length,
                title_page_line_number_offset: this.title_page_line_number_offset,
                pageBreakOnTitle: CONFIG.RUNTIME_CONFIG.PAGE_BREAK_ON_TITLE,
            });
        });
    }

    /**
     * Handle language detection
     * @private
     */
    #handleLanguageDetection() {
        // Change UI language based on detected language... or not?
        // CONFIG.RUNTIME_VARS.RESPECT_USER_LANG_SETTING = (document.documentElement.getAttribute("respectUserLangSetting") === "true");
        if (!CONFIG.RUNTIME_VARS.RESPECT_USER_LANG_SETTING) {
            triggerCustomEvent("updateUILanguage", {
                lang: this.isEasternLan ? "zh" : "en",
                saveToLocalStorage: false,
            });
        }
    }

    /**
     * Generate title page
     * @returns {Promise<{lines: Array<string>, titles: Array<Array<number>>}>}
     * @private
     */
    async #generateTitlePage() {
        return new Promise((resolve, reject) => {
            const handler = (e) => {
                const { type, titlePageLines, error } = e.data;

                if (type === "titlePageGenerated") {
                    this.worker.onmessage = null;

                    // // Insert title page at the beginning
                    // this.processedLines.unshift(...titlePageLines);

                    // // Update title list
                    // this.titles.unshift([CONFIG.RUNTIME_VARS.STYLE.ui_titlePage, 0, CONFIG.RUNTIME_VARS.STYLE.ui_titlePage]);

                    resolve({
                        lines: titlePageLines,
                        titles: [[CONFIG.RUNTIME_VARS.STYLE.ui_titlePage, 0, CONFIG.RUNTIME_VARS.STYLE.ui_titlePage]],
                    });
                } else if (type === "error") {
                    reject(new Error(error));
                }
            };

            this.worker.onmessage = handler;

            this.worker.postMessage({
                operation: "generateTitlePage",
                metadata: this.bookMetadata,
                styles: {
                    h1_lineHeight: CONFIG.RUNTIME_VARS.STYLE.h1_lineHeight,
                },
            });
        });
    }

    /**
     * Generate end page
     * @returns {Promise<{lines: Array<string>, titles: Array<Array<number>>}>}
     * @private
     */
    async #generateEndPage() {
        return new Promise((resolve, reject) => {
            const handler = (e) => {
                const { type, endPageLine, error } = e.data;

                if (type === "endPageGenerated") {
                    this.worker.onmessage = null;

                    // // Add end page at the end
                    // this.processedLines.push(endPageLine);

                    // // Update title list
                    // this.titles.push([CONFIG.RUNTIME_VARS.STYLE.ui_endPage, this.processedLines.length - 1, CONFIG.RUNTIME_VARS.STYLE.ui_endPage]);

                    resolve({
                        lines: [endPageLine],
                        titles: [
                            [
                                CONFIG.RUNTIME_VARS.STYLE.ui_endPage,
                                this.processedLines.length - 1,
                                CONFIG.RUNTIME_VARS.STYLE.ui_endPage,
                            ],
                        ],
                    });
                } else if (type === "error") {
                    reject(new Error(error));
                }
            };

            this.worker.onmessage = handler;

            this.worker.postMessage({
                operation: "generateEndPage",
                totalLines: this.processedLines.length,
            });
        });
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
     * Create worker
     * @returns {Worker}
     * @private
     */
    #createWorker() {
        // Check if running in extension environment
        const isExtension = !!(
            // Test by protocol
            (
                location.protocol === "chrome-extension:" || // Chrome/Edge
                location.protocol === "moz-extension:" || // Firefox
                location.protocol === "safari-extension:" || // Safari
                // Test by runtime API
                (typeof chrome !== "undefined" && chrome?.runtime?.id) || // Chrome/Edge
                (typeof browser !== "undefined" && browser?.runtime?.id) || // Firefox
                (typeof safari !== "undefined" && safari?.extension)
            ) // Safari
        );

        let workerUrl;
        if (isExtension) {
            workerUrl =
                chrome.runtime?.getURL?.("scripts/modules/file/file-processor-worker.js") ||
                browser.runtime?.getURL?.("scripts/modules/file/file-processor-worker.js") ||
                (safari?.extension?.baseURI &&
                    `${safari.extension.baseURI}scripts/modules/file/file-processor-worker.js`);

            if (!workerUrl) {
                throw new Error("Unable to get worker URL in extension environment");
            }
        } else {
            workerUrl = new URL("./file-processor-worker.js", import.meta.url).href;
        }

        // console.log("Worker URL:", workerUrl);
        // console.log("Is Extension:", isExtension);

        // Create worker
        let worker;
        try {
            worker = new Worker(workerUrl, { type: "module" });
        } catch (error) {
            console.error("Error creating worker:", error);
            throw new Error("Failed to create worker: " + error.message);
        }

        // Handle worker errors
        worker.onerror = (error) => {
            console.error("Worker error:", error);
            throw new Error("Worker failed: " + error.message);
        };

        return worker;
    }

    /**
     * Setup event handlers
     * @private
     */
    #setupEventHandlers() {
        this.worker.onerror = (error) => {
            console.error("Worker error:", error);
            throw new Error("Worker failed: " + error.message);
        };
    }
}
