const fs = require("fs").promises; // Use promises for non-blocking file I/O
const path = require("path");
const config = require("../config/config");

/**
 * Get all books from the configured directory if the cloud library exists.
 * @returns {Promise<string[]>} List of .txt file paths
 */
async function getAllBooks() {
    try {
        console.log("Checking cloud library...");
        if (await cloudLibraryExists(config.DIR_BOOKS)) {
            console.log("Cloud library exists. Loading books...");
            const books = await findTextFiles(config.DIR_BOOKS);
            console.log("Cloud library loaded.");
            return books;
        }
        console.log("No cloud library exists on the server.");
        return [];
    } catch (error) {
        console.error("Error loading books:", error.message);
        return [];
    }
}

/**
 * Check if the cloud library directory exists.
 * @param {string} dirPath - Path to the directory
 * @returns {Promise<boolean>} True if the directory exists, otherwise false
 */
async function cloudLibraryExists(dirPath) {
    try {
        const stats = await fs.stat(dirPath);
        return stats.isDirectory();
    } catch (error) {
        if (error.code === "ENOENT") {
            return false; // Directory does not exist
        }
        throw error; // Re-throw unexpected errors
    }
}

/**
 * Recursively find all .txt files in a directory.
 * @param {string} folderPath - Path to the root folder
 * @returns {Promise<string[]>} List of .txt file paths
 */
async function findTextFiles(folderPath) {
    const result = [];
    async function traverseFolder(folder) {
        const entries = await fs.readdir(folder, { withFileTypes: true });
        for (const entry of entries) {
            const entryPath = path.join(folder, entry.name);
            if (entry.isDirectory()) {
                await traverseFolder(entryPath); // Recursively process subdirectories
            } else if (entry.isFile() && path.extname(entry.name) === ".txt") {
                result.push(entryPath); // Collect .txt files
            }
        }
    }
    await traverseFolder(folderPath);
    return result;
}

module.exports = {
    getAllBooks,
};
