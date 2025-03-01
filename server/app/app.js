/**
 * @fileoverview Express Application Entry Point
 *
 * This module initializes and configures the Express application.
 * It sets up:
 * - Middleware (JSON parsing, session handling)
 * - Static file serving
 * - API routes
 * - Error handling
 * - Server startup
 *
 * The application serves both static files and API endpoints,
 * with a fallback to index.html for client-side routing.
 *
 * @module server/app/app
 * @requires express
 * @requires express-session
 * @requires path
 * @requires fs
 * @requires http
 * @requires server/app/config/config
 * @requires server/app/middleware/error
 * @requires server/app/routes/api
 * @requires server/app/routes/library
 * @requires server/app/websocket/websocket-server
 */

import express from "express";
import session from "express-session";
import path from "path";
import { existsSync } from "fs";
import { createServer } from "http";
import { config } from "./config/config.js";
import { security } from "./middleware/security.js";
import { errorHandler, setupGlobalErrorHandlers } from "./middleware/error.js";
import { apiRouter } from "./routes/api.js";
import { libraryRouter } from "./routes/library.js";
import { WebSocketServer } from "./websocket/websocket-server.js";

/**
 * Express application instance
 * @type {express.Application}
 */
export const app = express();

/**
 * Apply security middleware
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next function
 */
app.use(security);

/**
 * Configure middleware for parsing request bodies
 * Enables parsing of:
 * - JSON payloads
 * - URL-encoded bodies
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Configure session middleware
 * Sets up session handling with:
 * - Secret key for encryption
 * - Session persistence settings
 * - Cookie configuration
 * @param {Object} config.SESSION - Session configuration
 */
app.use(session(config.SESSION));

/**
 * Simplified authentication middleware
 * Auto-authenticates all sessions for development
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next function
 */
app.use((req, res, next) => {
    // If already authenticated, continue
    if (req.session.authenticated) {
        return next();
    }

    // Check if request is from localhost
    const isLocalRequest = req.ip === "127.0.0.1" || req.ip === "::1" || req.ip === "localhost";

    if (process.env.NODE_ENV === "production") {
        // Production: only allow local requests to authenticate
        if (isLocalRequest) {
            req.session.authenticated = true;
        }
    } else {
        // Development: automatically authenticate all requests
        req.session.authenticated = true;
    }

    next();
});

/**
 * Configure static file serving
 * Serves files from the project root with proper MIME types
 * @param {string} root - Project root
 */
console.log("Serving files from:", config.PATH.ROOT);
app.use(
    express.static(config.PATH.ROOT, {
        setHeaders: (res, filePath) => {
            const ext = path.extname(filePath);
            switch (ext) {
                case ".js":
                    res.setHeader("Content-Type", "application/javascript");
                    break;
                case ".css":
                    res.setHeader("Content-Type", "text/css");
                    break;
                case ".json":
                    res.setHeader("Content-Type", "application/json");
                    break;
                case ".woff":
                case ".woff2":
                    res.setHeader("Content-Type", "application/font-woff");
                    break;
                case ".otf":
                    res.setHeader("Content-Type", "application/font-otf");
                    break;
                case ".ttf":
                    res.setHeader("Content-Type", "application/font-ttf");
                    break;
            }
        },
    })
);

/**
 * Mount API router
 * Handles all API endpoints
 * @param {string} base - Base URL for API
 * @param {string} api - API URL
 */
app.use(config.API.URL.BASE, apiRouter);

/**
 * Mount library API router
 * Handles all library-related API endpoints
 * @param {string} base - Base URL for library API
 * @param {string} library - Library URL
 */
app.use(config.API.URL.LIBRARY, libraryRouter);

/**
 * Fallback route handler
 * Serves index.html for all unmatched routes to support client-side routing
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next function
 */
app.get("*", (req, res) => {
    // Use resolve to get the absolute path
    const rootPath = path.resolve(config.PATH.ROOT);
    const indexPath = path.resolve(rootPath, "index.html");

    // Validate index.html is indeed in the project root
    if (!indexPath.startsWith(rootPath)) {
        console.error("[Security] Invalid index.html path detected");
        return res.status(400).send("Invalid request");
    }

    // Validate file exists
    if (!existsSync(indexPath)) {
        console.error("[Error] index.html not found at:", indexPath);
        return res.status(404).send("File not found");
    }

    res.sendFile(indexPath);
});

/**
 * Error handling middleware
 * @param {Error} err - Error object
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next function
 */
setupGlobalErrorHandlers();
app.use(errorHandler);

/**
 * Create HTTP server instance
 * @type {http.Server}
 */
const server = createServer(app);

/**
 * Initialize WebSocket server
 */
WebSocketServer.init(server);

/**
 * Start the server
 * Initializes HTTP server on configured port
 * @param {number} port - Server port
 * @param {string} url - Server URL
 */
server.listen(config.SERVER.PORT, () => {
    console.log(`Server is running on ${config.SERVER.URL}`);
    console.log(`WebSocket server is enabled`);
});
