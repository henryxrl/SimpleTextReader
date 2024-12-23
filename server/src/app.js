const express = require("express");
const path = require("path");
const booksRouter = require("./routes/books");
const config = require("./config/config");

/**
 * Initialize the Express app
 */
const app = express();
const PORT = config.PORT;

/**
 * Serve static files
 */
app.use("/css", express.static(path.join(__dirname, "../../css")));
app.use("/fonts", express.static(path.join(__dirname, "../../fonts")));
app.use("/images", express.static(path.join(__dirname, "../../images")));
app.use("/scripts", express.static(path.join(__dirname, "../../scripts")));
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../../index.html"));
});
app.get("/version.json", (req, res) => {
    res.sendFile(path.join(__dirname, "../../version.json"));
});

/**
 * Serve API to list books
 */
app.use("/api/books", booksRouter);

/**
 * Start server
 */
app.listen(PORT, () => {
    console.log(`Server is running on ${config.SERVER_URL}`);
});

module.exports = app;
