// const regex_number = "——\\-——一二两三四五六七八九十○零百千壹贰叁肆伍陆柒捌玖拾佰仟0-9０-９";
const regex_number = "一二两三四五六七八九十○零百千壹贰叁肆伍陆柒捌玖拾佰仟0-9０-９";
const regex_titles_chinese_pre_1 = "[第序终終卷【]\\s*([";
const regex_titles_chinese_post_1 = "\\s/\\、、]*)\\s*[章节節回集卷部篇】]";
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

const regex_titles_english = "chapter|appendix|appendices|preface|Foreword|Introduction|Prologue|Epigraph|Table of contents|Epilogue|Afterword|Conclusion|Glossary|Acknowledgments|Bibliography|Index|Errata|Colophon|Copyright";
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
                "author": style.ui_title_CN
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
                "author": style.ui_title_EN
            };
        }
    }
}

function optimization(str) {
    let current = str.trim();

    // Remove 知轩藏书 specific elements
    current = current.replace("更多精校小说尽在知轩藏书下载：http://www.zxcs.me/", "").replace("更多精校小说尽在知轩藏书下载：http://www.zxcs.info/", "");;
    let reg_zscs_dash = new RegExp("^(\\s*[=]+\\s*$)", 'i');
    let reg_zscs_bookname = new RegExp("^(\\s*((书名)?\\s*[：:]?\\s*[《「『﹁﹃]?" + bookAndAuthor.bookName + "[》」』﹂﹄]?)\\s*$)", 'i');
    let reg_zscs_author = new RegExp("^(\\s*((作者)?\\s*[：:]?\\s*" + bookAndAuthor.author + ")\\s*$)", 'i');
    let reg_zscs_bookname_author = new RegExp("^(\\s*((书名)?\\s*[：:]?\\s*[《「『﹁﹃]?" + bookAndAuthor.bookName + "[》」』﹂﹄]?)\\s*((作者)?\\s*[：:]?\\s*" + bookAndAuthor.author + ")\\s*$)", 'i');
    let reg_zscs_author_bookname = new RegExp("^(\\s*((作者)?\\s*[：:]?\\s*" + bookAndAuthor.author + ")\\s*((书名)?\\s*[：:]?\\s*[《「『﹁﹃]?" + bookAndAuthor.bookName + "[》」』﹂﹄]?)\\s*$)", 'i');
    current = current.replace(reg_zscs_dash, "").replace(reg_zscs_bookname, "").replace(reg_zscs_author, "").replace(reg_zscs_bookname_author, "").replace(reg_zscs_author_bookname, "");

    // Remove 塞班 specific elements
    current = current.replace("☆★版权归原作者所有，请勿用于商业用途★☆", "").replace("★☆版权归原作者所有，本人购买文本并精心制作，转载请注明出处。☆★", "").replace("☆★请勿用于商业用途，如有违反，发生问题，后果自负，与本人无关★☆", "").replace("☆塞班智能手机论坛真诚欢迎新老会员☆", "").replace("☆请勿用于商业行为，一切后果自负☆", "").replace("本电子书由塞班智能手机论坛·船说整理制作，仅供试阅。", "").replace("仅供试阅，转载请注明，同时请支持正版，版权属于原作者，", "").replace("请勿用于商业传播，谢谢~☆", "");
    let reg_sb_bookname_author = new RegExp("^(\\s*(\\[)?" + bookAndAuthor.bookName + "\\s*(\\/)?\\s*" + bookAndAuthor.author + "\\s*(著)?\\s*(\\])?\\s*$)", 'i');
    let reg_sb_dash = new RegExp("^(\\s*[-※★☆]+\\s*$)", 'i');
    let reg_sb_made1 = new RegExp("^(\\s*(★☆本电子书由)\\s*(.{0,50}?)\\s*(整理制作☆★)$)", 'i');
    let reg_sb_made2 = new RegExp("^(\\s*(本书由)\\s*(.{0,50}?)\\s*(整理制作)$)", 'i');
    let reg_sb_forum = new RegExp("^(\\s*(☆★塞班智能手机论坛)\\s*([:：]?)\\s*(http://bbs.dospy.com★☆)$)", 'i');
    let reg_sb_forum_made1 = new RegExp("^(\\s*(☆★塞班智能手机论坛)\\s*([:：]?)\\s*(http://bbs.dospy.com)\\s*(.{0,50}?)\\s*(整理制作★☆)$)", 'i');
    let reg_sb_forum_made2 = new RegExp("^(\\s*(☆本文由塞班电子书组)\\s*(.{0,50}?)\\s*(整理，版权归原作者所有☆)$)", 'i');
    let reg_sb_forum_made3 = new RegExp("^(\\s*(☆该文本由塞班电子书讨论区“)\\s*(.{0,50}?)\\s*(”连载精校整理。)$)", 'i');
    let reg_sb_url = new RegExp("^(\\s*(☆http://bbs.dospy.com☆)\\s*)$", 'i');
    current = current.replace(reg_sb_bookname_author, "").replace(reg_sb_dash, "").replace(reg_sb_made1, "").replace(reg_sb_made2, "").replace(reg_sb_forum, "").replace(reg_sb_forum_made1, "").replace(reg_sb_forum_made2, "").replace(reg_sb_forum_made3, "").replace(reg_sb_url, "");

    // Remove 99 specific elements
    current = current.replace("久久电子书提醒您", "").replace("爱护眼睛休息会吧", "").replace("多格式免费下载", "");
    let reg_99_dash = new RegExp("^(\\s*[\\+]+\\s*$)", 'i');
    let reg_99_ad1 = new RegExp("^(\\s*(\\+)?\\s*(久久电子书提醒您)?\\s*([:：\\s]*)\\s*(爱护眼睛合理休息)?\\s*(\\+)?$)", 'i');
    let reg_99_ad2 = new RegExp("^(\\s*(\\+)?\\s*(多格式免费电子书)?\\s*([:：\\s]*)\\s*(WwW.99121.CoM)?\\s*(\\+)?$)", 'i');
    let reg_99_ad3 = new RegExp("^(\\s*(TXT.CHM.UMD.JAR)\\s*$)", 'i');
    let reg_99_ad4 = new RegExp("^(\\s*(WWW.99121.COM)\\s*$)", 'i');
    current = current.replace(reg_99_dash, "").replace(reg_99_ad1, "").replace(reg_99_ad2, "").replace(reg_99_ad3, "").replace(reg_99_ad4, "");

    return current;
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
                current = current.slice(0, curIndex) + '<a rel="footnote" href="#fn' + footnotes.length + '"><img class="footnote_img" src="images/note.png"/></a>' + current.slice(curIndex + 1);
                footnotes.push(allMatches[i]);
            }
        }
    }

    return current;
}