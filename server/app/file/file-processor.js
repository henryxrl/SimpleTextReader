/**
 * @fileoverview File processor module for processing files
 *
 * @module server/app/file/file-processor
 * @requires shared/utils/logger
 * @requires shared/core/file/file-processor-core
 * @requires server/app/config/runtime-config
 * @requires client/app/utils/base
 * @requires server/app/websocket/websocket-server
 */

import { Logger } from "../../../shared/utils/logger.js";
import { FileProcessorCore } from "../../../shared/core/file/file-processor-core.js";
import { runtimeConfig } from "../config/runtime-config.js";
import { randomFloatFromInterval } from "../../../client/app/utils/base.js";
import { WebSocketServer } from "../websocket/websocket-server.js";

/**
 * File processor
 * @public
 */
export class FileProcessor extends FileProcessorCore {
    /**
     * @private
     * @type {Logger} Logger instance
     * @static
     */
    static #logger = Logger.getLogger(FileProcessor, false);

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
        this.runtimeConfig = null;
        this.config = null;
    }

    /**
     * Initialize config
     * @returns {void}
     * @private
     */
    async #initConfig() {
        await runtimeConfig.waitForReady();
        this.runtimeConfig = runtimeConfig.config;

        this.config = {
            CONST_PAGINATION: this.runtimeConfig.CONST_PAGINATION,
            RUNTIME_VARS: {
                STYLE: {
                    h1_lineHeight: this.runtimeConfig.STYLE["--h1_lineHeight"],
                    ui_titlePage: this.runtimeConfig.STYLE["--ui_titlePage"],
                    ui_endPage: this.runtimeConfig.STYLE["--ui_endPage"],
                },
            },
            RUNTIME_CONFIG: {
                PAGE_BREAK_ON_TITLE: this.runtimeConfig.PAGE_BREAK_ON_TITLE,
            },
            VARS: {
                IS_EASTERN_LAN: this.isEasternLan,
                BOOK_AND_AUTHOR: this.bookMetadata,
            },
        };

        // this.#logger.log("Config initialized:", this.config);
        // this.#logger.log("Runtime config:", this.runtimeConfig);
    }

    /**
     * Detect file encoding and language
     * @returns {Promise<void>}
     * @public
     */
    async detectEncodingAndLanguage() {
        // this.#logger.log("detectEncodingAndLanguage");

        await super.detectEncodingAndLanguage(this.file);

        // this.#logger.log("Detected:", {
        //     encoding: this.encoding,
        //     isEasternLan: this.isEasternLan,
        // });
    }

    /**
     * Process book metadata
     * @returns {Promise<void>}
     * @public
     */
    processBookMetadata() {
        const { bookName, author, bookNameRE, authorRE } = FileProcessorCore.getBookNameAndAuthor(this.file.name);

        this.bookMetadata = { bookName, author, bookNameRE, authorRE };
        this.title_page_line_number_offset = author !== "" ? 3 : 2;
        this.seal_rotate_en = `${randomFloatFromInterval(-50, 80)}deg`;
        this.seal_left = randomFloatFromInterval(0, 1);
    }

    /**
     * Process remaining content
     * @param {Object} options - Options for processing content
     * @returns {Promise<Object>}
     * @public
     */
    async processContent(options = {}) {
        // Set config vars
        this.config.VARS.IS_EASTERN_LAN = this.isEasternLan;
        this.config.VARS.BOOK_AND_AUTHOR = this.bookMetadata;

        const language = this.isEasternLan ? "zh" : "en";
        this.config.RUNTIME_VARS.STYLE.ui_titlePage = this.runtimeConfig.STYLE[`--ui_titlePage_${language}`];
        this.config.RUNTIME_VARS.STYLE.ui_endPage = this.runtimeConfig.STYLE[`--ui_endPage_${language}`];

        // Generate title page and end page
        const titlePageResult = this.#generateTitlePage();
        const endPageResult = this.#generateEndPage();

        const result = await super.processChunk(this.file, {
            extraContent: {
                titlePageLines: titlePageResult.lines,
                titlePageTitles: titlePageResult.titles,
                endPageLines: endPageResult.lines,
                endPageTitles: endPageResult.titles,
            },
            sliceLineOffset: 0,
            title_page_line_number_offset: this.title_page_line_number_offset,
            pageBreakOnTitle: this.config.RUNTIME_CONFIG.PAGE_BREAK_ON_TITLE,
            CONFIG: this.config,
            isInitialChunk: false,
            forcePatternDetection: true,
            progressCallback: (progress) => {
                if (options.progressCallback) {
                    options.progressCallback(progress);
                } else {
                    WebSocketServer.broadcast("processingProgress", {
                        bookName: this.file.name,
                        ...progress,
                    });
                }
            },
        });

        // Merge processing results
        this.processedLines = result.htmlLines;
        this.titles = result.titles;
        this.titles_ind = result.titles_ind;
        this.footnotes = result.footnotes;
        this.footnoteCounter = result.footnoteCounter;
        this.pageBreaks = result.pageBreaks;
        this.isProcessingComplete = true;

        return result;
    }

    /**
     * Generate title page
     * @returns {Promise<{lines: Array<string>, titles: Array<Array<number>>}>}
     * @private
     */
    #generateTitlePage() {
        const titlePageLines = FileProcessorCore.generateTitlePage(this.bookMetadata, {
            h1_lineHeight: this.config.RUNTIME_VARS.STYLE.h1_lineHeight,
        });

        return {
            lines: titlePageLines,
            titles: [
                [this.config.RUNTIME_VARS.STYLE.ui_titlePage, 0, this.config.RUNTIME_VARS.STYLE.ui_titlePage, false],
            ],
        };
    }

    /**
     * Generate end page
     * @returns {Promise<{lines: Array<string>, titles: Array<Array<number>>}>}
     * @private
     */
    #generateEndPage() {
        const endPageLine = FileProcessorCore.generateEndPage(this.processedLines.length);

        return {
            lines: [endPageLine],
            titles: [
                [
                    this.config.RUNTIME_VARS.STYLE.ui_endPage,
                    this.processedLines.length - 1,
                    this.config.RUNTIME_VARS.STYLE.ui_endPage,
                    false,
                ],
            ],
        };
    }

    /**
     * Main processing method
     * @returns {Promise<Object>}
     */
    async process() {
        try {
            // Broadcast initial processing progress
            WebSocketServer.broadcast("processingProgress", {
                bookName: this.file.name,
                percentage: 0,
                stage: "initializing",
            });

            // 0. Wait for runtime config to be ready
            await this.#initConfig();
            WebSocketServer.broadcast("processingProgress", {
                bookName: this.file.name,
                percentage: 2,
                stage: "initializing",
            });

            // 1. Detect encoding and language
            await this.detectEncodingAndLanguage();
            WebSocketServer.broadcast("processingProgress", {
                bookName: this.file.name,
                percentage: 5,
                stage: "detected_encoding",
            });

            // 2. Process metadata
            this.processBookMetadata();
            WebSocketServer.broadcast("processingProgress", {
                bookName: this.file.name,
                percentage: 10,
                stage: "metadata_processed",
            });

            // 3. Process file content
            const processedResult = await this.processContent({
                progressCallback: (progress) => {
                    // Map progress.percentage to 10-80
                    const adjustedPercentage = 10 + progress.percentage * 0.7; // 0.7 = (80-10)/100
                    WebSocketServer.broadcast("processingProgress", {
                        bookName: this.file.name,
                        percentage: adjustedPercentage,
                        stage: progress.stage,
                    });
                },
            });
            WebSocketServer.broadcast("processingProgress", {
                bookName: this.file.name,
                percentage: 80,
                stage: "processing_complete",
            });

            // 4. Return processing result
            return {
                encoding: this.encoding,
                isEasternLan: this.isEasternLan,
                bookMetadata: this.bookMetadata,
                pageBreakOnTitle: this.config.RUNTIME_CONFIG.PAGE_BREAK_ON_TITLE,
                title_page_line_number_offset: this.title_page_line_number_offset,
                seal_rotate_en: this.seal_rotate_en,
                seal_left: this.seal_left,
                processedResult: processedResult,
                isComplete: this.isProcessingComplete,
                fileSize: this.fileSize,
            };
        } catch (error) {
            WebSocketServer.broadcast("processingProgress", {
                bookName: this.file.name,
                percentage: 0,
                stage: "error",
                error: error.message,
            });

            console.error("Error in file processing:", error);
            throw error;
        }
    }
}
