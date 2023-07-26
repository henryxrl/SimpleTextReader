/*
Title extraction rules
*/
// const regex_number = "——\\-——一二两三四五六七八九十○零百千壹贰叁肆伍陆柒捌玖拾佰仟0-9０-９";
const regex_number = "一二两三四五六七八九十○零百千壹贰叁肆伍陆柒捌玖拾佰仟0-9０-９";
const regex_titles_chinese_pre_1 = "[第序终終卷【]\\s*([";
const regex_titles_chinese_post_1 = "\\s/\\、、]*)\\s*[章节節回集卷部篇季】]";
const regex_titles_chinese_1 = regex_titles_chinese_pre_1 + regex_number + regex_titles_chinese_post_1;

const regex_titles_chinese_pre_2 = "[序终終卷]\\s*([";
const regex_titles_chinese_post_2 = "\\s/\\、、]*)\\s*";
const regex_titles_chinese_2 = regex_titles_chinese_pre_2 + regex_number + regex_titles_chinese_post_2;

const regex_other_titles = "内容简介|內容簡介|内容介绍|內容介紹|内容梗概|内容大意|小说简介|小說簡介|小说介绍|小說介紹|小说大意|小說大意|书籍简介|書籍簡介|书籍介绍|書籍介紹|书籍大意|書籍大意|作品简介|作品簡介|作品介绍|作品介紹|作品大意|作品相关|作者简介|作者簡介|作者介绍|作者介紹|作品相關|简介|簡介|介绍|介紹|大意|梗概|序|代序|自序|序言|序章|序幕|前言|楔子|引言|引子|终章|終章|大结局|结局|结尾|尾声|尾聲|后记|後記|完本|完本感言|完结|完结感言|出版后记|出版後記|谢辞|謝辭|番外|番外篇|编辑推荐|編輯推薦|书籍相关|書籍相關|作者声明|作者聲明|译者序|譯者序|外篇|附錄|附录|短篇|创作背景|創作背景|作品原文|白话译文|白話譯文|献言|獻言|编辑评价|編輯評價|作品简评|作品簡評|文案";

const regex_titles_english = "chapter|part|appendix|appendices|preface|Foreword|Introduction|Prologue|Epigraph|Table of contents|Epilogue|Afterword|Conclusion|Glossary|Acknowledgments|Bibliography|Index|Errata|Colophon|Copyright";

var rules_titles = [
    `^(\\s*(正文\\s*)?[${regex_number.slice(0, -6)}]*\\s*$)|(\\s*([【])(正文\\s*)?[${regex_number.slice(0, -6)}]*([】])\\s*$)`,
    `^(\\s*(正文\\s*)?${regex_titles_chinese_1}\\s*$)|^(\\s*([【])(正文\\s*)?${regex_titles_chinese_1}([】])\\s*$)`,
    `^(\\s*(正文\\s*)?${regex_titles_chinese_1}\\s+.{1,50}$)|^(\\s*([【])(正文\\s*)?${regex_titles_chinese_1}\\s+.{1,50}([】])$)`,
    `^(\\s*(正文\\s*)?${regex_titles_chinese_2}\\s*$)|^(\\s*([【])(正文\\s*)?${regex_titles_chinese_2}([】])\\s*$)`,
    `^(\\s*(正文\\s*)?${regex_titles_chinese_2}\\s+.{1,50}$)|^(\\s*([【])(正文\\s*)?${regex_titles_chinese_2}\\s+.{1,50}([】])\\s*$)`,
    `^(\\s*(${regex_other_titles})[:：]?\\s*$)|^(\\s*([【])(${regex_other_titles})([】])[:：]?\\s*$)`,
    `^(\\s*(${regex_other_titles})\\s+.{0,50}?\\s*$)|(\\s*([【])(${regex_other_titles})\\s+.{0,50}?([】])\\s*$)`,
    `^(\\s*(${regex_titles_english})\\s*$)`,
    `^(\\s*(${regex_titles_english})\\s+.{0,50}?$)`
]


/*
Language detection rules
*/
var rules_language = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f\u3131-\uD79D]+/;


/*
Punctuation detection rules
*/
var rules_punctuation = /\p{P}/u;


/*
Footnote detection rules
*/
var rules_footnote = /[\u24EA\u2460-\u2473\u3251-\u325F\u32B1-\u32BF]/gu;


