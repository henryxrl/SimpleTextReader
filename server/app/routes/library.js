/**
 * @fileoverview Library API routes and middleware
 *
 * This module handles all library-related API endpoints, including:
 * - Library list retrieval
 * - Book content fetching
 * - Access token management
 * - Session validation
 *
 * @module server/app/routes/library
 * @requires express
 * @requires path
 * @requires mime-types
 * @requires fs
 * @requires pipeline
 * @requires server/app/config/config
 * @requires server/app/middleware/error
 * @requires server/app/services/library-service
 * @requires server/app/services/token-service
 * @requires server/app/middleware/auth
 * @requires server/app/middleware/security
 * @requires shared/core/text/text-processor-core
 * @requires server/app/features/bookshelf
 */

import express from "express";
import path from "path";
import mime from "mime-types";
import { promises as fs, default as legacyFs } from "fs";
import { pipeline } from "stream/promises";
import { config } from "../config/config.js";
import { APIError, sendImmediateError, DatabaseError } from "../middleware/error.js";
import { libraryService } from "../services/library-service.js";
import { tokenService } from "../services/token-service.js";
import { validateSession } from "../middleware/auth.js";
import { sanitizeFilePath } from "../middleware/security.js";
import { TextProcessorCore } from "../../../shared/core/text/text-processor-core.js";
import { bookshelf } from "../features/bookshelf.js";

/**
 * Router for library
 */
export const libraryRouter = express.Router();

/**
 * GET /library
 * Retrieves list of available books
 *
 * @route {GET} /library
 * @authentication Required
 * @returns {Promise<string[]>} List of book filenames
 * @throws {Error} If book retrieval fails
 */
libraryRouter.get("/", validateSession, async (req, res) => {
    try {
        const books = await libraryService.getAllBooks();
        if (!Array.isArray(books)) {
            throw new APIError("Failed to fetch books", 500);
        }

        // Filter out unsafe and oversized files
        const validBooks = [];
        for (const filename of books) {
            // Check file name security
            const safeFilename = sanitizeFilePath(filename);
            if (!safeFilename) {
                console.log("[Security] Skipping unsafe filename:", filename);
                continue;
            }

            try {
                // Check file size
                const filePath = path.resolve(config.PATH.LIBRARY, safeFilename);
                const fileSize = (await fs.stat(filePath)).size;

                if (fileSize > config.FILE.MAX_FILE_SIZE) {
                    console.log(`[Size] Skipping oversized file ${filename}: ${fileSize} bytes`);
                    continue;
                }

                validBooks.push(safeFilename);
            } catch (error) {
                console.error(`Error checking file ${filename}:`, error);
                continue;
            }
        }

        res.status(200).json(validBooks);

        setTimeout(() => {
            bookshelf.processLibrary(validBooks, true).catch((error) => {
                console.error("Error processing library:", error);
            });
            // const processedBooks = await bookshelf.getProcessedBooks();
            // console.log("Input books:", validBooks);
            // console.log("Processed books:", processedBooks);
        }, 1000);
    } catch (error) {
        console.error("Error fetching books:", error);
        res.status(500).json({ error: "Failed to fetch books. Please try again later." });
    }
});

/**
 * POST /library/request-book
 * Generates access token for book download
 *
 * @route {POST} /library/request-book
 * @authentication Required
 * @param {Object} req.body
 * @param {string} req.body.filename - Name of requested book
 * @returns {Object} Access token
 * @throws {Error} If token generation fails
 */
libraryRouter.post(config.API.TOKEN.BOOK_REQUEST, validateSession, async (req, res) => {
    try {
        const { filename } = req.body;
        if (!filename) {
            throw new APIError("Filename is required", 400);
        }
        console.log("Requesting book token for:", filename);

        // Validate and sanitize file path
        const safeFilename = sanitizeFilePath(filename);
        if (!safeFilename) {
            console.log("[Security] Rejected unsafe filename:", filename);
            throw new APIError("Invalid filename", 400, { filename });
        }

        // Validate file path
        const filePath = path.resolve(config.PATH.LIBRARY, safeFilename);
        if (!filePath.startsWith(path.resolve(config.PATH.LIBRARY))) {
            throw new APIError("Invalid file path", 400);
        }
        // console.log("Full file path:", filePath);

        // Validate file exists
        const fileExists = await fs
            .access(filePath)
            .then(() => true)
            .catch(() => false);

        if (!fileExists) {
            console.log("File not found at path:", filePath);
            throw new APIError("File not found", 404, { path: safeFilename });
        }

        // Generate token
        const { token, expiresIn } = tokenService.generateToken({
            resource: safeFilename,
            type: "book",
            sessionId: req.session.id,
        });

        res.json({ token, expiresIn: expiresIn });
    } catch (error) {
        console.error("Detailed error in request-book:", error);
        res.status(500).json({
            error: "Failed to generate access token",
            details: error.message,
        });
        next(error);
    }
});

