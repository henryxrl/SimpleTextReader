/**
 * @fileoverview WebSocket client module
 *
 * This module provides a singleton WebSocket client for sending and receiving messages.
 * It includes methods for connecting to the WebSocket server, adding and removing listeners,
 * and handling WebSocket events.
 *
 * @module client/app/modules/api/websocket-client
 * @requires shared/utils/logger
 */

import { Logger } from "../../../../shared/utils/logger.js";

/**
 * @class WebSocketClient
 * @description Singleton class for WebSocket client
 */
export class WebSocketClient {
    /**
     * @type {Logger} Logger instance
     * @static
     */
    static #logger = Logger.getLogger(WebSocketClient, false);

    /**
     * @type {WebSocketClient} Singleton instance
     */
    static instance = null;

    /**
     * @type {Map<string, Set<Function>>} Map of listeners for each message type
     */
    static listeners = new Map();

    /**
     * Get the singleton instance of WebSocketClient
     * @returns {WebSocketClient} Singleton instance
     */
    static getInstance() {
        if (!this.instance) {
            this.#logger.log("Creating new WebSocketClient instance");
            this.instance = new WebSocketClient();
        }
        return this.instance;
    }

    /**
     * @constructor
     */
    constructor() {
        WebSocketClient.#logger.log("WebSocketClient constructor called");
        this.ws = null;
        this.connect();
    }

    /**
     * Connect to the WebSocket server
     */
    connect() {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}`;

        WebSocketClient.#logger.log("Attempting to connect to WebSocket server:", wsUrl);

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            WebSocketClient.#logger.log("WebSocket connected successfully");
        };

        this.ws.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                WebSocketClient.#logger.log("WebSocket message received:", data);

                const listeners = WebSocketClient.listeners.get(data.type);
                WebSocketClient.#logger.log(
                    `Found ${listeners ? listeners.size : "undefined"} listeners for type ${data.type}`
                );

                if (listeners) {
                    listeners.forEach((callback) => callback(data));
                }
            } catch (error) {
                WebSocketClient.#logger.error("WebSocket message error:", error);
            }
        };

        this.ws.onclose = () => {
            WebSocketClient.#logger.log("WebSocket disconnected, trying to reconnect...");
            setTimeout(() => this.connect(), 3000);
        };

        this.ws.onerror = (error) => {
            WebSocketClient.#logger.error("WebSocket connection error:", error);
        };
    }

    /**
     * Add a listener for a specific message type
     * @param {string} type - The message type
     * @param {Function} callback - The callback function to execute when the message is received
     */
    static addListener(type, callback) {
        this.#logger.log(`Adding listener for type: ${type}`);
        if (!this.listeners.has(type)) {
            this.#logger.log(`Creating new Set for type: ${type}`);
            this.listeners.set(type, new Set());
        }
        const listeners = this.listeners.get(type);
        listeners.add(callback);
        this.#logger.log(`Current listeners for ${type}:`, listeners.size);
    }

    /**
     * Remove a listener for a specific message type
     * @param {string} type - The message type
     * @param {Function} callback - The callback function to remove
     */
    static removeListener(type, callback) {
        const listeners = this.listeners.get(type);
        if (listeners) {
            listeners.delete(callback);
            this.#logger.log(`Removed listener for type ${type}. Remaining listeners: ${listeners.size}`);
        }
    }
}
