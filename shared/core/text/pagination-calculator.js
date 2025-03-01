/**
 * @fileoverview Pagination calculator module for text content processing and page break calculation.
 *
 * This module provides functionality for calculating optimal page break positions in text content.
 * It supports both smart and simple pagination modes, with special handling for:
 * - Chapter titles and section breaks
 * - Eastern and Western languages
 * - Character-based and line-based counting
 * - Short and long chapters
 * - Content validation and optimization
 *
 * The module consists of two main classes:
 * 1. SortedPageBreaksArray: A specialized array for managing break points
 * 2. PaginationCalculator: The main calculator class for determining page breaks
 *
 * @module shared/core/text/pagination-calculator
 * @requires shared/utils/logger
 */

import { Logger } from "../../utils/logger.js";

/**
 * @class SortedPageBreaksArray
 * @extends Array
 * @description A self-sorting array class for storing pagination break points
 */
class SortedPageBreaksArray extends Array {
    /**
     * @constructor
     * @param {...number} values - Initial break point values
     */
    constructor(...values) {
        super(); // Call the parent Array constructor
        if (values.length > 0) {
            super.push(...values); // Directly use the parent class's push
            this.sort((a, b) => a - b); // Ensure the array is sorted
        }
    }

    /**
     * @method insert
     * @param {number} value - Break point value to insert
     * @description Inserts a new break point while maintaining array order
     */
    insert(value) {
        if (this.length === 0 || value >= this[this.length - 1]) {
            super.push(value); // Use the parent class's push to avoid recursion
        } else {
            super.push(value); // Temporarily push the value
            this.sort((a, b) => a - b); // Sort to maintain order
        }
    }

    /**
     * @method push
     * @param {...number} values - Break point values to add
     * @returns {number} The new length of the array
     * @description Adds one or more break points while maintaining array order
     */
    push(...values) {
        for (const value of values) {
            this.insert(value);
        }
        return this.length;
    }

    /**
     * @method unshift
     * @param {...number} values - Break point values to add
     * @returns {number} The new length of the array
     * @description Adds one or more break points at the start while maintaining array order
     */
    unshift(...values) {
        for (const value of values) {
            this.insert(value);
        }
        return this.length;
    }
}

/**
 * @class PaginationCalculator
 * @description
 * Calculates pagination break points for text content, supporting both smart and simple pagination modes.
 * Smart pagination considers:
 * - Chapter titles and structure
 * - Content density and distribution
 * - Language-specific characteristics
 * - Minimum and maximum page sizes
 * - Chapter merging and splitting
 */
