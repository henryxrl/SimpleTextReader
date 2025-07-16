/**
 * @fileoverview Bookshelf module for managing book storage and display
 *
 * This module provides:
 * - IndexedDB storage for books
 * - Book cover generation and display
 * - Reading progress tracking
 * - Book management (add/remove/update)
 * - Bookshelf UI and interactions
 *
 * @module client/app/modules/features/bookshelf
 * @requires client/app/config/index
 * @requires client/app/config/icons
 * @requires shared/core/callback/callback-registry
 * @requires shared/utils/logger
 * @requires client/app/modules/database/db-manager
 * @requires client/app/modules/text/text-processor
 * @requires client/app/modules/file/file-handler
 * @requires shared/core/callback/callback-registry
 * @requires client/app/modules/components/cover-generator
 * @requires client/app/modules/components/popup-manager
 * @requires client/app/utils/base
 * @requires client/app/utils/helpers-ui
 * @requires client/app/utils/helpers-bookshelf
 * @requires client/app/utils/helpers-reader
 * @requires client/app/utils/helpers-server
 * @requires client/app/utils/helpers-worker
 */

import * as CONFIG from "../../config/index.js";
import { ICONS } from "../../config/icons.js";
import { cbReg } from "../../../../shared/core/callback/callback-registry.js";
import { Logger } from "../../../../shared/utils/logger.js";
import { DBManager } from "../database/db-manager.js";
import { TextProcessor } from "../text/text-processor.js";
import { FileHandler } from "../file/file-handler.js";
import { PopupManager } from "../components/popup-manager.js";
import {
    isVariableDefined,
    getSizePrecise,
    removeFileExtension,
    convertUTCTimestampToLocalString,
    formatBytes,
    truncateText,
} from "../../utils/base.js";
import {
    showLoadingScreen,
    hideLoadingScreen,
    resetUI,
    resetVars,
    resetDropZoneState,
    delegateScroll,
} from "../../utils/helpers-ui.js";
import {
    setBookLastReadTimestamp,
    setIsFromLocal,
    getIsFromLocal,
    setIsOnServer,
    getIsOnServer,
} from "../../utils/helpers-bookshelf.js";
import { getProgressText, removeHistory, getIsBookFinished } from "../../utils/helpers-reader.js";
import { fetchAuthenticatedFile } from "../../utils/helpers-server.js";
import { createWorker } from "../../utils/helpers-worker.js";

/**
 * @class BookshelfDB
 * @description Handles IndexedDB operations for book storage
 * @private
 */
class BookshelfDB extends DBManager {
    /**
     * Logger instance
     * @type {Logger}
     * @private
     */
    #logger = Logger.getLogger(this, false);

