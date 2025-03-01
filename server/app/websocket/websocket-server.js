/**
 * @fileoverview WebSocket server module
 *
 * This module provides a singleton WebSocket server for broadcasting messages to connected clients.
 * It includes methods for initializing the server, broadcasting messages, and handling WebSocket events.
 *
 * @module server/app/websocket/websocket-server
 * @requires ws
 * @requires shared/utils/logger
 */

import { WebSocketServer as WSServer, WebSocket } from "ws";
import { Logger } from "../../../shared/utils/logger.js";

/**
 * @class WebSocketServer
 * @description Singleton class for WebSocket server
 */
export class WebSocketServer {
    /**
     * @type {Logger} Logger instance
     * @static
     */
    static #logger = Logger.getLogger(WebSocketServer, false);

    /**
     * @type {WebSocketServer} Singleton instance
     */
    static instance = null;

    /**
     * @type {Set<WebSocket>} Set of connected clients
     */
    static clients = new Set();

    /**
     * Initialize the WebSocket server
     * @param {http.Server} server - The HTTP server instance
     * @returns {WebSocketServer} Singleton instance
     */
    static init(server) {
        if (!this.instance) {
            this.#logger.log("Initializing WebSocket server...");
            this.instance = new WSServer({ server });

            this.instance.on("connection", (ws) => {
                this.#logger.log("New WebSocket client connected");
                this.clients.add(ws);
                this.#logger.log(`Total connected clients: ${this.clients.size}`);

                ws.on("close", () => {
                    this.#logger.log("WebSocket client disconnected");
                    this.clients.delete(ws);
                    this.#logger.log(`Remaining connected clients: ${this.clients.size}`);
                });
            });

            this.#logger.log("WebSocket server initialized successfully");
        }
        return this.instance;
    }

    /**
     * Broadcast a message to all connected clients
     * @param {string} type - The message type
     * @param {Object} data - The message data
     */
    static broadcast(type, data) {
        const message = JSON.stringify({
            type,
            ...data,
        });

        this.#logger.log(`Broadcasting ${type}:`, data);
        this.#logger.log(`Current clients state:`);

        this.clients.forEach((client) => {
            this.#logger.log(`- Client readyState: ${client.readyState}`);
            // WebSocket readyState:
            // 0 (CONNECTING)
            // 1 (OPEN)
            // 2 (CLOSING)
            // 3 (CLOSED)
            this.#logger.log(`- Client readyState === WebSocket.OPEN: ${client.readyState === WebSocket.OPEN}`);
            this.#logger.log(`- WebSocket.OPEN value: ${WebSocket.OPEN}`);
        });

        let sentCount = 0;
        this.clients.forEach((client) => {
            try {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(message);
                    sentCount++;
                    this.#logger.log("Message sent successfully to client");
                } else {
                    this.#logger.log(`Client skipped because readyState is ${client.readyState}`);
                }
            } catch (error) {
                this.#logger.error("Error sending message to client:", error);
            }
        });

        this.#logger.log(`Message sent to ${sentCount} clients (total clients: ${this.clients.size})`);
    }
}
