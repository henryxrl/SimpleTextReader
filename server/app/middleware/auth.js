/**
 * @fileoverview Authentication middleware
 *
 * Provides middleware functions for:
 * - Session validation
 * - Request authentication
 * - Security checks
 *
 * @module server/app/middleware/auth
 */

/**
 * Validates session and API request
 * Ensures requests are authenticated and come from valid sources
 *
 * @middleware
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next function
 * @returns {void}
 */
export const validateSession = (req, res, next) => {
    try {
        // 1. Check basic session authentication
        if (!req.session?.authenticated) {
            console.log("[Security] Session not authenticated:", {
                sessionExists: !!req.session,
                sessionId: req.session?.id,
                authenticated: req.session?.authenticated,
            });
            return res.status(401).json({ error: "Unauthorized access" });
        }

        // 2. Check request headers
        const acceptHeader = req.get("Accept");
        const referer = req.get("Referer");

        // 3. Strictly require application/json
        if (!acceptHeader?.includes("application/json")) {
            console.log("[Security] Rejected request:", {
                accept: acceptHeader,
                referer: referer,
                path: req.path,
                sessionId: req.session.id,
            });
            return res.status(403).json({ error: "Invalid request source" });
        }

        // 4. Validate if request is from the app
        const isFromApp =
            !referer || // Allow requests without referer (initialization may not have one)
            referer.includes("index.html") ||
            referer.includes("localhost") ||
            referer.includes("127.0.0.1") ||
            referer.includes("::1");

        if (!isFromApp) {
            console.log("[Security] Invalid referer:", {
                referer: referer,
                sessionId: req.session.id,
            });
            return res.status(403).json({ error: "Invalid request source" });
        }

        // 5. Check if session ID matches (if provided in the request header)
        const headerSessionId = req.headers["x-session-id"];
        if (headerSessionId && headerSessionId !== req.session.id) {
            console.log("[Security] Session ID mismatch:", {
                headerSessionId,
                sessionId: req.session.id,
            });
            return res.status(403).json({ error: "Invalid session" });
        }

        next();
    } catch (error) {
        console.error("[Security] Session validation error:", error);
        res.status(500).json({ error: "Session validation failed" });
    }
};
