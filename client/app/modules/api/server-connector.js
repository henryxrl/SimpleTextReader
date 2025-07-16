/**
 * @fileoverview Server integration module
 * Handles communication with backend server and cloud library features
 *
 * @module client/app/modules/api/server-connector
 * @requires shared/utils/logger
 * @requires shared/core/callback/callback-registry
 * @requires client/app/modules/api/websocket-client
 * @requires client/app/modules/components/cover-animation
 * @requires shared/config/shared-config
 * @requires client/app/modules/file/file-handler
 * @requires client/app/utils/base
 * @requires client/app/utils/helpers-server
 * @requires client/app/config/constants
 * @requires client/app/config/variables-dom
 * @requires client/app/utils/helpers-worker
 */

import { Logger } from "../../../../shared/utils/logger.js";
import { cbReg } from "../../../../shared/core/callback/callback-registry.js";
import { WebSocketClient } from "../api/websocket-client.js";
import { CoverAnimation } from "../components/cover-animation.js";
import { SHARED_CONFIG } from "../../../../shared/config/shared-config.js";
import { FileHandler } from "../file/file-handler.js";
import { getBookCoverCanvas } from "../../utils/base.js";
import { fetchAuthenticatedFile } from "../../utils/helpers-server.js";
import { CONST_PAGINATION } from "../../config/constants.js";
import { RUNTIME_VARS, RUNTIME_CONFIG } from "../../config/variables-dom.js";
import { createWorker } from "../../utils/helpers-worker.js";

/**
 * @type {WeakMap<HTMLCanvasElement, any>}
 * @private
 */
window._animations = new WeakMap();

/**
 * @type {Logger}
 * @private
 */
const logger = Logger.getLogger("ServerConnector", false);

/**
 * @class ServerConnector
 * @classdesc Manages server connection and cloud library features
 */
class ServerConnector {
    /**
     * @constructor
     * @description Initializes the ServerConnector
     */
    constructor() {
        this.isConnected = false;
        this.config = SHARED_CONFIG;
        this.isFrontendMode = true;
        this.sessionId = null;
        this.fetchWorker = null;
    }

    /**
     * Check if server mode is activated
     */
    async checkServerMode() {
        try {
            const response = await fetch(this.config.API.URL.BASE);
            if (response.ok) {
                const data = await response.json();
                if (data.status === "ok" && data.services?.library?.status === "ok") {
                    this.isFrontendMode = false;
                    logger.log("Server mode activated:", data.services.library);
                }
            }
        } catch (e) {
            console.log("Frontend only mode");
            this.isFrontendMode = true;
        }
    }

