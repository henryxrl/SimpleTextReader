// Title extraction
const regex_titles = new RegExp(rules_titles.join("|"), "i");

// Language detection
const regex_isEastern = new RegExp(rules_language);

// Punctuation detection
const regex_isPunctuation = new RegExp(rules_punctuation);

// ① - ㊿: FootNote detection
const regex_isFootNote = new RegExp(rules_footnote);

// Process text content as a batch
// OBSOLETE
function process_batch(str) {
    let to_drop_cap = false;
    let arr = str.split("\n");
    let newArr = [];
    for (let i = 0; i < arr.length; i++) {
        current = arr[i].trim();
        if (current !== "") {
            if (regex_titles.test(current)) {
                newArr.push(
                    `<h2>${current.replace(":", "").replace("：", "")}</h2>`
                );
                to_drop_cap = true;
            } else {
                if (to_drop_cap && !isEasternLan) {
                    isPunctuation = regex_isPunctuation.test(current[0]);
                    if (isPunctuation) {
                        index = 0;
                        while (regex_isPunctuation.test(current[index])) {
                            index++;
                        }
                        newArr.push(
                            `<p class="first"><span class="dropCap">${current.slice(
                                0,
                                index + 1
                            )}</span>${current.slice(index + 1)}</p>`
                        );
                    } else {
                        newArr.push(
                            `<p class="first"><span class="dropCap">${
                                current[0]
                            }</span>${current.slice(1)}</p>`
                        );
                    }
                    to_drop_cap = false;
                } else {
                    newArr.push(`<p>${current}</p>`);
                    to_drop_cap = false;
                }
            }
        }
    }
    return newArr.join("");
}

// Process text content line by line
function process(str, lineNumber, totalLines, to_drop_cap) {
    if (
        lineNumber < titlePageLineNumberOffset ||
        lineNumber === totalLines - 1
    ) {
        current = str.trim();
        if (current.slice(1, 3) === "h1" || current.slice(1, 5) === "span") {
            let wrapper = document.createElement("div");
            wrapper.innerHTML = current;
            let tempElement = wrapper.firstElementChild;
            let tempAnchor = document.createElement("a");
            tempAnchor.href = `#line${lineNumber}`;
            tempAnchor.classList.add("prevent-select");
            tempAnchor.classList.add("title");
            tempAnchor.innerHTML = tempElement.innerHTML;
            tempAnchor.addEventListener("click", function (event) {
                // console.log("h1 Clicked");
                event.preventDefault();
                gotoLine(parseInt(this.parentElement.id.slice(4)));
                let line = document.getElementById(
                    `line${parseInt(this.parentElement.id.slice(4))}`
                );
                let top = line.offsetTop;
                let style = line.currentStyle || window.getComputedStyle(line);
                let top_margin = parseFloat(style.marginTop);
                window.scrollTo(0, top - top_margin, { behavior: "instant" });
            });
            tempElement.innerHTML = "";
            tempElement.appendChild(tempAnchor);

            current = tempElement.outerHTML;
            return [tempElement, "t"];
        } else {
            // do nothing
            let tempSpan = document.createElement("span");
            tempSpan.innerHTML = current;
            return [tempSpan.firstElementChild, "t"];
        }
    } else {
        let current = optimization(str.trim());
        if (current !== "") {
            if (regex_titles.test(current)) {
                let tempAnchor = document.createElement("a");
                tempAnchor.href = `#line${lineNumber}`;
                tempAnchor.classList.add("prevent-select");
                tempAnchor.classList.add("title");
                tempAnchor.innerHTML = current
                    .replace(":", "")
                    .replace("：", "");
                tempAnchor.addEventListener("click", function (event) {
                    // console.log("h2 Clicked");
                    event.preventDefault();
                    gotoLine(parseInt(this.parentElement.id.slice(4)));
                    let line = document.getElementById(
                        `line${parseInt(this.parentElement.id.slice(4))}`
                    );
                    let top = line.offsetTop;
                    let style =
                        line.currentStyle || window.getComputedStyle(line);
                    let top_margin = parseFloat(style.marginTop);
                    window.scrollTo(0, top - top_margin, {
                        behavior: "instant",
                    });
                });
                let tempH2 = document.createElement("h2");
                tempH2.id = `line${lineNumber}`;
                tempH2.appendChild(tempAnchor);

                return [tempH2, "h"];
            } else {
                if (to_drop_cap && !isEasternLan) {
                    isPunctuation = regex_isPunctuation.test(current[0]);
                    if (isPunctuation) {
                        index = 0;
                        while (regex_isPunctuation.test(current[index])) {
                            index++;
                        }
                        let tempP = document.createElement("p");
                        tempP.id = `line${lineNumber}`;
                        tempP.classList.add("first");
                        let tempSpan = document.createElement("span");
                        tempSpan.classList.add("dropCap");
                        tempSpan.innerText = current.slice(0, index + 1);
                        tempP.appendChild(tempSpan);
                        tempP.innerHTML += current.slice(index + 1);

                        return [tempP, "p"];
                    } else {
                        let tempP = document.createElement("p");
                        tempP.id = `line${lineNumber}`;
                        tempP.classList.add("first");
                        let tempSpan = document.createElement("span");
                        tempSpan.classList.add("dropCap");
                        tempSpan.innerText = current[0];
                        tempP.appendChild(tempSpan);
                        tempP.innerHTML += current.slice(1);

                        return [tempP, "p"];
                    }
                } else {
                    let tempP = document.createElement("p");
                    tempP.id = `line${lineNumber}`;
                    tempP.innerHTML = current;

                    return [tempP, "p"];
                }
                // return [current, 'p'];
            }
        } else {
            // return [current, 'e'];
            let tempSpan = document.createElement("span");
            tempSpan.id = `line${lineNumber}`;
            tempSpan.innerText = current;
            return [tempSpan, "e"];
        }
    }
}

