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
 * @module modules/ui/bookshelf
 * @requires config/index
 * @requires modules/text/text-processor
 * @requires modules/file/fileload-callback
 * @requires modules/ui/cover-generator
 * @requires utils/base
 * @requires utils/helpers-ui
 * @requires utils/helpers-file
 * @requires utils/helpers-bookshelf
 * @requires utils/helpers-reader
 */

import * as CONFIG from "../../config/index.js";
import { TextProcessor } from "../text/text-processor.js";
import { FileLoadCallback } from "../file/fileload-callback.js";
import { getCoverGenerator } from "./cover-generator.js";
import {
    isVariableDefined,
    getSizePrecise,
    removeFileExtension,
    convertUTCTimestampToLocalString,
    formatBytes,
} from "../../utils/base.js";
import { showLoadingScreen, hideLoadingScreen, resetUI, resetVars } from "../../utils/helpers-ui.js";
import { handleSelectedFile, handleProcessedBook } from "../../utils/helpers-file.js";
import {
    setBookLastReadTimestamp,
    setIsFromLocal,
    getIsFromLocal,
    setIsOnServer,
    getIsOnServer,
} from "../../utils/helpers-bookshelf.js";
import { getProgressText, removeHistory, getIsBookFinished } from "../../utils/helpers-reader.js";

/**
 * @class BookshelfDB
 * @description Handles IndexedDB operations for book storage
 * @private
 */
