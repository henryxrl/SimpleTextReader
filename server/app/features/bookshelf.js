/**
 * @fileoverview Manages book processing and storage operations, including file compression
 * and database interactions. Handles both raw book files and processed content.
 *
 * @module server/app/features/bookshelf
 * @requires fs/promises
 * @requires path
 * @requires os
 * @requires zlib
 * @requires util
 * @requires server/app/config/config.js
 * @requires server/app/database/db-manager.js
 * @requires server/app/middleware/error.js
 * @requires server/app/file/file-processor.js
 * @requires server/app/websocket/websocket-server.js
 */

import fs from "fs/promises";
import path from "path";
import os from "os";
import { gzip, gunzip } from "zlib";
import { promisify } from "util";
import { config } from "../config/config.js";
import { DBManager } from "../database/db-manager.js";
import { DatabaseError } from "../middleware/error.js";
import { FileProcessor } from "../file/file-processor.js";
import { WebSocketServer } from "../websocket/websocket-server.js";

/**
 * Promisify gzip and gunzip
 * @private
 * @type {Function}
 */
const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

/**
 * Manages book storage, processing, and retrieval operations
 * @extends DBManager
 */
class BookshelfDB extends DBManager {
    /**
     * Object store names for database operations
     * @private
     * @type {Object}
     */
    #objectStoreNames = {
        bookfiles: "Book",
        bookProcessed: "ProcessedBook",
    };

    /**
     * Directory for library books
     * @private
     * @type {string}
     */
    #libraryDir = config.PATH.LIBRARY;

    /**
     * Directory for uploaded book files
     * @private
     * @type {string}
     */
    #uploadDir = config.PATH.UPLOADS;

    /**
     * Directory for processed book content
     * @private
     * @type {string}
     */
    #processedContentDir = config.PATH.PROCESSED_BOOKS;

    /**
     * Initialize directories and database connection
     * @constructor
     */
    constructor() {
        try {
            super();
            this.#initDirs();

            // Monitor all findMany operations
            // this.prisma.$extends({
            //     query: {
            //         async findMany({ model, operation, args, query }) {
            //             const result = await query(args);
            //             console.log(`FindMany query on ${model}:`, {
            //                 args,
            //                 resultCount: result?.length,
            //             });
            //             return result;
            //         },
            //     },
            // });
        } catch (error) {
            throw new DatabaseError("Failed to initialize BookshelfDB", error);
        }
    }

    /**
     * Initialize upload and processed content directories
     * @private
     * @returns {Promise<void>}
     * @throws {Error} If directory creation fails
     */
    async #initDirs() {
        try {
            await fs.mkdir(this.#uploadDir, { recursive: true });
            await fs.mkdir(this.#processedContentDir, { recursive: true });
            console.log(`Upload directory initialized: ${this.#uploadDir}`);
            console.log(`Processed content directory initialized: ${this.#processedContentDir}`);
        } catch (error) {
            throw new DatabaseError("Failed to initialize directories", error);
        }
    }

    /**
     * Get the concurrency limit based on CPU cores
     * @param {number} [low=2] - Minimum concurrency limit
     * @param {number} [high=8] - Maximum concurrency limit
     * @returns {number} Concurrency limit
     */
    #getConcurrencyLimit(low = 2, high = 8) {
        // Use one less than the number of CPU cores, leaving one core to handle other tasks
        // Guarantee a minimum of "low" concurrency, with a maximum of "high"
        return Math.max(low, Math.min(high, os.cpus().length - 1));
    }

    /**
     * Process books in batches with concurrency limit
     * @private
     * @param {string[]} books - Array of book filenames
     * @param {number} concurrencyLimit - Maximum concurrent processes
     * @returns {Promise<Array<Object>>} Processing results for each book
     */
    async #processBooksWithConcurrency(books, concurrencyLimit) {
        const results = [];

        // Create processing queue
        for (let i = 0; i < books.length; i += concurrencyLimit) {
            const batch = books.slice(i, i + concurrencyLimit);
            console.log(`Processing batch of ${batch.length} books...`);

            // Process this batch of books concurrently
            const batchResults = await Promise.all(
                batch.map(async (filename) => {
                    try {
                        console.log(`Processing book: ${filename}...`);

                        // Check if the book already exists and is processed
                        const existingBook = await this.prisma.book.findUnique({
                            where: { name: filename },
                        });

                        if (existingBook?.processed && !force) {
                            console.log(`Book ${filename} already processed, skipping...`);
                            WebSocketServer.broadcast("bookProcessingStatus", {
                                name: filename,
                                status: "already_processed",
                                processed: true,
                            });
                            return {
                                name: filename,
                                status: "already_processed",
                            };
                        }

                        // Send start processing status
                        WebSocketServer.broadcast("bookProcessingStatus", {
                            name: filename,
                            status: "processing",
                            processed: false,
                        });

                        // Process the book, marking it as from the external library
                        const result = await this.putBook(filename, false, true, true);
                        // console.log(`Successfully processed book: ${filename}`, result);

                        // Send processed status
                        WebSocketServer.broadcast("bookProcessingStatus", {
                            name: filename,
                            status: "processed",
                            processed: true,
                            bookId: result.id,
                        });

                        return {
                            name: filename,
                            status: "processed",
                            // ...result,
                            id: result.id,
                        };
                    } catch (error) {
                        // console.error(`Error processing book ${filename}:`, error);

                        // Send processing error status
                        WebSocketServer.broadcast("bookProcessingStatus", {
                            name: filename,
                            status: "error",
                            processed: false,
                            error: error.message,
                        });

                        return {
                            name: filename,
                            status: "error",
                            error: error.message,
                        };
                    }
                })
            );

            results.push(...batchResults);
        }

        return results;
    }

    /**
     * Process multiple books from external library
     * @param {string[]} safeBooks - Array of book filenames to process
     * @param {boolean} [force=false] - Force reprocessing of already processed books
     * @returns {Promise<Array<Object>>} Processing results for each book
     * @throws {Error} If database connection fails
     */
    async processLibraryBooks(safeBooks, force = false) {
        try {
            if (!(await this.init())) {
                throw new DatabaseError("Database connection failed");
            }

            console.log(`Starting to process ${safeBooks.length} books from library...`);
            if (force) {
                await this.removeAllBooks();
            }

            // Get concurrency limit
            const concurrencyLimit = this.#getConcurrencyLimit();
            console.log(`Using concurrency limit of ${concurrencyLimit}`);

            // Process books with concurrency limit
            const results = await this.#processBooksWithConcurrency(safeBooks, concurrencyLimit);

            console.log("Library books processing completed. Results:", results);
            return results;
        } catch (error) {
            throw new DatabaseError("Failed to process library books", error);
        }
    }

    /**
     * Add or update a book in the database
     * @param {string} name - Book filename
     * @param {boolean} [isFromLocal=false] - Whether book is from local source
     * @param {boolean} [isOnServer=true] - Whether book exists on server
     * @param {boolean} [isFromLibrary=false] - Whether book is from external library
     * @returns {Promise<Object>} Updated book metadata
     * @throws {Error} If database operations fail
     */
    async putBook(name, isFromLocal = false, isOnServer = true, isFromLibrary = false) {
        try {
            if (!(await this.init())) {
                throw new DatabaseError("Database connection failed");
            }

            try {
                // 1. Determine the file path
                let filePath;
                if (isFromLibrary) {
                    // If the book is from the external library, use the library directory path
                    filePath = path.resolve(config.PATH.LIBRARY, name);

                    // Verify file existence
                    try {
                        await fs.access(filePath);
                    } catch (error) {
                        throw new Error(`Library file not found: ${filePath}`);
                    }
                } else {
                    // If the book is from the local upload, read the content and save it to the upload directory
                    // const sourceContent = await fs.readFile(path.resolve(config.PATH.LIBRARY, name), null);
                    // filePath = await this.#saveFile(sourceContent, name);
                }

                // 2. Save the original book data
                const book = await this.prisma.book.upsert({
                    where: { name },
                    update: {
                        data: filePath,
                        isFromLocal,
                        isOnServer,
                        processed: false,
                        pageBreakOnTitle: false,
                    },
                    create: {
                        name,
                        data: filePath,
                        isFromLocal,
                        isOnServer,
                        processed: false,
                        pageBreakOnTitle: false,
                    },
                });

                // 3. Get the book content and process it
                const fetchedBook = await this.getBook(name);
                const processResult = await this.#processBookAsync(book, fetchedBook.data);

                // 4. Return the latest database state
                const updatedBook = await this.prisma.book.findUnique({
                    where: { id: book.id },
                });

                // 5. Return the metadata
                return {
                    id: updatedBook.id,
                    name: updatedBook.name,
                    isFromLocal: updatedBook.isFromLocal,
                    isOnServer: updatedBook.isOnServer,
                    processed: updatedBook.processed,
                };
            } catch (error) {
                // console.error("Error putting book:", error);
                throw new DatabaseError(`Failed to put book ${name}`, error);
            }
        } catch (error) {
            throw new DatabaseError(`Failed to put book ${name}`, error);
        }
    }

    /**
     * Process book content asynchronously
     * @private
     * @param {Object} book - Book database record
     * @param {File} file - Book file object
     * @returns {Promise<Object>} Processing results
     * @throws {Error} If processing fails
     */
    async #processBookAsync(book, file) {
        try {
            console.log(`Processing book ${book.name}...`);

            // 1. Process the file content
            const fileProcessor = new FileProcessor(file);
            const processedFile = await fileProcessor.process();
            // console.log("File processing results:", {
            //     name: book.name,
            //     isEasternLan: processedFile.isEasternLan,
            //     pageBreakOnTitle: processedFile.pageBreakOnTitle,
            //     encoding: processedFile.encoding,
            //     isComplete: processedFile.isComplete,
            //     bookMetadata: processedFile.bookMetadata,
            //     size: processedFile.fileSize,
            // });

            // 2. Prepare content data
            const contentData = {
                file_content_chunks: processedFile.processedResult.htmlLines,
                all_titles: processedFile.processedResult.titles,
                all_titles_ind: processedFile.processedResult.titles_ind,
                footnotes: processedFile.processedResult.footnotes,
                page_breaks: processedFile.processedResult.pageBreaks,
            };

            // 3. Save content to file
            const contentDir = path.join(this.#processedContentDir, book.id.toString());
            try {
                const jsonData = JSON.stringify(contentData);
                const compressedData = await gzipAsync(jsonData);

                await fs.mkdir(contentDir, { recursive: true });
                await fs.writeFile(path.join(contentDir, "content.json.gz"), compressedData);
            } catch (error) {
                throw new DatabaseError(`Failed to save processed book content for book ${book.name}`, error);
            }

            // 4. Save processed data
            try {
                const processedBookData = {
                    name: book.name,
                    is_eastern_lan: processedFile.isEasternLan,
                    bookAndAuthor: JSON.stringify(processedFile.bookMetadata),
                    title_page_line_number_offset: processedFile.title_page_line_number_offset,
                    seal_rotate_en: processedFile.seal_rotate_en,
                    seal_left: processedFile.seal_left,
                    footnote_processed_counter: processedFile.processedResult.footnoteCounter,
                    total_pages: processedFile.processedResult.pageBreaks.length,
                    content_path: contentDir,
                };
                // console.log("ProcessedBookData to save:", {
                //     name: processedBookData.name,
                //     is_eastern_lan: processedBookData.is_eastern_lan,
                //     title_page_line_number_offset: processedBookData.title_page_line_number_offset,
                //     total_pages: processedBookData.total_pages,
                // });

                // 5. Update database
                const [updatedBook, processedBook] = await this.prisma.$transaction([
                    this.prisma.book.update({
                        where: { id: book.id },
                        data: {
                            pageBreakOnTitle: processedFile.pageBreakOnTitle,
                            processed: processedFile.isComplete,
                            encoding: processedFile.encoding,
                            isEastern: processedFile.isEasternLan,
                            size: processedFile.fileSize,
                        },
                    }),
                    this.prisma.processedBook.upsert({
                        where: { bookId: book.id },
                        create: {
                            bookId: book.id,
                            ...processedBookData,
                        },
                        update: processedBookData,
                    }),
                ]);
                // console.log("ProcessedBook created/updated:", {
                //     id: processedBook.id,
                //     name: processedBook.name,
                //     is_eastern_lan: processedBook.is_eastern_lan,
                //     bookId: processedBook.bookId,
                // });

                return processedFile;
            } catch (error) {
                console.error("Database operation failed:", {
                    error: error.message,
                    code: error.code,
                    meta: error.meta,
                    stack: error.stack,
                    originalError: error,
                });
                throw new DatabaseError(`Failed to save processed book data for book ${book.name}`, error);
            }
        } catch (error) {
            console.error("Book processing failed:", {
                bookName: book.name,
                error: error.message,
                originalError: error.originalError
                    ? {
                          message: error.originalError.message,
                          code: error.originalError.code,
                          meta: error.originalError.meta,
                          stack: error.originalError.stack,
                      }
                    : undefined,
            });
            // Update book status to processing failed
            await this.prisma.book
                .update({
                    where: { id: book.id },
                    data: { processed: false },
                })
                .catch((err) => {
                    console.error("Failed to update book status:", err);
                    throw new DatabaseError("Failed to update book status", err);
                });
            throw new DatabaseError(`Failed to process book ${book.name}`, error);
        }
    }

    /**
     * Retrieve book file from storage
     * @param {string} name - Book filename
     * @returns {Promise<Object>} Book data with file object
     * @throws {Error} If book not found or file reading fails
     */
    async getBook(name) {
        try {
            const book = await this.prisma.book.findUnique({
                where: { name },
            });

            if (!book) {
                throw new DatabaseError("Book not found");
            }

            try {
                // Get raw file content
                const fileContent = await fs.readFile(book.data, null);

                // Create a new File object
                const file = new File([fileContent], book.name, { type: "text/plain" });

                return {
                    ...book,
                    data: file,
                };
            } catch (error) {
                // console.error(`Error reading book file: ${book.data}`, error);
                throw new DatabaseError(`Failed to get book ${name}`, error);
            }
        } catch (error) {
            throw new DatabaseError(`Failed to get book ${name}`, error);
        }
    }

    /**
     * Get processed book metadata
     * @param {string} name - Book filename
     * @returns {Promise<Object>} Processed book data
     * @throws {Error} If book not found or not processed
     */
    async getProcessedBook(name) {
        try {
            const processedBook = await this.prisma.processedBook.findFirst({
                where: {
                    book: {
                        name: name,
                    },
                },
                include: {
                    book: {
                        select: {
                            id: true,
                            name: true,
                            data: true,
                            isFromLocal: true,
                            isOnServer: true,
                            processed: true,
                            pageBreakOnTitle: true,
                            isEastern: true,
                            encoding: true,
                            size: true,
                            createdAt: true,
                        },
                    },
                },
            });

            if (!processedBook) {
                // throw new DatabaseError("Book not found or not processed yet");
                return null;
            }

            // Combine data from both tables
            return {
                // Book table data
                bookId: processedBook.book.id,
                name: processedBook.book.name,
                file_path: processedBook.book.data,
                isFromLocal: processedBook.book.isFromLocal,
                isOnServer: processedBook.book.isOnServer,
                processed: processedBook.book.processed,
                pageBreakOnTitle: processedBook.book.pageBreakOnTitle,
                isEastern: processedBook.book.isEastern,
                encoding: processedBook.book.encoding,
                size: processedBook.book.size,
                createdAt: processedBook.book.createdAt,

                // ProcessedBook table data
                processedBookId: processedBook.id,
                is_eastern_lan: processedBook.is_eastern_lan,
                bookAndAuthor: processedBook.bookAndAuthor,
                title_page_line_number_offset: processedBook.title_page_line_number_offset,
                seal_rotate_en: processedBook.seal_rotate_en,
                seal_left: processedBook.seal_left,
                footnote_processed_counter: processedBook.footnote_processed_counter,
                total_pages: processedBook.total_pages,
                content_path: processedBook.content_path,
                processedAt: processedBook.processedAt,
            };
        } catch (error) {
            throw new DatabaseError(`Failed to get processed book ${name}`, error);
        }
    }

    /**
     * Get processed book content from filesystem
     * @param {number} processedBookId - ID of the processed book table record
     * @returns {Promise<Object>} Decompressed book content
     * @throws {Error} If reading or decompression fails
     */
    async getProcessedBookContent(processedBookId) {
        try {
            // 1. Get the processed book record
            const processedBook = await this.prisma.processedBook.findUnique({
                where: { id: processedBookId },
                include: { book: true },
            });

            if (!processedBook) {
                throw new DatabaseError(`ProcessedBook ${processedBookId} not found`);
            }

            // 2. Use book.id instead of processedBook.id to build the file path
            const contentPath = path.join(
                this.#processedContentDir,
                processedBook.book.id.toString(),
                "content.json.gz"
            );
            const compressedContent = await fs.readFile(contentPath);
            const decompressedContent = await gunzipAsync(compressedContent);
            return JSON.parse(decompressedContent.toString());
        } catch (error) {
            throw new DatabaseError(`Failed to get processed book content for book ${bookId}`, error);
        }
    }

    /**
     * Get all processed books
     * @returns {Promise<Array<Object>>} Array of processed book records
     */
    async getProcessedBooks() {
        try {
            const books = await this.prisma.processedBook.findMany({
                select: {
                    name: true,
                },
            });
            console.log("Successfully fetched books:", books);
            return books;
        } catch (error) {
            // console.error("Error fetching processed books:", {
            //     message: error.message,
            //     code: error.code,
            //     meta: error.meta,
            // });
            throw new DatabaseError("Failed to fetch processed books", error);
        }
    }

    /**
     * Remove a book and its processed content
     * @param {string} name - Book filename
     * @returns {Promise<void>}
     */
    async removeBook(name) {
        try {
            const book = await this.prisma.book.findUnique({
                where: { name },
                include: {
                    processedBook: true,
                },
            });

            if (book) {
                // 1. Remove processed content files
                if (book.processedBook) {
                    try {
                        const contentDir = path.join(this.#processedContentDir, book.id.toString());
                        await fs.rm(contentDir, { recursive: true, force: true });
                    } catch (error) {
                        // console.error("Error deleting processed content:", error);
                        throw new DatabaseError("Failed to delete processed content", error);
                    }
                }

                // 2. Remove database records
                await this.prisma.$transaction([
                    this.prisma.processedBook.deleteMany({
                        where: { bookId: book.id },
                    }),
                    this.prisma.book.delete({
                        where: { name },
                    }),
                ]);
            }
        } catch (error) {
            throw new DatabaseError(`Failed to remove book ${name}`, error);
        }
    }

    /**
     * Check if book exists
     * @param {string} name - Book filename
     * @returns {Promise<boolean>} Whether book exists
     */
    async isBookExist(name) {
        try {
            return await this.exists(this.#objectStoreNames.bookfiles, name);
        } catch (error) {
            throw new DatabaseError(`Failed to check if book ${name} exists`, error);
        }
    }

    /**
     * Get all books with their processed data
     * @returns {Promise<Array<Object>>} Array of book records with processed data
     */
    async getAllBooks() {
        try {
            return await this.prisma.book.findMany({
                select: {
                    id: true,
                    name: true,
                    data: true,
                    isFromLocal: true,
                    isOnServer: true,
                    processed: true,
                    pageBreakOnTitle: true,
                    isEastern: true,
                    encoding: true,
                    size: true,
                    createdAt: true,
                    processedBook: {
                        select: {
                            id: true,
                            name: true,
                            is_eastern_lan: true,
                            bookAndAuthor: true,
                            title_page_line_number_offset: true,
                            file_content_chunks: true,
                            all_titles: true,
                            all_titles_ind: true,
                            footnotes: true,
                            footnote_processed_counter: true,
                            page_breaks: true,
                            total_pages: true,
                            processedAt: true,
                        },
                    },
                },
            });
        } catch (error) {
            throw new DatabaseError("Failed to fetch all books", error);
        }
    }

    /**
     * Remove all books and their processed content
     * @returns {Promise<void>}
     */
    async removeAllBooks() {
        try {
            // 1. Clean all processed content files
            try {
                await fs.rm(this.#processedContentDir, { recursive: true, force: true });
                await fs.mkdir(this.#processedContentDir, { recursive: true });
            } catch (error) {
                // console.error("Error cleaning processed content directory:", error);
                throw new DatabaseError("Failed to clean processed content directory", error);
            }

            // 2. Delete database records
            await this.prisma.$transaction([this.prisma.processedBook.deleteMany({}), this.prisma.book.deleteMany({})]);
        } catch (error) {
            throw new DatabaseError("Failed to remove all books", error);
        }
    }
}

/**
 * Singleton instance for bookshelf operations
 * @type {Object}
 */
export const bookshelf = {
    /**
     * Variables
     * @private
     * @type {BookshelfDB}
     * @type {boolean}
     * @type {Set<string>}
     */
    db: null,
    enabled: false,
    processingQueue: new Set(),

    /**
     * Enable bookshelf module
     * @returns {Promise<Object>} This instance
     */
    async enable() {
        try {
            if (!this.enabled) {
                this.db = new BookshelfDB();
                this.enabled = true;
                console.log("Module <Bookshelf> enabled.");
            }
            return this;
        } catch (error) {
            throw new DatabaseError("Failed to enable bookshelf module", error);
        }
    },

    /**
     * Disable bookshelf module
     * @returns {Promise<Object>} This instance
     */
    async disable() {
        try {
            if (this.enabled) {
                await this.db.disconnect();
                this.db = null;
                this.enabled = false;
                console.log("Module <Bookshelf> disabled.");
            }
            return this;
        } catch (error) {
            throw new DatabaseError("Failed to disable bookshelf module", error);
        }
    },

    /**
     * Process books from library
     * @param {Array<string>} books - Array of book filenames
     * @param {boolean} [force=false] - Force reprocessing
     * @returns {Promise<Array<Object>>} Processing results
     */
    async processLibrary(books, force = false) {
        try {
            if (!this.enabled || !this.db) {
                await this.enable();
            }
            return await this.db.processLibraryBooks(books, force);
        } catch (error) {
            throw new DatabaseError("Failed to process books from library", error);
        }
    },

    /**
     * Get processed book metadata
     * @param {string} name - Book filename
     * @returns {Promise<Object>} Processed book metadata
     */
    async getProcessedBook(name) {
        try {
            if (!this.enabled || !this.db) {
                await this.enable();
            }
            const processedBook = await this.db.getProcessedBook(name);
            if (!processedBook) {
                return null;
            }

            return processedBook;
        } catch (error) {
            throw new DatabaseError("Failed to get processed book", error);
        }
    },

    /**
     * Get processed book content
     * @param {number} id - Book ID
     * @returns {Promise<Object>} Processed book content
     */
    async getProcessedBookContent(id) {
        try {
            if (!this.enabled || !this.db) {
                await this.enable();
            }
            return await this.db.getProcessedBookContent(id);
        } catch (error) {
            throw new DatabaseError("Failed to get processed book content", error);
        }
    },

    /**
     * Get all processed books
     * @returns {Promise<Array<Object>>} Array of processed books
     */
    async getProcessedBooks() {
        try {
            if (!this.enabled || !this.db) {
                await this.enable();
            }
            return await this.db.getProcessedBooks();
        } catch (error) {
            throw new DatabaseError("Failed to get processed books", error);
        }
    },
};
