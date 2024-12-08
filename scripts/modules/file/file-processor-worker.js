/**
 * @fileoverview FileProcessorWorker module for handling file processing tasks
 * that do not involve DOM manipulation. This class is designed to run in a
 * background worker and perform all non-UI related processing.
 *
 * @module modules/file/file-processor-worker
 * @requires modules/text/text-processor-worker
 * @requires modules/text/pagination-calculator
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
        const [{ TextProcessorWorker }, { PaginationCalculator }, CONSTANTS, VARS, { removeFileExtension }] =
            await Promise.all([
                import(getPath("../text/text-processor-worker.js")),
                import(getPath("../text/pagination-calculator.js")),
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
 * @param {Object} prevChunkInfo - Previous chunk info
 * @param {Object} extraContent - Extra content
 * @param {number} sliceLineOffset - Slice line offset
 * @param {number} overlapSize - Overlap size
 * @param {number} startLineNumber - Starting line number
 * @param {number} title_page_line_number_offset - Title page line number offset
 * @param {boolean} pageBreakOnTitle - Page break on title
 * @param {Object} CONFIG - Configuration object
 * @param {TextDecoder} decoder - Text decoder
 * @param {Object} TextProcessorWorker - Text processor
 * @param {Object} PaginationCalculator - Pagination calculator
 * @returns {Promise<Object>} Processed chunk data
 */
