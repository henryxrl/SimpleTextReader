/**
 * @fileoverview Regular expression rules module
 *
 * This module defines and manages various regex rules used in text processing, including:
 * - Title recognition rules
 * - Language detection rules
 * - Punctuation rules
 * - Ad text cleaning rules
 */

/**
 * Basic regex components object
 * Contains base string patterns used to build complex rules.
 * Credit: https://stackoverflow.com/questions/267399/how-do-you-match-only-valid-roman-numerals-with-a-regular-expression
 * Credit: https://stackoverflow.com/questions/19620735/make-regular-expression-not-match-empty-string
 * @type {Object}
 */
const REGEX_COMPONENTS = {
    NUMBER_CHINESE: "一二两三四五六七八九十○零百千万壹贰叁肆伍陆柒捌玖拾佰仟萬首末0-9０-９",
    NUMBER_ENGLISH_AND_ROMAN_NUMERALS:
        "(?:[0-9]+|[ⅡⅢⅣⅥⅦⅧⅨⅪⅫↀↁↂↇↈⅱⅲⅳⅵⅶⅷⅸⅺⅻ]|\\b(?<!\\w)(?:M{0,4}(?:CM|CD|D?C{0,3})(?:XC|XL|L?X{0,3})(?:IX|IV|V?I{0,3}))\\b(?!\\w)|\\b(?<!\\w)(?:m{0,4}(?:cm|cd|d?c{0,3})(?:xc|xl|l?x{0,3})(?:ix|iv|v?i{0,3}))\b(?!\\w))",
    TITLES_CHINESE: {
        PRE_1: "([第序终終卷\\[【]\\s*[",
        POST_1: "\\s/\\.、]+\\s*(?:[章节節回集卷部篇季\\]】]|部曲))",
        PRE_2: "([\\[【序终終卷]\\s*[",
        POST_2: "\\s/\\.、\\]】]+)\\s*",
    },
    TITLES_CHINESE_OTHER:
        "内容简介|內容簡介|内容介绍|內容介紹|内容梗概|内容大意|小说简介|小說簡介|小说介绍|小說介紹|小说大意|小說大意|书籍简介|書籍簡介|书籍介绍|書籍介紹|书籍大意|書籍大意|作品简介|作品簡介|作品介绍|作品介紹|作品大意|作品相关|作者简介|作者簡介|作者介绍|作者介紹|作品相關|简介|簡介|介绍|介紹|大意|梗概|序|代序|自序|序言|序章|序幕|前言|楔子|引言|引子|终章|終章|大结局|结局|结尾|尾声|尾聲|后记|後記|完本|完本感言|完结|完结感言|出版后记|出版後記|谢辞|謝辭|番外|番外篇|编辑推荐|編輯推薦|书籍相关|書籍相關|作者声明|作者聲明|译者序|譯者序|外篇|附錄|附录|短篇|创作背景|創作背景|作品原文|白话译文|白話譯文|献言|獻言|编辑评价|編輯評價|作品简评|作品簡評|文案|外传|外傳|写作杂谈|寫作雜談|写作感言|寫作感言",
    TITLES_ENGLISH: "chapter|part|section|subsection|appendix|note|reference|addendum",
    TITLES_ENGLISH_OTHER:
        "accolades|appendices|addenda|addendums|preface|foreword|introduction|prologue|epigraph|table of contents|epilogue|afterword|conclusion|glossary|acknowledgements|bibliography|index|errata|colophon|abstract|postscript|contents|list of illustrations|list of tables|notes|note|references|reference|title page|copyright page|dedication|about the author|about the translator|about the editor|about the illustrator|about the publisher|about the series|about the book|credits|credit|prefatory note|prefatory notes|proem|prolegomenon|prefatory material|prefatory matter|endpapers|endpaper|endnotes|endnote|edition",
};

/**
 * Constructs title matching rules
 * Builds a complete set of title matching rules based on basic components.
 * @returns {Array<string>} Array of title matching rules.
 */