function getLanguage(str) {
    let current = str.trim();
    return regex_isEastern.test(current);
}

function getTitle(str) {
    let current = str.trim();
    if (regex_titles.test(current)) {
        titleGroups = getTitleGroups(current);
        return [current.replace(":", "").replace("：", ""), titleGroups.filter(item => item !== undefined)];
    } else {
        return ["", []];
    }
}

function getTitleGroups(str) {
    let current = str.trim();
    let titleGroups = [];
    let allMatches = current.match(regex_titles);
    for (i in allMatches) {
        titleGroups.push(allMatches[i]);
    }
    return titleGroups;
}

function safeREStr(str) {
    return str.replaceAll(/(.)/g, "\\$1");
}

function getBookNameAndAuthor(str) {
    let current = str.trim();
    const reg_filename_ad = new RegExp(
        `${regex_bracket_bookname_left_nospace}((文字精校版)|(校对版全本)|(精校版全本))${regex_bracket_bookname_right_nospace}`
    );
    current = current.replace(reg_filename_ad, "");

    let bookInfo = {
        bookName: current,
        author: "",
        bookNameRE: current,
        authorRE: "",
    };

    const reg_bookname_ad1 = new RegExp(`^(\\s*(书名(${regex_colon})+)?)`);
    // const reg_bookname_ad2 = new RegExp(`${regex_bracket_left_nospace}${regex_bracket_right_nospace}`, 'g');
    // const reg_bookname_ad3 = new RegExp(`${regex_colon_nospace}`, 'g');
    const reg_bookname_ad2 = new RegExp(
        `^${regex_bracket_bookname_left_nospace}`,
        ""
    );
    const reg_bookname_ad3 = new RegExp(
        `${regex_bracket_bookname_right_nospace}$`,
        ""
    );
    const reg_bookname_ad4 = new RegExp(`^${regex_colon_nospace}`);

    // 增加书籍文件命名规则：书名.[作者].txt
    let m = current.match(/^(?<name>.+)\.\[(?<author>.+)\]$/i);
    if (m) {
        bookInfo.bookName = m.groups["name"];
        bookInfo.author = m.groups["author"];
    } else if (regex_isEastern.test(current)) {
        let pos = current.toLowerCase().lastIndexOf("作者");
        if (pos !== -1) {
            // console.log(current.slice(0, pos).replace(reg_bookname_ad1, "").replace(reg_bookname_ad2, "").replace(reg_bookname_ad3, "").trim());
            // console.log(current.slice(pos + 2).replace(reg_bookname_ad4, "").replace(reg_bookname_ad3, "").replace(reg_bookname_ad2, "").trim());
            const bookName = current
                .slice(0, pos)
                .replace(reg_bookname_ad1, "")
                .replace(reg_bookname_ad2, "")
                .replace(reg_bookname_ad3, "")
                .trim();
            const author = current
                .slice(pos + 2)
                .replace(reg_bookname_ad4, "")
                .trim();

            // Remove imbalanced brackets and their content
            bookInfo.bookName =
                ignoreContentFromUnbalancedBracketIndex(bookName);
            bookInfo.author = ignoreContentFromUnbalancedBracketIndex(author);
        } else {
            let pos2 = current.toLowerCase().lastIndexOf(" by ");
            if (pos2 !== -1) {
                // console.log(current.slice(0, pos2).replace(reg_bookname_ad1, "").replace(reg_bookname_ad2, "").replace(reg_bookname_ad3, "").trim());
                // console.log(current.slice(pos2 + 4).replace(reg_bookname_ad4, "").replace(reg_bookname_ad3, "").replace(reg_bookname_ad2, "").trim());
                const bookName = current
                    .slice(0, pos2)
                    .replace(reg_bookname_ad1, "")
                    .replace(reg_bookname_ad2, "")
                    .replace(reg_bookname_ad3, "")
                    .trim();
                const author = current
                    .slice(pos2 + 4)
                    .replace(reg_bookname_ad4, "")
                    .trim();

                // Remove imbalanced brackets and their content
                bookInfo.bookName =
                    ignoreContentFromUnbalancedBracketIndex(bookName);
                bookInfo.author =
                    ignoreContentFromUnbalancedBracketIndex(author);
            }
            // No complete book name and author info
            // Treat file name as book name and application name as author
            bookInfo.bookName = current;
            bookInfo.author = "";
        }
    } else {
        let pos = current.toLowerCase().lastIndexOf(" by ");
        if (pos !== -1) {
            // console.log(current.slice(0, pos).replace(reg_bookname_ad1, "").replace(reg_bookname_ad2, "").replace(reg_bookname_ad3, "").trim());
            // console.log(ccurrent.slice(pos + 4).replace(reg_bookname_ad4, "").replace(reg_bookname_ad3, "").replace(reg_bookname_ad2, "").trim());
            const bookName = current
                .slice(0, pos)
                .replace(reg_bookname_ad1, "")
                .replace(reg_bookname_ad2, "")
                .replace(reg_bookname_ad3, "")
                .trim();
            const author = current
                .slice(pos + 4)
                .replace(reg_bookname_ad4, "")
                .trim();

            // Remove imbalanced brackets and their content
            bookInfo.bookName =
                ignoreContentFromUnbalancedBracketIndex(bookName);
            bookInfo.author = ignoreContentFromUnbalancedBracketIndex(author);
        } else {
            // No complete book name and author info
            // Treat file name as book name and application name as author
            bookInfo.bookName = current;
            bookInfo.author = "";
        }
    }
    bookInfo.bookNameRE = safeREStr(bookInfo.bookName);
    bookInfo.authorRE = safeREStr(bookInfo.author);
    return bookInfo;
}

