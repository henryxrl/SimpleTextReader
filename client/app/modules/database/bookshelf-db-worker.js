/**
 * @fileoverview BookshelfDBWorker module for handling database operations for bookshelf in a background worker
 * @module client/app/modules/database/bookshelf-db-worker
 * @requires client/app/utils/helpers-worker
 * @requires client/app/modules/database/db-manager
 * @requires client/app/config/constants
 * @requires shared/utils/logger
 */

/**
 * Worker message handler
 */
self.onmessage = async ({ data }) => {
    const { importDependencies } = await import("../../utils/helpers-worker.js");
    const { type, payload } = data;
    let logger = null;
    let dbManager = null;

    try {
        const [DBManager, CONFIG, Logger] = await importDependencies(
            ["client/app/modules/database/db-manager.js", "client/app/config/constants.js", "shared/utils/logger.js"],
            import.meta.url
        );

        logger = Logger.getLogger("BookshelfDBWorker", false);

        logger.log("Worker received message:", type);
        logger.log("Payload:", payload);

        // Delay initialize DBManager, using the same configuration as the main application
        if (!dbManager) {
            logger.log("Initializing DBManager");
            try {
                dbManager = new DBManager({
                    dbName: CONFIG.CONST_DB.DB_NAME,
                    dbVersion: CONFIG.CONST_DB.DB_VERSION,
                    objectStores: CONFIG.CONST_DB.DB_STORES,
                    errorCallback: (error) => {
                        console.error("DBManager error:", error);
                        self.postMessage({
                            success: false,
                            error: `Database initialization error: ${error}`,
                        });
                    },
                });
                await dbManager.init();
                logger.log("DBManager initialized successfully");
            } catch (initError) {
                logger.error("DBManager initialization failed:", initError);
                throw initError;
            }
        }

        switch (type) {
            case "saveProcessedBookFromServer":
                logger.log("Worker starting save operation");
                const { processedBook } = payload;

                // Prepare data to save
                const bookData = {
                    name: processedBook.name,
                    data: processedBook.metadata.path,
                    isFromLocal: processedBook.metadata.isFromLocal ?? false,
                    isOnServer: processedBook.metadata.isOnServer ?? true,
                    isEastern: processedBook.metadata.isEastern,
                    encoding: processedBook.metadata.encoding,
                    metadata: processedBook.metadata,
                    content: processedBook.content,
                };

                // Save book to database
                await dbManager.put(bookData, {
                    stores: {
                        bookfiles: (data) => ({
                            name: data.name,
                            data: data.data,
                            isFromLocal: data.isFromLocal,
                            isOnServer: data.isOnServer,
                            processed: data.metadata.processed,
                            pageBreakOnTitle: data.metadata.pageBreakOnTitle ?? true,
                            isEastern: data.isEastern,
                            createdAt: data.metadata.createdAt,
                        }),
                        bookProcessed: (data) => ({
                            name: data.name,
                            is_eastern_lan: data.metadata.is_eastern_lan,
                            encoding: data.encoding,
                            bookAndAuthor: data.metadata.bookAndAuthor,
                            title_page_line_number_offset: data.metadata.titlePageLineNumberOffset,
                            seal_rotate_en: data.metadata.sealRotateEn,
                            seal_left: parseFloat(data.metadata.sealLeft),
                            file_content_chunks: data.content.fileContentChunks,
                            all_titles: data.content.allTitles,
                            all_titles_ind: data.content.allTitlesInd,
                            footnotes: data.content.footnotes,
                            footnote_processed_counter: parseInt(data.metadata.footnoteProcessedCounter),
                            page_breaks: data.content.pageBreaks,
                            total_pages: parseInt(data.metadata.totalPages),
                            processedAt: data.metadata.processedAt,
                        }),
                    },
                });

                logger.log("Worker save operation completed");
                self.postMessage({ success: true });
                break;

            default:
                throw new Error(`Unknown operation: ${type}`);
        }
    } catch (error) {
        console.error("Worker error:", error);
        console.error("Error stack:", error.stack);
        self.postMessage({
            success: false,
            error: error.message,
            stack: error.stack,
        });
    }
};
