// const regex_number = "——\\-——一二两三四五六七八九十○零百千壹贰叁肆伍陆柒捌玖拾佰仟0-9０-９";
const regex_number = "一二两三四五六七八九十○零百千壹贰叁肆伍陆柒捌玖拾佰仟0-9０-９";
const regex_titles_chinese_pre_1 = "[第序终終卷【]\\s*([";
const regex_titles_chinese_post_1 = "\\s/\\、、]*)\\s*[章节節回集卷部篇季】]";
const regex_titles_chinese_1 = regex_titles_chinese_pre_1 + regex_number + regex_titles_chinese_post_1;
const regex_0 = "^(\\s*([【])(正文\\s*)?[" + regex_number.slice(0, -6) + "]*([】])\\s*$)";
const regex_1 = "^(\\s*(正文\\s*)?[" + regex_number.slice(0, -6) + "]*\\s*$)";
const regex_2 = "^(\\s*([【])?(正文\\s*)?" + regex_titles_chinese_1 + "\\s*$)";
const regex_3 = "^(\\s*([【])?(正文\\s*)?" + regex_titles_chinese_1 + "\\s+.{1,50}$)";

const regex_titles_chinese_pre_2 = "[序终終卷]\\s*([";
const regex_titles_chinese_post_2 = "\\s/\\、、]*)\\s*";
const regex_titles_chinese_2 = regex_titles_chinese_pre_2 + regex_number + regex_titles_chinese_post_2;
const regex_4 = "^(\\s*([【])?(正文\\s*)?" + regex_titles_chinese_2 + "\\s*$)";
const regex_5 = "^(\\s*([【])?(正文\\s*)?" + regex_titles_chinese_2 + "\\s+.{1,50}$)";

const regex_other_titles = "内容简介|內容簡介|内容介绍|內容介紹|内容梗概|内容大意|小说简介|小說簡介|小说介绍|小說介紹|小说大意|小說大意|书籍简介|書籍簡介|书籍介绍|書籍介紹|书籍大意|書籍大意|作品简介|作品簡介|作品介绍|作品介紹|作品大意|作品相关|作者简介|作者簡介|作者介绍|作者介紹|作品相關|简介|簡介|介绍|介紹|大意|梗概|序|代序|自序|序言|序章|序幕|前言|楔子|引言|引子|终章|終章|大结局|结局|结尾|尾声|尾聲|后记|後記|完本|完本感言|完结|完结感言|出版后记|出版後記|谢辞|謝辭|番外|番外篇|编辑推荐|編輯推薦|书籍相关|書籍相關|作者声明|作者聲明|译者序|譯者序|外篇|附錄|附录|短篇|创作背景|創作背景|作品原文|白话译文|白話譯文";
const regex_6 = "^(\\s*([【])?(" + regex_other_titles + ")([】])?[:：]?\\s*$)";
const regex_7 = "^(\\s*([【])?(" + regex_other_titles + ")\\s+.{0,50}?([】])?\\s*$)";

const regex_titles_english = "chapter|part|appendix|appendices|preface|Foreword|Introduction|Prologue|Epigraph|Table of contents|Epilogue|Afterword|Conclusion|Glossary|Acknowledgments|Bibliography|Index|Errata|Colophon|Copyright";
const regex_8 = "^(\\s*(" + regex_titles_english + ")\\s*$)";
const regex_9 = "^(\\s*(" + regex_titles_english + ")\\s+.{0,50}?$)";

const regex = new RegExp(regex_0 + "|" + regex_1 + "|" + regex_2 + "|" + regex_3 + "|" + regex_4 + "|" + regex_5 + "|" + regex_6 + "|" + regex_7 + "|" + regex_8 + "|" + regex_9, "i");

const regex_isEastern = new RegExp(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f\u3131-\uD79D]+/);

const regex_isPunctuation = /\p{P}/u;

// ① - ㊿: FootNote content
const regex_isFootNote = new RegExp(/[\u24EA\u2460-\u2473\u3251-\u325F\u32B1-\u32BF]/gu);