/*
Ads detection rules
*/
// General patterns
const regex_weird_symbols = "[※★☆◎━┏┓┗┛╰●╯]+";
const regex_http = "(http[s]?[:：]//)?";
const regex_http_end = "[/]?\\s*";
const regex_colon = "[：:]?\\s*";
const regex_someStrings = "\\s*(.{0,50}?)\\s*";
const regex_punc = "\\s*[,，;；.。!！\?？\'\"、/／|｜]?\\s*";
const regex_bracket_left = "\\s*[\\[［\\(（\\{《「『﹁﹃【]?\\s*";
const regex_bracket_right = "\\s*[\\]］\\)）\\}》」』﹂﹄】]?\\s*";
var rules_symbols = regex_weird_symbols;

// 知轩藏书 patterns
var rules_zxcs = () => [
    `^(\\s*(${regex_http}www.zxcs.(me|info)${regex_http_end})\\s*)$`,
    "^(\\s*[=]+\\s*$)",
    `^(\\s*(更多精校小说尽在知轩藏书下载)\\s*${regex_colon}(${regex_http}(www.)?zxcs(txt)?.(com|me|info)${regex_http_end})$)`,
    `^(\\s*((书名)?\\s*${regex_colon}${regex_bracket_left}${bookAndAuthor.bookName}${regex_bracket_right})\\s*$)`,
    `^(\\s*((作者)?\\s*${regex_colon}${bookAndAuthor.author})\\s*$)`,
    `^(\\s*((书名)?\\s*${regex_colon}${regex_bracket_left}${bookAndAuthor.bookName}${regex_bracket_right})\\s*((作者)?\\s*${regex_colon}${bookAndAuthor.author})\\s*$)`,
    `^(\\s*((书名)?\\s*${regex_colon}${regex_bracket_left}${bookAndAuthor.bookName}${regex_bracket_right})\\s*([\\(（)]?)(文字精校版)([)）]?)\\s*((作者)?\\s*${regex_colon}${bookAndAuthor.author})\\s*$)`,
    `^(\\s*((作者)?\\s*${regex_colon}${bookAndAuthor.author})\\s*((书名)?\\s*${regex_colon}${regex_bracket_left}${bookAndAuthor.bookName}${regex_bracket_right})\\s*$)`,
    `^(\\s*(本书由本站书友从网络收集整理并上传分享)${regex_punc}(版权归原作者和出版社所有)${regex_punc}\\s*$)`,
    `^(\\s*${regex_bracket_left}(4020电子书)${regex_bracket_right}(${regex_http}(www.)?4020book.com${regex_http_end})${regex_punc}\\s*$)`
]