const buildTitleRules = () => {
    const {
        NUMBER_CHINESE,
        NUMBER_ENGLISH_AND_ROMAN_NUMERALS,
        TITLES_CHINESE,
        TITLES_CHINESE_OTHER,
        TITLES_ENGLISH,
        TITLES_ENGLISH_OTHER,
    } = REGEX_COMPONENTS;
    const TITLES_CHINESE_1 = TITLES_CHINESE.PRE_1 + NUMBER_CHINESE + TITLES_CHINESE.POST_1;
    const TITLES_CHINESE_2 = TITLES_CHINESE.PRE_2 + NUMBER_CHINESE + TITLES_CHINESE.POST_2;
    const TITLES_CHINESE_3 = "\\s*([" + NUMBER_CHINESE.slice(0, -6) + TITLES_CHINESE.POST_1;

    return [
        `^(\\s*(正文\\s*)?[${NUMBER_CHINESE.slice(0, -6)}]*\\s*$)`,
        `^(\\s*[\\[【](正文\\s*)?[${NUMBER_CHINESE.slice(0, -6)}]*[\\]】]\\s*$)`,
        `^(\\s*(正文\\s*)?${TITLES_CHINESE_1}\\s*$)`,
        `^(\\s*[\\[【](正文\\s*)?${TITLES_CHINESE_1}[\\]】]\\s*$)`,
        `^(\\s*(正文\\s*)?${TITLES_CHINESE_1}[:：\\s]\\s*(.+)$)`,
        `^(\\s*[\\[【](正文\\s*)?${TITLES_CHINESE_1}[:：\\s]\\s*(.+)[\\]】]$)`,
        `^(\\s*(正文\\s*)?${TITLES_CHINESE_2}\\s*$)`,
        `^(\\s*[\\[【](正文\\s*)?${TITLES_CHINESE_2}[\\]】]\\s*$)`,
        `^(\\s*(正文\\s*)?${TITLES_CHINESE_2}[:：\\s]\\s*(.+)$)`,
        `^(\\s*[\\[【](正文\\s*)?${TITLES_CHINESE_2}[:：\\s]\\s*(.+)[\\]】]\\s*$)`,
        `^(\\s*(正文\\s*)?${TITLES_CHINESE_3}\\s*$)`,
        `^(\\s*[\\[【](正文\\s*)?${TITLES_CHINESE_3}[\\]】]\\s*$)`,
        `^(\\s*(正文\\s*)?${TITLES_CHINESE_3}[:：\\s]\\s*(.+)$)`,
        `^(\\s*[\\[【](正文\\s*)?${TITLES_CHINESE_3}[:：\\s]\\s*(.+)[\\]】]\\s*$)`,
        `^(\\s*(${TITLES_CHINESE_OTHER})[:：]?\\s*$)`,
        `^(\\s*[\\[【](${TITLES_CHINESE_OTHER})[\\]】][:：]?\\s*$)`,
        `^(\\s*(${TITLES_CHINESE_OTHER})[:：\\s]\\s*(.+)\\s*$)`,
        `^(\\s*[\\[【](${TITLES_CHINESE_OTHER})[:：\\s]\\s*(.+)[\\]】]\\s*$)`,
        `^(\\s*((${TITLES_ENGLISH})[\\.:\\s]?\\s*(${NUMBER_ENGLISH_AND_ROMAN_NUMERALS}))[:\\.\\s]?\\s*$)`,
        `^(\\s*((${TITLES_ENGLISH})[\\.:\\s]?\\s*(${NUMBER_ENGLISH_AND_ROMAN_NUMERALS}))[:\\.\\s]?\\s*(.{0,50})$)`,
        `^(\\s*(${TITLES_ENGLISH_OTHER})[:\\.\\s]?\\s*$)`,
        `^(\\s*(${TITLES_ENGLISH_OTHER})[:\\.\\s]?\\s*(.{0,50})$)`,
    ];
};

/**
 * Exported regex rules set
 * Contains all regex rules used for text processing.
 * @type {Object}
 */
