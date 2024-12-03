/**
 * @fileoverview Page Break Calculator - Calculates optimal page break positions for text content
 *
 * This module provides a calculator that:
 * - Handles long text content with chapters
 * - Calculates page breaks based on configured line limits
 * - Intelligently processes empty, short, and long chapters
 * - Optimizes page distribution to avoid too short or too long pages
 * - Uses caching for performance optimization
 *
 * @module modules/text/pagination-calculator
 * @requires modules/text/text-processor-worker
 */

import { TextProcessorWorker } from "./text-processor-worker.js";

/**
 * Configuration options for pagination
 * @typedef {Object} PaginationConfig
 * @property {number} MAX_LINES - Maximum number of lines allowed per page (when using line count)
 * @property {number} MIN_LINES - Minimum number of lines required per page (when using line count)
 * @property {number} MAX_CHARS - Maximum number of characters allowed per page (when using char count)
 * @property {number} MIN_CHARS - Minimum number of characters required per page (when using char count)
 * @property {?boolean} USE_CHAR_COUNT - Pagination mode: true=char count, false=line count, null=auto detect
 * @property {?number} CHAR_MULTIPLIER - Multiplier for character limits in non-Eastern languages (default: 5)
 * @property {boolean} PAGE_BREAK_ON_TITLE - Whether to use smart pagination with chapter titles
 */

/**
 * Page Break Calculator class
 * Calculates optimal page break positions for text content with chapter support
 *
 * Key features:
 * - Automatic chapter pagination
 * - Basic merging of consecutive pages within length limits
 * - Multi-page splitting for long chapters
 * - Page length enforcement within configured limits
 * - Special handling for first and last chapters
 * - Performance optimization through caching
 * - Supports both line-based and character-based pagination
 * - Automatic language detection for pagination mode
 */
