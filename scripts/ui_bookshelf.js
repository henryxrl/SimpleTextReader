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
    bookCount: 0,
    showScrollBtns: false,

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
                    this.hide(true);
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
        // let progress = getProgressText(fname, !inLoop);
        let progress = getProgressText(fname, false);
        if (progress) {
            bookElm.addClass("read").css("--read-progress", progress);
            bookElm.find(".progress").html(progress).attr("title", progress);
        } else {
            bookElm.removeClass("read").css("--read-progress", "");
            bookElm.find(".progress").html("0%");
        }
    },

    genBookItem(bookInfo) {
        let canvasWidth = getSizePrecise(style.ui_bookCoverWidth);
        let canvasHeight = getSizePrecise(style.ui_bookCoverHeight);
        currentBookNameAndAuthor = getBookNameAndAuthor(bookInfo.name.replace(".txt", ""));
        let book = $(`<div class="book" data-filename="${bookInfo.name}">
            <div class="delete-btn-wrapper">
                <span class="delete-btn" title="删除">&times;</span>
            </div>
            <div class="coverContainer">
                <span class="coverText">${bookInfo.name}</span>
                <canvas class="coverCanvas" id="canvas-${this.bookCount}" width="${canvasWidth}" height="${canvasHeight}"></canvas>
            </div>
            <div class="infoContainer">
                <div class="progress"></div>
                <div class="size">${formatBytes(bookInfo.size)}</div>
            </div>
            </div>`);
        let canvas = book.find(".coverCanvas");
        let ctx = canvas[0].getContext("2d");
        let coverSettings = {
            "width": canvasWidth,
            "height": canvasHeight,
            "padding": canvasWidth / 8,
            "bottomRectHeightRatio": 0.3,
            // "coverColor1": style.mainColor_inactive,
            // "coverColor2": style.mainColor_active,
            // "textColor": style.bgColor,
            "coverColor1": style.logoColor1,
            "coverColor2": style.logoColor2,
            "textColor1": style.logoColor3,
            "textColor2": style.logoColor3,
            "font1": style.fontFamily_title_CN,
            "font2": style.fontFamily_body_CN,
            // "font1": "HiraKakuProN-W6",
            // "font2": "HiraKakuProN-W3",
            "bookTitle": currentBookNameAndAuthor.bookName,
            "authorName": currentBookNameAndAuthor.author,
        };
        generateCover(coverSettings, ctx);
            
        book.find(".coverContainer").click((evt) => {
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
            let storageInfo = null;
            try {
                storageInfo = await navigator.storage.estimate();
            } catch (e) {
                console.log(e);
            }
            if (storageInfo) {
                $("#bookshelfUsagePct").html((storageInfo.usage/storageInfo.quota*100).toFixed(1));
                $("#bookshelfUsage").html(formatBytes(storageInfo.usage));
                $("#bookshelfQuota").html(formatBytes(storageInfo.quota));
            } else {
                $("#bookshelfUsageText").hide();
            }
            let booklist = [];
            this.bookCount = 0;
            try {
                for (const book of await this.db.getAllBooks()) {
                    booklist.push({name: book.name, size: book.data.size});
                }
                booklist.sort((a, b) => (a.name.localeCompare(b.name, "zh")));
                for (const bookInfo of booklist) {
                    container.append(this.genBookItem(bookInfo));
                }
                container.trigger("contentchange");
                this.bookCount += booklist.length;
            } catch (e) {
                console.log(e);
            }
        }
    },

    async show(refresh = true) {
        if (this.enabled) {
            if (isVariableDefined(dropZoneText)) {
                dropZoneText.setAttribute("style", `top: ${style.ui_dropZoneTextTop_hasBookshelf}; left: ${style.ui_dropZoneTextLeft_hasBookshelf}; font-size: ${style.ui_dropZoneTextSize_hasBookshelf}`);
            }
            if (isVariableDefined(dropZoneImg)) {
                dropZoneImg.setAttribute("style", `top: ${style.ui_dropZoneImgTop_hasBookshelf}; left: ${style.ui_dropZoneImgLeft_hasBookshelf}; width: ${style.ui_dropZoneImgSize_hasBookshelf}; height: ${style.ui_dropZoneImgSize_hasBookshelf}`);
            }

            if (isVariableDefined($(".bookshelf")) && $(".bookshelf").length > 0) {
                $(".bookshelf").show();
                return;
            }

            $(`<div class="bookshelf">
            <div class="title">缓存书架
            <div class="sub-title">【提示】书籍保存在浏览器缓存空间内，可能会被系统自动清除。<br/>
                <span id="bookshelfUsageText">已用空间：<span id="bookshelfUsagePct"></span>% (<span id="bookshelfUsage"></span> / <span id="bookshelfQuota"></span>)</span></div></div>
            <div class="booklist"></div>
            <div class="scroll-btn-group">
                <div class="btn-icon" id="scrollTop-btn" style="visibility:hidden">
                    <svg class="icon" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 125">
                        <path class="tofill" d="M15.1,65.7c-3.6,0-7.2-1.5-9.7-4.5C0.9,55.8,1.7,47.9,7,43.4l34.9-29.1c4.7-3.9,11.5-3.9,16.2,0L93,43.4 c5.4,4.5,6.1,12.4,1.6,17.8c-4.5,5.4-12.4,6.1-17.8,1.6L50,40.5L23.2,62.8C20.8,64.8,18,65.7,15.1,65.7z" opacity="1"/>
                        <path class="tofill" d="M15.1,113.6c-3.6,0-7.2-1.5-9.7-4.5C0.9,103.6,1.7,95.8,7,91.3l34.9-29.1c4.7-3.9,11.5-3.9,16.2,0L93,91.3 c5.4,4.5,6.1,12.4,1.6,17.8c-4.5,5.4-12.4,6.1-17.8,1.6L50,88.3l-26.8,22.3C20.8,112.6,18,113.6,15.1,113.6z" opacity="0.5"/>
                    </svg>
                </div>
                <div class="btn-icon" id="scrollBottom-btn" style="visibility:hidden">
                    <svg class="icon" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 125">
                        <path class="tofill" d="M84.9,59.3c3.6,0,7.2,1.5,9.7,4.5c4.5,5.4,3.7,13.3-1.6,17.8l-34.9,29.1c-4.7,3.9-11.5,3.9-16.2,0L7,81.6 c-5.4-4.5-6.1-12.4-1.6-17.8s12.4-6.1,17.8-1.6L50,84.5l26.8-22.3C79.2,60.2,82,59.3,84.9,59.3z" opacity="1"/>
                        <path class="tofill" d="M84.9,11.4c3.6,0,7.2,1.5,9.7,4.5c4.5,5.5,3.7,13.3-1.6,17.8L58.1,62.8c-4.7,3.9-11.5,3.9-16.2,0L7,33.7 c-5.4-4.5-6.1-12.4-1.6-17.8s12.4-6.1,17.8-1.6L50,36.7l26.8-22.3C79.2,12.4,82,11.4,84.9,11.4z" opacity="0.5"/>
                    </svg>
                </div>
            </div>
            </div>`)
            .on("dblclick", function(event) {
                // disable double click event inside bookshelf
                event.stopPropagation();
            })
            .appendTo("#dropZone");

            function defineScrollBtns() {
                // console.log(this.scrollTop, this.scrollHeight-this.offsetHeight);
                if (this.showScrollBtns) {
                    if (this.scrollTop > 0) {
                        $("#scrollTop-btn")
                        .css("visibility", "visible")
                        .click(() => {
                            // this.scrollTop = 0;
                            $(this).stop(true, false);
                            $(this).animate({scrollTop: 0}, 200);
                        });
                    } else {
                        $("#scrollTop-btn").css("visibility", "hidden");
                    }
                    if (this.scrollHeight-this.offsetHeight - this.scrollTop > 1) {
                        $("#scrollBottom-btn")
                        .css("visibility", "visible")
                        .click(() => {
                            // this.scrollTop = this.scrollHeight-this.offsetHeight;
                            $(this).stop(true, false);
                            $(this).animate({scrollTop: this.scrollHeight-this.offsetHeight}, 200);
                        });
                    } else {
                        $("#scrollBottom-btn").css("visibility", "hidden");
                    }
                }
            };

            $(".booklist").on("scroll", defineScrollBtns);

            $(".booklist").bind("contentchange", function() {
                // isOverflown(this) ? $(".booklist-scroll-btns").show() : $(".booklist-scroll-btns").hide();
                if (this.scrollHeight > this.parentNode.clientHeight) {
                    // console.log('overflown', this.scrollTop, this.scrollHeight-this.offsetHeight);
                    this.showScrollBtns = true;
                    defineScrollBtns.call(this);
                } else {
                    // console.log('not overflown');
                    this.showScrollBtns = false;
                    $("#scrollTop-btn").css("visibility", "hidden");
                    $("#scrollBottom-btn").css("visibility", "hidden");
                }
            });

            $(window).on("resize", function() {
                $(".booklist").trigger("contentchange");
            });

            if (refresh)
                await this.refreshBookList();
        }
        return this;
    },

    async hide(doNotRemove = true) {
        if (this.enabled) {
            if (isVariableDefined(dropZoneText)) {
                dropZoneText.setAttribute("style", `top: ${style.ui_dropZoneTextTop}; left: ${style.ui_dropZoneTextLeft}; font-size: ${style.ui_dropZoneTextSize}`);
            }
            if (isVariableDefined(dropZoneImg)) {
                dropZoneImg.setAttribute("style", `top: ${style.ui_dropZoneImgTop}; left: ${style.ui_dropZoneImgLeft}; width: ${style.ui_dropZoneImgSize}; height: ${style.ui_dropZoneImgSize}`);
            }
            if (!doNotRemove) {
                $(".bookshelf").remove();
            } else {
                $(".bookshelf").hide();
            }
        }
        return this;
    },

    hideTriggerBtn() {
        $("#STRe-bookshelf-btn").hide();
    },

    showTriggerBtn() {
        $("#STRe-bookshelf-btn").show();
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
            // console.log("Module <Bookshelf> enabled.");
            setTimeout(() => this.loop(), 1000);
        }
        return this;
    },

    disable() {
        if (this.enabled) {
            fileloadCallback.unregBefore(this.saveBook);
            this.hide();
            this.db = null;
            this.enabled = false;
            // console.log("Module <Bookshelf> disabled.");
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
        .click(() => {
            this.refreshBookList();
            this.show();
            resetUI();
        })
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
    // bookshelf.hide();
}
