const express = require("express");
const router = express.Router();
const bookService = require("../services/bookService");

/**
 * GET / - Fetch a list of all available books.
 */
router.get("/", async (req, res) => {
    try {
        const books = await bookService.getAllBooks();
        res.status(200).json(books); // Explicitly set HTTP status for clarity
    } catch (error) {
        console.error("Error fetching books:", error); // Log error for debugging
        res.status(500).json({ error: "Failed to fetch books. Please try again later." });
    }
});

module.exports = router;