export const REGEX_RULES = {
    TITLES: buildTitleRules(),
    LANGUAGE: /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f\u3131-\uD79D]+/,
    PUNCTUATION: /\p{P}/u,
    FOOTNOTE: /[\u24EA\u2460-\u2473\u3251-\u325F\u32B1-\u32BF]/gu,
    SYMBOLS: "[※★☆◎━┏┓┗┛╰●╯]+",
    HTTP: "(http[s]?[:：]//)?",
    HTTP_END: "[/]?\\s*",
    COLON_NOSPACE: "[：:]?",
    COLON: "[：:]?\\s*",
    SOMESTRINGS: "\\s*(.+)\\s*",
    PUNC_NOSPACE: "[,，;；.。!！?？'\"、/／|｜]?",
    PUNC: "\\s*[,，;；.。!！?？'\"、/／|｜]?\\s*",
    BRACKET_LEFT_NOSPACE: "[\\[［\\(（\\{《「『﹁﹃【]?",
    BRACKET_LEFT: "\\s*[\\[［\\(（\\{《「『﹁﹃【]?\\s*",
    BRACKET_RIGHT_NOSPACE: "[\\]］\\)）\\}》」』﹂﹄】]?",
    BRACKET_RIGHT: "\\s*[\\]］\\)）\\}》」』﹂﹄】]?\\s*",
    BRACKET_BOOKNAME_LEFT_NOSPACE: "[\\[［《「『﹁﹃【]?",
    BRACKET_BOOKNAME_LEFT: "\\s*[\\[［《「『﹁﹃【]?\\s*",
    BRACKET_BOOKNAME_RIGHT_NOSPACE: "[\\]］》」』﹂﹄】]?",
    BRACKET_BOOKNAME_RIGHT: "\\s*[\\]］》」』﹂﹄】]?\\s*",
    BOOK_EDITION: "((文字精校版)|(校对版全本)|(精校版全本))",
};

/**
 * Ads rules generator
 * Generates regex rules used to clean ad text based on book information.
 * @param {Object} bookAndAuthor - Book and author information object.
 * @param {string} bookAndAuthor.bookNameRE - Regex pattern for book name.
 * @param {string} bookAndAuthor.authorRE - Regex pattern for author name.
 * @returns {Object} Object containing regex rules for various sources.
 */
