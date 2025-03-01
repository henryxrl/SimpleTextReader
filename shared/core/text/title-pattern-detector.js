/**
 * @fileoverview Title Detector module, used to identify and extract chapter title patterns from text content.
 *
 * The main functions of this module include:
 * - Detecting common patterns of chapter titles from text (such as "第n章" or "Chapter n")
 * - Supporting the parsing of Chinese and English numbers (Arabic numerals, Chinese numerals, and Roman numerals)
 * - Scoring the detected patterns, considering factors such as:
 *   - Pattern frequency
 *   - Continuity of the numerical sequence
 *   - Completeness and validity of the pattern
 *
 * Usage example:
 * ```javascript
 * const lines = ["第1章 序章", "第2章 开始", "第3章 征程"];
 * const patterns = TitlePatternDetector.detectTitlePatternAsRegexRule(lines);
 * // Returns: {pattern: "第{n}章 {text}", numberType: "arabic", score: 0.8, ...}
 * ```
 *
 * @module shared/core/text/title-pattern-detector
 * @requires shared/utils/logger
 * @requires shared/core/text/regex-rules
 * @see {@link REGEX_COMPONENTS} Regular expression components used for title detection
 * @see {@link REGEX_RULES} Basic regular expression rules
 * @see {@link updateTitleRules} Updates title matching rules
 */

import { Logger } from "../../utils/logger.js";
import { REGEX_COMPONENTS, REGEX_RULES, updateTitleRules } from "./regex-rules.js";

/**
 * Title Pattern Detector class
 * @class
 * @classdesc A class used to identify and extract chapter title patterns from text content.
 * This class provides a series of static methods for:
 * - Detecting chapter title patterns in text
 * - Parsing chapter numbers in different formats (Chinese, Arabic, Roman numerals)
 * - Evaluating and ranking detected patterns
 *
 * @property {string} #TOKEN_NUMBER - Token for number in pattern
 * @property {string} #TOKEN_TEXT - Token for text in pattern
 * @property {number} #maxLineLength - Maximum line length for title detection
 * @property {string[]} #titleWords - Title vocabulary constructed from REGEX_COMPONENTS
 * @property {string[]} #titleWordsChineseSuffix - Title vocabulary for Chinese suffix
 * @property {string} #numberPatternStr - Number pattern string extracted from REGEX_COMPONENTS
 * @property {Object} #numberPatternDict - Number pattern dictionary to switch regex pattern strings for different number types
 * @property {RegExp} #numberPattern - Number regular expression extracted from REGEX_COMPONENTS
 * @property {RegExp} #puncPattern - Punctuation and symbol regular expression extracted from REGEX_RULES
 * @property {RegExp} #puncPatternWithSpace - Punctuation and symbol regular expression with space extracted from REGEX_RULES
 * @property {Object[]} validTitlePatterns - Valid patterns detected
 * @property {string} bestPattern - Best pattern
 * @property {string} bestPatternNumberType - Best pattern number type
 * @property {string} bestPatternRegexStr - Best pattern regex string
 */
export class TitlePatternDetector {
    /**
     * @type {Logger} Logger instance
     * @private
     * @static
     */
    static #logger = Logger.getLogger(TitlePatternDetector, false);

    /**
     * @type {string} Token for number in pattern
     * @type {string} Token for text in pattern
     * @private
     */
    static #TOKEN_NUMBER = "{n}";
    static #TOKEN_TEXT = "{text}";

    /**
     * Maximum line length
     * @type {number}
     * @private
     */
    static #maxLineLength = 100;

