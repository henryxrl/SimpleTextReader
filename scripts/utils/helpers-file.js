/**
 * @fileoverview File handling helper functions for processing text files and managing book content
 *
 * This module provides utility functions for:
 * - Processing single and multiple file uploads
 * - File content reading and encoding detection
 * - Book metadata extraction
 * - Content processing and pagination
 * - Bookshelf management
 *
 * @module utils/helpers-file
 * @requires config/index
 * @requires modules/features/reader
 * @requires modules/file/fileload-callback
 * @requires modules/text/text-processor
 * @requires modules/file/file-processor
 * @requires utils/base
 * @requires utils/helpers-ui
 * @requires utils/helpers-bookshelf
 * @requires utils/helpers-reader
 */

import * as CONFIG from "../config/index.js";
import { reader } from "../modules/features/reader.js";
import { FileLoadCallback } from "../modules/file/fileload-callback.js";
import { TextProcessor } from "../modules/text/text-processor.js";
import { FileProcessor } from "../modules/file/file-processor.js";
import {
    removeFileExtension,
    randomFloatFromInterval,
    formatBytes,
    addFootnotesToDOM,
    triggerCustomEvent,
} from "./base.js";
import {
    hideDropZone,
    updateTOCUI,
    showLoadingScreen,
    hideLoadingScreen,
    hideContent,
    showContent,
    resetUI,
} from "./helpers-ui.js";
import {
    getIsFromLocal,
    getIsOnServer,
    setIsFromLocal,
    setIsOnServer,
    setBookLastReadTimestamp,
} from "./helpers-bookshelf.js";
import { GetScrollPositions, getHistory, getHistoryAndSetChapterTitleActive, setTitle } from "./helpers-reader.js";

/**
 * Handles multiple file uploads with bookshelf integration
 * @param {FileList} fileList - List of files to process
 * @param {boolean} isFromLocal - Whether files are from local storage
 * @param {boolean} isOnServer - Whether files are stored on server
 * @param {number} num_load_batch - Number of files to load in each batch
 * @returns {Promise<void>}
 */
export async function handleMultipleFiles(fileList, isFromLocal = true, isOnServer = false) {
    const files = Array.prototype.slice.call(fileList).filter((file) => file.type === "text/plain");
    // console.log("files: ", files);
    if (files.length > 1) {
        triggerCustomEvent("handleMultipleBooks", {
            files,
            isFromLocal,
            isOnServer,
        });
    } else if (files.length === 1) {
        const singleFile = files[0];
        setIsFromLocal(singleFile.name, getIsFromLocal(singleFile.name) || isFromLocal);
        setIsOnServer(singleFile.name, getIsOnServer(singleFile.name) || isOnServer);
        setBookLastReadTimestamp(singleFile.name);
        await handleSelectedFile(files);
    } else {
        console.log("No valid file selected.");
        resetUI();
    }
}

/**
 * Handles multiple files without loading them into memory
 * Used for bookshelf display and management
 * @param {FileList} fileList - List of files to process
 * @param {boolean} isFromLocal - Whether files are from local storage
 * @param {boolean} isOnServer - Whether files are stored on server
 * @returns {Promise<void>}
 */
export async function handleMultipleFilesWithoutLoading(fileList, isFromLocal = true, isOnServer = false) {
    const files = Array.prototype.slice.call(fileList).filter((file) => file.type === "text/plain");
    // console.log("files: ", files);
    if (files.length > 1) {
        triggerCustomEvent("handleMultipleBooksWithoutLoading", {
            files,
            isFromLocal,
            isOnServer,
        });
    }
}

/**
 * Handles a single selected file for reading using chunked processing
 * @param {FileList} fileList - List containing single file to process
 * @returns {Promise<void>}
 */
