/**
 * @fileoverview Library Service Module
 *
 * This module provides services for managing and accessing books in the cloud library.
 * It handles:
 * - Library existence checks
 * - Book listing
 * - Directory traversal
 * - File system operations
 *
 * @module server/app/services/library-service
 * @requires fs
 * @requires path
 * @requires server/app/config/config
 */

import { promises as fs } from "fs";
import path from "path";
import { config } from "../config/config.js";

/**
 * Service class for managing library operations
 * @class LibraryService
 */
class LibraryService {
    /**
     * Creates a new LibraryService instance
     * @constructor
     * @param {string} [libraryDirectory] - Optional custom library directory path
     */
    constructor() {
        this.libraryDirectory = path.resolve(config.PATH.LIBRARY);
    }

    /**
     * Checks if the cloud library exists and is accessible
     * @async
     * @returns {Promise<boolean>} True if library exists and is valid
     */
    async exists() {
        return this.#cloudLibraryExists();
    }

    /**
     * Validates the cloud library directory
     * Checks if:
     * - Directory exists
     * - Is actually a directory
     * - Is readable
     * - Contains at least one .txt file
     *
     * @async
     * @private
     * @param {string} [dirPath=this.libraryDirectory] - Directory to check
     * @returns {Promise<boolean>} True if directory is valid
     */
    async #cloudLibraryExists(dirPath = this.libraryDirectory) {
        try {
            // 0. Ensure using absolute path
            const absolutePath = path.resolve(dirPath);

            // Validate path is within allowed directory
            if (!absolutePath.startsWith(this.libraryDirectory)) {
                console.log("[Security] Directory traversal attempt detected");
                return false;
            }

            // 1. Check if directory exists and is actually a directory
            const stats = await fs.stat(absolutePath);
            if (!stats.isDirectory()) {
                console.log("Cloud library is not a validdirectory");
                return false;
            }

            // 2. Check if directory is readable
            await fs.access(absolutePath, fs.constants.R_OK);

            // 3. Check if directory contains at least one .txt file
            const files = await fs.readdir(absolutePath);
            const hasTxtFiles = files.some((file) => file.endsWith(".txt"));

            if (!hasTxtFiles) {
                console.log("Cloud library exists but contains no text files");
                return false;
            }

            return true;
        } catch (error) {
            if (error.code === "ENOENT") {
                console.log("Cloud library does not exist");
                return false;
            }
            if (error.code === "EACCES") {
                console.log("Cloud library is not accessible");
                return false;
            }
            console.error("Unexpected error checking cloud library:", error);
            return false;
        }
    }

    /**
     * Retrieves all books from the cloud library
     * @async
     * @returns {Promise<string[]>} Array of book filenames
     * @throws {Error} If library access fails
     */
    async getAllBooks() {
        try {
            console.log("Checking cloud library...");
            if (await this.#cloudLibraryExists()) {
                console.log("Cloud library exists. Loading books...");
                const books = await this.#findTextFiles();
                // console.log("Found books:", books);

                // Return only the filename without the full path
                const bookNames = books.map((bookPath) => path.basename(bookPath));
                // console.log("Returning book names:", bookNames);

                return bookNames;
            }
            console.log("No cloud library exists on the server.");
            return [];
        } catch (error) {
            console.error("Error loading books:", error.message);
            return [];
        }
    }

    /**
     * Recursively finds all .txt files in the library directory
     * @async
     * @private
     * @param {string} [folderPath=this.libraryDirectory] - Starting directory path
     * @returns {Promise<string[]>} Array of full file paths
     * @throws {Error} If directory traversal fails
     */
    async #findTextFiles(folderPath = this.libraryDirectory) {
        const result = [];
        const libraryDirectory = this.libraryDirectory;

        /**
         * Recursive directory traversal function
         * @async
         * @param {string} folder - Current folder to traverse
         */
        const traverseFolder = async (folder) => {
            const absolutePath = path.resolve(folder);
            if (!absolutePath.startsWith(libraryDirectory)) {
                console.log("[Security] Directory traversal attempt in traverseFolder");
                return;
            }

            const entries = await fs.readdir(absolutePath, { withFileTypes: true });
            for (const entry of entries) {
                const entryPath = path.resolve(folder, entry.name);
                if (!entryPath.startsWith(libraryDirectory)) {
                    console.log("[Security] Skipping suspicious path:", entry.name);
                    continue;
                }

                if (entry.isDirectory()) {
                    await traverseFolder(entryPath);
                } else if (entry.isFile() && path.extname(entry.name) === ".txt") {
                    result.push(entryPath);
                }
            }
        };

        await traverseFolder(folderPath);
        return result;
    }
}

/**
 * Singleton instance of LibraryService
 * @type {LibraryService}
 */
export const libraryService = new LibraryService();
