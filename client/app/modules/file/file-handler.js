/**
 * @fileoverview File handler for processing text files and managing book content
 *
 * This module provides utility functions for:
 * - Processing single and multiple file uploads
 * - File content reading and encoding detection
 * - Book metadata extraction
 * - Content processing and pagination
 * - Bookshelf management
 *
 * @module client/app/modules/file/file-handler
 * @requires client/app/config/index
 * @requires shared/utils/logger
 * @requires client/app/modules/features/reader
 * @requires shared/core/callback/callback-registry
 * @requires client/app/modules/text/text-processor
 * @requires client/app/modules/file/file-processor
 * @requires client/app/modules/components/popup-manager
 * @requires client/app/utils/base
 * @requires client/app/utils/helpers-ui
 * @requires client/app/utils/helpers-bookshelf
 * @requires client/app/utils/helpers-reader
 * @requires client/app/utils/helpers-fonts
 */

import * as CONFIG from "../../config/index.js";
import { Logger } from "../../../../shared/utils/logger.js";
import { reader } from "../features/reader.js";
import { cbReg } from "../../../../shared/core/callback/callback-registry.js";
import { TextProcessor } from "../text/text-processor.js";
import { FileProcessor } from "./file-processor.js";
import { PopupManager } from "../components/popup-manager.js";
import { getFootnotes } from "../features/footnotes.js";
import {
    removeFileExtension,
    randomFloatFromInterval,
    formatBytes,
    addFootnotesToDOM,
    pairAnchorsAndFootnotes,
    constructNotificationMessageFromArray,
    isSafari,
} from "../../utils/base.js";
import {
    hideDropZone,
    resetDropZoneState,
    updatePaginationCalculations,
    showLoadingScreen,
    hideLoadingScreen,
    hideContent,
    showContent,
    resetUI,
    resetVars,
    getCurrentDisplayLanguage,
} from "../../utils/helpers-ui.js";
import {
    getIsFromLocal,
    getIsOnServer,
    setIsFromLocal,
    setIsOnServer,
    setBookLastReadTimestamp,
} from "../../utils/helpers-bookshelf.js";
import {
    GetScrollPositions,
    getHistory,
    getHistoryAndSetChapterTitleActive,
    setTitle,
} from "../../utils/helpers-reader.js";
import { validateFontFile } from "../../utils/helpers-fonts.js";

/**
 * @class FileHandler
 * @classdesc Handles file uploads and processing
 */
export class FileHandler {
    /**
     * Logger
     * @private
     * @type {Logger}
     */
    static #logger = Logger.getLogger(this, false);

    /**
     * Flag for database save complete
     * @private
     * @type {boolean}
     */
    static #dbSaveComplete = false;

    /**
     * Flag for processing complete
     * @private
     * @type {boolean}
     */
    static #processingComplete = false;

    /**
     * Mark database save complete
     */
    static markDBSaveComplete() {
        this.#logger.log("FileHandler markDBSaveComplete");
        this.#dbSaveComplete = true;
        this.#checkShowBookshelfBtn();
    }

    /**
     * Mark processing complete
     */
    static markProcessingComplete() {
        this.#logger.log("FileHandler markProcessingComplete");
        this.#processingComplete = true;
        this.#checkShowBookshelfBtn();
    }

