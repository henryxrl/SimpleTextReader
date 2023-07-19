// Title extraction
// const regex_number = "——\\-——一二两三四五六七八九十○零百千壹贰叁肆伍陆柒捌玖拾佰仟0-9０-９";
const regex_number = "一二两三四五六七八九十○零百千壹贰叁肆伍陆柒捌玖拾佰仟0-9０-９";
const regex_titles_chinese_pre_1 = "[第序终終卷【]\\s*([";
const regex_titles_chinese_post_1 = "\\s/\\、、]*)\\s*[章节節回集卷部篇季】]";
const regex_titles_chinese_1 = regex_titles_chinese_pre_1 + regex_number + regex_titles_chinese_post_1;
const regex_1 = `^(\\s*(正文\\s*)?[${regex_number.slice(0, -6)}]*\\s*$)|(\\s*([【])(正文\\s*)?[${regex_number.slice(0, -6)}]*([】])\\s*$)`;
const regex_2 = `^(\\s*(正文\\s*)?${regex_titles_chinese_1}\\s*$)|^(\\s*([【])(正文\\s*)?${regex_titles_chinese_1}([】])\\s*$)`;
const regex_3 = `^(\\s*(正文\\s*)?${regex_titles_chinese_1}\\s+.{1,50}$)|^(\\s*([【])(正文\\s*)?${regex_titles_chinese_1}\\s+.{1,50}([】])$)`;

const regex_titles_chinese_pre_2 = "[序终終卷]\\s*([";
const regex_titles_chinese_post_2 = "\\s/\\、、]*)\\s*";
const regex_titles_chinese_2 = regex_titles_chinese_pre_2 + regex_number + regex_titles_chinese_post_2;
const regex_4 = `^(\\s*([【])?(正文\\s*)?${regex_titles_chinese_2}\\s*$)`;
const regex_5 = `^(\\s*([【])?(正文\\s*)?${regex_titles_chinese_2}\\s+.{1,50}$)`;

const regex_other_titles = "内容简介|內容簡介|内容介绍|內容介紹|内容梗概|内容大意|小说简介|小說簡介|小说介绍|小說介紹|小说大意|小說大意|书籍简介|書籍簡介|书籍介绍|書籍介紹|书籍大意|書籍大意|作品简介|作品簡介|作品介绍|作品介紹|作品大意|作品相关|作者简介|作者簡介|作者介绍|作者介紹|作品相關|简介|簡介|介绍|介紹|大意|梗概|序|代序|自序|序言|序章|序幕|前言|楔子|引言|引子|终章|終章|大结局|结局|结尾|尾声|尾聲|后记|後記|完本|完本感言|完结|完结感言|出版后记|出版後記|谢辞|謝辭|番外|番外篇|编辑推荐|編輯推薦|书籍相关|書籍相關|作者声明|作者聲明|译者序|譯者序|外篇|附錄|附录|短篇|创作背景|創作背景|作品原文|白话译文|白話譯文|献言|獻言|编辑评价|編輯評價|作品简评|作品簡評|文案";
const regex_6 = `^(\\s*([【])?(${regex_other_titles})([】])?[:：]?\\s*$)`;
const regex_7 = `^(\\s*([【])?(${regex_other_titles})\\s+.{0,50}?([】])?\\s*$)`;

const regex_titles_english = "chapter|part|appendix|appendices|preface|Foreword|Introduction|Prologue|Epigraph|Table of contents|Epilogue|Afterword|Conclusion|Glossary|Acknowledgments|Bibliography|Index|Errata|Colophon|Copyright";
const regex_8 = `^(\\s*(${regex_titles_english})\\s*$)`;
const regex_9 = `^(\\s*(${regex_titles_english})\\s+.{0,50}?$)`;

const regex = new RegExp(`${regex_1}|${regex_2}|${regex_3}|${regex_4}|${regex_5}|${regex_6}|${regex_7}|${regex_8}|${regex_9}`, "i");


// Test language
const regex_isEastern = new RegExp(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f\u3131-\uD79D]+/);


// Test punctuation
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

