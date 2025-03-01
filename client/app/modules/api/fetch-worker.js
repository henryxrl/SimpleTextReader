/**
 * @fileoverview Worker for handling authenticated file fetching
 * @module client/app/modules/api/fetch-worker
 * @requires client/app/utils/helpers-worker.js
 * @requires client/app/utils/helpers-server.js
 * @requires shared/utils/logger.js
 */

import { importDependencies } from "../../utils/helpers-worker.js";

/**
 * Handles authenticated file fetching
 * @param {Object} e - Message event
 */
self.onmessage = async (e) => {
    const { filename, loadContent } = e.data;
    let logger = null;

    try {
        const [fetchAuthenticatedFile, Logger] = await importDependencies(
            ["client/app/utils/helpers-server.js", "shared/utils/logger.js"],
            import.meta.url
        );

        logger = Logger.getLogger("FetchWorker", false);
        logger.log("Worker received fetch request", { filename, loadContent });

        const result = await fetchAuthenticatedFile(filename, loadContent);
        logger.log("Fetch completed successfully");

        self.postMessage({
            type: "success",
            data: result,
        });
    } catch (error) {
        console.error("Fetch worker error:", error);
        self.postMessage({
            type: "error",
            error: error.message,
            stack: error.stack,
        });
    }
};
