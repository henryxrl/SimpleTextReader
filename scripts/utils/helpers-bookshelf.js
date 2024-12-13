/**
 * @fileoverview Book-related helper functions for managing book metadata in localStorage
 *
 * This module provides utility functions for:
 * - Managing book reading timestamps
 * - Tracking book storage location (server/local)
 * - Managing book source information
 *
 * @module utils/helpers-bookshelf
 */

/**
 * Saves the current timestamp as the last read time for a book
 * @param {string} filename - The name of the book file
 */
export function setBookLastReadTimestamp(filename) {
    // Save current timestamp in UTC to localStorage
    let now = new Date();
    localStorage.setItem(
        `${filename}_lastopened`,
        Date.UTC(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            now.getHours(),
            now.getMinutes(),
            now.getSeconds(),
            now.getMilliseconds()
        )
    );
}

/**
 * Retrieves the last read timestamp for a book
 * @param {string} filename - The name of the book file
 * @returns {string} UTC timestamp string or empty string if not found
 */
export function getBookLastReadTimestamp(filename) {
    if (localStorage.getItem(`${filename}_lastopened`)) {
        return localStorage.getItem(`${filename}_lastopened`);
    }
    return "";
}

/**
 * Sets whether a book is stored on the server
 * @param {string} filename - The name of the book file
 * @param {boolean} isOnserver - Whether the book is on server
 */
export function setIsOnServer(filename, isOnserver) {
    let final_isOnServer = isOnserver || false;
    localStorage.setItem(`${filename}_isOnServer`, final_isOnServer);
}

/**
 * Checks if a book is stored on the server
 * @param {string} filename - The name of the book file
 * @returns {boolean} True if book is on server, false otherwise
 */
export function getIsOnServer(filename) {
    if (localStorage.getItem(`${filename}_isOnServer`)) {
        return localStorage.getItem(`${filename}_isOnServer`).toLowerCase() === "true";
    }
    return false;
}

/**
 * Sets whether a book is from local storage
 * @param {string} filename - The name of the book file
 * @param {boolean} isFromLocal - Whether the book is from local storage
 */
export function setIsFromLocal(filename, isFromLocal) {
    let final_isFromLocal = isFromLocal && true;
    localStorage.setItem(`${filename}_isFromLocal`, final_isFromLocal);
}

/**
 * Checks if a book is from local storage
 * @param {string} filename - The name of the book file
 * @returns {boolean} True if book is from local storage, false otherwise
 */
export function getIsFromLocal(filename) {
    if (localStorage.getItem(`${filename}_isFromLocal`)) {
        return localStorage.getItem(`${filename}_isFromLocal`).toLowerCase() === "true";
    }
    return false;
}
