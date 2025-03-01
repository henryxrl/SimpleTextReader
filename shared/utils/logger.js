/**
 * @fileoverview Logger module for enhanced debug logging
 *
 * @module shared/utils/logger
 */

/**
 * Gets the caller information (file and line number)
 * @private
 * @returns {Object} Caller information
 */
function getCallerInfo() {
    const error = new Error();
    const stack = error.stack?.split("\n");

    // Different browsers have different stack trace formats
    // Chrome: "    at Logger.log (http://localhost:8866/shared/utils/logger.js:123:45)"
    // Firefox: "Logger.log@http://localhost:8866/shared/utils/logger.js:123:45"

    // Find the relevant caller line by skipping internal calls
    let callerLine = "";
    for (let i = 0; i < (stack?.length || 0); i++) {
        const line = stack[i];
        // Skip first line (Error message) and logger.js lines
        if (i > 0 && !line.includes("logger.js")) {
            callerLine = line;
            break;
        }
    }

    // console.log("callerLine", callerLine);

    let match;
    if (callerLine.includes(" at ")) {
        // Chrome format: "    at FunctionName (file:line:column)"
        // or: "    at file:line:column"
        const hasParens = callerLine.includes("(");
        if (hasParens) {
            match = callerLine.match(/\s+at\s+.+\((.*?):(\d+):(\d+)\)/);
        } else {
            match = callerLine.match(/\s+at\s+(.*?):(\d+):(\d+)/);
        }
    } else {
        // Firefox format
        match = callerLine.match(/[@](.+):(\d+):(\d+)$/);
    }

    if (match) {
        const [, file, line, column] = match;
        // Extract just the filename from the full path
        const filename = file.split("/").pop();
        return {
            file: filename,
            line: parseInt(line) || 0,
            column: parseInt(column) || 0,
        };
    }

    return { file: "unknown", line: 0, column: 0 };
}

/**
 * @class Logger
 * @description Utility class for enhanced debug logging
 */
export class Logger {
    /**
     * @type {Map<string, Logger>} Map of logger instances
     * @private
     */
    static #instances = new Map();

    /**
     * Get or create a logger instance
     * @param {string|Function|Object} source - Source class, function, object or name
     * @param {boolean} [debug=false] - Whether to enable debug mode
     * @returns {Logger} Logger instance
     */
    static getLogger(source = null, debug = false) {
        // Get prefix from source
        let prefix;
        if (typeof source === "function") {
            // If source is a constructor function
            prefix = source.name;
        } else if (source && typeof source === "object") {
            // If source is an object instance
            prefix = source.constructor.name;
        } else if (source) {
            // If source is a string
            prefix = source;
        } else {
            // Get caller's name if no source provided
            try {
                throw new Error();
            } catch (e) {
                const callerLine = e.stack.split("\n")[2];
                const callerName = callerLine.match(/at (\S+)/)[1];
                prefix = callerName;
            }
        }

        if (!this.#instances.has(prefix)) {
            this.#instances.set(prefix, new Logger(prefix, debug));
        }
        return this.#instances.get(prefix);
    }

    /**
     * @private
     * @type {string} Log prefix
     * @type {boolean} Whether to enable debug mode
     */
    #prefix;
    #debug;

    /**
     * @constructor
     * @param {string} prefix - Log prefix (usually the class name)
     * @param {boolean} [debug=false] - Whether to enable debug mode
     */
    constructor(prefix, debug = false) {
        this.#prefix = prefix;
        this.#debug = debug;
    }

    /**
     * Enable debug mode
     */
    enableDebug() {
        this.#debug = true;
    }

    /**
     * Disable debug mode
     */
    disableDebug() {
        this.#debug = false;
    }

    /**
     * Get caller prefix with line number
     * @private
     * @returns {string} Formatted prefix
     */
    #getCallerPrefix() {
        const stack = new Error().stack;
        const stackLines = stack.split("\n");

        let callerLine;
        for (let i = 0; i < stackLines.length; i++) {
            const line = stackLines[i];
            if (!line.includes("logger.js")) {
                callerLine = stackLines[i];
                break;
            }
        }

        const match = callerLine?.match(/:(\d+):\d+\)?$/);
        const lineNumber = match ? match[1] : "unknown";
        return `[${this.#prefix}: ${lineNumber}]`;
    }

    /**
     * Log debug information with line numbers and context
     * @param {string} message - Message to log
     * @param {Object} [data=null] - Additional data to include in the log
     * @param {Error} [error=null] - Error object if logging an error
     */
    log(message, data = null, error = null) {
        if (!this.#debug) return;

        const { file, line } = getCallerInfo();
        const prefix = `[${this.#prefix}${file ? `:${line}` : ""}]`;

        if (error) {
            this.error(message, error, data);
        } else if (data) {
            console.log(`${prefix} ${message}:`, data);
        } else {
            console.log(`${prefix} ${message}`);
        }
    }

    /**
     * Log error information with line numbers and context
     * @param {string} message - Message to log
     * @param {Error|any} error - Error object
     * @param {Object} [context=null] - Additional context data
     */
    error(message, error, context = null) {
        if (!this.#debug) return;

        const { file, line } = getCallerInfo();
        const prefix = `[${this.#prefix}${file ? `:${line}` : ""}]`;

        console.error(`${prefix} ERROR - ${message}:`, error);
        if (context) console.error(`${prefix} Context:`, context);
        if (error?.stack) console.error(`${prefix} Stack:`, error.stack);
    }

    /**
     * Log warning information with line numbers and context
     * @param {string} message - Message to log
     * @param {any} [data=null] - Additional data to include in the log
     */
    warn(message, data = null) {
        if (!this.#debug) return;

        const { file, line } = getCallerInfo();
        const prefix = `[${this.#prefix}${file ? `:${line}` : ""}]`;

        if (data) {
            console.warn(`${prefix} WARN - ${message}:`, data);
        } else {
            console.warn(`${prefix} WARN - ${message}`);
        }
    }
}