async function processChunk(
    chunk,
    prevChunkInfo,
    extraContent,
    sliceLineOffset,
    overlapSize,
    startLineNumber,
    title_page_line_number_offset,
    pageBreakOnTitle,
    CONFIG,
    decoder,
    TextProcessorWorker,
    PaginationCalculator
) {
    const buffer = await chunk.arrayBuffer();
    const content = decoder.decode(new Uint8Array(buffer), { stream: true, fatal: true });
    let lines = content
        .split("\n")
        .filter(Boolean)
        .filter((n) => n.trim() !== "");

    const result = {
        lines: [], // Processed lines
        titles: [], // Title information
        currentLineNumber: startLineNumber, // Current line number being processed
        footnoteCounter: 0,
        footnotes: [],
        pageBreaks: [],
    };

    // Process each line, ignoring the last line if we're processing the initial chunk and file.size <= chunk size.
    // This is to avoid cutting a paragraph in half.
    for (let i = 0; i < lines.length - sliceLineOffset; i++) {
        const tempLine = lines[i];
        const [tempTitle, tempTitleGroup] = TextProcessorWorker.getTitle(tempLine);
        if (tempTitle !== "") {
            // Get the shortest title
            const shortestTitle = getShortestTitleContent(tempTitleGroup, TextProcessorWorker);
            result.titles.push([tempTitle, result.currentLineNumber + title_page_line_number_offset, shortestTitle]);
        }

        let { line, footnote } = TextProcessorWorker.makeFootNote(tempLine);
        if (line === "") {
            // This is the actual footnote itself
            footnote = processFootnote(footnote, result.footnoteCounter);
            result.footnotes.push(footnote);
            result.footnoteCounter++;
        }
        result.lines.push(line);
        result.currentLineNumber++;
    }

    if (startLineNumber === 0) {
        // Initial chunk
        if (extraContent.titlePageLines && extraContent.titlePageTitles) {
            result.lines.unshift(...extraContent.titlePageLines); // Prepend lines
            result.titles.unshift(...extraContent.titlePageTitles); // Prepend titles
        }

        // Append endPageLines and endPageTitles if they are defined
        if (extraContent.endPageLines && extraContent.endPageTitles) {
            const totalLineNumber = result.lines.length + startLineNumber;
            extraContent.endPageLines = [generateEndPage(totalLineNumber)];
            extraContent.endPageTitles[0][1] = totalLineNumber;
            result.lines.push(...extraContent.endPageLines); // Append lines
            result.titles.push(...extraContent.endPageTitles); // Append titles
        }
    } else {
        // Remaining chunk
        if (extraContent.endPageLines && extraContent.endPageTitles) {
            const totalLineNumber = result.lines.length + startLineNumber + title_page_line_number_offset;
            extraContent.endPageLines = [generateEndPage(totalLineNumber)];
            extraContent.endPageTitles[0][1] = totalLineNumber;
            result.lines.push(...extraContent.endPageLines); // Append lines
            result.titles.push(...extraContent.endPageTitles); // Append titles
        }
    }

    // Prepare full lines array for pagination calculation
    let combinedLines = result.lines;
    let combinedTitles = result.titles;
    // console.log("prevChunkInfo: ", prevChunkInfo);
    if (prevChunkInfo && prevChunkInfo.content && prevChunkInfo.content.length > 0) {
        combinedLines = prevChunkInfo.content.concat(result.lines);

        // Adjust the line number of the previous block of titles
        // Note: We don't need to subtract title_page_line_number_offset here because we've already considered it when processing titles
        const adjustedPrevTitles = prevChunkInfo.titles.map((title) => [
            title[0],
            // title[1] - (startLineNumber - prevChunkInfo.content.length) + prevChunkInfo.startLine,
            title[1],
            title[2],
        ]);

        combinedTitles = adjustedPrevTitles.concat(result.titles);
    }

    // console.log("startLineNumber: ", startLineNumber);
    // console.log("result.lines: ", result.lines);
    // console.log("combinedLines: ", combinedLines);
    // console.log("result.titles: ", result.titles);
    // console.log("combinedTitles: ", combinedTitles);
    // console.log("isEasternLan: ", CONFIG.VARS.IS_EASTERN_LAN);
    // console.log("config: ", {
    //     ...CONFIG.CONST_PAGINATION,
    //     PAGE_BREAK_ON_TITLE: pageBreakOnTitle,
    // });

    // Modify combinedTitles
    const tempTitles = combinedTitles.map((title) => [
        title[0],
        title[1] - prevChunkInfo.startLine, // Don't need to minus title_page_line_number_offset since we've inserted title page lines
        title[2],
    ]);
    // console.log("adjustedCombinedTitles: ", tempTitles);

    // Calculate page breaks
    const calculator = new PaginationCalculator(combinedLines, tempTitles, {
        ...CONFIG.CONST_PAGINATION,
        PAGE_BREAK_ON_TITLE: pageBreakOnTitle,
        IS_EASTERN_LAN: CONFIG.VARS.IS_EASTERN_LAN,
        BOOK_AND_AUTHOR: CONFIG.VARS.BOOK_AND_AUTHOR,
    });
    const chunkBreaks = calculator.calculate();
    // console.log("chunkBreaks: ", chunkBreaks);

    // Adjust break positions based on starting line number
    result.pageBreaks = chunkBreaks.map(
        (breakPoint) => breakPoint + prevChunkInfo.startLine // Don't need to add title_page_line_number_offset since we've inserted title page lines
    );
    // console.log("chunkBreaks adjusted: ", result.pageBreaks);
    if (startLineNumber === 0) {
        result.pageBreaks[0] = 0;
    } else {
        // console.log("prevContentPageBreaks: ", prevChunkInfo.pageBreaks);
        result.pageBreaks = result.pageBreaks.filter(
            (breakPoint) => breakPoint > prevChunkInfo.pageBreaks[prevChunkInfo.pageBreaks.length - 1]
        );
    }
    // console.log("result.pageBreaks: ", result.pageBreaks);

    // Save the last part of this chunk and its corresponding titles
    let prevContentLines = result.lines.slice(-Math.ceil(result.lines.length * overlapSize));
    let prevContentStartLineNumber = startLineNumber + result.lines.length - prevContentLines.length;
    let prevContentTitles = result.titles.filter((title) => title[1] >= prevContentStartLineNumber);

    // console.log("prevContentLines: ", prevContentLines);
    // console.log("prevContentStartLineNumber: ", prevContentStartLineNumber);
    // console.log("prevContentTitles: ", prevContentTitles);

    return {
        ...result,
        prevContentStartLineNumber,
        prevContentLines,
        prevContentTitles,
        prevContentPageBreaks: result.pageBreaks,
    };
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
    // console.log("titleGroup: ", titleGroup);
    let shortestTitle = titleGroup[titleGroup.length - 3]; // Start from the most reduced valid title
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

        if (nextTitleGroup.length >= 3) {
            // Update shortestTitle with the stripped title from the group
            shortestTitle = nextTitleGroup[nextTitleGroup.length - 3];
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
        chunkEnd = -1,
        sliceLineOffset = 0,
        extraContent = null,
        prevChunkInfo = null,
        overlapSize = 0,
        encoding = "utf-8",
        isEasternLan = true,
        startLineNumber = -1,
        startTitleIndex = -1,
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
    // console.log("chunkEnd: ", chunkEnd);
    // console.log("extraContent: ", extraContent);
    // console.log("prevChunkInfo: ", prevChunkInfo);
    // console.log("overlapSize: ", overlapSize);
    // console.log("encoding: ", encoding);
    // console.log("isEasternLan: ", isEasternLan);
    // console.log("startLineNumber: ", startLineNumber);
    // console.log("startTitleIndex: ", startTitleIndex);
    // console.log("totalLines: ", totalLines);
    // console.log("title_page_line_number_offset: ", title_page_line_number_offset);
    // console.log("pageBreakOnTitle: ", pageBreakOnTitle);
    // console.log("styles: ", styles);
    // console.groupEnd();

    try {
        const { TextProcessorWorker, PaginationCalculator, CONFIG, utils } = await importDependencies();

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
                    prevChunkInfo,
                    extraContent,
                    sliceLineOffset,
                    overlapSize,
                    startLineNumber,
                    title_page_line_number_offset,
                    pageBreakOnTitle,
                    CONFIG,
                    decoder,
                    TextProcessorWorker,
                    PaginationCalculator
                );

                let titles_ind = {};
                for (let i = 0; i < processedChunk.titles.length; i++) {
                    titles_ind[processedChunk.titles[i][1]] = i;
                }

                // console.log("init pageBreaks: ", processedChunk.pageBreaks);

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
                    prevChunkInfo,
                    extraContent,
                    sliceLineOffset,
                    overlapSize,
                    startLineNumber,
                    title_page_line_number_offset,
                    pageBreakOnTitle,
                    CONFIG,
                    decoder,
                    TextProcessorWorker,
                    PaginationCalculator
                );

                let titles_ind = {};
                for (let i = 0; i < processedChunk.titles.length; i++) {
                    titles_ind[processedChunk.titles[i][1]] = i + startTitleIndex;
                }

                // console.log("remaining pageBreaks: ", processedChunk.pageBreaks);

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