    /**
     * Initialize server connection and start cloud library if available
     */
    async init() {
        await this.checkServerMode();
        if (this.isFrontendMode) {
            console.log("Frontend-only mode detected, skipping server check.");
            this.isConnected = false;
            return;
        }

        try {
            const response = await fetch(this.config.API.URL.BASE, {
                signal: AbortSignal.timeout(2000),
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error("Health check failed");
            }

            const health = await response.json();
            this.isConnected = health.status === "ok";
            this.sessionId = health.sessionId;

            if (this.isConnected) {
                console.log("Backend server detected, starting cloud library...");

                // Send runtime configuration to the server
                if (this.sessionId) {
                    await this.sendRuntimeConfig();
                } else {
                    console.warn("No valid session established");
                }

                if (health.services.library.directoryExists) {
                    await this.startCloudLibrary();
                    // Initialize fetch worker
                    this.fetchWorker = createWorker("client/app/modules/api/fetch-worker.js", import.meta.url);
                    logger.log("Fetch worker initialized");
                } else {
                    console.log("Cloud library does not exist.");
                    await this.activateOfflineMode();
                }
            } else {
                console.log("Running in frontend-only mode (backend responded with error).");
            }
        } catch (err) {
            this.isConnected = false;
            console.log("Running in frontend-only mode (no backend detected).");
        }
    }

    /**
     * Start cloud library and load books
     */
    async startCloudLibrary() {
        try {
            console.log("Cloud library exists. Loading books...");
            await this.loadCloudBooks();
        } catch (err) {
            console.log("Server error. Offline mode activated.");
            await this.activateOfflineMode();
        }
    }

    /**
     * Load books from cloud server
     */
    async loadCloudBooks() {
        try {
            const response = await fetch(this.config.API.URL.LIBRARY, {
                headers: {
                    Accept: "application/json",
                },
                credentials: "include",
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch book list: ${response.status}`);
            }
            const bookPaths = await response.json();
            const books = [];

            for (const bookName of bookPaths) {
                try {
                    logger.log("Requesting token for book:", bookName);
                    const book = await fetchAuthenticatedFile(bookName, false);
                    logger.log("Book metadata:", book);
                    books.push(book);
                } catch (err) {
                    console.error(`Error loading book ${bookName}:`, err);
                    continue;
                }
            }

            await FileHandler.handleMultipleFiles(books, false, true, false);
            console.log("Cloud library loaded.");

            cbReg.go("reopenBook");
        } catch (err) {
            console.error("Failed to load books on the server:", err);
            throw err;
        }
    }

    /**
     * Activate offline mode
     */
    async activateOfflineMode() {
        await bookshelf.refreshBookList(true, true);
        await bookshelf.reopenBook();
    }

    /**
     * Check if server is connected
     */
    isServerConnected() {
        return this.isConnected;
    }

    /**
     * Send runtime configuration to the server
     */
    async sendRuntimeConfig() {
        if (!this.isConnected || !this.sessionId) {
            console.warn("Cannot send config: no connection or session");
            return;
        }

        try {
            const config = {
                CONST_PAGINATION: CONST_PAGINATION,
                PAGE_BREAK_ON_TITLE: RUNTIME_CONFIG.PAGE_BREAK_ON_TITLE,
                STYLE: RUNTIME_VARS.STYLE,
            };

            logger.log("Session ID:", this.sessionId);
            logger.log("Sending runtime config:", config);
            logger.log("Sending to:", `${this.config.API.URL.BASE}/config/update`);

            const response = await fetch(`${this.config.API.URL.CONFIG_UPDATE}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "X-Session-ID": this.sessionId,
                },
                credentials: "include",
                body: JSON.stringify(config),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Server response:", errorData);
                throw new Error(`Failed to send runtime config: ${response.statusText}`);
            }

            logger.log("Runtime config sent to server successfully");
        } catch (error) {
            console.error("Error sending runtime config:", error);
        }
    }

    /**
     * Fetches a file using the worker with requestAnimationFrame
     * @param {string} filename - Name of the file to fetch
     * @param {boolean} loadContent - Whether to load the file content
     * @returns {Promise<Object>} The fetched file data
     */
    async fetchFile(filename, loadContent = true) {
        if (!this.fetchWorker) {
            throw new Error("Fetch worker not initialized");
        }

        return new Promise((resolve, reject) => {
            // Schedule the worker message in the next animation frame
            requestAnimationFrame(() => {
                const messageHandler = (e) => {
                    // Handle response in the next animation frame
                    requestAnimationFrame(() => {
                        if (e.data.type === "success") {
                            resolve(e.data.data);
                        } else if (e.data.type === "error") {
                            reject(new Error(e.data.error));
                        }
                        this.fetchWorker.removeEventListener("message", messageHandler);
                    });
                };

                this.fetchWorker.addEventListener("message", messageHandler);
                this.fetchWorker.postMessage({ filename, loadContent });
            });
        });
    }
}

/**
 * Initializes the server connector module
 * @public
 */
export async function initServerConnector() {
    // Initialize server connector
    const serverConnector = new ServerConnector();
    await serverConnector.init();

    if (serverConnector.isFrontendMode) {
        console.log("Frontend-only mode detected, skipping WebSocket connection.");
        return;
    }

    try {
        // Initialize WebSocket connection
        await WebSocketClient.getInstance();
        logger.log("WebSocket connection initialized");

        // Add global progress listener
        WebSocketClient.addListener("processingProgress", (data) => {
            logger.log("Processing progress:", data);
            const { bookName, percentage } = data;

            // Find the corresponding book's canvas
            const canvas = getBookCoverCanvas(bookName);

            if (canvas) {
                let animation = window._animations.get(canvas);
                if (!animation) {
                    const animationType = CoverAnimation.Type.RADAR;
                    animation = CoverAnimation.create(canvas, animationType);
                    window._animations.set(canvas, animation);
                }

                // Ensure that the progress value is between 0 and 80
                const adjustedPercentage = Math.min(80, percentage);
                animation.start(adjustedPercentage);
            }
        });

        // Add global book processing status listener
        WebSocketClient.addListener("bookProcessingStatus", async (data) => {
            const { name, status, processed, bookId } = data;
            logger.log(`Received book status: ${status} for ${name}`);

            if (status === "processing") {
                logger.log(`Book processing started: "${name}"`);
            } else if (status === "processed" && processed) {
                logger.log(`Server processing complete, starting client-side operations: "${name}"`);
                logger.log(`Starting fetch phase for "${name}", setting progress to 80%`);
                const canvas = getBookCoverCanvas(name);

                if (canvas) {
                    let animation = window._animations.get(canvas);
                    if (!animation) {
                        // Use the same animation type as processingProgress
                        let animationType = CoverAnimation.Type.RADAR;

                        // Iterate through all canvas elements to find existing animations
                        document.querySelectorAll("canvas").forEach((existingCanvas) => {
                            const existingAnimation = window._animations.get(existingCanvas);
                            if (existingAnimation) {
                                const type = existingAnimation.type || CoverAnimation.Type.RADAR;
                                animationType = type;
                            }
                        });

                        animation = CoverAnimation.create(canvas, animationType);
                        window._animations.set(canvas, animation);
                    }

                    try {
                        // Immediately fetch the processed book using worker
                        // const serverBook = await fetchAuthenticatedFile(name, true);
                        const serverBook = await serverConnector.fetchFile(name, true);
                        logger.log(`Fetch complete for "${name}", setting progress to 90%`);
                        animation.start(90);

                        // Trigger event and wait for database operation to complete
                        const savePromise = new Promise((resolve) => {
                            cbReg.once("saveProcessedBookComplete", () => {
                                logger.log(`Save complete for "${name}", setting progress to 100%`);
                                animation.start(100);
                                resolve();
                            });

                            // Trigger save event and wait for database operation to complete
                            cbReg.go("saveProcessedBookFromServer", {
                                processedBook: serverBook,
                                refreshBookshelf: false,
                                hardRefresh: false,
                                sortBookshelf: false,
                                inFileProcessingCallback: false,
                            });
                        });

                        // Wait for save to complete
                        await savePromise;
                        console.log(`Book processing complete: "${name}"`);
                    } catch (error) {
                        console.error(`Error processing "${name}":`, error);
                        animation.start(0);
                    }
                }
            }
        });
    } catch (error) {
        console.error("WebSocket initialization error:", error);
    }
}
