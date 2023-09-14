class BookshelfDB {
    #db = null;

    connect() {
        return new Promise((resolve, reject) => {
            const req = window.indexedDB.open('SimpleTextReader', 1);
            req.onupgradeneeded = function (evt) {
                let db = evt.target.result;
                console.log(`Upgrading to version ${db.version}`);

                // Create an objectStore for this database
                if (!db.objectStoreNames.contains("bookfiles")) {
                    db.createObjectStore("bookfiles", { keyPath: "name" });
                }
            };
            req.onsuccess = function (evt) {
                resolve(evt.target.result);
            };
            req.onerror = function (evt) {
                console.log("openDB.onError");
                reject(evt.target.error);
            };
        });
    }

    getObjectStore(name, mode = "readonly") {
        let trans = this.#db.transaction(name, mode);
        // trans.oncomplete = function (evt) {
        //     console.log("trans.onComplete");
        //     console.log(evt.target);
        // }
        trans.onerror = function (evt) {
            console.log("trans.onError");
            console.log(evt.target.error);
        };
        return trans.objectStore(name);
    }

    exec(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = (evt) => {
                resolve(evt.target.result);
            };
            request.onerror = (evt) => {
                console.log("exec.onError: ");
                console.log(evt.target);
                reject(evt.target.error);
            };
        });
    }

    async init() {
        try {
            if (!this.#db) {
                this.#db = await this.connect();
            }
            return true;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    async putBook(name, data) {
        if (!await this.init()) {
            throw new Error("Init local db error!");
        }
        let tbl = this.getObjectStore("bookfiles", "readwrite");
        return await this.exec(tbl.put({ name: name, data: data }));
    }

    async getBook(name) {
        if (!await this.init()) {
            throw new Error("Init local db error!");
        }
        let tbl = this.getObjectStore("bookfiles");
        let result = await this.exec(tbl.get(name));
        if (result) {
            return result.data;
        } else {
            return null;
        }
    }

    async getAllBooks() {
        if (!await this.init()) {
            throw new Error("Init local db error!");
        }
        let tbl = this.getObjectStore("bookfiles");
        let result = await this.exec(tbl.getAll());
        return result;
    }

    async isBookExist(name) {
        if (!await this.init()) {
            throw new Error("Init local db error!");
        }
        let tbl = this.getObjectStore("bookfiles");
        let result = await this.exec(tbl.getKey(name));
        return !!result;
    }

    async deleteBook(name) {
        if (!await this.init()) {
            throw new Error("Init local db error!");
        }
        let tbl = this.getObjectStore("bookfiles", "readwrite");
        await this.exec(tbl.delete(name));
    }
}

var bookshelf = {

    enabled: false,
    db: null,

    _FILENAME_: "STR-Filename",
    _CACHE_FLAG_: "STR-Cache-File",

    async reopenBook() {
        if (this.enabled) {
            // 获取之前的文件名，重新打开
            let fname = localStorage.getItem(this._FILENAME_);
            if (fname) {
                if (await bookshelf.isBookExist(fname)) {
                    console.log("Reopen book on start: " + fname);
                    await bookshelf.openBook(fname);
                }
            }
        }
    },

    async openBook(fname) {
        if (this.enabled) {
            // console.log("Open book from cache: " + fname);
            showLoadingScreen();
            try {
                let book = await this.db.getBook(fname);
                if (book) {
                    book.name = fname;
                    book[this._CACHE_FLAG_] = true;
                    resetVars();
                    handleSelectedFile([book]);
                    return true;
                } else {
                    alert("发生错误！");
                    throw new Error("openBook error! " + fname);
                }
            } catch (e) {
                console.log(e);
                return false;
            }
        }
    },

    async saveBook(file) {
        if (bookshelf.enabled) {
            if (file.type === "text/plain") {
                if (file[bookshelf._CACHE_FLAG_]) {
                    // console.log("Openning cache-book, so not save.");
                } else {
                    // console.log("saveBook: ", file.name);
                    // 先把文件保存到缓存db中
                    await bookshelf.db.putBook(file.name, file);
                    if (!await bookshelf.db.isBookExist(file.name)) alert("保存到本地书架失败（缓存空间可能已满）");
                    // 刷新 Bookshelf in DropZone
                    await bookshelf.refreshBookList();
                }
            }
        }
        return file;
    },

    async isBookExist(fname) {
        if (this.enabled) {
            return await this.db.isBookExist(fname);
        } else {
            return false;
        }
    },

    async deleteBook(fname, onSucc = null) {
        if (this.enabled) {
            this.db.deleteBook(fname).then(() => {
                if (onSucc) onSucc();
            });
        }
    },

    genBookItem(bookInfo) {
        let book = $(`<div class="book" data-filename="${bookInfo.name}">
			<div style="height:1.5rem;line-height:1.5rem;"><span class="delete-btn" title="删除">&times;</span></div>
			<div class="cover">${bookInfo.name}</div>
            <div class="size">${(bookInfo.size/1000/1000).toFixed(2)} MB</div>
            </div>`);
        book.find(".cover").click((evt) => {
            evt.originalEvent.stopPropagation();
            this.openBook(bookInfo.name);
        });
        book.find(".delete-btn").click((evt) => {
            evt.originalEvent.stopPropagation();
            this.deleteBook(bookInfo.name, () => this.refreshBookList());
        });
        return book;
    },

    async refreshBookList() {
        if (this.enabled) {
            let container = $(".bookshelf .booklist");
            container.html("");
            let storageInfo = await navigator.storage.estimate();
            if (storageInfo) {
                $("#bookshelfUsagePct").html((storageInfo.usage/storageInfo.quota*100).toFixed(1));
                $("#bookshelfUsage").html((storageInfo.usage/1000/1000).toFixed(2));
                $("#bookshelfQuota").html((storageInfo.quota/1000/1000).toFixed(2));
            }
            let booklist = [];
            try {
                for (const book of await this.db.getAllBooks()) {
                    booklist.push({name: book.name, size: book.data.size});
                }
                booklist.sort((a, b) => (a.name.localeCompare(b.name, "zh")));
                for (const bookInfo of booklist) {
                    container.append(this.genBookItem(bookInfo));
                }
            } catch (e) {
                console.log(e);
            }
        }
    },

    async show() {
        if (this.enabled) {
            $(`<div class="bookshelf">
			<div class="title">缓存书架
            <div class="sub-title">【提示】书籍保存在浏览器缓存空间内，可能会被系统自动清除。<br/>
                已用空间：<span id="bookshelfUsagePct"></span>% (<span id="bookshelfUsage"></span> MB / <span id="bookshelfQuota"></span> MB)</div></div>
			<div class="booklist"></div>
			</div>`).appendTo("#dropZone");
            await this.refreshBookList();
        }
        return this;
    },

    loop() {
        if (this.enabled) {
            localStorage.setItem(this._FILENAME_, filename);
            setTimeout(() => this.loop(), 1000);
        }
    },

    enable() {
        if (!this.enabled) {
            this.db = new BookshelfDB();
            fileloadCallback.regBefore(this.saveBook);
            this.enabled = true;
            this.show();
            console.log("Module <Bookshelf> enabled.");
            setTimeout(() => this.loop(), 1000);
        }
        return this;
    },

    disable() {
        if (this.enabled) {
            fileloadCallback.unregBefore(this.saveBook);
            $(".bookshelf").remove();
            this.db = null;
            this.enabled = false;
            console.log("Module <Bookshelf> disabled.");
        }
        return this;
    },
};

// 启用 bookshelf 功能
if (!location.search.includes("no-bookshelf")) { // 地址后面加 "?no-bookshelf" 停用 bookshelf 功能
    bookshelf.enable();
    // 启动时打开上次阅读书籍
    bookshelf.reopenBook();
}