export class PaginationCalculator {
    /**
     * Error messages used throughout the class
     * @readonly
     * @private
     * @enum {string}
     */
    static #ERROR_MESSAGES = Object.freeze({
        INVALID_INPUT: "[PaginationCalculator] Invalid input: contentChunks and allTitles must be arrays",
        INVALID_TITLES: "[PaginationCalculator] Invalid input: allTitles must contain at least 2 entries",
        INVALID_CONFIG: "[PaginationCalculator] Invalid config: MAX_LINES and MIN_LINES are required",
        INVALID_RANGE: "[PaginationCalculator] Invalid range: index out of bounds",
        INVALID_BREAK_POINT: "[PaginationCalculator] Invalid break point: out of range",
        ALL_TITLES_IND_LENGTH_MISMATCH: "[PaginationCalculator] All titles and all titles indices length mismatch.",
    });
    /**
     * Logging prefix for debug messages
     * @readonly
     * @private
     * @type {string}
     */
    static #LOG_PREFIX = "[PaginationCalculator";
    /**
     * Controls debug logging output
     * @readonly
     * @private
     * @type {boolean}
     */
    static #DEBUG = false;

    /**
     * @private
     * @type {string[]} Array of content lines to be paginated
     */
    #contentChunks = [];

    /**
     * @private
     * @type {Array<[string, number]>} Array of [title, position] tuples
     */
    #allTitles = [];

    /**
     * @private
     * @type {Object} Object of all titles indices
     */
    #allTitlesInd = {};

    /**
     * @private
     * @type {boolean} Whether the content is in an Eastern language
     */
    #isEasternLan = true;

    /**
     * @private
     * @type {Object} Book and author metadata
     */
    #bookAndAuthor = {};

    /**
     * @private
     * @type {boolean} Whether to use smart pagination with chapter titles
     */
    #useSmartPagination = false;

    /**
     * @private
     * @type {number} Multiplier for character limits in non-Eastern languages
     */
    #charMultiplier = 5;

    /**
     * @private
     * @type {boolean} Whether to use character count instead of line count
     */
    #useCharCount = false;

    /**
     * @private
     * @type {PaginationConfig} Configuration object for pagination
     */
    #config = {};

    /**
     * @private
     * @type {number[]} Array of calculated break point positions
     */
    #breaks = [0];

    /**
     * @private
     * @type {number} Current line being processed during pagination
     */
    #currentLine = 0;

    /**
     * @private
     * @type {boolean} Whether the first real chapter has been processed
     */
    #firstRealChapterProcessed = false;

    /**
     * @private
     * @type {number} Index of the first real chapter
     */
    #firstRealChapterIndex = -1;

    /**
     * @private
     * @type {Map<string, string>} Cache for cleaned HTML content
     */
    #htmlCleanCache = new Map();

    /**
     * @private
     * @type {Map<string, number>} Cache for content line counts
     */
    #contentLineCache = new Map();

    /**
     * @private
     * @type {Map<string, number>} Cache for content character counts
     */
    #contentCharCache = new Map();

    /**
     * @private
     * @type {Map<number, boolean>} Cache for empty chapter checks
     */
    #emptyChapterCache = new Map();

    /**
     * @private
     * @type {Map<string, boolean>} Cache for break point validations
     */
    #validBreakPointCache = new Map();

    /**
     * Creates a new PaginationCalculator instance
     * @public
     * @param {string[]} contentChunks - Array of content lines to be paginated
     * @param {Array<[string, number]>} allTitles - Array of chapter titles with their positions
     * @param {PaginationConfig} config - Pagination configuration
     * @throws {Error} If input parameters are invalid
     * @description
     * Initializes pagination calculator with:
     * - Content lines and chapter titles
     * - Language detection for pagination mode
     * - Automatic or manual counting mode selection:
     *   - If USE_CHAR_COUNT is explicitly set, uses that value
     *   - If USE_CHAR_COUNT is null, defaults to character count for Eastern languages
     *   - Forces line count when PAGE_BREAK_ON_TITLE is false
     * - Character limit adjustments for non-Eastern languages
     */
    constructor(contentChunks, allTitles, config) {
        this.#validateInputs(contentChunks, allTitles, config);

        // Initialize properties
        this.#contentChunks = contentChunks;
        this.#allTitles = allTitles;
        this.#isEasternLan = config.IS_EASTERN_LAN;
        this.#bookAndAuthor = config.BOOK_AND_AUTHOR;
        this.#useSmartPagination = config.PAGE_BREAK_ON_TITLE;

        // Initialize all titles indices
        for (let i = 0; i < this.#allTitles.length; i++) {
            this.#allTitlesInd[this.#allTitles[i][1]] = i;
        }
        if (this.#allTitles.length !== Object.keys(this.#allTitlesInd).length) {
            throw new Error(PaginationCalculator.#ERROR_MESSAGES.ALL_TITLES_IND_LENGTH_MISMATCH);
        }

        // Determine counting mode:
        // - If USE_CHAR_COUNT is explicitly set (true/false), use that
        // - If USE_CHAR_COUNT is null, use config.IS_EASTERN_LAN
        // So if config.IS_EASTERN_LAN is true, it defaults to character count
        // Otherwise, it defaults to line count
        this.#useCharCount = config.USE_CHAR_COUNT ?? config.IS_EASTERN_LAN;
        if (!this.#useSmartPagination) {
            this.#useCharCount = false;
        }
        this.#charMultiplier = config.CHAR_MULTIPLIER ?? this.#charMultiplier;

        // Adjust configuration for language type
        this.#config = this.#useCharCount ? this.#adjustConfigForLanguage(config) : config;

        this.#log("Constructor", {
            contentChunksLength: this.#contentChunks.length,
            titlesCount: this.#allTitles.length,
            isEasternLan: this.#isEasternLan,
            bookAndAuthor: this.#bookAndAuthor,
            useSmartPagination: this.#useSmartPagination,
            useCharCount: this.#useCharCount,
            originalConfig: config,
            adjustedConfig: this.#config,
        });
    }

    /**
     * Adjusts character limits based on language type
     * @private
     * @param {PaginationConfig} config - Original configuration
     * @returns {PaginationConfig} Adjusted configuration
     * @description
     * Only adjusts character limits when using character-based pagination.
     * For non-Eastern languages, multiplies character limits by 5.
     */
    #adjustConfigForLanguage(config) {
        // Keep original config
        const adjustedConfig = { ...config };

        // Only adjust if we're using character count
        if (this.#useCharCount) {
            // For non-Eastern languages, multiply character limits by 5
            if (!this.#isEasternLan) {
                adjustedConfig.MAX_CHARS = config.MAX_CHARS * this.#charMultiplier;
                adjustedConfig.MIN_CHARS = config.MIN_CHARS * this.#charMultiplier;
            }
        }

        return adjustedConfig;
    }

    /**
     * Validates input parameters for the calculator
     * @private
     * @param {string[]} contentChunks - Array of content lines to validate
     * @param {ChapterTitle[]} allTitles - Array of chapter titles to validate
     * @param {PaginationConfig} config - Configuration object to validate
     * @throws {Error} INVALID_INPUT if contentChunks or allTitles are not arrays
     * @throws {Error} INVALID_TITLES if allTitles has less than 2 entries
     * @throws {Error} INVALID_CONFIG if config is missing required properties
     */
    #validateInputs(contentChunks, allTitles, config) {
        if (!Array.isArray(contentChunks) || !Array.isArray(allTitles)) {
            throw new Error(PaginationCalculator.#ERROR_MESSAGES.INVALID_INPUT);
        }
        if (allTitles.length < 2) {
            throw new Error(PaginationCalculator.#ERROR_MESSAGES.INVALID_TITLES);
        }

        const useCharCount = config.USE_CHAR_COUNT ?? false;
        const hasLineConfig = config.MAX_LINES && config.MIN_LINES;
        const hasCharConfig = config.MAX_CHARS && config.MIN_CHARS;

        if ((useCharCount && !hasCharConfig) || (!useCharCount && !hasLineConfig)) {
            throw new Error(PaginationCalculator.#ERROR_MESSAGES.INVALID_CONFIG);
        }
    }

    /**
     * Logs debug information with line numbers and context
     * @private
     * @param {string} message - Message to log
     * @param {Object} [data=null] - Additional data to include in the log
     * @param {Error} [error=null] - Error object if logging an error
     * @description
     * Enhanced logging features:
     * - Includes line numbers from call stack
     * - Formats error messages with context
     * - Supports object inspection for debugging
     * - Conditional output based on debug mode
     */
    #log(message, data = null, error = null) {
        if (!PaginationCalculator.#DEBUG) return;

        const stack = new Error().stack;
        const callerLine = stack.split("\n")[2];
        const match = callerLine.match(/:(\d+):\d+\)?$/);
        const lineNumber = match ? match[1] : "unknown";
        const prefix = `${PaginationCalculator.#LOG_PREFIX}: ${lineNumber}][Progress: ${this.#currentLine}]`;

        if (error) {
            console.error(`${prefix} ERROR - ${message}:`, error);
            if (data) console.error(`${prefix} Context:`, data);
            console.error(`${prefix} Stack:`, error.stack);
        } else if (data) {
            console.log(`${prefix} ${message}:`, data);
        } else {
            console.log(`${prefix} ${message}`);
        }
    }

    /**
     * Clears all internal caches
     * @private
     * @description
     * Resets the following caches:
     * - Content line count cache
     * - Empty chapter check cache
     * - Valid break point cache
     */
    #clearCaches() {
        this.#contentLineCache.clear();
        this.#contentCharCache.clear();
        this.#emptyChapterCache.clear();
        this.#validBreakPointCache.clear();
        this.#log("Caches cleared");
    }

    /**
     * Counts non-empty content lines between two positions
     * @private
     * @param {number} start - Starting index (inclusive)
     * @param {number} end - Ending index (exclusive)
     * @returns {number} Count of non-empty lines in the range
     * @description
     * Performance optimized with caching:
     * - Uses cache key format: "start-end"
     * - Caches results for repeated calls
     * - Trims lines to ignore whitespace-only content
     */
    #countContentLines(start, end) {
        const cacheKey = `lines-${start}-${end}`;
        if (this.#contentLineCache.has(cacheKey)) {
            // this.#log("Cache hit for countContentLines", { start, end });
            return this.#contentLineCache.get(cacheKey);
        }

        let count = 0;
        for (let i = start; i < end && i < this.#contentChunks.length; i++) {
            const line = this.#contentChunks[i].trim();

            // Don't count title lines
            const titleIndex = this.#allTitlesInd[i];
            if (titleIndex !== undefined) {
                continue;
            }

            const cleanLine = this.#optimize(line);
            if (cleanLine && !this.#isPunctuationOnly(cleanLine)) {
                count++;
            }
        }

        this.#contentLineCache.set(cacheKey, count);
        return count;
    }

    /**
     * Counts characters in content range (excluding whitespace)
     * @private
     * @param {number} start - Start index
     * @param {number} end - End index
     * @returns {number} Character count
     * @description
     * Performance optimized with caching:
     * - Uses cache key format: "chars-start-end"
     * - Caches results for repeated calls
     * - Trims lines to ignore whitespace-only content
     */
    #countContentChars(start, end) {
        const cacheKey = `chars-${start}-${end}`;
        if (this.#contentCharCache.has(cacheKey)) {
            // this.#log("Cache hit for countContentChars", { start, end });
            return this.#contentCharCache.get(cacheKey);
        }

        let count = 0;
        for (let i = start; i < end && i < this.#contentChunks.length; i++) {
            const line = this.#contentChunks[i].trim();

            // Don't count title lines
            const titleIndex = this.#allTitlesInd[i];
            if (titleIndex !== undefined) {
                continue;
            }

            const cleanLine = this.#optimize(line);
            if (cleanLine && !this.#isPunctuationOnly(cleanLine)) {
                count += cleanLine.length;
            }
        }

        this.#contentCharCache.set(cacheKey, count);
        return count;
    }

    /**
     * Optimize a line. This is needed to more accurately count lines and characters.
     * @private
     * @param {string} line - Line to optimize
     * @returns {string} Optimized line
     */
    #optimize(line) {
        return TextProcessorWorker.optimize(this.#removeHtmlTags(line).trim(), this.#bookAndAuthor);
    }

    /**
     * Removes HTML tags from a line and returns the text content
     * @private
     * @param {string} line - Line to process
     * @returns {string} Text content without HTML tags
     * @description
     * Removes all HTML tags and replaces common HTML entities
     */
    #removeHtmlTags(line) {
        if (!line) return "";

        // Cache for performance
        const cacheKey = line;
        if (this.#htmlCleanCache.has(cacheKey)) {
            // this.#log("Cache hit for removeHtmlTags", { line });
            return this.#htmlCleanCache.get(cacheKey);
        }

        // Remove all HTML tags
        const cleanText = line
            .replace(/<[^>]*>/g, "") // Remove HTML tags
            .replace(/&nbsp;/g, " ") // Replace common HTML entities
            .trim();

        this.#htmlCleanCache.set(cacheKey, cleanText);
        return cleanText;
    }

    /**
     * Checks if a line contains only punctuation characters
     * @private
     * @param {string} line - Line to check
     * @returns {boolean} true if line contains only punctuation
     * @description
     * Uses a regular expression to check if a line contains only punctuation characters
     */
    #isPunctuationOnly(line) {
        if (!line) return false;
        // Regular expression to match lines containing only punctuation and whitespace
        const punctuationRegex = /^[\p{P}\p{S}\p{Pd}\s]+$/u;
        return punctuationRegex.test(line);
    }

    /**
     * Gets content length between positions based on current counting mode
     * @private
     * @param {number} start - Start index
     * @param {number} end - End index
     * @returns {number} Content length (either line count or character count)
     */
    #getContentLength(start, end) {
        // start often contains title, so we need to exclude it
        let realStart = start;
        let titleIndex = this.#allTitlesInd[start];
        if (titleIndex !== undefined) {
            realStart = this.#allTitles[titleIndex][1] + 1;
            if (realStart !== start + 1) {
                throw new Error("start: ", this.#allTitles[titleIndex][0], start, realStart);
            }
        }

        return this.#useCharCount ? this.#countContentChars(realStart, end) : this.#countContentLines(realStart, end);
    }

    /**
     * Checks if a chapter contains only empty lines
     * @private
     * @param {number} titleIndex - Index of the chapter in allTitles array
     * @returns {boolean} true if chapter has no non-empty lines
     * @description
     * A chapter is considered empty if:
     * - It contains no content lines, or
     * - All lines between its start and next chapter are empty/whitespace
     * Uses caching to optimize repeated checks
     */
    #isEmptyChapter(titleIndex) {
        if (this.#emptyChapterCache.has(titleIndex)) {
            // this.#log("Cache hit for isEmptyChapter", { titleIndex });
            return this.#emptyChapterCache.get(titleIndex);
        }

        const titleStart = this.#allTitles[titleIndex][1];
        const nextTitleStart =
            titleIndex < this.#allTitles.length - 1 ? this.#allTitles[titleIndex + 1][1] : this.#contentChunks.length;

        const contentLength = this.#getContentLength(titleStart + 1, nextTitleStart);

        const isEmpty = contentLength === 0;
        this.#emptyChapterCache.set(titleIndex, isEmpty);

        if (isEmpty) {
            this.#log("Empty chapter", {
                title: this.#allTitles[titleIndex][0],
                titleIndex,
                titleStart,
                nextTitleStart,
                contentLength,
            });
        }
        return isEmpty;
    }

    /**
     * Checks if adding a break point would create a too-short next page
     * @private
     * @param {number} breakPoint - Potential break point position
     * @param {number} endPoint - End position to check against
     * @returns {boolean} true if the next page would be shorter than MIN_LINES
     * @description
     * Prevents creation of short pages by:
     * - Calculating remaining content after break point
     * - Comparing against MIN_LINES configuration
     * - Special handling for end of content
     */
    #wouldCreateShortNextPage(breakPoint, endPoint) {
        const contentLength = this.#getContentLength(breakPoint, endPoint);
        const minLimit = this.#useCharCount ? this.#config.MIN_CHARS : this.#config.MIN_LINES;
        const isShort = contentLength > 0 && contentLength < minLimit;
        this.#log("Short page check", {
            breakPoint,
            endPoint,
            contentLength,
            minLimit,
            useCharCount: this.#useCharCount,
            isShort,
        });
        return isShort;
    }

    /**
     * Validates if a break point would create valid page lengths
     * @private
     * @param {number} breakPoint - Start position of the page
     * @param {number} nextBreakPoint - End position of the page
     * @returns {boolean} true if the break point creates a valid page
     * @description
     * A break point is valid if:
     * - It's within the content bounds
     * - Creates a page within MIN_LINES and MAX_LINES
     * - Doesn't create invalid page lengths
     * Uses caching for performance optimization
     */
    #isValidBreakPoint(breakPoint, nextBreakPoint) {
        const cacheKey = `valid-${breakPoint}-${nextBreakPoint}`;
        if (this.#validBreakPointCache.has(cacheKey)) {
            return this.#validBreakPointCache.get(cacheKey);
        }

        try {
            // Range validation
            if (breakPoint < 0 || nextBreakPoint > this.#contentChunks.length) {
                throw new Error(PaginationCalculator.#ERROR_MESSAGES.INVALID_RANGE);
            }
            if (breakPoint >= nextBreakPoint) {
                throw new Error(PaginationCalculator.#ERROR_MESSAGES.INVALID_BREAK_POINT);
            }

            // Calculate actual content lines between these two break points
            const contentLength = this.#getContentLength(breakPoint, nextBreakPoint);
            const minLimit = this.#useCharCount ? this.#config.MIN_CHARS : this.#config.MIN_LINES;

            // Check if minimum line count requirement is met
            if (contentLength < minLimit) {
                // Check if this is the last page of a chapter
                const isLastPageOfChapter = this.#allTitles.some((title, index) => {
                    const nextTitle = this.#allTitles[index + 1];
                    return nextTitle && breakPoint < nextTitle[1] && nextBreakPoint >= nextTitle[1];
                });

                // If not the last page of a chapter, require minimum line count
                if (!isLastPageOfChapter) {
                    this.#log("Invalid break point - content too short", {
                        breakPoint,
                        nextBreakPoint,
                        contentLength,
                        minLimit,
                        useCharCount: this.#useCharCount,
                    });
                    return false;
                }
            }

            const isValid = contentLength > 0;
            this.#validBreakPointCache.set(cacheKey, isValid);

            this.#log("Break point validation", {
                breakPoint,
                nextBreakPoint,
                contentLength,
                minLimit,
                useCharCount: this.#useCharCount,
                isValid,
            });

            return isValid;
        } catch (error) {
            this.#log("Error in isValidBreakPoint", { breakPoint, nextBreakPoint }, error);
            return false;
        }
    }

    /**
     * Adds a new break point to the breaks array
     * @private
     * @param {number} breakPoint - Position to add as break point
     * @returns {boolean} true if break point was successfully added
     * @description
     * Break point addition logic:
     * - Validates the break point position
     * - Ensures no duplicates
     * - Maintains break point order
     * - Updates current line position
     */
    #addBreakPoint(breakPoint) {
        try {
            if (typeof breakPoint !== "number" || isNaN(breakPoint)) {
                throw new Error("Invalid break point type");
            }

            if (breakPoint < 0 || breakPoint > this.#contentChunks.length) {
                throw new Error(PaginationCalculator.#ERROR_MESSAGES.INVALID_RANGE);
            }

            // Check for duplicates
            if (this.#breaks.includes(breakPoint)) {
                this.#log("Duplicate break point", { breakPoint });
                return false;
            }

            // Validate with previous break point
            if (this.#breaks.length > 0) {
                const lastBreak = this.#breaks[this.#breaks.length - 1];
                if (!this.#isValidBreakPoint(lastBreak, breakPoint)) {
                    this.#log("Invalid break point", {
                        lastBreak,
                        breakPoint,
                    });
                    return false;
                }
            }

            this.#breaks.push(breakPoint);
            this.#log("Added break point", {
                breakPoint,
                currentBreaks: this.#breaks,
            });
            return true;
        } catch (error) {
            this.#log("Error adding break point", { breakPoint }, error);
            return false;
        }
    }

    /**
     * Calculates page break positions for the entire content
     * @public
     * @returns {number[]} Array of page break positions
     * @throws {Error} If calculation fails
     * @description
     * Uses smart pagination if enabled, otherwise falls back to simple pagination
     */
    calculate() {
        try {
            const result = this.#useSmartPagination
                ? this.#calculateSmartPagination()
                : this.#calculateSimplePagination();
            return result;
        } catch (error) {
            this.#log("Error in calculate", null, error);
            return [0];
        }
    }

    /**
     * Calculates page break positions for the entire content using smart pagination
     * @private
     * @returns {number[]} Array of page break positions
     * @throws {Error} If calculation fails
     * @description
     * Handles various chapter scenarios:
     * - End page title (skips processing)
     * - First chapter after title (special handling for title page)
     * - Empty chapters (adds break point if needed)
     * - Short chapters (attempts to merge with previous page)
     * - Long chapters (splits into multiple pages)
     */
    #calculateSmartPagination() {
        try {
            this.#log("Starting calculation");
            this.#clearCaches();

            // Handle empty content
            if (this.#contentChunks.length === 0) {
                return [0];
            }

            // Process each chapter
            for (let i = 0; i < this.#allTitles.length - 1; i++) {
                this.#processChapter(i);
            }

            // Handle last chapter
            this.#handleLastChapter();

            // Merge short pages
            this.#mergeShortPages();

            // Validate final breaks
            return this.#validateFinalBreaks();
        } catch (error) {
            this.#log("Error in calculation", null, error);
            return [0];
        }
    }

    /**
     * Calculates page break positions for the entire content using simple pagination
     * @private
     * @returns {number[]} Array of page break positions
     * @description
     * Simple pagination:
     * - Adds break points at fixed intervals
     * - Handles special case where last page only contains end page
     */
    #calculateSimplePagination() {
        // assert this.#useCharCount is false
        if (this.#useCharCount) {
            throw new Error("Simple pagination should not use character count!");
        }

        const breaks = [0];
        const maxLimit = this.#config.MAX_LINES;
        const totalLines = this.#contentChunks.length;
        let contentLength = 0;
        let lastBreak = 0;

        // Scan through content and add break points
        for (let i = 0; i < totalLines; i++) {
            const line = this.#contentChunks[i].trim();
            const cleanLine = this.#optimize(line);

            // Only count lines with actual content
            if (cleanLine && !this.#isPunctuationOnly(cleanLine)) {
                contentLength++;
            }

            // Add break point if content length exceeds max limit
            if (contentLength >= maxLimit) {
                breaks.push(i + 1);
                lastBreak = i + 1;
                contentLength = 0;
            }
        }

        // Handle special case where last page only contains end page
        if (breaks.length > 1) {
            const lastBreak = breaks[breaks.length - 1];
            const lastPageLength = this.#getContentLength(lastBreak, totalLines);

            if (lastPageLength === 1) {
                breaks.pop();
            }
        }

        this.#log("Simple pagination completed", {
            breaks,
            totalLines,
            maxLimit,
            useCharCount: this.#useCharCount,
        });

        return breaks;
    }

    /**
     * Processes a single chapter to determine its page breaks
     * @private
     * @param {number} i - Chapter index in allTitles array
     * @description
     * Handles various chapter scenarios:
     * - End page title (skips processing)
     * - First chapter after title (special handling for title page)
     * - Empty chapters (adds break point if needed)
     * - Short chapters (attempts to merge with previous page)
     * - Long chapters (splits into multiple pages)
     */
    #processChapter(i) {
        const titleStart = this.#allTitles[i][1];
        const nextTitleStart = this.#allTitles[i + 1][1];
        const chapterLength = this.#getContentLength(titleStart, nextTitleStart);
        const minLimit = this.#useCharCount ? this.#config.MIN_CHARS : this.#config.MIN_LINES;
        const maxLimit = this.#useCharCount ? this.#config.MAX_CHARS : this.#config.MAX_LINES;

        this.#log(`Chapter ${i}`, {
            title: this.#allTitles[i][0],
            contentLength: chapterLength,
            useCharCount: this.#useCharCount,
        });

        // Last chapter before end page, skip processing as we have special handling for it
        if (i === this.#allTitles.length - 2) {
            this.#log("Last chapter before end page, skipped processing");
            return;
        }

        // If the title page chapter is not empty, we always add a break point after it
        if (i === 0 && chapterLength > 0) {
            this.#log("Title page chapter is not empty, adding break point after it");
            this.#addBreakPoint(nextTitleStart);
            return;
        }

        // Handle first real chapter after title, meaning the first chapter after title page chapter that has content.
        // We need to check if the chapter has content, if it doesn't have content, we should skip processing.
        // We need to do this check only once, so we use #firstRealChapterProcessed flag.
        if (i > 0) {
            if (!this.#firstRealChapterProcessed) {
                if (chapterLength === 0) {
                    this.#log("First chapter after title is empty, skipped processing");
                    return;
                } else {
                    this.#log("First real chapter found, processing");
                    this.#firstRealChapterProcessed = true;
                    this.#firstRealChapterIndex = i;
                }
            }
        }

        if (i === this.#firstRealChapterIndex) {
            this.#log("Processing first real chapter after title");
            const titlePageLength = this.#getContentLength(0, titleStart);
            const combinedLength = titlePageLength + chapterLength;

            this.#log("Title page analysis", {
                titlePageLength,
                chapterLength,
                combinedLength,
                maxLimit,
                useCharCount: this.#useCharCount,
            });

            // Always try to keep first chapter with title page unless combined length exceeds maxLimit
            if (combinedLength <= maxLimit) {
                this.#log("Keeping first chapter with title page");
                return;
            }

            // If combined content is too long, find optimal break point
            this.#log("Finding optimal break point after title page");
            let currentPos = titleStart;
            let accumulatedLength = titlePageLength;

            // Keep adding content until we hit the limit
            while (currentPos < nextTitleStart) {
                const nextLength = this.#getContentLength(currentPos, currentPos + 1);
                if (accumulatedLength + nextLength > maxLimit) {
                    break;
                }
                accumulatedLength += nextLength;
                currentPos++;
            }

            // Add break point at the optimal position
            this.#log("Adding break point at optimal position");
            if (currentPos < nextTitleStart && this.#addBreakPoint(currentPos)) {
                this.#currentLine = currentPos;

                // Process remaining content if it's still too long
                const remainingLength = this.#getContentLength(currentPos, nextTitleStart);
                if (remainingLength > maxLimit) {
                    this.#processLongChapter(currentPos, nextTitleStart);
                }
            }
            return;
        }

        // Handle empty chapters
        if (this.#isEmptyChapter(i)) {
            if (titleStart > this.#currentLine) {
                this.#log("Adding break point for empty chapter");
                if (this.#addBreakPoint(titleStart)) {
                    this.#currentLine = titleStart;
                }
            }
            return;
        }

        // If previous chapter was empty
        if (i > 0 && this.#isEmptyChapter(i - 1)) {
            if (chapterLength > maxLimit) {
                this.#processLongChapter(titleStart, nextTitleStart);
            }
            return;
        }

        // Handle short chapters
        if (chapterLength < minLimit && titleStart > 0) {
            const lastBreak = this.#breaks[this.#breaks.length - 1];
            const contentOnLastPage = this.#getContentLength(lastBreak, titleStart);

            if (contentOnLastPage + chapterLength <= maxLimit) {
                this.#log("Merging short chapter with previous page");
                return;
            }
        }

        // Add regular chapter break
        if (titleStart > this.#currentLine) {
            this.#log("Adding break point for regular chapter");
            if (this.#addBreakPoint(titleStart)) {
                this.#currentLine = titleStart;
            }
        }

        // Handle long chapters
        if (chapterLength > maxLimit) {
            this.#processLongChapter(titleStart, nextTitleStart);
        }
    }

    /**
     * Processes a long chapter that needs to be split across multiple pages
     * @private
     * @param {number} titleStart - Starting position of the chapter
     * @param {number} nextTitleStart - Starting position of the next chapter
     * @description
     * Splits long chapters by:
     * 1. Counting non-empty content lines
     * 2. Adding break points when MAX_LINES is reached
     * 3. Ensuring no short pages are created
     * 4. Validating each break point
     */
    #processLongChapter(titleStart, nextTitleStart) {
        let contentCount = 0;
        let lastBreakPoint = titleStart;
        const maxLimit = this.#useCharCount ? this.#config.MAX_CHARS : this.#config.MAX_LINES;

        for (let j = titleStart; j < nextTitleStart; j++) {
            if (this.#contentChunks[j]?.trim()) {
                contentCount++;
                if (contentCount >= maxLimit) {
                    const newBreakPoint = j + 1;
                    if (
                        !this.#wouldCreateShortNextPage(newBreakPoint, nextTitleStart) &&
                        this.#isValidBreakPoint(lastBreakPoint, newBreakPoint)
                    ) {
                        this.#log("Adding break point for long chapter");
                        if (this.#addBreakPoint(newBreakPoint)) {
                            lastBreakPoint = newBreakPoint;
                            contentCount = 0;
                        }
                    }
                }
            }
        }
    }

    /**
     * Handles the last chapter of the content
     * @private
     * @description
     * Special handling for the last chapter:
     * - Processes remaining content if any exists
     * - Handles short last chapter appropriately
     * - Splits into multiple pages if too long
     */
    #handleLastChapter() {
        const lastRealChapterIndex = this.#allTitles.length - 2;
        const lastRealChapterStart = this.#allTitles[lastRealChapterIndex][1];
        const totalLines = this.#contentChunks.length;

        const remainingContentLength = this.#getContentLength(lastRealChapterStart, totalLines);
        this.#log("Processing last chapter", {
            remainingContentLength,
            useCharCount: this.#useCharCount,
        });

        if (remainingContentLength > 0) {
            this.#processLastChapterContent(lastRealChapterStart, remainingContentLength, totalLines);
        }
    }

    /**
     * Processes content of the last chapter
     * @private
     * @param {number} lastRealChapterStart - Starting position of the last real chapter
     * @param {number} remainingContentLength - Number of non-empty lines/chars in the last chapter
     * @param {number} totalLines - Total number of lines in the content
     * @description
     * Handles last chapter content by:
     * 1. Adding break point if chapter is long enough (>= MIN_LINES/MIN_CHARS)
     * 2. Attempting to merge with previous page if too short
     * 3. Splitting into multiple pages if exceeds MAX_LINES/MAX_CHARS
     * @throws {Error} If invalid positions are provided
     */
    #processLastChapterContent(lastRealChapterStart, remainingContentLength, totalLength) {
        if (lastRealChapterStart > this.#currentLine) {
            const minLimit = this.#useCharCount ? this.#config.MIN_CHARS : this.#config.MIN_LINES;

            if (remainingContentLength >= minLimit) {
                this.#log("Adding break point for long last chapter");
                this.#addBreakPoint(lastRealChapterStart);
            } else {
                this.#handleShortLastChapter(lastRealChapterStart, remainingContentLength);
            }
        }

        const maxLimit = this.#useCharCount ? this.#config.MAX_CHARS : this.#config.MAX_LINES;
        if (remainingContentLength > maxLimit) {
            this.#processLongChapter(lastRealChapterStart, totalLength);
        }
    }

    /**
     * Handles short last chapter by attempting to merge with previous page
     * @private
     * @param {number} lastRealChapterStart - Starting position of the last chapter
     * @param {number} remainingContentLength - Number of non-empty lines in the last chapter
     * @description
     * Merging logic:
     * 1. Gets the last break point
     * 2. Calculates lines on the last existing page
     * 3. Checks if merging would exceed MAX_LINES
     * 4. Either merges with previous page or adds new break point
     */
    #handleShortLastChapter(lastRealChapterStart, remainingContentLength) {
        const lastBreak = this.#breaks[this.#breaks.length - 1];
        const contentLength = this.#getContentLength(lastBreak, lastRealChapterStart);
        const maxLimit = this.#useCharCount ? this.#config.MAX_CHARS : this.#config.MAX_LINES;

        this.#log("Handling short last chapter", {
            lastBreak,
            contentLength,
            remainingContentLength,
            useCharCount: this.#useCharCount,
        });

        if (contentLength + remainingContentLength <= maxLimit) {
            this.#log("Merging short last chapter with previous page");
            return;
        }

        this.#log("Adding break point for short last chapter");
        this.#addBreakPoint(lastRealChapterStart);
    }

    /**
     * Checks if two consecutive pages should be merged
     * @private
     * @param {number} firstBreak - Starting position of first page
     * @param {number} secondBreak - Starting position of second page (end of first page)
     * @param {number} endPoint - End position of second page
     * @returns {boolean} true if pages should be merged
     * @description
     * Merge decision process:
     * 1. Calculates content lines in first page
     * 2. Calculates content lines in second page
     * 3. Checks if combined length <= MAX_LINES
     * 4. Returns false on any error to prevent invalid merges
     *
     * @throws {Error} Logs error and returns false if calculation fails
     */
    #shouldMergePages(firstBreak, secondBreak, endPoint) {
        try {
            const firstPageLength = this.#getContentLength(firstBreak, secondBreak);
            const secondPageLength = this.#getContentLength(secondBreak, endPoint);
            const totalLength = firstPageLength + secondPageLength;

            const maxLimit = this.#useCharCount ? this.#config.MAX_CHARS : this.#config.MAX_LINES;
            const shouldMerge = totalLength <= maxLimit;

            // this.#log("Page merge check", {
            //     firstBreak,
            //     secondBreak,
            //     endPoint,
            //     firstPageLength,
            //     secondPageLength,
            //     totalLength,
            //     maxLimit,
            //     useCharCount: this.#useCharCount,
            //     shouldMerge,
            // });

            return shouldMerge;
        } catch (error) {
            this.#log("Error checking page merge", { firstBreak, secondBreak, endPoint }, error);
            return false;
        }
    }

    /**
     * Attempts to merge consecutive short pages
     * @private
     * @description
     * Merging process:
     * 1. Sorts break points
     * 2. Checks consecutive pages for potential merging
     * 3. Merges pages if combined length is within MAX_LINES/MAX_CHARS
     * 4. Special handling for last two pages
     * Uses either line count or character count based on configuration
     */
    #mergeShortPages() {
        this.#log("Starting page merge process", {
            initialBreaks: [...this.#breaks],
        });

        this.#breaks.sort((a, b) => a - b);

        let i = 0;
        while (i < this.#breaks.length - 1) {
            const currentBreak = this.#breaks[i];
            const nextBreak = this.#breaks[i + 1];
            const endPoint = i + 2 < this.#breaks.length ? this.#breaks[i + 2] : this.#contentChunks.length;

            // this.#log("Checking pages for merge", {
            //     currentBreak,
            //     nextBreak,
            //     endPoint,
            // });

            if (this.#shouldMergePages(currentBreak, nextBreak, endPoint)) {
                this.#log("Merging pages", {
                    removedBreak: nextBreak,
                });
                this.#breaks.splice(i + 1, 1);
                // Don't increment i as we need to check the new pair
            } else {
                i++;
            }
        }

        // Check last two pages
        if (this.#breaks.length >= 2) {
            const secondLastBreak = this.#breaks[this.#breaks.length - 2];
            const lastBreak = this.#breaks[this.#breaks.length - 1];
            const fileEnd = this.#contentChunks.length;

            if (this.#shouldMergePages(secondLastBreak, lastBreak, fileEnd)) {
                this.#breaks.pop();
            }
        }
    }

    /**
     * Validates and finalizes the break points
     * @private
     * @returns {number[]} Array of validated break points
     * @description
     * Final validation ensures:
     * - All break points create valid page lengths
     * - At least one break point exists (0)
     * - No invalid or unnecessary break points
     */
    #validateFinalBreaks() {
        this.#log("Starting final validation", {
            breakPointsBeforeValidation: [...this.#breaks],
        });

        const validatedBreaks = this.#breaks.filter((breakPoint, index, array) => {
            const nextBreakPoint = index === array.length - 1 ? this.#contentChunks.length : array[index + 1];

            const isValid = this.#isValidBreakPoint(breakPoint, nextBreakPoint);

            // this.#log(`Validating break point ${breakPoint}`, {
            //     index,
            //     nextBreakPoint,
            //     isValid,
            // });

            return isValid;
        });

        this.#log("Validation completed", {
            initialBreaks: this.#breaks,
            finalBreaks: validatedBreaks,
            totalPages: validatedBreaks.length,
        });

        // Ensure we always have at least the initial break point
        if (validatedBreaks.length === 0) {
            this.#log("No valid breaks found, returning initial break point");
            return [0];
        }

        return validatedBreaks;
    }
}