export class PaginationCalculator {
    /**
     * @private
     * @static
     * @readonly
     * @property {Object} #ERROR_MESSAGES
     * @description Static object containing error message constants
     */
    static #ERROR_MESSAGES = Object.freeze({
        INVALID_BREAK_POINT_TYPE: "[PaginationCalculator] Invalid break point type: break point must be a number",
        INVALID_INPUT: "[PaginationCalculator] Invalid input: contentChunks and allTitles must be arrays",
        INVALID_TITLES: "[PaginationCalculator] Invalid input: allTitles must contain at least 2 entries",
        INVALID_CONFIG: "[PaginationCalculator] Invalid config: MAX_LINES and MIN_LINES are required",
        INVALID_RANGE: "[PaginationCalculator] Invalid range: index out of bounds",
        INVALID_BREAK_POINT: "[PaginationCalculator] Invalid break point: out of range",
        ALL_TITLES_IND_LENGTH_MISMATCH: "[PaginationCalculator] All titles and all titles indices length mismatch.",
    });

    /**
     * @type {Logger} Logger instance
     * @private
     */
    #logger = Logger.getLogger(this, false);

    /**
     * @type {Array<Object>} Content chunks
     * @private
     */
    #contentChunks = [];

    /**
     * @type {Array<Array>} All titles
     * @private
     */
    #allTitles = [];

    /**
     * @type {Object} All titles indices
     * @private
     */
    #allTitlesInd = {};

    /**
     * @type {boolean} Whether the content is in an Eastern language
     * @private
     */
    #isEasternLan = true;

    /**
     * @type {Object} Book and author information
     * @private
     */
    #bookAndAuthor = {};

    /**
     * @type {boolean} Whether to use smart pagination
     * @private
     */
    #useSmartPagination = false;

    /**
     * @type {boolean} Whether this is a complete book
     * @private
     */
    #isBookComplete = true;

    /**
     * @type {number} Character multiplier
     * @private
     */
    #charMultiplier = 3;

    /**
     * @type {boolean} Whether to use character count
     * @private
     */
    #useCharCount = false;

    /**
     * @type {Object} Configuration object
     * @private
     */
    #config = {};

    /**
     * @type {SortedPageBreaksArray} Array of break points
     * @private
     */
    #breaks = new SortedPageBreaksArray(0);

    /**
     * @type {number} Current line
     * @private
     */
    #currentLine = 0;

    /**
     * @type {Map} HTML clean cache
     * @private
     */
    #htmlCleanCache = new Map();

    /**
     * @type {Map} Content line cache
     * @private
     */
    #contentLineCache = new Map();

    /**
     * @type {Map} Content character cache
     * @private
     */
    #contentCharCache = new Map();

    /**
     * @type {Map} Valid break point cache
     * @private
     */
    #validBreakPointCache = new Map();

    /**
     * @constructor
     * @param {Array<Object>} contentChunks - Array of content chunks, each containing content and character count
     * @param {Array<Array>} allTitles - Array of titles, each element is an array of [title text, position]
     * @param {Object} config - Configuration object
     * @throws {Error} When input parameters are invalid
     */
    constructor(contentChunks, allTitles, config) {
        this.#validateInputs(contentChunks, allTitles, config);

        this.#contentChunks = contentChunks;
        this.#allTitles = allTitles;
        this.#isEasternLan = config.IS_EASTERN_LAN;
        this.#bookAndAuthor = config.BOOK_AND_AUTHOR;
        this.#useSmartPagination = config.PAGE_BREAK_ON_TITLE;
        this.#isBookComplete = config.COMPLETE_BOOK;

        for (let i = 0; i < this.#allTitles.length; i++) {
            this.#allTitlesInd[this.#allTitles[i][1]] = i;
        }
        if (this.#allTitles.length !== Object.keys(this.#allTitlesInd).length) {
            throw new Error(PaginationCalculator.#ERROR_MESSAGES.ALL_TITLES_IND_LENGTH_MISMATCH);
        }

        this.#useCharCount = config.USE_CHAR_COUNT ?? config.IS_EASTERN_LAN;
        if (!this.#useSmartPagination) {
            this.#useCharCount = false;
        }
        this.#charMultiplier = config.CHAR_MULTIPLIER ?? this.#charMultiplier;

        this.#config = this.#useCharCount ? this.#adjustConfigForLanguage(config) : config;

        this.#logger.log("Constructor", {
            contentChunksLength: this.#contentChunks.length,
            titlesCount: this.#allTitles.length,
            isEasternLan: this.#isEasternLan,
            bookAndAuthor: this.#bookAndAuthor,
            useSmartPagination: this.#useSmartPagination,
            useCharCount: this.#useCharCount,
            isBookComplete: this.#isBookComplete,
            originalConfig: config,
            adjustedConfig: this.#config,
        });
    }

    /**
     * @method calculate
     * @returns {SortedPageBreaksArray} Array of calculated pagination break points
     * @description Calculates pagination positions based on configuration
     */
    calculate() {
        try {
            const result = this.#useSmartPagination
                ? this.#calculateSmartPagination()
                : this.#calculateSimplePagination();
            return result;
        } catch (error) {
            this.#logger.log("Error in calculate", null, error);
            return new SortedPageBreaksArray(0);
        }
    }

    /**
     * @private
     * @method #calculateSmartPagination
     * @returns {SortedPageBreaksArray} Array of break points from smart pagination
     * @description Calculates pagination positions using smart pagination algorithm
     */
    #calculateSmartPagination() {
        try {
            this.#logger.log("Starting smart pagination");
            this.#clearCaches();

            // 1. Initialize breaks array
            this.#logger.log("Initialized breaks", { breaks: this.#breaks });

            // 2. Add initial break points based on chapter titles
            this.#addInitialBreakPoints();
            this.#logger.log("Initial break points added", { breaks: this.#breaks });

            // 3. Handle empty/short chapters, remove unnecessary break points
            this.#handleShortChapters();
            this.#logger.log("Short chapters handled", { breaks: this.#breaks });

            // 4. Handle long chapters
            this.#handleLongChapters();
            this.#logger.log("Long chapters handled", { breaks: this.#breaks });

            // 5. Validate final breaks
            return this.#validateFinalBreaks();
        } catch (error) {
            this.#logger.log("Error in smart pagination", null, error);
            return new SortedPageBreaksArray(0);
        }
    }

    /**
     * @private
     * @method #calculateSimplePagination
     * @returns {SortedPageBreaksArray} Array of break points from simple pagination
     * @description Calculates pagination positions using simple pagination algorithm
     */
    #calculateSimplePagination() {
        // assert this.#useCharCount is false
        if (this.#useCharCount) {
            this.#logger.log("Simple pagination should not use character count!");
            this.#useCharCount = false;
        }

        const breaks = new SortedPageBreaksArray(0);
        const maxLimit = this.#config.MAX_LINES;
        const totalLines = this.#contentChunks.length;
        let contentLength = 0;
        let lastBreak = 0;

        // Scan through content and add break points
        for (let i = 0; i < totalLines; i++) {
            const charCount = this.#contentChunks[i].charCount;
            if (charCount && charCount > 0) {
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

        this.#logger.log("Simple pagination completed", {
            breaks,
            totalLines,
            maxLimit,
            useCharCount: this.#useCharCount,
        });

        return breaks;
    }

    /**
     * @private
     * @method #addInitialBreakPoints
     * @description Adds initial break points based on chapter titles, skipping the first title (since we already have 0)
     */
    #addInitialBreakPoints() {
        // Iterate through all titles, except the last one (if it's the end page)
        const titlesToProcess = this.#isBookComplete ? this.#allTitles.slice(0, -1) : this.#allTitles;

        for (let i = 0; i < titlesToProcess.length; i++) {
            const titlePosition = titlesToProcess[i][1];
            this.#logger.log("Adding initial break point", {
                title: titlesToProcess[i][0],
                titlePosition,
            });
            if (titlePosition > 0) {
                // Skip the first title (since we already have 0)
                this.#addBreakPoint(titlePosition);
            }
        }
    }

    /**
     * @private
     * @method #addBreakPoint
     * @param {number} breakPoint - Break point position to add
     * @returns {boolean} Whether the break point was successfully added
     * @description Adds a break point to the array after validation checks
     * @throws {Error} When break point is invalid or out of range
     */
    #addBreakPoint(breakPoint) {
        try {
            if (typeof breakPoint !== "number" || isNaN(breakPoint)) {
                throw new Error(PaginationCalculator.#ERROR_MESSAGES.INVALID_BREAK_POINT_TYPE);
            }

            if (breakPoint < 0 || breakPoint > this.#contentChunks.length) {
                throw new Error(PaginationCalculator.#ERROR_MESSAGES.INVALID_RANGE);
            }

            // Check for duplicates
            if (this.#breaks.includes(breakPoint)) {
                this.#logger.log("Duplicate break point", { breakPoint });
                return false;
            }

            this.#breaks.push(breakPoint);
            this.#logger.log("Added break point", {
                rank: this.#breaks.length,
                breakPoint,
                currentBreaks: this.#breaks,
            });
            return true;
        } catch (error) {
            console.error("Error adding break point", { breakPoint }, error);
            return false;
        }
    }

    /**
     * @private
     * @method #handleShortChapters
     * @description Processes short chapters, potentially merging adjacent chapters
     */
    #handleShortChapters() {
        // Create a copy because we will modify the original array
        const breaks = [...this.#breaks];

        for (let i = 0; i < breaks.length - 1; i++) {
            const start = breaks[i];
            const end = breaks[i + 1];
            const nextEnd = i + 2 < breaks.length ? breaks[i + 2] : this.#contentChunks.length;

            // If the current chapter is empty/short
            if (this.#isShortOrEmptyChapter(start, end)) {
                // Remove the next break point from the original array
                this.#breaks = this.#breaks.filter((b) => b !== end);
                this.#logger.log("Removed break point due to short chapter", {
                    removed: end,
                    currentChapter: this.#getContentLength(start, end),
                });
                continue;
            }

            // Check if the current chapter and the next chapter combined are within the limit
            const combinedLength = this.#getContentLength(start, nextEnd);
            if (combinedLength <= this.#getMaxLimit()) {
                this.#breaks = this.#breaks.filter((b) => b !== end);
                this.#logger.log("Removed break point as combined chapters within limit", {
                    removed: end,
                    currentChapter: this.#getContentLength(start, end),
                    nextChapter: this.#getContentLength(end, nextEnd),
                    combinedLength,
                });
            }
        }

        // Handle remaining short chapters, where start = breaks[i+1], end = this.#contentChunks.length
        const lastBreak = breaks[breaks.length - 1];
        if (lastBreak && this.#isShortOrEmptyChapter(lastBreak, this.#contentChunks.length)) {
            // Remove the next break point from the original array
            this.#breaks = this.#breaks.filter((b) => b !== this.#contentChunks.length);
            this.#logger.log("Removed break point due to short chapter", {
                removed: this.#contentChunks.length,
                currentChapter: this.#getContentLength(lastBreak, this.#contentChunks.length),
            });
        }
    }

    /**
     * @private
     * @method #isShortOrEmptyChapter
     * @param {number} start - Starting position of the chapter
     * @param {number} end - Ending position of the chapter
     * @returns {boolean} Whether the chapter is considered short or empty
     * @description Checks if a chapter's content length is below the minimum limit
     */
    #isShortOrEmptyChapter(start, end) {
        const contentLength = this.#getContentLength(start, end);
        const minLimit = this.#getMinLimit();

        return contentLength < minLimit;
    }

    /**
     * @private
     * @method #getContentLength
     * @param {number} start - Starting position
     * @param {number} end - Ending position
     * @returns {number} Content length (in lines or characters)
     * @description Calculates content length within specified range
     */
    #getContentLength(start, end) {
        // start often contains title, so we need to exclude it
        let realStart = start;
        let titleIndex = this.#allTitlesInd[start];
        if (titleIndex !== undefined) {
            realStart = this.#allTitles[titleIndex][1] + 1;
            try {
                if (realStart !== start + 1) {
                    // throw new Error("start: ", this.#allTitles[titleIndex][0], start, realStart);
                    throw new Error(PaginationCalculator.#ERROR_MESSAGES.INVALID_RANGE);
                }
            } catch (error) {
                console.error(
                    "Error in getContentLength",
                    {
                        title: this.#allTitles[titleIndex][0],
                        start,
                        realStart,
                        end,
                    },
                    error
                );
                realStart = start + 1;
            }
        }

        return this.#useCharCount ? this.#countContentChars(realStart, end) : this.#countContentLines(realStart, end);
    }

    /**
     * @private
     * @method #getContent
     * @param {number} start - Starting position
     * @param {number} end - Ending position
     * @returns {string} Concatenated content between start and end positions
     * @description Retrieves the actual content between two positions
     */
    #getContent(start, end) {
        return this.#contentChunks
            .slice(start, end)
            .map((chunk) => chunk.content)
            .join("\n");
    }

    /**
     * @private
     * @method #countContentLines
     * @param {number} start - Starting position
     * @param {number} end - Ending position
     * @returns {number} Number of content lines
     * @description Counts the number of actual content lines between positions, excluding titles
     */
    #countContentLines(start, end) {
        const cacheKey = `lines-${start}-${end}`;
        if (this.#contentLineCache.has(cacheKey)) {
            // this.#logger.log("Cache hit for countContentLines", { start, end });
            return this.#contentLineCache.get(cacheKey);
        }

        let count = 0;
        for (let i = start; i < end && i < this.#contentChunks.length; i++) {
            // Don't count title lines
            const titleIndex = this.#allTitlesInd[i];
            if (titleIndex !== undefined) {
                continue;
            }

            const charCount = this.#contentChunks[i].charCount;
            if (charCount && charCount > 0) {
                count++;
            }
        }

        this.#contentLineCache.set(cacheKey, count);
        return count;
    }

    /**
     * @private
     * @method #countContentChars
     * @param {number} start - Starting position
     * @param {number} end - Ending position
     * @returns {number} Number of characters
     * @description Counts the number of characters between positions, excluding titles
     */
    #countContentChars(start, end) {
        const cacheKey = `chars-${start}-${end}`;
        if (this.#contentCharCache.has(cacheKey)) {
            // this.#logger.log("Cache hit for countContentChars", { start, end });
            return this.#contentCharCache.get(cacheKey);
        }

        let count = 0;
        for (let i = start; i < end && i < this.#contentChunks.length; i++) {
            // Don't count title lines
            const titleIndex = this.#allTitlesInd[i];
            if (titleIndex !== undefined) {
                continue;
            }

            const charCount = this.#contentChunks[i].charCount;
            if (charCount && charCount > 0) {
                count += charCount;
            }
        }

        this.#contentCharCache.set(cacheKey, count);
        return count;
    }

    /**
     * @private
     * @method #handleLongChapters
     * @description Processes long chapters by adding additional break points where needed
     */
    #handleLongChapters() {
        // Create a copy because we will modify the original array
        const breaks = [...this.#breaks];

        for (let i = 0; i < breaks.length - 1; i++) {
            const start = breaks[i];
            const end = breaks[i + 1];

            if (this.#isLongChapter(start, end)) {
                this.#logger.log("Processing long chapter", {
                    title: this.#allTitles[this.#allTitlesInd[start]][0],
                    start_line: start,
                    end_line: end,
                });
                this.#processLongChapter(start, end);
            }
        }

        // Handle remaining short chapters, where start = breaks[i+1], end = this.#contentChunks.length
        if (this.#isLongChapter(breaks[breaks.length - 1], this.#contentChunks.length)) {
            this.#logger.log("Processing long chapter", {
                title: this.#allTitles[this.#allTitlesInd[breaks[breaks.length - 1]]][0],
                start_line: breaks[breaks.length - 1],
                end_line: this.#contentChunks.length,
            });
            this.#processLongChapter(breaks[breaks.length - 1], this.#contentChunks.length);
        }
    }

    /**
     * @private
     * @method #isLongChapter
     * @param {number} start - Starting position of the chapter
     * @param {number} end - Ending position of the chapter
     * @returns {boolean} Whether the chapter is considered long
     * @description Checks if a chapter's content length exceeds the maximum limit
     */
    #isLongChapter(start, end) {
        const contentLength = this.#getContentLength(start, end);
        const maxLimit = this.#getMaxLimit();

        return contentLength > maxLimit;
    }

    /**
     * @private
     * @method #processLongChapter
     * @param {number} start - Starting position of the chapter
     * @param {number} end - Ending position of the chapter
     * @description Recursively processes long chapters by finding optimal break points
     */
    #processLongChapter(start, end) {
        // Add safety checks
        if (start >= end || start < 0 || end > this.#contentChunks.length) {
            this.#logger.log("Invalid chapter range", { start, end });
            return;
        }

        const titlesInRange = this.#findTitlesInRange(start, end);

        if (titlesInRange.length > 0) {
            // Find the title position that creates the longest page (but not exceeding the max limit)
            const bestTitleBreak = this.#findBestTitleBreak(start, titlesInRange);

            if (bestTitleBreak) {
                // Found a suitable title break point
                this.#addBreakPoint(bestTitleBreak);
                // Recursively process the remaining content
                this.#processLongChapter(bestTitleBreak, end);
            } else {
                // No suitable title break point found, break by content length
                this.#breakByContentLength(start, end);
            }
        } else {
            // No titles in range, break by content length
            this.#breakByContentLength(start, end);
        }
    }

    /**
     * @private
     * @method #findTitlesInRange
     * @param {number} start - Starting position
     * @param {number} end - Ending position
     * @returns {Array<number>} Array of title positions within the range
     * @description Finds all title positions that fall within the specified range
     */
    #findTitlesInRange(start, end) {
        return this.#allTitles
            .filter((title) => {
                const pos = title[1];
                return pos > start && pos < end;
            })
            .map((title) => title[1]);
    }

    /**
     * @private
     * @method #findBestTitleBreak
     * @param {number} start - Starting position
     * @param {Array<number>} titlePositions - Array of potential title break positions
     * @returns {number|null} Best title position for break point, or null if none found
     * @description Finds the best title position for a break point that creates the longest valid page
     */
    #findBestTitleBreak(start, titlePositions) {
        const maxLimit = this.#getMaxLimit();
        const minLimit = this.#getMinLimit();

        // Find the title position that creates the longest page
        let bestTitle = null;
        let bestLength = 0;

        for (const titlePos of titlePositions) {
            const length = this.#getContentLength(start, titlePos);

            if (length >= minLimit && length <= maxLimit && length > bestLength) {
                bestTitle = titlePos;
                bestLength = length;
            }
        }

        return bestTitle;
    }

    /**
     * @private
     * @method #breakByContentLength
     * @param {number} start - Starting position
     * @param {number} end - Ending position
     * @description Calculates break points based on content length using either linear or jump search
     */
    #breakByContentLength(start, end) {
        const totalLength = this.#getContentLength(start, end);
        const maxLimit = this.#getMaxLimit();
        const minLimit = this.#getMinLimit();

        if (totalLength < maxLimit * 10) {
            // console.log("Using linear search:", { totalLength, maxLimit });
            // Previous implementation, efficient when end - start is reasonable.
            // This is because of the single loop instead of nested loops.
            // But this is not as efficient when end - start is large.
            let contentCount = 0;
            let lastBreakPoint = start;

            for (let j = start; j < end; j++) {
                if (this.#contentChunks[j]?.elementType !== "e") {
                    contentCount = this.#incrementCount(contentCount, j);
                }

                if (contentCount >= maxLimit) {
                    const newBreakPoint = j + 1;
                    if (
                        !this.#wouldCreateShortNextPage(newBreakPoint, end) &&
                        this.#isValidBreakPoint(lastBreakPoint, newBreakPoint)
                    ) {
                        this.#logger.log("Adding break point for long chapter");
                        if (this.#addBreakPoint(newBreakPoint)) {
                            lastBreakPoint = newBreakPoint;
                            contentCount = 0;
                        }
                    }
                }
            }
        } else {
            // console.log("Using jump search:", { totalLength, maxLimit });
            // Current implementation, efficient when end - start is large.
            // But not as efficient when end - start is small because of the nested loops.

            // Start accumulating content length from the current position
            let currentPos = start;

            while (currentPos < end) {
                let nextPos = currentPos + 1;
                let bestPos = currentPos + 1;

                // Find the farthest position that doesn't exceed maxLimit
                while (nextPos <= end) {
                    const length = this.#getContentLength(currentPos, nextPos);
                    if (length > maxLimit) break;
                    bestPos = nextPos;
                    nextPos++;
                }

                // If the found position creates a page length greater than minLimit, add a break point
                const pageLength = this.#getContentLength(currentPos, bestPos);
                if (pageLength >= minLimit && bestPos < end) {
                    this.#addBreakPoint(bestPos);
                }

                currentPos = bestPos;
            }
        }
    }

    /**
     * @private
     * @method #incrementCount
     * @param {number} currentCount - Current count
     * @param {string} line - Current line text
     * @returns {number} Updated count
     * @description Updates content count based on current line
     */
    #incrementCount(currentCount, index) {
        return currentCount + this.#getContentLength(index, index + 1);
    }

    /**
     * @private
     * @method #wouldCreateShortNextPage
     * @param {number} breakPoint - Potential break point
     * @param {number} endPoint - End position
     * @returns {boolean} Whether breaking at this point would create a short next page
     * @description Checks if adding a break point would result in a too-short following page
     */
    #wouldCreateShortNextPage(breakPoint, endPoint) {
        const contentLength = this.#getContentLength(breakPoint, endPoint);
        const minLimit = this.#useCharCount ? this.#config.MIN_CHARS : this.#config.MIN_LINES;
        const isShort = contentLength > 0 && contentLength < minLimit;
        this.#logger.log("Would create short next page?", {
            breakPoint,
            endPoint,
            contentLength,
            minLimit,
            useCharCount: this.#useCharCount,
            nextPageIsShort: isShort,
        });
        return isShort;
    }

    /**
     * @private
     * @method #validateFinalBreaks
     * @returns {SortedPageBreaksArray} Validated array of break points
     * @description Validates and filters break points, ensuring each pagination position is valid
     */
    #validateFinalBreaks() {
        // Create a copy because we will modify the original array
        const breaks = [...this.#breaks];

        this.#logger.log("Starting final validation", {
            breakPointsBeforeValidation: breaks,
        });

        // Create a new SortedPageBreaksArray to store the validated breaks
        // Always start with 0
        const validatedBreaks = new SortedPageBreaksArray(0);

        // Validate the rest of the breaks
        const otherBreaks = breaks.slice(1).filter((breakPoint, index, array) => {
            const nextBreakPoint = index === array.length - 1 ? this.#contentChunks.length : array[index + 1];
            const isValid = this.#isValidBreakPoint(breakPoint, nextBreakPoint);
            return isValid;
        });

        // Add the validated breaks to the final array
        validatedBreaks.push(...otherBreaks);

        this.#logger.log("Validation completed", {
            initialBreaks: this.#breaks,
            finalBreaks: validatedBreaks,
            totalPages: validatedBreaks.length,
        });

        // Ensure we always have at least the initial break point
        if (validatedBreaks.length === 0) {
            this.#logger.log("No valid breaks found, returning initial break point");
            return new SortedPageBreaksArray(0);
        }

        return validatedBreaks;
    }

    /**
     * @private
     * @method #isValidBreakPoint
     * @param {number} breakPoint - Current break point
     * @param {number} nextBreakPoint - Next break point
     * @returns {boolean} Whether the break point is valid
     * @description Checks if a given break point is a valid pagination position
     */
    #isValidBreakPoint(breakPoint, nextBreakPoint) {
        const cacheKey = `valid-${breakPoint}-${nextBreakPoint}`;
        if (this.#validBreakPointCache.has(cacheKey)) {
            return this.#validBreakPointCache.get(cacheKey);
        }

        try {
            let isValid = true;

            // Range validation
            if (breakPoint < 0 || nextBreakPoint > this.#contentChunks.length) {
                throw new Error(PaginationCalculator.#ERROR_MESSAGES.INVALID_RANGE);
            }
            if (breakPoint > nextBreakPoint) {
                throw new Error(PaginationCalculator.#ERROR_MESSAGES.INVALID_BREAK_POINT);
            }

            // Calculate actual content lines between these two break points
            const contentLength = this.#getContentLength(breakPoint, nextBreakPoint);
            const maxLimit = this.#getMaxLimit();
            const minLimit = this.#getMinLimit();

            // Check if this is the last page of a chapter
            const isLastPageOfChapter = this.#allTitles.some((title, index) => {
                const nextTitle = this.#allTitles[index + 1];
                return nextTitle && breakPoint < nextTitle[1] && nextBreakPoint >= nextTitle[1];
            });

            // For the last page of a chapter, if the content length is less than 30% of the max limit, it's not a valid break point.
            if (isLastPageOfChapter) {
                // this.#logger.log("Last page of chapter", {
                //     breakPoint,
                //     nextBreakPoint,
                //     contentLength,
                //     minLimit,
                //     useCharCount: this.#useCharCount,
                //     lastPageContent: this.#getContent(breakPoint, nextBreakPoint),
                // });
                if (contentLength < maxLimit * 0.3) {
                    isValid = false;
                }
            }

            // Check if minimum line count requirement is met
            if (contentLength < minLimit) {
                // If the content is too short, we don't add the break point.
                // If it's the last page of a chapter, we merge it with the previous page.
                isValid = false;
            }

            // Final check for content existence
            if (contentLength <= 0) {
                isValid = false;
            }

            this.#validBreakPointCache.set(cacheKey, isValid);

            // this.#logger.log("Break point validation", {
            //     breakPoint,
            //     nextBreakPoint,
            //     contentLength,
            //     minLimit,
            //     useCharCount: this.#useCharCount,
            //     isValid,
            // });

            return isValid;
        } catch (error) {
            console.error("Error in isValidBreakPoint", { breakPoint, nextBreakPoint }, error);
            this.#validBreakPointCache.set(cacheKey, false);
            return false;
        }
    }

    /**
     * @private
     * @method #validateInputs
     * @param {Array<Object>} contentChunks - Array of content chunks
     * @param {Array<Array>} allTitles - Array of titles
     * @param {Object} config - Configuration object
     * @throws {Error} When inputs are invalid
     * @description Validates input parameters for the calculator
     */
    #validateInputs(contentChunks, allTitles, config) {
        if (!Array.isArray(contentChunks) || !Array.isArray(allTitles)) {
            throw new Error(PaginationCalculator.#ERROR_MESSAGES.INVALID_INPUT);
        }
        // 1 instead of 2 because we might only have either a title page or an end page because we process the file twice if the file is large.
        if (allTitles.length < 1) {
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
     * @private
     * @method #adjustConfigForLanguage
     * @param {Object} config - Original configuration object
     * @returns {Object} Adjusted configuration object
     * @description Adjusts character limits based on language type (Eastern vs non-Eastern)
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
     * @private
     * @method #getMaxLimit
     * @returns {number} Maximum limit (either characters or lines)
     * @description Returns the maximum content limit based on current counting mode
     */
    #getMaxLimit() {
        return this.#useCharCount ? this.#config.MAX_CHARS : this.#config.MAX_LINES;
    }

    /**
     * @private
     * @method #getMinLimit
     * @returns {number} Minimum limit (either characters or lines)
     * @description Returns the minimum content limit based on current counting mode
     */
    #getMinLimit() {
        return this.#useCharCount ? this.#config.MIN_CHARS : this.#config.MIN_LINES;
    }

    /**
     * @private
     * @method #clearCaches
     * @description Clears all internal caches (HTML clean cache, content line cache, etc.)
     */
    #clearCaches() {
        this.#htmlCleanCache.clear();
        this.#contentLineCache.clear();
        this.#contentCharCache.clear();
        this.#validBreakPointCache.clear();
        this.#logger.log("Caches cleared");
    }
}
