/**
 * @fileoverview FileProcessorWorker module for handling file processing tasks
 * that do not involve DOM manipulation. This class is designed to run in a
 * background worker and perform all non-UI related processing.
 *
 * @module client/app/modules/file/file-processor-worker
 * @requires client/app/utils/helpers-worker
 * @requires shared/core/file/file-processor-core
 * @requires client/app/config/constants
 * @requires client/app/config/variables
 * @requires shared/utils/logger
 */

/**
 * Worker message handler
 */
self.onmessage = async function (e) {
    const { importDependencies } = await import("../../utils/helpers-worker.js");
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
        const [FileProcessorCore, CONSTANTS, VARS, Logger] = await importDependencies(
            [
                "shared/core/file/file-processor-core.js",
                "client/app/config/constants.js",
                "client/app/config/variables.js",
                "shared/utils/logger.js",
            ],
            import.meta.url
        );
        const CONFIG = { ...CONSTANTS, VARS };
        const logger = Logger.getLogger("FileProcessorWorker", true);

        switch (operation) {
            case "processMetadata": {
                const { fileName } = e.data;
                const { bookName, author, bookNameRE, authorRE } = FileProcessorCore.getBookNameAndAuthor(fileName);

                self.postMessage({
                    type: "processMetadataComplete",
                    bookName,
                    author,
                    bookNameRE,
                    authorRE,
                });
                break;
            }

            case "processInitialChunk": {
                CONFIG.VARS.IS_EASTERN_LAN = isEasternLan;
                CONFIG.VARS.BOOK_AND_AUTHOR = metadata;

                const processedChunk = await FileProcessorCore.processChunkStatic(chunk, {
                    extraContent,
                    sliceLineOffset,
                    title_page_line_number_offset,
                    pageBreakOnTitle,
                    CONFIG,
                    encoding,
                    isInitialChunk: true,
                });

                self.postMessage({
                    type: "processInitialChunkComplete",
                    ...processedChunk,
                });
                break;
            }

            case "processRemainingContent": {
                const remainingChunk = file.slice(chunkStart);

                CONFIG.VARS.IS_EASTERN_LAN = isEasternLan;
                CONFIG.VARS.BOOK_AND_AUTHOR = metadata;

                const processedChunk = await FileProcessorCore.processChunkStatic(remainingChunk, {
                    extraContent,
                    sliceLineOffset,
                    title_page_line_number_offset,
                    pageBreakOnTitle,
                    CONFIG,
                    encoding,
                    isInitialChunk: false,
                    // progressCallback: (progress) => {
                    //     self.postMessage({
                    //         type: "processingProgress",
                    //         ...progress,
                    //     });
                    // },
                });

                self.postMessage({
                    type: "processRemainingContentComplete",
                    ...processedChunk,
                });
                break;
            }

            case "generateTitlePage": {
                const { metadata, styles } = e.data;
                const titlePageLines = FileProcessorCore.generateTitlePage(metadata, styles);

                self.postMessage({
                    type: "generateTitlePageComplete",
                    titlePageLines,
                });
                break;
            }

            case "generateEndPage": {
                const { totalLines } = e.data;
                const endPageLine = FileProcessorCore.generateEndPage(totalLines);

                self.postMessage({
                    type: "generateEndPageComplete",
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