/**
 * POST /library/fetch-book
 * Fetches book content using access token
 *
 * @route {POST} /library/fetch-book
 * @authentication Required
 * @param {Object} req.body
 * @param {string} req.body.token - Access token
 * @param {boolean} [req.body.loadContent=true] - Whether to load full content
 * @returns {Stream|Object} Book content stream or metadata
 * @throws {Error} If book fetch fails
 */
libraryRouter.post(config.API.TOKEN.BOOK_FETCH, validateSession, async (req, res) => {
    let fileStream = null;
    let token = null;

    try {
        const { token: requestToken, loadContent = true } = req.body;
        token = requestToken;

        if (!token) {
            throw new APIError("Token is required", 400);
        }

        // Validate token
        const tokenData = tokenService.validateToken(token, req.session.id, "book");
        if (!tokenData) {
            throw new APIError("Invalid or expired token", 403);
        }

        // Check if resource exists in token data
        if (!tokenData.resource) {
            console.log("[Security] Token missing resource:", tokenData);
            throw new APIError("Invalid token data", 400);
        }

        // Validate file name again
        const safeFilename = sanitizeFilePath(tokenData.resource);
        if (!safeFilename) {
            console.log("[Security] Token contained unsafe filename:", tokenData.filename);
            throw new APIError("Invalid filename in token", 400);
        }

        // Check if the book is processed
        console.log("Attempting to get processed book:", safeFilename);
        const processedBook = await bookshelf.getProcessedBook(safeFilename);
        // console.log("ProcessedBook full result:", JSON.stringify(processedBook, null, 2));

        // If the book is processed and we need to fetch the full content
        if (processedBook?.processed) {
            console.log(`Book ${safeFilename} is processed, sending JSON response`);

            // Set response headers
            res.set({
                "Content-Type": "application/json",
                "Content-Disposition": `inline; filename="${encodeURIComponent(safeFilename)}.json"`,
                "Cache-Control": "no-cache",
            });

            // Send metadata
            const responseData = {
                name: processedBook.name,
                type: "application/json",
                metadata: {
                    // Book table data
                    path: processedBook.file_path,
                    isFromLocal: processedBook.isFromLocal,
                    isOnServer: processedBook.isOnServer,
                    processed: processedBook.processed,
                    pageBreakOnTitle: processedBook.pageBreakOnTitle,
                    isEastern: processedBook.isEastern,
                    encoding: processedBook.encoding,
                    size: processedBook.size,
                    createdAt: processedBook.createdAt,

                    // ProcessedBook table data
                    is_eastern_lan: processedBook.is_eastern_lan,
                    bookAndAuthor: JSON.parse(processedBook.bookAndAuthor),
                    titlePageLineNumberOffset: processedBook.title_page_line_number_offset,
                    sealRotateEn: processedBook.seal_rotate_en,
                    sealLeft: processedBook.seal_left,
                    footnoteProcessedCounter: processedBook.footnote_processed_counter,
                    totalPages: processedBook.total_pages,
                    processedAt: processedBook.processedAt,
                },
            };

            // If we need content, get processed content
            if (loadContent) {
                try {
                    console.log("Loading processed content for book:", processedBook.processedBookId);
                    const content = await bookshelf.getProcessedBookContent(processedBook.processedBookId);
                    console.log("Content loaded successfully");
                    responseData.content = {
                        fileContentChunks: content.file_content_chunks,
                        allTitles: content.all_titles,
                        allTitlesInd: content.all_titles_ind,
                        footnotes: content.footnotes,
                        pageBreaks: content.page_breaks,
                    };
                } catch (error) {
                    console.error("Error in processed book handling:", error);

                    // Check if the error is due to the processed content file not being found
                    if (error.originalError?.code === "ENOENT") {
                        console.log("Processed content file not found, falling back to raw file");
                        await sendRawFile(res, safeFilename, loadContent, token, processedBook?.processed || false);
                        return;
                    }

                    sendImmediateError(
                        new APIError("Error loading processed content", 500, {
                            originalError: error.message,
                            code: error.code,
                        }),
                        res
                    );
                    return;
                }
            }

            res.json(responseData);
            tokenService.deleteToken(token);
            return;
        }

        // If the book is not processed, send the raw file
        await sendRawFile(res, safeFilename, loadContent, token, processedBook?.processed || false);
    } catch (error) {
        if (fileStream) {
            fileStream.destroy();
        }
        if (token) {
            tokenService.deleteToken(token);
        }
        // next(error);

        console.error("Error in fetch-book route:", error);
        if (error instanceof DatabaseError) {
            console.log("Database error details:", error.details);
        }

        // Ensure an error response is sent immediately
        sendImmediateError(error, res);
    }
});