export async function handleSelectedFile(fileList) {
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
        hideDropZone();
        hideLoadingScreen();
        showContent();
        FileLoadCallback.after();

        if (!CONFIG.VARS.FILENAME) {
            throw new Error("Error processing file. No filename found.");
        }

        // Trigger saveProcessedBook event
        triggerCustomEvent("saveProcessedBook", {
            name: CONFIG.VARS.FILENAME,
            is_eastern_lan: CONFIG.VARS.IS_EASTERN_LAN,
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
    if (!fileList.length || fileList[0].type !== "text/plain") {
        resetUI();
        return;
    }

    try {
        const file = await FileLoadCallback.before(fileList[0]);
        metrics.fileSize = file.size;
        metrics.fileName = file.name;

        // Show loading screen
        hideDropZone();
        hideContent();
        showLoadingScreen();

        // Create processor
        const processor = new FileProcessor(file);

        // Detect encoding
        const encodingStart = performance.now();
        await processor.detectEncodingAndLanguage();
        CONFIG.VARS.IS_EASTERN_LAN = processor.isEasternLan;
        logTiming("Encoding detection", encodingStart);
        // console.log("Encoding:", processor.encoding);
        // console.log("isEasternLan:", processor.isEasternLan);

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
        verifyTitleAndIndexCount("[handleSelectedFile initialChunk]");
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
        updateTOCUI(false);
        GetScrollPositions(false);
        logTiming("Initial UI update", initialUIStart);

        // If bookshelf and fast open are enabled and history is found within 90% of the initial chunk, show content early without waiting for processing to complete
        const hasHistoryBeyondInitChunk =
            getHistory(CONFIG.VARS.FILENAME) > CONFIG.VARS.FILE_CONTENT_CHUNKS.length * 0.9;
        if (
            CONFIG.RUNTIME_CONFIG.ENABLE_BOOKSHELF &&
            CONFIG.RUNTIME_CONFIG.ENABLE_FAST_OPEN &&
            !hasHistoryBeyondInitChunk
        ) {
            getHistoryAndSetChapterTitleActive(reader.gotoLine.bind(reader));
            hideDropZone();
            hideLoadingScreen();
            showContent();
        }

        // Update pagination UI to show processing state
        if (file.size > processor.initialChunkSize) {
            // Hide bookshelf trigger button if bookshelf is opened
            triggerCustomEvent("hideBookshelfTriggerBtn");

            // Set processing flag
            CONFIG.VARS.IS_PROCESSING = true;

            // Add processing indicator to pagination
            const paginationElement = document.querySelector(".pagination");
            if (paginationElement) {
                const existingIndicator = CONFIG.DOM_ELEMENT.PAGINATION_INDICATOR;
                if (!existingIndicator) {
                    const processingItem = document.createElement("div");
                    processingItem.id = "pageProcessing";
                    const processingSpan = document.createElement("span");
                    processingSpan.classList.add("pagination-processing", "prevent-select");
                    processingSpan.textContent = CONFIG.RUNTIME_VARS.STYLE.ui_pagination_processing;
                    processingItem.appendChild(processingSpan);
                    paginationElement.appendChild(processingItem);

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
                    verifyTitleAndIndexCount("[handleSelectedFile remainingContent]");
                    CONFIG.VARS.FOOTNOTES = remainingResult.footnotes;
                    CONFIG.VARS.FOOTNOTE_PROCESSED_COUNTER = remainingResult.footnoteCounter;
                    CONFIG.VARS.PAGE_BREAKS = remainingResult.pageBreaks;
                    CONFIG.VARS.TOTAL_PAGES = CONFIG.VARS.PAGE_BREAKS.length;
                    // console.log(CONFIG.VARS.PAGE_BREAKS);

                    // Set processing flag to false
                    CONFIG.VARS.IS_PROCESSING = false;

                    // Remove the existing processing indicator
                    const processingItem = CONFIG.DOM_ELEMENT.PAGINATION_INDICATOR;
                    if (processingItem) {
                        processingItem.remove();
                    }

                    // Show bookshelf trigger button if bookshelf is closed
                    triggerCustomEvent("showBookshelfTriggerBtn");

                    // Update UI
                    reader.processTOC();
                    reader.generatePagination();
                    updateTOCUI(false);
                    GetScrollPositions(false);

                    logTiming("Remaining content processing", remainingStart);
                    // console.log("Background processing complete");
                })
                .catch((error) => {
                    throw new Error("Error processing remaining content: " + error);
                });
        }

        // Retrieve reading history
        getHistoryAndSetChapterTitleActive(reader.gotoLine.bind(reader));

        // Complete initial processing
        await finalProcessing();
    } catch (error) {
        // hideLoadingScreen();
        throw new Error("Error processing file: " + error);
    }
}

/**
 * Handles a processed book
 * @param {Object} book - Processed book data
 * @returns {Promise<void>}
 */
export async function handleProcessedBook(book) {
    // console.log("Processed book: ", book);
    if (book && book?.processed) {
        // Show loading screen
        hideDropZone();
        hideContent();
        showLoadingScreen();

        CONFIG.VARS.FILENAME = book.name;
        CONFIG.VARS.IS_EASTERN_LAN = book.is_eastern_lan ?? TextProcessor.getLanguage(book.file_content_chunks[0]);
        CONFIG.VARS.BOOK_AND_AUTHOR = book.bookAndAuthor;
        CONFIG.VARS.TITLE_PAGE_LINE_NUMBER_OFFSET = book.title_page_line_number_offset;
        CONFIG.RUNTIME_VARS.STYLE.seal_rotate_en = book.seal_rotate_en;
        CONFIG.RUNTIME_VARS.STYLE.seal_left = book.seal_left;
        CONFIG.VARS.FILE_CONTENT_CHUNKS = book.file_content_chunks;
        CONFIG.VARS.ALL_TITLES = book.all_titles;
        CONFIG.VARS.ALL_TITLES_IND = book.all_titles_ind;
        verifyTitleAndIndexCount("[handleProcessedBook]");
        CONFIG.VARS.FOOTNOTES = book.footnotes;
        CONFIG.VARS.FOOTNOTE_PROCESSED_COUNTER = book.footnote_processed_counter;
        CONFIG.VARS.PAGE_BREAKS = book.page_breaks;
        CONFIG.VARS.TOTAL_PAGES = book.total_pages;

        // Set title
        setTitle(CONFIG.VARS.BOOK_AND_AUTHOR.bookName);

        // console.log("isEasternLan: ", CONFIG.VARS.IS_EASTERN_LAN);
        // Change UI language based on detected language... or not?
        // CONFIG.RUNTIME_VARS.RESPECT_USER_LANG_SETTING = (document.documentElement.getAttribute("respectUserLangSetting") === "true");
        if (!CONFIG.RUNTIME_VARS.RESPECT_USER_LANG_SETTING) {
            // Trigger updateUILanguage event
            triggerCustomEvent("updateUILanguage", {
                lang: CONFIG.VARS.IS_EASTERN_LAN ? "zh" : "en",
                saveToLocalStorage: false,
            });
        }

        // Add footnotes to DOM
        addFootnotesToDOM(CONFIG.VARS.FOOTNOTES, CONFIG.DOM_ELEMENT.FOOTNOTE_CONTAINER);

        // Process TOC
        reader.initTOC();
        reader.processTOC();

        // Show initial content
        CONFIG.VARS.INIT = false;
        reader.showCurrentPageContent();
        reader.generatePagination();
        updateTOCUI(false);
        GetScrollPositions(false);

        // Retrieve reading history
        getHistoryAndSetChapterTitleActive(reader.gotoLine.bind(reader));

        hideDropZone();
        hideLoadingScreen();
        showContent();
        FileLoadCallback.after();
    } else {
        await handleSelectedFile([book?.data]);
    }
}

/**
 * Checks if CONFIG.VARS.ALL_TITLES and CONFIG.VARS.ALL_TITLES_IND length match
 * @param {string} messageHeader - Message header
 * @throws {Error} If all titles and CONFIG.VARS.ALL_TITLES_IND length mismatch
 */
function verifyTitleAndIndexCount(messageHeader) {
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
