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
 * @module modules/features/bookshelf
 * @requires config/index
 * @requires config/icons
 * @requires modules/text/text-processor
 * @requires modules/file/fileload-callback
 * @requires modules/components/cover-generator
 * @requires utils/base
 * @requires utils/helpers-ui
 * @requires utils/helpers-file
 * @requires utils/helpers-bookshelf
 * @requires utils/helpers-reader
 * @requires lib/sweetalert2
 */

import * as CONFIG from "../../config/index.js";
import { ICONS } from "../../config/icons.js";
import { TextProcessor } from "../text/text-processor.js";
import { FileLoadCallback } from "../file/fileload-callback.js";
import { getCoverGenerator } from "../components/cover-generator.js";
import {
    isVariableDefined,
    getSizePrecise,
    removeFileExtension,
    convertUTCTimestampToLocalString,
    formatBytes,
    setSvgPathLength,
} from "../../utils/base.js";
import {
    showLoadingScreen,
    hideLoadingScreen,
    hideContent,
    hideDropZone,
    resetUI,
    resetVars,
} from "../../utils/helpers-ui.js";
import { handleSelectedFile, handleProcessedBook } from "../../utils/helpers-file.js";
import {
    setBookLastReadTimestamp,
    setIsFromLocal,
    getIsFromLocal,
    setIsOnServer,
    getIsOnServer,
} from "../../utils/helpers-bookshelf.js";
import { getProgressText, removeHistory, getIsBookFinished } from "../../utils/helpers-reader.js";
import Swal from "../../lib/sweetalert2/src/sweetalert2.js";

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
     * @param {IDBTransaction} [transaction=null] - Transaction object
     * @returns {IDBObjectStore|Object<string, IDBObjectStore>} The requested object store(s)
     */
    #getObjectStore(storeNames, mode = "readonly", transaction = null) {
        // Ensure storeNames is either a string or an array
        if (typeof storeNames !== "string" && !Array.isArray(storeNames)) {
            throw new Error("storeNames must be a string or an array.");
        }

        // Normalize to array for consistent handling
        const names = Array.isArray(storeNames) ? storeNames : [storeNames];

        const activeTransaction = transaction || this.#db.transaction(names, mode);
        activeTransaction.onerror = function (evt) {
            console.error("Transaction error:", evt.target.error);
        };

        // Return a single store or an object containing multiple stores
        if (names.length === 1) {
            return activeTransaction.objectStore(names[0]); // Single store
        }

        // Return an object mapping store names to their respective object stores
        return names.reduce((stores, name) => {
            stores[name] = activeTransaction.objectStore(name);
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
     * @throws {Error} When database initialization fails or transaction fails
     */
    async putBook(name, data, isFromLocal = true, isOnServer = false) {
        if (!(await this.#init())) {
            throw new Error("Init local db error!");
        }

        // Get the language of the book
        const { isEastern } = await TextProcessor.getLanguageAndEncodingFromBook(data);

        // Start a single transaction for both object stores
        const transaction = this.#db.transaction(
            [this.#objectStores.bookfiles, this.#objectStores.bookProcessed],
            "readwrite"
        );

        try {
            // Get the object stores using the same transaction
            const { bookfiles: tbl, bookProcessed: processedTbl } = this.#getObjectStore(
                [this.#objectStores.bookfiles, this.#objectStores.bookProcessed],
                "readwrite",
                transaction
            );

            // Save processed book info to bookProcessed
            await this.#exec(
                processedTbl.put({
                    name: name,
                })
            );

            // Save book info to bookfiles
            await this.#exec(
                tbl.put({
                    name,
                    data,
                    isFromLocal,
                    isOnServer,
                    processed: false,
                    pageBreakOnTitle: CONFIG.RUNTIME_CONFIG.PAGE_BREAK_ON_TITLE ?? true,
                    isEastern: isEastern,
                })
            );

            return true;
        } catch (error) {
            transaction.abort();
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
        if (!(await this.#init())) {
            throw new Error("Init local db error!");
        }

        // Start a single transaction for both object stores
        const transaction = this.#db.transaction(
            [this.#objectStores.bookfiles, this.#objectStores.bookProcessed],
            "readwrite"
        );

        try {
            // Get the object stores using the same transaction
            const { bookfiles: tbl, bookProcessed: processedTbl } = this.#getObjectStore(
                [this.#objectStores.bookfiles, this.#objectStores.bookProcessed],
                "readwrite",
                transaction
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
                    pageBreakOnTitle: CONFIG.RUNTIME_CONFIG.PAGE_BREAK_ON_TITLE ?? true,
                })
            );

            // Get the existing processed book
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
            await this.#exec(processedTbl.put(updatedBook));

            return true;
        } catch (error) {
            transaction.abort();
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
        if (!(await this.#init())) {
            throw new Error("Init local db error!");
        }

        // Start a single transaction for the object store
        const transaction = this.#db.transaction([this.#objectStores.bookfiles], "readwrite");

        try {
            // Get the object stores using the same transaction
            const tbl = this.#getObjectStore(this.#objectStores.bookfiles, "readwrite", transaction);

            // Get the existing book
            const existingBook = await this.#exec(tbl.get(name));
            if (!existingBook) {
                throw new Error(`Book with name "${name}" not found in the database.`);
            }

            await this.#exec(tbl.put({ ...existingBook, isEastern }));

            return true;
        } catch (error) {
            transaction.abort();
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
        if (!(await this.#init())) {
            throw new Error("Init local db error!");
        }

        // Start a single transaction for the object stores
        const transaction = this.#db.transaction(
            [this.#objectStores.bookfiles, this.#objectStores.bookProcessed],
            "readonly"
        );

        try {
            // Get the object stores using the same transaction
            const { bookfiles: tbl, bookProcessed: processedTbl } = this.#getObjectStore(
                [this.#objectStores.bookfiles, this.#objectStores.bookProcessed],
                "readonly",
                transaction
            );

            // Retrieve book data and processed data
            const [result, processedResult] = await Promise.all([
                this.#exec(tbl.get(name)),
                this.#exec(processedTbl.get(name)),
            ]);

            // Merge the results and return
            if (!result && !processedResult) {
                return null; // Return null if both are missing
            }

            return { ...result, ...processedResult };
        } catch (error) {
            transaction.abort();
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
        if (!(await this.#init())) {
            throw new Error("Init local db error!");
        }

        const tbl = this.#getObjectStore(this.#objectStores.bookfiles);
        const books = [];

        return new Promise((resolve, reject) => {
            const request = tbl.openCursor();
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    books.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(books); // No more records
                }
            };
            request.onerror = (event) => {
                console.error("Cursor error:", event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Retrieves all cloud-stored books from the database
     * @async
     * @returns {Promise<Array>} Array of cloud-stored books
     * @throws {Error} When database initialization fails or transaction fails
     */
    async getAllCloudBooks() {
        if (!(await this.#init())) {
            throw new Error("Init local db error!");
        }

        const tbl = this.#getObjectStore(this.#objectStores.bookfiles);
        const cloudBooks = [];

        return new Promise((resolve, reject) => {
            const request = tbl.openCursor();
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const book = cursor.value;
                    if (book.isOnServer) {
                        cloudBooks.push(book);
                    }
                    cursor.continue();
                } else {
                    resolve(cloudBooks); // No more records
                }
            };
            request.onerror = (event) => {
                console.error("Cursor error:", event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Checks if a book exists in the database
     * @async
     * @param {string} name - Book filename
     * @returns {Promise<boolean>} Whether book exists
     * @throws {Error} When database initialization fails or transaction fails
     */
    async isBookExist(name) {
        if (!(await this.#init())) {
            throw new Error("Init local db error!");
        }

        try {
            const tbl = this.#getObjectStore(this.#objectStores.bookfiles);
            const result = await this.#exec(tbl.getKey(name));
            return !!result;
        } catch (error) {
            console.error("Error checking if book exists:", error);
            throw error;
        }
    }

    /**
     * Removes a book from the database
     * @async
     * @param {string} name - Book filename
     * @throws {Error} When database initialization fails or transaction fails
     */
    async removeBook(name) {
        if (!(await this.#init())) {
            throw new Error("Init local db error!");
        }

        // Start a single transaction for the object stores
        const transaction = this.#db.transaction(
            [this.#objectStores.bookfiles, this.#objectStores.bookProcessed],
            "readwrite"
        );

        try {
            // Get the object stores using the same transaction
            const { bookfiles: tbl, bookProcessed: processedTbl } = this.#getObjectStore(
                [this.#objectStores.bookfiles, this.#objectStores.bookProcessed],
                "readwrite",
                transaction
            );

            // Delete entries
            await this.#exec(tbl.delete(name));
            await this.#exec(processedTbl.delete(name));

            return true;
        } catch (error) {
            transaction.abort();
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
        if (!(await this.#init())) {
            throw new Error("Init local db error!");
        }

        // Start a single transaction for the object stores
        const transaction = this.#db.transaction(
            [this.#objectStores.bookfiles, this.#objectStores.bookProcessed],
            "readwrite"
        );

        try {
            // Get the object stores using the same transaction
            const { bookfiles: tbl, bookProcessed: processedTbl } = this.#getObjectStore(
                [this.#objectStores.bookfiles, this.#objectStores.bookProcessed],
                "readwrite",
                transaction
            );

            // Clear the object stores
            await this.#exec(tbl.clear());
            await this.#exec(processedTbl.clear());

            return true;
        } catch (error) {
            transaction.abort();
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
        if (!(await this.#init())) {
            throw new Error("Init local db error!");
        }

        // Start a single transaction for the object stores
        const transaction = this.#db.transaction(
            [this.#objectStores.bookfiles, this.#objectStores.bookProcessed],
            "readwrite"
        );

        try {
            // Get the object stores using the same transaction
            const { bookfiles: tbl, bookProcessed: processedTbl } = this.#getObjectStore(
                [this.#objectStores.bookfiles, this.#objectStores.bookProcessed],
                "readwrite",
                transaction
            );

            // Use a cursor to iterate through all records in `bookfiles`
            const cursorRequest = tbl.openCursor();
            cursorRequest.onsuccess = async (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const book = cursor.value;
                    if (book.isOnServer && !book.isFromLocal) {
                        // Delete the current record
                        await this.#exec(tbl.delete(cursor.key));
                        await this.#exec(processedTbl.delete(cursor.key));
                    }
                    // Move to the next record
                    cursor.continue();
                }
            };

            // Wait for the transaction to complete
            return new Promise((resolve, reject) => {
                transaction.oncomplete = () => resolve(true);
                transaction.onerror = (evt) => reject(evt.target.error);
            });
        } catch (error) {
            transaction.abort();
            console.error("Error removing all cloud books:", error);
            throw error;
        }
    }

    /**
     * Upgrades the database schema
     * @async
     * @throws {Error} When database initialization fails or transaction fails
     */
    async upgradeDB(force = false) {
        // console.log("upgradeDB: ", force);
        const currentDBVersion = await this.#getDBVersion();
        // console.log("currentDBVersion: ", currentDBVersion);

        if (currentDBVersion > this.#dbVersion) {
            throw new Error(`Database version mismatch! Current: ${currentDBVersion}, Expected: ${this.#dbVersion}`);
        } else if (currentDBVersion === this.#dbVersion && !force) {
            return;
        }

        // Initialize the database
        if (!(await this.#init())) {
            throw new Error("Init local db error!");
        }

        // Define required fields for bookfiles and bookProcessed
        const bookfilesFields = [
            "name",
            "data",
            "isFromLocal",
            "isOnServer",
            "processed",
            "pageBreakOnTitle",
            "isEastern",
        ];
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

        // Start a single transaction
        const transaction = this.#db.transaction(
            [this.#objectStores.bookfiles, this.#objectStores.bookProcessed],
            "readwrite"
        );

        // Get the object stores
        const { bookfiles: tbl, bookProcessed: processedTbl } = this.#getObjectStore(
            [this.#objectStores.bookfiles, this.#objectStores.bookProcessed],
            "readwrite",
            transaction
        );

        let dbUpdated = false;

        // Open a cursor to iterate over all books in the bookfiles object store
        const cursorRequest = tbl.openCursor();
        cursorRequest.onsuccess = async (event) => {
            const cursor = event.target.result;
            if (cursor) {
                const book = cursor.value;
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
                const existingProcessedBook = await this.#exec(processedTbl.get(name));

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
                if (JSON.stringify(book) !== JSON.stringify(bookfilesData)) {
                    dbUpdated = true;
                    await this.#exec(tbl.put(bookfilesData));
                }

                cursor.continue();
            }
        };

        cursorRequest.onerror = (event) => {
            console.error("Cursor error:", event.target.error);
        };

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => {
                if (dbUpdated) {
                    this.printAllDatabases();
                    console.log("Database upgrade completed.");
                }
                resolve();
            };

            transaction.onerror = (event) => {
                console.error("Transaction error:", event.target.error);
                reject(event.target.error);
            };

            transaction.onabort = (event) => {
                console.error("Transaction aborted:", event.target.error);
                reject(event.target.error);
            };
        });
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
            pageBreakOnTitle: true,
            isEastern: true,

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
     * @throws {Error} When database initialization fails or transaction fails
     */
    async #printBookfiles() {
        if (!(await this.#init())) {
            throw new Error("Init local db error!");
        }

        try {
            const tbl = this.#getObjectStore(this.#objectStores.bookfiles);
            const records = await this.#exec(tbl.getAll());
            if (records.length === 0) {
                console.log("No records found in bookfiles.");
            } else {
                console.log("All records in bookfiles:");
                console.table(records);
            }
        } catch (error) {
            console.error("Error printing bookfiles:", error);
        }
    }

    /**
     * Prints all records in the "bookProcessed" object store
     * @async
     * @throws {Error} When database initialization fails or transaction fails
     */
    async #printBookProcessed() {
        if (!(await this.#init())) {
            throw new Error("Init local db error!");
        }

        try {
            const processedTbl = this.#getObjectStore(this.#objectStores.bookProcessed);
            const records = await this.#exec(processedTbl.getAll());

            // Preprocess records to include sizes of arrays and objects
            const processedRecords = records.map((record) => {
                const preprocessValue = (key, value) => {
                    if (key === "bookAndAuthor" && value && typeof value === "object") {
                        return `${value.bookName}, ${value.author}`;
                    } else if (Array.isArray(value)) {
                        return `Array(${value.length})`; // Show array length
                    } else if (value && typeof value === "object") {
                        return `Object(${Object.keys(value).length})`; // Show object key count
                    }
                    return value; // Keep primitive values as-is
                };

                // Process each record's properties
                return Object.fromEntries(
                    Object.entries(record).map(([key, value]) => [key, preprocessValue(key, value)])
                );
            });

            if (processedRecords.length === 0) {
                console.log("No records found in bookProcessed.");
            } else {
                console.log("All records in bookProcessed:");
                console.table(processedRecords);
            }
        } catch (error) {
            console.error("Error printing bookProcessed:", error);
        }
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

        try {
            await this.#printBookfiles();
        } catch (error) {
            console.error("Error printing bookfiles:", error);
        }

        try {
            await this.#printBookProcessed();
        } catch (error) {
            console.error("Error printing bookProcessed:", error);
        }

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
     * @param {boolean} [forceRefresh=false] - Whether to force refresh the book
     * @returns {Promise<boolean>} Success status of opening the book
     * @throws {Error} When book cannot be opened or found
     */
    async openBook(fname, forceRefresh = false) {
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
                const book_pageBreakOnTitle = fetchedBook?.pageBreakOnTitle ?? true;
                if (book) {
                    book[this._CACHE_FLAG_] = true;
                    resetVars();
                    if (
                        !book_processed ||
                        CONFIG.RUNTIME_CONFIG.ALWAYS_PROCESS ||
                        book_pageBreakOnTitle !== CONFIG.RUNTIME_CONFIG.PAGE_BREAK_ON_TITLE ||
                        forceRefresh
                    ) {
                        await this.processBook(book);
                    } else {
                        await this.handleBook(book, fetchedBook);
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
     * Processes a book by handling it with handleSelectedFile
     * @async
     * @param {File} book - Book file to process
     */
    async processBook(book) {
        try {
            await handleSelectedFile([book]);
        } catch (e) {
            console.log(e);
            try {
                await this.removeBook(book.name); // Remove book from db
                await handleSelectedFile([book]); // Retry processing the book
            } catch (retryError) {
                console.log(retryError);
            }
        }
    },

    /**
     * Handles a processed book by handling it with handleProcessedBook
     * @async
     * @param {File} book - Book file to handle
     * @param {Object} fetchedBook - Fetched book object from db
     */
    async handleBook(book, fetchedBook) {
        try {
            await handleProcessedBook(fetchedBook);
        } catch (e) {
            console.log(e);
            await this.processBook(book); // Fallback to reprocess the book
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
            if (getIsBookFinished(fname)) {
                bookElm.data("isFinished", true);
                // bookElm.find(".progress").html(CONFIG.RUNTIME_VARS.STYLE.ui_bookFinished).attr("title", progress);
                // add styling to the text of read
                const read_text = `<span class="read_text">
                ${ICONS.FINISHED}
                ${CONFIG.RUNTIME_VARS.STYLE.ui_bookFinished}</span>`;
                bookElm.find(".progress").html(read_text);

                // add a badge to the book cover
                // const badge = `<div class="bookFinished_badge">${ICONS.FINISHED_BADGE_OLD}</div>`;
                const badge = `<div class="bookFinished_badge">${ICONS.FINISHED_BADGE}</div>`;
                bookElm.find(".coverContainer").append(badge);
            } else {
                if (parseInt(progress) >= 99) {
                    bookElm.data("almostDone", true);
                    const almostDone_text = `<span class="almostDone_text">${CONFIG.RUNTIME_VARS.STYLE.ui_bookAlmostDone}</span>`;
                    bookElm
                        .find(".progress")
                        .html(progress + almostDone_text)
                        .attr("title", progress);
                } else {
                    bookElm.data("inProgress", true);
                    bookElm.find(".progress").html(progress).attr("title", progress);
                }
            }
        } else {
            bookElm.data("unRead", true);
            bookElm.removeClass("read").css("--read-progress", "");
            // bookElm.find(".progress").html(CONFIG.RUNTIME_VARS.STYLE.ui_bookNotRead);

            // add styling to the text of not read
            const notRead_text = `<span class="notRead_text">${CONFIG.RUNTIME_VARS.STYLE.ui_bookNotRead}</span>`;
            bookElm.find(".progress").html(notRead_text);

            // add a badge to the book cover
            const badge = `<div class="bookNotRead_badge">${ICONS.NEWBOOK_RIBBON}</div>`;
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
        const book = $(
            `<div class="book" data-filename="${bookInfo.name}">
                <div class="coverContainer">
                    <span class="coverText">${bookInfo.name}</span>
                    <canvas class="coverCanvas" width="${canvasWidth}" height="${canvasHeight}"></canvas>
                </div>
                <div class="infoContainer">
                    <div class="progress"></div>
                    <div class="isOnServer">
                        ${bookInfo.isOnServer && !bookInfo.isFromLocal ? `${ICONS.BOOK_IS_ON_SERVER}` : ""}
                    </div>
                    <div class="delete-btn-wrapper">
                        <span class="delete-btn hasTitle" title="${CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_removeBook}">
                            ${ICONS.DELETE_BOOK}
                        </span>
                    </div>
                    <div id="bookInfoMenuBtn-${idx}" class="bookInfoMenuBtn hasTitle" title="${
                CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_bookInfo
            }">
                        <input id="dot-menu-${idx}" type="checkbox" class="dot-menu__checkbox">
                        <label for="dot-menu-${idx}" class="dot-menu__label"><span></span></label>
                    </div>
                </div>
            </div>`
        );
        const currentBookNameAndAuthor = TextProcessor.getBookNameAndAuthor(removeFileExtension(bookInfo.name));
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
        book.data("isEastern", bookInfo.isEastern);
        book.data("bookNameAndAuthor", currentBookNameAndAuthor);

        // add mouseover effect
        book.find(".coverContainer")
            .on("mouseenter", function () {
                book.find(".delete-btn-wrapper").css("opacity", "1");
                $(this).css("box-shadow", "var(--ui_bookshadow_hover)");
                // add a tooltip to the book cover
                $(this).attr("title", CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_book_altClick);
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
        book.find(".infoContainer")
            .on("mouseenter", function () {
                book.find(".delete-btn-wrapper").css("opacity", "1");
            })
            .on("mouseleave", function () {
                book.find(".delete-btn-wrapper").css("opacity", "0");
            });

        // add click event
        book.find(".coverContainer").on("click", (evt) => {
            evt.originalEvent.stopPropagation();
            if (evt.altKey) {
                // Alt key on Windows/Linux, Option key on Mac
                console.log(`Force reprocess ${bookInfo.name}.`);
                this.openBook(bookInfo.name, true);
            } else {
                this.openBook(bookInfo.name);
            }
        });

        // add right click event
        book.find(".coverContainer").on("contextmenu", (evt) => {
            evt.originalEvent.stopPropagation();
            console.log("Right clicked");
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
                    // setIsFromLocal(bookInfo.name, false);
                    // bookInfo.isFromLocal = false;

                    // if the book is neither from local nor on server, remove it from history
                    // if (!bookInfo.isFromLocal && !bookInfo.isOnServer) {
                    //     removeHistory(bookInfo.name);
                    // }

                    // remove the book from history
                    removeHistory(bookInfo.name);
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
                const tempBookAuthor =
                    book.data("bookNameAndAuthor") ??
                    TextProcessor.getBookNameAndAuthor(removeFileExtension(bookInfo.name));
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
            const bookNameAndAuthor =
                $(book).data("bookNameAndAuthor") ??
                TextProcessor.getBookNameAndAuthor(removeFileExtension(book_filename));
            const coverSettings = this._getCoverSettings({
                width: book_cover.width,
                height: book_cover.height,
                bookNameAndAuthor: bookNameAndAuthor,
            });
            generator.generate(coverSettings, ctx);
        });
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
                    const final_isEastern = await this._getBookLanguage(book);
                    const new_book = {
                        name: book.name,
                        size: book.data.size,
                        isFromLocal: final_isFromLocal,
                        isOnServer: final_isOnServer,
                        isEastern: final_isEastern,
                    };
                    if (book.isEastern === undefined || book.isEastern !== final_isEastern) {
                        await bookshelf.db.updateBookLanguage(book.name, final_isEastern);
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

            // Update filter bar
            this._updateFilterBar();

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
     * Aligns the filter bar to the first book of the bookshelf and also aligns the filter bar to the right of the last book of the first row
     * @private
     */
    _alignFilterBar() {
        setTimeout(() => {
            const filterBar = document.querySelector(".booklist-filter-bar");
            const firstBook = document.querySelector(".bookshelf .book");
            const booklist = document.querySelector(".bookshelf .booklist");

            if (!firstBook || !filterBar || !booklist) {
                console.warn("Required elements not found.");
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

        // If no books, hide the filter bar
        if (allBooks.length === 0) {
            filterBar.removeClass("visible");
            return;
        }

        // Helper function to show/hide the filter bar
        const setFilterBarVisibility = (visible) => {
            if (visible) {
                // console.log("show filter bar");

                // Show all filter buttons
                filterBar.find(".booklist-filter-btn").show();

                // Align the filter bar
                bookshelf._alignFilterBar();

                // Adjust the margin of the bookshelf
                const filterBarHeight = filterBar.outerHeight(true);
                booklist.css("margin-top", `-${filterBarHeight}px`);

                // Use requestAnimationFrame to ensure the position is set before showing
                requestAnimationFrame(() => {
                    filterBar.addClass("visible");
                });
            } else {
                // console.log("hide filter bar");

                // Hide filter buttons, keep the counter visible
                filterBar.find(".booklist-filter-btn").hide();

                // Important: even when hiding buttons, call the alignment function
                bookshelf._alignFilterBar();

                // Recalculate height (only include counter)
                const filterBarHeight = filterBar.outerHeight(true);
                booklist.css("margin-top", `-${filterBarHeight}px`);

                filterBar.removeClass("visible");
            }
        };

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
        const counterElement = $("<span></span>")
            .addClass("booklist-filter-counter prevent-select")
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

            Swal.fire({
                title: CONFIG.RUNTIME_VARS.STYLE.ui_removeAllBooks_confirm_title,
                text: CONFIG.RUNTIME_VARS.STYLE.ui_removeAllBooks_confirm_text,
                iconHtml: ICONS.DELETE_ALL_BOOKS,
                customClass: {
                    icon: "booklist-remove-all-popup-icon",
                    popup: "booklist-remove-all-popup",
                    title: "booklist-remove-all-popup",
                    htmlContainer: "booklist-remove-all-popup",
                    confirmButton: "booklist-remove-all-popup",
                    cancelButton: "booklist-remove-all-popup",
                    actions: "booklist-remove-all-popup swal2-actions",
                },
                iconColor: CONFIG.RUNTIME_VARS.STYLE.mainColor_inactive,
                showCancelButton: true,
                confirmButtonColor: CONFIG.RUNTIME_VARS.STYLE.mainColor_inactive,
                cancelButtonColor: CONFIG.RUNTIME_VARS.STYLE.fontInfoColor,
                confirmButtonText: CONFIG.RUNTIME_VARS.STYLE.ui_removeAllBooks_confirm_btn,
                cancelButtonText: CONFIG.RUNTIME_VARS.STYLE.ui_removeAllBooks_cancel_btn,
                background: CONFIG.RUNTIME_VARS.STYLE.bgColor,
            }).then((result) => {
                if (result.isConfirmed) {
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
                    });
                }
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
        setFilterBarVisibility(filterButtonCount > 0);
    },

    /**
     * Resets the dropzone styles
     * @private
     */
    _resetDropzoneStyles() {
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
        if (isVariableDefined(CONFIG.DOM_ELEMENT.DROPZONE_TEXT)) {
            $(CONFIG.DOM_ELEMENT.DROPZONE_TEXT).removeClass("dropzone-text-default").addClass("dropzone-text-custom");
        }
        if (isVariableDefined(CONFIG.DOM_ELEMENT.DROPZONE_IMG)) {
            $(CONFIG.DOM_ELEMENT.DROPZONE_IMG).removeClass("dropzone-img-default").addClass("dropzone-img-custom");
        }
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
            this._resetDropzoneStyles();
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
                this.db.upgradeDB(true);
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

                    hideLoadingScreen(false);
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
                    showLoadingScreen();
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

                    hideLoadingScreen(false);
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
            <div class="booklist-filter-bar"></div>
            <div class="booklist"></div>
            <div class="bookshelf-btn-group">
                <div id="scrollTop-btn" class="btn-icon hasTitle" title="${CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_bookshelf_scrollTop}" style="visibility:hidden">
                    ${ICONS.BOOKLIST_SCROLL_TOP}
                </div>
                <div id="scrollBottom-btn" class="btn-icon hasTitle" title="${CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_bookshelf_scrollBottom}" style="visibility:hidden">
                    ${ICONS.BOOKLIST_SCROLL_BOTTOM}
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
                const $booklist = $(".booklist");
                const scrollTop = $booklist.scrollTop();
                const scrollHeight = $booklist[0].scrollHeight;
                const offsetHeight = $booklist[0].offsetHeight;

                if (scrollTop > 0) {
                    $("#scrollTop-btn")
                        .css("visibility", "visible")
                        .on("click", () => {
                            // $booklist.scrollTop = 0;
                            $booklist.stop(true, false);
                            $booklist.animate({ scrollTop: 0 }, scrollHeight / 10);
                        });
                } else {
                    $("#scrollTop-btn").css("visibility", "hidden");
                }
                if (scrollHeight - offsetHeight - scrollTop > 1) {
                    $("#scrollBottom-btn")
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
                    $("#scrollBottom-btn").css("visibility", "hidden");
                }
            }

            $(".booklist").on("scroll", () => {
                defineScrollBtns();
                $(".dot-menu__checkbox").prop("checked", false);
                $(".bookInfoMenu").remove();
            });

            $(".booklist").on("contentchange", function () {
                // set bookshelf height
                const bookWidth = $(".book").outerWidth(true);
                const bookHeight = $(".book").outerHeight(true);
                const windowHeight = $(CONFIG.DOM_ELEMENT.DROPZONE).outerHeight(true);
                const windowWidth = $(CONFIG.DOM_ELEMENT.DROPZONE).outerWidth(true);
                let numBookshelfRows = Math.ceil($(".book").length / Math.floor(this.offsetWidth / bookWidth));
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
                    bookshelf._setDropzoneStyles();
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
                    bookshelf._resetDropzoneStyles();

                    $(".bookshelf").css({
                        display: "none",
                        top: "",
                    });
                }

                if (this.scrollHeight > this.parentNode.clientHeight) {
                    // console.log("overflown", this.scrollTop, this.scrollHeight - this.offsetHeight);
                    defineScrollBtns();
                } else {
                    // console.log("not overflown");
                    $("#scrollTop-btn").css("visibility", "hidden");
                    $("#scrollBottom-btn").css("visibility", "hidden");
                }

                // Update filter bar
                bookshelf._updateFilterBar();
            });

            $(window).on("resize", () => {
                $(".booklist").trigger("contentchange");
                $(".dot-menu__checkbox").prop("checked", false);
                $(".bookInfoMenu").remove();
            });

            // capable of scrolling booklist within the entire bookshelf
            document.getElementsByClassName("bookshelf")[0].addEventListener("wheel", (e) => {
                // prevent scrolling booklist when mouse is hovering on bookInfoMenu
                if ($(".bookInfoMenu").length > 0) {
                    if ($(".bookInfoMenu").is(":hover")) {
                        return;
                    }
                }

                // scroll booklist accordingly
                document.getElementsByClassName("booklist")[0].scrollTop += e.deltaY;
            });

            // Set tooltip for Dropzone
            document.getElementsByClassName("bookshelf")[0].addEventListener("mouseenter", () => {
                CONFIG.DOM_ELEMENT.DROPZONE.title = "";
            });

            // Reset tooltip for Dropzone
            document.getElementsByClassName("bookshelf")[0].addEventListener("mouseleave", () => {
                CONFIG.DOM_ELEMENT.DROPZONE.title = CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_dropZone;
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
        const $button = $(
            `<div id="STRe-bookshelf-btn" class="btn-icon hasTitle" title="${CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_goToBookshelf}">${ICONS.BOOKSHELF}</div>`
        );

        $button.on("click", () => {
            // setSvgPathLength($button.get(0));
            resetUI();
        });
        $button.prependTo($("#btnWrapper")).hide();
    },
};

/**
 * Initializes the bookshelf module
 * @public
 */
export function initBookshelf(displayBooks = true) {
    // Enable bookshelf functionality
    if (CONFIG.RUNTIME_CONFIG.ENABLE_BOOKSHELF) {
        bookshelf.init();
        bookshelf.enable();

        if (displayBooks) {
            // Now whether or not to show bookshelf depends on whether there is a book in bookshelf
            bookshelf.refreshBookList();

            // Open the last read book on startup
            bookshelf.reopenBook();
        }
    }
}
