import { BOOKS_URL, CLOUD_LIB_EXISTS_URL, SERVER_URL } from "../app_variables.js";

startCloudLibrary();

/*
 * Helper functions
 */
async function startCloudLibrary() {
    const url = new URL(CLOUD_LIB_EXISTS_URL, SERVER_URL).href;
    try {
        await fetch(url);
    } catch (err) {
        console.log("Cloud server not running. Offline mode activated.");
        bookshelf.refreshBookList().then(function () {
            bookshelf.reopenBook();
        });
        return;
    }

    await fetch(url)
        .then((res) => res.json())
        .then(function (cloudLibraryExists) {
            if (!cloudLibraryExists) {
                console.log("Cloud library does not exist. Offline mode activated.");
                bookshelf.refreshBookList().then(function () {
                    bookshelf.reopenBook();
                });
            } else {
                console.log("Cloud library exists. Loading books...");
                // getCloudBooks();
                getCloudBooksWitoutLoading();
            }
        });
}

async function getCloudBooksWitoutLoading() {
    const url = new URL(BOOKS_URL, SERVER_URL).href;
    await fetch(url)
        .then((res) => res.json())
        .then(function (book_paths) {
            // console.log(book_paths.length);
            let books = [];
            book_paths.forEach((book_path) => {
                let bookname = book_path.substring(book_path.lastIndexOf("/") + 1);
                if (bookname.endsWith(".txt")) {
                    // console.log(bookname);
                    books.push({ name: bookname, path: book_path });
                }
            });
            // console.log(books);
            return books;
        })
        .then(function (books) {
            Promise.all(books).then(function (books) {
                // console.log(books);
                handleMultipleFiles(books, false, true, false).then(function () {
                    console.log("Cloud library loaded.");
                    bookshelf.reopenBook();
                });
            });
        });
}

async function getCloudBooks() {
    const url = new URL(BOOKS_URL, SERVER_URL).href;
    await fetch(url)
        .then((res) => res.json())
        .then(function (book_paths) {
            // console.log(book_paths.length);
            let books = [];
            book_paths.forEach((book_path) => {
                let bookname = book_path.substring(book_path.lastIndexOf("/") + 1);
                if (bookname.endsWith(".txt")) {
                    // console.log(bookname);
                    books.push(URLToFileObject(book_path, decodeURIComponent(bookname)));
                }
            });
            // console.log(books);
            return books;
        })
        .then(function (books) {
            Promise.all(books).then(function (books) {
                // console.log(books);
                handleMultipleFiles(books, false, true).then(function () {
                    console.log("Cloud library loaded.");
                    bookshelf.reopenBook();
                });
            });
        });
}

async function URLToFileObject(url, filename) {
    const response = await fetch(url);
    const data = await response.blob();
    return new File([data], filename, { type: data.type });
}