/**
 * Sends a raw file to the client
 * @param {Object} res - Express response object
 * @param {string} safeFilename - Sanitized file name
 * @param {boolean} loadContent - Whether to load full content
 * @param {string} token - Access token
 * @param {boolean} [processed=false] - Whether the book is processed
 * @throws {APIError} If file sending fails
 * @returns {Promise<void>}
 */
async function sendRawFile(res, safeFilename, loadContent, token, processed = false) {
    let isEastern = null;
    let encoding = null;
    let fileStream = null;

    try {
        console.log(`Book ${safeFilename} not processed, sending raw file`);

        // If the book is not processed or we need to fetch the full content
        // Detect file path and MIME type
        const filePath = path.resolve(config.PATH.LIBRARY, safeFilename);
        const fileSize = (await fs.stat(filePath)).size;
        const mimeType = mime.lookup(filePath) || "application/octet-stream";

        // Always check the first chunk for language and encoding
        if (mimeType.includes("text")) {
            const testStream = legacyFs.createReadStream(filePath, {
                highWaterMark: 64 * 1024,
                start: 0,
                end: 64 * 1024 - 1,
            });

            try {
                const chunk = await new Promise((resolve, reject) => {
                    testStream.once("data", resolve);
                    testStream.once("error", reject);
                });

                // Detect language and encoding
                ({ isEastern, encoding } = await TextProcessorCore.getLanguageAndEncodingFromBookBuffer(chunk));
            } catch (error) {
                // Send error immediately
                sendImmediateError(
                    new APIError("File validation failed", 500, {
                        originalError: error.message,
                        code: error.code,
                    }),
                    res
                );
            } finally {
                testStream.destroy();
            }
        }

        // If only metadata is needed
        if (!loadContent) {
            const metadata = {
                name: safeFilename,
                type: mimeType,
                path: null,
                size: fileSize,
                isEastern,
                encoding,
                processed,
            };
            // console.log("Metadata:", metadata);

            res.json(metadata);
            tokenService.deleteToken(token);
            console.log(`Successfully validated and sent metadata for file: ${safeFilename}`);
            return;
        }

        // If content is needed, set response headers
        res.set({
            "Content-Type": mimeType,
            "Content-Disposition": `inline; filename="${encodeURIComponent(safeFilename)}"`,
            "X-Is-Eastern": isEastern,
            "X-Encoding": encoding,
        });

        // Create file stream and send
        fileStream = legacyFs.createReadStream(filePath, {
            highWaterMark: 64 * 1024,
        });
        fileStream.on("error", (error) => {
            console.error("Error streaming file:", error);
            fileStream.destroy();

            // Send error immediately
            sendImmediateError(
                new APIError("Error streaming file", 500, {
                    originalError: error.message,
                    code: error.code,
                }),
                res
            );
        });

        // Handle client disconnect
        res.on("close", () => {
            if (fileStream) {
                fileStream.destroy();
            }
            tokenService.deleteToken(token);
        });

        // Send file
        const stats = await fs.stat(filePath);
        const minSpeedMBps = 10; // Assume: 10MB/s (from backend to frontend, should be a lot faster)
        const timeout = 2000 + Math.ceil(stats.size / (minSpeedMBps * 1024 * 1024)) * 1000;
        await Promise.race([
            pipeline(fileStream, res),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`Stream timeout after ${timeout / 1000}s`)), timeout)
            ),
        ]);

        // Cleanup token after sending
        tokenService.deleteToken(token);
        console.log(`Successfully sent file: ${safeFilename}`);
    } catch (error) {
        if (fileStream) {
            fileStream.destroy();
        }
        if (token) {
            tokenService.deleteToken(token);
        }
        throw error;
    }
}