// 塞班 patterns
var rules_sb = () => [
    `^(\\s*(版权归原作者所有)${regex_punc}(请勿用于商业用途)${regex_punc}\\s*$)`,
    `^(\\s*(版权归原作者所有)${regex_punc}(本人购买文本并精心制作)${regex_punc}(转载请注明出处)${regex_punc}\\s*$)`,
    `^(\\s*(请勿用于商业用途)${regex_punc}(如有违反)${regex_punc}(发生问题)${regex_punc}(后果自负)${regex_punc}(与本人无关)\\s*$)`,
    `^(\\s*(塞班智能手机论坛真诚欢迎新老会员)${regex_punc}\\s*$)`,
    `^(\\s*(请勿用于商业行为)${regex_punc}(一切后果自负)${regex_punc}\\s*$)`,
    `^(\\s*(仅供试阅)${regex_punc}(转载请注明)${regex_punc}(同时请支持正版)${regex_punc}(版权属于原作者)${regex_punc}\\s*$)`,
    `^(\\s*(请勿用于商业传播)${regex_punc}(谢谢)${regex_punc}\\s*$)`,
    `^(\\s*(请勿用于商业用途)${regex_punc}(请勿上传至百度文库)${regex_punc}(如用后果自负)${regex_punc}\\s*$)`,
    `^(\\s*(版权归原作者所有)${regex_punc}(请勿用于一切商业用途)${regex_punc}\\s*$)`,
    `^(\\s*(版权归原作者所有)${regex_punc}(文本仅供试读)${regex_punc}(请勿用于一切商业用途)${regex_punc}\\s*$)`,
    `^(\\s*(${regex_http}bbs.dospy.com${regex_http_end})\\s*)$`,
    `^(\\s*(\\[)?${bookAndAuthor.bookName}\\s*(\\/)?\\s*${bookAndAuthor.author}\\s*(著)?\\s*(\\])?\\s*$)`,
    "^(\\s*[-※★☆◎…━┏┓┗┛]+\\s*$)",
    `^(\\s*(本电子书由)${regex_someStrings}(整理制作)${regex_punc}$)`,
    `^(\\s*(本书由)${regex_someStrings}(整理制作)${regex_punc}$)`,
    `^(\\s*(文本由)${regex_someStrings}(整理制作)${regex_punc}$)`,
    `^(\\s*(本电子书由)${regex_someStrings}(精校排版整理制作)${regex_punc}(转载请注明)${regex_punc}$)`,
    `^(\\s*(塞班智能手机论坛)\\s*${regex_colon}(${regex_http}bbs.dospy.com${regex_http_end})${regex_punc}$)`,
    `^(\\s*(塞班智能手机论坛)\\s*${regex_colon}(${regex_http}bbs.dospy.com${regex_http_end})${regex_someStrings}(整理制作)${regex_punc}$)`,
    `^(\\s*(本文由塞班电子书组)${regex_someStrings}(整理)${regex_punc}(版权归原作者所有)${regex_punc}$)`,
    `^(\\s*(本文由塞班电子书组)${regex_someStrings}(整理制作)${regex_punc}(版权归原作者所有)${regex_punc}$)`,
    `^(\\s*(该文本由塞班电子书讨论区)${regex_punc}${regex_someStrings}${regex_punc}(连载精校整理)${regex_punc}$)`,
    `^(${regex_someStrings}(搜集整理)${regex_punc}(版权归原作者)${regex_punc}(请勿用于商业用途)${regex_punc}(如用后果自负)${regex_punc}$)`,
    `^(本书由塞班论坛${regex_http}bbs.dospy.com${regex_http_end}$)`,
    `^(\\s*(电子书组)${regex_someStrings}(搜集)${regex_punc}(整理)${regex_punc}(制作)${regex_punc}(版权归原作者所有)${regex_punc}$)`,
    `^(\\s*(本电子书由塞班智能手机论坛)${regex_someStrings}(整理制作，仅供试阅)${regex_punc}$)`,
    `^(\\s*${regex_bracket_left}(本电子书由塞班电子书讨论区)${regex_someStrings}(整理校对)${regex_punc}(仅供试阅)${regex_punc}(转载请注明)${regex_punc}(同时请支持正版)${regex_punc}(版权属于原作者)${regex_punc}(请勿用于商业传播)${regex_bracket_right}\\s*$)`,
    `^(\\s*${regex_bracket_left}(原始文本网络收集)${regex_punc}(塞班电子书讨论区)${regex_someStrings}(整理校对)${regex_bracket_right}\\s*$)`
]

// 99 patterns
var rules_99 = () => [
    "^(\\s*[\\+]+\\s*$)",
    `^(\\s*(\\+)?\\s*(久久电子书提醒您)${regex_punc}(爱护眼睛合理休息)${regex_punc}\\s*(\\+)?$)`,
    `^(\\s*(\\+)?\\s*(多格式免费电子书)${regex_punc}(WwW.99121.CoM)${regex_punc}\\s*(\\+)?$)`,
    `^(\\s*(TXT.CHM.UMD.JAR)${regex_punc}\\s*$)`,
    `^(\\s*(WWW.99121.COM)${regex_punc}\\s*$)`,
    `^(\\s*(爱护眼睛休息会吧)${regex_punc}\\s*$)`,
    `^(\\s*(多格式免费下载)${regex_punc}\\s*$)`
]

// 阡陌居 patterns
var rules_qmj = () => [
    `^(\\s*${regex_bracket_left}${bookAndAuthor.bookName}${regex_bracket_right}\\s*(由)\\s*(阡陌居)\\s*(会员)${regex_someStrings}(校对排版)${regex_punc}$)`,
    `^(\\s*(更多校对精校书籍请访问)${regex_colon}$)`,
    `^(\\s*(阡陌居)${regex_colon}(${regex_http}www.1000qm.com${regex_http_end})\\s*$)`
]

// 天天书屋 patterns
var rules_ttsw = () => [
    `^(\\s*(欢迎访问)${regex_punc}(天天书屋)${regex_punc}(网址)${regex_colon}(${regex_http}www.ttshu.com${regex_http_end})${regex_punc}(本站提供手机铃声)${regex_punc}(手机电影)${regex_punc}(mtv)${regex_punc}(网络小说)${regex_punc}(手机智能软件)${regex_punc}(手机游戏等最新下载)${regex_punc}(让你的手机应用丰富多彩)${regex_punc}\\s*$)`
]