/**
 * @fileoverview FileProcessorCore module for processing files
 * Core logic that can be used in both browser and Node.js environments
 */

import { getTextDecoderClass } from "../../adapters/text-decoder.js";
import { TextProcessorCore } from "../text/text-processor-core.js";
import { PaginationCalculator } from "../text/pagination-calculator.js";
import { TitlePatternDetector } from "../text/title-pattern-detector.js";
import { removeFileExtension } from "../../../client/app/utils/base.js";

/**
 * FileProcessorCore class
 * @class
 */
export class FileProcessorCore {
    /**
     * Constructor
     * @param {number} fileSize - Size of the file in bytes
     * @param {boolean} isEastern - Whether the file is in Eastern language
     * @param {string} encoding - File encoding
     */
    constructor(fileSize, isEastern = null, encoding = null) {
        // File and chunk
        this.fileSize = fileSize;
        this.initialChunkSize = 1024 * 1024; // 1MB
        this.initialChunkLineOffset = fileSize <= this.initialChunkSize ? 0 : 1; // Ignoring the last line of the initial chunk if file.size > chunk size. This is to avoid cutting a paragraph in half.

        // Book metadata
        this.encoding = encoding ?? "utf-8";
        this.isEasternLan = isEastern ?? true;
        this.bookMetadata = null;
        this.title_page_line_number_offset = 0;
        this.seal_rotate_en = "";
        this.seal_left = -1;

        // Processing state
        this.processedLines = [];
        this.titles = [];
        this.titles_ind = {};
        this.footnotes = [];
        this.footnoteCounter = 0;

        // Pagination
        this.pageBreaks = [];

        // Flags
        this.isProcessingComplete = false;
        this.isInitialChunkProcessed = false;
    }

    /**
     * Global decoder cache
     * @type {Map<string, TextDecoder>}
     * @private
     */
    static #decoderCache = new Map();

    /**
     * Get or create TextDecoder instance
     * @param {string} encoding - Text encoding
     * @returns {Promise<TextDecoder>} TextDecoder instance
     * @private
     */
    static async #getDecoder(encoding) {
        const enc = encoding.toLowerCase();

        if (!this.#decoderCache.has(enc)) {
            // console.log("creating new decoder: ", enc);
            const TextDecoderClass = await getTextDecoderClass();
            this.#decoderCache.set(enc, new TextDecoderClass(enc));
        } else {
            // console.log("using existing decoder: ", enc);
        }