export const generateAdsRules = (bookAndAuthor) => ({
    EN: () => [
        `^(\\s*(\\[)?${bookAndAuthor.bookName}\\s*(\\])?\\s*$)`,
        `^(\\s*(By[:：])?\\s*(\\[)?${bookAndAuthor.author}\\s*(\\])?\\s*$)`,
    ],
    ZXCS: () => [
        `^(\\s*(${REGEX_RULES.HTTP}www.zxcs.(me|info)${REGEX_RULES.HTTP_END})\\s*)$`,
        "^(\\s*[=]+\\s*$)",
        `^(\\s*(更多精校小说尽在知轩藏书下载)\\s*${REGEX_RULES.COLON}(${REGEX_RULES.HTTP}(www.)?zxcs(txt|8)?.(com|me|info|zip)${REGEX_RULES.HTTP_END})$)`,
        `^(\\s*((书名)?\\s*${REGEX_RULES.COLON}${REGEX_RULES.BRACKET_LEFT}${bookAndAuthor.bookNameRE}${REGEX_RULES.BRACKET_RIGHT})\\s*$)`,
        `^(\\s*((作者)?\\s*${REGEX_RULES.COLON}${bookAndAuthor.authorRE})\\s*$)`,
        `^(\\s*((书名)?\\s*${REGEX_RULES.COLON}${REGEX_RULES.BRACKET_LEFT}${bookAndAuthor.bookNameRE}${REGEX_RULES.BRACKET_RIGHT})\\s*((作者)?\\s*${REGEX_RULES.COLON}${bookAndAuthor.authorRE})\\s*$)`,
        `^(\\s*((书名)?\\s*${REGEX_RULES.COLON}${REGEX_RULES.BRACKET_LEFT}${bookAndAuthor.bookNameRE}${REGEX_RULES.BRACKET_RIGHT})\\s*([\\(（)]?)${REGEX_RULES.BOOK_EDITION}([)）]?)\\s*((作者)?\\s*${REGEX_RULES.COLON}${bookAndAuthor.authorRE})\\s*$)`,
        `^(\\s*((作者)?\\s*${REGEX_RULES.COLON}${bookAndAuthor.authorRE})\\s*((书名)?\\s*${REGEX_RULES.COLON}${REGEX_RULES.BRACKET_LEFT}${bookAndAuthor.bookNameRE}${REGEX_RULES.BRACKET_RIGHT})\\s*$)`,
        `^(\\s*(本书由本站书友从网络收集整理并上传分享)${REGEX_RULES.PUNC}(版权归原作者和出版社所有)${REGEX_RULES.PUNC}\\s*$)`,
        `^(\\s*${REGEX_RULES.BRACKET_LEFT}(4020电子书)${REGEX_RULES.BRACKET_RIGHT}(${REGEX_RULES.HTTP}(www.)?4020book.com${REGEX_RULES.HTTP_END})${REGEX_RULES.PUNC}\\s*$)`,
    ],
    SAIBAN: () => [
        `^(\\s*(版权归原作者所有)${REGEX_RULES.PUNC}(请勿用于商业用途)${REGEX_RULES.PUNC}\\s*$)`,
        `^(\\s*(版权归原作者所有)${REGEX_RULES.PUNC}(本人购买文本并精心制作)${REGEX_RULES.PUNC}(转载请注明出处)${REGEX_RULES.PUNC}\\s*$)`,
        `^(\\s*(请勿用于商业用途)${REGEX_RULES.PUNC}(如有违反)${REGEX_RULES.PUNC}(发生问题)${REGEX_RULES.PUNC}(后果自负)${REGEX_RULES.PUNC}(与本人无关)\\s*$)`,
        `^(\\s*(塞班智能手机论坛真诚欢迎新老会员)${REGEX_RULES.PUNC}\\s*$)`,
        `^(\\s*(请勿用于商业行为)${REGEX_RULES.PUNC}(一切后果自负)${REGEX_RULES.PUNC}\\s*$)`,
        `^(\\s*(仅供试阅)${REGEX_RULES.PUNC}(转载请注明)${REGEX_RULES.PUNC}(同时请支持正版)${REGEX_RULES.PUNC}(版权属于原作者)${REGEX_RULES.PUNC}\\s*$)`,
        `^(\\s*(请勿用于商业传播)${REGEX_RULES.PUNC}(谢谢)${REGEX_RULES.PUNC}\\s*$)`,
        `^(\\s*(请勿用于商业用途)${REGEX_RULES.PUNC}(请勿上传至百度文库)${REGEX_RULES.PUNC}(如用后果自负)${REGEX_RULES.PUNC}\\s*$)`,
        `^(\\s*(版权归原作者所有)${REGEX_RULES.PUNC}(请勿用于一切商业用途)${REGEX_RULES.PUNC}\\s*$)`,
        `^(\\s*(版权归原作者所有)${REGEX_RULES.PUNC}(文本仅供试读)${REGEX_RULES.PUNC}(请勿用于一切商业用途)${REGEX_RULES.PUNC}\\s*$)`,
        `^(\\s*(${REGEX_RULES.HTTP}bbs.dospy.com${REGEX_RULES.HTTP_END})\\s*)$`,
        `^(\\s*(\\[)?${bookAndAuthor.bookNameRE}\\s*(\\/)?\\s*${bookAndAuthor.authorRE}\\s*(著)?\\s*(\\])?\\s*$)`,
        "^(\\s*[-※★☆◎…━┏┓┗┛]+\\s*$)",
        `^(\\s*(本电子书由)${REGEX_RULES.SOMESTRINGS}(整理制作)${REGEX_RULES.PUNC}$)`,
        `^(\\s*(本书由)${REGEX_RULES.SOMESTRINGS}(整理制作)${REGEX_RULES.PUNC}$)`,
        `^(\\s*(文本由)${REGEX_RULES.SOMESTRINGS}(整理制作)${REGEX_RULES.PUNC}$)`,
        `^(\\s*(本电子书由)${REGEX_RULES.SOMESTRINGS}(精校排版整理制作)${REGEX_RULES.PUNC}(转载请注明)${REGEX_RULES.PUNC}$)`,
        `^(\\s*(塞班智能手机论坛)\\s*${REGEX_RULES.COLON}(${REGEX_RULES.HTTP}bbs.dospy.com${REGEX_RULES.HTTP_END})${REGEX_RULES.PUNC}$)`,
        `^(\\s*(塞班智能手机论坛)\\s*${REGEX_RULES.COLON}(${REGEX_RULES.HTTP}bbs.dospy.com${REGEX_RULES.HTTP_END})${REGEX_RULES.SOMESTRINGS}(整理制作)${REGEX_RULES.PUNC}$)`,
        `^(\\s*(本文由塞班电子书组)${REGEX_RULES.SOMESTRINGS}(整理)${REGEX_RULES.PUNC}(版权归原作者所有)${REGEX_RULES.PUNC}$)`,
        `^(\\s*(本文由塞班电子书组)${REGEX_RULES.SOMESTRINGS}(整理制作)${REGEX_RULES.PUNC}(版权归原作者所有)${REGEX_RULES.PUNC}$)`,
        `^(\\s*(该文本由塞班电子书讨论区)${REGEX_RULES.PUNC}${REGEX_RULES.SOMESTRINGS}${REGEX_RULES.PUNC}(连载精校整理)${REGEX_RULES.PUNC}$)`,
        `^(${REGEX_RULES.SOMESTRINGS}(搜集整理)${REGEX_RULES.PUNC}(版权归原作者)${REGEX_RULES.PUNC}(请勿用于商业用途)${REGEX_RULES.PUNC}(如用后果自负)${REGEX_RULES.PUNC}$)`,
        `^(本书由塞班论坛${REGEX_RULES.HTTP}bbs.dospy.com${REGEX_RULES.HTTP_END}$)`,
        `^(\\s*(电子书组)${REGEX_RULES.SOMESTRINGS}(搜集)${REGEX_RULES.PUNC}(整理)${REGEX_RULES.PUNC}(制作)${REGEX_RULES.PUNC}(版权归原作者所有)${REGEX_RULES.PUNC}$)`,
        `^(\\s*(本电子书由塞班智能手机论坛)${REGEX_RULES.SOMESTRINGS}(整理制作，仅供试阅)${REGEX_RULES.PUNC}$)`,
        `^(\\s*${REGEX_RULES.BRACKET_LEFT}(本电子书由塞班电子书讨论区)${REGEX_RULES.SOMESTRINGS}(整理校对)${REGEX_RULES.PUNC}(仅供试阅)${REGEX_RULES.PUNC}(转载请注明)${REGEX_RULES.PUNC}(同时请支持正版)${REGEX_RULES.PUNC}(版权属于原作者)${REGEX_RULES.PUNC}(请勿用于商业传播)${REGEX_RULES.BRACKET_RIGHT}\\s*$)`,
        `^(\\s*${REGEX_RULES.BRACKET_LEFT}(原始文本网络收集)${REGEX_RULES.PUNC}(塞班电子书讨论区)${REGEX_RULES.SOMESTRINGS}(整理校对)${REGEX_RULES.BRACKET_RIGHT}\\s*$)`,
    ],
    JIUJIU: () => [
        "^(\\s*[\\+]+\\s*$)",
        `^(\\s*(\\+)?\\s*(久久电子书提醒您)${REGEX_RULES.PUNC}(爱护眼睛合理休息)${REGEX_RULES.PUNC}\\s*(\\+)?$)`,
        `^(\\s*(\\+)?\\s*(多格式免费电子书)${REGEX_RULES.PUNC}(WwW.99121.CoM)${REGEX_RULES.PUNC}\\s*(\\+)?$)`,
        `^(\\s*(TXT.CHM.UMD.JAR)${REGEX_RULES.PUNC}\\s*$)`,
        `^(\\s*(WWW.99121.COM)${REGEX_RULES.PUNC}\\s*$)`,
        `^(\\s*(爱护眼睛休息会吧)${REGEX_RULES.PUNC}\\s*$)`,
        `^(\\s*(多格式免费下载)${REGEX_RULES.PUNC}\\s*$)`,
    ],
    QMJ: () => [
        `^(\\s*${REGEX_RULES.BRACKET_LEFT}${bookAndAuthor.bookNameRE}${REGEX_RULES.BRACKET_RIGHT}\\s*(由)\\s*(阡陌居)\\s*(会员)${REGEX_RULES.SOMESTRINGS}(校对排版)${REGEX_RULES.PUNC}$)`,
        `^(\\s*(更多校对精校书籍请访问)${REGEX_RULES.COLON}$)`,
        `^(\\s*(阡陌居)${REGEX_RULES.COLON}(${REGEX_RULES.HTTP}www.1000qm.com${REGEX_RULES.HTTP_END})\\s*$)`,
    ],
    TTSW: () => [
        `^(\\s*(欢迎访问)${REGEX_RULES.PUNC}(天天书屋)${REGEX_RULES.PUNC}(网址)${REGEX_RULES.COLON}(${REGEX_RULES.HTTP}www.ttshu.com${REGEX_RULES.HTTP_END})${REGEX_RULES.PUNC}(本站提供手机铃声)${REGEX_RULES.PUNC}(手机电影)${REGEX_RULES.PUNC}(mtv)${REGEX_RULES.PUNC}(网络小说)${REGEX_RULES.PUNC}(手机智能软件)${REGEX_RULES.PUNC}(手机游戏等最新下载)${REGEX_RULES.PUNC}(让你的手机应用丰富多彩)${REGEX_RULES.PUNC}\\s*$)`,
    ],
});