// function to process strings as a batch
function process_batch(str) {
    let to_drop_cap = false;
    let arr = str.split('\n');
    let newArr = [];
    for (let i = 0; i < arr.length; i++) {
        current = arr[i].trim();
        if (current !== '') {
            if (regex.test(current)) {
                newArr.push(`<h2>${current.replace(":", "").replace("：", "")}</h2>`);
                to_drop_cap = true;
            } else {
                if (to_drop_cap && !isEasternLan) {
                    isPunctuation = regex_isPunctuation.test(current[0]);
                    if (isPunctuation) {
                        index = 0
                        while (regex_isPunctuation.test(current[index])) {
                            index++;
                        }
                        newArr.push(`<p class="first"><span class="dropCap">${current.slice(0, index+1)}</span>${current.slice(index+1)}</p>`);
                    } else {
                        newArr.push(`<p class="first"><span class="dropCap">${current[0]}</span>${current.slice(1)}</p>`);
                    }
                    to_drop_cap = false;
                } else {
                    newArr.push(`<p>${current}</p>`);
                    to_drop_cap = false;
                }
            }
        }
    }
    return newArr.join('');
}

function process(str, lineNumber, to_drop_cap) {
    if (lineNumber < titlePageLineNumberOffset) {
        current = str.trim();
        if (current.slice(1, 3) === "h1") {
            let wrapper= document.createElement('div');
            wrapper.innerHTML= current;
            let tempElement = wrapper.firstChild;
            tempElement.innerHTML = `<a href='#line${lineNumber}' onclick='gotoLine(${lineNumber})' class='prevent-select title'>${tempElement.innerHTML}</a>`;
            current = tempElement.outerHTML;
            return [current, 't'];
        } else {
            // do nothing
            return [current, 't'];
        }
    } else {
        let current = optimization(str.trim());
        if (current !== '') {
            if (regex.test(current)) {
                current = `<h2 id="line${lineNumber}"><a href='#line${lineNumber}' onclick='gotoLine(${lineNumber})' class='prevent-select title'>${current.replace(":", "").replace("：", "")}</a></h2>`;
                return [current, 'h'];
            } else {
                if (to_drop_cap && !isEasternLan) {
                    isPunctuation = regex_isPunctuation.test(current[0]);
                    if (isPunctuation) {
                        index = 0
                        while (regex_isPunctuation.test(current[index])) {
                            index++;
                        }
                        current = `<p id="line${lineNumber}" class="first"><span class="dropCap">${current.slice(0, index+1)}</span>${current.slice(index+1)}</p>`;
                    } else {
                        current = `<p id="line${lineNumber}" class="first"><span class="dropCap">${current[0]}</span>${current.slice(1)}</p>`;
                    }
                } else {
                    current = `<p id="line${lineNumber}">${current}</p>`;
                }
                return [current, 'p'];
            }
        } else {
            return [current, 'e'];
        }
    }
}

function getLanguage(str) {
    let current = str.trim();
    return regex_isEastern.test(current);
}

function getTitle(str) {
    let current = str.trim();
    if (regex.test(current)) {
        return current.replace(":", "").replace("：", "");
    } else {
        return '';
    }
}

function getBookNameAndAuthor(str) {
    let current = str.trim();
    current = current.replace("（校对版全本）", "");
    if (regex_isEastern.test(current)) {
        let pos = current.toLowerCase().indexOf("作者");
        if (pos !== -1) {
            return {
                "bookName": current.slice(0, pos).replace("书名", "").replace("：", "").replace(":", "").replace("《", "").replace("》", "").replace("「", "").replace("」", "").replace("『", "").replace("』", "").replace("﹁", "").replace("﹂", "").replace("﹃", "").replace("﹄", "").trim(),
                "author": current.slice(pos + 2).replace("：", "").replace("：", "").replace(":", "").replace("《", "").replace("》", "").replace("「", "").replace("」", "").replace("『", "").replace("』", "").replace("﹁", "").replace("﹂", "").replace("﹃", "").replace("﹄", "").trim()
            };
        } else {
            // No complete book name and author info
            // Treat file name as book name and application name as author
            return {
                "bookName": current,
                // "author": style.ui_title_CN
                "author": ""
            };
        }
    } else {
        let pos = current.toLowerCase().indexOf(" by ");
        if (pos !== -1) {
            return {
                "bookName": current.slice(0, pos).trim(),
                "author": current.slice(pos + 4).trim()
            };
        } else {
            // No complete book name and author info
            // Treat file name as book name and application name as author
            return {
                "bookName": current,
                // "author": style.ui_title_EN
                "author": ""
            };
        }
    }
}

