const path = require("path");

/**
 * Configuration for the server
 */
const config = {
    DIR_BOOKS: path.join(__dirname, "../../books"),
    PORT: 8866,
    get SERVER_URL() {
        return `http://localhost:${this.PORT}`;
    },
};

module.exports = config;
