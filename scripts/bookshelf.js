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

class SettingGroupBookshelf extends SettingGroupBase {
    constructor() {
        super("setting-group-bookshelf", "本地缓存书架");
        this.settings["enable"] = new SettingCheckbox(this.id + "-enable", "启用", true);
        this.settings["reopen"] = new SettingCheckbox(this.id + "-reopen", "启动时打开上次阅读书籍", true);
    }

    genHTML() {
        let sts = this.settings;
        let html = `<div class="sub-cap">${this.desc}</div>
            <div class="setting-group setting-group-bookshelf">
            <div class="row">${sts["enable"].genInputElm()} ${sts["enable"].genLabelElm()}</div>
            <div class="row">${sts["reopen"].genInputElm()} ${sts["reopen"].genLabelElm()}</div>
            </div>`;
        return html;
    }

    apply() {
        if (this.settings["enable"].value) {
            bookshelf.enable();
        } else {
            bookshelf.disable();
        }
        return this;
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
            console.log("Open book from cache: " + fname);
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
                    console.log("Openning cache-book, so not save.");
                } else {
                    console.log("saveBook: ", file.name);
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

    genBookItem(name) {
        let book = $(`<div class="book" data-filename="${name}">
			<div style="height:1.5rem;line-height:1.5rem;"><span class="delete-btn" title="删除">&times;</span></div>
			<div class="cover">${name}</div></div>`);
        book.find(".cover").click((evt) => {
            evt.originalEvent.stopPropagation();
            this.hide();
            this.openBook(name);
        });
        book.find(".delete-btn").click((evt) => {
            evt.originalEvent.stopPropagation();
            this.deleteBook(name, () => this.refreshBookList());
        });
        return book;
    },

    async refreshBookList() {
        if (this.enabled) {
            let booklist = [];
            try {
                for (const book of await this.db.getAllBooks()) {
                    booklist.push(book.name);
                }
                booklist.sort((a, b) => (a.localeCompare(b, "zh")));
                let container = $(".bookshelf .dlg-body");
                container.html("");
                let storageInfo = await navigator.storage.estimate();
                if (storageInfo) container.append(`<div class="sub-title">【提示】书籍保存在浏览器缓存空间内，可能会被系统自动清除。<br/>
                    已用空间：${(storageInfo.usage/storageInfo.quota*100).toFixed(1)}% (${(storageInfo.usage/1000/1000).toFixed(2)} MB / ${(storageInfo.quota/1000/1000).toFixed(2)} MB)<div>`);
                for (const name of booklist) {
                    container.append(this.genBookItem(name));
                }
            } catch (e) {
                console.log(e);
            }
        }
    },

    async show() {
        if (this.enabled) {
            $(`<div class="bookshelf">
			<div class="dlg-cap">本地书架</div>
			<span class="dlg-body"></span>
			</div>`).appendTo("#dropZone");
            this.refreshBookList();
        }
        return this;
    },

    hide() {
        if (this.enabled) {
            $("#bookshelfDlg").remove();
            unfreezeContent();
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
            $("#STRe-bookshelf-btn").show();
            this.enabled = true;
            this.show(true);
            console.log("Module <Bookshelf> enabled.");
            setTimeout(() => this.loop(), 1000);
        }
        return this;
    },

    disable() {
        if (this.enabled) {
            fileloadCallback.unregBefore(this.saveBook);
            $(".bookshelf").remove();
            $("#STRe-bookshelf-btn").hide();
            this.db = null;
            this.enabled = false;
            console.log("Module <Bookshelf> disabled.");
        }
        return this;
    },

    init() {
        $(`<div id="STRe-bookshelf-btn" class="btn-icon">
		<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
			<path stroke="none" d="M9 3v15h3V3H9m3 2l4 13l3-1l-4-13l-3 1M5 5v13h3V5H5M3 19v2h18v-2H3Z"/>
		</svg></div>`)
            .click(() => { this.refreshBookList(); resetUI(); })
            .prependTo($("#btnWrapper"))
            .hide();

        settingMgr.groups["Bookshelf"] = new SettingGroupBookshelf();
        settingMgr.load("Bookshelf").apply("Bookshelf");
    },
};

bookshelf.init();

// 启动时打开上次阅读书籍
if (settingMgr.groups["Bookshelf"].settings["reopen"].value) {
    // if (STRe_Settings.settings.enableRos.val) {
    bookshelf.reopenBook();
}
