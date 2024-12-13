/**
 * @fileoverview FileProcessorWorker module for handling file processing tasks
 * that do not involve DOM manipulation. This class is designed to run in a
 * background worker and perform all non-UI related processing.
 *
 * @module modules/file/file-processor-worker
 * @requires modules/text/text-processor-worker
 * @requires modules/text/pagination-calculator
 * @requires modules/text/title-pattern-detector
 * @requires modules/config/constants
 * @requires modules/config/variables
 * @requires modules/utils/base
 * @requires lib/jschardet.min
 */

/**
 * Check if the current environment is an extension
 * @type {boolean}
 */
const isExtension = !!(
    // Test by protocol
    (
        location.protocol === "chrome-extension:" || // Chrome/Edge
        location.protocol === "moz-extension:" || // Firefox
        location.protocol === "safari-extension:" || // Safari
        // Test by runtime API
        (typeof chrome !== "undefined" && chrome?.runtime?.id) || // Chrome/Edge
        (typeof browser !== "undefined" && browser?.runtime?.id) || // Firefox
        (typeof safari !== "undefined" && safari?.extension)
    ) // Safari
);

/**
 * Decoder cache
 * @type {Map}
 */
const decoderCache = new Map();

/**
 * Import dependencies
 * @returns {Promise<Object>} Imported dependencies
 */
async function importDependencies() {
    try {
        const getPath = (path) => {
            if (isExtension) {
                // Chrome/Edge
                if (typeof chrome !== "undefined" && chrome?.runtime?.getURL) {
                    return chrome.runtime.getURL(path);
                }
                // Firefox
                if (typeof browser !== "undefined" && browser?.runtime?.getURL) {
                    return browser.runtime.getURL(path);
                }
                // Safari
                if (typeof safari !== "undefined" && safari?.extension?.baseURI) {
                    return safari.extension.baseURI + path;
                }
            }
            return path;
        };

        // Import config and text processor
        const [
            { TextProcessorWorker },
            { PaginationCalculator },
            { TitlePatternDetector },
            CONSTANTS,
            VARS,
            { removeFileExtension },
        ] = await Promise.all([
            import(getPath("../text/text-processor-worker.js")),
            import(getPath("../text/pagination-calculator.js")),
            import(getPath("../text/title-pattern-detector.js")),
            import(getPath("../../config/constants.js")),
            import(getPath("../../config/variables.js")),
            import(getPath("../../utils/base.js")),
        ]);
        const CONFIG = { ...CONSTANTS, ...VARS };

        // Import jschardet (if needed)
        if (typeof jschardet === "undefined") {
            await import(getPath("../../lib/jschardet.min.js"));
        }

        return {
            TextProcessorWorker,
            PaginationCalculator,
            TitlePatternDetector,
            CONFIG,
            utils: { removeFileExtension },
        };
    } catch (error) {
        console.error("Failed to import dependencies:", error);
        throw error;
    }
}

/**
 * Get or create TextDecoder
 * @param {string} encoding - Encoding
 * @returns {TextDecoder} Decoder
 */
function getDecoder(encoding) {
    if (!decoderCache.has(encoding)) {
        decoderCache.set(encoding, new TextDecoder(encoding));
    }
    return decoderCache.get(encoding);
}

/**
 * Process file chunk
 * @param {Blob} chunk - File chunk
 * @param {Object} extraContent - Extra content
 * @param {number} sliceLineOffset - Slice line offset
 * @param {number} title_page_line_number_offset - Title page line number offset
 * @param {boolean} pageBreakOnTitle - Page break on title
 * @param {Object} CONFIG - Configuration object
 * @param {TextDecoder} decoder - Text decoder
 * @param {Object} TextProcessorWorker - Text processor
 * @param {Object} PaginationCalculator - Pagination calculator
 * @param {boolean} isInitialChunk - Whether the chunk is the initial chunk
 * @returns {Promise<Object>} Processed chunk data
 */