function optimization(str) {
    let current = str.trim();
    const reg_symbols = new RegExp("[※★☆◎━┏┓┗┛]+", "g");
    current = current.replace(reg_symbols, "").trim();

    // Remove 知轩藏书 specific elements
    const reg_zscs_dash = "^(\\s*[=]+\\s*$)";
    const reg_zscs_download = "^(\\s*(更多精校小说尽在知轩藏书下载)\\s*[：:]?\\s*((http([:：])//)?www.zxcs.(me|info)([/]?))$)";
    const reg_zscs_bookname = "^(\\s*((书名)?\\s*[：:]?\\s*[《「『﹁﹃]?" + bookAndAuthor.bookName + "[》」』﹂﹄]?)\\s*$)";
    const reg_zscs_author = "^(\\s*((作者)?\\s*[：:]?\\s*" + bookAndAuthor.author + ")\\s*$)";
    const reg_zscs_bookname_author1 = "^(\\s*((书名)?\\s*[：:]?\\s*[《「『﹁﹃]?" + bookAndAuthor.bookName + "[》」』﹂﹄]?)\\s*((作者)?\\s*[：:]?\\s*" + bookAndAuthor.author + ")\\s*$)";
    const reg_zscs_bookname_author2 = "^(\\s*((书名)?\\s*[：:]?\\s*[《「『﹁﹃]?" + bookAndAuthor.bookName + "[》」』﹂﹄]?)\\s*([\\(（)]?)(文字精校版)([)）]?)\\s*((作者)?\\s*[：:]?\\s*" + bookAndAuthor.author + ")\\s*$)";
    const reg_zscs_author_bookname = "^(\\s*((作者)?\\s*[：:]?\\s*" + bookAndAuthor.author + ")\\s*((书名)?\\s*[：:]?\\s*[《「『﹁﹃]?" + bookAndAuthor.bookName + "[》」』﹂﹄]?)\\s*$)";
    const reg_zscs = new RegExp(reg_zscs_dash + "|" + reg_zscs_download + "|" + reg_zscs_bookname + "|" + reg_zscs_author + "|" + reg_zscs_bookname_author1 + "|" + reg_zscs_bookname_author2 + "|" + reg_zscs_author_bookname, "i");
    current = current.replace(reg_zscs, "").trim();

    // Remove 塞班 specific elements
    current = current.replace("版权归原作者所有，请勿用于商业用途", "").replace("版权归原作者所有，本人购买文本并精心制作，转载请注明出处。", "").replace("请勿用于商业用途，如有违反，发生问题，后果自负，与本人无关", "").replace("塞班智能手机论坛真诚欢迎新老会员", "").replace("请勿用于商业行为，一切后果自负", "").replace("仅供试阅，转载请注明，同时请支持正版，版权属于原作者，", "").replace("请勿用于商业传播，谢谢~", "").replace("请勿用于商业用途，请勿上传至百度文库。如用后果自负。", "").replace("版权归原作者所有，请勿用于一切商业用途", "").replace("版权归原作者所有，文本仅供试读，请勿用于一切商业用途！", "");
    const reg_sb_bookname_author = "^(\\s*(\\[)?" + bookAndAuthor.bookName + "\\s*(\\/)?\\s*" + bookAndAuthor.author + "\\s*(著)?\\s*(\\])?\\s*$)";
    const reg_sb_dash = "^(\\s*[-※★☆◎…━┏┓┗┛]+\\s*$)";
    const reg_sb_made1 = "^(\\s*(本电子书由)\\s*(.{0,50}?)\\s*(整理制作([.。!！]?))$)";
    const reg_sb_made2 = "^(\\s*(本书由)\\s*(.{0,50}?)\\s*(整理制作([.。!！]?))$)";
    const reg_sb_made3 = "^(\\s*(文本由)\\s*(.{0,50}?)\\s*(整理制作([.。!！]?))$)";
    const reg_sb_made4 = "^(\\s*(本电子书由)\\s*(.{0,50}?)\\s*(精校排版整理制作。转载请注明([.。!！]?))$)";
    const reg_sb_forum = "^(\\s*(塞班智能手机论坛)\\s*([:：]?)\\s*((http([:：])//)?bbs.dospy.com([.。!！]?))$)";
    const reg_sb_forum_made1 = "^(\\s*(塞班智能手机论坛)\\s*([:：]?)\\s*((http([:：])//)?bbs.dospy.com)\\s*(.{0,50}?)\\s*(整理制作([.。!！]?))$)";
    const reg_sb_forum_made2 = "^(\\s*(本文由塞班电子书组)\\s*(.{0,50}?)\\s*(整理，版权归原作者所有([.。!！]?))$)";
    const reg_sb_forum_made3 = "^(\\s*(本文由塞班电子书组)\\s*(.{0,50}?)\\s*(整理制作，版权归原作者所有([.。!！]?))$)";
    const reg_sb_forum_made4 = "^(\\s*(该文本由塞班电子书讨论区“)\\s*(.{0,50}?)\\s*(”连载精校整理([.。!！]?))$)";
    const reg_sb_forum_made5 = "^(\\s*(.{0,50}?)\\s*(搜集整理，版权归原作者。请勿用于商业用途，如用后果自负([.。!！]?))$)";
    const reg_sb_forum_made6 = "^(本书由塞班论坛(http([:：])//)?bbs.dospy.com(/)?$)";
    const reg_sb_forum_made7 = "^(\\s*(电子书组)\\s*(.{0,50}?)\\s*(搜集、整理、制作，版权归原作者所有([.。!！]?))$)";
    const reg_sb_forum_made8 = "^(\\s*(本电子书由塞班智能手机论坛)\\s*(.{0,50}?)\\s*(整理制作，仅供试阅([.。!！]?))$)";
    const reg_sb_url = "^(\\s*(http://bbs.dospy.com)\\s*)$";
    const reg_sb = new RegExp(reg_sb_bookname_author + "|" + reg_sb_dash + "|" + reg_sb_made1 + "|" + reg_sb_made2 + "|" + reg_sb_made3 + "|" + reg_sb_made4 + "|" + reg_sb_forum + "|" + reg_sb_forum_made1 + "|" + reg_sb_forum_made2 + "|" + reg_sb_forum_made3 + "|" + reg_sb_forum_made4 + "|" + reg_sb_forum_made5 + "|" + reg_sb_forum_made6 + "|" + reg_sb_forum_made7 + "|" + reg_sb_forum_made8 + "|" + reg_sb_url, "i");
    current = current.replace(reg_sb, "").trim();

    // Remove 99 specific elements
    current = current.replace("久久电子书提醒您", "").replace("爱护眼睛休息会吧", "").replace("多格式免费下载", "");
    const reg_99_dash = "^(\\s*[\\+]+\\s*$)";
    const reg_99_ad1 = "^(\\s*(\\+)?\\s*(久久电子书提醒您)?\\s*([:：\\s]*)\\s*(爱护眼睛合理休息)?\\s*(\\+)?$)";
    const reg_99_ad2 = "^(\\s*(\\+)?\\s*(多格式免费电子书)?\\s*([:：\\s]*)\\s*(WwW.99121.CoM)?\\s*(\\+)?$)";
    const reg_99_ad3 = "^(\\s*(TXT.CHM.UMD.JAR)\\s*$)";
    const reg_99_ad4 = "^(\\s*(WWW.99121.COM)\\s*$)";
    const reg_99 = new RegExp(reg_99_dash + "|" + reg_99_ad1 + "|" + reg_99_ad2 + "|" + reg_99_ad3 + "|" + reg_99_ad4, "i");
    current = current.replace(reg_99, "").trim();

    return current.trim();
}

function makeFootNote(str) {
    let current = str.trim();

    // Find if footnote characters exist
    if (regex_isFootNote.test(current)) {        
        let allMatches = current.match(regex_isFootNote);

        if (allMatches.length == 1 && current.indexOf(allMatches[0]) == 0) {
            // this is the actual footnote itself
            footNoteContainer.innerHTML += "<li id='fn" + footnote_proccessed_counter + "'>" + current.slice(1) + "</li>";
            footnote_proccessed_counter++;
            return "";
        } else {
            // main text
            for (i in allMatches) {
                // console.log("footnote.length: " + footnotes.length);
                // console.log("Found footnote: " + allMatches[i]);
                let curIndex = current.indexOf(allMatches[i]);
                current = current.slice(0, curIndex) + '<a rel="footnote" href="#fn' + footnotes.length + '"><img class="footnote_img" src="images/note_' + style.ui_LANG + '.png"/></a>' + current.slice(curIndex + 1);
                footnotes.push(allMatches[i]);
            }
        }
    }

    return current;
}