class BookshelfDB {
    #indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    #db = null;
    #dbVersion = 2;
    #dbName = "SimpleTextReader";
    #objectStores = {
        bookfiles: "bookfiles",
        bookProcessed: "bookProcessed",
    };

    /**
     * Establishes connection to IndexedDB
     * @returns {Promise<IDBDatabase>} Database connection
     * @throws {Error} When connection fails
     */
    #connect() {
        return new Promise((resolve, reject) => {
            const req = this.#indexedDB.open(this.#dbName, this.#dbVersion);
            req.onupgradeneeded = (evt) => {
                const db = evt.target.result;
                console.log(`Upgrading to version ${db.version}`);

                // Create an objectStore for this database
                // This will be used to store book metadata
                if (!db.objectStoreNames.contains(this.#objectStores.bookfiles)) {
                    db.createObjectStore(this.#objectStores.bookfiles, { keyPath: "name" });
                }

                // Create an objectStore for this database
                // This will be used to store processed books
                if (!db.objectStoreNames.contains(this.#objectStores.bookProcessed)) {
                    db.createObjectStore(this.#objectStores.bookProcessed, { keyPath: "name" });
                }
            };
            req.onsuccess = (evt) => {
                resolve(evt.target.result);
            };
            req.onerror = (evt) => {
                console.log("openDB.onError");
                bookshelf.disable();
                reject(evt.target.error);
            };
        });
    }

    /**
     * Gets the database version
     * @returns {Promise<number>} Database version
     * @throws {Error} When database initialization fails
     */
    async #getDBVersion() {
        return new Promise((resolve, reject) => {
            const request = this.#indexedDB.open(this.#dbName);

            request.onsuccess = (event) => {
                const db = event.target.result;
                const version = db.version;
                db.close(); // Always close the database when done
                resolve(version);
            };

            request.onerror = (event) => {
                reject(`Error opening database: ${event.target.error}`);
            };
        });
    }

    /**
     * Gets an object store from the database
     * @param {string|string[]} storeNames - Name(s) of the object store(s)
     * @param {string} [mode="readonly"] - Transaction mode ("readonly" or "readwrite")
     * @returns {IDBObjectStore|Object<string, IDBObjectStore>} The requested object store(s)
     */
    #getObjectStore(storeNames, mode = "readonly") {
        // Ensure storeNames is either a string or an array
        if (typeof storeNames !== "string" && !Array.isArray(storeNames)) {
            throw new Error("storeNames must be a string or an array.");
        }

        // Normalize to array for consistent handling
        const names = Array.isArray(storeNames) ? storeNames : [storeNames];

        const transaction = this.#db.transaction(names, mode);
        transaction.onerror = function (evt) {
            console.error("Transaction error:", evt.target.error);
        };

        // Return a single store or an object containing multiple stores
        if (names.length === 1) {
            return transaction.objectStore(names[0]); // Single store
        }

        // Return an object mapping store names to their respective object stores
        return names.reduce((stores, name) => {
            stores[name] = transaction.objectStore(name);
            return stores;
        }, {});
    }

    /**
     * Executes an IndexedDB request and wraps it in a Promise
     * @param {IDBRequest} request - The request to execute
     * @returns {Promise<any>} Result of the request
     * @throws {Error} When request fails
     */
    #exec(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = (evt) => {
                resolve(evt.target.result);
            };
            request.onerror = (evt) => {
                console.log("exec.onError: ");
                console.log(evt.target);
                reject(evt.target.error);
            };
        });
    }

    /**
     * Initializes the database connection and performs cleanup
     * @async
     * @returns {Promise<boolean>} Success status
     */
    async #init() {
        try {
            if (!this.#db) {
                this.#db = await this.#connect();
                // await this.removeAllBooks();
                await this.removeAllCloudBooks();
            }
            return true;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    /**
     * Stores a book in the database
     * @async
     * @param {string} name - Book filename
     * @param {File} data - Book file data
     * @param {boolean} [isFromLocal=true] - Whether book is from local storage
     * @param {boolean} [isOnServer=false] - Whether book is stored on server
     * @returns {Promise<IDBValidKey>} Key of stored book
     * @throws {Error} When database initialization fails
     */
    async putBook(name, data, isFromLocal = true, isOnServer = false) {
        if (!(await this.#init())) {
            throw new Error("Init local db error!");
        }

        // Get the object stores
        const { bookfiles: tbl, bookProcessed: processedTbl } = this.#getObjectStore(
            [this.#objectStores.bookfiles, this.#objectStores.bookProcessed],
            "readwrite"
        );

        // Save processed book info to bookProcessed
        await this.#exec(
            processedTbl.put({
                name: name,
            })
        );

        // Save book info to bookfiles
        return await this.#exec(
            tbl.put({
                name: name,
                data: data,
                isFromLocal: isFromLocal,
                isOnServer: isOnServer,
                processed: false,
            })
        );
    }

    /**
     * Updates a processed book in the database
     * @async
     * @param {string} name - Book filename
     * @param {Object} processedData - Processed book data
     * @returns {Promise<IDBValidKey>} Key of updated book
     * @throws {Error} When database initialization fails
     */
    async updateProcessedBook(name, processedData) {
        // console.log("updateProcessedBook: ", name, processedData);

        if (!(await this.#init())) {
            throw new Error("Init local db error!");
        }

        // Get the object stores
        const { bookfiles: tbl, bookProcessed: processedTbl } = this.#getObjectStore(
            [this.#objectStores.bookfiles, this.#objectStores.bookProcessed],
            "readwrite"
        );

        const existingBook = await this.#exec(tbl.get(name));
        if (!existingBook) {
            throw new Error(`Book with name "${name}" not found in the database.`);
        }

        // Update the book metadata
        await this.#exec(
            tbl.put({
                ...existingBook, // Keep all existing data
                processed: true, // Set the processed flag to true
            })
        );

        const existingProcessedBook = await this.#exec(processedTbl.get(name));
        if (!existingProcessedBook) {
            throw new Error(`Processed book with name "${name}" not found in the database.`);
        }
        // Update the book data with processed information
        const updatedBook = {
            ...existingProcessedBook, // Keep all existing data
            ...processedData, // Add or overwrite with processed data
        };
        // console.log("updatedBook: ", updatedBook);

        // Save the updated book back to the database
        return await this.#exec(processedTbl.put(updatedBook));
    }

    /**
     * Retrieves a book from the database
     * @async
     * @param {string} name - Book filename
     * @returns {Promise<Object>} Book data
     * @throws {Error} When database initialization fails
     */
    async getBook(name) {
        if (!(await this.#init())) {
            throw new Error("Init local db error!");
        }

        // Get the object stores
        const { bookfiles: tbl, bookProcessed: processedTbl } = this.#getObjectStore([
            this.#objectStores.bookfiles,
            this.#objectStores.bookProcessed,
        ]);

        const result = await this.#exec(tbl.get(name));
        const processedResult = await this.#exec(processedTbl.get(name));
        return (
            {
                ...result,
                ...processedResult,
            } ?? null
        );
    }

    /**
     * Retrieves all books from the database
     * @async
     * @returns {Promise<Array>} Array of all books
     * @throws {Error} When database initialization fails
     */
    async getAllBooks() {
        if (!(await this.#init())) {
            throw new Error("Init local db error!");
        }

        const tbl = this.#getObjectStore(this.#objectStores.bookfiles);
        const result = await this.#exec(tbl.getAll());
        return result;
    }

    /**
     * Retrieves all cloud-stored books from the database
     * @async
     * @returns {Promise<Array>} Array of cloud-stored books
     * @throws {Error} When database initialization fails
     */
    async getAllCloudBooks() {
        if (!(await this.#init())) {
            throw new Error("Init local db error!");
        }

        const tbl = this.#getObjectStore(this.#objectStores.bookfiles);
        const result = await this.#exec(tbl.getAll());
        return result.filter((book) => book.isOnServer);
    }

    /**
     * Checks if a book exists in the database
     * @async
     * @param {string} name - Book filename
     * @returns {Promise<boolean>} Whether book exists
     * @throws {Error} When database initialization fails
     */
    async isBookExist(name) {
        if (!(await this.#init())) {
            throw new Error("Init local db error!");
        }

        const tbl = this.#getObjectStore(this.#objectStores.bookfiles);
        const result = await this.#exec(tbl.getKey(name));
        return !!result;
    }

    /**
     * Removes a book from the database
     * @async
     * @param {string} name - Book filename
     * @throws {Error} When database initialization fails
     */
    async removeBook(name) {
        if (!(await this.#init())) {
            throw new Error("Init local db error!");
        }

        // Get the object stores
        const { bookfiles: tbl, bookProcessed: processedTbl } = this.#getObjectStore(
            [this.#objectStores.bookfiles, this.#objectStores.bookProcessed],
            "readwrite"
        );

        await this.#exec(tbl.delete(name));
        await this.#exec(processedTbl.delete(name));
    }

    /**
     * Removes all books from the database
     * @async
     * @throws {Error} When database initialization fails
     */
    async removeAllBooks() {
        if (!(await this.#init())) {
            throw new Error("Init local db error!");
        }

        // Get the object stores
        const { bookfiles: tbl, bookProcessed: processedTbl } = this.#getObjectStore(
            [this.#objectStores.bookfiles, this.#objectStores.bookProcessed],
            "readwrite"
        );

        await this.#exec(tbl.clear());
        await this.#exec(processedTbl.clear());
    }

    /**
     * Removes all cloud-stored books that aren't local
     * @async
     * @throws {Error} When database initialization fails
     */
    async removeAllCloudBooks() {
        if (!(await this.#init())) {
            throw new Error("Init local db error!");
        }

        // Get the object stores
        const { bookfiles: tbl, bookProcessed: processedTbl } = this.#getObjectStore(
            [this.#objectStores.bookfiles, this.#objectStores.bookProcessed],
            "readwrite"
        );

        const books = await this.#exec(tbl.getAll());
        // books = books.filter(book => book.isOnServer);
        await Promise.all(
            books.map(async (book) => {
                if (book.isOnServer && !book.isFromLocal) {
                    // console.log(book);
                    await this.#exec(tbl.delete(book.name));
                    await this.#exec(processedTbl.delete(book.name));
                }
            })
        );
    }

    /**
     * Upgrades the database schema
     * @async
     * @throws {Error} When database initialization fails
     */
    async upgradeDB() {
        const currentDBVersion = await this.#getDBVersion();
        // console.log("currentDBVersion: ", currentDBVersion);

        if (currentDBVersion > this.#dbVersion) {
            throw new Error(`Database version mismatch! Current: ${currentDBVersion}, Expected: ${this.#dbVersion}`);
        } else if (currentDBVersion === this.#dbVersion) {
            return;
        }

        // Initialize the database
        if (!(await this.#init())) {
            throw new Error("Init local db error!");
        }

        // Define required fields for bookfiles and bookProcessed
        const bookfilesFields = ["name", "data", "isFromLocal", "isOnServer", "processed"];
        const bookProcessedFields = [
            "name",
            "bookAndAuthor",
            "title_page_line_number_offset",
            "seal_rotate_en",
            "seal_left",
            "file_content_chunks",
            "all_titles",
            "all_titles_ind",
            "footnotes",
            "footnote_processed_counter",
            "page_breaks",
            "total_pages",
            "is_eastern_lan",
        ];

        // Get the object stores
        const { bookfiles: tbl, bookProcessed: processedTbl } = this.#getObjectStore(
            [this.#objectStores.bookfiles, this.#objectStores.bookProcessed],
            "readwrite"
        );

        // Fetch all books in one go
        const allBooks = await this.#exec(tbl.getAll());
        const processedBooksMap = new Map((await this.#exec(processedTbl.getAll())).map((book) => [book.name, book]));

        // Track if any changes are made
        let dbUpdated = false;

        for (const book of allBooks) {
            const { name, ...rest } = book;

            // Separate fields for bookProcessed
            const processedData = {};
            bookProcessedFields.forEach((field) => {
                if (rest[field] !== undefined) {
                    processedData[field] = rest[field];
                    delete rest[field]; // Remove from bookfiles
                }
            });

            // Ensure bookfiles only contains required fields
            const bookfilesData = {};
            bookfilesFields.forEach((field) => {
                if (book[field] !== undefined) {
                    bookfilesData[field] = book[field];
                }
            });

            // Apply default values for bookfiles
            bookfilesFields.forEach((field) => {
                if (bookfilesData[field] === undefined) {
                    bookfilesData[field] = this.#getDefaultValueForField(field);
                }
            });

            // Get the existing processed book if it exists
            const existingProcessedBook = processedBooksMap.get(name);

            // Create or update entry in bookProcessed
            const updatedProcessedBook = {
                name: name,
                ...existingProcessedBook, // Keep all existing data
                ...processedData, // Overwrite or add any missing fields
            };

            // Ensure all required fields in bookProcessed have default values if missing
            bookProcessedFields.forEach((field) => {
                if (updatedProcessedBook[field] === undefined) {
                    updatedProcessedBook[field] = this.#getDefaultValueForField(field);
                }
            });

            // If the book does not exist in bookProcessed, create it
            if (!existingProcessedBook) {
                console.log(`Creating new entry in bookProcessed for book: ${name}`);
                dbUpdated = true;
                await this.#exec(processedTbl.put(updatedProcessedBook));
            } else {
                // If the updated entry differs from the existing one, update it
                if (JSON.stringify(existingProcessedBook) !== JSON.stringify(updatedProcessedBook)) {
                    console.log(`Updating entry in bookProcessed for book: ${name}`);
                    dbUpdated = true;
                    await this.#exec(processedTbl.put(updatedProcessedBook));
                }
            }

            // Clean up excessive fields in bookfiles
            if (JSON.stringify(await this.#exec(tbl.get(name))) !== JSON.stringify(bookfilesData)) {
                dbUpdated = true;
                await this.#exec(tbl.put(bookfilesData));
            }
        }

        // Print database records only if changes were made
        if (dbUpdated) {
            await this.printAllDatabases();
            console.log("Database upgrade completed.");
        }
    }

    /**
     * Gets the default value for a field
     * @param {string} field - Field name
     * @returns {any} Default value for the field
     */
    #getDefaultValueForField(field) {
        const defaults = {
            // bookfiles fields
            name: "",
            data: new File([], ""), // Empty File object
            isFromLocal: true,
            isOnServer: false,
            processed: false,

            // bookProcessed fields
            bookAndAuthor: {},
            title_page_line_number_offset: 0,
            seal_rotate_en: "0deg",
            seal_left: "0",
            file_content_chunks: [],
            all_titles: [],
            all_titles_ind: {},
            footnotes: [],
            footnote_processed_counter: 0,
            page_breaks: [],
            total_pages: 0,
            is_eastern_lan: true,
        };
        return defaults[field];
    }

    /**
     * Prints all records in the "bookfiles" object store
     * @async
     * @throws {Error} When database initialization fails
     */
    async #printBookfiles() {
        if (!(await this.#init())) {
            throw new Error("Init local db error!");
        }

        const tbl = this.#getObjectStore(this.#objectStores.bookfiles);
        const records = await this.#exec(tbl.getAll());
        console.log("All records in bookfiles:");
        console.table(records);
    }

    /**
     * Prints all records in the "bookProcessed" object store
     * @async
     * @throws {Error} When database initialization fails
     */
    async #printBookProcessed() {
        if (!(await this.#init())) {
            throw new Error("Init local db error!");
        }

        const processedTbl = this.#getObjectStore(this.#objectStores.bookProcessed);
        const records = await this.#exec(processedTbl.getAll());
        console.log("All records in bookProcessed:");
        console.table(records);
    }

    /**
     * Prints all records in both "bookfiles" and "bookProcessed" object stores
     * @async
     * @throws {Error} When database initialization fails
     */
    async printAllDatabases() {
        if (!(await this.#init())) {
            throw new Error("Init local db error!");
        }

        console.log("Printing all database records...");
        await this.#printBookfiles();
        await this.#printBookProcessed();
        console.log("Finished printing all database records.");
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

    _coverGenerator: null,
    _FILENAME_: "STR-Filename",
    _CACHE_FLAG_: "STR-Cache-File",

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
                if (await bookshelf.isBookExist(fname)) {
                    console.log("Reopen book on start: " + fname);
                    await bookshelf.openBook(fname);
                }
            }
        }
    },

    /**
     * Opens a book from the bookshelf
     * @async
     * @param {string} fname - Filename of the book to open
     * @returns {Promise<boolean>} Success status of opening the book
     * @throws {Error} When book cannot be opened or found
     */
    async openBook(fname) {
        if (this.enabled) {
            // console.log("Open book from cache: " + fname);
            // showLoadingScreen();
            try {
                // check if the book exists in db
                if (!(await this.isBookExist(fname))) {
                    // search book in allBooksInfo
                    // const toProcessBookInfo = CONFIG.VARS.ALL_BOOKS_INFO.find(x => x.name === fname);
                    const toProcessBookInfo = CONFIG.VARS.ALL_BOOKS_INFO[fname];
                    // console.log("toProcessBookInfo: ", toProcessBookInfo);

                    if (toProcessBookInfo) {
                        try {
                            const toProcessBookFileObj = await URLToFileObject(
                                toProcessBookInfo.path,
                                toProcessBookInfo.name
                            );
                            await this.saveBook(
                                toProcessBookFileObj,
                                toProcessBookInfo.isFromLocal,
                                toProcessBookInfo.isOnServer,
                                false,
                                false,
                                false
                            );
                        } catch (e) {
                            // alert("An error occurred!");
                            throw new Error(`openBook error: "${fname}"`);
                        }
                    } else {
                        // alert("An error occurred!");
                        throw new Error(`openBook error: "${fname}"`);
                    }
                }
                const fetchedBook = await this.db.getBook(fname);
                // console.log("fetchedBook: ", fetchedBook);
                const book = fetchedBook?.data;
                const book_isOnServer = fetchedBook?.isOnServer ?? false;
                const book_isFromLocal = fetchedBook?.isFromLocal ?? true;
                const book_processed = fetchedBook?.processed ?? false;
                if (book) {
                    book[this._CACHE_FLAG_] = true;
                    resetVars();
                    if (!book_processed) {
                        await handleSelectedFile([book]);
                    } else {
                        await handleProcessedBook(fetchedBook);
                    }
                    this.hide(true);
                    setBookLastReadTimestamp(fname);
                    return true;
                } else {
                    // alert("An error occurred!");
                    throw new Error(`openBook error: "${fname}"`);
                }
            } catch (e) {
                console.log(e);
                return false;
            }
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
     * @returns {Promise<File>} The saved file
     */
    async saveBook(
        file,
        isFromLocal = true,
        isOnServer = false,
        refreshBookshelf = true,
        hardRefresh = true,
        sortBookshelf = true
    ) {
        if (bookshelf.enabled) {
            if (file.type === "text/plain") {
                if (file[bookshelf._CACHE_FLAG_]) {
                    // console.log("Openning cache-book, so not save.");
                } else {
                    // console.log("saveBook: ", file.name);
                    // Save file to cache db first
                    try {
                        // if (await bookshelf.db.isBookExist(file.name)) {
                        //     console.log("Book already exists in cache: " + file.name);
                        //     return file;
                        // }

                        await bookshelf.db.putBook(file.name, file, isFromLocal, isOnServer);
                        if (!(await bookshelf.db.isBookExist(file.name))) {
                            // alert("Failed to save to local bookshelf (storage may be full)");
                            throw new Error(`saveBook error (localStorage full): "${file.name}"`);
                        }

                        // Refresh Bookshelf in DropZone
                        // await bookshelf.refreshBookList();
                        // console.log(`refreshBookshelf: ${refreshBookshelf}, HardRefresh: ${hardRefresh}`);
                        if (refreshBookshelf) await resetUI(refreshBookshelf, hardRefresh, sortBookshelf);
                    } catch (e) {
                        console.log(e);
                    }
                }
            }
        }
        return file;
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
            if (progress === "100%" && getIsBookFinished(fname)) {
                // bookElm.find(".progress").html(CONFIG.RUNTIME_VARS.STYLE.ui_bookFinished).attr("title", progress);
                // add styling to the text of read
                const read_text = `<span class="read_text">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40">
                    <path d="M27.361,8.986a5.212,5.212,0,0,0-4.347-4.347,72.73,72.73,0,0,0-14.028,0A5.212,5.212,0,0,0,4.639,8.986a72.72,72.72,0,0,0,0,14.027,5.212,5.212,0,0,0,4.347,4.348,72.73,72.73,0,0,0,14.028,0,5.212,5.212,0,0,0,4.347-4.348A72.72,72.72,0,0,0,27.361,8.986Zm-4.194,4.083L16.2,20.922a1.5,1.5,0,0,1-1.114.5h-.008a1.5,1.5,0,0,1-1.111-.492L9.36,15.86a1.5,1.5,0,1,1,2.221-2.015l3.482,3.836,5.861-6.6a1.5,1.5,0,1,1,2.243,1.992Z"/>
                </svg>${CONFIG.RUNTIME_VARS.STYLE.ui_bookFinished}</span>`;
                bookElm.find(".progress").html(read_text);

                // add a badge to the book cover
                // const badge = `<div class="bookFinished_badge">
                //     <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 800 800" style="enable-background:new 0 0 800 800;">
                //         <style type="text/css">
                //             .svg-st0{fill:#FFC54D;}
                //             .svg-st1{fill:#EDB24A;}
                //             .svg-st2{fill:#EF4D4D;}
                //             .svg-st3{fill:#EF4D4D;}
                //             .svg-st4{fill:#FFF0BA;}
                //         </style>
                //         <circle class="svg-st0" cx="400" cy="558" r="155.3"/>
                //         <circle class="svg-st1" cx="400" cy="558" r="124.7"/>
                //         <path class="svg-st0" d="M400,362.7c-14.7,0-26.7,12-26.7,26.7c0,14.7,12,26.7,26.7,26.7c14.7,0,26.7-12,26.7-26.7 C426.7,374.7,414.7,362.7,400,362.7z M400,407.3c-10,0-17.3-8-17.3-17.3s8-17.3,17.3-17.3s17.3,8,17.3,17.3S410,407.3,400,407.3z"/>
                //         <path class="svg-st2" d="M548,104.7v208c0,6-4,12-10.7,15.3L458,365.3l-46.7,21.3c-6.7,3.3-15.3,3.3-22,0l-46-22L264,327.3 c-6.7-3.3-10.7-9.3-10.7-15.3V104.7c0-10,10-18,22-18h251.3C538,86.7,548,94.7,548,104.7z"/>
                //         <path class="svg-st3" d="M457.3,86.7v278.7l-46,21.3c-6.7,3.3-15.3,3.3-22,0l-46-22v-278H457.3z"/>
                //         <path class="svg-st4" d="M406.9,467.7l22.7,45.3c1.3,2,3.3,4,5.3,4l50,7.3c6,1.3,8.7,8,4,12.7l-36,36c-1.3,1.3-2.7,4-2,6.7l8.7,50 c1.3,6-5.3,10.7-10.7,7.3l-44.7-23.3c-2-1.3-4.7-1.3-6.7,0L352.2,637c-5.3,2.7-12-1.3-10.7-7.3l8.7-50c0.7-2-0.7-4.7-2-6.7l-36-35.3 c-4-4-2-12,4-12.7l50-7.3c2-0.7,4-1.3,5.3-4l22.7-45.3C396.2,462.3,404.2,462.3,406.9,467.7z"/>
                //         </svg>
                // </div>`;
                const badge = `<div class="bookFinished_badge">
                    <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
                    viewBox="0 0 800 800" style="enable-background:new 0 0 800 800;" xml:space="preserve">
                    <style type="text/css">
                    .svg-st0{fill:#FFC54D;}
                    .svg-st1{fill:#EF4D4D;}
                    .svg-st2{fill:#EF4D4D;}
                    </style>
                    <path class="svg-st0" d="M574.7,568.7l-37.3-37.3c-3.3-3.3-5.4-12.7-5.4-12.7V466c0,0-7.9-17.3-17.2-18H462c-4.7,0.7-9.3-1.3-12.7-4.6 L418,412c12.7-6.7,21.3-20,21.3-35.3c0-22-18-39.3-39.3-39.3s-39.3,18-39.3,39.3c0,15.3,8.7,28.7,21.3,35.3l-31.3,31.3 c-3.3,3.3-12.7,5.7-12.7,5.7h-52.7c-9.5,0-17.3,7.8-17.3,17.3v52.5c0,4.7-2,9.3-5.3,12.7l-37.2,37.2c-6.8,6.8-6.8,17.9,0,24.7 l37.2,37.2c3.3,3.3,5.3,8,5.3,12.7v52.5c0,9.5,7.8,17.3,17.3,17.3H338c0,0,9.3,2.3,12.7,5.6L388,756c6.7,6.7,18,6.7,24.7,0 l37.3-37.3c3.3-3.3,8-5.3,12.7-4.7h52.7c9.3-0.6,17.3-8.6,17.6-17.9v-52.7c-0.3-4.7,1.7-9.3,5-12.7l37.3-37.3 C581.3,586.7,581.3,576,574.7,568.7z M400,354c13.3,0,23.3,10.7,23.3,23.3c0,13.3-10.7,23.3-23.3,23.3c-12.7,0-23.3-10.7-23.3-23.3 S386.7,354,400,354z"/>
                    <path class="svg-st1" d="M547,98v208c0,6-4,12-10.7,15.3l-79.4,37.3l-46.7,21.3c-6.7,3.3-15.3,3.3-22,0l-46-22l-79.4-37.3 c-6.7-3.3-10.7-9.3-10.7-15.3V98c0-10,10-18,22-18h251.7C537,80,547,88,547,98z"/>
                    <path class="svg-st2" d="M457,80v278.7L411,380c-6.7,3.3-15.3,3.3-22,0l-46-22V80L457,80L457,80z"/>
                    </svg>
                </div>`;
                bookElm.find(".coverContainer").append(badge);
            } else {
                if (parseInt(progress) >= 99) {
                    const almostDone_text = `<span class="almostDone_text">${CONFIG.RUNTIME_VARS.STYLE.ui_bookAlmostDone}</span>`;
                    bookElm
                        .find(".progress")
                        .html(progress + almostDone_text)
                        .attr("title", progress);
                } else {
                    bookElm.find(".progress").html(progress).attr("title", progress);
                }
            }
        } else {
            bookElm.removeClass("read").css("--read-progress", "");
            // bookElm.find(".progress").html(CONFIG.RUNTIME_VARS.STYLE.ui_bookNotRead);

            // add styling to the text of not read
            const notRead_text = `<span class="notRead_text">${CONFIG.RUNTIME_VARS.STYLE.ui_bookNotRead}</span>`;
            bookElm.find(".progress").html(notRead_text);

            // add a badge to the book cover
            const badge = `<div class="bookNotRead_badge">
                <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 200 200" style="enable-background:new 0 0 200 200;">
                <style type="text/css">.svg-shadow{fill:#CC3432;}.svg-ribbon{fill:#EF4D4D;}</style>
                <g id="SVGRepo_bgCarrier"></g>
                <g id="SVGRepo_tracerCarrier"></g>
                <path class="svg-shadow" d="M199.3,90.5L109.8,0.8c-0.1,0-7.5,4.1-7.6,4.2h8.8l84,84.2V98L199.3,90.5z"/>
                <polygon class="svg-ribbon" points="156,1 109.4,1 199,90.7 199,44.1 "/>
                </svg>
            </div>`;
            bookElm.find(".coverContainer").append(badge);
        }
    },

    /**
     * Generates a book item DOM element with cover and interactions
     * @param {Object} bookInfo - Book information object
     * @param {number} idx - Book index
     * @returns {jQuery} Generated book element
     */
    genBookItem(bookInfo, idx) {
        // generate book cover art
        const canvasWidth = getSizePrecise(CONFIG.RUNTIME_VARS.STYLE.ui_bookCoverWidth);
        const canvasHeight = getSizePrecise(CONFIG.RUNTIME_VARS.STYLE.ui_bookCoverHeight);
        const currentBookNameAndAuthor = TextProcessor.getBookNameAndAuthor(removeFileExtension(bookInfo.name));
        const book = $(`<div class="book" data-filename="${bookInfo.name}">
            <div class="coverContainer">
                <span class="coverText">${bookInfo.name}</span>
                <canvas class="coverCanvas" width="${canvasWidth}" height="${canvasHeight}"></canvas>
            </div>
            <div class="infoContainer">
                <div class="progress"></div>
                <div class="isOnServer">
                    ${
                        bookInfo.isOnServer && !bookInfo.isFromLocal
                            ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40">
                    <path d="M24.7793,25.30225H7.2207A6.02924,6.02924,0,0,1,1.84375,22.0708c-1.99856-3.83755.74946-8.94738,5.2832-8.8418a9.30623,9.30623,0,0,1,17.74121-.0249A6.04953,6.04953,0,0,1,24.7793,25.30225ZM7.25781,15.22754c-3.1607-.153-4.95556,3.33035-3.62493,5.94832a4.01435,4.01435,0,0,0,3.63079,2.12736l17.5166-.001A4.05253,4.05253,0,1,0,22.11722,16.202a1.00012,1.00012,0,0,1-1.41312-.05653c-1.00583-1.32476,1.17841-2.28273,2.15235-2.65332A7.30425,7.30425,0,0,0,8.8623,14.4779C8.70326,15.24838,7.89656,15.30989,7.25781,15.22754Z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>`
                            : ""
                    }
                </div>
                <div class="delete-btn-wrapper">
                    <span class="delete-btn hasTitle" title="${CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_removeBook}">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 7V18C6 19.1046 6.89543 20 8 20H16C17.1046 20 18 19.1046 18 18V7M6 7H5M6 7H8M18 7H19M18 7H16M10 11V16M14 11V16M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7M8 7H16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    </span>
                </div>
                <div id="bookInfoMenuBtn-${idx}" class="bookInfoMenuBtn hasTitle" title="${
            CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_bookInfo
        }">
                    <input id="dot-menu-${idx}" type="checkbox" class="dot-menu__checkbox">
                    <label for="dot-menu-${idx}" class="dot-menu__label"><span></span></label>
                </div>
            </div>
            </div>`);
        const canvas = book.find(".coverCanvas");
        const ctx = canvas[0].getContext("2d");
        const coverSettings = this._getCoverSettings({
            width: canvasWidth,
            height: canvasHeight,
            bookNameAndAuthor: currentBookNameAndAuthor,
        });
        this._getCoverGenerator().generate(coverSettings, ctx);
        if (currentBookNameAndAuthor.author === "") {
            book.find(".coverContainer").css("box-shadow", "var(--ui_bookshadow_noAuthor)");
        } else {
            book.find(".coverContainer").css("box-shadow", "var(--ui_bookshadow)");
        }

        // add mouseover effect
        book.find(".coverContainer")
            .on("mouseenter", function () {
                book.find(".delete-btn-wrapper").css("opacity", "1");
                $(this).css("box-shadow", "var(--ui_bookshadow_hover)");
            })
            .on("mouseleave", function (e) {
                if (
                    e.offsetX <= 0 ||
                    e.offsetX >= $(this).width() ||
                    e.offsetY <= $(this)[0].offsetTop ||
                    e.offsetY >= $(this).height()
                ) {
                    book.find(".delete-btn-wrapper").css("opacity", "0");
                    const tempBookAuthor = TextProcessor.getBookNameAndAuthor(removeFileExtension(bookInfo.name));
                    if (tempBookAuthor.author === "") {
                        $(this).css("box-shadow", "var(--ui_bookshadow_noAuthor)");
                    } else {
                        $(this).css("box-shadow", "var(--ui_bookshadow)");
                    }
                }
            });
        book.find(".infoContainer")
            .on("mouseenter", function () {
                book.find(".delete-btn-wrapper").css("opacity", "1");
            })
            .on("mouseleave", function () {
                book.find(".delete-btn-wrapper").css("opacity", "0");
            });
        // book.find(".delete-btn-wrapper").on("mouseenter", function() {
        //     book.find(".coverContainer").css('box-shadow', 'var(--ui_bookshadow_hover)');
        // }).on("mouseleave", function() {
        //     const tempBookAuthor = TextProcessor.getBookNameAndAuthor(bookInfo.name.replace(/(.txt)$/i, ''));
        //     if (tempBookAuthor.author === "") {
        //         book.find(".coverContainer").css('box-shadow', 'var(--ui_bookshadow_noAuthor)');
        //     } else {
        //         book.find(".coverContainer").css('box-shadow', 'var(--ui_bookshadow)');
        //     }
        // });

        // add click event
        book.find(".coverContainer").on("click", (evt) => {
            evt.originalEvent.stopPropagation();
            this.openBook(bookInfo.name);
        });

        // add delete event
        book.find(".delete-btn").on("click", (evt) => {
            evt.originalEvent.stopPropagation();
            this.removeBook(bookInfo.name, () => {
                let b = $(evt.currentTarget).parents(".book");
                b.fadeOut(300, () => {
                    b.remove();
                    // console.log(CONFIG.VARS.ALL_BOOKS_INFO);
                    delete CONFIG.VARS.ALL_BOOKS_INFO[bookInfo.name];
                    // console.log(CONFIG.VARS.ALL_BOOKS_INFO);
                    // this.refreshBookList();     // does't need to refresh booklist every time after delete

                    $(".booklist").trigger("contentchange"); // recalculate booklist height

                    // change isFromLocal to false
                    setIsFromLocal(bookInfo.name, false);
                    bookInfo.isFromLocal = false;

                    // if the book is neither from local nor on server, remove it from history
                    if (!bookInfo.isFromLocal && !bookInfo.isOnServer) {
                        removeHistory(bookInfo.name);
                    }
                });
                // b.animate({width: 0, opacity: 0}, 500, () => b.remove());
            });
        });

        // update book progress info
        this.updateBookProgressInfo(bookInfo.name, book);

        // add a bookInfoMenuBtn
        book.find(`#bookInfoMenuBtn-${idx}`).on("click", (evt) => {
            evt.originalEvent.stopPropagation();

            // remove all bookInfoMenu
            $(".bookInfoMenu").remove();

            // add bookInfoMenu
            if (book.find(".dot-menu__checkbox").is(":checked")) {
                const tempBookAuthor = TextProcessor.getBookNameAndAuthor(removeFileExtension(bookInfo.name));
                const tempBookTitle = tempBookAuthor.bookName;
                const tempBookAuthorName =
                    tempBookAuthor.author === ""
                        ? `<span class="bookInfoMenu_item_text">${CONFIG.RUNTIME_VARS.STYLE.ui_bookInfo_Unknown}<span>`
                        : `<span class="bookInfoMenu_item_info">${tempBookAuthor.author}<span>`;
                const tempBookLastOpenedTimestamp =
                    isVariableDefined(bookInfo.lastOpenedTimestamp) && bookInfo.lastOpenedTimestamp !== ""
                        ? `<span class="bookInfoMenu_item_info">${convertUTCTimestampToLocalString(
                              bookInfo.lastOpenedTimestamp
                          )}<span>`
                        : `<span class="bookInfoMenu_item_text">${CONFIG.RUNTIME_VARS.STYLE.ui_bookInfo_Unknown}<span>`;

                // show popup menu
                const bookInfoMenu = `
                <div class="bookInfoMenu" id="bookInfoMenu-${idx}">
                    <div class="bookInfoMenu-clip"></div>
                    <div class="bookInfoMenu_item">
                        <span class="bookInfoMenu_item_text">${CONFIG.RUNTIME_VARS.STYLE.ui_bookInfo_bookname}</span>
                        <span class="bookInfoMenu_item_info bookInfoMenu_item_info_title">${tempBookTitle}</span>
                    </div>
                    <div class="bookInfoMenu_item">
                        <span class="bookInfoMenu_item_text">${CONFIG.RUNTIME_VARS.STYLE.ui_bookInfo_author}</span>
                        <span class="bookInfoMenu_item_info bookInfoMenu_item_info_author">${tempBookAuthorName}</span>
                    </div>
                    <div class="bookInfoMenu_item">
                        <span class="bookInfoMenu_item_text">${CONFIG.RUNTIME_VARS.STYLE.ui_bookInfo_filename}</span>
                        <span class="bookInfoMenu_item_info bookInfoMenu_item_info_filename">${bookInfo.name}</span>
                    </div>
                    <div class="bookInfoMenu_item">
                        <span class="bookInfoMenu_item_text">${CONFIG.RUNTIME_VARS.STYLE.ui_bookInfo_filesize}</span>
                        <span class="bookInfoMenu_item_info bookInfoMenu_item_info_filesize">${formatBytes(
                            bookInfo.size
                        )}</span>
                    </div>
                    <div class="bookInfoMenu_item">
                        <span class="bookInfoMenu_item_text bookInfoMenu_item_info_timestamp">${
                            CONFIG.RUNTIME_VARS.STYLE.ui_bookInfo_lastopened
                        }</span>
                        ${tempBookLastOpenedTimestamp}
                    </div>
                </div>`;

                book.find(".infoContainer").append(bookInfoMenu);

                // set bookInfoMenu's position to be right above current element
                const bookInfoMenuWidth = book.find(`#bookInfoMenu-${idx}`).outerWidth();
                const bookInfoMenuHeight = book.find(`#bookInfoMenu-${idx}`).outerHeight();
                book.find(`#bookInfoMenu-${idx}`).css(
                    "top",
                    `${
                        evt.currentTarget.getBoundingClientRect().bottom -
                        evt.currentTarget.getBoundingClientRect().height -
                        bookInfoMenuHeight -
                        15
                    }px`
                );
                book.find(`#bookInfoMenu-${idx}`).css(
                    "left",
                    `${
                        evt.currentTarget.getBoundingClientRect().left +
                        evt.currentTarget.getBoundingClientRect().width / 2 -
                        bookInfoMenuWidth / 2 +
                        3
                    }px`
                );
            } else {
                // hide popup menu
                book.find(".bookInfoMenu").remove();
            }

            // hide popup menu when clicked outside
            document.addEventListener("click", function (event) {
                const settingsMenu = book.find(`#bookInfoMenu-${idx}`);
                // if (!settingsMenu) return;
                if ($(event.target).closest(settingsMenu).length) {
                    // clicked inside menu
                } else {
                    book.find(".dot-menu__checkbox").prop("checked", false);
                    book.find(".bookInfoMenu").remove();
                }
            });

            // reset all book cover art when mouseover the bookInfoMenu
            book.find(".bookInfoMenu").on("mouseenter", function () {
                // $(".delete-btn-wrapper").css("visibility", "hidden");
                $(".coverContainer").css("box-shadow", "var(--ui_bookshadow)");
            });
        });

        return book;
    },

    /**
     * Updates all book covers with current theme colors and fonts
     * @async
     */
    async updateAllBookCovers() {
        const generator = this._getCoverGenerator();

        Array.prototype.slice.call(document.getElementsByClassName("book")).forEach((book) => {
            const book_filename = book.getAttribute("data-filename");
            const book_cover = book.getElementsByTagName("canvas")[0];
            const ctx = book_cover.getContext("2d");
            const bookNameAndAuthor = TextProcessor.getBookNameAndAuthor(removeFileExtension(book_filename));
            const coverSettings = this._getCoverSettings({
                width: book_cover.width,
                height: book_cover.height,
                bookNameAndAuthor: bookNameAndAuthor,
            });
            generator.generate(coverSettings, ctx);
        });
    },

    /**
     * Refreshes the bookshelf display and book list
     * @async
     * @param {boolean} [hardRefresh=false] - Whether to completely rebuild the book list
     * @param {boolean} [sortBookshelf=true] - Whether to sort the books
     */
    async refreshBookList(hardRefresh = false, sortBookshelf = true) {
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
                for (const book of await this.db.getAllBooks()) {
                    const final_isFromLocal = book.isFromLocal ?? false;
                    const final_isOnServer = book.isOnServer ?? false;
                    const new_book = {
                        name: book.name,
                        size: book.data.size,
                        isFromLocal: final_isFromLocal,
                        isOnServer: final_isOnServer,
                    };

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
                container.trigger("contentchange");
            } catch (e) {
                console.log(e);
            }

            // If there is no book in bookshelf, hide the bookshelf
            // Otherwise, show the bookshelf, but not the bookshelf trigger button
            // Only show the bookshelf trigger button when a book is opened
            if (Object.keys(CONFIG.VARS.ALL_BOOKS_INFO).length <= 0) {
                this.hide();
                this.hideTriggerBtn();
            } else {
                this.show();
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
     * @returns {CoverGenerator} The cover generator instance
     */
    _getCoverGenerator() {
        if (!this._coverGenerator) {
            this._coverGenerator = getCoverGenerator();
        }
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
     * Shows the bookshelf UI if enabled and contains books
     * @async
     * @returns {Object} The bookshelf instance for chaining
     */
    async show() {
        if (this.enabled) {
            if (isVariableDefined($(".bookshelf")) && $(".bookshelf .booklist").children().length > 0) {
                $(".bookshelf").show();
                $(".booklist").trigger("contentchange");
                return;
            }
        }
        return this;
    },

    /**
     * Hides the bookshelf UI and resets dropzone elements
     * @param {boolean} [doNotRemove=true] - If false, removes the bookshelf element instead of hiding
     * @returns {Object} The bookshelf instance for chaining
     */
    async hide(doNotRemove = true) {
        if (this.enabled) {
            if (isVariableDefined(CONFIG.DOM_ELEMENT.DROPZONE_TEXT)) {
                CONFIG.DOM_ELEMENT.DROPZONE_TEXT.setAttribute(
                    "style",
                    `top: ${CONFIG.RUNTIME_VARS.STYLE.ui_dropZoneTextTop}; left: ${CONFIG.RUNTIME_VARS.STYLE.ui_dropZoneTextLeft}; font-size: ${CONFIG.RUNTIME_VARS.STYLE.ui_dropZoneTextSize}`
                );
            }
            if (isVariableDefined(CONFIG.DOM_ELEMENT.DROPZONE_IMG)) {
                CONFIG.DOM_ELEMENT.DROPZONE_IMG.setAttribute(
                    "style",
                    `top: ${CONFIG.RUNTIME_VARS.STYLE.ui_dropZoneImgTop}; left: ${CONFIG.RUNTIME_VARS.STYLE.ui_dropZoneImgLeft}; width: ${CONFIG.RUNTIME_VARS.STYLE.ui_dropZoneImgSize}; height: ${CONFIG.RUNTIME_VARS.STYLE.ui_dropZoneImgSize}`
                );
            }
            if (!doNotRemove) {
                $(".bookshelf").remove();
            } else {
                $(".bookshelf").hide();
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
            $("#STRe-bookshelf-btn").remove();
        } else {
            $("#STRe-bookshelf-btn").hide();
        }
    },

    /**
     * Shows the bookshelf trigger button
     */
    showTriggerBtn() {
        $("#STRe-bookshelf-btn").show();
    },

    /**
     * Periodic loop to update book progress and save current filename
     */
    loop() {
        if (this.enabled) {
            localStorage.setItem(this._FILENAME_, CONFIG.VARS.FILENAME);
            if (CONFIG.VARS.FILENAME) this.updateBookProgressInfo(CONFIG.VARS.FILENAME, null, true);
            setTimeout(() => this.loop(), 1000);
        }
    },

    /**
     * Enables the bookshelf module and sets up event handlers
     * @returns {Object} The bookshelf instance for chaining
     */
    enable() {
        if (!this.enabled) {
            this.db = new BookshelfDB();
            this.db.upgradeDB();
            FileLoadCallback.regBefore(this.saveBook);
            this.enabled = true;

            if (CONFIG.RUNTIME_CONFIG.UPGRADE_DB) {
                this.db.upgradeDB();
            }

            if (CONFIG.RUNTIME_CONFIG.PRINT_DATABASE) {
                this.db.printAllDatabases();
            }

            // Listen for refreshBookList event
            document.addEventListener("refreshBookList", async (event) => {
                const { hardRefresh, sortBookshelf } = event.detail;
                await this.refreshBookList(hardRefresh, sortBookshelf);
            });

            // Listen for settings change events
            document.addEventListener("updateAllBookCovers", () => {
                this.updateAllBookCovers();
            });

            // Listen for showBookshelfTriggerBtn event
            document.addEventListener("showBookshelfTriggerBtn", () => {
                this.showTriggerBtn();
            });

            // Listen for hideBookshelfTriggerBtn event
            document.addEventListener("hideBookshelfTriggerBtn", () => {
                this.hideTriggerBtn();
            });

            // Listen for handleMultipleBooks event
            document.addEventListener("handleMultipleBooks", async (event) => {
                const { files, isFromLocal, isOnServer } = event.detail;

                if (this.enabled) {
                    // showLoadingScreen();
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

                    // // Since we use loading screen, we don't need the following code
                    // // The previous code load the entire array of files at once and set the second parameter of saveBook to true when processing the last file of the array, which is not ideal for large array of files.
                    // // The following code load ten files at a time. After processing the last file of the ten, set the second parameter of saveBook to true.
                    // let i = 0;
                    // while (i < files.length) {
                    //     let j = i + num_load_batch;
                    //     if (j > files.length) {
                    //         j = files.length;
                    //     }

                    //     // console.log(`Loading file ${i+1} to ${j} of ${files.length}.`);
                    //     for (let k = i; k < j; k++) {
                    //         // console.log(`Loading file ${k+1} of ${files.length}; ${k}, ${i}, ${j}, ${(k === j - 1)}`);
                    //         // console.log(k, j, files[k].name);
                    //         const final_isFromLocal = getIsFromLocal(files[k].name) || isFromLocal;
                    //         const final_isOnServer = getIsOnServer(files[k].name) || isOnServer;
                    //         setIsFromLocal(files[k].name, final_isFromLocal);
                    //         setIsOnServer(files[k].name, final_isOnServer);
                    //         // console.log(`${files[k].name}, final_isFromLocal: ${final_isFromLocal}, final_isOnServer: ${final_isOnServer}, refresh: ${(k === j - 1)}, sort: ${(k === files.length - 1)}, k=${k}, j=${j}`);

                    //         // console.log(`${files[k].name}, refresh: ${(k === j - 1)}, sort: ${(k === files.length - 1)}, k=${k}, j=${j}`);
                    //         // await bookshelf.saveBook(files[k], final_isFromLocal, final_isOnServer, i === 0 ? true : (k === j - 1), false, (k === files.length - 1));

                    //         // console.log(`${files[k].name}, refresh: ${i === 0 ? true : (k === files.length - 1)}, sort: ${(k === files.length - 1)}, k=${k}, j=${j}`);
                    //         await bookshelf.saveBook(files[k], final_isFromLocal, final_isOnServer, (k === files.length - 1), false, (k === files.length - 1));
                    //     }
                    //     // console.log('Loading finished.');
                    //     i = j;
                    // }

                    // hideLoadingScreen();
                } else {
                    console.log(
                        "Multiple files selected, only the first one will be loaded since bookshelf is disabled."
                    );
                    const firstFile = files[0];
                    setIsFromLocal(firstFile.name, getIsFromLocal(firstFile.name) || isFromLocal);
                    setIsOnServer(firstFile.name, getIsOnServer(firstFile.name) || isOnServer);
                    setBookLastReadTimestamp(firstFile.name);
                    await handleSelectedFile([firstFile]);
                }
            });

            // Listen for handleMultipleBooksWithoutLoading event
            document.addEventListener("handleMultipleBooksWithoutLoading", async (event) => {
                const { files, isFromLocal, isOnServer } = event.detail;

                if (this.enabled) {
                    // showLoadingScreen();
                    CONFIG.VARS.ALL_BOOKS_INFO = {};

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

                            const lastOpenedTimestamp = localStorage.getItem(`${file.name}_lastopened`);
                            if (lastOpenedTimestamp) {
                                file.lastOpenedTimestamp = lastOpenedTimestamp;
                                file.progress = getProgressText(file.name, false);
                            }
                            // CONFIG.VARS.ALL_BOOKS_INFO.push(file);
                            CONFIG.VARS.ALL_BOOKS_INFO[file.name] = file;
                        }

                        // Get all existing books
                        for (const book of await this.db.getAllBooks()) {
                            const final_isFromLocal = book.isFromLocal || false;
                            const final_isOnServer = book.isOnServer || false;
                            const new_file = {
                                name: book.name,
                                size: book.data.size,
                                isFromLocal: final_isFromLocal,
                                isOnServer: final_isOnServer,
                            };

                            const lastOpenedTimestamp = localStorage.getItem(`${new_file.name}_lastopened`);
                            if (lastOpenedTimestamp) {
                                new_file.lastOpenedTimestamp = lastOpenedTimestamp;
                                new_file.progress = getProgressText(new_file.name, false);
                            }

                            // CONFIG.VARS.ALL_BOOKS_INFO = CONFIG.VARS.ALL_BOOKS_INFO.filter(f => f.name !== new_file.name).concat([new_file]);
                            CONFIG.VARS.ALL_BOOKS_INFO[new_file.name] = new_file;
                        }

                        // Sort the bookshelf
                        let allBooksInfo_names = Object.keys(CONFIG.VARS.ALL_BOOKS_INFO);
                        allBooksInfo_names = this._sortBookshelf(allBooksInfo_names);

                        // console.log("allBooksInfo", allBooksInfo_names);
                        // console.log(CONFIG.VARS.ALL_BOOKS_INFO.length);

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
                        container.trigger("contentchange");
                    } catch (e) {
                        console.log("Error in handleMultipleFilesWithoutLoading:", e);
                    }

                    // If there is no book in bookshelf, hide the bookshelf
                    // Otherwise, show the bookshelf, but not the bookshelf trigger button
                    // Only show the bookshelf trigger button when a book is opened
                    if (Object.keys(CONFIG.VARS.ALL_BOOKS_INFO).length <= 0) {
                        this.hide();
                        this.hideTriggerBtn();
                    } else {
                        this.show();
                        // this.showTriggerBtn();
                    }

                    // hideLoadingScreen();
                }
            });

            // Listen for saveProcessedBook event
            document.addEventListener("saveProcessedBook", async (event) => {
                await bookshelf.db.updateProcessedBook(event.detail.name, event.detail);
            });

            $(`<div class="bookshelf">
            <div class="title">${CONFIG.RUNTIME_VARS.STYLE.ui_bookshelfCachedStorage}
            <div class="sub-title">${CONFIG.RUNTIME_VARS.STYLE.ui_bookshelfCachedStorage_subTitle}<br/>
                <span id="bookshelfUsageText">${CONFIG.RUNTIME_VARS.STYLE.ui_bookshelfCachedStorage_usage}&nbsp;<span id="bookshelfUsagePct"></span>% (<span id="bookshelfUsage"></span> / <span id="bookshelfQuota"></span>)</span></div></div>
            <div class="booklist"></div>
            <div class="bookshelf-btn-group">
                <div id="scrollTop-btn" class="btn-icon hasTitle" title="${CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_bookshelf_scrollTop}" style="visibility:hidden">
                    <svg class="icon" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 125">
                        <path class="tofill" d="M15.1,65.7c-3.6,0-7.2-1.5-9.7-4.5C0.9,55.8,1.7,47.9,7,43.4l34.9-29.1c4.7-3.9,11.5-3.9,16.2,0L93,43.4 c5.4,4.5,6.1,12.4,1.6,17.8c-4.5,5.4-12.4,6.1-17.8,1.6L50,40.5L23.2,62.8C20.8,64.8,18,65.7,15.1,65.7z" opacity="1"/>
                        <path class="tofill" d="M15.1,113.6c-3.6,0-7.2-1.5-9.7-4.5C0.9,103.6,1.7,95.8,7,91.3l34.9-29.1c4.7-3.9,11.5-3.9,16.2,0L93,91.3 c5.4,4.5,6.1,12.4,1.6,17.8c-4.5,5.4-12.4,6.1-17.8,1.6L50,88.3l-26.8,22.3C20.8,112.6,18,113.6,15.1,113.6z" opacity="0.5"/>
                    </svg>
                </div>
                <div id="scrollBottom-btn" class="btn-icon hasTitle" title="${CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_bookshelf_scrollBottom}" style="visibility:hidden">
                    <svg class="icon" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 125">
                        <path class="tofill" d="M84.9,59.3c3.6,0,7.2,1.5,9.7,4.5c4.5,5.4,3.7,13.3-1.6,17.8l-34.9,29.1c-4.7,3.9-11.5,3.9-16.2,0L7,81.6 c-5.4-4.5-6.1-12.4-1.6-17.8s12.4-6.1,17.8-1.6L50,84.5l26.8-22.3C79.2,60.2,82,59.3,84.9,59.3z" opacity="1"/>
                        <path class="tofill" d="M84.9,11.4c3.6,0,7.2,1.5,9.7,4.5c4.5,5.5,3.7,13.3-1.6,17.8L58.1,62.8c-4.7,3.9-11.5,3.9-16.2,0L7,33.7 c-5.4-4.5-6.1-12.4-1.6-17.8s12.4-6.1,17.8-1.6L50,36.7l26.8-22.3C79.2,12.4,82,11.4,84.9,11.4z" opacity="0.5"/>
                    </svg>
                </div>
            </div>
            </div>`)
                .hide()
                .on("dblclick", function (event) {
                    // disable double click event inside bookshelf
                    event.stopPropagation();
                })
                .appendTo(CONFIG.DOM_ELEMENT.DROPZONE);

            function defineScrollBtns() {
                if (this.scrollTop > 0) {
                    $("#scrollTop-btn")
                        .css("visibility", "visible")
                        .on("click", () => {
                            // this.scrollTop = 0;
                            $(this).stop(true, false);
                            $(this).animate({ scrollTop: 0 }, this.scrollHeight / 10);
                        });
                } else {
                    $("#scrollTop-btn").css("visibility", "hidden");
                }
                if (this.scrollHeight - this.offsetHeight - this.scrollTop > 1) {
                    $("#scrollBottom-btn")
                        .css("visibility", "visible")
                        .on("click", () => {
                            $(this).stop(true, false);
                            $(this).animate(
                                {
                                    scrollTop: this.scrollHeight - this.offsetHeight,
                                },
                                this.scrollHeight / 10
                            );
                        });
                } else {
                    $("#scrollBottom-btn").css("visibility", "hidden");
                }
            }

            $(".booklist").on("scroll", function () {
                defineScrollBtns.call(this);
                $(".dot-menu__checkbox").prop("checked", false);
                $(".bookInfoMenu").remove();
            });

            $(".booklist").bind("contentchange", function () {
                // set bookshelf height
                const bookWidth = $(".book").outerWidth(true);
                const bookHeight = $(".book").outerHeight(true);
                const windowHeight = $(CONFIG.DOM_ELEMENT.DROPZONE).outerHeight(true);
                let numBookshelfRows = Math.ceil($(".book").length / Math.floor(this.offsetWidth / bookWidth));
                numBookshelfRows = isFinite(numBookshelfRows) ? numBookshelfRows : 0;
                if (numBookshelfRows > 0) {
                    let topPx = "";
                    topPx = `max(calc(${
                        windowHeight - (bookHeight + 24) * numBookshelfRows
                    }px - 2 * var(--ui_booklist_padding)), 25%)`;
                    $(".bookshelf").css("top", topPx);
                    const topPxNum = parseInt($(".bookshelf").css("top"));
                    $(CONFIG.DOM_ELEMENT.DROPZONE_TEXT).css(
                        "top",
                        `calc(${topPxNum} / ${windowHeight} * var(--ui_dropZoneTextTop))`
                    );
                    $(CONFIG.DOM_ELEMENT.DROPZONE_TEXT).css(
                        "font-size",
                        `max(calc(1.2 * (${topPxNum} / ${windowHeight}) * var(--ui_dropZoneTextSize)), calc(var(--ui_dropZoneTextSize) / 1.5))`
                    );
                    $(CONFIG.DOM_ELEMENT.DROPZONE_IMG).css(
                        "top",
                        `calc(${topPxNum} / ${windowHeight} * var(--ui_dropZoneImgTop))`
                    );
                    $(CONFIG.DOM_ELEMENT.DROPZONE_IMG).css(
                        "width",
                        `max(calc(1.2 * (${topPxNum} / ${windowHeight}) * var(--ui_dropZoneImgSize)), calc(var(--ui_dropZoneImgSize) / 1.5)`
                    );
                    $(CONFIG.DOM_ELEMENT.DROPZONE_IMG).css(
                        "height",
                        `max(calc(1.2 * (${topPxNum} / ${windowHeight}) * var(--ui_dropZoneImgSize)), calc(var(--ui_dropZoneImgSize) / 1.5)`
                    );
                } else {
                    // return to default values
                    $(".bookshelf").css("display", "none");
                    $(".bookshelf").css("top", "");
                    $(CONFIG.DOM_ELEMENT.DROPZONE_TEXT).css("top", "var(--ui_dropZoneTextTop)");
                    $(CONFIG.DOM_ELEMENT.DROPZONE_TEXT).css("font-size", "var(--ui_dropZoneTextSize)");
                    $(CONFIG.DOM_ELEMENT.DROPZONE_IMG).css("top", "var(--ui_dropZoneImgTop)");
                    $(CONFIG.DOM_ELEMENT.DROPZONE_IMG).css("width", "var(--ui_dropZoneImgSize)");
                    $(CONFIG.DOM_ELEMENT.DROPZONE_IMG).css("height", "var(--ui_dropZoneImgSize)");
                }

                if (this.scrollHeight > this.parentNode.clientHeight) {
                    // console.log('overflown', this.scrollTop, this.scrollHeight-this.offsetHeight);
                    defineScrollBtns.call(this);
                } else {
                    // console.log('not overflown');
                    $("#scrollTop-btn").css("visibility", "hidden");
                    $("#scrollBottom-btn").css("visibility", "hidden");
                }
            });

            $(window).on("resize", function () {
                $(".booklist").trigger("contentchange");
                $(".dot-menu__checkbox").prop("checked", false);
                $(".bookInfoMenu").remove();
            });

            // capable of scrolling booklist within the entire bookshelf
            document.getElementsByClassName("bookshelf")[0].addEventListener("wheel", function (e) {
                // prevent scrolling booklist when mouse is hovering on bookInfoMenu
                if ($(".bookInfoMenu").length > 0) {
                    if ($(".bookInfoMenu").is(":hover")) {
                        return;
                    }
                }

                // scroll booklist accordingly
                document.getElementsByClassName("booklist")[0].scrollTop += e.deltaY;
            });

            // console.log("Module <Bookshelf> enabled.");
            setTimeout(() => this.loop(), 1000);
        }
        return this;
    },

    /**
     * Disables the bookshelf module and cleans up resources
     * @returns {Object} The bookshelf instance for chaining
     */
    disable() {
        if (this.enabled) {
            FileLoadCallback.unregBefore(this.saveBook);
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
        $(`<div id="STRe-bookshelf-btn" class="btn-icon hasTitle" title="${CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_goToLibrary}">
        <svg class="icon" viewBox="0 0 800 800" id="Flat" xmlns="http://www.w3.org/2000/svg">
        <path class="tofill" d="M730,611.2l-129.4-483c-7.2-26.7-34.6-42.5-61.2-35.4l-96.6,25.9c-1.1,0.3-2.1,0.7-3.1,1c-9.4-12.4-24.1-19.7-39.7-19.7H300
        c-8.8,0-17.4,2.3-25,6.8c-7.6-4.4-16.2-6.8-25-6.8H150c-27.6,0-50,22.4-50,50v500c0,27.6,22.4,50,50,50h100c8.8,0,17.4-2.3,25-6.8
        c7.6,4.4,16.2,6.8,25,6.8h100c27.6,0,50-22.4,50-50V338.8l86.9,324.2c7.1,26.7,34.5,42.5,61.2,35.4c0,0,0,0,0,0l96.6-25.9
        C721.3,665.2,737.2,637.8,730,611.2z M488.1,287.8l96.6-25.9l64.7,241.5l-96.6,25.9L488.1,287.8z M552.3,141.1l19.4,72.4l-96.6,25.9
        L455.7,167L552.3,141.1z M400,150l0,375H300V150H400z M250,150v75H150v-75H250z M150,650V275h100v375H150z M400,650H300v-75h100
        L400,650L400,650z M681.8,624.1L585.2,650l-19.4-72.4l96.6-25.9L681.8,624.1L681.8,624.1z"/>
        <path class="tofill" d="M665.9,513.9l-122.7,32.8l-70.7-263.3l122.7-32.8L665.9,513.9z M262,262H136v400h126V262z" opacity="0.3" /></div>`)
            .on("click", () => {
                resetUI();
            })
            .prependTo($("#btnWrapper"))
            .hide();
    },
};

/**
 * Initializes the bookshelf module
 * @public
 */
export function initBookshelf() {
    // Enable bookshelf functionality
    if (CONFIG.RUNTIME_CONFIG.ENABLE_BOOKSHELF) {
        bookshelf.init();
        bookshelf.enable();

        bookshelf.refreshBookList(); // Now whether or not to show bookshelf depends on whether there is a book in bookshelf

        // Open the last read book on startup
        bookshelf.reopenBook();
    }
}