function makeFootNote(str) {
    let current = str.trim();

    // Find if footnote characters exist
    if (regex_isFootNote.test(current)) {
        let allMatches = current.match(regex_isFootNote);

        if (allMatches.length == 1 && current.indexOf(allMatches[0]) == 0) {
            // this is the actual footnote itself
            let tempLi = document.createElement("li");
            tempLi.id = `fn${footnote_proccessed_counter}`;
            tempLi.innerText = current.slice(1);
            footNoteContainer.appendChild(tempLi);
            footnote_proccessed_counter++;
            return "";
        } else {
            // main text
            for (i in allMatches) {
                // console.log("footnote.length: ", footnotes.length);
                // console.log("Found footnote: ", allMatches[i]);
                let curIndex = current.indexOf(allMatches[i]);
                current = `${current.slice(
                    0,
                    curIndex
                )}<a rel="footnote" href="#fn${
                    footnotes.length
                }"><img class="footnote_img"/></a>${current.slice(
                    curIndex + 1
                )}`;
                footnotes.push(allMatches[i]);
            }
        }
    }

    return current;
}

function optimization(str) {
    let current = str.trim();

    // Remove symbols
    const reg_symbols = new RegExp(rules_symbols, "g");
    current = current.replace(reg_symbols, "").trim();

    // Remove 知轩藏书 specific elements
    const reg_zscs = new RegExp(rules_zxcs().join("|"), "i");
    current = current.replace(reg_zscs, "").trim();

    // Remove 塞班 specific elements
    const reg_sb = new RegExp(rules_sb().join("|"), "i");
    current = current.replace(reg_sb, "").trim();

    // Remove 99 specific elements
    const reg_99 = new RegExp(rules_99().join("|"), "i");
    current = current.replace(reg_99, "").trim();

    // Remove 阡陌居 specific elements
    const reg_qmj = new RegExp(rules_qmj().join("|"), "i");
    current = current.replace(reg_qmj, "").trim();

    // Remove 天天书屋 specific elements
    const reg_ttsw = new RegExp(rules_ttsw().join("|"), "i");
    current = current.replace(reg_ttsw, "").trim();

    return current.trim();
}
