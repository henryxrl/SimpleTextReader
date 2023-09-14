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

    // 更新书籍阅读进度
    updateBookProgressInfo(fname, bookElm = null, inLoop = false) {
        if (!bookElm) {
            bookElm = $(`.bookshelf .book[data-filename="${fname}"]`);
            if (bookElm.length <= 0) {
                return;
            }
        }
        let progress = getProgressText(fname, !inLoop);
        if (progress) {
            bookElm.addClass("read").css("--read-progress", progress);
            bookElm.find(".progress").html("进度：" + progress).attr("title", progress);
        } else {
            bookElm.removeClass("read").css("--read-progress", "");
            bookElm.find(".progress").html("进度：无");
        }
    },

    genBookItem(bookInfo) {
        let book = $(`<div class="book" data-filename="${bookInfo.name}">
            <div style="height:1.5rem;line-height:1.5rem;"><span class="delete-btn" title="删除">&times;</span></div>
            <div class="cover">${bookInfo.name}</div>
            <div class="size">${(bookInfo.size/1000/1000).toFixed(2)} MB</div>
            <div class="progress"></div>
            </div>`);
        book.find(".cover").click((evt) => {
            evt.originalEvent.stopPropagation();
            this.openBook(bookInfo.name);
        });
        book.find(".delete-btn").click((evt) => {
            evt.originalEvent.stopPropagation();
            this.deleteBook(bookInfo.name, () => this.refreshBookList());
        });
        this.updateBookProgressInfo(bookInfo.name, book);
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
            if (filename) this.updateBookProgressInfo(filename, null, true);
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

    init() {
        $(`<div id="STRe-bookshelf-btn" class="btn-icon">
        <svg class="icon" viewBox="0 0 800 800" id="Flat" xmlns="http://www.w3.org/2000/svg">
        <path class="tofill" d="M730,611.2l-129.4-483c-7.2-26.7-34.6-42.5-61.2-35.4l-96.6,25.9c-1.1,0.3-2.1,0.7-3.1,1c-9.4-12.4-24.1-19.7-39.7-19.7H300
        c-8.8,0-17.4,2.3-25,6.8c-7.6-4.4-16.2-6.8-25-6.8H150c-27.6,0-50,22.4-50,50v500c0,27.6,22.4,50,50,50h100c8.8,0,17.4-2.3,25-6.8
        c7.6,4.4,16.2,6.8,25,6.8h100c27.6,0,50-22.4,50-50V338.8l86.9,324.2c7.1,26.7,34.5,42.5,61.2,35.4c0,0,0,0,0,0l96.6-25.9
        C721.3,665.2,737.2,637.8,730,611.2z M488.1,287.8l96.6-25.9l64.7,241.5l-96.6,25.9L488.1,287.8z M552.3,141.1l19.4,72.4l-96.6,25.9
        L455.7,167L552.3,141.1z M400,150l0,375H300V150H400z M250,150v75H150v-75H250z M150,650V275h100v375H150z M400,650H300v-75h100
        L400,650L400,650z M681.8,624.1L585.2,650l-19.4-72.4l96.6-25.9L681.8,624.1L681.8,624.1z"/>
        <path class="tofill" d="M665.9,513.9l-122.7,32.8l-70.7-263.3l122.7-32.8L665.9,513.9z M262,262H136v400h126V262z" opacity="0.3" /></div>`)
            .click(() => { this.refreshBookList(); resetUI(); })
            .prependTo($("#btnWrapper"))
            // .hide();
    },
};


// 启用 bookshelf 功能
if (!location.search.includes("no-bookshelf")) { // 地址后面加 "?no-bookshelf" 停用 bookshelf 功能
    bookshelf.init();
    bookshelf.enable();
    // 启动时打开上次阅读书籍
    bookshelf.reopenBook();
}
