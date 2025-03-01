/**
 * @fileoverview API root routes and health checks
 *
 * This module handles:
 * - API health status
 * - Service availability checks
 * - System status information
 *
 * @module server/app/routes/api
 * @requires express
 * @requires path
 * @requires server/app/config/config
 * @requires server/app/middleware/error
 * @requires server/app/services/library-service
 * @requires server/app/middleware/auth
 */

import express from "express";
import path from "path";
import { config } from "../config/config.js";
import { APIError } from "../middleware/error.js";
import { libraryService } from "../services/library-service.js";
import { validateSession } from "../middleware/auth.js";
import { runtimeConfig } from "../config/runtime-config.js";

/**
 * API router
 */
export const apiRouter = express.Router();

/**
 * GET /api
 * Checks overall API and services health status
 * No authentication required for monitoring purposes
 *
 * @route {GET} /api
 * @public
 * @returns {Object} System health status information
 */
apiRouter.get("/", async (req, res) => {
    try {
        // Initialize session
        if (!req.session.initialized) {
            req.session.initialized = true;
            req.session.authenticated = true;
            await req.session.save();
        }

        // Check library service
        const libraryExists = await libraryService.exists();
        if (!libraryExists) {
            throw new APIError("Library service unavailable", 503, {
                service: "library",
                status: "error",
            });
        }

        const books = await libraryService.getAllBooks();
        if (!Array.isArray(books)) {
            throw new APIError("Failed to fetch books", 500);
        }

        // Only return non-sensitive information
        res.status(200).json({
            status: "ok",
            timestamp: new Date().toISOString(),
            sessionId: req.session.id,
            services: {
                library: {
                    status: libraryExists ? "ok" : "error",
                    directoryExists: libraryExists,
                    bookCount: books.length,
                },
            },
        });
    } catch (error) {
        console.error("Error checking API health:", error);
        res.status(500).json({
            status: "error",
            timestamp: new Date().toISOString(),
        });
    }
});

/**
 * GET /api/details
 * Provides detailed system health information
 * Requires authentication for sensitive details
 *
 * @route {GET} /api/details
 * @authentication Required
 * @returns {Object} Detailed system health information
 */
apiRouter.get(config.API.TOKEN.API_DETAILS, validateSession, async (req, res) => {
    try {
        // Validate session status
        if (!req.session.authenticated) {
            throw new APIError("Unauthorized", 403);
        }

        // Check library service
        const libraryExists = await libraryService.exists();
        if (!libraryExists) {
            throw new APIError("Library service unavailable", 503, {
                service: "library",
                status: "error",
                path: path.resolve(config.PATH.LIBRARY),
            });
        }

        const books = await libraryService.getAllBooks();
        if (!Array.isArray(books)) {
            throw new APIError("Failed to fetch books", 500);
        }

        res.status(200).json({
            status: "ok",
            timestamp: new Date().toISOString(),
            sessionId: req.session.id,
            server: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                nodeVersion: process.version,
            },
            services: {
                library: {
                    status: libraryExists ? "ok" : "error",
                    directoryExists: libraryExists,
                    path: path.resolve(config.PATH.LIBRARY),
                    bookCount: books.length,
                    books: books,
                },
            },
            auth: {
                enabled: true,
                authenticated: req.session.authenticated,
                sessionId: req.session.id,
            },
        });
    } catch (error) {
        console.error("Error checking API detailed health:", error);
        res.status(500).json({
            status: "error",
            timestamp: new Date().toISOString(),
            error: "Failed to check API detailed health",
            details: error.message,
        });
    }
});

/**
 * POST /api/config/update
 * Update runtime config
 *
 * @route {POST} /api/config/update
 * @param {Object} req.body - Frontend config
 * @param {Object} req.body.CONST_PAGINATION - Pagination config
 * @param {boolean} req.body.PAGE_BREAK_ON_TITLE - Whether to break on title
 * @param {Object} req.body.STYLE - Style variables
 * @param {Object} req.query.sessionId - Session ID
 * @returns {Object} Status of config update
 */
apiRouter.post(config.API.TOKEN.CONFIG_UPDATE, validateSession, async (req, res) => {
    try {
        // Validate session status
        if (!req.session.authenticated) {
            throw new APIError("Unauthorized", 403);
        }

        const clientConfig = req.body;
        // console.log("Session ID:", req.session.id);
        // console.log("Received config:", clientConfig);

        // Validate required config fields
        if (!clientConfig || typeof clientConfig !== "object") {
            throw new APIError("Invalid config data", 400);
        }

        // Update config
        runtimeConfig.updateConfig(clientConfig);

        // console.log("Runtime config updated:", clientConfig);

        res.status(200).json({
            status: "ok",
            message: "Config updated successfully",
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Error updating config:", error);
        res.status(error.status || 500).json({
            status: "error",
            message: error.message,
            timestamp: new Date().toISOString(),
        });
    }
});

/**
 * GET /api/config
 * Get current runtime config
 *
 * @route {GET} /api/config
 * @param {Object} req.query.sessionId - Session ID
 * @returns {Object} Current runtime config
 */
apiRouter.get(config.API.TOKEN.CONFIG, validateSession, async (req, res) => {
    try {
        // If config is not ready, return corresponding status
        if (!runtimeConfig.isReady) {
            res.status(202).json({
                status: "pending",
                message: "Runtime config not ready",
                timestamp: new Date().toISOString(),
            });
            return;
        }

        // Return current config
        res.status(200).json({
            status: "ok",
            config: runtimeConfig.config,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Error fetching config:", error);
        res.status(500).json({
            status: "error",
            message: error.message,
            timestamp: new Date().toISOString(),
        });
    }
});
