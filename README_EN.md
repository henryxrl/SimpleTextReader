<!-- markdownlint-disable MD033 MD041 -->
<div align="center">
<img width="200" src="assets/0_icon.png" alt="SimpleTextReader Logo" />
<br/>
<h1>SimpleTextReader - 易笺</h1>
</div>

<div align="center">
<br/>
<a href="README.md">中文</a> | English
<br/><br/>
</div>

![Main UI](assets/4_bookshelf1.png)

SimpleTextReader is the online text reader that simulates the result of SimpleEpub2, providing a web-based reading experience.

Official site: [https://reader.yijian.app](https://reader.yijian.app)

Big thanks to [Manjusaka](https://github.com/Zheaoli) for his amazing help and hosting 易笺! Really appreciate it!

## Highlights

1. Open large text files in a split second; automatic detection of text encoding

2. Auto detection of file name:

    `《书名》作者：作者名.txt`

    `书名.[作者].txt`

    `Bookname by author.txt`

3. Auto detection of chapter titles using Regular Expressions

4. Auto styling of footnotes

5. UI language depends on the text file opened in SimpleTextReader (English vs. Chinese)

6. Auto detection and removal of text ads in the file

7. Auto generation of book seal stamps for fun

8. Auto save reading process

9. Auto generation of book cover arts in the bookshelf

10. Modern-looking UI design

## Usage

Firefox:

1. [Regular (v1.6.1)](https://addons.mozilla.org/en-US/firefox/addon/yijian/)

2. [No-UI (v1.2.9.2)](https://addons.mozilla.org/en-US/firefox/addon/yijian_nogui/)

Chrome:

1. [Regular (v1.6.1)](https://chrome.google.com/webstore/detail/%E6%98%93%E7%AC%BA/dbanahlbopbjpgdkecmclbbonhpohcaf)

2. [No-UI (v1.2.9.2)](https://chrome.google.com/webstore/detail/%E6%98%93%E7%AC%BA%EF%BC%88%E6%97%A0%E7%95%8C%E9%9D%A2%E7%89%88%EF%BC%89/mifnkjlmnnaamfgmhmjdjiplaaladjlo)

Edge:

1. [Regular (v1.6.1)](https://microsoftedge.microsoft.com/addons/detail/pabihehbdhldbdliffaddllmjlknmpak)

2. [No-UI (v1.2.9.2)](https://microsoftedge.microsoft.com/addons/detail/mdjajbjcppnghhcajjodfcbhebnifcnm)

Docker:

```bash
docker run -d --name simpletextreader \
  -p 8866:8866 \
  --restart unless-stopped \
  henryxrl/simpletextreader:latest
```

## Important Updates

### v1.6

1. Complete code rewritting to improve overall performance and maintainability.

2. Significant Performance Improvements

    [1] Large files now open significantly faster, with near-instant response times (less than 1 second).

    [2] Previously processed files can be reopened without processing, further reducing loading time.

    [3] Interface operations are smooth and free from lag.

3. New pagination logic.

4. "Finishing up" reading progress indicator.

5. Optimized book cover generation.

6. Smoother UI language switching.

7. Updated default font to "Kinghwa Old Song" to avoid potential copyright issues.

8. Resolved various minor bugs, enhancing stability and user experience.

### v1.5

1. Support customizing fonts for book title and body.

2. Removed the character limitation for detecting chapter titles.

3. Better Regex for English chapter titles.

4. Optimized the table of contents section.

5. Rewrite pagination logic. To disable it, add `?no-pagebreak-on-title` option at the end of the URL.

6. Edge extension

### v1.4

1. Enable local bookshelf. Special thanks to [cataerogong](https://github.com/cataerogong) for their coding support and contributions!

    [1] Now you can easily add multiple text files to the bookshelf by selecting or drag-and-dropping;

    [2] Auto generation of book cover arts based on the user's chosen colors;

    [3] Books are sorted as the following:

    ```text
        a. In-progress books: sorted by last opened time;

        b. Unread books: sort by file names;

        c. Finished books: sort by last opened time.
    ```

    [4] Show reading progress and other detailed information for each book; add special stylings of book covers for both unread books and finished books;

    <img src="assets/4_new_cover_en.gif" alt="Darkmode" height="200" />

    [5] The height of the bookshelf automatically adjusts according to the number of books;

    [6] In reading mode, click on the bookshelf icon in the bottom-right corner (or press the `Esc` key) to return to the bookshelf.

    [7] To disable the bookshelf, add `?no-bookshelf` option at the end of the URL.

2. Improve the user interface language setting, which now automatically adapts to the browser's language preferences. If your browser languages include Chinese, the UI language will be set to Chinese; otherwise, it will default to English.

    [1] When reading, the UI language is set to match the language of the book for better reading experience.

3. Optimized for ultrawide monitors.

4. Other stability bug fixes.

**_NOTE: The bookshelf feature is incompatible with browsers' private/incognito mode and will be automatically deactivated._**

<div float="left">
    <img src="assets/4_bookshelf1.png" width="49%" alt="Bookshelf1"/>
    <img src="assets/4_bookshelf2.png" width="49%" alt="Bookshelf2"/>
    <img src="assets/4_bookshelf3.png" width="49%" alt="Bookshelf3"/>
    <img src="assets/4_bookshelf4_en.png" width="49%" alt="Bookshelf4"/>
</div>

### v1.3

Support for customized settings such as font size, line height, theme colors and much more.

<div float="left">
    <img src="assets/3_settings5.png" width="31%" alt="Settings1" />
    <img src="assets/3_settings4.png" width="34%" alt="Settings2" />
    <img src="assets/3_settings6.png" width="31%" alt="Settings3" />
</div>

To disable the settings menu, add `?no-settings` option at the end of the URL.

### v1.2

Enable dark mode.

![Darkmode](assets/2_darkmode.png)

### v1.1

Now SimpleTextReader can be installed as a PWA in supported browsers (Chromium-based browsers such as Chrome and Edge).

### v1.0

Now SimpleTextReader is also available as a Chrome/Firefox extension with two distinct versions:

1. Regular version: Upon clicking the icon from the extension list, the full UI appears, providing the same functionality as the complete SimpleTextReader web app.

2. No-UI version: Once activated, <s>any URL ending in ".txt" (including local text files that were dragged and dropped in the browser, `file://*.txt`) will be automatically opened using SimpleTextReader.</s> However, please be aware that this version might have slower performance when opening large text files. The delay is due to the browser's default behavior of loading the entire file at once, which cannot be modified.

    **NOTE: Starting from v1.2.6, No-UI version only opens local txt files, i.e., `file://*.txt`.**

---

### This project is only for personal use and for learning purpose, not for commercial use