    /**
     * Object store names
     * @type {Object}
     * @private
     */
    #objectStoreNames = {
        bookfiles: CONFIG.CONST_DB.DB_STORES[0].name,
        bookProcessed: CONFIG.CONST_DB.DB_STORES[1].name,
    };

    /**
     * Constructor for BookshelfDB
     * @constructor
     */
    constructor() {
        super({
            dbName: CONFIG.CONST_DB.DB_NAME,
            dbVersion: CONFIG.CONST_DB.DB_VERSION,
            objectStores: CONFIG.CONST_DB.DB_STORES,
            errorCallback: () => bookshelf.disable(),
            initCallback: async () => {
                // await this.removeAllBooks();
                await this.removeAllCloudBooks();
            },
        });
    }

    /**
     * Stores a book in the database
     * @async
     * @param {string} name - Book filename
     * @param {File} data - Book file data
     * @param {boolean} [isFromLocal=true] - Whether book is from local storage
     * @param {boolean} [isOnServer=false] - Whether book is stored on server
     * @returns {Promise<IDBValidKey>} Key of stored book
     * @throws {Error} When database initialization fails or transaction fails
     */
    async putBook(name, data, isFromLocal = true, isOnServer = false) {
        if (!(await this.init())) {
            throw new Error("Init local db error!");
        }

        // Get the language of the book
        let isEastern = data.isEastern ?? null;
        let encoding = data.encoding ?? null;
        if (isEastern === null || encoding === null) {
            ({ isEastern, encoding } = await TextProcessor.getLanguageAndEncodingFromBook(data));
        }

        try {
            const bookData = {
                name,
                data,
                isFromLocal,
                isOnServer,
                isEastern,
                encoding,
            };

            await this.put(bookData, {
                stores: {
                    [this.#objectStoreNames.bookfiles]: (inputData) => ({
                        name: inputData.name,
                        data: inputData.data,
                        isFromLocal: inputData.isFromLocal,
                        isOnServer: inputData.isOnServer,
                        processed: false,
                        pageBreakOnTitle: CONFIG.RUNTIME_CONFIG.PAGE_BREAK_ON_TITLE ?? true,
                        isEastern: inputData.isEastern,
                        createdAt: new Date().toISOString(),
                    }),
                    [this.#objectStoreNames.bookProcessed]: (inputData) => ({
                        name: inputData.name,
                        encoding: inputData.encoding,
                    }),
                },
            });

            return true;
        } catch (error) {
            console.error("Error putting book:", error);
            throw error;
        }
    }

    /**
     * Stores a processed book from server in the database
     * @async
     * @param {string} name - Book filename
     * @param {Object} data - Processed book data from server
     * @param {Object} data.name - Book filename
     * @param {Object} data.type - Book type
     * @param {Object} data.metadata - Book metadata
     * @param {Object} data.content - Book content
     * @returns {Promise<IDBValidKey>} Key of stored book
     * @throws {Error} When database initialization fails or transaction fails
     */
    async putProcessedBookFromServer(name, data) {
        if (!(await this.init())) {
            throw new Error("Init local db error!");
        }

        // Get the language of the book
        let isEastern = data.metadata.isEastern ?? null;
        let encoding = data.metadata.encoding ?? null;
        if (isEastern === null || encoding === null) {
            ({ isEastern, encoding } = await TextProcessor.getLanguageAndEncodingFromBook(data));
        }

        try {
            const bookData = {
                name,
                data: data.metadata.path,
                isFromLocal: data.metadata.isFromLocal ?? false,
                isOnServer: data.metadata.isOnServer ?? true,
                isEastern,
                encoding,
                metadata: data.metadata,
                content: data.content,
            };

            await this.put(bookData, {
                stores: {
                    [this.#objectStoreNames.bookfiles]: (inputData) => ({
                        name: inputData.name,
                        data: inputData.data,
                        isFromLocal: inputData.isFromLocal,
                        isOnServer: inputData.isOnServer,
                        processed: inputData.metadata.processed,
                        pageBreakOnTitle: inputData.metadata.pageBreakOnTitle ?? true,
                        isEastern: inputData.isEastern,
                        createdAt: inputData.metadata.createdAt,
                    }),
                    [this.#objectStoreNames.bookProcessed]: (inputData) => ({
                        name: inputData.name,
                        is_eastern_lan: inputData.metadata.is_eastern_lan,
                        encoding: inputData.encoding,
                        bookAndAuthor: inputData.metadata.bookAndAuthor,
                        title_page_line_number_offset: inputData.metadata.titlePageLineNumberOffset,
                        seal_rotate_en: inputData.metadata.sealRotateEn,
                        seal_left: parseFloat(inputData.metadata.sealLeft),
                        file_content_chunks: inputData.content.fileContentChunks,
                        all_titles: inputData.content.allTitles,
                        all_titles_ind: inputData.content.allTitlesInd,
                        footnotes: inputData.content.footnotes,
                        footnote_processed_counter: parseInt(inputData.metadata.footnoteProcessedCounter),
                        page_breaks: inputData.content.pageBreaks,
                        total_pages: parseInt(inputData.metadata.totalPages),
                        processedAt: inputData.metadata.processedAt,
                    }),
                },
            });

            return true;
        } catch (error) {
            console.error("Error putting book:", error);
            throw error;
        }
    }

    /**
     * Updates a processed book in the database
     * @async
     * @param {string} name - Book filename
     * @param {Object} processedData - Processed book data
     * @returns {Promise<IDBValidKey>} Key of updated book
     * @throws {Error} When database initialization fails or transaction fails
     */
    async updateProcessedBook(name, processedData) {
        if (!(await this.init())) {
            throw new Error("Init local db error!");
        }

        try {
            const [existingBook, existingProcessedBook] = await Promise.all([
                this.get([this.#objectStoreNames.bookfiles], name),
                this.get([this.#objectStoreNames.bookProcessed], name),
            ]);

            if (!existingBook) {
                throw new Error(`Book with name "${name}" not found in the database.`);
            }

            if (!existingProcessedBook) {
                throw new Error(`Processed book with name "${name}" not found in the database.`);
            }

            await this.put(
                { name, ...processedData },
                {
                    stores: {
                        [this.#objectStoreNames.bookfiles]: () => ({
                            ...existingBook,
                            processed: true,
                            pageBreakOnTitle: CONFIG.RUNTIME_CONFIG.PAGE_BREAK_ON_TITLE ?? true,
                        }),
                        [this.#objectStoreNames.bookProcessed]: () => ({
                            ...existingProcessedBook,
                            ...processedData,
                            processedAt: new Date().toISOString(),
                        }),
                    },
                }
            );

            return true;
        } catch (error) {
            console.error("Error updating processed book:", error);
            throw error;
        }
    }

    /**
     * Updates the language of a book
     * @async
     * @param {string} name - Book filename
     * @param {boolean} isEastern - Whether the book is in Eastern language
     * @returns {Promise<IDBValidKey>} Key of updated book
     * @throws {Error} When database initialization fails or transaction fails
     */
    async updateBookLanguage(name, isEastern) {
        if (!(await this.init())) {
            throw new Error("Init local db error!");
        }

        try {
            const existingBook = await this.get([this.#objectStoreNames.bookfiles], name);
            if (!existingBook) {
                throw new Error(`Book with name "${name}" not found in the database.`);
            }

            await this.put(
                { name, isEastern },
                {
                    stores: {
                        [this.#objectStoreNames.bookfiles]: () => ({
                            ...existingBook,
                            isEastern,
                        }),
                        [this.#objectStoreNames.bookProcessed]: () => ({
                            name,
                        }),
                    },
                }
            );

            return true;
        } catch (error) {
            console.error("Error updating book language:", error);
            throw error;
        }
    }

    /**
     * Retrieves a book from the database
     * @async
     * @param {string} name - Book filename
     * @returns {Promise<Object>} Book data
     * @throws {Error} When database initialization fails or transaction fails
     */
    async getBook(name) {
        if (!(await this.init())) {
            throw new Error("Init local db error!");
        }

        try {
            const [bookFile, processedBook] = await Promise.all([
                this.get([this.#objectStoreNames.bookfiles], name),
                this.get([this.#objectStoreNames.bookProcessed], name),
            ]);

            if (!bookFile && !processedBook) {
                return null;
            }

            return {
                ...(bookFile || {}),
                ...(processedBook || {}),
            };
        } catch (error) {
            console.error("Error getting book:", error);
            throw error;
        }
    }

    /**
     * Retrieves all books from the database
     * @async
     * @returns {Promise<Array>} Array of all books
     * @throws {Error} When database initialization fails or transaction fails
     */
    async getAllBooks() {
        if (!(await this.init())) {
            throw new Error("Init local db error!");
        }

        try {
            await this.ensureStoresAvailable([this.#objectStoreNames.bookfiles, this.#objectStoreNames.bookProcessed]);
            this.#logger.log("Required stores are available");

            const allBooks = await this.getAll([this.#objectStoreNames.bookfiles], {
                useCursor: true,
            });
            this.#logger.log("Books:", allBooks);
            return allBooks;
        } catch (error) {
            console.error("Error getting all books:", error);
            return [];
        }
    }

    /**
     * Retrieves all cloud-stored books from the database
     * @async
     * @returns {Promise<Array>} Array of cloud-stored books
     * @throws {Error} When database initialization fails or transaction fails
     */
    async getAllCloudBooks() {
        const books = await this.getAllBooks();
        return books.filter((book) => book.isOnServer);
    }

    /**
     * Checks if a book exists in the database
     * @async
     * @param {string} name - Book filename
     * @returns {Promise<boolean>} Whether book exists
     * @throws {Error} When database initialization fails or transaction fails
     */
    async isBookExist(name) {
        if (!(await this.init())) {
            throw new Error("Init local db error!");
        }

        return await this.exists(this.#objectStoreNames.bookfiles, name);
    }

    /**
     * Removes a book from the database
     * @async
     * @param {string} name - Book filename
     * @throws {Error} When database initialization fails or transaction fails
     */
    async removeBook(name) {
        if (!(await this.init())) {
            throw new Error("Init local db error!");
        }

        try {
            await this.delete([this.#objectStoreNames.bookfiles, this.#objectStoreNames.bookProcessed], name);
            return true;
        } catch (error) {
            console.error("Error removing book:", error);
            throw error;
        }
    }

    /**
     * Removes all books from the database
     * @async
     * @throws {Error} When database initialization fails or transaction fails
     */
    async removeAllBooks() {
        if (!(await this.init())) {
            throw new Error("Init local db error!");
        }

        try {
            await this.clear([this.#objectStoreNames.bookfiles, this.#objectStoreNames.bookProcessed]);
            return true;
        } catch (error) {
            console.error("Error removing all books:", error);
            throw error;
        }
    }

    /**
     * Removes all cloud-stored books that aren't local
     * @async
     * @throws {Error} When database initialization fails or transaction fails
     */
    async removeAllCloudBooks() {
        if (!(await this.init())) {
            throw new Error("Init local db error!");
        }

        try {
            const cloudBooks = await this.getAllCloudBooks();

            for (const book of cloudBooks) {
                await this.delete([this.#objectStoreNames.bookfiles, this.#objectStoreNames.bookProcessed], book.name);
            }

            return true;
        } catch (error) {
            console.error("Error removing all cloud books:", error);
            throw error;
        }
    }

    /**
     * Upgrades the database schema
     * @async
     * @param {boolean} force - Whether to force upgrade
     * @throws {Error} When database initialization fails or transaction fails
     */
    async upgradeBookshelfDB(force = false) {
        this.#logger.log("upgradeBookshelfDB", { force });
        const currentDBVersion = await this.getDBVersion();
        const configuredDBVersion = this.getConfiguredDBVersion();

        if (currentDBVersion > configuredDBVersion) {
            throw new Error(
                `Database version mismatch! Current: ${currentDBVersion}, Expected: ${configuredDBVersion}`
            );
        } else if (currentDBVersion === configuredDBVersion && !force) {
            return;
        }

        if (!(await this.init())) {
            throw new Error("Init local db error!");
        }

        try {
            const allBooks = await this.getAllBooks();
            for (const book of allBooks) {
                const { name } = book;
                const processedBook = await this.get([this.#objectStoreNames.bookProcessed], name);
                await this.put(book, {
                    stores: {
                        [this.#objectStoreNames.bookfiles]: () => ({
                            name: book.name,
                            data: book.data,
                            isFromLocal: book.isFromLocal ?? true,
                            isOnServer: book.isOnServer ?? false,
                            processed: book.processed ?? false,
                            pageBreakOnTitle:
                                book.pageBreakOnTitle ?? CONFIG.RUNTIME_CONFIG.PAGE_BREAK_ON_TITLE ?? true,
                            isEastern: book.isEastern ?? true,
                            createdAt: book.createdAt ?? new Date().toISOString(),
                        }),
                        [this.#objectStoreNames.bookProcessed]: () => ({
                            name: book.name,
                            ...(processedBook || {}),
                            bookAndAuthor: processedBook?.bookAndAuthor ?? { bookName: "", author: "" },
                            title_page_line_number_offset: processedBook?.title_page_line_number_offset ?? 0,
                            seal_rotate_en: processedBook?.seal_rotate_en ?? "0deg",
                            seal_left: processedBook?.seal_left ?? "0",
                            file_content_chunks: processedBook?.file_content_chunks ?? [],
                            all_titles: processedBook?.all_titles ?? [],
                            all_titles_ind: processedBook?.all_titles_ind ?? {},
                            footnotes: processedBook?.footnotes ?? [],
                            footnote_processed_counter: processedBook?.footnote_processed_counter ?? 0,
                            page_breaks: processedBook?.page_breaks ?? [],
                            total_pages: processedBook?.total_pages ?? 0,
                            is_eastern_lan: processedBook?.is_eastern_lan ?? true,
                            encoding: book.encoding ?? "utf-8",
                            processedAt: book.processedAt ?? new Date().toISOString(),
                        }),
                    },
                });
            }

            if (allBooks.length > 0) {
                await this.printAllDatabases();
                console.log("Database upgrade completed.");
            }

            return true;
        } catch (error) {
            console.error("Error upgrading database:", error);
            throw error;
        }
    }

    /**
     * Prints all records in both "bookfiles" and "bookProcessed" object stores
     * @async
     * @throws {Error} When database initialization fails
     */
    async printAllDatabases() {
        if (!(await this.init())) {
            throw new Error("Init local db error!");
        }

        console.log("Printing all book-related database records...");

        try {
            await this.printStoreRecords({
                storeNames: [this.#objectStoreNames.bookfiles, this.#objectStoreNames.bookProcessed],
                preprocessors: {
                    [this.#objectStoreNames.bookfiles]: (record) => record,
                    [this.#objectStoreNames.bookProcessed]: (record) => {
                        const preprocessValue = (key, value) => {
                            if (key === "bookAndAuthor" && value && typeof value === "object") {
                                return `${value.bookName}, ${value.author}`;
                            } else if (Array.isArray(value)) {
                                return `Array(${value.length})`;
                            } else if (value && typeof value === "object") {
                                return `Object(${Object.keys(value).length})`;
                            }
                            return value;
                        };

                        return Object.fromEntries(
                            Object.entries(record).map(([key, value]) => [key, preprocessValue(key, value)])
                        );
                    },
                },
            });

            console.log("Finished printing all book-related database records.");
        } catch (error) {
            console.error("Error printing book-related databases:", error);
            throw error;
        }
    }
}

/**
 * Main bookshelf object containing all functionality
 * @private
 * @namespace
 */
const bookshelf = {
    enabled: false,
    db: null,
    logger: Logger.getLogger("Bookshelf", false),
    worker: null,

    _coverGenerator: null,
    _FILENAME_: "STR-Filename",
    _CACHE_FLAG_: "STR-Cache-File",

    _tokenBeforeFileLoad: null,
    _tokenAfterDBSave: null,
    _tokenAfterBookOpen: null,

    _loopInterval: 2000,
    _loopCount: 0,
    _loopCountMax: 30,

    /**
     * Reopens the last read book on startup
     * @async
     * @returns {Promise<void>}
     */
    async reopenBook() {
        if (this.enabled) {
            // Get previous filename and reopen
            const fname = localStorage.getItem(this._FILENAME_);
            if (fname) {
                if (await this.isBookExist(fname)) {
                    console.log("Reopen book on start: " + fname);
                    await this.openBook(fname);
                }
            }
        }
    },

    /**
     * Opens a book from the bookshelf
     * @async
     * @param {string} fname - Filename of the book to open
     * @param {boolean} [forceRefresh=false] - Whether to force refresh the book
     * @returns {Promise<boolean>} Success status of opening the book
     * @throws {Error} When book cannot be opened or found
     */
    async openBook(fname, forceRefresh = false) {
        if (this.enabled) {
            showLoadingScreen();

            // console.log("Open book from cache: " + fname);
            try {
                let fetchedBook = null;

                // Check if the book exists in db
                const existsLocally = await this.isBookExist(fname);

                // check if the book exists in db
                if (!existsLocally) {
                    // search book in allBooksInfo
                    // const toProcessBookInfo = CONFIG.VARS.ALL_BOOKS_INFO.find(x => x.name === fname);
                    const toProcessBookInfo = CONFIG.VARS.ALL_BOOKS_INFO[fname];
                    this.logger.log("toProcessBookInfo", toProcessBookInfo);

                    if (toProcessBookInfo) {
                        try {
                            const toProcessBookFileObj = await fetchAuthenticatedFile(fname, true);
                            this.logger.log("toProcessBookFileObj", toProcessBookFileObj);

                            if (toProcessBookFileObj?.metadata?.processed) {
                                // For processed server books, directly use server data
                                fetchedBook = {
                                    name: fname,
                                    data: toProcessBookFileObj.metadata.path,
                                    isFromLocal: toProcessBookFileObj.metadata.isFromLocal ?? false,
                                    isOnServer: toProcessBookFileObj.metadata.isOnServer ?? true,
                                    isEastern: toProcessBookFileObj.metadata.isEastern,
                                    encoding: toProcessBookFileObj.metadata.encoding,
                                    processed: toProcessBookFileObj.metadata.processed,
                                    pageBreakOnTitle: toProcessBookFileObj.metadata.pageBreakOnTitle ?? true,
                                    createdAt: toProcessBookFileObj.metadata.createdAt,
                                    is_eastern_lan: toProcessBookFileObj.metadata.is_eastern_lan,
                                    bookAndAuthor: toProcessBookFileObj.metadata.bookAndAuthor,
                                    title_page_line_number_offset:
                                        toProcessBookFileObj.metadata.titlePageLineNumberOffset,
                                    seal_rotate_en: toProcessBookFileObj.metadata.sealRotateEn,
                                    seal_left: toProcessBookFileObj.metadata.sealLeft,
                                    file_content_chunks: toProcessBookFileObj.content.fileContentChunks,
                                    all_titles: toProcessBookFileObj.content.allTitles,
                                    all_titles_ind: toProcessBookFileObj.content.allTitlesInd,
                                    footnotes: toProcessBookFileObj.content.footnotes,
                                    footnote_processed_counter: toProcessBookFileObj.metadata.footnoteProcessedCounter,
                                    page_breaks: toProcessBookFileObj.content.pageBreaks,
                                    total_pages: toProcessBookFileObj.metadata.totalPages,
                                    processedAt: toProcessBookFileObj.metadata.processedAt,
                                };

                                // Asynchronously save to local database, but do not wait for completion
                                this.saveProcessedBookFromServer(toProcessBookFileObj, false, false, false).catch(
                                    (err) => console.warn("Background save to DB failed:", err)
                                );
                            } else {
                                await this.saveBook(
                                    toProcessBookFileObj,
                                    toProcessBookInfo.isFromLocal,
                                    toProcessBookInfo.isOnServer,
                                    false,
                                    false,
                                    false
                                );

                                // For unprocessed books, still need to get from database
                                fetchedBook = await this.db.getBook(fname);
                            }
                        } catch (e) {
                            hideLoadingScreen(false);
                            PopupManager.showNotification({
                                iconName: "ERROR",
                                text: `${CONFIG.RUNTIME_VARS.STYLE.ui_notification_text_failedToOpen} "${truncateText(
                                    fname
                                )}"`,
                                iconColor: "error",
                            });
                            throw new Error(`openBook error: "${fname}"`);
                        }
                    } else {
                        hideLoadingScreen(false);
                        PopupManager.showNotification({
                            iconName: "ERROR",
                            text: `${CONFIG.RUNTIME_VARS.STYLE.ui_notification_text_failedToOpen} "${truncateText(
                                fname
                            )}"`,
                            iconColor: "error",
                        });
                        throw new Error(`openBook error: "${fname}"`);
                    }
                } else {
                    // Local book directly from database
                    fetchedBook = await this.db.getBook(fname);
                }
                this.logger.log("fetchedBook", fetchedBook);

                if (typeof fetchedBook?.data === "string") {
                    console.log(`Opening "${fname}" processed from server.`);
                } else {
                    console.log(`Opening "${fname}" processed from local.`);
                }

                const book = fetchedBook?.data;
                const book_isOnServer = fetchedBook?.isOnServer ?? false;
                const book_isFromLocal = fetchedBook?.isFromLocal ?? true;
                const book_isEastern = fetchedBook?.isEastern ?? null;
                const book_encoding = fetchedBook?.encoding ?? null;
                const book_processed = fetchedBook?.processed ?? false;
                const book_pageBreakOnTitle = fetchedBook?.pageBreakOnTitle ?? true;
                if (book) {
                    if (book instanceof File) {
                        book[this._CACHE_FLAG_] = true;
                    }
                    resetVars();
                    if (
                        !book_processed ||
                        CONFIG.RUNTIME_CONFIG.ALWAYS_PROCESS ||
                        book_pageBreakOnTitle !== CONFIG.RUNTIME_CONFIG.PAGE_BREAK_ON_TITLE ||
                        forceRefresh
                    ) {
                        await this.processBook(book, fetchedBook, forceRefresh);
                    } else {
                        await this.handleBook(book, fetchedBook);
                    }
                    this.hide(true);
                    setBookLastReadTimestamp(fname);
                    return true;
                } else {
                    hideLoadingScreen(false);
                    PopupManager.showNotification({
                        iconName: "ERROR",
                        text: `${CONFIG.RUNTIME_VARS.STYLE.ui_notification_text_failedToOpen} "${truncateText(fname)}"`,
                        iconColor: "error",
                    });
                    throw new Error(`openBook error: "${fname}"`);
                }
            } catch (e) {
                hideLoadingScreen(false);
                console.log(e);
                return false;
            }
        }
    },

    /**
     * Processes a book by handling it with FileHandler.handleSelectedFile
     * @async
     * @param {File} book - Book file to process
     */
    async processBook(book, fetchedBook, forceRefresh = false) {
        try {
            const isEastern = fetchedBook.isEastern ?? null;
            const encoding = fetchedBook.encoding ?? null;
            await FileHandler.handleSelectedFile([book], isEastern, encoding, forceRefresh);
        } catch (e) {
            console.log(e);
            try {
                await this.removeBook(book.name); // Remove book from db
                await FileHandler.handleSelectedFile([book]); // Retry processing the book
            } catch (retryError) {
                console.log(retryError);
            }
        }
    },

    /**
     * Handles a processed book by handling it with FileHandler.handleProcessedBook
     * @async
     * @param {File} book - Book file to handle
     * @param {Object} fetchedBook - Fetched book object from db
     */
    async handleBook(book, fetchedBook) {
        try {
            await FileHandler.handleProcessedBook(fetchedBook);
        } catch (e) {
            console.log(e);
            await this.processBook(book, fetchedBook); // Fallback to reprocess the book
        }
    },

    /**
     * Saves a book file to IndexedDB storage
     * @async
     * @param {File} file - Book file to save
     * @param {boolean} [isFromLocal=true] - Whether book is from local storage
     * @param {boolean} [isOnServer=false] - Whether book is stored on server
     * @param {boolean} [refreshBookshelf=true] - Whether to refresh bookshelf display
     * @param {boolean} [hardRefresh=true] - Whether to perform hard refresh
     * @param {boolean} [sortBookshelf=true] - Whether to sort bookshelf
     * @param {boolean} [inFileProcessingCallback=false] - Whether to call file load callback
     * @returns {Promise<File>} The saved file
     */
    async saveBook(
        file,
        isFromLocal = true,
        isOnServer = false,
        refreshBookshelf = true,
        hardRefresh = true,
        sortBookshelf = true,
        inFileProcessingCallback = false
    ) {
        if (this.enabled) {
            // console.log("saveBook: ", file);
            // console.log("file.type: ", file.type);
            // console.log("CONFIG.CONST_FILE.SUPPORTED_FILE_TYPE: ", CONFIG.CONST_FILE.SUPPORTED_FILE_TYPE);
            if (file.type === CONFIG.CONST_FILE.SUPPORTED_FILE_TYPE) {
                if (file[this._CACHE_FLAG_]) {
                    // console.log("Openning cache-book, so not save.");
                } else {
                    // console.log("saveBook: ", file.name);
                    // Save file to cache db first
                    try {
                        // if (await this.db.isBookExist(file.name)) {
                        //     console.log("Book already exists in cache: " + file.name);
                        //     return file;
                        // }

                        await this.db.putBook(file.name, file, isFromLocal, isOnServer);
                        if (!(await this.db.isBookExist(file.name))) {
                            PopupManager.showNotification({
                                iconName: "ERROR",
                                text: CONFIG.RUNTIME_VARS.STYLE.ui_notification_text_failedToSave,
                                iconColor: "error",
                            });
                            throw new Error(`saveBook error (localStorage full): "${file.name}"`);
                        }

                        // Refresh Bookshelf in DropZone
                        // await this.refreshBookList();
                        // console.log(`refreshBookshelf: ${refreshBookshelf}, HardRefresh: ${hardRefresh}`);
                        if (refreshBookshelf)
                            await resetUI(refreshBookshelf, hardRefresh, sortBookshelf, inFileProcessingCallback);
                    } catch (e) {
                        console.log(e);
                    }
                }
            }
        }
        return file;
    },

    /**
     * Saves a processed book from server to IndexedDB storage
     * @async
     * @param {Object} processedBook - Processed book data from server
     * @param {boolean} [refreshBookshelf=true] - Whether to refresh bookshelf display
     * @param {boolean} [hardRefresh=true] - Whether to perform hard refresh
     * @param {boolean} [sortBookshelf=true] - Whether to sort bookshelf
     * @param {boolean} [inFileProcessingCallback=false] - Whether to call file load callback
     * @returns {Promise<Object>} The saved processed book
     */
    async saveProcessedBookFromServer(
        processedBook,
        refreshBookshelf = true,
        hardRefresh = true,
        sortBookshelf = true,
        inFileProcessingCallback = false
    ) {
        if (!this.enabled) {
            return null;
        }

        if (!processedBook.type.includes("application/json")) {
            console.error("Invalid processed book type: ", processedBook.type);
            return null;
        }

        // Validate processedBook
        if (
            !processedBook.metadata ||
            !processedBook.metadata.processed ||
            !processedBook.content ||
            !processedBook.content.allTitles ||
            !processedBook.content.allTitlesInd ||
            !processedBook.content.fileContentChunks ||
            !processedBook.content.footnotes ||
            !processedBook.content.pageBreaks
        ) {
            console.error("Invalid processed book: ", processedBook);
            return null;
        }

        if (processedBook[this._CACHE_FLAG_]) {
            // console.log("Openning cache-book, so not save.");
            return processedBook;
        }

        // Save file to cache db first
        try {
            this.logger.log("Starting to save book", processedBook.name);
            // await this.db.putProcessedBookFromServer(processedBook.name, processedBook);

            if (!this.worker) {
                throw new Error("Worker not initialized");
            }

            await new Promise((resolve, reject) => {
                this.logger.log("Setting up worker message handler");

                const messageData = {
                    type: "saveProcessedBookFromServer",
                    payload: {
                        processedBook,
                    },
                };

                this.logger.log("Preparing message data", messageData);

                this.worker.onmessage = (e) => {
                    this.logger.log("Received worker message", e.data);
                    if (e.data.success) {
                        resolve();
                    } else {
                        console.error("Worker reported error:", e.data.error);
                        console.error("Error stack:", e.data.stack);
                        reject(new Error(e.data.error));
                    }
                };

                this.logger.log("Posting message to worker");
                this.worker.postMessage(messageData);
                this.logger.log("Message posted to worker");
            });

            this.logger.log("Worker save completed");

            if (!(await this.db.isBookExist(processedBook.name))) {
                PopupManager.showNotification({
                    iconName: "ERROR",
                    text: CONFIG.RUNTIME_VARS.STYLE.ui_notification_text_failedToSave,
                    iconColor: "error",
                });
                throw new Error(`saveBook error (localStorage full): "${processedBook.name}"`);
            }

            // Refresh Bookshelf in DropZone
            if (refreshBookshelf) await resetUI(refreshBookshelf, hardRefresh, sortBookshelf, inFileProcessingCallback);

            this.logger.log("saveProcessedBookFromServer complete");

            // Trigger saveProcessedBookComplete event
            cbReg.go("saveProcessedBookComplete");
        } catch (e) {
            console.error("Error in saveProcessedBookFromServer:", e);
            console.error("Error stack:", e.stack);
        }

        return processedBook;
    },

    /**
     * Checks if a book exists in storage
     * @async
     * @param {string} fname - Book filename
     * @returns {Promise<boolean>} Whether book exists
     */
    async isBookExist(fname) {
        if (this.enabled) {
            return await this.db.isBookExist(fname);
        } else {
            return false;
        }
    },

    /**
     * Removes a book from storage
     * @async
     * @param {string} fname - Book filename
     * @param {Function} [onSucc=null] - Success callback
     */
    async removeBook(fname, onSucc = null) {
        if (this.enabled) {
            this.db.removeBook(fname).then(() => {
                if (onSucc) onSucc();
            });
        }
    },

    /**
     * Updates book reading progress and UI indicators
     * @param {string} fname - Book filename
     * @param {jQuery} [bookElm=null] - Book element in DOM
     * @param {boolean} [inLoop=false] - Whether update is in progress loop
     */
    updateBookProgressInfo(fname, bookElm = null, inLoop = false) {
        if (!bookElm) {
            bookElm = $(`.bookshelf .book[data-filename="${fname}"]`);
            if (bookElm.length <= 0) {
                return;
            }
        }
        // const progress = getProgressText(fname, !inLoop);
        const progress = getProgressText(fname, false);
        if (progress) {
            bookElm.addClass("read").css("--read-progress", progress);
            if (getIsBookFinished(fname)) {
                bookElm.data("isFinished", true);
                // add styling to the text of read
                const read_text = `<span class="read_text">
                ${ICONS.FINISHED}
                <span class="read_text_text"></span></span>`;
                bookElm.find(".progress").html(read_text);

                // add a badge to the book cover
                // const badge = `<div class="bookFinished_badge">${ICONS.FINISHED_BADGE_OLD}</div>`;
                const badge = `<div class="bookFinished_badge">${ICONS.FINISHED_BADGE}</div>`;
                bookElm.find(".cover-container").append(badge);
            } else {
                if (parseInt(progress) >= 99) {
                    bookElm.data("almostDone", true);
                    const almostDone_text = `<span class="almostDone_text"></span>`;
                    bookElm.find(".progress").html(progress + almostDone_text);
                    // .attr("data-title", progress);
                } else {
                    bookElm.data("inProgress", true);
                    bookElm.find(".progress").html(progress);
                    // .attr("data-title", progress);
                }
            }
        } else {
            bookElm.data("unRead", true);
            bookElm.removeClass("read").css("--read-progress", "");

            // add styling to the text of not read
            const notRead_text = `<span class="notRead_text"></span>`;
            bookElm.find(".progress").html(notRead_text);

            // add a badge to the book cover
            const badge = `<div class="bookNotRead_badge">${ICONS.NEWBOOK_RIBBON}</div>`;
            bookElm.find(".cover-container").append(badge);
        }
    },

    /**
     * Generates a book item DOM element with cover and interactions
     * @param {Object} bookInfo - Book information object
     * @param {number} idx - Book index
     * @returns {jQuery} Generated book element
     */
    genBookItem(bookInfo, idx) {
        // Generate book cover art
        const canvasWidth = getSizePrecise(CONFIG.RUNTIME_VARS.STYLE.ui_bookCoverWidth);
        const canvasHeight = getSizePrecise(CONFIG.RUNTIME_VARS.STYLE.ui_bookCoverHeight);
        const currentBookNameAndAuthor = TextProcessor.getBookNameAndAuthor(removeFileExtension(bookInfo.name));
        let htmlTag = "";
        if (CONFIG.CONST_UI.COVER_GENERATOR_CONFIG.USE_CANVAS) {
            htmlTag = "canvas";
        } else {
            htmlTag = "div";
        }
        const book = $(
            `<div class="book" data-filename="${bookInfo.name}">
                <div class="cover-container">
                    <div class="cover-hidden-text-container">
                        <span class="cover-hidden-text">${bookInfo.name}</span>
                        <span class="cover-hidden-text bookName">${currentBookNameAndAuthor.bookName}</span>
                        <span class="cover-hidden-text author">${currentBookNameAndAuthor.author}</span>
                    </div>
                    <${htmlTag} class="cover-canvas" width="${canvasWidth}" height="${canvasHeight}"></${htmlTag}>
                </div>
                <div class="info-container">
                    <div class="progress"></div>
                    <div class="isOnServer">
                        ${bookInfo.isOnServer && !bookInfo.isFromLocal ? `${ICONS.BOOK_IS_ON_SERVER}` : ""}
                    </div>
                    <div class="delete-btn-wrapper">
                        <span class="delete-btn hasTitle" data-title="${
                            CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_removeBook
                        }">
                            ${ICONS.DELETE_BOOK}
                        </span>
                    </div>
                    <div id="bookinfo-menu-btn-${idx}" class="bookinfo-menu-btn hasTitle" data-title="${
                CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_bookInfo
            }">
                        <input id="dot-menu-${idx}" type="checkbox" class="dot-menu__checkbox">
                        <label for="dot-menu-${idx}" class="dot-menu__label"><span></span></label>
                    </div>
                </div>
            </div>`
        );
        const coverSettings = this._getCoverSettings({
            width: canvasWidth,
            height: canvasHeight,
            bookNameAndAuthor: currentBookNameAndAuthor,
        });
        const container = book.find(".cover-canvas")[0];
        if (CONFIG.CONST_UI.COVER_GENERATOR_CONFIG.USE_CANVAS) {
            this._coverGenerator.generate(coverSettings, container.getContext("2d"));
        } else {
            this._coverGenerator.generate(coverSettings, container);
        }
        if (currentBookNameAndAuthor.author === "") {
            book.find(".cover-container").css("box-shadow", "var(--ui_bookshadow_noAuthor)");
        } else {
            book.find(".cover-container").css("box-shadow", "var(--ui_bookshadow)");
        }
        book.data("isEastern", bookInfo.isEastern);
        book.data("bookNameAndAuthor", currentBookNameAndAuthor);

        // Add mouseover effect
        book.find(".cover-container")
            .on("mouseenter", function () {
                book.find(".delete-btn-wrapper").css("opacity", "1");
                $(this).css("box-shadow", "var(--ui_bookshadow_hover)");
                // add a tooltip to the book cover
                $(this).attr("data-title", CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_book_altClick);
            })
            .on("mouseleave", function (e) {
                if (
                    e.offsetX <= 0 ||
                    e.offsetX >= $(this).width() ||
                    e.offsetY <= $(this)[0].offsetTop ||
                    e.offsetY >= $(this).height()
                ) {
                    book.find(".delete-btn-wrapper").css("opacity", "0");
                    const tempBookAuthor =
                        book.data("bookNameAndAuthor") ??
                        TextProcessor.getBookNameAndAuthor(removeFileExtension(bookInfo.name));
                    if (tempBookAuthor.author === "") {
                        $(this).css("box-shadow", "var(--ui_bookshadow_noAuthor)");
                    } else {
                        $(this).css("box-shadow", "var(--ui_bookshadow)");
                    }
                }
            });
        book.find(".info-container")
            .on("mouseenter", function () {
                book.find(".delete-btn-wrapper").css("opacity", "1");
            })
            .on("mouseleave", function () {
                book.find(".delete-btn-wrapper").css("opacity", "0");
            });

        // Add click event
        book.find(".cover-container").on("click", (e) => {
            e.originalEvent.stopPropagation();
            if (e.altKey) {
                // Alt key on Windows/Linux, Option key on Mac
                console.log(`Force reprocess ${bookInfo.name}.`);
                this.openBook(bookInfo.name, true);
            } else {
                this.openBook(bookInfo.name);
            }
        });

        // Add delete event
        book.find(".delete-btn").on("click", (e) => {
            e.originalEvent.stopPropagation();

            this.removeBook(bookInfo.name, () => {
                let b = $(e.currentTarget).parents(".book");
                b.fadeOut(300, () => {
                    b.remove();
                    // console.log(CONFIG.VARS.ALL_BOOKS_INFO);
                    delete CONFIG.VARS.ALL_BOOKS_INFO[bookInfo.name];
                    // console.log(CONFIG.VARS.ALL_BOOKS_INFO);
                    // this.refreshBookList();     // does't need to refresh booklist every time after delete

                    $(".booklist").trigger("contentchange"); // recalculate booklist height

                    // Change isFromLocal to false
                    // setIsFromLocal(bookInfo.name, false);
                    // bookInfo.isFromLocal = false;

                    // If the book is neither from local nor on server, remove it from history
                    // if (!bookInfo.isFromLocal && !bookInfo.isOnServer) {
                    //     removeHistory(bookInfo.name);
                    // }

                    // Remove the book from history
                    removeHistory(bookInfo.name);
                });
                // b.animate({width: 0, opacity: 0}, 500, () => b.remove());

                PopupManager.showNotification({
                    iconName: "DELETE_BOOK",
                    text: CONFIG.RUNTIME_VARS.STYLE.ui_notification_text_deleteBook.replace(
                        "xxx",
                        `"${truncateText(bookInfo.name)}"`
                    ),
                });
            });
        });

        // Update book progress info
        this.updateBookProgressInfo(bookInfo.name, book);

        // Add a bookinfo-menu-btn
        book.find(`#bookinfo-menu-btn-${idx}`).on("click", (e) => {
            _handleBookInfoMenu(e, e.currentTarget);
        });

        // Add right click event
        book.find(".cover-container").on("contextmenu", (e) => {
            // e.originalEvent.preventDefault();
            // const targetElement = book.find(`#bookinfo-menu-btn-${idx}`).get(0);
            // _handleBookInfoMenu(e, targetElement);
        });

        // Handle book info menu
        function _handleBookInfoMenu(e, targetElement) {
            e.originalEvent.stopPropagation();

            // Remove all bookinfo-menu
            $(".bookinfo-menu").remove();

            // Add bookinfo-menu
            if (book.find(".dot-menu__checkbox").is(":checked") || e.originalEvent.button === 2) {
                const tempBookAuthor =
                    book.data("bookNameAndAuthor") ??
                    TextProcessor.getBookNameAndAuthor(removeFileExtension(bookInfo.name));
                const tempBookTitle = tempBookAuthor.bookName;
                const tempBookAuthorName =
                    tempBookAuthor.author === ""
                        ? `<span class="bookinfo-menu-item-text bookinfo-menu-item-text_unknown"><span>`
                        : tempBookAuthor.author;
                const tempBookLastOpenedTimestamp =
                    isVariableDefined(bookInfo.lastOpenedTimestamp) && bookInfo.lastOpenedTimestamp !== ""
                        ? convertUTCTimestampToLocalString(bookInfo.lastOpenedTimestamp)
                        : `<span class="bookinfo-menu-item-text bookinfo-menu-item-text_unknown"></span>`;

                // Create popup menu
                const bookInfoMenu = `
                <div class="bookinfo-menu" id="bookinfo-menu-${idx}">
                    <div class="bookinfo-menu-clip"></div>
                    <div class="bookinfo-menu_item">
                        <span class="bookinfo-menu-item-text bookinfo-menu-item-text_bookname"></span>
                        <div class="bookinfo-menu-item-info bookinfo-menu-item-info_title">${tempBookTitle}</div>
                    </div>
                    <div class="bookinfo-menu_item">
                        <span class="bookinfo-menu-item-text bookinfo-menu-item-text_author"></span>
                        <div class="bookinfo-menu-item-info bookinfo-menu-item-info_author">${tempBookAuthorName}</div>
                    </div>
                    <div class="bookinfo-menu_item">
                        <span class="bookinfo-menu-item-text bookinfo-menu-item-text_filename"></span>
                        <div class="bookinfo-menu-item-info bookinfo-menu-item-info_filename">${bookInfo.name}</div>
                    </div>
                    <div class="bookinfo-menu_item">
                        <span class="bookinfo-menu-item-text bookinfo-menu-item-text_filesize"></span>
                        <div class="bookinfo-menu-item-info bookinfo-menu-item-info_filesize">${formatBytes(
                            bookInfo.size
                        )}</div>
                    </div>
                    <div class="bookinfo-menu_item">
                        <span class="bookinfo-menu-item-text bookinfo-menu-item-text_lastopened"></span>
                        <div class="bookinfo-menu-item-info bookinfo-menu-item-info_timestamp">${tempBookLastOpenedTimestamp}</div>
                    </div>
                </div>`;

                // Add popup menu to the book
                book.find(".info-container").append(bookInfoMenu);
                book.find(`#bookinfo-menu-${idx} .bookinfo-menu-item-info`).each(function () {
                    this.scrollTop = 0;
                });

                // Proxy scroll events to the bookinfo-menu-item-info elements
                const menu = book.find(`#bookinfo-menu-${idx}`);
                const menuElement = menu[0];
                const scrollTargets = Array.from(menuElement.querySelectorAll(".bookinfo-menu-item-info")).filter(
                    (el) => el.scrollHeight > el.clientHeight
                );
                delegateScroll(menuElement, scrollTargets);

                // Set bookinfo-menu's position to be right above current element
                const bookInfoMenuWidth = menu.outerWidth();
                const bookInfoMenuHeight = menu.outerHeight();
                const targetElementRect = targetElement.getBoundingClientRect();
                menu.css("top", `${targetElementRect.bottom - targetElementRect.height - bookInfoMenuHeight - 15}px`);
                menu.css(
                    "left",
                    `${targetElementRect.left + targetElementRect.width / 2 - bookInfoMenuWidth / 2 + 3}px`
                );
            } else {
                // Hide popup menu
                book.find(".bookinfo-menu").remove();
            }

            // Hide popup menu when clicked outside
            document.addEventListener("click", function (e) {
                const settingsMenu = book.find(`#bookinfo-menu-${idx}`);
                // if (!settingsMenu) return;
                if ($(e.target).closest(settingsMenu).length) {
                    // clicked inside menu
                } else {
                    book.find(".dot-menu__checkbox").prop("checked", false);
                    book.find(".bookinfo-menu").remove();
                }
            });

            // Reset all book cover art when mouseover the bookinfo-menu
            book.find(".bookinfo-menu").on("mouseenter", function () {
                // $(".delete-btn-wrapper").css("visibility", "hidden");
                $(".cover-container").css("box-shadow", "var(--ui_bookshadow)");
            });
        }

        return book;
    },

    /**
     * Updates all book covers with current theme colors and fonts
     * @async
     * @param {boolean} colorOnly - Whether to only update the book covers' colors
     * @param {string} message - Message to log
     */
    async updateAllBookCovers(colorOnly = false, message = "") {
        if (!CONFIG.CONST_UI.COVER_GENERATOR_CONFIG.USE_CANVAS && colorOnly) {
            return;
        }

        Array.prototype.slice.call(document.getElementsByClassName("book")).forEach((book) => {
            const book_filename = book.getAttribute("data-filename");
            const bookNameAndAuthor =
                $(book).data("bookNameAndAuthor") ??
                TextProcessor.getBookNameAndAuthor(removeFileExtension(book_filename));
            const coverSettings = this._getCoverSettings({
                width: getSizePrecise(CONFIG.RUNTIME_VARS.STYLE.ui_bookCoverWidth),
                height: getSizePrecise(CONFIG.RUNTIME_VARS.STYLE.ui_bookCoverHeight),
                bookNameAndAuthor: bookNameAndAuthor,
            });
            let book_cover;
            if (CONFIG.CONST_UI.COVER_GENERATOR_CONFIG.USE_CANVAS) {
                book_cover = book.getElementsByTagName("canvas")[0].getContext("2d");
            } else {
                book_cover = book.getElementsByClassName("cover-canvas")[0];
            }
            this._coverGenerator.generate(coverSettings, book_cover);
        });
    },

    /**
     * Gets all book names and authors
     * @returns {Array} Array of book names and authors
     */
    getAllBookNamesAndAuthors() {
        const allBookNamesAndAuthors = { booknames: [], authors: [] };
        Array.prototype.slice.call(document.getElementsByClassName("book")).forEach((book) => {
            const book_filename = removeFileExtension(book.getAttribute("data-filename"));
            const bookNameAndAuthor =
                $(book).data("bookNameAndAuthor") ??
                TextProcessor.getBookNameAndAuthor(removeFileExtension(book_filename));
            allBookNamesAndAuthors.booknames.push(bookNameAndAuthor.bookName);
            allBookNamesAndAuthors.authors.push(bookNameAndAuthor.author);
        });
        return allBookNamesAndAuthors;
    },

    /**
     * Gets all unique characters from book names, authors, or both.
     * @returns {Object} Object with bookNameChars and bookAuthorChars
     * @returns {Object} bookNameChars - Set of unique characters from book names
     * @returns {Object} bookAuthorChars - Set of unique characters from book authors
     */
    getAllBookNamesAndAuthorsCharacters() {
        const bookNameChars = new Set();
        const bookAuthorChars = new Set();
        Array.from(document.getElementsByClassName("book")).forEach((book) => {
            const book_filename = removeFileExtension(book.getAttribute("data-filename"));
            const bookNameAndAuthor =
                $(book).data("bookNameAndAuthor") ??
                TextProcessor.getBookNameAndAuthor(removeFileExtension(book_filename));

            for (const char of bookNameAndAuthor.bookName) bookNameChars.add(char);
            for (const char of bookNameAndAuthor.author) bookAuthorChars.add(char);
        });
        return { bookNameChars, bookAuthorChars };
    },

    /**
     * Loads book covers after all fonts are loaded
     * @param {string} message - Message to log
     */
    loadBookCoversAfterFontsLoaded(message = "") {
        const fontFamilyTitle = CONFIG.RUNTIME_VARS.STYLE.fontFamily_title.split(",")[0];
        const fontFamilyBody = CONFIG.RUNTIME_VARS.STYLE.fontFamily_body.split(",")[0];
        const { bookNameChars, bookAuthorChars } = this.getAllBookNamesAndAuthorsCharacters();
        if (message !== "") {
            console.log("[loadBookCoversAfterFontsLoaded]", {
                message,
                bookNameChars: Array.from(bookNameChars).join(""),
                bookAuthorChars: Array.from(bookAuthorChars).join(""),
                fontFamilyTitle: fontFamilyTitle + " " + this.isFontfaceDefined(fontFamilyTitle),
                fontFamilyBody: fontFamilyBody + " " + this.isFontfaceDefined(fontFamilyBody),
            });
        }
        Promise.all([
            ...Array.from(bookNameChars).map((char) => document.fonts.load(`12px "${fontFamilyTitle}"`, char)),
            ...Array.from(bookAuthorChars).map((char) => document.fonts.load(`12px "${fontFamilyBody}"`, char)),
        ])
            .then(() => document.fonts.ready)
            .then(() => {
                console.log("All book cover fonts loaded, updating book covers");
                cbReg.go("updateAllBookCovers");
            })
            .catch((e) => {
                // console.warn("Failed to load all cover fonts:", e);
                cbReg.go("updateAllBookCovers");
            });
    },

    /**
     * Checks if a font face is defined
     * @param {string} fontFace - The font face to check
     * @returns {boolean} True if the font face is defined, false otherwise
     */
    isFontfaceDefined(fontFace) {
        return document.fonts.check(`12px "${fontFace}"`);
    },

    /**
     * Gets the language of a book
     * @async
     * @param {Object} book - Book object
     * @returns {Promise<boolean>} Language of the book
     */
    async _getBookLanguage(book) {
        if (book.isEastern !== undefined) {
            return book.isEastern;
        }
        const result = await TextProcessor.getLanguageAndEncodingFromBook(book.data);
        return result.isEastern;
    },

    /**
     * Refreshes the bookshelf display and book list
     * @async
     * @param {boolean} [hardRefresh=false] - Whether to completely rebuild the book list
     * @param {boolean} [sortBookshelf=true] - Whether to sort the books
     */
    async refreshBookList(hardRefresh = false, sortBookshelf = true) {
        // console.log(
        //     "Refreshing book list...",
        //     "hardRefresh:",
        //     hardRefresh,
        //     "sortBookshelf:",
        //     sortBookshelf,
        //     "enabled:",
        //     this.enabled
        // );
        if (this.enabled) {
            if (navigator.storage) {
                const storageInfo = await navigator.storage.estimate();
                if (storageInfo) {
                    $("#bookshelfUsagePct").html(((storageInfo.usage / storageInfo.quota) * 100).toFixed(1));
                    $("#bookshelfUsage").html(formatBytes(storageInfo.usage));
                    $("#bookshelfQuota").html(formatBytes(storageInfo.quota));
                }
            } else {
                // navigator.storage is not supported
                $("#bookshelfUsageText").hide();
            }
            try {
                const allBooks = await this.db.getAllBooks();
                for (const book of allBooks) {
                    const final_isFromLocal = book.isFromLocal ?? false;
                    const final_isOnServer = book.isOnServer ?? false;
                    const final_isEastern = await this._getBookLanguage(book);
                    const new_book = {
                        name: book.name,
                        size: book.data.size,
                        isFromLocal: final_isFromLocal,
                        isOnServer: final_isOnServer,
                        isEastern: final_isEastern,
                    };
                    if (book.isEastern === undefined || book.isEastern !== final_isEastern) {
                        await this.db.updateBookLanguage(book.name, final_isEastern);
                    }

                    const lastOpenedTimestamp = localStorage.getItem(`${new_book.name}_lastopened`);
                    if (lastOpenedTimestamp) {
                        new_book.lastOpenedTimestamp = lastOpenedTimestamp;
                        new_book.progress = getProgressText(new_book.name, false);
                        new_book.isFinished = getIsBookFinished(new_book.name);
                    }

                    // CONFIG.VARS.ALL_BOOKS_INFO = CONFIG.VARS.ALL_BOOKS_INFO.filter(f => f.name !== new_book.name).concat([new_book]);
                    CONFIG.VARS.ALL_BOOKS_INFO[new_book.name] = new_book;
                }

                let allBooksInfo_names = Object.keys(CONFIG.VARS.ALL_BOOKS_INFO);
                if (sortBookshelf) {
                    allBooksInfo_names = this._sortBookshelf(allBooksInfo_names);
                }

                // console.log("allBooksInfo", CONFIG.VARS.ALL_BOOKS_INFO);
                // console.log(CONFIG.VARS.ALL_BOOKS_INFO.length);

                const container = $(".bookshelf .booklist");
                let prevScrollTop = container.scrollTop();

                if (hardRefresh) container.html("");
                for (const [idx, bookname] of allBooksInfo_names.entries()) {
                    const bookInfo = CONFIG.VARS.ALL_BOOKS_INFO[bookname];
                    if (!hardRefresh && container.children().length > 0) {
                        // try to find the book in container.children()
                        // if container already contains the book, remove the book first
                        // otherwise, add the book to the bookshelf
                        const bookIndex = Array.prototype.slice
                            .call(container.children())
                            .findIndex((book) => book.getAttribute("data-filename") === bookInfo.name);
                        if (bookIndex !== -1) {
                            // console.log(`Book ${bookInfo.name} is already in bookshelf at index=${bookIndex}. Removing it first.`);
                            container.children().eq(bookIndex).remove();
                        }
                    }
                    container.append(this.genBookItem(bookInfo, idx));
                    // this.genBookItem(bookInfo, idx).hide().appendTo(container).fadeIn(300);
                }

                // Restore scroll: if hardRefresh, scroll to top. Otherwise, restore.
                if (hardRefresh) {
                    container.scrollTop(0);
                } else {
                    container.scrollTop(prevScrollTop);
                }

                await container.trigger("contentchange");
            } catch (e) {
                console.log(e);
            }

            // Update filter bar
            this._updateFilterBar();

            // If there is no book in bookshelf, hide the bookshelf
            // Otherwise, show the bookshelf, but not the bookshelf trigger button
            // Only show the bookshelf trigger button when a book is opened
            // All these actions should not add history to the browser
            if (Object.keys(CONFIG.VARS.ALL_BOOKS_INFO).length <= 0) {
                this.hide(true, false);
                this.hideTriggerBtn();
            } else {
                await this.show(false);
                // this.showTriggerBtn();
            }
        }
    },

    /**
     * Sorts the bookshelf by the given criteria
     * @param {Array} allBooksInfo_names - Array of book names
     * @returns {Array} Sorted array of book names
     */
    _sortBookshelf(allBooksInfo_names) {
        // sort allBooksInfo by:
        // 1. if isFinished is true, then put to the end of the list
        // and sort by last opened timestamp;
        // 2. if isFinished is false, then sort by last opened timestamp
        // 3. if last opened timestamp is not available, then sort by filename
        allBooksInfo_names.sort((a, b) => {
            if (CONFIG.VARS.ALL_BOOKS_INFO[a].isFinished && !CONFIG.VARS.ALL_BOOKS_INFO[b].isFinished) {
                return 1;
            } else if (!CONFIG.VARS.ALL_BOOKS_INFO[a].isFinished && CONFIG.VARS.ALL_BOOKS_INFO[b].isFinished) {
                return -1;
            } else {
                if (
                    !CONFIG.VARS.ALL_BOOKS_INFO[a].lastOpenedTimestamp &&
                    !CONFIG.VARS.ALL_BOOKS_INFO[b].lastOpenedTimestamp
                ) {
                    return CONFIG.VARS.ALL_BOOKS_INFO[a].name.localeCompare(CONFIG.VARS.ALL_BOOKS_INFO[b].name, "zh");
                } else if (
                    CONFIG.VARS.ALL_BOOKS_INFO[a].lastOpenedTimestamp &&
                    !CONFIG.VARS.ALL_BOOKS_INFO[b].lastOpenedTimestamp
                ) {
                    return -1;
                } else if (
                    !CONFIG.VARS.ALL_BOOKS_INFO[a].lastOpenedTimestamp &&
                    CONFIG.VARS.ALL_BOOKS_INFO[b].lastOpenedTimestamp
                ) {
                    return 1;
                } else {
                    return (
                        CONFIG.VARS.ALL_BOOKS_INFO[b].lastOpenedTimestamp -
                        CONFIG.VARS.ALL_BOOKS_INFO[a].lastOpenedTimestamp
                    );
                }
            }
        });

        return allBooksInfo_names;
    },

    /**
     * Gets or creates the CoverGenerator instance
     * @private
     * @returns {getCoverGenerator} The cover generator instance
     */
    async _getCoverGenerator(baselineOffsets = {}) {
        if (!this._coverGenerator) {
            let getCoverGenerator;
            if (CONFIG.CONST_UI.COVER_GENERATOR_CONFIG.USE_CANVAS) {
                ({ getCoverGenerator } = await import("../components/cover-generator-canvas.js"));
            } else {
                ({ getCoverGenerator } = await import("../components/cover-generator-dom.js"));
            }
            this._coverGenerator = getCoverGenerator(baselineOffsets);
        }
        this._coverGenerator.updateFontBaselineOffsets(baselineOffsets);
        return this._coverGenerator;
    },

    /**
     * Creates cover settings object for a book
     * @private
     * @param {Object} params - Parameters for cover generation
     * @param {number} params.width - Canvas width
     * @param {number} params.height - Canvas height
     * @param {Object} params.bookNameAndAuthor - Book name and author info
     * @returns {Object} Cover settings object
     */
    _getCoverSettings({ width, height, bookNameAndAuthor }) {
        return {
            width,
            height,
            padding: width / 8,
            bottomRectHeightRatio: 0.3,
            coverColor1: CONFIG.RUNTIME_VARS.STYLE.mainColor_inactive,
            coverColor2: CONFIG.RUNTIME_VARS.STYLE.mainColor_active,
            textColor1: CONFIG.RUNTIME_VARS.STYLE.bgColor,
            textColor2: CONFIG.RUNTIME_VARS.STYLE.bgColor,
            font1: CONFIG.RUNTIME_VARS.STYLE.fontFamily_title_zh,
            font2: CONFIG.RUNTIME_VARS.STYLE.fontFamily_body_zh,
            bookTitle: bookNameAndAuthor.bookName,
            authorName: bookNameAndAuthor.author,
        };
    },

    /**
     * Aligns the filter bar to the first book of the bookshelf and also aligns the filter bar to the right of the last book of the first row
     * @private
     */
    _alignFilterBar() {
        setTimeout(() => {
            const filterBar = document.querySelector(".booklist-filter-bar");
            const firstBook = document.querySelector(".bookshelf .book");
            const booklist = document.querySelector(".bookshelf .booklist");

            if (!firstBook || !filterBar || !booklist) {
                // console.warn("Required elements not found.");
                return;
            }

            // Get the size and spacing of a single book
            const bookStyle = window.getComputedStyle(firstBook);
            const bookWidth = firstBook.offsetWidth;
            const bookMarginLeft = parseFloat(bookStyle.marginLeft);
            const bookMarginRight = parseFloat(bookStyle.marginRight);
            const bookTotalWidth = bookWidth + bookMarginLeft + bookMarginRight;

            // Get the margin of the booklist
            const booklistStyle = window.getComputedStyle(booklist);
            const booklistMarginValue = parseFloat(booklistStyle.marginLeft);

            // Get the available width of the booklist
            const booklistRect = booklist.getBoundingClientRect();
            const availableWidth = booklistRect.width;

            // Calculate the maximum number of books per row
            const maxBooksPerRow = Math.floor(availableWidth / bookTotalWidth);

            // Calculate the center offset when the row is full
            const totalRowWidth = bookTotalWidth * maxBooksPerRow - (bookMarginLeft + bookMarginRight);
            const remainingSpace = availableWidth - totalRowWidth;
            const centerOffset = remainingSpace / 2;

            // Calculate the theoretical position of the first book (if the row is full)
            const relativeLeft = booklistMarginValue + centerOffset;

            // console.log({
            //     maxBooksPerRow,
            //     bookTotalWidth,
            //     availableWidth,
            //     totalRowWidth,
            //     centerOffset,
            //     booklistMarginValue,
            //     relativeLeft,
            //     theoreticalLastBookRight: relativeLeft + totalRowWidth,
            //     filterBarLeft: relativeLeft - getSizePrecise(),
            //     filterBarWidth: totalRowWidth + 2 * getSizePrecise(),
            // });

            // Apply position and width
            filterBar.style.left = `${relativeLeft - getSizePrecise()}px`;
            filterBar.style.width = `${totalRowWidth + 2 * getSizePrecise()}px`;
        }, 0);
    },

    /**
     * Updates the filter bar with book list filter buttons, book count, and remove all books button
     * @private
     */
    _updateFilterBar() {
        /**
         * Get all book information and initialize variables
         */
        const allBooks = Object.values(CONFIG.VARS.ALL_BOOKS_INFO);
        const filterBar = $(".booklist-filter-bar");
        const booklist = $(".bookshelf .booklist");

        // If no books or filter bar is set to behidden, hide the filter bar
        if (allBooks.length === 0 || !CONFIG.CONST_CONFIG.SHOW_FILTER_BAR) {
            filterBar.removeClass("visible");
            filterBar.addClass("hidden");
            return;
        }

        // Helper function to create filter buttons
        const createFilterButton = (text, className = "") => {
            return $("<button></button>").addClass("booklist-filter-btn").addClass(className).text(text);
        };

        // Clear existing filter bar
        filterBar.empty();

        /**
         * Step 1: Create filter buttons on the left side of the filter bar
         */
        let filterButtonCount = 0;

        // Categorize books by language and status
        const categories = {
            chinese: allBooks.filter((book) => book.isEastern),
            english: allBooks.filter((book) => !book.isEastern),
            unread: allBooks.filter((book) => !book.lastOpenedTimestamp),
            inProgress: allBooks.filter(
                (book) => book.lastOpenedTimestamp && parseInt(book.progress) < 99 && !book.isFinished
            ),
            finishing: allBooks.filter(
                (book) => book.lastOpenedTimestamp && parseInt(book.progress) >= 99 && !book.isFinished
            ),
            finished: allBooks.filter((book) => book.isFinished),
        };

        // Get the names of the categories
        const categories_names = {
            chinese: CONFIG.RUNTIME_VARS.STYLE.ui_bookshelf_filterBtn_chinese,
            english: CONFIG.RUNTIME_VARS.STYLE.ui_bookshelf_filterBtn_english,
            unread: CONFIG.RUNTIME_VARS.STYLE.ui_bookshelf_filterBtn_unread,
            finishing: CONFIG.RUNTIME_VARS.STYLE.ui_bookshelf_filterBtn_finishing,
            inProgress: CONFIG.RUNTIME_VARS.STYLE.ui_bookshelf_filterBtn_inProgress,
            finished: CONFIG.RUNTIME_VARS.STYLE.ui_bookshelf_filterBtn_finished,
        };

        // Print the number of books in each category
        // console.group("Number of books in each category");
        // Object.keys(categories).forEach((category) => {
        //     console.log(`${category}: ${categories[category].length}`);
        // });
        // console.groupEnd();

        // Create button container
        const buttonContainer = $("<div></div>").addClass("booklist-filter-buttons");

        // Create "All" button if any filterable categories exist
        if (allBooks.length > 0) {
            buttonContainer.append(createFilterButton(CONFIG.RUNTIME_VARS.STYLE.ui_bookshelf_filterBtn_all, "active"));
            filterButtonCount++;
        }

        // Add language buttons only if both types of books exist
        if (categories.chinese.length > 0 && categories.english.length > 0) {
            buttonContainer.append(createFilterButton(categories_names.chinese));
            buttonContainer.append(createFilterButton(categories_names.english));
            filterButtonCount += 2;
        }

        // Add filter buttons for categories
        for (const [category, books] of Object.entries(categories)) {
            if (category !== "chinese" && category !== "english" && books.length > 0) {
                buttonContainer.append(createFilterButton(categories_names[category]));
                filterButtonCount++;
            }
        }

        /**
         * Step 2: Create book counter and remove all button on the right side of the filter bar
         */
        // Add book counter and remove all button container
        const utilitiesContainer = $("<div></div>").addClass("booklist-filter-utilities");

        // Add book counter on the right side of the filter bar
        const totalBooks = allBooks.length;
        // Instead of CONFIG.RUNTIME_VARS.STYLE.ui_bookshelf_filterBtn_counter, we need to chop the last character of the string when the language is English and the last character is "s" and the total books is less than or equal to 1.
        const counterPrefix =
            CONFIG.RUNTIME_VARS.STYLE.ui_bookshelf_filterBtn_counter_prefix +
            (CONFIG.RUNTIME_VARS.WEB_LANG === "en" ? " " : "");
        const counterSuffix =
            CONFIG.RUNTIME_VARS.STYLE.ui_bookshelf_filterBtn_counter_suffix +
            (CONFIG.RUNTIME_VARS.WEB_LANG === "en" && totalBooks > 1 ? "s" : "");
        const counterElement = $("<button></button>")
            .addClass("booklist-filter-counter prevent-select")
            .attr("disabled", true)
            .text(`${counterPrefix}${totalBooks} ${counterSuffix}`);

        // Add remove all button
        const removeAllBtn = $("<button></button>")
            .addClass("booklist-remove-all")
            .html(
                `${ICONS.DELETE_ALL_BOOKS}<span class="booklist-remove-all-text">${CONFIG.RUNTIME_VARS.STYLE.ui_bookshelf_removeAllBooks}</span>`
            );

        // Add click handler for remove all button
        removeAllBtn.on("click", () => {
            if (allBooks.length === 0) return;

            PopupManager.showConfirmationPopup({
                iconName: "DELETE_ALL_BOOKS",
                title: CONFIG.RUNTIME_VARS.STYLE.ui_removeAllBooks_confirm_title,
                text: CONFIG.RUNTIME_VARS.STYLE.ui_removeAllBooks_confirm_text,
                onConfirm: () => {
                    // Remove all books
                    const promises = allBooks.map(
                        (book) =>
                            new Promise((resolve) => {
                                this.removeBook(book.name, resolve);
                                removeHistory(book.name);
                            })
                    );

                    Promise.all(promises).then(() => {
                        // Clear the booklist
                        $(".booklist").empty();
                        CONFIG.VARS.ALL_BOOKS_INFO = {};
                        $(".booklist").trigger("contentchange");

                        PopupManager.showNotification({
                            iconName: "DELETE_ALL_BOOKS",
                            text: CONFIG.RUNTIME_VARS.STYLE.ui_notification_text_deleteAllBooks,
                        });
                    });
                },
            });
        });

        // Add elements to containers
        utilitiesContainer.append(counterElement, removeAllBtn);

        /**
         * Step 3: Add left and right containers to filter bar
         */
        // Add left and right containers to filter bar
        filterBar.append(buttonContainer, utilitiesContainer);

        // Add click event handler for filter buttons
        filterBar.find(".booklist-filter-btn").on("click", function () {
            const $this = $(this);
            const filterType = $this.text();

            // Update button state
            filterBar.find(".booklist-filter-btn").removeClass("active");
            $this.addClass("active");

            // Filter books
            const books = $(".bookshelf .book");
            books.show(); // Show all books first

            // Filter books
            if (filterType !== CONFIG.RUNTIME_VARS.STYLE.ui_bookshelf_filterBtn_all) {
                books
                    .filter((_, book) => {
                        switch (filterType) {
                            case CONFIG.RUNTIME_VARS.STYLE.ui_bookshelf_filterBtn_chinese:
                                return !$(book).data("isEastern");
                            case CONFIG.RUNTIME_VARS.STYLE.ui_bookshelf_filterBtn_english:
                                return $(book).data("isEastern");
                            case CONFIG.RUNTIME_VARS.STYLE.ui_bookshelf_filterBtn_unread:
                                return !$(book).data("unRead");
                            case CONFIG.RUNTIME_VARS.STYLE.ui_bookshelf_filterBtn_finishing:
                                return !$(book).data("almostDone");
                            case CONFIG.RUNTIME_VARS.STYLE.ui_bookshelf_filterBtn_inProgress:
                                return !$(book).data("inProgress");
                            case CONFIG.RUNTIME_VARS.STYLE.ui_bookshelf_filterBtn_finished:
                                return !$(book).data("isFinished");
                        }
                    })
                    .hide();
            }
        });

        // Show or hide filter bar based on the number of buttons
        this._setFilterBarVisibility(filterButtonCount > 0);
    },

    /**
     * Sets the visibility of the filter bar
     * @param {boolean} visible - Whether to show or hide the filter bar
     * @private
     */
    _setFilterBarVisibility(visible) {
        const filterBar = $(".booklist-filter-bar");
        const booklist = $(".bookshelf .booklist");

        if (visible) {
            // console.log("show filter bar");

            // Check if the filter bar is empty, if so, create the filter bar
            if (filterBar.find(".booklist-filter-btn").length === 0) {
                this._updateFilterBar();
            }

            // Show all filter buttons
            filterBar.find(".booklist-filter-btn").show();

            // Align the filter bar
            this._alignFilterBar();

            // Use requestAnimationFrame to ensure the position is set before showing
            requestAnimationFrame(() => {
                filterBar.removeClass("hidden");
                filterBar.addClass("visible");
            });

            // Set the booklist's top margin to negative value of the filter bar's height
            booklist.css("margin-top", `-40px`);
        } else {
            // console.log("hide filter bar");

            // Hide filter buttons, keep the counter visible
            filterBar.find(".booklist-filter-btn").hide();

            // Important: even when hiding buttons, call the alignment function
            this._alignFilterBar();

            // Use requestAnimationFrame to ensure the position is set before showing
            requestAnimationFrame(() => {
                filterBar.removeClass("visible");
                filterBar.addClass("hidden");
            });

            // Set the booklist's top margin to 0
            booklist.css("margin-top", "0px");
        }
    },

    /**
     * Resets the dropzone styles
     * @private
     */
    _resetDropzoneStyles() {
        CONFIG.RUNTIME_VARS.STYLE.ui_dropZoneImgText_lineNumber = this._detectLineWrap(
            CONFIG.DOM_ELEMENT.DROPZONE_TEXT
        );

        if (isVariableDefined(CONFIG.DOM_ELEMENT.DROPZONE_TEXT)) {
            $(CONFIG.DOM_ELEMENT.DROPZONE_TEXT).removeClass("dropzone-text-custom").addClass("dropzone-text-default");
        }
        if (isVariableDefined(CONFIG.DOM_ELEMENT.DROPZONE_IMG)) {
            $(CONFIG.DOM_ELEMENT.DROPZONE_IMG).removeClass("dropzone-img-custom").addClass("dropzone-img-default");
        }
    },

    /**
     * Sets custom styles for the dropzone
     * Switches from default style classes to custom style classes
     * @private
     */
    _setDropzoneStyles() {
        CONFIG.RUNTIME_VARS.STYLE.ui_dropZoneImgText_lineNumber = this._detectLineWrap(
            CONFIG.DOM_ELEMENT.DROPZONE_TEXT
        );

        if (isVariableDefined(CONFIG.DOM_ELEMENT.DROPZONE_TEXT)) {
            $(CONFIG.DOM_ELEMENT.DROPZONE_TEXT).removeClass("dropzone-text-default").addClass("dropzone-text-custom");
        }
        if (isVariableDefined(CONFIG.DOM_ELEMENT.DROPZONE_IMG)) {
            $(CONFIG.DOM_ELEMENT.DROPZONE_IMG).removeClass("dropzone-img-default").addClass("dropzone-img-custom");
        }
    },

    /**
     * Detects the number of lines in an element
     * @private
     */
    _detectLineWrap(element) {
        // Get the computed line height of the element
        const computedStyle = window.getComputedStyle(element);
        const lineHeight = parseFloat(computedStyle.lineHeight);

        // Get the scroll height of the element
        const scrollHeight = element.scrollHeight;

        // Calculate the number of lines
        const lines = Math.round(scrollHeight / lineHeight);

        return lines; // Returns the number of lines (e.g., 2, 3, etc.)
    },

    /**
     * Shows the bookshelf UI if enabled and contains books
     * @async
     * @param {boolean} [addToHistory=true] - If true, add the bookshelf state to history
     * @returns {Object} The bookshelf instance for chaining
     */
    async show(addToHistory = true) {
        if (this.enabled) {
            if (isVariableDefined($(".bookshelf")) && $(".bookshelf .booklist").children().length > 0) {
                $(".bookshelf").show();
                await $(".booklist").trigger("contentchange");

                // Remember current book state (if any)
                this.logger.log("in show", window.history.state);
                if (addToHistory && (!window.history.state || window.history.state.type !== "bookshelf")) {
                    window.history.pushState({ type: "bookshelf" }, "");
                }

                return;
            }
        }
        return this;
    },

    /**
     * Hides the bookshelf UI and resets dropzone elements
     * @param {boolean} [doNotRemove=true] - If false, removes the bookshelf element instead of hiding
     * @param {boolean} [addToHistory=true] - If true, add the bookshelf state to history
     * @returns {Object} The bookshelf instance for chaining
     */
    hide(doNotRemove = true, addToHistory = true) {
        if (this.enabled) {
            this._resetDropzoneStyles();
            if (!doNotRemove) {
                $(".bookshelf").remove();
            } else {
                $(".bookshelf").hide();
            }

            // Remember bookshelf state
            this.logger.log("in hide", window.history.state);
            if (
                addToHistory &&
                CONFIG.VARS.FILENAME &&
                (!window.history.state ||
                    window.history.state.type !== "book" ||
                    window.history.state.bookName !== CONFIG.VARS.FILENAME)
            ) {
                window.history.pushState(
                    {
                        type: "book",
                        bookName: CONFIG.VARS.FILENAME,
                    },
                    ""
                );
            }
        }
        return this;
    },

    /**
     * Hides the bookshelf trigger button
     * @param {boolean} [doNotRemove=true] - If false, removes the button instead of hiding
     */
    hideTriggerBtn(doNotRemove = true) {
        if (!doNotRemove) {
            $("#bookshelf-btn").remove();
        } else {
            $("#bookshelf-btn").hide();
        }
    },

    /**
     * Shows the bookshelf trigger button
     */
    showTriggerBtn() {
        $("#bookshelf-btn").show();
    },

    /**
     * Periodic loop to update book progress and save current filename
     * @note Replaced by: 1) triggering the `_tokenAfterBookOpen` callback after the book is opened (set _FILENAME_ in localStorage)
     * 2) triggering the `refreshBookList` -> `getBookItem` -> `updateBookProgressInfo` after the book is closed (update book progress info)
     * 3) triggering the `closeBook` event after the book is closed (clear `_FILENAME_` in localStorage)
     * No need to loop for every second anymore.
     */
    loop() {
        if (this.enabled && CONFIG.CONST_UI.COVER_GENERATOR_CONFIG.USE_CANVAS && this._loopCount < this._loopCountMax) {
            // localStorage.setItem(this._FILENAME_, CONFIG.VARS.FILENAME);
            // if (CONFIG.VARS.FILENAME) this.updateBookProgressInfo(CONFIG.VARS.FILENAME, null, true);

            if (!CONFIG.VARS.IS_BOOK_OPENED) {
                // console.log("looping...");
                cbReg.go("updateAllBookCovers");
            }

            this._loopCount++;
            setTimeout(() => this.loop(), this._loopInterval);
        }
    },

    /**
     * Enables the bookshelf module and sets up event handlers
     * @returns {Object} The bookshelf instance for chaining
     */
    async enable() {
        if (!this.enabled) {
            this.db = new BookshelfDB();
            await this.db.upgradeBookshelfDB();
            this.enabled = true;

            // Register the callback after database save
            this._tokenAfterDBSave = cbReg.add("afterDBSave", () => FileHandler.markDBSaveComplete());

            // Register the callback before file load
            this._tokenBeforeFileLoad = cbReg.add("fileBefore", async (file) => {
                // console.log("fileBefore", file);
                await this.saveBook(
                    file,
                    true, // isFromLocal
                    false, // isOnServer
                    false, // refreshBookshelf
                    false, // hardRefresh
                    true, // sortBookshelf
                    true // inFileProcessingCallback
                );
            });

            // Initialize the cover generator
            this._coverGenerator = await this._getCoverGenerator(CONFIG.RUNTIME_VARS.FONT_BASELINE_OFFSETS);
            if (window.fetchFontBaselineOffsetsPromise) {
                window.fetchFontBaselineOffsetsPromise.then((fontBaselineOffsets) => {
                    // console.log("update baseline offsets", fontBaselineOffsets);
                    this._coverGenerator.updateFontBaselineOffsets(fontBaselineOffsets);
                    cbReg.go("truncateBookCoverText");
                });
            }

            // Register the callback after book opened
            this._tokenAfterBookOpen = cbReg.add("fileAfter", () => {
                CONFIG.VARS.IS_BOOK_OPENED = true;
                localStorage.setItem(this._FILENAME_, CONFIG.VARS.FILENAME);
            });

            // Upgrade the bookshelf database
            if (CONFIG.RUNTIME_CONFIG.UPGRADE_DB) {
                await this.db.upgradeBookshelfDB(true);
            }

            // Print the bookshelf database
            if (CONFIG.RUNTIME_CONFIG.PRINT_DATABASE) {
                await this.db.printAllDatabases();
            }

            // Listen for startLoop event
            cbReg.add("startBookshelfLoop", () => {
                this._loopCount = 0;
                setTimeout(() => this.loop(), this._loopInterval);
            });

            // Listen for refreshBookList event
            cbReg.add("refreshBookList", async (e) => {
                const { hardRefresh, sortBookshelf } = e;
                await this.refreshBookList(hardRefresh, sortBookshelf);
            });

            // Listen for settings change events
            cbReg.add("updateAllBookCovers", async (e = {}) => {
                const { colorOnly = false, message = "" } = e;
                await this.updateAllBookCovers(colorOnly, message);
                cbReg.go("truncateBookCoverText");
            });

            // Listen for updateAllBookCoversAfterFontsLoaded event
            cbReg.add("updateAllBookCoversAfterFontsLoaded", (e = {}) => {
                const { message = "" } = e;
                this.loadBookCoversAfterFontsLoaded(message);
            });

            // Listen for updateFilterBar event
            cbReg.add("updateFilterBar", () => {
                this._updateFilterBar();
            });

            // Listen for showBookshelfTriggerBtn event
            cbReg.add("showBookshelfTriggerBtn", () => {
                this.showTriggerBtn();
            });

            // Listen for hideBookshelfTriggerBtn event
            cbReg.add("hideBookshelfTriggerBtn", () => {
                this.hideTriggerBtn();
            });

            // Listen for showBookshelf event
            cbReg.add("showBookshelf", async () => {
                await this.show();
            });

            // Listen for hideBookshelf event
            cbReg.add("hideBookshelf", () => {
                this.hide();
            });

            // Listen for handleMultipleBooks event
            cbReg.add("handleMultipleBooks", async (e) => {
                const { files, isFromLocal, isOnServer } = e;

                if (this.enabled) {
                    showLoadingScreen();

                    for (const [i, file] of files.entries()) {
                        const final_isFromLocal = getIsFromLocal(file.name) || isFromLocal;
                        const final_isOnServer = getIsOnServer(file.name) || isOnServer;
                        setIsFromLocal(file.name, final_isFromLocal);
                        setIsOnServer(file.name, final_isOnServer);
                        // console.log(`Loading file ${i + 1} of ${files.length}; ${i === files.length - 1}`);

                        await this.saveBook(
                            file,
                            final_isFromLocal,
                            final_isOnServer,
                            i === files.length - 1,
                            false,
                            i === files.length - 1
                        );
                    }

                    resetDropZoneState();
                    hideLoadingScreen(false);
                } else {
                    console.log(
                        "Multiple files selected, only the first one will be loaded since bookshelf is disabled."
                    );
                    const firstFile = files[0];
                    setIsFromLocal(firstFile.name, getIsFromLocal(firstFile.name) || isFromLocal);
                    setIsOnServer(firstFile.name, getIsOnServer(firstFile.name) || isOnServer);
                    setBookLastReadTimestamp(firstFile.name);
                    await FileHandler.handleSelectedFile([firstFile], null, null, true);
                }
            });

            // Listen for handleMultipleBooksWithoutLoading event
            cbReg.add("handleMultipleBooksWithoutLoading", async (e) => {
                const { files, isFromLocal, isOnServer } = e;

                if (this.enabled) {
                    showLoadingScreen();
                    // CONFIG.VARS.ALL_BOOKS_INFO = {};

                    try {
                        // Get all input books
                        for (const [i, file] of files.entries()) {
                            const final_isFromLocal = getIsFromLocal(file.name) || isFromLocal;
                            const final_isOnServer = getIsOnServer(file.name) || isOnServer;
                            setIsFromLocal(file.name, final_isFromLocal);
                            setIsOnServer(file.name, final_isOnServer);
                            // await this.saveBook(file, final_isFromLocal, final_isOnServer, (i === files.length - 1), false, (i === files.length - 1));
                            file.isFromLocal = final_isFromLocal;
                            file.isOnServer = final_isOnServer;
                            file.isEastern = file.isEastern ?? true;
                            file.encoding = file.encoding ?? "utf-8";
                            file.size = file.size ?? 0;

                            const lastOpenedTimestamp = localStorage.getItem(`${file.name}_lastopened`);
                            if (lastOpenedTimestamp) {
                                file.lastOpenedTimestamp = lastOpenedTimestamp;
                                file.progress = getProgressText(file.name, false);
                            }
                            // CONFIG.VARS.ALL_BOOKS_INFO.push(file);
                            CONFIG.VARS.ALL_BOOKS_INFO[file.name] = file;
                        }

                        // // Get all existing books
                        // const allBooks = await this.db.getAllBooks();
                        // for (const book of allBooks) {
                        //     const final_isFromLocal = book.isFromLocal || false;
                        //     const final_isOnServer = book.isOnServer || false;
                        //     const new_file = {
                        //         name: book.name,
                        //         size: book.data.size,
                        //         isFromLocal: final_isFromLocal,
                        //         isOnServer: final_isOnServer,
                        //     };

                        //     const lastOpenedTimestamp = localStorage.getItem(`${new_file.name}_lastopened`);
                        //     if (lastOpenedTimestamp) {
                        //         new_file.lastOpenedTimestamp = lastOpenedTimestamp;
                        //         new_file.progress = getProgressText(new_file.name, false);
                        //     }

                        //     // CONFIG.VARS.ALL_BOOKS_INFO = CONFIG.VARS.ALL_BOOKS_INFO.filter(f => f.name !== new_file.name).concat([new_file]);
                        //     CONFIG.VARS.ALL_BOOKS_INFO[new_file.name] = new_file;
                        // }

                        // Sort the bookshelf
                        let allBooksInfo_names = Object.keys(CONFIG.VARS.ALL_BOOKS_INFO);
                        allBooksInfo_names = this._sortBookshelf(allBooksInfo_names);

                        // console.log("allBooksInfo", allBooksInfo_names);
                        // console.log(allBooksInfo_names.length);

                        const container = $(".bookshelf .booklist");
                        container.html("");
                        for (const [idx, bookname] of allBooksInfo_names.entries()) {
                            const bookInfo = CONFIG.VARS.ALL_BOOKS_INFO[bookname];
                            // console.log(idx, bookInfo);
                            // container.append(this.genBookItem(bookInfo, idx));

                            // Show book one by one
                            // this.genBookItem(bookInfo, idx).hide().delay(idx*50).fadeIn(50).appendTo(container);

                            // Show book all at once
                            this.genBookItem(bookInfo, idx).hide().fadeIn(300).appendTo(container);
                        }
                        await container.trigger("contentchange");
                    } catch (e) {
                        console.log("Error in handleMultipleBooksWithoutLoading:", e);
                    }

                    // If there is no book in bookshelf, hide the bookshelf
                    // Otherwise, show the bookshelf, but not the bookshelf trigger button
                    // Only show the bookshelf trigger button when a book is opened
                    if (Object.keys(CONFIG.VARS.ALL_BOOKS_INFO).length <= 0) {
                        this.hide();
                        this.hideTriggerBtn();
                    } else {
                        await this.show();
                        // this.showTriggerBtn();
                    }

                    resetDropZoneState();
                    hideLoadingScreen(false);
                }
            });

            // Listen for printAllBooks event
            cbReg.add("printAllBooks", async () => {
                await this.db.printAllDatabases();
            });

            // Listen for openBook event
            cbReg.add("openBook", async (e) => {
                const { name, forceRefresh } = e;
                await this.openBook(name, forceRefresh);
            });

            // Listen for reopenBook event
            cbReg.add("reopenBook", async () => {
                await this.reopenBook();
            });

            // Listen for closeBook event
            cbReg.add("closeBook", () => {
                CONFIG.VARS.IS_BOOK_OPENED = false;
                // Clear the filename from localStorage for reopening the same book
                localStorage.setItem(this._FILENAME_, "");
            });

            // Listen for saveProcessedBook event
            cbReg.add("saveProcessedBook", async (e) => {
                await this.db.updateProcessedBook(e.name, e);
            });

            // Listen for saveProcessedBookFromServer event
            cbReg.add("saveProcessedBookFromServer", async (e) => {
                const { processedBook, refreshBookshelf, hardRefresh, sortBookshelf, inFileProcessingCallback } = e;
                try {
                    await this.saveProcessedBookFromServer(
                        processedBook,
                        refreshBookshelf,
                        hardRefresh,
                        sortBookshelf,
                        inFileProcessingCallback
                    );
                } catch (error) {
                    console.error("Error saving processed book:", error);
                }
            });

            // Listen for toggleFilterBar event
            cbReg.add("toggleFilterBar", () => {
                this._setFilterBarVisibility(CONFIG.CONST_CONFIG.SHOW_FILTER_BAR);
            });

            // Create the bookshelf element
            $(`<div id="bookshelf" class="bookshelf">
            <div class="cached-storage-title">
                <span class="cached-storage-title-text"></span>
                <div class="cached-storage-sub-title"><br/>
                    <span id="bookshelfUsageText"></span>&nbsp;
                    <span id="bookshelfUsagePct"></span>% (<span id="bookshelfUsage"></span> / <span id="bookshelfQuota"></span>)
                </div>
            </div>
            <nav class="booklist-filter-bar"></nav>
            <div class="booklist"></div>
            <div class="bookshelf-btn-group">
                <div id="scroll-top-btn" class="btn-icon hasTitle" data-title="${CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_bookshelf_scrollTop}" style="visibility:hidden">
                    ${ICONS.SCROLL_TOP}
                </div>
                <div id="scroll-bottom-btn" class="btn-icon hasTitle" data-title="${CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_bookshelf_scrollBottom}" style="visibility:hidden">
                    ${ICONS.SCROLL_BOTTOM}
                </div>
            </div>
            </div>`)
                .hide()
                .on("dblclick", (e) => {
                    // disable double click event inside bookshelf
                    e.stopPropagation();
                })
                .appendTo(CONFIG.DOM_ELEMENT.DROPZONE);

            function defineScrollBtns() {
                const $booklist = $(".booklist");
                const scrollTop = $booklist.scrollTop();
                const scrollHeight = $booklist[0].scrollHeight;
                const offsetHeight = $booklist[0].offsetHeight;

                if ($booklist.css("visibility") === "visible") {
                    if (scrollTop > 0) {
                        $("#scroll-top-btn")
                            .css("visibility", "visible")
                            .on("click", () => {
                                // $booklist.scrollTop = 0;
                                $booklist.stop(true, false);
                                $booklist.animate({ scrollTop: 0 }, scrollHeight / 10);
                            });
                    } else {
                        $("#scroll-top-btn").css("visibility", "hidden");
                    }
                    if (scrollHeight - offsetHeight - scrollTop > 1) {
                        $("#scroll-bottom-btn")
                            .css("visibility", "visible")
                            .on("click", () => {
                                $booklist.stop(true, false);
                                $booklist.animate(
                                    {
                                        scrollTop: scrollHeight - offsetHeight,
                                    },
                                    scrollHeight / 10
                                );
                            });
                    } else {
                        $("#scroll-bottom-btn").css("visibility", "hidden");
                    }
                }
            }

            $(".booklist").on("scroll", () => {
                defineScrollBtns();
                $(".dot-menu__checkbox").prop("checked", false);
                $(".bookinfo-menu").remove();
            });

            $(".booklist").on("contentchange", async (e) => {
                // set bookshelf height
                const element = e.target;
                const bookWidth = $(".book").outerWidth(true);
                const bookHeight = $(".book").outerHeight(true);
                const windowHeight = $(CONFIG.DOM_ELEMENT.DROPZONE).outerHeight(true);
                const windowWidth = $(CONFIG.DOM_ELEMENT.DROPZONE).outerWidth(true);
                let numBookshelfRows = Math.ceil($(".book").length / Math.floor(element.offsetWidth / bookWidth));
                numBookshelfRows = isFinite(numBookshelfRows) ? numBookshelfRows : 0;

                // Define transition
                const transition = "none";
                // const transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
                // const transition =
                //     "width 0.3s cubic-bezier(0.4, 0, 0.2, 1), height 0.3s cubic-bezier(0.4, 0, 0.2, 1), top 0.3s cubic-bezier(0.4, 0, 0.2, 1), font-size 0.3s cubic-bezier(0.4, 0, 0.2, 1)";

                if (numBookshelfRows > 0) {
                    const topPx = `max(calc(${
                        windowHeight - (bookHeight + 24) * numBookshelfRows
                    }px - 2 * var(--ui_booklist_padding)), 25%)`;
                    $(".bookshelf").css("top", topPx);
                    const topPxNum = parseInt($(".bookshelf").css("top"));

                    // Calculate the space available
                    const availableVerticalSpace = topPxNum;
                    const availableHorizontalSpace = windowWidth;
                    const verticalScaleFactor = Math.min(availableVerticalSpace / windowHeight, 1);
                    const horizontalScaleFactor = Math.min(availableHorizontalSpace / windowWidth, 1);

                    // Calculate the interpolation factor (0-1)
                    const factor = Math.min(Math.max(topPxNum / windowHeight, 0), 1);
                    const combinedFactor = Math.min(factor, verticalScaleFactor, horizontalScaleFactor);
                    const combinedFactor_scaled = 2.25 * combinedFactor;

                    // Get current text and image sizes
                    const baseTextSize = getSizePrecise(CONFIG.RUNTIME_VARS.STYLE.ui_dropZoneTextSize);
                    const baseImageSize = getSizePrecise(CONFIG.RUNTIME_VARS.STYLE.ui_dropZoneImgSize);

                    // Calculate maximum allowed sizes based on available space
                    const maxTextSize = Math.min(
                        baseTextSize * 0.9,
                        baseTextSize * combinedFactor_scaled,
                        availableVerticalSpace * 0.1, // Text shouldn't exceed 10% of available height
                        availableHorizontalSpace * 0.1 // or 10% of available width
                    );

                    const maxImageSize = Math.min(
                        baseImageSize * 0.9,
                        baseImageSize * combinedFactor_scaled,
                        availableVerticalSpace * 0.9, // Image shouldn't exceed 90% of available height
                        availableHorizontalSpace * 0.3 // or 30% of available width
                    );

                    // Apply new styles
                    CONFIG.RUNTIME_VARS.STYLE.ui_dropZoneImgText_scaleFactor = combinedFactor;
                    CONFIG.RUNTIME_VARS.STYLE.ui_dropZoneImgSize_max = `${maxImageSize}px`;
                    CONFIG.RUNTIME_VARS.STYLE.ui_dropZoneTextSize_max = `${maxTextSize}px`;
                    this._setDropzoneStyles();
                } else {
                    // Reset to default values with transition
                    const elements = [CONFIG.DOM_ELEMENT.DROPZONE_TEXT, CONFIG.DOM_ELEMENT.DROPZONE_IMG];

                    elements.forEach((element) => {
                        $(element).css({
                            transition,
                            opacity: 1,
                        });
                    });

                    // Reset to default styles
                    this._resetDropzoneStyles();

                    $(".bookshelf").css({
                        display: "none",
                        top: "",
                    });
                }

                if (element.scrollHeight > element.parentNode.clientHeight) {
                    // console.log("overflown", this.scrollTop, this.scrollHeight - this.offsetHeight);
                    defineScrollBtns();
                } else {
                    // console.log("not overflown");
                    $("#scroll-top-btn").css("visibility", "hidden");
                    $("#scroll-bottom-btn").css("visibility", "hidden");
                }

                // Update filter bar
                this._updateFilterBar();
            });

            $(window).on("resize", () => {
                $(".booklist").trigger("contentchange");
                $(".dot-menu__checkbox").prop("checked", false);
                $(".bookinfo-menu").remove();
            });

            // capable of scrolling booklist within the entire bookshelf
            document.getElementsByClassName("bookshelf")[0].addEventListener(
                "wheel",
                (e) => {
                    // prevent scrolling booklist when mouse is hovering on bookinfo-menu
                    if ($(".bookinfo-menu").length > 0) {
                        if ($(".bookinfo-menu").is(":hover")) {
                            return;
                        }
                    }

                    // scroll booklist accordingly
                    document.getElementsByClassName("booklist")[0].scrollTop += e.deltaY;
                },
                { passive: true }
            );

            // // Set tooltip for Dropzone
            // document.getElementsByClassName("bookshelf")[0].addEventListener("mouseenter", () => {
            //     CONFIG.DOM_ELEMENT.DROPZONE.dataset.title = "";
            // });

            // // Reset tooltip for Dropzone
            // document.getElementsByClassName("bookshelf")[0].addEventListener("mouseleave", () => {
            //     CONFIG.DOM_ELEMENT.DROPZONE.dataset.title = CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_dropZone;
            // });

            // Create worker
            this.worker = createWorker("client/app/modules/database/bookshelf-db-worker.js", import.meta.url);

            cbReg.go("startBookshelfLoop");

            // console.log("Module <Bookshelf> enabled.");
        }
        return this;
    },

    /**
     * Disables the bookshelf module and cleans up resources
     * @returns {Object} The bookshelf instance for chaining
     */
    disable() {
        if (this.enabled) {
            cbReg.rm("fileBefore", this._tokenBeforeFileLoad);
            cbReg.rm("fileAfter", this._tokenAfterBookOpen);
            cbReg.rm("afterDBSave", this._tokenAfterDBSave);

            this.hide(false);
            this.hideTriggerBtn(false);
            this.db = null;
            this.enabled = false;
            console.log("Module <Bookshelf> disabled.");
        }
        return this;
    },

    /**
     * Initializes the bookshelf UI by creating the trigger button
     */
    init() {
        // Initialize the bookshelf trigger button
        const $button = $(
            `<div id="bookshelf-btn" class="btn-icon hasTitle" data-title="${CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_goToBookshelf}">${ICONS.BOOKSHELF}</div>`
        );
        $button.on("click", async () => {
            // setSvgPathLength($button.get(0));
            await resetUI();
        });
        $button.prependTo($("#main-btn-wrapper")).hide();

        // Handle popstate event
        window.addEventListener("popstate", async (e) => {
            const state = e.state;
            if (!state) return;

            this.logger.log("handlePopState", state);

            switch (state.type) {
                case "bookshelf":
                    this.logger.log("handlePopState: bookshelf");
                    await resetUI();
                    await this.show(false);
                    break;

                case "book":
                    if (state.bookName) {
                        this.logger.log("handlePopState: book", state.bookName);
                        await this.openBook(state.bookName, false);
                    }
                    break;
            }
        });

        // Ensure initial popstate
        if (!window.history.state) {
            window.history.replaceState({ type: "bookshelf" }, "");
        }
    },
};

/**
 * Initializes the bookshelf module
 * @public
 */
export async function initBookshelf(displayBooks = true) {
    // Enable bookshelf functionality
    if (CONFIG.RUNTIME_CONFIG.ENABLE_BOOKSHELF) {
        await bookshelf.enable();
        bookshelf.init();

        if (displayBooks) {
            // Now whether or not to show bookshelf depends on whether there is a book in bookshelf
            await bookshelf.refreshBookList(true, true);

            // Open the last read book on startup, after settings are initialized
            if (CONFIG.VARS.SETTINGS_INITIALIZED && CONFIG.CONST_CONFIG.AUTO_OPEN_LAST_BOOK) {
                await bookshelf.reopenBook();
            }

            // Load book covers after all fonts are loaded
            cbReg.go(
                "updateAllBookCoversAfterFontsLoaded"
                //  { message: "initBookshelf" }
            );
        }
    }
}