        return this.#decoderCache.get(enc);
    }

    /**
     * Detect file encoding and language
     * @param {File} file - File object
     * @returns {Promise<void>}
     * @public
     */
    async detectEncodingAndLanguage(file) {
        const { isEastern, encoding } = await TextProcessorCore.getLanguageAndEncodingFromBook(file);
        this.isEasternLan = isEastern;
        this.encoding = encoding;
    }

    /**
     * Get book name and author
     * @param {string} fileName - File name
     * @returns {Object} Book name and author
     */
    static getBookNameAndAuthor(fileName) {
        const { bookName, author, bookNameRE, authorRE } = TextProcessorCore.getBookNameAndAuthor(
            removeFileExtension(fileName)
        );

        return { bookName, author, bookNameRE, authorRE };
    }

    /**
     * @typedef {Object} ProcessChunkOptions
     * @property {Object} [extraContent={}] - Extra content to be included
     * @property {number} [sliceLineOffset=0] - Line offset for slicing
     * @property {number} [title_page_line_number_offset=3] - Offset for title page line numbers
     * @property {boolean} [pageBreakOnTitle=true] - Whether to break pages on titles
     * @property {Object} [CONFIG={}] - Configuration object
     * @property {string} [encoding="utf-8"] - File encoding
     * @property {boolean} [isInitialChunk=false] - Whether this is the first chunk
     * @property {boolean} [forcePatternDetection=false] - Whether to force pattern detection
     * @property {Object} [patternDetectionOptions={}] - Pattern detection options
     * @property {Function} [progressCallback=null] - Callback for progress updates
     */

    /**
     * Processes a chunk of text file and converts it to HTML with titles and footnotes
     * @param {Blob} chunk - The chunk of file to process
     * @param {ProcessChunkOptions} options - Processing options
     * @returns {Promise<Object>} Processed chunk result
     */
    static async processChunkStatic(
        chunk,
        {
            extraContent = {},
            sliceLineOffset = 0,
            title_page_line_number_offset = 3,
            pageBreakOnTitle = true,
            CONFIG = {},
            encoding = "utf-8",
            isInitialChunk = false,
            forcePatternDetection = false,
            patternDetectionOptions = {},
            progressCallback = null,
        } = {}
    ) {
        const buffer = await chunk.arrayBuffer();
        const decoder = await FileProcessorCore.#getDecoder(encoding);
        const content = decoder.decode(new Uint8Array(buffer), { fatal: true });
        let lines = content
            .split("\n")
            .filter(Boolean)
            .filter((n) => n.trim() !== "");
        const totalLines =
            lines.length + (extraContent?.titlePageLines?.length || 0) + (extraContent?.endPageLines?.length || 0);
        if (!isInitialChunk) {
            progressCallback?.({
                stage: "init",
                totalLines,
                processedLines: 0,
                percentage: 0,
            });
        }

        // Dynamically detect title patterns from the first chunk
        if (isInitialChunk || forcePatternDetection) {
            let linesForPatternDetection = lines;
            if (forcePatternDetection && patternDetectionOptions.fileSize > patternDetectionOptions.initialChunkSize) {
                const bufferForPatternDetection = buffer.slice(0, patternDetectionOptions.initialChunkSize);
                const contentForPatternDetection = decoder.decode(new Uint8Array(bufferForPatternDetection), {
                    fatal: true,
                });
                linesForPatternDetection = contentForPatternDetection
                    .split("\n")
                    .filter(Boolean)
                    .filter((n) => n.trim() !== "");
            }
            TitlePatternDetector.detectTitlePatternAsRegexRule(linesForPatternDetection);
            TextProcessorCore.updateRegexIsTitle();
        }

        const result = {
            htmlLines: [], // Processed HTML lines
            titles: [], // Title information
            currentLineNumber: 0, // Current line number being processed
            footnoteCounter: 0,
            footnotes: [],
            pageBreaks: [],
        };

        // Prepend titlePageLines and titlePageTitles if they are defined
        if (extraContent.titlePageLines && extraContent.titlePageTitles) {
            result.titles.push(...extraContent.titlePageTitles); // Prepend titles

            // Process the final HTML line for rendering
            for (let i = 0; i < extraContent.titlePageLines.length; i++) {
                result.htmlLines.push(
                    TextProcessorCore.process(
                        extraContent.titlePageLines[i],
                        i,
                        true,
                        CONFIG?.VARS?.BOOK_AND_AUTHOR,
                        CONFIG?.VARS?.IS_EASTERN_LAN
                    )
                );
            }

            progressCallback?.({
                stage: "processing",
                totalLines,
                processedLines: extraContent.titlePageLines.length,
                percentage: Math.round((extraContent.titlePageLines.length / totalLines) * 100),
            });
        }

        // Process each line, ignoring the last line if we're processing the initial chunk and file.size <= chunk size.
        // This is to avoid cutting a paragraph in half.
        for (let i = 0; i < lines.length - sliceLineOffset; i++) {
            const tempLine = lines[i];
            const [tempTitle, tempTitleGroup, tempNamedGroups, tempIsCustomOnly] = TextProcessorCore.getTitle(tempLine);
            if (tempTitle !== "") {
                // Get the shortest title
                const shortestTitle = FileProcessorCore.#getShortestTitleContent(tempTitleGroup);
                result.titles.push([
                    tempTitle,
                    result.currentLineNumber + title_page_line_number_offset,
                    shortestTitle,
                    tempIsCustomOnly,
                ]);
            }

            let { line, footnote } = TextProcessorCore.makeFootNote(tempLine, result.footnoteCounter === 0);
            if (line === "") {
                // This is the actual footnote itself
                footnote = FileProcessorCore.#processFootnote(footnote, result.footnoteCounter);
                result.footnotes.push(footnote);
                result.footnoteCounter++;
            }
            result.currentLineNumber++;

            // Process the final HTML line for rendering
            result.htmlLines.push(
                TextProcessorCore.process(
                    line,
                    i + title_page_line_number_offset,
                    false,
                    CONFIG?.VARS?.BOOK_AND_AUTHOR,
                    CONFIG?.VARS?.IS_EASTERN_LAN
                )
            );

            // Report progress every 100 lines or when the last line is processed
            if (i % 100 === 0 || i === totalLines - 1) {
                progressCallback?.({
                    stage: "processing",
                    totalLines,
                    processedLines: i + extraContent?.titlePageLines?.length + 1,
                    percentage: Math.round(((i + extraContent?.titlePageLines?.length + 1) / totalLines) * 100),
                });
            }
        }

        // Append endPageLines and endPageTitles if they are defined
        if (extraContent.endPageLines && extraContent.endPageTitles) {
            const totalLineNumber = result.htmlLines.length;
            extraContent.endPageLines = [FileProcessorCore.generateEndPage(totalLineNumber)];
            extraContent.endPageTitles[0][1] = totalLineNumber;
            result.titles.push(...extraContent.endPageTitles); // Append titles

            // Process the final HTML line for rendering
            for (let i = extraContent.endPageLines.length - 1; i >= 0; i--) {
                result.htmlLines.push(
                    TextProcessorCore.process(
                        extraContent.endPageLines[i],
                        i + totalLineNumber,
                        true,
                        CONFIG?.VARS?.BOOK_AND_AUTHOR,
                        CONFIG?.VARS?.IS_EASTERN_LAN
                    )
                );
            }
        }

        // Calculate page breaks
        // progressCallback?.({
        //     stage: "pagination",
        //     status: "start",
        // });

        const calculator = new PaginationCalculator(result.htmlLines, result.titles, {
            ...CONFIG?.CONST_PAGINATION,
            PAGE_BREAK_ON_TITLE: pageBreakOnTitle,
            IS_EASTERN_LAN: CONFIG?.VARS?.IS_EASTERN_LAN,
            BOOK_AND_AUTHOR: CONFIG?.VARS?.BOOK_AND_AUTHOR,
            COMPLETE_BOOK: !isInitialChunk,
        });
        result.pageBreaks = calculator.calculate();

        progressCallback?.({
            stage: "complete",
            totalLines,
            processedLines: totalLines,
            percentage: 100,
        });

        return {
            ...result,
            titles_ind: FileProcessorCore.#generateTitlesIndices(result.titles),
        };
    }

    /**
     * Processes a chunk of text file and converts it to HTML with titles and footnotes
     * @param {Blob} chunk - The chunk of file to process
     * @param {ProcessChunkOptions} options - Processing options
     * @returns {Promise<Object>} Processed chunk result
     */
    async processChunk(
        chunk,
        {
            extraContent = {},
            sliceLineOffset = 0,
            title_page_line_number_offset = 3,
            pageBreakOnTitle = true,
            CONFIG = {},
            isInitialChunk = false,
            forcePatternDetection = false,
            patternDetectionOptions = {},
            progressCallback = null,
        } = {}
    ) {
        return await FileProcessorCore.processChunkStatic(chunk, {
            extraContent,
            sliceLineOffset,
            title_page_line_number_offset,
            pageBreakOnTitle,
            CONFIG,
            encoding: this.encoding,
            isInitialChunk,
            forcePatternDetection,
            patternDetectionOptions: {
                ...patternDetectionOptions,
                fileSize: this.fileSize,
                initialChunkSize: this.initialChunkSize,
            },
            progressCallback,
        });
    }

    /**
     * Generate title page
     * @param {Object} bookMetadata - Book metadata
     * @param {Object} styles - Styles
     * @returns {Array<string>} Title page lines
     */
    static generateTitlePage(bookMetadata, styles) {
        const { bookName, author } = bookMetadata;
        const titlePageLines = [];

        // Generate title page content
        if (author) {
            titlePageLines.push(
                `<h1 id=line0 style='margin-bottom:0'>${bookName}</h1>`,
                `<h1 class=author id=line1 style='margin-top:${parseFloat(styles.h1_lineHeight) / 4}em; margin-bottom:${
                    parseFloat(styles.h1_lineHeight) / 2
                }em'>${author}</h1>`
            );
        } else {
            titlePageLines.push(
                `<h1 id=line0 style='margin-bottom:${parseFloat(styles.h1_lineHeight) / 2}em'>${bookName}</h1>`
            );
        }

        // Add seal
        titlePageLines.push(`
            <div id=line${author ? 2 : 1} class='prevent-select seal'>
                <img id='seal_front'></img>
            </div>
        `);

        return titlePageLines;
    }

    /**
     * Generate end page
     * @param {number} totalLines - Total lines
     * @returns {string} End page HTML string
     */
    static generateEndPage(totalLines) {
        return `
            <div id=line${totalLines} class='prevent-select seal'>
                <img id='seal_end'></img>
            </div>
        `;
    }

    /**
     * Iteratively strips and processes a title to derive its shortest logical "content title."
     * The function starts from a valid title and progressively reduces it by removing components
     * (e.g., volume, chapter prefixes) until no further stripping is possible.
     * If intermediate stripping results in an invalid title, it attempts to find valid substrings.
     *
     * @param {string[]} titleGroup - An array of title components, with the 3rd element from the last
     *                                (`titleGroup[titleGroup.length - 3]`) being the current title to strip.
     * @param {Object} TextProcessorCore - An object with a `getTitle` method that processes titles.
     * @param {Function} TextProcessorCore.getTitle - A function that takes a title as input and returns
     *                                                  an array `[nextTitle, nextTitleGroup]`.
     *                                                  - `nextTitle` is the valid title if found, or an empty string otherwise.
     *                                                  - `nextTitleGroup` is an array of title components if valid, or an empty array.
     * @returns {string} - The shortest derived title content. If no further stripping is possible, it returns
     *                     the final valid title or the last valid substring.
     *
     * @example
     * // Example 1: Input with valid progressive titles
     * const titleGroup = ['第一卷 第一章 第一节 测试', '第一卷', '第一章 第一节 测试', 0, '第一卷 第一章 第一节 测试'];
     * const shortestTitle = getShortestTitleContent(titleGroup);
     * console.log(shortestTitle); // Output: "测试"
     *
     * @example
     * // Example 2: Input with intermediate invalid titles
     * const titleGroup = ['第一卷 你好 第一章 哈哈', '第一卷', '你好 第一章 哈哈', 0, '第一卷 你好 第一章 哈哈'];
     * const shortestTitle = getShortestTitleContent(titleGroup);
     * console.log(shortestTitle); // Output: "哈哈"
     */
    static #getShortestTitleContent(titleGroup) {
        const titleGroupIndexOffset = 1;

        // console.log("titleGroup: ", titleGroup);
        let shortestTitle = titleGroup[titleGroup.length - titleGroupIndexOffset]; // Start from the most reduced valid title
        // console.log("shortestTitle: ", shortestTitle);
        const seenTitles = new Set(); // Prevent infinite loops

        while (true) {
            if (seenTitles.has(shortestTitle)) {
                // console.warn("Infinite loop detected, stopping...");
                break;
            }

            seenTitles.add(shortestTitle); // Mark the current title as processed

            let [nextTitle, nextTitleGroup] = TextProcessorCore.getTitle(shortestTitle);

            if (!nextTitle) {
                // If no valid title, try to strip substrings to find a valid one
                const strippedTitle = FileProcessorCore.#stripNextSubstring(shortestTitle);
                if (!strippedTitle) {
                    // console.log("No further valid titles. Exiting.");
                    break; // Stop if no valid substrings can be found
                }
                shortestTitle = strippedTitle; // Continue with the stripped title
                continue;
            }

            if (nextTitleGroup.length >= titleGroupIndexOffset) {
                // Update shortestTitle with the stripped title from the group
                shortestTitle = nextTitleGroup[nextTitleGroup.length - titleGroupIndexOffset];
            } else {
                // If no further stripping is possible, stop
                break;
            }
        }

        return shortestTitle; // Return the final stripped title
    }

    /**
     * Tries to strip components from the title to find a substring that is a valid title.
     * Returns the first valid substring, or null if none are valid.
     * @param {string} title - The title to strip.
     * @param {Object} TextProcessorCore - Text processor core.
     * @returns {string} The valid substring, or null if none are valid.
     */
    static #stripNextSubstring(title) {
        const parts = title.split(/\s+/); // Split the title into parts by spaces
        for (let i = 0; i < parts.length; i++) {
            // Test substrings progressively from the i-th position
            const testTitle = parts.slice(i).join(" ");
            const [validTitle] = TextProcessorCore.getTitle(testTitle);
            if (validTitle) {
                return testTitle; // Return the first valid substring found
            }
        }
        return null; // No valid substrings found
    }

    /**
     * Create footnote element
     * @param {string} footnote - Footnote
     * @param {number} footnoteCounter - Footnote counter
     * @returns {string} Footnote HTML string
     */
    static #createFootnoteElement(footnote, footnoteCounter) {
        return `<li id="fn${footnoteCounter}">${footnote}</li>`;
    }

    /**
     * Process footnote
     * @param {string} footnote - Footnote
     * @param {number} counter - Counter
     * @returns {string} Footnote HTML string
     */
    static #processFootnote(footnote, counter) {
        const footnoteHTML = FileProcessorCore.#createFootnoteElement(footnote, counter);
        counter++;
        return footnoteHTML;
    }

    /**
     * Generate titles indices mapping
     * @param {Array} titles - Array of title information
     * @returns {Object} Mapping of line numbers to title indices
     * @private
     */
    static #generateTitlesIndices(titles) {
        const titlesIndices = {};
        for (let i = 0; i < titles.length; i++) {
            titlesIndices[titles[i][1]] = i;
        }
        return titlesIndices;
    }
}