    /**
     * Check and show bookshelf trigger button
     */
    static #checkShowBookshelfBtn() {
        this.#logger.log("FileHandler #checkShowBookshelfBtn");
        if (this.#dbSaveComplete && this.#processingComplete) {
            this.#logger.log("FileHandler #checkShowBookshelfBtn callbackRegistry.fire");
            cbReg.go("showBookshelfTriggerBtn");
            this.#dbSaveComplete = false;
            this.#processingComplete = false;
        }
    }

    /**
     * Handles multiple file uploads with bookshelf integration
     * @param {FileList} fileList - List of files to process
     * @param {boolean} isFromLocal - Whether files are from local storage
     * @param {boolean} isOnServer - Whether files are stored on server
     * @param {boolean} loadFiles - Whether to load files into memory
     * @returns {Promise<void>}
     */
    static async handleMultipleFiles(fileList, isFromLocal = true, isOnServer = false, loadFiles = true) {
        // Show loading screen
        hideDropZone();
        hideContent();
        showLoadingScreen();

        // Processing input files
        const allFiles = Array.from(fileList);
        let txtFiles = allFiles.filter((file) => file.type === CONFIG.CONST_FILE.SUPPORTED_FILE_TYPE);
        const otherFiles = allFiles.filter((file) => file.type !== CONFIG.CONST_FILE.SUPPORTED_FILE_TYPE);
        // const fontFiles = allFiles.filter((file) => CONFIG.CONST_FONT.SUPPORTED_FONT_TYPES.includes(file.type));

        // Validate font files
        const fontValidationResults = await Promise.all(
            otherFiles.map(async (file) => {
                const isSupportedType = CONFIG.CONST_FONT.SUPPORTED_FONT_TYPES.includes(file.type);
                const validation = await validateFontFile(file);
                const isValidFont = validation.isValid;
                const reason = validation.reason;

                // console.log(`File: ${file.name}, isSupportedType: ${isSupportedType}, isValidFont: ${isValidFont}`);
                // return isSupportedType || isValidFont;
                // return isValidFont;
                return validation;
            })
        );
        // console.log("fontValidationResults: ", fontValidationResults);

        // Filter out invalid font files
        // const fontFiles = otherFiles.filter((_, index) => fontValidationResults[index].isValid);
        const fontFiles = [];
        const incorrectFonts = [];
        const invalidFiles = [];
        fontValidationResults.forEach((result, index) => {
            if (result.isValid) {
                fontFiles.push(otherFiles[index]);
            } else {
                if (result.type === 0) {
                    incorrectFonts.push(otherFiles[index].name);
                } else {
                    invalidFiles.push(otherFiles[index].name);
                }
            }
        });

        // console.groupCollapsed("[Input Files]");
        // console.log("allFiles: ", allFiles);
        // console.log("txtFiles: ", txtFiles);
        // console.log("fontFiles: ", fontFiles);
        // console.log("incorrectFonts: ", incorrectFonts);
        // console.log("invalidFiles: ", invalidFiles);
        // console.groupEnd();

        // Handle incorrect font files
        if (incorrectFonts.length > 0) {
            if (isSafari()) {
                PopupManager.showNotification({
                    iconName: "SAFARI",
                    iconColor: "error",
                    text: constructNotificationMessageFromArray(
                        CONFIG.RUNTIME_VARS.STYLE.ui_notification_text_fontNotSupportedInSafari,
                        incorrectFonts,
                        {
                            language: getCurrentDisplayLanguage(),
                            maxItems: 3,
                            messageSuffix: CONFIG.RUNTIME_VARS.STYLE.ui_notification_text_andMore,
                        }
                    ),
                });
            } else {
                PopupManager.showNotification({
                    iconName: "FONT_FILE_INVALID",
                    iconColor: "error",
                    text: constructNotificationMessageFromArray(
                        CONFIG.RUNTIME_VARS.STYLE.ui_notification_text_fontFileInvalid,
                        incorrectFonts,
                        {
                            language: getCurrentDisplayLanguage(),
                            maxItems: 3,
                            messageSuffix: CONFIG.RUNTIME_VARS.STYLE.ui_notification_text_andMore,
                        }
                    ),
                });
            }
        }

        // Handle invalid files
        if (invalidFiles.length > 0) {
            PopupManager.showNotification({
                iconName: "WRONG_FILE_TYPE",
                iconColor: "error",
                text: constructNotificationMessageFromArray(
                    CONFIG.RUNTIME_VARS.STYLE.ui_notification_text_wrongFileType,
                    invalidFiles,
                    {
                        language: getCurrentDisplayLanguage(),
                        maxItems: 3,
                        messageSuffix: CONFIG.RUNTIME_VARS.STYLE.ui_notification_text_andMore,
                    }
                ),
            });
        }

        // Handle text file size limit
        const largeTxtFiles = txtFiles.filter((file) => file.size > CONFIG.CONST_FILE.MAX_FILE_SIZE);
        if (largeTxtFiles.length > 0) {
            // Remove large txt files from txtFiles
            txtFiles = txtFiles.filter((file) => !largeTxtFiles.includes(file));

            PopupManager.showNotification({
                iconName: "WRONG_FILE_TYPE",
                iconColor: "error",
                text: constructNotificationMessageFromArray(
                    CONFIG.RUNTIME_VARS.STYLE.ui_notification_text_fileSizeLimit,
                    largeTxtFiles.map((file) => file.name),
                    {
                        language: getCurrentDisplayLanguage(),
                        maxItems: 3,
                        messageSuffix: CONFIG.RUNTIME_VARS.STYLE.ui_notification_text_andMore,
                    }
                ),
            });
        }

        // Check if there are no valid files
        if (txtFiles.length === 0 && fontFiles.length === 0 && fileList.length > 0) {
            // Hide loading screen
            resetDropZoneState();
            hideLoadingScreen();

            return;
        }

        // Handle font files
        if (fontFiles.length > 0) {
            // await resetUI();
            cbReg.go("handleMultipleFonts", {
                files: fontFiles,
            });
        }

        // Check if there are no valid text files
        if (txtFiles.length === 0) {
            // Hide loading screen
            resetDropZoneState();
            hideLoadingScreen();

            return;
        }

        // Handle text files
        if (txtFiles.length > 1 || isOnServer) {
            resetVars();
            // Trigger different events based on whether files should be loaded
            const eventName = loadFiles ? "handleMultipleBooks" : "handleMultipleBooksWithoutLoading";
            cbReg.go(eventName, {
                files: txtFiles,
                isFromLocal,
                isOnServer,
            });

            if (eventName !== "handleMultipleBooksWithoutLoading") {
                PopupManager.showNotification({
                    iconName: "BOOK",
                    text: constructNotificationMessageFromArray(
                        CONFIG.RUNTIME_VARS.STYLE.ui_notification_text_bookAdded,
                        txtFiles.map((file) => file.name),
                        {
                            language: getCurrentDisplayLanguage(),
                            maxItems: 3,
                            messageSuffix: CONFIG.RUNTIME_VARS.STYLE.ui_notification_text_andMore,
                        }
                    ),
                });
            }
        } else if (loadFiles && txtFiles.length === 1) {
            resetVars();
            const singleFile = txtFiles[0];
            setIsFromLocal(singleFile.name, getIsFromLocal(singleFile.name) || isFromLocal);
            setIsOnServer(singleFile.name, getIsOnServer(singleFile.name) || isOnServer);
            setBookLastReadTimestamp(singleFile.name);

            // PopupManager.showNotification({
            //     iconName: "BOOK",
            //     text: constructNotificationMessageFromArray(
            //         CONFIG.RUNTIME_VARS.STYLE.ui_notification_text_bookAdded,
            //         [singleFile.name],
            //         {
            //             language: getCurrentDisplayLanguage(),
            //             maxItems: 3,
            //             messageSuffix: CONFIG.RUNTIME_VARS.STYLE.ui_notification_text_andMore,
            //         }
            //     ),
            // });

            await FileHandler.handleSelectedFile(txtFiles);
        } else {
            console.log("No valid file selected.");
            await resetUI();
        }
    }

    /**
     * Handles a single selected file for reading using chunked processing
     * @param {FileList} fileList - List containing single file to process
     * @param {boolean} isEastern - Whether the file is eastern language
     * @param {string} encoding - The encoding of the file
     * @returns {Promise<void>}
     */
    static async handleSelectedFile(fileList, isEastern = null, encoding = null, forceRefresh = false) {
        /**
         * Metrics for file processing
         * @private
         * @type {Object}
         * @property {number} fileSize - Size of the file in bytes
         * @property {number} startTime - Start time of the file processing
         * @property {Object} timings - Timings for each step of the file processing
         */
        const metrics = {
            fileSize: 0,
            startTime: performance.now(),
            timings: {},
        };

        /**
         * Logs the timing for a specific label
         * @private
         * @param {string} label - Label for the timing
         * @param {number} startTime - Start time of the timing
         */
        function logTiming(label, startTime) {
            metrics.timings[label] = performance.now() - startTime;
        }

        /**
         * Finalizes and displays the metrics
         * @private
         * @returns {Promise<void>}
         */
        async function finalizeMetrics() {
            // Wait for one frame to ensure all rendering is complete
            await new Promise(requestAnimationFrame);

            const totalTime = performance.now() - metrics.startTime;

            const metricsData = {
                "File name": metrics.fileName,
                "File size": `${formatBytes(metrics.fileSize)}`,
                "Total time": `${(totalTime / 1000).toFixed(3)} sec`,
                ...Object.fromEntries(
                    Object.entries(metrics.timings)
                        .sort(([, a], [, b]) => b - a)
                        .map(([label, time]) => [label, `${(time / 1000).toFixed(3)} sec`])
                ),
            };

            console.groupCollapsed("[File Processing Metrics]");
            console.table(metricsData);
            console.groupEnd();
        }

        /**
         * Finalizes the file processing and displays the metrics
         * @private
         * @returns {Promise<void>}
         */
        async function finalProcessing() {
            // Hide loading screen
            FileHandler.#deferUIUpdate(() => {
                hideDropZone(false);
                hideLoadingScreen(false);
                showContent();
            });
            await cbReg.go("fileAfter");

            if (!CONFIG.VARS.FILENAME) {
                throw new Error("Error processing file. No filename found.");
            }

            // Trigger saveProcessedBook event
            cbReg.go("saveProcessedBook", {
                name: CONFIG.VARS.FILENAME,
                is_eastern_lan: CONFIG.VARS.IS_EASTERN_LAN,
                encoding: CONFIG.VARS.ENCODING,
                bookAndAuthor: CONFIG.VARS.BOOK_AND_AUTHOR,
                title_page_line_number_offset: CONFIG.VARS.TITLE_PAGE_LINE_NUMBER_OFFSET,
                seal_rotate_en: CONFIG.RUNTIME_VARS.STYLE.seal_rotate_en,
                seal_left: CONFIG.RUNTIME_VARS.STYLE.seal_left,
                file_content_chunks: CONFIG.VARS.FILE_CONTENT_CHUNKS,
                all_titles: CONFIG.VARS.ALL_TITLES,
                all_titles_ind: CONFIG.VARS.ALL_TITLES_IND,
                footnotes: CONFIG.VARS.FOOTNOTES,
                footnote_processed_counter: CONFIG.VARS.FOOTNOTE_PROCESSED_COUNTER,
                page_breaks: CONFIG.VARS.PAGE_BREAKS,
                total_pages: CONFIG.VARS.TOTAL_PAGES,
            });
            await finalizeMetrics();
        }

        /**
         * Logs the timing for a specific label
         * @private
         * @param {string} label - Label for the timing
         * @param {number} startTime - Start time of the timing
         */
        function logTiming(label, startTime) {
            metrics.timings[label] = performance.now() - startTime;
        }

        /** Start processing */
        if (!fileList.length || fileList[0].type !== CONFIG.CONST_FILE.SUPPORTED_FILE_TYPE) {
            PopupManager.showNotification({
                iconName: "WRONG_FILE_TYPE",
                text: CONFIG.RUNTIME_VARS.STYLE.ui_notification_text_wrongFileType,
                iconColor: "error",
            });

            // Hide loading screen
            resetDropZoneState();
            hideLoadingScreen();

            return;
        }

        try {
            // Show loading screen
            hideDropZone();
            hideContent();
            showLoadingScreen();

            resetVars();

            const file = await cbReg.go("fileBefore", fileList[0]);
            metrics.fileSize = file.size;
            metrics.fileName = file.name;

            // Create processor
            const processor = new FileProcessor(file, isEastern, encoding);
            CONFIG.VARS.IS_BOOK_OPENED = true;

            // Only detect encoding if not provided
            // console.log("isEastern: ", isEastern);
            // console.log("encoding: ", encoding);
            if (isEastern === null || encoding === null) {
                const encodingStart = performance.now();
                await processor.detectEncodingAndLanguage();
                CONFIG.VARS.IS_EASTERN_LAN = processor.isEasternLan;
                CONFIG.VARS.ENCODING = processor.encoding;
                logTiming("Encoding detection", encodingStart);
                // console.log("Encoding:", processor.encoding);
                // console.log("isEasternLan:", processor.isEasternLan);
            } else {
                CONFIG.VARS.IS_EASTERN_LAN = isEastern;
                CONFIG.VARS.ENCODING = encoding;
                processor.isEasternLan = isEastern;
                processor.encoding = encoding;

                // Change UI language based on detected language... or not?
                // CONFIG.RUNTIME_VARS.RESPECT_USER_LANG_SETTING = (document.documentElement.getAttribute("respectUserLangSetting") === "true");
                cbReg.go("updateUILanguage", {
                    lang: getCurrentDisplayLanguage(),
                    saveToLocalStorage: false,
                });
            }

            // Process metadata
            const metadataStart = performance.now();
            await processor.processBookMetadata();
            CONFIG.VARS.BOOK_AND_AUTHOR = processor.bookMetadata;
            CONFIG.VARS.FILENAME = file.name && fileList[0].name;
            CONFIG.VARS.TITLE_PAGE_LINE_NUMBER_OFFSET = processor.title_page_line_number_offset;
            CONFIG.RUNTIME_VARS.STYLE.seal_rotate_en = processor.seal_rotate_en;
            CONFIG.RUNTIME_VARS.STYLE.seal_left = processor.seal_left;
            setTitle(CONFIG.VARS.BOOK_AND_AUTHOR.bookName);
            logTiming("Metadata processing", metadataStart);
            // console.log("Book metadata:", CONFIG.VARS.BOOK_AND_AUTHOR);

            // Process initial chunk
            const initialChunkStart = performance.now();
            const initialChunkResult = await processor.processInitialChunk();
            // console.log("initialChunkResult: ", initialChunkResult);

            // Update global state with initial chunk
            CONFIG.VARS.FILE_CONTENT_CHUNKS = initialChunkResult.htmlLines;
            CONFIG.VARS.ALL_TITLES = initialChunkResult.titles;
            CONFIG.VARS.ALL_TITLES_IND = initialChunkResult.titles_ind;
            FileHandler.#verifyTitleAndIndexCount("[handleSelectedFile initialChunk]");
            CONFIG.VARS.FOOTNOTES = initialChunkResult.footnotes;
            CONFIG.VARS.FOOTNOTE_PROCESSED_COUNTER = initialChunkResult.footnoteCounter;
            CONFIG.VARS.PAGE_BREAKS = initialChunkResult.pageBreaks;
            CONFIG.VARS.TOTAL_PAGES = CONFIG.VARS.PAGE_BREAKS.length;
            logTiming("Initial chunk processing", initialChunkStart);
            // console.log("CONFIG.VARS.PAGE_BREAKS: ", CONFIG.VARS.PAGE_BREAKS);
            // console.log("CONFIG.VARS.TOTAL_PAGES: ", CONFIG.VARS.TOTAL_PAGES);

            // Update UI with initial content
            const initialUIStart = performance.now();

            // Process TOC
            reader.initTOC();
            reader.processTOC();

            // Show initial content
            CONFIG.VARS.INIT = false;
            reader.showCurrentPageContent();
            reader.generatePagination();
            updatePaginationCalculations(false);
            GetScrollPositions(false);
            logTiming("Initial UI update", initialUIStart);

            // If bookshelf and fast open are enabled and history is found within 90% of the initial chunk, show content early without waiting for processing to complete
            const hasHistoryBeyondInitChunk =
                (await getHistory(CONFIG.VARS.FILENAME)) > CONFIG.VARS.FILE_CONTENT_CHUNKS.length * 0.9;
            if (
                CONFIG.RUNTIME_CONFIG.ENABLE_BOOKSHELF &&
                CONFIG.RUNTIME_CONFIG.ENABLE_FAST_OPEN &&
                !hasHistoryBeyondInitChunk
            ) {
                await getHistoryAndSetChapterTitleActive(reader.gotoLine.bind(reader));

                // Hide loading screen
                hideDropZone(false);
                hideLoadingScreen(false);
                showContent();
            }

            // Update pagination UI to show processing state
            if (file.size > processor.initialChunkSize) {
                // Hide bookshelf trigger button if bookshelf is opened
                cbReg.go("hideBookshelfTriggerBtn");

                // Set processing flag
                CONFIG.VARS.IS_PROCESSING = true;

                // Add processing indicator to pagination
                const paginationElement = document.querySelector(".pagination");
                if (paginationElement) {
                    const existingIndicator = CONFIG.DOM_ELEMENT.PAGINATION_INDICATOR;
                    if (!existingIndicator) {
                        const paginationIndicator = document.createElement("div");
                        paginationIndicator.id = "pagination-indicator";
                        const paginationIndicatorSpan = document.createElement("span");
                        paginationIndicatorSpan.classList.add("pagination-processing", "prevent-select");
                        paginationIndicator.appendChild(paginationIndicatorSpan);
                        paginationElement.appendChild(paginationIndicator);

                        // const paginationBorder = document.querySelector("#pagination");
                        // paginationBorder.style.borderColor = CONFIG.RUNTIME_VARS.STYLE.mainColor_active;
                    }
                }
                reader.generatePagination();

                // Process remaining content in background
                const remainingStart = performance.now();

                await processor
                    .processRemainingContent()
                    .then(async (remainingResult) => {
                        // Update global state
                        CONFIG.VARS.FILE_CONTENT_CHUNKS = remainingResult.htmlLines;
                        CONFIG.VARS.ALL_TITLES = remainingResult.titles;
                        CONFIG.VARS.ALL_TITLES_IND = remainingResult.titles_ind;
                        FileHandler.#verifyTitleAndIndexCount("[handleSelectedFile remainingContent]");
                        CONFIG.VARS.FOOTNOTES = remainingResult.footnotes;
                        CONFIG.VARS.FOOTNOTE_PROCESSED_COUNTER = remainingResult.footnoteCounter;
                        CONFIG.VARS.PAGE_BREAKS = remainingResult.pageBreaks;
                        CONFIG.VARS.TOTAL_PAGES = CONFIG.VARS.PAGE_BREAKS.length;
                        // console.log(CONFIG.VARS.PAGE_BREAKS);

                        // Set processing flag to false
                        CONFIG.VARS.IS_PROCESSING = false;

                        // Remove the existing processing indicator
                        FileHandler.#deferUIUpdate(() => {
                            const paginationIndicator = CONFIG.DOM_ELEMENT.PAGINATION_INDICATOR;
                            if (paginationIndicator) {
                                paginationIndicator.remove();
                            }
                        });

                        // Update UI
                        FileHandler.#deferUIUpdate(() => {
                            requestAnimationFrame(() => {
                                reader.processTOC();

                                requestAnimationFrame(() => {
                                    reader.generatePagination();

                                    requestAnimationFrame(() => {
                                        updatePaginationCalculations(false);

                                        requestAnimationFrame(() => {
                                            GetScrollPositions(false);
                                        });
                                    });
                                });
                            });
                        });

                        logTiming("Remaining content processing", remainingStart);
                        // console.log("Background processing complete");
                    })
                    .catch((error) => {
                        throw new Error("Error processing remaining content: " + error);
                    });
            }

            // Show bookshelf trigger button
            // FileHandler.#deferUIUpdate(() => {
            //     cbReg.go("showBookshelfTriggerBtn");
            // });
            FileHandler.markProcessingComplete();

            // Mark DB save complete if forceRefresh is true
            // since when reprocessing, there's no DB event
            if (forceRefresh) {
                FileHandler.markDBSaveComplete();
            }

            // Retrieve reading history
            await getHistoryAndSetChapterTitleActive(reader.gotoLine.bind(reader));

            // Complete initial processing
            await finalProcessing();
        } catch (error) {
            CONFIG.VARS.IS_BOOK_OPENED = false;
            await resetUI();
            throw new Error("Error processing file: " + error);
        }
    }

    /**
     * Handles a processed book
     * @param {Object} book - Processed book data
     * @returns {Promise<void>}
     */
    static async handleProcessedBook(book) {
        // console.log("Processed book: ", book);
        if (book && book?.processed) {
            // Show loading screen
            hideDropZone();
            hideContent();
            showLoadingScreen();

            resetVars();

            CONFIG.VARS.IS_BOOK_OPENED = true;
            CONFIG.VARS.FILENAME = book.name;
            CONFIG.VARS.IS_EASTERN_LAN = book.is_eastern_lan ?? TextProcessor.getLanguage(book.file_content_chunks[0]);
            CONFIG.VARS.ENCODING = book.encoding ?? "utf-8";
            CONFIG.VARS.BOOK_AND_AUTHOR = book.bookAndAuthor;
            CONFIG.VARS.TITLE_PAGE_LINE_NUMBER_OFFSET = book.title_page_line_number_offset;
            CONFIG.RUNTIME_VARS.STYLE.seal_rotate_en = book.seal_rotate_en;
            CONFIG.RUNTIME_VARS.STYLE.seal_left = book.seal_left;
            CONFIG.VARS.FILE_CONTENT_CHUNKS = book.file_content_chunks;
            CONFIG.VARS.ALL_TITLES = book.all_titles;
            CONFIG.VARS.ALL_TITLES_IND = book.all_titles_ind;
            FileHandler.#verifyTitleAndIndexCount("[handleProcessedBook]");
            CONFIG.VARS.FOOTNOTES = book.footnotes;
            CONFIG.VARS.FOOTNOTE_PROCESSED_COUNTER = book.footnote_processed_counter;
            CONFIG.VARS.PAGE_BREAKS = book.page_breaks;
            CONFIG.VARS.TOTAL_PAGES = book.total_pages;

            // Set title
            setTitle(CONFIG.VARS.BOOK_AND_AUTHOR.bookName);

            // console.log("isEasternLan: ", CONFIG.VARS.IS_EASTERN_LAN);
            // Change UI language based on detected language... or not?
            // CONFIG.RUNTIME_VARS.RESPECT_USER_LANG_SETTING = (document.documentElement.getAttribute("respectUserLangSetting") === "true");
            cbReg.go("updateUILanguage", {
                lang: getCurrentDisplayLanguage(),
                saveToLocalStorage: false,
            });

            // [Deprecated] Add footnotes to DOM
            // addFootnotesToDOM(CONFIG.VARS.FOOTNOTES, CONFIG.DOM_ELEMENT.FOOTNOTE_CONTAINER);
            // [New] Set the lookup function for the current chunk/footnotes
            const pairedFootnotes = pairAnchorsAndFootnotes(CONFIG.VARS.FOOTNOTES);
            getFootnotes().setFootnoteLookup((markerCode, index) => {
                index = Number(index);
                return pairedFootnotes[markerCode]?.[index] || CONFIG.CONST_FOOTNOTE.NOTFOUND;
            });

            // Process TOC
            reader.initTOC();
            reader.processTOC();

            // Show initial content
            CONFIG.VARS.INIT = false;
            reader.showCurrentPageContent();
            reader.generatePagination();
            updatePaginationCalculations(false);
            GetScrollPositions(false);

            // Retrieve reading history
            await getHistoryAndSetChapterTitleActive(reader.gotoLine.bind(reader));

            // Hide loading screen
            hideDropZone();
            hideLoadingScreen();
            showContent();
            await cbReg.go("fileAfter");
        } else {
            await FileHandler.handleSelectedFile([book?.data], null, null, true);
        }
    }

    /**
     * Checks if CONFIG.VARS.ALL_TITLES and CONFIG.VARS.ALL_TITLES_IND length match
     * @param {string} messageHeader - Message header
     * @throws {Error} If all titles and CONFIG.VARS.ALL_TITLES_IND length mismatch
     */
    static #verifyTitleAndIndexCount(messageHeader) {
        if (CONFIG.VARS.ALL_TITLES.length !== Object.keys(CONFIG.VARS.ALL_TITLES_IND).length) {
            console.log("CONFIG.VARS.ALL_TITLES: ", CONFIG.VARS.ALL_TITLES.length, CONFIG.VARS.ALL_TITLES);
            console.log(
                "CONFIG.VARS.ALL_TITLES_IND: ",
                Object.keys(CONFIG.VARS.ALL_TITLES_IND).length,
                CONFIG.VARS.ALL_TITLES_IND
            );
            throw new Error(`${messageHeader} All titles and all titles indices length mismatch.`);
        }
    }

    /**
     * Defers UI update if an animation is in progress
     * @param {Function} updateFn - The function to execute
     * @param {boolean} consoleLog - Whether to log to console
     */
    static #deferUIUpdate(updateFn, consoleLog = false) {
        if (PopupManager.isAnimating) {
            if (consoleLog) {
                // Extract operation name and categorize
                let operationName = updateFn
                    .toString()
                    .replace(/\s+/g, " ")
                    .match(/=>.*?{(.*?)}/)?.[1];

                // Add icon and categorize based on operation type
                let formattedOperation;
                if (operationName?.includes("requestAnimationFrame")) {
                    formattedOperation =
                        "🔄 Heavy UI Updates: " + operationName.match(/reader\.\w+|update\w+|Get\w+/g)?.join(" → ");
                } else if (operationName?.includes("hideDropZone") || operationName?.includes("showContent")) {
                    formattedOperation = "👁️ Visibility: " + operationName.match(/hide\w+|show\w+/g)?.join(", ");
                } else if (operationName?.includes("paginationIndicator")) {
                    formattedOperation = "🧹 Cleanup: remove pagination indicator";
                } else if (operationName?.includes("triggerCustomEvent") || operationName?.includes("cbReg.go")) {
                    formattedOperation = "🔔 Event: " + operationName.match(/"([^"]+)"/)?.[1];
                }

                console.log("[UI Update] Deferring:", {
                    operations: formattedOperation || "anonymous function",
                    time: new Date().toLocaleTimeString("en-US", {
                        hour12: false,
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                    }),
                    queueSize: PopupManager.pendingUIUpdates.size + 1,
                });
            }

            PopupManager.pendingUIUpdates.add(updateFn);
        } else {
            updateFn();
        }
    }
}