    /**
     * Title vocabulary constructed from REGEX_COMPONENTS
     * @type {string[]}
     * @private
     * @description
     * Only Chinese and English vocabulary are extracted here, without extracting numbers
     * Numbers are handled in #parseChapterNumber
     */
    static #titleWords = [
        ...Array.from(REGEX_COMPONENTS.TITLES_CHINESE.PRE_1.match(/[\u4e00-\u9fff]/g)),
        // ...Array.from(REGEX_COMPONENTS.TITLES_CHINESE.POST_1.match(/[\u4e00-\u9fff]/g)),
        ...REGEX_COMPONENTS.TITLES_CHINESE_OTHER.split("|"),
        ...REGEX_COMPONENTS.TITLES_ENGLISH.split("|").map((word) => word.toLowerCase()),
        ...REGEX_COMPONENTS.TITLES_ENGLISH_OTHER.split("|").map((word) => word.toLowerCase()),
    ];

    /**
     * Title vocabulary for Chinese suffix
     * @type {string[]}
     * @private
     * @description
     * Only Chinese characters are extracted here, without extracting numbers
     * Numbers are handled in #parseChapterNumber
     */
    static #titleWordsChineseSuffix = [...Array.from(REGEX_COMPONENTS.TITLES_CHINESE.POST_1.match(/[\u4e00-\u9fff]/g))];

    /**
     * Number patterns extracted from REGEX_COMPONENTS
     * @type {string} Number pattern string
     * @type {Object} Number pattern dictionary
     * @type {RegExp} Number pattern
     * @private
     */
    static #numberPatternStr = `(?:[${REGEX_COMPONENTS.NUMBER_CHINESE}]+|${REGEX_COMPONENTS.NUMBER_ENGLISH_AND_ROMAN_NUMERALS})`;
    static #numberPatternDict = {
        chinese: `[${REGEX_COMPONENTS.NUMBER_CHINESE.slice(0, -3)}]+`,
        arabic: "[0-9]+",
        roman: REGEX_COMPONENTS.NUMBER_ENGLISH_AND_ROMAN_NUMERALS.replace(`[0-9]+|`, ""),
    };
    static #numberPattern = new RegExp(this.#numberPatternStr);

    /**
     * Extracting punctuation, symbols and spaces from REGEX_RULES
     * @type {RegExp} Punctuation and symbol regular expression
     * @type {RegExp} Punctuation and symbol regular expression with space
     * @private
     */
    static #puncPattern = new RegExp(`[${REGEX_RULES.PUNCTUATION}]+|${REGEX_RULES.SYMBOLS}`, "gu");
    static #puncPatternWithSpace = new RegExp(`[${REGEX_RULES.PUNCTUATION}]+|${REGEX_RULES.SYMBOLS}|\\s`, "u");

    /**
     * Valid patterns detected
     * @type {Object}
     * @public
     */
    static validTitlePatterns = {};

    /**
     * Best patterns with their detailed information
     * @type {Object}
     * @public
     */
    static bestPatterns = {};

    /**
     * Final custom rules
     * @type {string[]}
     * @public
     */
    static finalCustomRules = [];

    /**
     * Detecting patterns in lines and converting them to regex
     * @param {string[]} lines
     * @public
     */
    static detectTitlePatternAsRegexRule(lines, consoleLog = true) {
        // Step 1: Detect valid patterns
        this.validTitlePatterns = this.#detectPatterns(lines);

        if (!this.validTitlePatterns || Object.keys(this.validTitlePatterns).length === 0) {
            this.#logger.log("No valid chapter title patterns detected");
            return;
        }

        this.#logger.log("Detected chapter title patterns", this.validTitlePatterns);

        // Step 2: Select the most likely valid pattern
        this.bestPatterns = Object.fromEntries(
            Object.entries(this.validTitlePatterns)
                .map(([key, patterns]) => {
                    if (!patterns || patterns.length === 0) {
                        return [key, null];
                    }

                    // Find the item with the highest score
                    const bestItem = patterns.reduce(
                        (best, item) => (item.score > best.score ? item : best),
                        patterns[0]
                    );
                    if (bestItem) {
                        bestItem.pattern_escaped =
                            this.#escapeRegExp(bestItem.pattern).replace(
                                this.#escapeRegExp(this.#TOKEN_NUMBER),
                                this.#numberPatternDict[key]
                            ) + "\\s*";
                        if (bestItem.hasMoreContent) {
                            bestItem.pattern += this.#TOKEN_TEXT;
                            bestItem.pattern_escaped += `(.{0,${this.#maxLineLength}})`;
                        }
                    }
                    return [key, bestItem];
                })
                .filter(([key, value]) => value !== null)
        );
        this.#logger.log("Selected best patterns", this.bestPatterns);

        if (Object.keys(this.bestPatterns).length === 0) {
            this.#logger.log("No valid pattern found to construct regex");
            return;
        }

        // Step 3: Construct the custom regex rule
        try {
            // Find the best score pattern in this.bestPatterns across all number types
            // At the end, we want to minimize the number of custom rules constructed
            const bestPattern = Object.values(this.bestPatterns).reduce((best, pattern) =>
                pattern.score > best.score ? pattern : best
            );
            const bestPatternRegexStr = `^(\\s*${bestPattern.pattern_escaped}$)`;
            this.#logger.log("Constructed best pattern regex", bestPatternRegexStr);
            if (consoleLog) {
                console.log("Chapter title pattern detected:", {
                    pattern: bestPattern.pattern,
                    numberType: bestPattern.numberType,
                    score: bestPattern.score,
                    regex: bestPatternRegexStr,
                });
            }
            this.finalCustomRules = [];
            this.finalCustomRules.push(bestPatternRegexStr);

            // // For each number type, construct a regex rule
            // for (const [key, pattern] of Object.entries(this.bestPatterns)) {
            //     const bestPatternRegexStr = `^\\s*(${pattern.pattern_escaped})\\s*(.{0,${this.#maxLineLength}})$`;
            //     this.#logger.log("Constructed best pattern regex", bestPatternRegexStr);
            //     this.finalCustomRules.push(bestPatternRegexStr);
            // }

            updateTitleRules(this.finalCustomRules);
        } catch (error) {
            this.#logger.log("Error constructing regex from pattern", this.bestPatterns, error);
        }
    }

    /**
     * Detecting patterns in lines
     * @param {string[]} lines
     * @returns {Object}
     * @public
     * @description
     * This method is the optimized version of detectPatternsOriginal
     */
    static #detectPatterns(lines) {
        // First, collect all lines containing numbers
        const numberedLines = [];

        lines.forEach((line, index) => {
            line = line.trim();

            // If the line is empty or too long, it is not a valid title
            if (!line || line.length > this.#maxLineLength) return;

            // If the line doesn't contain a number, it is not a valid title
            const numberMatch = line.match(this.#numberPattern);
            if (!numberMatch) return;

            const number = numberMatch[0];
            const parsedNumberResult = this.#parseChapterNumber(number);
            if (parsedNumberResult === null) return;
            const { value: parsedNumber, type: numberType } = parsedNumberResult;

            // If the number is not a valid number, it is not a valid title
            if (parsedNumber === null) return;

            // Replace the number with the placeholder this.#TOKEN_NUMBER
            const patternWithPlaceholder = line.replace(number, this.#TOKEN_NUMBER);
            this.#logger.log("Detected pattern with placeholder", { line, patternWithPlaceholder });

            // Check if the line is a potential title line
            if (!this.#isPotentialTitleLine(patternWithPlaceholder)) return;

            numberedLines.push({
                original: line,
                pattern: patternWithPlaceholder,
                number: parsedNumber,
                numberType,
                index,
            });
        });

        this.#logger.log("Detected lines", numberedLines);

        // Second, find pattern intersections
        const patternGroups = {};
        for (let i = 0; i < numberedLines.length; i++) {
            const data1 = numberedLines[i];

            for (let j = 0; j < numberedLines.length; j++) {
                if (i === j) continue;

                const data2 = numberedLines[j];

                // Performance optimization: If the lengths of two patterns are too different, they are likely not the same type of title
                // if (Math.abs(data1.pattern.length - data2.pattern.length) > 10) continue;
                // But this will introduce bugs, e.g., ["1811. The first rotary press built by an American, William Bullock, appeared in 1863.", "1. Twenty-first century - Forecasts.", "2. Technology - Social aspects."]

                const [commonPattern, hasMoreContent] = this.#findLongestCommonPattern(data1.pattern, data2.pattern);
                if (!commonPattern) continue;

                if (!patternGroups[commonPattern]) {
                    patternGroups[commonPattern] = {
                        count: 0,
                        hasMoreContent,
                        examples: [],
                        numbers: [],
                        numberTypes: [],
                        lineIndices: new Set(),
                        originalData: [], // Save the original data for later grouping by number type
                    };
                }

                const group = patternGroups[commonPattern];
                if (!group.lineIndices.has(data1.index)) {
                    group.count++;
                    group.lineIndices.add(data1.index);
                }
                group.examples.push(data1.original);
                group.numbers.push(data1.number);
                group.numberTypes.push(data1.numberType);
                group.originalData.push({
                    example: data1.original,
                    number: data1.number,
                    numberType: data1.numberType,
                });
            }
        }

        // Third, evaluate patterns
        const validPatterns = {};
        Object.entries(patternGroups).forEach(([pattern, data]) => {
            this.#logger.log("Evaluating pattern", pattern);

            // First, ensure the pattern contains this.#TOKEN_NUMBER
            if (!pattern.includes(this.#TOKEN_NUMBER)) return;
            // Ensure the pattern is a valid title pattern
            if (!this.#isValidTitlePattern(pattern)) return;
            this.#logger.log("Pattern is valid");

            // Group by number type
            const patternsByType = {};
            data.originalData.forEach((item) => {
                if (!patternsByType[item.numberType]) {
                    patternsByType[item.numberType] = {
                        examples: [],
                        numbers: [],
                        hasMoreContent: false,
                    };
                }
                const typeGroup = patternsByType[item.numberType];
                typeGroup.examples.push(item.example);
                typeGroup.numbers.push(item.number);
                typeGroup.hasMoreContent = data.hasMoreContent;
            });

            // Evaluate each type separately
            Object.entries(patternsByType).forEach(([numberType, typeGroup]) => {
                // Sort numbers for sequence checking
                typeGroup.numbers.sort((a, b) => a - b);

                // Remove duplicates
                typeGroup.numbers = [...new Set(typeGroup.numbers)];
                typeGroup.examples = [...new Set(typeGroup.examples)];

                const actualCount = typeGroup.examples.length;
                this.#logger.log(`Count for ${numberType}`, {
                    actualCount,
                    examples: typeGroup.examples,
                    numbers: typeGroup.numbers,
                    hasMoreContent: typeGroup.hasMoreContent,
                });

                // Check the continuity of numbers for this type
                const isSequential = this.#checkNumberSequence(typeGroup.numbers);

                const score = this.#calculatePatternScore({
                    frequency: actualCount / lines.length,
                    isSequential,
                    pattern,
                    examples: typeGroup.examples.slice(0, 10),
                    numbers: typeGroup.numbers,
                });

                if (score > 0.3) {
                    if (!validPatterns[numberType]) {
                        validPatterns[numberType] = [];
                    }
                    validPatterns[numberType].push({
                        pattern,
                        score,
                        count: actualCount,
                        hasMoreContent: typeGroup.hasMoreContent,
                        examples: typeGroup.examples,
                        numbers: typeGroup.numbers,
                        numberType,
                    });
                }
            });
        });

        return validPatterns;
    }

    /**
     * Calculating the score of a pattern
     * @param {Object} params
     * @param {number} params.frequency
     * @param {boolean} params.isSequential
     * @param {string} params.pattern
     * @param {string[]} params.examples
     * @returns {number}
     * @private
     */
    static #calculatePatternScore({ frequency, isSequential, pattern, examples, numbers }) {
        let score = 0;

        // 1. Frequency score (0-0.4)
        score += Math.min(frequency * 10, 0.4);

        // 2. Sequential score (0-0.3)
        if (isSequential) {
            score += 0.3;
        }

        // 3. Pattern length score (0-0.3)
        // Calculate the actual pattern length excluding this.#TOKEN_NUMBER and this.#TOKEN_TEXT
        const patternLength = pattern.replace(this.#TOKEN_NUMBER, "").replace(this.#TOKEN_TEXT, "").length;
        score += Math.min(patternLength / 10, 0.3); // The longer the pattern, the higher the score

        // 4. Roman numeral special handling
        const isRomanPattern = examples.some((ex) => {
            const match = ex.match(this.#numberPattern);
            return match && /^[IVXLCDMivxlcdm]+$/.test(match[0]);
        });

        if (isRomanPattern) {
            const hasSmallNumbers = numbers.some((n) => n >= 1 && n <= 4);
            const onlyLargeNumbers = numbers.every((n) => [5, 10, 50, 100, 500, 1000].includes(n));
            if (!hasSmallNumbers && onlyLargeNumbers) {
                // If there are only large numbers (V, L, C, D, M) and no small numbers, it may be a false positive
                // e.g., "M. Morrel"
                score *= 0.1;
            } else if (numbers.includes(1) && !numbers.includes(2)) {
                // If there is 1 but no 2, it may be a false positive
                // e.g., "I am..."
                score *= 0.1;
            }
        }

        return score;
    }

    /**
     * Checking if a line is a potential title line
     * @param {string} line
     * @returns {boolean}
     * @private
     */
    static #isPotentialTitleLine(patternWithPlaceholder) {
        // Split the line by this.#TOKEN_NUMBER
        const parts = patternWithPlaceholder.split(this.#TOKEN_NUMBER);
        if (parts.length !== 2) return false;

        // Get meaningful characters
        const prefix = parts[0].replace(this.#puncPattern, "").trim().toLowerCase();
        const suffix = parts[1].toLowerCase();
        const suffixExists = suffix.length > 0;
        const suffixStartsWithPuncOrSpaceOrEmpty = suffixExists ? this.#puncPatternWithSpace.test(suffix[0]) : true;
        const suffixStartsWithValidChinese = suffixExists ? this.#titleWordsChineseSuffix.includes(suffix[0]) : false;
        const suffixStartsWithValidChineseThenPuncOrSpaceOrEmpty =
            suffixStartsWithValidChinese && (suffix.length === 1 || this.#puncPatternWithSpace.test(suffix[1]));

        // If the line starts with this.#TOKEN_NUMBER, it is a potential title line
        if (prefix === "") {
            if (suffixStartsWithPuncOrSpaceOrEmpty) {
                this.#logger.log('[isPotentialTitleLine][Prefix ""] Potential title line', {
                    patternWithPlaceholder,
                    suffixStartsWithPuncOrSpaceOrEmpty,
                });
                return true;
            } else {
                this.#logger.log('[isPotentialTitleLine][Prefix ""] Invalid potential title line', {
                    patternWithPlaceholder,
                    suffixStartsWithPuncOrSpaceOrEmpty,
                });
                return false;
            }
        }

        // If the line starts with a valid title character/word after ignoring punctuation, it is a potential title line

        // 1. First, try full word matching
        if (this.#titleWords.some((word) => prefix.startsWith(word))) {
            if (suffixStartsWithPuncOrSpaceOrEmpty || suffixStartsWithValidChineseThenPuncOrSpaceOrEmpty) {
                this.#logger.log("[isPotentialTitleLine][StartsWithValidChineseWord] Full word matching succeeded", {
                    word: this.#titleWords.some((word) => prefix.startsWith(word)),
                    patternWithPlaceholder,
                    suffixStartsWithPuncOrSpaceOrEmpty,
                    suffixStartsWithValidChinese,
                    suffixStartsWithValidChineseThenPuncOrSpaceOrEmpty,
                });
                return true;
            } else {
                this.#logger.log("[isPotentialTitleLine][StartsWithValidChineseWord] Invalid potential title line", {
                    patternWithPlaceholder,
                    suffixStartsWithPuncOrSpaceOrEmpty,
                    suffixStartsWithValidChinese,
                    suffixStartsWithValidChineseThenPuncOrSpaceOrEmpty,
                });
                return false;
            }
        }
        this.#logger.log("[isPotentialTitleLine][StartsWithValidChineseWord] Full word matching failed");

        // 2. If full word matching fails, try single character matching for Chinese characters
        const chineseChars = prefix.match(/[\u4e00-\u9fff]/g);
        if (chineseChars) {
            if (chineseChars.every((char) => this.#titleWords.some((word) => word.startsWith(char)))) {
                // If the first character of the suffix is in the titleWordsChineseSuffix, it is a valid title line
                if (suffixStartsWithPuncOrSpaceOrEmpty || suffixStartsWithValidChineseThenPuncOrSpaceOrEmpty) {
                    this.#logger.log("[isPotentialTitleLine] Single character matching succeeded", {
                        char: chineseChars.every((char) => this.#titleWords.some((word) => word.startsWith(char))),
                        patternWithPlaceholder,
                        suffixStartsWithValidChinese,
                        suffixStartsWithValidChineseThenPuncOrSpaceOrEmpty,
                    });
                    return true;
                } else {
                    this.#logger.log("[isPotentialTitleLine] Invalid potential title line", {
                        patternWithPlaceholder,
                        suffixStartsWithValidChinese,
                        suffixStartsWithValidChineseThenPuncOrSpaceOrEmpty,
                    });
                    return false;
                }
            }
        }
        this.#logger.log("[isPotentialTitleLine] Chinese character matching failed");

        // 3. If not Chinese and full word matching fails, it is considered an invalid pattern
        return false;
    }

    /**
     * Checking if a pattern is a valid title pattern
     * @param {string} pattern
     * @returns {boolean}
     * @private
     */
    static #isValidTitlePattern(pattern) {
        // If the pattern only contains this.#TOKEN_NUMBER and spaces, it is valid
        const strippedPattern = pattern.replace(this.#TOKEN_NUMBER, "").trim();
        if (!strippedPattern) {
            this.#logger.log("[isValidTitlePattern][strippedPattern] Valid pattern", {
                pattern,
                strippedPattern,
            });
            return true;
        }

        // Check if the non-space characters in the pattern are in the title vocabulary
        const meaningfulChars = strippedPattern.replace(this.#puncPattern, "").toLowerCase();
        if (!meaningfulChars.trim()) {
            // If there is no content after removing all spaces and parentheses, it is also valid
            this.#logger.log("[isValidTitlePattern][meaningfulChars] Valid pattern", {
                pattern,
                meaningfulChars,
            });
            return true;
        }
        // this.#logger.log("Meaningful characters", meaningfulChars);

        // Split the pattern by this.#TOKEN_NUMBER and check individually
        const parts = pattern.split(this.#TOKEN_NUMBER);
        if (parts.length !== 2) return false;

        // Get meaningful characters
        const prefix = parts[0].replace(this.#puncPattern, "").trim().toLowerCase();
        const suffix = parts[1].toLowerCase();
        const suffixExists = suffix.length > 0;
        const suffixStartsWithPuncOrSpaceOrEmpty = suffixExists ? this.#puncPatternWithSpace.test(suffix[0]) : true;
        const suffixStartsWithValidChinese = suffixExists ? this.#titleWordsChineseSuffix.includes(suffix[0]) : false;
        const suffixStartsWithValidChineseThenPuncOrSpaceOrEmpty =
            suffixStartsWithValidChinese && (suffix.length === 1 || this.#puncPatternWithSpace.test(suffix[1]));

        // If the line starts with this.#TOKEN_NUMBER, it is a valid pattern
        if (prefix === "") {
            if (suffixStartsWithPuncOrSpaceOrEmpty) {
                const suffixStripped = suffix.replace(this.#puncPattern, "").trim();
                if (suffixStripped) {
                    this.#logger.log(
                        '[isValidTitlePattern][Prefix ""][suffixStartsWithPuncOrSpaceOrEmpty] Invalid pattern',
                        {
                            pattern,
                            suffixStartsWithPuncOrSpaceOrEmpty,
                            suffixStripped,
                        }
                    );
                    return false;
                } else {
                    this.#logger.log(
                        '[isValidTitlePattern][Prefix ""][suffixStartsWithPuncOrSpaceOrEmpty] Valid pattern',
                        {
                            pattern,
                            suffixStartsWithPuncOrSpaceOrEmpty,
                        }
                    );
                    return true;
                }
            } else if (suffixStartsWithValidChineseThenPuncOrSpaceOrEmpty) {
                const suffixStripped = suffix.slice(1).replace(this.#puncPattern, "").trim();
                if (suffixStripped) {
                    this.#logger.log(
                        '[isValidTitlePattern][Prefix ""][suffixStartsWithValidChineseThenPuncOrSpaceOrEmpty] Invalid pattern',
                        {
                            pattern,
                            suffixStartsWithValidChineseThenPuncOrSpaceOrEmpty,
                            suffixStripped,
                        }
                    );
                    return false;
                } else {
                    this.#logger.log(
                        '[isValidTitlePattern][Prefix ""][suffixStartsWithValidChineseThenPuncOrSpaceOrEmpty] Valid pattern',
                        {
                            pattern,
                            suffixStartsWithValidChineseThenPuncOrSpaceOrEmpty,
                        }
                    );
                    return true;
                }
            } else {
                this.#logger.log('[isValidTitlePattern][Prefix ""] Invalid pattern', {
                    pattern,
                    suffixStartsWithPuncOrSpaceOrEmpty,
                    suffixStartsWithValidChinese,
                    suffixStartsWithValidChineseThenPuncOrSpaceOrEmpty,
                });
                return false;
            }
        }

        // If the line starts with a valid title character/word after ignoring punctuation, it is a potential title line

        // 1. First, try full word matching
        if (this.#titleWords.some((word) => prefix.startsWith(word))) {
            if (suffixStartsWithPuncOrSpaceOrEmpty) {
                const suffixStripped = suffix.replace(this.#puncPattern, "").trim();
                if (suffixStripped) {
                    this.#logger.log(
                        "[isValidTitlePattern][StartsWithValidChineseWord][suffixStartsWithPuncOrSpaceOrEmpty] Invalid pattern",
                        {
                            pattern,
                            suffixStartsWithPuncOrSpaceOrEmpty,
                            suffixStripped,
                        }
                    );
                    return false;
                } else {
                    this.#logger.log(
                        "[isValidTitlePattern][StartsWithValidChineseWord][suffixStartsWithPuncOrSpaceOrEmpty] Valid pattern",
                        {
                            pattern,
                            suffixStartsWithPuncOrSpaceOrEmpty,
                        }
                    );
                    return true;
                }
            } else if (suffixStartsWithValidChineseThenPuncOrSpaceOrEmpty) {
                const suffixStripped = suffix.slice(1).replace(this.#puncPattern, "").trim();
                if (suffixStripped) {
                    this.#logger.log(
                        "[isValidTitlePattern][StartsWithValidChineseWord][suffixStartsWithValidChineseThenPuncOrSpaceOrEmpty] Invalid pattern",
                        {
                            pattern,
                            suffixStartsWithValidChineseThenPuncOrSpaceOrEmpty,
                            suffixStripped,
                        }
                    );
                    return false;
                } else {
                    this.#logger.log(
                        "[isValidTitlePattern][StartsWithValidChineseWord][suffixStartsWithValidChineseThenPuncOrSpaceOrEmpty] Valid pattern",
                        {
                            pattern,
                            suffixStartsWithValidChineseThenPuncOrSpaceOrEmpty,
                        }
                    );
                    return true;
                }
            } else {
                this.#logger.log("[isValidTitlePattern][StartsWithValidChineseWord] Invalid pattern", {
                    pattern,
                    suffixStartsWithPuncOrSpaceOrEmpty,
                    suffixStartsWithValidChinese,
                    suffixStartsWithValidChineseThenPuncOrSpaceOrEmpty,
                });
                return false;
            }
        }
        this.#logger.log("[isValidTitlePattern][StartsWithValidChineseWord] Full word matching failed");

        // 2. If full word matching fails, try single character matching for Chinese characters
        const chineseChars = prefix.match(/[\u4e00-\u9fff]/g);
        if (chineseChars) {
            if (chineseChars.every((char) => this.#titleWords.some((word) => word.startsWith(char)))) {
                // If the first character of the suffix is in the titleWordsChineseSuffix, it is a valid title line
                if (suffixStartsWithPuncOrSpaceOrEmpty || suffixStartsWithValidChineseThenPuncOrSpaceOrEmpty) {
                    this.#logger.log("[isValidTitlePattern] Single character matching succeeded", {
                        char: chineseChars.every((char) => this.#titleWords.some((word) => word.startsWith(char))),
                        pattern,
                        suffixStartsWithValidChinese,
                        suffixStartsWithValidChineseThenPuncOrSpaceOrEmpty,
                    });
                    return true;
                } else {
                    this.#logger.log("[isValidTitlePattern] Invalid potential title line", {
                        pattern,
                        suffixStartsWithValidChinese,
                        suffixStartsWithValidChineseThenPuncOrSpaceOrEmpty,
                    });
                    return false;
                }
            }
        }
        this.#logger.log("[isValidTitlePattern] Chinese character matching failed");

        // 3. If not Chinese and full word matching fails, it is considered an invalid pattern
        return false;
    }

    /**
     * Checking if the sequence of numbers is continuous
     * @param {number[]} numbers
     * @returns {boolean}
     * @private
     */
    static #checkNumberSequence(numbers) {
        if (numbers.length < 2) return false;

        // Sort and remove duplicates
        const uniqueNumbers = [...new Set(numbers)].sort((a, b) => a - b);

        // 1. Check basic continuity
        let gaps = 0;
        let totalGaps = 0;
        for (let i = 1; i < uniqueNumbers.length; i++) {
            const currentGap = uniqueNumbers[i] - uniqueNumbers[i - 1] - 1;
            if (currentGap > 0) {
                gaps++;
                totalGaps += currentGap;
            }
        }

        // 2. Calculate statistical indicators
        const avgGap = totalGaps / uniqueNumbers.length;
        const gapRatio = gaps / uniqueNumbers.length;

        // 3. Evaluate the quality of the sequence
        // - Allow some skipping of chapters (e.g., from Chapter 1 to Chapter 3)
        // - But do not allow skipping too far (e.g., from Chapter 1 to Chapter 100)
        // - The frequency of skipping chapters should not be too high
        return avgGap < 5 && gapRatio < 0.3;
    }

    /**
     * Finding the longest common pattern between two patterns
     * @param {string} pattern1
     * @param {string} pattern2
     * @returns {[string|null, boolean]} - The longest common pattern and a flag indicating if there is more content
     * @private
     */
    static #findLongestCommonPattern(pattern1, pattern2) {
        let commonPattern = "";
        let i = 0;

        // Find the longest common prefix
        while (i < pattern1.length && i < pattern2.length) {
            if (pattern1[i] !== pattern2[i]) break;
            commonPattern += pattern1[i];
            i++;
        }

        // If the common pattern does not contain this.#TOKEN_NUMBER or is too short, it is invalid
        if (!commonPattern.includes(this.#TOKEN_NUMBER) || commonPattern.length < 3) {
            return [null, false];
        }

        // If the pattern ends with this.#TOKEN_NUMBER, it is a valid pattern
        if (commonPattern.endsWith(this.#TOKEN_NUMBER)) {
            // Check if there's more content in either pattern
            if (i < pattern1.length || i < pattern2.length) {
                return [commonPattern, true];
            }
            return [commonPattern, false];
        }

        // Ensure the pattern ends with a meaningful separator
        // Temporarily replace this.#TOKEN_NUMBER with a special token before checking separators
        const TEMP_TOKEN = "\uFFFF"; // Using a rare Unicode character as temporary token
        const patternWithoutPlaceholder = commonPattern.replace(this.#TOKEN_NUMBER, TEMP_TOKEN);
        const lastChar = patternWithoutPlaceholder[patternWithoutPlaceholder.length - 1];

        if (!this.#puncPatternWithSpace.test(lastChar)) {
            // Roll back to the last valid separator
            let foundValidEnding = false;
            for (let j = commonPattern.length - 1; j >= 0; j--) {
                if (this.#puncPatternWithSpace.test(patternWithoutPlaceholder[j])) {
                    // If a separator is found, check if the characters before it are a valid title pattern
                    const beforeSeparator = patternWithoutPlaceholder
                        .substring(0, j)
                        .replace(TEMP_TOKEN, this.#TOKEN_NUMBER)
                        .replace(this.#TOKEN_NUMBER, "")
                        .trim();
                    if (this.#isValidTitlePattern(beforeSeparator)) {
                        commonPattern = commonPattern.substring(0, j + 1);
                        foundValidEnding = true;
                        break;
                    }
                }
            }

            // If no valid separator is found, but the entire pattern is a valid title pattern, also keep it
            if (!foundValidEnding && !this.#isValidTitlePattern(commonPattern)) {
                return [null, false];
            }
        }

        // Check if there's more content in either pattern
        if (i < pattern1.length || i < pattern2.length) {
            return [commonPattern, true];
        }

        return [commonPattern, false];
    }

    /**
     * Parsing a chapter number
     * @param {string} number - The number to parse
     * @returns {Object|null} Returns an object with the parsed number and its type, or null if it is not a valid number
     * @property {number} value - The parsed number
     * @property {string} type - The type of the number ("arabic"|"roman"|"chinese")
     * @private
     */
    static #parseChapterNumber(number) {
        // If it is an Arabic numeral
        if (/^\d+$/.test(number)) {
            return {
                value: parseInt(number),
                type: "arabic",
            };
        }

        // If it is a Roman numeral
        if (/^[IVXLCDMivxlcdm]+$/.test(number)) {
            return {
                value: this.#romanToInt(number),
                type: "roman",
            };
        }

        // If it is a Chinese numeral
        const chineseValue = this.#chineseToInt(number);
        if (chineseValue !== null) {
            return {
                value: chineseValue,
                type: "chinese",
            };
        }

        return null;
    }

    /**
     * Converting a Roman numeral to an integer
     * @param {string} roman
     * @returns {number|null}
     * @private
     */
    static #romanToInt(roman) {
        const romanValues = {
            i: 1,
            v: 5,
            x: 10,
            l: 50,
            c: 100,
            d: 500,
            m: 1000,
        };

        roman = roman.toLowerCase();
        let result = 0;

        for (let i = 0; i < roman.length; i++) {
            const current = romanValues[roman[i]];
            const next = romanValues[roman[i + 1]];

            if (next > current) {
                result += next - current;
                i++;
            } else {
                result += current;
            }
        }

        return result;
    }

    /**
     * Converting a Chinese numeral to an integer
     * @param {string} chinese
     * @returns {number|null}
     * @private
     */
    static #chineseToInt(chinese) {
        const chineseNums = {
            零: 0,
            一: 1,
            二: 2,
            两: 2,
            三: 3,
            四: 4,
            五: 5,
            六: 6,
            七: 7,
            八: 8,
            九: 9,
            十: 10,
            百: 100,
            千: 1000,
            万: 10000,
            壹: 1,
            贰: 2,
            叁: 3,
            肆: 4,
            伍: 5,
            陆: 6,
            柒: 7,
            捌: 8,
            玖: 9,
            拾: 10,
            佰: 100,
            仟: 1000,
            萬: 10000,
            "○": 0,
            "０": 0,
            "１": 1,
            "２": 2,
            "３": 3,
            "４": 4,
            "５": 5,
            "６": 6,
            "７": 7,
            "８": 8,
            "９": 9,
        };

        let result = 0;
        let temp = 0;
        let lastUnit = 1;

        for (let i = 0; i < chinese.length; i++) {
            const char = chinese[i];
            const num = chineseNums[char];

            if (num === undefined) {
                return null;
            }

            if (num >= 10) {
                if (temp === 0) temp = 1;
                if (num > lastUnit) {
                    result = (result + temp) * num;
                    temp = 0;
                    lastUnit = num;
                } else {
                    result += temp * num;
                    temp = 0;
                }
            } else {
                temp = num;
            }
        }

        if (temp > 0) result += temp;
        return result || null;
    }

    /**
     * Escaping special characters in a string for use in a regular expression
     * @param {string} str
     * @returns {string}
     * @private
     */
    static #escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    /**
     * Detecting patterns in lines
     * @param {string[]} lines
     * @returns {Object[]}
     * @private
     * @description
     * This method is the original version of detectPatterns
     * @deprecated
     */
    static #detectPatternsOriginal(lines) {
        const patterns = {};

        lines.forEach((line) => {
            line = line.trim();
            if (!line) return; // Skip empty lines

            // Retain chapter-related keywords and structure
            const simplified = line.replace(/[^第章节卷部篇一二三四五六七八九十0-9·：\s]/g, "").trim();

            // Debugging: Log the line and its simplified version
            this.#logger.log("Original Line:", line);
            this.#logger.log("Simplified Line:", simplified);

            // Skip overly short or meaningless patterns
            if (simplified.length <= 3 || /^[一二三四五六七八九十]+$/.test(simplified)) return;

            // Track frequency of detected patterns
            patterns[simplified] = (patterns[simplified] || 0) + 1;
        });

        // Debugging: Log all detected patterns before filtering
        this.#logger.log("All Detected Patterns:", patterns);

        // Filter and sort patterns by frequency, focusing on meaningful structures
        return Object.entries(patterns)
            .filter(([pattern, count]) => {
                // Debugging: Check which patterns pass the filter
                const isValid = /第[0-9一二三四五六七八九十]+章/.test(pattern);
                this.#logger.log("Pattern:", pattern, "Count:", count, "Valid:", isValid);
                return count >= 1 && isValid; // Adjust threshold as needed
            })
            .sort((a, b) => b[1] - a[1]);
    }
}
