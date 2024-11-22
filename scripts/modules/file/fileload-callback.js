/**
 * @fileoverview File load callback module
 *
 * Provides a callback system for file loading operations, allowing registration of:
 * - Before callbacks: executed before file processing
 * - After callbacks: executed after file processing
 *
 * Credit: cataerogong
 *
 * @module modules/file/fileload-callback
 */

/**
 * File load callback handler
 * Manages callbacks for file loading operations.
 *
 * Example usage:
 * ```javascript
 * // Change some file's name
 * function renameSomeFile(f) {
 *     if (f.name=="A.txt") {
 *         return new File([f], "B.txt", {type: f.type, lastModified: f.lastModified});
 *     }
 *     return f;
 * }
 *
 * // Support zip-file
 * function unzipFile(f) {
 *     if (f.name.endsWith(".zip")) {
 *         newF = unzip(f)[0]; // unzip and return the first file
 *         return newF;
 *     }
 *     return f;
 * }
 *
 * // Save file to db
 * async function saveFileToDB(f) {
 *     if (f.type == "text/plain")
 *         await db.saveFile(f);
 *     return f;
 * }
 *
 * // Load progress from webdav
 * async function loadProgress() {
 *     let line = await webdav.getProgress(CONFIG.VARS.FILENAME);
 *     setHistory(CONFIG.VARS.FILENAME, line);
 *     getHistory(CONFIG.VARS.FILENAME);
 * }
 *
 * FileLoadCallback.regBefore(renameSomeFile);
 * FileLoadCallback.regBefore(unzipFile);
 * FileLoadCallback.regBefore(saveFileToDB);
 * FileLoadCallback.regAfter(loadProgress);
 * ```
 * @type {Object}
 */
export const FileLoadCallback = {
    /** @type {Array<Function>} List of callbacks to execute before file processing */
    beforeList: [],

    /** @type {Array<Function>} List of callbacks to execute after file processing */
    afterList: [],

    /**
     * Register a callback to be executed before file processing
     * @param {Function} callback - Function to be executed before file processing
     */
    regBefore(callback) {
        if (typeof callback == "function" && !this.beforeList.includes(callback)) this.beforeList.push(callback);
    },

    /**
     * Unregister a before callback
     * @param {Function} callback - Function to be removed from before callbacks
     */
    unregBefore(callback) {
        let i = this.beforeList.indexOf(callback);
        if (i >= 0) this.beforeList.splice(i, 1);
    },

    /**
     * Register a callback to be executed after file processing
     * @param {Function} callback - Function to be executed after file processing
     */
    regAfter(callback) {
        if (typeof callback == "function" && !this.afterList.includes(callback)) this.afterList.push(callback);
    },

    /**
     * Unregister an after callback
     * @param {Function} callback - Function to be removed from after callbacks
     */
    unregAfter(callback) {
        let i = this.afterList.indexOf(callback);
        if (i >= 0) this.afterList.splice(i, 1);
    },

    /**
     * Execute all registered before callbacks
     * @param {File} f - File object to be processed
     * @returns {Promise<File>} Processed file object
     */
    async before(f) {
        let newF = f;
        try {
            for (let func of this.beforeList) {
                newF = (await func(newF)) || newF;
            }
        } catch (e) {
            console.log("FileLoadCallback.before() error:", e);
        }
        // console.log("FileLoadCallback.before() finished:", newF);
        return newF;
    },

    /**
     * Execute all registered after callbacks
     * @returns {Promise<void>}
     */
    async after() {
        try {
            for (func of this.afterList) {
                await func();
            }
        } catch (e) {
            console.log("FileLoadCallback.after() error:", e);
        }
        // console.log("FileLoadCallback.after() finished.");
    },
};