async function processChunk(
    chunk,
    extraContent,
    sliceLineOffset,
    title_page_line_number_offset,
    pageBreakOnTitle,
    CONFIG,
    decoder,
    TextProcessorWorker,
    PaginationCalculator,
    TitlePatternDetector,
    isInitialChunk
) {
    const buffer = await chunk.arrayBuffer();
    const content = decoder.decode(new Uint8Array(buffer), { fatal: true });
    let lines = content
        .split("\n")
        .filter(Boolean)
        .filter((n) => n.trim() !== "");

    // Dynamically detect title patterns from the first chunk
    if (isInitialChunk) {
        TitlePatternDetector.detectTitlePatternAsRegexRule(lines);
        TextProcessorWorker.updateRegexIsTitle();
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
            result.htmlLines.push(TextProcessorWorker.process(extraContent.titlePageLines[i], i, true));
        }
    }

    // Process each line, ignoring the last line if we're processing the initial chunk and file.size <= chunk size.
    // This is to avoid cutting a paragraph in half.
    for (let i = 0; i < lines.length - sliceLineOffset; i++) {
        const tempLine = lines[i];
        const [tempTitle, tempTitleGroup, tempNamedGroups, tempIsCustomOnly] = TextProcessorWorker.getTitle(tempLine);
        if (tempTitle !== "") {
            // Get the shortest title
            const shortestTitle = getShortestTitleContent(tempTitleGroup, TextProcessorWorker);
            result.titles.push([
                tempTitle,
                result.currentLineNumber + title_page_line_number_offset,
                shortestTitle,
                tempIsCustomOnly,
            ]);
        }

        let { line, footnote } = TextProcessorWorker.makeFootNote(tempLine, result.footnoteCounter === 0);
        if (line === "") {
            // This is the actual footnote itself
            footnote = processFootnote(footnote, result.footnoteCounter);
            result.footnotes.push(footnote);
            result.footnoteCounter++;
        }
        result.currentLineNumber++;

        // Process the final HTML line for rendering
        result.htmlLines.push(TextProcessorWorker.process(line, i + title_page_line_number_offset));
    }

    // Append endPageLines and endPageTitles if they are defined
    if (extraContent.endPageLines && extraContent.endPageTitles) {
        const totalLineNumber = result.htmlLines.length;
        extraContent.endPageLines = [generateEndPage(totalLineNumber)];
        extraContent.endPageTitles[0][1] = totalLineNumber;
        result.titles.push(...extraContent.endPageTitles); // Append titles

        // Process the final HTML line for rendering
        for (let i = extraContent.endPageLines.length - 1; i >= 0; i--) {
            result.htmlLines.push(TextProcessorWorker.process(extraContent.endPageLines[i], i + totalLineNumber, true));
        }
    }

    // Calculate page breaks
    const calculator = new PaginationCalculator(result.htmlLines, result.titles, {
        ...CONFIG.CONST_PAGINATION,
        PAGE_BREAK_ON_TITLE: pageBreakOnTitle,
        IS_EASTERN_LAN: CONFIG.VARS.IS_EASTERN_LAN,
        BOOK_AND_AUTHOR: CONFIG.VARS.BOOK_AND_AUTHOR,
        COMPLETE_BOOK: !isInitialChunk,
    });
    result.pageBreaks = calculator.calculate();

    // console.log("result:", result);

    return result;
}

/**
 * Iteratively strips and processes a title to derive its shortest logical "content title."
 * The function starts from a valid title and progressively reduces it by removing components
 * (e.g., volume, chapter prefixes) until no further stripping is possible.
 * If intermediate stripping results in an invalid title, it attempts to find valid substrings.
 *
 * @param {string[]} titleGroup - An array of title components, with the 3rd element from the last
 *                                (`titleGroup[titleGroup.length - 3]`) being the current title to strip.
 * @param {Object} TextProcessorWorker - An object with a `getTitle` method that processes titles.
 * @param {Function} TextProcessorWorker.getTitle - A function that takes a title as input and returns
 *                                                  an array `[nextTitle, nextTitleGroup]`.
 *                                                  - `nextTitle` is the valid title if found, or an empty string otherwise.
 *                                                  - `nextTitleGroup` is an array of title components if valid, or an empty array.
 * @returns {string} - The shortest derived title content. If no further stripping is possible, it returns
 *                     the final valid title or the last valid substring.
 *
 * @example
 * // Example 1: Input with valid progressive titles
 * const titleGroup = ['第一卷 第一章 第一节 测试', '第一卷', '第一章 第一节 测试', 0, '第一卷 第一章 第一节 测试'];
 * const shortestTitle = getShortestTitleContent(titleGroup, TextProcessorWorker);
 * console.log(shortestTitle); // Output: "测试"
 *
 * @example
 * // Example 2: Input with intermediate invalid titles
 * const titleGroup = ['第一卷 你好 第一章 哈哈', '第一卷', '你好 第一章 哈哈', 0, '第一卷 你好 第一章 哈哈'];
 * const shortestTitle = getShortestTitleContent(titleGroup, TextProcessorWorker);
 * console.log(shortestTitle); // Output: "哈哈"
 */
