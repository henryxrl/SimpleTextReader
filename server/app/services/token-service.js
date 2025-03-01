/**
 * @fileoverview Token management service for file access
 * Handles tokens for different file types (books, fonts, etc.)
 *
 * @module server/app/services/tokenService
 * @requires crypto
 * @requires server/app/config/config
 */

import crypto from "crypto";
import { config } from "../config/config.js";

/**
 * @typedef {Object} TokenData
 * @property {string} resource - Resource identifier (filename)
 * @property {string} type - Resource type (book, font)
 * @property {string} sessionId - Session identifier
 * @property {number} timestamp - Token creation time
 * @property {number} expiresIn - Token expiration time in ms
 * @property {boolean} used - Whether token has been used
 */

export class TokenService {
    constructor() {
        /** @type {Map<string, TokenData>} */
        this.tokens = new Map();

        // Schedule cleanup
        this.cleanupInterval = setInterval(() => this.cleanupExpiredTokens(), config.TOKEN.CLEANUP_INTERVAL);

        // Cleanup on service shutdown
        if (typeof process !== "undefined") {
            process.on("SIGTERM", () => {
                clearInterval(this.cleanupInterval);
                this.tokens.clear();
            });
        }
    }

    /**
     * Generates a new access token
     * @param {Object} params - Token generation parameters
     * @param {string} params.resource - Resource identifier (filename)
     * @param {string} params.type - Resource type (book, font)
     * @param {string} params.sessionId - Session identifier
     * @param {number} [params.expiresIn] - Custom expiration time
     * @returns {Object} Token and expiration info
     */
    generateToken({ resource, type, sessionId, expiresIn = config.TOKEN.EXPIRY }) {
        // Clean up before generating new token
        this.cleanupExpiredTokens();

        const token = crypto.randomBytes(32).toString("hex");

        this.tokens.set(token, {
            resource,
            type,
            sessionId,
            timestamp: Date.now(),
            expiresIn,
            used: false,
        });

        return { token, expiresIn };
    }

    /**
     * Validates and retrieves token data
     * @param {string} token - Token to validate
     * @param {string} sessionId - Current session ID
     * @param {string} type - Expected resource type
     * @returns {TokenData|null} Token data if valid, null otherwise
     */
    validateToken(token, sessionId, type) {
        const tokenData = this.tokens.get(token);

        if (!tokenData) {
            return null;
        }

        // Validate token type
        if (tokenData.type !== type) {
            console.log(`[Security] Token type mismatch: expected ${type}, got ${tokenData.type}`);
            return null;
        }

        // Check expiration
        if (Date.now() > tokenData.timestamp + tokenData.expiresIn) {
            this.tokens.delete(token);
            return null;
        }

        // Validate session and usage
        if (tokenData.used || tokenData.sessionId !== sessionId) {
            return null;
        }

        // Mark as used
        tokenData.used = true;
        return tokenData;
    }

    /**
     * Removes expired tokens
     * @private
     */
    cleanupExpiredTokens() {
        const now = Date.now();
        let cleanedCount = 0;
        let typeStats = new Map();

        for (const [token, data] of this.tokens.entries()) {
            if (now > data.timestamp + data.expiresIn) {
                this.tokens.delete(token);
                cleanedCount++;

                // Track cleanup by type
                typeStats.set(data.type, (typeStats.get(data.type) || 0) + 1);
            }
        }

        if (cleanedCount > 0) {
            console.log(`[Cleanup] Removed ${cleanedCount} expired tokens:`, Object.fromEntries(typeStats));
        }
    }

    /**
     * Explicitly removes a token
     * @param {string} token - Token to remove
     */
    deleteToken(token) {
        this.tokens.delete(token);
    }

    /**
     * Gets current token count
     * @returns {Object} Token counts by type
     */
    getStats() {
        const stats = new Map();
        for (const [_, data] of this.tokens.entries()) {
            stats.set(data.type, (stats.get(data.type) || 0) + 1);
        }
        return Object.fromEntries(stats);
    }
}

// Create singleton instance
export const tokenService = new TokenService();