function makeFootNote(str) {
    let current = str.trim();

    // Find if footnote characters exist
    if (regex_isFootNote.test(current)) {        
        let allMatches = current.match(regex_isFootNote);

        if (allMatches.length == 1 && current.indexOf(allMatches[0]) == 0) {
            // this is the actual footnote itself
            footNoteContainer.innerHTML += `<li id='fn${footnote_proccessed_counter}'>${current.slice(1)}</li>`;
            footnote_proccessed_counter++;
            return "";
        } else {
            // main text
            for (i in allMatches) {
                // console.log("footnote.length: ", footnotes.length);
                // console.log("Found footnote: ", allMatches[i]);
                let curIndex = current.indexOf(allMatches[i]);
                current = `${current.slice(0, curIndex)}<a rel="footnote" href="#fn${footnotes.length}"><img class="footnote_img" src="images/note_${style.ui_LANG}.png"/></a>${current.slice(curIndex + 1)}`;
                footnotes.push(allMatches[i]);
            }
        }
    }

    return current;
}

function optimization(str) {
    let current = str.trim();

    // General patterns
    const reg_weird_symbols = "[※★☆◎━┏┓┗┛╰●╯]+";
    const reg_http = "(http[s]?[:：]//)?";
    const reg_http_end = "[/]?\\s*";
    const reg_colon = "[：:]?\\s*";
    const reg_someStrings = "\\s*(.{0,50}?)\\s*";
    const reg_punc = "\\s*[,，;；.。!！\?？\'\"、/／|｜]?\\s*";
    const reg_bracket_left = "\\s*[\\[［\\(（\\{《「『﹁﹃]?\\s*";
    const reg_bracket_right = "\\s*[\\]］\\)）\\}》」』﹂﹄]?\\s*";
    const reg_symbols = new RegExp(reg_weird_symbols, "g");
    current = current.replace(reg_symbols, "").trim();

    // Remove 知轩藏书 specific elements
    const reg_zxcs_url = `^(\\s*(${reg_http}www.zxcs.(me|info)${reg_http_end})\\s*)$`;
    const reg_zscs_dash = "^(\\s*[=]+\\s*$)";
    const reg_zscs_download = `^(\\s*(更多精校小说尽在知轩藏书下载)\\s*${reg_colon}(${reg_http}www.zxcs.(me|info)${reg_http_end})$)`;
    const reg_zscs_bookname = `^(\\s*((书名)?\\s*${reg_colon}${reg_bracket_left}${bookAndAuthor.bookName}${reg_bracket_right})\\s*$)`;
    const reg_zscs_author = `^(\\s*((作者)?\\s*${reg_colon}${bookAndAuthor.author})\\s*$)`;
    const reg_zscs_bookname_author1 = `^(\\s*((书名)?\\s*${reg_colon}${reg_bracket_left}${bookAndAuthor.bookName}${reg_bracket_right})\\s*((作者)?\\s*${reg_colon}${bookAndAuthor.author})\\s*$)`;
    const reg_zscs_bookname_author2 = `^(\\s*((书名)?\\s*${reg_colon}${reg_bracket_left}${bookAndAuthor.bookName}${reg_bracket_right})\\s*([\\(（)]?)(文字精校版)([)）]?)\\s*((作者)?\\s*${reg_colon}${bookAndAuthor.author})\\s*$)`;
    const reg_zscs_author_bookname = `^(\\s*((作者)?\\s*${reg_colon}${bookAndAuthor.author})\\s*((书名)?\\s*${reg_colon}${reg_bracket_left}${bookAndAuthor.bookName}${reg_bracket_right})\\s*$)`;
    const reg_zscs_ad1 = `^(\\s*(本书由本站书友从网络收集整理并上传分享)${reg_punc}(版权归原作者和出版社所有)${reg_punc}\\s*$)`;
    const reg_zscs = new RegExp(`${reg_zxcs_url}|${reg_zscs_dash}|${reg_zscs_download}|${reg_zscs_bookname}|${reg_zscs_author}|${reg_zscs_bookname_author1}|${reg_zscs_bookname_author2}|${reg_zscs_author_bookname}|${reg_zscs_ad1}`, "i");
    current = current.replace(reg_zscs, "").trim();

    // Remove 塞班 specific elements
    const reg_sb_copyright1 = `^(\\s*(版权归原作者所有)${reg_punc}(请勿用于商业用途)${reg_punc}\\s*$)`;
    const reg_sb_copyright2 = `^(\\s*(版权归原作者所有)${reg_punc}(本人购买文本并精心制作)${reg_punc}(转载请注明出处)${reg_punc}\\s*$)`;
    const reg_sb_copyright3 = `^(\\s*(请勿用于商业用途)${reg_punc}(如有违反)${reg_punc}(发生问题$){reg_punc}(后果自负)${reg_punc}(与本人无关)\\s*$)`;
    const reg_sb_copyright4 = `^(\\s*(塞班智能手机论坛真诚欢迎新老会员)${reg_punc}\\s*$)`;
    const reg_sb_copyright5 = `^(\\s*(请勿用于商业行为)${reg_punc}(一切后果自负)${reg_punc}\\s*$)`;
    const reg_sb_copyright6 = `^(\\s*(仅供试阅)${reg_punc}(转载请注明)${reg_punc}(同时请支持正版)${reg_punc}(版权属于原作者)${reg_punc}\\s*$)`;
    const reg_sb_copyright7 = `^(\\s*(请勿用于商业传播)${reg_punc}(谢谢)${reg_punc}\\s*$)`;
    const reg_sb_copyright8 = `^(\\s*(请勿用于商业用途)${reg_punc}(请勿上传至百度文库)${reg_punc}(如用后果自负)${reg_punc}\\s*$)`;
    const reg_sb_copyright9 = `^(\\s*(版权归原作者所有)${reg_punc}(请勿用于一切商业用途)${reg_punc}\\s*$)`;
    const reg_sb_copyright10 = `^(\\s*(版权归原作者所有)${reg_punc}(文本仅供试读)${reg_punc}(请勿用于一切商业用途)${reg_punc}\\s*$)`;
    const reg_sb_url = `^(\\s*(${reg_http}bbs.dospy.com${reg_http_end})\\s*)$`;
    const reg_sb_bookname_author = `^(\\s*(\\[)?${bookAndAuthor.bookName}\\s*(\\/)?\\s*${bookAndAuthor.author}\\s*(著)?\\s*(\\])?\\s*$)`;
    const reg_sb_dash = "^(\\s*[-※★☆◎…━┏┓┗┛]+\\s*$)";
    const reg_sb_made1 = `^(\\s*(本电子书由)${reg_someStrings}(整理制作)${reg_punc}$)`;
    const reg_sb_made2 = `^(\\s*(本书由)${reg_someStrings}(整理制作)${reg_punc}$)`;
    const reg_sb_made3 = `^(\\s*(文本由)${reg_someStrings}(整理制作)${reg_punc}$)`;
    const reg_sb_made4 = `^(\\s*(本电子书由)${reg_someStrings}(精校排版整理制作)${reg_punc}(转载请注明)${reg_punc}$)`;
    const reg_sb_forum = `^(\\s*(塞班智能手机论坛)\\s*${reg_colon}(${reg_http}bbs.dospy.com${reg_http_end})${reg_punc}$)`;
    const reg_sb_forum_made1 = `^(\\s*(塞班智能手机论坛)\\s*${reg_colon}(${reg_http}bbs.dospy.com${reg_http_end})${reg_someStrings}(整理制作)${reg_punc}$)`;
    const reg_sb_forum_made2 = `^(\\s*(本文由塞班电子书组)${reg_someStrings}(整理)${reg_punc}(版权归原作者所有)${reg_punc}$)`;
    const reg_sb_forum_made3 = `^(\\s*(本文由塞班电子书组)${reg_someStrings}(整理制作)${reg_punc}(版权归原作者所有)${reg_punc}$)`;
    const reg_sb_forum_made4 = `^(\\s*(该文本由塞班电子书讨论区)${reg_punc}${reg_someStrings}${reg_punc}(连载精校整理)${reg_punc}$)`;
    const reg_sb_forum_made5 = `^(${reg_someStrings}(搜集整理)${reg_punc}(版权归原作者)${reg_punc}(请勿用于商业用途)${reg_punc}(如用后果自负)${reg_punc}$)`;
    const reg_sb_forum_made6 = `^(本书由塞班论坛${reg_http}bbs.dospy.com${reg_http_end}$)`;
    const reg_sb_forum_made7 = `^(\\s*(电子书组)${reg_someStrings}(搜集)${reg_punc}(整理)${reg_punc}(制作)${reg_punc}(版权归原作者所有)${reg_punc}$)`;
    const reg_sb_forum_made8 = `^(\\s*(本电子书由塞班智能手机论坛)${reg_someStrings}(整理制作，仅供试阅)${reg_punc}$)`;
    const reg_sb_forum_made9 = `^(\\s*${reg_bracket_left}(本电子书由塞班电子书讨论区)${reg_someStrings}(整理校对)${reg_punc}(仅供试阅)${reg_punc}(转载请注明)${reg_punc}(同时请支持正版)${reg_punc}(版权属于原作者)${reg_punc}(请勿用于商业传播)${reg_bracket_right}\\s*$)`;
    const reg_sb_forum_made10 = `^(\\s*${reg_bracket_left}(原始文本网络收集)${reg_punc}(塞班电子书讨论区)${reg_someStrings}(整理校对)${reg_bracket_right}\\s*$)`;
    const reg_sb = new RegExp(`${reg_sb_copyright1}|${reg_sb_copyright2}|${reg_sb_copyright3}|${reg_sb_copyright4}|${reg_sb_copyright5}|${reg_sb_copyright6}|${reg_sb_copyright7}|${reg_sb_copyright8}|${reg_sb_copyright9}|${reg_sb_copyright10}|${reg_sb_url}|${reg_sb_bookname_author}|${reg_sb_dash}|${reg_sb_made1}|${reg_sb_made2}|${reg_sb_made3}|${reg_sb_made4}|${reg_sb_forum}|${reg_sb_forum_made1}|${reg_sb_forum_made2}|${reg_sb_forum_made3}|${reg_sb_forum_made4}|${reg_sb_forum_made5}|${reg_sb_forum_made6}|${reg_sb_forum_made7}|${reg_sb_forum_made8}|${reg_sb_forum_made9}|${reg_sb_forum_made10}`, "i");
    current = current.replace(reg_sb, "").trim();

    // Remove 99 specific elements
    const reg_99_dash = "^(\\s*[\\+]+\\s*$)";
    const reg_99_ad1 = `^(\\s*(\\+)?\\s*(久久电子书提醒您)${reg_punc}(爱护眼睛合理休息)${reg_punc}\\s*(\\+)?$)`;
    const reg_99_ad2 = `^(\\s*(\\+)?\\s*(多格式免费电子书)${reg_punc}(WwW.99121.CoM)${reg_punc}\\s*(\\+)?$)`;
    const reg_99_ad3 = `^(\\s*(TXT.CHM.UMD.JAR)${reg_punc}\\s*$)`;
    const reg_99_ad4 = `^(\\s*(WWW.99121.COM)${reg_punc}\\s*$)`;
    const reg_99_ad5 = `^(\\s*(爱护眼睛休息会吧)${reg_punc}\\s*$)`;
    const reg_99_ad6 = `^(\\s*(多格式免费下载)${reg_punc}\\s*$)`;
    const reg_99 = new RegExp(`${reg_99_dash}|${reg_99_ad1}|${reg_99_ad2}|${reg_99_ad3}|${reg_99_ad4}|${reg_99_ad5}|${reg_99_ad6}`, "i");
    current = current.replace(reg_99, "").trim();

    // Remove 阡陌居 specific elements
    const reg_qmj_ad1 = `^(\\s*${reg_bracket_left}${bookAndAuthor.bookName}${reg_bracket_right}\\s*(由)\\s*(阡陌居)\\s*(会员)${reg_someStrings}(校对排版)${reg_punc}$)`;
    const reg_qmj_ad2 = `^(\\s*(更多校对精校书籍请访问)${reg_colon}$)`;
    const reg_qmj_ad3 = `^(\\s*(阡陌居)${reg_colon}(${reg_http}www.1000qm.com${reg_http_end})\\s*$)`;
    const reg_qmj = new RegExp(`${reg_qmj_ad1}|${reg_qmj_ad2}|${reg_qmj_ad3}`, "i");
    current = current.replace(reg_qmj, "").trim();

    // Remove 天天书屋 specific elements
    const reg_ttsw_ad1 = `^(\\s*(欢迎访问)${reg_punc}(天天书屋)${reg_punc}(网址)${reg_colon}(${reg_http}www.ttshu.com${reg_http_end})${reg_punc}(本站提供手机铃声)${reg_punc}(手机电影)${reg_punc}(mtv)${reg_punc}(网络小说)${reg_punc}(手机智能软件)${reg_punc}(手机游戏等最新下载)${reg_punc}(让你的手机应用丰富多彩)${reg_punc}\\s*$)`;
    const reg_ttsw = new RegExp(`${reg_ttsw_ad1}`, "i");
    current = current.replace(reg_ttsw, "").trim();
    
    return current.trim();
}