function getShortestTitleContent(titleGroup, TextProcessorWorker) {
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

        let [nextTitle, nextTitleGroup] = TextProcessorWorker.getTitle(shortestTitle);

        if (!nextTitle) {
            // If no valid title, try to strip substrings to find a valid one
            const strippedTitle = stripNextSubstring(shortestTitle, TextProcessorWorker);
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
 * @param {Object} TextProcessorWorker - Text processor worker.
 * @returns {string} The valid substring, or null if none are valid.
 */
function stripNextSubstring(title, TextProcessorWorker) {
    const parts = title.split(/\s+/); // Split the title into parts by spaces
    for (let i = 0; i < parts.length; i++) {
        // Test substrings progressively from the i-th position
        const testTitle = parts.slice(i).join(" ");
        const [validTitle] = TextProcessorWorker.getTitle(testTitle);
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
function createFootnoteElement(footnote, footnoteCounter) {
    return `<li id="fn${footnoteCounter}">${footnote}</li>`;
}

/**
 * Process footnote
 * @param {string} footnote - Footnote
 * @param {number} counter - Counter
 * @returns {string} Footnote HTML string
 */
function processFootnote(footnote, counter) {
    const footnoteHTML = createFootnoteElement(footnote, counter);
    counter++;
    return footnoteHTML;
}

/**
 * Generate title page
 * @param {Object} bookMetadata - Book metadata
 * @param {Object} styles - Styles
 * @returns {Array<string>} Title page lines
 */
function generateTitlePage(bookMetadata, styles) {
    const { bookName, author } = bookMetadata;
    const titlePageLines = [];

    // Generate title page content
    if (author) {
        titlePageLines.push(
            `<h1 id=line0 style='margin-bottom:0'>${bookName}</h1>`,
            `<h1 id=line1 style='margin-top:0; margin-bottom:${parseFloat(styles.h1_lineHeight) / 2}em'>${author}</h1>`
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
function generateEndPage(totalLines) {
    return `
        <div id=line${totalLines} class='prevent-select seal'>
            <img id='seal_end'></img>
        </div>
    `;
}

/**
 * Worker message handler
 */
self.onmessage = async function (e) {
    const {
        operation = null,
        file = null,
        fileName = null,
        metadata = null,
        chunk = null,
        chunkStart = -1,
        sliceLineOffset = 0,
        extraContent = null,
        encoding = "utf-8",
        isEasternLan = true,
        totalLines = -1,
        title_page_line_number_offset = 0,
        pageBreakOnTitle = false,
        styles = null,
    } = e.data;
    // console.group("Worker message");
    // console.log("operation: ", operation);
    // console.log("file: ", file);
    // console.log("fileName: ", fileName);
    // console.log("metadata: ", metadata);
    // console.log("chunk: ", chunk);
    // console.log("chunkStart: ", chunkStart);
    // console.log("sliceLineOffset: ", sliceLineOffset);
    // console.log("extraContent: ", extraContent);
    // console.log("encoding: ", encoding);
    // console.log("isEasternLan: ", isEasternLan);
    // console.log("totalLines: ", totalLines);
    // console.log("title_page_line_number_offset: ", title_page_line_number_offset);
    // console.log("pageBreakOnTitle: ", pageBreakOnTitle);
    // console.log("styles: ", styles);
    // console.groupEnd();

    try {
        const { TextProcessorWorker, PaginationCalculator, TitlePatternDetector, CONFIG, utils } =
            await importDependencies();

        switch (operation) {
            case "processMetadata": {
                const { fileName } = e.data;
                const { bookName, author, bookNameRE, authorRE } = TextProcessorWorker.getBookNameAndAuthor(
                    utils.removeFileExtension(fileName)
                );

                self.postMessage({
                    type: "metadataProcessed",
                    bookName,
                    author,
                    bookNameRE,
                    authorRE,
                });
                break;
            }

            case "processInitialChunk": {
                const decoder = getDecoder(encoding);

                CONFIG.VARS.IS_EASTERN_LAN = isEasternLan;
                CONFIG.VARS.BOOK_AND_AUTHOR = metadata;

                const processedChunk = await processChunk(
                    chunk,
                    extraContent,
                    sliceLineOffset,
                    title_page_line_number_offset,
                    pageBreakOnTitle,
                    CONFIG,
                    decoder,
                    TextProcessorWorker,
                    PaginationCalculator,
                    TitlePatternDetector,
                    true
                );

                let titles_ind = {};
                for (let i = 0; i < processedChunk.titles.length; i++) {
                    titles_ind[processedChunk.titles[i][1]] = i;
                }

                self.postMessage({
                    type: "initialChunkProcessed",
                    ...processedChunk,
                    titles_ind,
                });
                break;
            }

            case "processRemainingContent": {
                const remainingChunk = file.slice(chunkStart);
                const decoder = getDecoder(encoding);

                CONFIG.VARS.IS_EASTERN_LAN = isEasternLan;
                CONFIG.VARS.BOOK_AND_AUTHOR = metadata;

                const processedChunk = await processChunk(
                    remainingChunk,
                    extraContent,
                    sliceLineOffset,
                    title_page_line_number_offset,
                    pageBreakOnTitle,
                    CONFIG,
                    decoder,
                    TextProcessorWorker,
                    PaginationCalculator,
                    TitlePatternDetector,
                    false
                );

                let titles_ind = {};
                for (let i = 0; i < processedChunk.titles.length; i++) {
                    titles_ind[processedChunk.titles[i][1]] = i;
                }

                self.postMessage({
                    type: "remainingContentProcessed",
                    ...processedChunk,
                    titles_ind,
                });
                break;
            }

            case "generateTitlePage": {
                const { metadata, styles } = e.data;
                const titlePageLines = generateTitlePage(metadata, styles);

                self.postMessage({
                    type: "titlePageGenerated",
                    titlePageLines,
                });
                break;
            }

            case "generateEndPage": {
                const { totalLines } = e.data;
                const endPageLine = generateEndPage(totalLines);

                self.postMessage({
                    type: "endPageGenerated",
                    endPageLine,
                });
                break;
            }
        }
    } catch (error) {
        console.error("Worker error:", error);
        self.postMessage({
            type: "error",
            error: error.message,
            operation,
        });
    }
};
