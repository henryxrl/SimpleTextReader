class BookshelfDB {
    #db = null;

    connect() {
        return new Promise((resolve, reject) => {
            const indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
            const req = indexedDB.open('SimpleTextReader', 1);
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
                bookshelf.disable();
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
                    this.hide(true);
                    setBookLastReadTimestamp(book.name);
                    return true;
                } else {
                    // alert("发生错误！");
                    throw new Error(`openBook error: "${fname}"`);
                }
            } catch (e) {
                console.log(e);
                return false;
            }
        }
    },

    async saveBook(file, refreshNow = true) {
        if (bookshelf.enabled) {
            if (file.type === "text/plain") {
                if (file[bookshelf._CACHE_FLAG_]) {
                    // console.log("Openning cache-book, so not save.");
                } else {
                    // console.log("saveBook: ", file.name);
                    // 先把文件保存到缓存db中
                    try {
                        await bookshelf.db.putBook(file.name, file);
                        if (!await bookshelf.db.isBookExist(file.name)) {
                            // alert("保存到本地书架失败（缓存空间可能已满）");
                            throw new Error(`saveBook error (localStorage full): "${file.name}"`);
                        } 

                        // 刷新 Bookshelf in DropZone
                        // await bookshelf.refreshBookList();
                        if (refreshNow)
                            await resetUI();
                    } catch (e) {
                        console.log(e);
                    }
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
            if (progress === "100%") {
                // bookElm.find(".progress").html(style.ui_bookFinished).attr("title", progress);
                // add styling to the text of read
                let read_text = `<span class="read_text">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40">
                    <path d="M27.361,8.986a5.212,5.212,0,0,0-4.347-4.347,72.73,72.73,0,0,0-14.028,0A5.212,5.212,0,0,0,4.639,8.986a72.72,72.72,0,0,0,0,14.027,5.212,5.212,0,0,0,4.347,4.348,72.73,72.73,0,0,0,14.028,0,5.212,5.212,0,0,0,4.347-4.348A72.72,72.72,0,0,0,27.361,8.986Zm-4.194,4.083L16.2,20.922a1.5,1.5,0,0,1-1.114.5h-.008a1.5,1.5,0,0,1-1.111-.492L9.36,15.86a1.5,1.5,0,1,1,2.221-2.015l3.482,3.836,5.861-6.6a1.5,1.5,0,1,1,2.243,1.992Z"/>
                </svg>${style.ui_bookFinished}</span>`;
                bookElm.find(".progress").html(read_text);

                // add a badge to the book cover
                // let badge = `<div class="bookFinished_badge">
                //     <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 800 800" style="enable-background:new 0 0 800 800;">
                //         <style type="text/css">
                //             .svg-st0{fill:#FFC54D;}
                //             .svg-st1{fill:#EDB24A;}
                //             .svg-st2{fill:#EF4D4D;}
                //             .svg-st3{fill:#EF4D4D;}
                //             .svg-st4{fill:#FFF0BA;}
                //         </style>
                //         <circle class="svg-st0" cx="400" cy="558" r="155.3"/>
                //         <circle class="svg-st1" cx="400" cy="558" r="124.7"/>
                //         <path class="svg-st0" d="M400,362.7c-14.7,0-26.7,12-26.7,26.7c0,14.7,12,26.7,26.7,26.7c14.7,0,26.7-12,26.7-26.7 C426.7,374.7,414.7,362.7,400,362.7z M400,407.3c-10,0-17.3-8-17.3-17.3s8-17.3,17.3-17.3s17.3,8,17.3,17.3S410,407.3,400,407.3z"/>
                //         <path class="svg-st2" d="M548,104.7v208c0,6-4,12-10.7,15.3L458,365.3l-46.7,21.3c-6.7,3.3-15.3,3.3-22,0l-46-22L264,327.3 c-6.7-3.3-10.7-9.3-10.7-15.3V104.7c0-10,10-18,22-18h251.3C538,86.7,548,94.7,548,104.7z"/>
                //         <path class="svg-st3" d="M457.3,86.7v278.7l-46,21.3c-6.7,3.3-15.3,3.3-22,0l-46-22v-278H457.3z"/>
                //         <path class="svg-st4" d="M406.9,467.7l22.7,45.3c1.3,2,3.3,4,5.3,4l50,7.3c6,1.3,8.7,8,4,12.7l-36,36c-1.3,1.3-2.7,4-2,6.7l8.7,50 c1.3,6-5.3,10.7-10.7,7.3l-44.7-23.3c-2-1.3-4.7-1.3-6.7,0L352.2,637c-5.3,2.7-12-1.3-10.7-7.3l8.7-50c0.7-2-0.7-4.7-2-6.7l-36-35.3 c-4-4-2-12,4-12.7l50-7.3c2-0.7,4-1.3,5.3-4l22.7-45.3C396.2,462.3,404.2,462.3,406.9,467.7z"/>
                //         </svg>
                // </div>`;
                let badge = `<div class="bookFinished_badge">
                    <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
                    viewBox="0 0 800 800" style="enable-background:new 0 0 800 800;" xml:space="preserve">
                    <style type="text/css">
                    .svg-st0{fill:#FFC54D;}
                    .svg-st1{fill:#EF4D4D;}
                    .svg-st2{fill:#EF4D4D;}
                    </style>
                    <path class="svg-st0" d="M574.7,568.7l-37.3-37.3c-3.3-3.3-5.4-12.7-5.4-12.7V466c0,0-7.9-17.3-17.2-18H462c-4.7,0.7-9.3-1.3-12.7-4.6 L418,412c12.7-6.7,21.3-20,21.3-35.3c0-22-18-39.3-39.3-39.3s-39.3,18-39.3,39.3c0,15.3,8.7,28.7,21.3,35.3l-31.3,31.3 c-3.3,3.3-12.7,5.7-12.7,5.7h-52.7c-9.5,0-17.3,7.8-17.3,17.3v52.5c0,4.7-2,9.3-5.3,12.7l-37.2,37.2c-6.8,6.8-6.8,17.9,0,24.7 l37.2,37.2c3.3,3.3,5.3,8,5.3,12.7v52.5c0,9.5,7.8,17.3,17.3,17.3H338c0,0,9.3,2.3,12.7,5.6L388,756c6.7,6.7,18,6.7,24.7,0 l37.3-37.3c3.3-3.3,8-5.3,12.7-4.7h52.7c9.3-0.6,17.3-8.6,17.6-17.9v-52.7c-0.3-4.7,1.7-9.3,5-12.7l37.3-37.3 C581.3,586.7,581.3,576,574.7,568.7z M400,354c13.3,0,23.3,10.7,23.3,23.3c0,13.3-10.7,23.3-23.3,23.3c-12.7,0-23.3-10.7-23.3-23.3 S386.7,354,400,354z"/>
                    <path class="svg-st1" d="M547,98v208c0,6-4,12-10.7,15.3l-79.4,37.3l-46.7,21.3c-6.7,3.3-15.3,3.3-22,0l-46-22l-79.4-37.3 c-6.7-3.3-10.7-9.3-10.7-15.3V98c0-10,10-18,22-18h251.7C537,80,547,88,547,98z"/>
                    <path class="svg-st2" d="M457,80v278.7L411,380c-6.7,3.3-15.3,3.3-22,0l-46-22V80L457,80L457,80z"/>
                    </svg>
                </div>`;
                bookElm.find(".coverContainer").append(badge);
            } else {
                bookElm.find(".progress").html(progress).attr("title", progress);
            }
        } else {
            bookElm.removeClass("read").css("--read-progress", "");
            // bookElm.find(".progress").html(style.ui_bookNotRead);

            // add styling to the text of not read
            let notRead_text = `<span class="notRead_text">${style.ui_bookNotRead}</span>`;
            bookElm.find(".progress").html(notRead_text);

            // add a badge to the book cover
            let badge = `<div class="bookNotRead_badge">
                <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 200 200" style="enable-background:new 0 0 200 200;">
                <style type="text/css">.svg-shadow{fill:#CC3432;}.svg-ribbon{fill:#EF4D4D;}</style>
                <g id="SVGRepo_bgCarrier"></g>
                <g id="SVGRepo_tracerCarrier"></g>
                <path class="svg-shadow" d="M199.3,90.5L109.8,0.8c-0.1,0-7.5,4.1-7.6,4.2h8.8l84,84.2V98L199.3,90.5z"/>
                <polygon class="svg-ribbon" points="156,1 109.4,1 199,90.7 199,44.1 "/>
                </svg>
            </div>`;
            bookElm.find(".coverContainer").append(badge);
        }
    },

    genBookItem(bookInfo, idx) {
        // generate book cover art
        let canvasWidth = getSizePrecise(style.ui_bookCoverWidth);
        let canvasHeight = getSizePrecise(style.ui_bookCoverHeight);
        let currentBookNameAndAuthor = getBookNameAndAuthor(bookInfo.name.replace(/(.txt)$/i, ''));
        let book = $(`<div class="book" data-filename="${bookInfo.name}">
            <div class="coverContainer">
                <span class="coverText">${bookInfo.name}</span>
                <canvas class="coverCanvas" width="${canvasWidth}" height="${canvasHeight}"></canvas>
            </div>
            <div class="infoContainer">
                <div class="progress"></div>
                <div class="delete-btn-wrapper">
                    <span class="delete-btn" title="${style.ui_removeBook}">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 7V18C6 19.1046 6.89543 20 8 20H16C17.1046 20 18 19.1046 18 18V7M6 7H5M6 7H8M18 7H19M18 7H16M10 11V16M14 11V16M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7M8 7H16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    </span>
                </div>
                <div class="bookInfoMenuBtn" id="bookInfoMenuBtn-${idx}" title="${style.ui_bookInfo}">
                    <input id="dot-menu-${idx}" type="checkbox" class="dot-menu__checkbox">
                    <label for="dot-menu-${idx}" class="dot-menu__label"><span></span></label>
                </div>
            </div>
            </div>`);
        let canvas = book.find(".coverCanvas");
        let ctx = canvas[0].getContext("2d");
        let coverSettings = {
            "width": canvasWidth,
            "height": canvasHeight,
            "padding": canvasWidth / 8,
            "bottomRectHeightRatio": 0.3,
            "coverColor1": style.mainColor_inactive,
            "coverColor2": style.mainColor_active,
            "textColor1": style.bgColor,
            "textColor2": style.bgColor,
            // "coverColor1": style.logoColor1,
            // "coverColor2": style.logoColor2,
            // "textColor1": style.logoColor3,
            // "textColor2": style.logoColor3,
            "font1": style.fontFamily_title_zh,
            "font2": style.fontFamily_body_zh,
            // "font1": "HiraKakuProN-W6",
            // "font2": "HiraKakuProN-W3",
            "bookTitle": currentBookNameAndAuthor.bookName,
            "authorName": currentBookNameAndAuthor.author,
        };
        generateCover(coverSettings, ctx);
        if (currentBookNameAndAuthor.author === "") {
            book.find(".coverContainer").css('box-shadow', 'var(--ui_bookshadow_noAuthor)');
        } else {
            book.find(".coverContainer").css('box-shadow', 'var(--ui_bookshadow)');
        }

        // add mouseover effect
        book.find(".coverContainer").mouseover(function() {
            book.find(".delete-btn-wrapper").css("opacity", "1");
            $(this).css('box-shadow', 'var(--ui_bookshadow_hover)');
        }).mouseout(function(e) {
            if ((e.offsetX <= 0 || e.offsetX >= $(this).width()) || (e.offsetY <= $(this)[0].offsetTop || e.offsetY >= $(this).height())) {
                book.find(".delete-btn-wrapper").css("opacity", "0");
                let tempBookAuthor = getBookNameAndAuthor(bookInfo.name.replace(/(.txt)$/i, ''));
                if (tempBookAuthor.author === "") {
                    $(this).css('box-shadow', 'var(--ui_bookshadow_noAuthor)');
                } else {
                    $(this).css('box-shadow', 'var(--ui_bookshadow)');
                }
            }
        });
        book.find(".infoContainer").mouseover(function() {
            book.find(".delete-btn-wrapper").css("opacity", "1");
        }).mouseout(function() {
            book.find(".delete-btn-wrapper").css("opacity", "0");
        });
        // book.find(".delete-btn-wrapper").mouseover(function() {
        //     book.find(".coverContainer").css('box-shadow', 'var(--ui_bookshadow_hover)');
        // }).mouseout(function() {
        //     let tempBookAuthor = getBookNameAndAuthor(bookInfo.name.replace(/(.txt)$/i, ''));
        //     if (tempBookAuthor.author === "") {
        //         book.find(".coverContainer").css('box-shadow', 'var(--ui_bookshadow_noAuthor)');
        //     } else {
        //         book.find(".coverContainer").css('box-shadow', 'var(--ui_bookshadow)');
        //     }
        // });
        
        // add click event
        book.find(".coverContainer").click((evt) => {
            evt.originalEvent.stopPropagation();
            this.openBook(bookInfo.name);
        });

        // add delete event
        book.find(".delete-btn").click((evt) => {
            evt.originalEvent.stopPropagation();
            // this.deleteBook(bookInfo.name, () => this.refreshBookList());
            this.deleteBook(bookInfo.name, () => {
                let b = $(evt.currentTarget).parents(".book");
                b.fadeOut(300, () => {
                    b.remove();
                    this.refreshBookList();     // need to refresh booklist every time after delete
                });
                // b.animate({width: 0, opacity: 0}, 500, () => b.remove());
            });
        });

        // update book progress info
        this.updateBookProgressInfo(bookInfo.name, book);

        // add a bookInfoMenuBtn
        book.find(`#bookInfoMenuBtn-${idx}`).click((evt) => {
            evt.originalEvent.stopPropagation();

            // remove all bookInfoMenu
            $(".bookInfoMenu").remove();

            // add bookInfoMenu
            if (book.find(".dot-menu__checkbox").is(':checked')) {
                let tempBookAuthor = getBookNameAndAuthor(bookInfo.name.replace(/(.txt)$/i, ''));
                let tempBookTitle = tempBookAuthor.bookName;
                let tempBookAuthorName = tempBookAuthor.author === "" ? `<span class="bookInfoMenu_item_text">${style.ui_bookInfo_Unknown}<span>` : `<span class="bookInfoMenu_item_info">${tempBookAuthor.author}<span>`;
                let tempBookLastOpenedTimestamp = isVariableDefined(bookInfo.lastOpenedTimestamp) && bookInfo.lastOpenedTimestamp !== "" ? `<span class="bookInfoMenu_item_info">${convertUTCTimestampToLocalString(bookInfo.lastOpenedTimestamp)}<span>` : `<span class="bookInfoMenu_item_text">${style.ui_bookInfo_Unknown}<span>`;

                // show popup menu
                let bookInfoMenu = `
                <div class="bookInfoMenu" id="bookInfoMenu-${idx}">
                    <div class="bookInfoMenu-clip"></div>
                    <div class="bookInfoMenu_item">
                        <span class="bookInfoMenu_item_text">${style.ui_bookInfo_bookname}</span>
                        <span class="bookInfoMenu_item_info">${tempBookTitle}</span>
                    </div>
                    <div class="bookInfoMenu_item">
                        <span class="bookInfoMenu_item_text">${style.ui_bookInfo_author}</span>
                        ${tempBookAuthorName}
                    </div>
                    <div class="bookInfoMenu_item">
                        <span class="bookInfoMenu_item_text">${style.ui_bookInfo_filename}</span>
                        <span class="bookInfoMenu_item_info">${bookInfo.name}</span>
                    </div>
                    <div class="bookInfoMenu_item">
                        <span class="bookInfoMenu_item_text">${style.ui_bookInfo_filesize}</span>
                        <span class="bookInfoMenu_item_info">${formatBytes(bookInfo.size)}</span>
                    </div>
                    <div class="bookInfoMenu_item">
                        <span class="bookInfoMenu_item_text">${style.ui_bookInfo_lastopened}</span>
                        ${tempBookLastOpenedTimestamp}
                    </div>
                </div>`;
                
                book.find(".infoContainer").append(bookInfoMenu);

                // set bookInfoMenu's position to be right above current element
                let bookInfoMenuWidth = book.find(`#bookInfoMenu-${idx}`).outerWidth();
                let bookInfoMenuHeight = book.find(`#bookInfoMenu-${idx}`).outerHeight();
                book.find(`#bookInfoMenu-${idx}`).css("top", `${evt.currentTarget.getBoundingClientRect().bottom - evt.currentTarget.getBoundingClientRect().height - bookInfoMenuHeight - 15}px`);
                book.find(`#bookInfoMenu-${idx}`).css("left", `${evt.currentTarget.getBoundingClientRect().left + evt.currentTarget.getBoundingClientRect().width / 2 - bookInfoMenuWidth / 2 + 3}px`);

            } else {
                // hide popup menu
                book.find(".bookInfoMenu").remove();
            }

            // hide popup menu when clicked outside
            document.addEventListener('click', function(event) {  
                const settingsMenu = book.find(`#bookInfoMenu-${idx}`);
                // if (!settingsMenu) return;
                if ($(event.target).closest(settingsMenu).length) {
                    // clicked inside menu
                } else {
                    book.find(".dot-menu__checkbox").prop("checked", false);
                    book.find(".bookInfoMenu").remove();
                }
            });

            // reset all book cover art when mouseover the bookInfoMenu
            book.find(".bookInfoMenu").mouseover(function() {
                // $(".delete-btn-wrapper").css("visibility", "hidden");
                $(".coverContainer").css('box-shadow', 'var(--ui_bookshadow)');
            });
        });

        return book;
    },

    async updateAllBookCovers() {
        Array.from(document.getElementsByClassName("book")).forEach(book => {
            let book_filename = book.getAttribute("data-filename");
            let book_cover = book.getElementsByTagName("canvas")[0];
            let canvasWidth = book_cover.width;
            let canvasHeight = book_cover.height;
            let currentBookNameAndAuthor = getBookNameAndAuthor(book_filename.replace(/(.txt)$/i, ''));
            let ctx = book_cover.getContext("2d");
            let coverSettings = {
                "width": canvasWidth,
                "height": canvasHeight,
                "padding": canvasWidth / 8,
                "bottomRectHeightRatio": 0.3,
                "coverColor1": style.mainColor_inactive,
                "coverColor2": style.mainColor_active,
                "textColor1": style.bgColor,
                "textColor2": style.bgColor,
                // "coverColor1": style.logoColor1,
                // "coverColor2": style.logoColor2,
                // "textColor1": style.logoColor3,
                // "textColor2": style.logoColor3,
                "font1": style.fontFamily_title_zh,
                "font2": style.fontFamily_body_zh,
                // "font1": "HiraKakuProN-W6",
                // "font2": "HiraKakuProN-W3",
                "bookTitle": currentBookNameAndAuthor.bookName,
                "authorName": currentBookNameAndAuthor.author,
            };
            generateCover(coverSettings, ctx);
        });
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
            try {
                for (const book of await this.db.getAllBooks()) {
                    booklist.push({name: book.name, size: book.data.size});
                }

                // get all books' last opened timestamp from localStorage
                for (let book of booklist) {
                    let lastOpenedTimestamp = localStorage.getItem(`${book.name}_lastopened`);
                    if (lastOpenedTimestamp) {
                        book.lastOpenedTimestamp = lastOpenedTimestamp;
                        book.progress = getProgressText(book.name, false);
                    }
                }

                // sort booklist by:
                // 1. if progress is 100%, then put to the end of the list
                // and sort by last opened timestamp;
                // 2. if progress is not 100%, then sort by last opened timestamp
                // 3. if last opened timestamp is not available, then sort by filename
                booklist.sort((a, b) => {
                    if (a.progress === "100%" && b.progress !== "100%") {
                        return 1;
                    } else if (a.progress !== "100%" && b.progress === "100%") {
                        return -1;
                    } else {
                        if (!a.lastOpenedTimestamp && !b.lastOpenedTimestamp) {
                            return a.name.localeCompare(b.name, "zh");
                        } else if (a.lastOpenedTimestamp && !b.lastOpenedTimestamp) {
                            return -1;
                        } else if (!a.lastOpenedTimestamp && b.lastOpenedTimestamp) {
                            return 1;
                        } else {
                            return b.lastOpenedTimestamp - a.lastOpenedTimestamp;
                        }
                    }
                });

                for (const [idx, bookInfo] of booklist.entries()) {
                    container.append(this.genBookItem(bookInfo, idx));
                }
                container.trigger("contentchange");
            } catch (e) {
                console.log(e);
            }

            // If there is no book in bookshelf, hide the bookshelf
            // Otherwise, show the bookshelf, but not the bookshelf trigger button
            // Only show the bookshelf trigger button when a book is opened
            if (booklist.length <= 0) {
                this.hide();
                this.hideTriggerBtn();
            } else {
                this.show();
                // this.showTriggerBtn();
            }
        }
    },

    async show() {
        if (this.enabled) {
            if (isVariableDefined($(".bookshelf")) && $(".bookshelf .booklist").children().length > 0) {
                $(".bookshelf").show();

                $(".booklist").trigger("contentchange");

                return;
            }
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

    hideTriggerBtn(doNotRemove = true) {
        if (!doNotRemove) {
            $("#STRe-bookshelf-btn").remove();
        } else {
            $("#STRe-bookshelf-btn").hide();
        }
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
            .hide()
            .on("dblclick", function(event) {
                // disable double click event inside bookshelf
                event.stopPropagation();
            })
            .appendTo("#dropZone");

            function defineScrollBtns() {
                if (this.scrollTop > 0) {
                    $("#scrollTop-btn")
                    .css("visibility", "visible")
                    .click(() => {
                        // this.scrollTop = 0;
                        $(this).stop(true, false);
                        $(this).animate({scrollTop: 0}, this.scrollHeight / 10);
                    });
                } else {
                    $("#scrollTop-btn").css("visibility", "hidden");
                }
                if (this.scrollHeight-this.offsetHeight - this.scrollTop > 1) {
                    $("#scrollBottom-btn")
                    .css("visibility", "visible")
                    .click(() => {
                        $(this).stop(true, false);
                        $(this).animate({scrollTop: this.scrollHeight-this.offsetHeight}, this.scrollHeight / 10);
                    });
                } else {
                    $("#scrollBottom-btn").css("visibility", "hidden");
                }
            };

            $(".booklist").on("scroll", function() {
                defineScrollBtns.call(this);
                $(".dot-menu__checkbox").prop("checked", false);
                $(".bookInfoMenu").remove();
            });

            $(".booklist").bind("contentchange", function() {
                // set bookshelf height
                let bookWidth = $('.book').outerWidth(true);
                let bookHeight = $('.book').outerHeight(true);
                let windowHeight = $('#dropZone').outerHeight(true);
                let numBookshelfRows = Math.ceil($('.book').length / Math.floor(this.offsetWidth / bookWidth));
                numBookshelfRows = isFinite(numBookshelfRows) ? numBookshelfRows : 0;
                if (numBookshelfRows > 0) {
                    let topPx = "";
                    topPx = `max(calc(${windowHeight - (bookHeight + 24) * numBookshelfRows}px - 2 * var(--ui_booklist_padding)), 25%)`;
                    $('.bookshelf').css('top', topPx);
                    let topPxNum = parseInt($('.bookshelf').css('top'));
                    $('#dropZoneText').css('top', `calc(${topPxNum} / ${windowHeight} * var(--ui_dropZoneTextTop))`);
                    $('#dropZoneText').css('font-size', `max(calc(1.2 * (${topPxNum} / ${windowHeight}) * var(--ui_dropZoneTextSize)), calc(var(--ui_dropZoneTextSize) / 1.5))`);
                    $('#dropZoneImg').css('top', `calc(${topPxNum} / ${windowHeight} * var(--ui_dropZoneImgTop))`);
                    $('#dropZoneImg').css('width', `max(calc(1.2 * (${topPxNum} / ${windowHeight}) * var(--ui_dropZoneImgSize)), calc(var(--ui_dropZoneImgSize) / 1.5)`);
                    $('#dropZoneImg').css('height', `max(calc(1.2 * (${topPxNum} / ${windowHeight}) * var(--ui_dropZoneImgSize)), calc(var(--ui_dropZoneImgSize) / 1.5)`);
                }

                if (this.scrollHeight > this.parentNode.clientHeight) {
                    // console.log('overflown', this.scrollTop, this.scrollHeight-this.offsetHeight);
                    defineScrollBtns.call(this);
                } else {
                    // console.log('not overflown');
                    $("#scrollTop-btn").css("visibility", "hidden");
                    $("#scrollBottom-btn").css("visibility", "hidden");
                }
            });

            $(window).on("resize", function() {
                $(".booklist").trigger("contentchange");
                $(".dot-menu__checkbox").prop("checked", false);
                $(".bookInfoMenu").remove();
            });

            // capable of scrolling booklist within the entire bookshelf
            document.getElementsByClassName('bookshelf')[0].addEventListener('wheel', function(e){
                // prevent scrolling booklist when mouse is hovering on bookInfoMenu
                if ($(".bookInfoMenu").length > 0) {
                    if ($(".bookInfoMenu").is(":hover")) {
                        return;
                    }
                }

                // scroll booklist accordingly
                document.getElementsByClassName('booklist')[0].scrollTop += e.deltaY;
            });

            // console.log("Module <Bookshelf> enabled.");
            setTimeout(() => this.loop(), 1000);
        }
        return this;
    },

    disable() {
        if (this.enabled) {
            fileloadCallback.unregBefore(this.saveBook);
            this.hide(false);
            this.hideTriggerBtn(false);
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
        .click(() => {
            resetUI();
        })
        .prependTo($("#btnWrapper"))
        .hide();
    },
};

// 启用 bookshelf 功能
if (!location.search.includes("no-bookshelf")) { // 地址后面加 "?no-bookshelf" 停用 bookshelf 功能
    bookshelf.init();
    bookshelf.enable();
    bookshelf.refreshBookList();    // Now whether or not to show bookshelf depends on whether there is a book in bookshelf

    // 启动时打开上次阅读书籍
    bookshelf.reopenBook();
}
