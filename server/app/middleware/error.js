/**
 * @fileoverview Error handling middleware
 *
 * Provides centralized error handling for:
 * - API errors
 * - File system errors
 * - Authentication errors
 * - Validation errors
 *
 * @module server/app/middleware/error
 */

/**
 * Custom error class for API errors
 */
export class APIError extends Error {
    constructor(message, status = 500, details = null) {
        super(message);
        this.name = "APIError";
        this.status = status;
        this.details = details;
    }
}

/**
 * Custom error class for database errors
 */
export class DatabaseError extends Error {
    constructor(message, originalError = null) {
        super(message);
        this.name = "DatabaseError";
        this.originalError = originalError;
        this.details = originalError
            ? {
                  message: originalError.message,
                  code: originalError.code,
                  meta: originalError.meta,
              }
            : null;
    }
}

/**
 * Global error handler middleware
 * Handles all uncaught errors in the application
 *
 * @middleware
 * @param {Error} err - Error object
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next function
 */
export const errorHandler = (err, req, res, next) => {
    console.error("Error occurred:", {
        path: req.path,
        method: req.method,
        error: err.message,
        stack: err.stack,
    });

    // Handle specific error types
    if (err instanceof APIError) {
        return res.status(err.status).json({
            error: err.message,
            details: err.details,
            timestamp: new Date().toISOString(),
        });
    }

    // Handle file system errors
    if (err.code === "ENOENT") {
        return res.status(404).json({
            error: "Resource not found",
            timestamp: new Date().toISOString(),
        });
    }

    if (err.code === "EACCES") {
        return res.status(403).json({
            error: "Access denied",
            timestamp: new Date().toISOString(),
        });
    }

    // Default error response
    res.status(500).json({
        error: "Internal server error",
        timestamp: new Date().toISOString(),
    });
};

/**
 * Helper function to send immediate error response
 * Uses the same format as errorHandler but sends immediately
 *
 * @param {Error} error - Error object
 * @param {express.Response} res - Express response object
 */
export const sendImmediateError = (error, res) => {
    // If the response has already been sent, return directly
    if (res.headersSent) {
        return;
    }

    // Convert to APIError if not already
    const apiError =
        error instanceof APIError
            ? error
            : new APIError("Internal server error", 500, {
                  message: error.message,
                  code: error.code,
              });

    // Use the same format as errorHandler to send the response
    res.status(apiError.status).json({
        error: apiError.message,
        details: apiError.details,
        timestamp: new Date().toISOString(),
    });
};

/**
 * Setup global error handlers
 */
export const setupGlobalErrorHandlers = () => {
    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
        console.error("Uncaught Exception:", {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
        });
        // Do not exit the process
    });

    // Handle unhandled Promise rejections
    process.on("unhandledRejection", (reason, promise) => {
        console.error("Unhandled Rejection:", {
            reason: reason,
            promise: promise,
            timestamp: new Date().toISOString(),
        });
        // Do not exit the process
    });
};
