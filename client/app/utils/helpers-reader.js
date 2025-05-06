/**
 * @fileoverview Reader helper functions for managing reading progress and navigation
 *
 * This module provides utility functions for:
 * - Table of Contents (TOC) navigation and display
 * - Page navigation and scrolling
 * - Reading progress tracking
 * - Content pagination and page breaks
 * - History management in localStorage
 * - Title display and formatting
 *
 * @module client/app/utils/helpers-reader
 * @requires client/app/config/index
 * @requires client/app/utils/base
 */

import * as CONFIG from "../config/index.js";
import { isInViewport, isInContainerViewport, getScrollY } from "./base.js";

/**
 * Global variables for managing title display and keyboard events
 * @type {Function|null} func_keydown_ - Store original page onkeydown function for temporary disabling
 * @type {number|null} timeoutID - Timeout ID for showing shortened title
 * @type {number|null} currentTitleID - Tracks the titleID associated with the active timer
 */
let func_keydown_ = document.onkeydown;
let timeoutID = null;
let currentTitleID = null;

/**
 * Sets the document title.
 * @public
 * @param {string} [title=""] - The title to set for the document.
 */
export function setTitle(title = "") {
    document.title = title || CONFIG.RUNTIME_VARS.STYLE.ui_title || CONFIG.RUNTIME_VARS.STYLE.ui_title_zh;
}

/**
 * Sets the reading progress text for a specific file.
 * @private
 * @param {string} filename - The name of the file for which to set the progress.
 * @param {string} progressText - The progress text to store.
 */
function setProgressText(filename, progressText) {
    const storageKey = `${filename}_progressText`;
    localStorage.setItem(storageKey, progressText);
}

/**
 * Retrieves the reading progress text for a specific file.
 * @public
 * @param {string} filename - The name of the file for which to retrieve the progress.
 * @param {boolean} [consoleLog=true] - Whether to log the progress to the console.
 * @returns {string} The progress text for the specified file, or an empty string if not found.
 */
export function getProgressText(filename, consoleLog = true) {
    const storageKey = `${filename}_progressText`;
    const progressText = localStorage.getItem(storageKey);

    if (progressText) {
        consoleLog && console.log(`Progress of "${filename}" found! Progress: ${progressText}`);
        return progressText;
    }

    return "";
}

/**
 * Sets the book finished status for a specific file.
 * @private
 * @param {string} filename - The name of the file for which to set the finished status.
 * @param {boolean} isFinished - The finished status to store.
 */
function setIsBookFinished(filename, isFinished) {
    const storageKey = `${filename}_isFinished`;
    localStorage.setItem(storageKey, isFinished);
}

/**
 * Retrieves the book finished status for a specific file.
 * @public
 * @param {string} filename - The name of the file for which to retrieve the finished status.
 * @returns {boolean} The finished status for the specified file, or false if not found.
 */
export function getIsBookFinished(filename) {
    const storageKey = `${filename}_isFinished`;
    const isFinished = localStorage.getItem(storageKey);

    if (isFinished) {
        return isFinished === "true";
    }

    return false;
}

/**
 * Updates scroll positions and handles various UI updates based on current scroll position
 * - Updates reading history if toSetHistory is true
 * - Updates active title in TOC based on current viewport
 * - Calculates and updates reading progress percentage
 * - Updates progress text in UI and localStorage
 * @public
 * @param {boolean} toSetHistory - Whether to update reading history in localStorage
 * @returns {void}
 */
export function GetScrollPositions(toSetHistory = true, gotoPageClicked = false) {
    // console.log(
    //     `GetScrollPositions() called, gotoTitle_Clicked: ${CONFIG.VARS.GOTO_TITLE_CLICKED}; gotoPage_Clicked: ${gotoPageClicked}`
    // );

    // Get current scroll position
    // // const scrollTop = window.scrollY || document.documentElement.scrollTop;
    // const scrollTop = getScrollY();
    // console.log(`Top: ${scrollTop}px`);

    // Get the line number on top of the viewport
    const curLineNumber = getTopLineNumber();
    // console.log("Current line: ", curLineNumber);

    // If the last line is visible, set the last title as active
    const isLastLineVisible = isInViewport(CONFIG.DOM_ELEMENT.GET_LINE(CONFIG.VARS.FILE_CONTENT_CHUNKS.length - 1));

    if (!CONFIG.VARS.GOTO_TITLE_CLICKED || gotoPageClicked) {
        // Remember the line number in history
        if (toSetHistory) {
            setHistory(CONFIG.VARS.FILENAME, curLineNumber);
        }

        if (!isLastLineVisible) {
            // Get the title the detectected line belongs to
            let curTitleID = 0;
            for (let i = 0; i < CONFIG.VARS.ALL_TITLES.length; i++) {
                if (i < CONFIG.VARS.ALL_TITLES.length - 1) {
                    if (
                        curLineNumber >= CONFIG.VARS.ALL_TITLES[i][1] &&
                        curLineNumber < CONFIG.VARS.ALL_TITLES[i + 1][1]
                    ) {
                        // console.log("Current title: ", CONFIG.VARS.ALL_TITLES[i][0]);
                        curTitleID = CONFIG.VARS.ALL_TITLES[i][1];
                        break;
                    }
                } else {
                    if (
                        curLineNumber >= CONFIG.VARS.ALL_TITLES[i][1] &&
                        curLineNumber < CONFIG.VARS.FILE_CONTENT_CHUNKS.length
                    ) {
                        // console.log("Current title: ", CONFIG.VARS.ALL_TITLES[i][0]);
                        curTitleID = CONFIG.VARS.ALL_TITLES[i][1];
                        break;
                    }
                }
            }
            // console.log("Current title ID: ", curTitleID);

            // Set the current title in the TOC as active
            setChapterTitleActive(curTitleID);
        } else {
            setChapterTitleActive(CONFIG.VARS.FILE_CONTENT_CHUNKS.length - 1);

            // If the last line is visible, set the reading history to the last line
            setHistory(CONFIG.VARS.FILENAME, CONFIG.VARS.FILE_CONTENT_CHUNKS.length - 1);
        }
    }

    // Calculate reading progress percentage
    let totalPercentage = calculateReadingProgress(curLineNumber);

    CONFIG.DOM_ELEMENT.PROGRESS_TITLE.innerText = CONFIG.VARS.BOOK_AND_AUTHOR.bookName;
    CONFIG.DOM_ELEMENT.PROGRESS_CONTENT.innerText = `${totalPercentage.toFixed(1).replace(".0", "")}%`;
    setProgressText(CONFIG.VARS.FILENAME, `${totalPercentage.toFixed(1).replace(".0", "")}%`);
    setIsBookFinished(CONFIG.VARS.FILENAME, isLastLineVisible);

    CONFIG.VARS.GOTO_TITLE_CLICKED = false;
}

/**
 * Calculates reading progress percentage based on current line number
 * @private
 * @param {number} curLineNumber - The current line number
 * @returns {number} The reading progress percentage
 */
function calculateReadingProgress(curLineNumber) {
    // Get the current page's start and end positions from break points
    const breakPoints = CONFIG.VARS.PAGE_BREAKS;
    const currentPage = CONFIG.VARS.CURRENT_PAGE;
    const contentLength = CONFIG.VARS.FILE_CONTENT_CHUNKS.length;

    // Get the current page's start and end positions from break points
    const currentPageStart = breakPoints[currentPage - 1] || 0;
    const currentPageEnd = breakPoints[currentPage] || contentLength;

    // Calculate current page's content length
    const curPageLength = currentPageEnd - currentPageStart;

    // Calculate position within current page (add 1 to match original logic)
    const curPositionInPage = curLineNumber + 1 - currentPageStart;
    const curPagePercentage = curPositionInPage / (curPageLength - getBottomLineNumber() + curLineNumber);

    // Calculate scale for current page relative to total content
    const scalePercentage = curPageLength / contentLength;

    // Calculate percentage from previous pages
    const pastPagesLength = currentPageStart;
    const pastPagePercentage = pastPagesLength / contentLength;

    // Calculate total percentage
    let totalPercentage = (curPagePercentage * scalePercentage + pastPagePercentage) * 100;

    // Handle start of document
    if (curLineNumber === 0 && currentPage === 1 && getScrollY() <= 5) {
        totalPercentage = 0;
    }

    return totalPercentage;
}

/**
 * Shows the original title in TOC by removing shortened version
 * @public
 * @param {number} titleID - The line number of the title to show the original title for
 */
export function showOriginalTitle(titleID) {
    // Clear any existing timeout to stop the shortened title timer
    clearTimeout(timeoutID);
    timeoutID = null; // Ensure timeoutId is reset after clearing

    const original = CONFIG.DOM_ELEMENT.GET_TITLE(titleID)?.querySelector(".title-original");
    const shortened = CONFIG.DOM_ELEMENT.GET_TITLE(titleID)?.querySelector(".title-shortened");

    // Check if the original and shortened titles are the same
    if (original?.textContent.trim() === shortened?.textContent.trim()) {
        return; // Exit if they are the same, no need to switch
    }

    // Use direct DOM manipulation to avoid race condition
    CONFIG.DOM_ELEMENT.GET_TITLE(titleID)?.querySelector(".title-shortened")?.classList.add("hidden"); // Hide shortened
    CONFIG.DOM_ELEMENT.GET_TITLE(titleID)?.querySelector(".title-original")?.classList.remove("hidden"); // Show original
}

/**
 * Shows the shortened title in TOC after a delay
 * @public
 * @param {number} titleID - The line number of the title to show the shortened title for
 * @param {number} delay - Delay in milliseconds before showing shortened title
 */
export function showShortenedTitle(titleID, delay = 2000) {
    const original = CONFIG.DOM_ELEMENT.GET_TITLE(titleID)?.querySelector(".title-original");
    const shortened = CONFIG.DOM_ELEMENT.GET_TITLE(titleID)?.querySelector(".title-shortened");

    // Check if the original and shortened titles are the same
    if (original?.textContent.trim() === shortened?.textContent.trim()) {
        return; // Exit if they are the same, no need to switch
    }

    // If a new titleID is provided, reset the timeout
    if (titleID !== currentTitleID) {
        // console.log(`New titleID detected. Switching to: ${titleID}`);
        currentTitleID = titleID;

        // Clear the existing timeout for the previous titleID
        clearTimeout(timeoutID);
        timeoutID = null;
    }

    // Start a new timer for the current titleID
    if (!timeoutID) {
        timeoutID = setTimeout(() => {
            // Ensure the currentTitleID is still valid (user might have switched titles again)
            if (currentTitleID === titleID) {
                // Show the shortened title
                CONFIG.DOM_ELEMENT.GET_TITLE(titleID)?.querySelector(".title-original")?.classList.add("hidden"); // Hide original
                CONFIG.DOM_ELEMENT.GET_TITLE(titleID)?.querySelector(".title-shortened")?.classList.remove("hidden"); // Show shortened

                // console.log(`Show shortened title for titleID: ${titleID}`);
            }

            // Reset the timeout and currentTitleID after execution
            timeoutID = null;
        }, delay);
    }
}

/**
 * Sets the active chapter title in TOC based on current scroll position
 * @public
 * @async
 * @param {number} titleID - The line number of the title to activate
 * @returns {Promise<void>}
 */
export async function setChapterTitleActive(titleID) {
    // Set the selected title in the TOC as active
    const selectedTitle = CONFIG.DOM_ELEMENT.GET_TITLE(titleID);
    if (selectedTitle) {
        // The title already exists, no need to wait for ToC rendering
        // console.log("Selected title is already available:", selectedTitle);

        // Perform actions directly
        handleTitleActive(titleID);
        return;
    }

    // If the title is not found, trigger ToC rendering and wait for it
    // console.log(`Title ${titleID} not found. Rendering ToC...`);

    // Let TOC render
    // Calculate where the current title should be in the TOC
    // const titlePercentage = getPercentageOfTitleInAllTitles(titleID);
    const titlePercentage = (CONFIG.VARS.ALL_TITLES_IND[titleID] / CONFIG.VARS.ALL_TITLES.length) * 100;
    const scrollHeight = parseFloat(CONFIG.DOM_ELEMENT.TOC_SCROLLER.style.height);
    CONFIG.DOM_ELEMENT.TOC_LIST.scrollTo(
        0,
        (scrollHeight * titlePercentage) / 100 - CONFIG.DOM_ELEMENT.TOC_CONTAINER.clientHeight / 2,
        { behavior: "instant" }
    );

    const e = await waitForTocRendered();
    // console.log("ToC Rendered Event Triggered:", e.detail);

    // Check again for the title after rendering
    const renderedTitle = CONFIG.DOM_ELEMENT.GET_TITLE(titleID);
    if (renderedTitle) {
        // console.log("Selected title found after rendering:", renderedTitle);

        // Perform actions
        handleTitleActive(titleID);
    } else {
        // console.error("Title not found even after ToC rendering:", titleID);
    }
}

/**
 * Handles the active title in TOC
 * @private
 * @param {number} titleID - The line number of the title to activate
 * @returns {Promise<void>}
 */
function handleTitleActive(titleID) {
    try {
        // Remove all active titles
        let allActiveTitles = CONFIG.DOM_ELEMENT.TOC_CONTAINER.querySelectorAll(".chapter-title-container.toc-active");
        // console.log("All active titles: ", allActiveTitles);
        allActiveTitles.forEach((title) => {
            if (title && title.id.split("_").pop() != titleID) {
                title.classList.remove("toc-active");
                Array.from(title.children).forEach((child) => {
                    if (child.classList) {
                        child.classList.remove("toc-active");
                    }
                });
                const curTitleID = title.id.split("_").pop();
                showOriginalTitle(curTitleID);
            }
        });

        CONFIG.VARS.ACTIVE_TITLE = titleID;
        const selectedTitle = CONFIG.DOM_ELEMENT.GET_TITLE(titleID);
        if (
            selectedTitle &&
            selectedTitle.id.split("_").pop() == titleID &&
            !selectedTitle.classList.contains("toc-active")
        ) {
            selectedTitle.classList.add("toc-active");
            Array.from(selectedTitle.children).forEach((child) => {
                if (child.classList) {
                    child.classList.add("toc-active");
                }
            });
        }
        // Move the selected title to the center of the TOC
        if (
            !isInContainerViewport(
                CONFIG.DOM_ELEMENT.TOC_CONTAINER,
                selectedTitle,
                CONFIG.DOM_ELEMENT.TOC_CONTAINER.clientHeight / 10
            )
        ) {
            // CONFIG.DOM_ELEMENT.TOC_CONTAINER.scrollTo(
            CONFIG.DOM_ELEMENT.TOC_LIST.scrollTo(
                0,
                selectedTitle.offsetTop - CONFIG.DOM_ELEMENT.TOC_CONTAINER.clientHeight / 2,
                { behavior: "smooth" }
            );
        }
        // Set the selected title's :target:before css style
        const selectedLine = CONFIG.DOM_ELEMENT.GET_LINE(titleID);
        if (selectedLine && selectedLine.tagName[0] === "H") {
            // CONFIG.RUNTIME_VARS.STYLE.ui_anchorTargetBefore = eval(`CONFIG.RUNTIME_VARS.STYLE.h${selectedLine.tagName[1]}_margin`);
            const headerMargins = {
                1: CONFIG.RUNTIME_VARS.STYLE.h1_margin,
                2: CONFIG.RUNTIME_VARS.STYLE.h2_margin,
                3: CONFIG.RUNTIME_VARS.STYLE.h3_margin,
                4: CONFIG.RUNTIME_VARS.STYLE.h4_margin,
                5: CONFIG.RUNTIME_VARS.STYLE.h5_margin,
                6: CONFIG.RUNTIME_VARS.STYLE.h6_margin,
            };
            CONFIG.RUNTIME_VARS.STYLE.ui_anchorTargetBefore =
                headerMargins[selectedLine.tagName[1]] || CONFIG.RUNTIME_VARS.STYLE.h2_margin;
        }
        // console.log("1-Show shortened title: ", selectedTitle.id);
        // console.log("is mouse inside toc content: ", CONFIG.VARS.IS_MOUSE_INSIDE_TOC_CONTENT);
        if (!CONFIG.VARS.IS_MOUSE_INSIDE_TOC_CONTENT) {
            const curTitleID = selectedTitle.id.split("_").pop();
            showShortenedTitle(curTitleID, 2000);
        }
    } catch (error) {
        console.log(`Error: No title with ID ${titleID} found.`);
    }
}

/**
 * Gets the percentage of a title in all titles
 * @private
 * @param {number} target - The line number of the title to get the percentage for
 * @returns {number} The percentage of the title in all titles
 * @note O(log n) time complexity - Binary search. Use CONFIG.VARS.ALL_TITLES_IND for O(1) access.
 * @deprecated
 */
function getPercentageOfTitleInAllTitles(target) {
    const data = CONFIG.VARS.ALL_TITLES;
    let left = 0;
    let right = data.length - 1;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);

        if (data[mid][1] === target) {
            return (mid / data.length) * 100; // Found the target
        } else if (data[mid][1] < target) {
            left = mid + 1; // Search in the right half
        } else {
            right = mid - 1; // Search in the left half
        }
    }

    return -1; // Target not found
}

/**
 * Waits for the TOC to be rendered
 * @private
 * @async
 * @returns {Promise<void>}
 */
async function waitForTocRendered() {
    return new Promise((resolve) => {
        // Use once:true to ensure the listener is triggered only once
        document.addEventListener(
            "tocRendered",
            (e) => {
                resolve(e); // Resolve the promise when the event is dispatched
            },
            { once: true } // Automatically removes the listener after execution
        );
    });
}

/**
 * Gets the line number of the first visible element in viewport
 * @public
 * @returns {number} The line number, or 0 if none found
 */
export function getTopLineNumber() {
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const rectCache = new Map();

    for (const child of CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.children) {
        let rect = rectCache.get(child);
        if (!rect) {
            rect = child.getBoundingClientRect();
            rectCache.set(child, rect);
        }

        if (rect.bottom >= 0 && rect.top <= viewportHeight) {
            return parseInt(child.id.replace("line", ""));
        }
    }
    return 0; // Default to 0 if no line is in the viewport
}

/**
 * Gets the line number of the last visible element in viewport
 * @public
 * @returns {number} The line number, or 0 if none found
 */
export function getBottomLineNumber() {
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const rectCache = new Map();
    const children = CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.children;

    for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i];
        let rect = rectCache.get(child);
        if (!rect) {
            rect = child.getBoundingClientRect();
            rectCache.set(child, rect);
        }

        if (rect.bottom >= 0 && rect.top <= viewportHeight) {
            return parseInt(child.id.replace("line", ""));
        }
    }
    return 0; // Default to 0 if no line is in the viewport
}

/**
 * Freezes content scrolling and keyboard events
 * @public
 */
export function freezeContent() {
    document.onkeydown = null;
    $("body").css("overflow-y", "hidden");
}

/**
 * Unfreezes content scrolling and restores keyboard events
 * @public
 */
export function unfreezeContent() {
    document.onkeydown = func_keydown_;
    $("body").css("overflow-y", "auto");
}

/**
 * Saves reading progress to localStorage
 * @public
 * @param {string} filename - The name of the current file
 * @param {number} lineNumber - The current line number
 */
export function setHistory(filename, lineNumber) {
    // console.log("History set to line: ", lineNumber);
    localStorage.setItem(filename, lineNumber);
    if (lineNumber === 0) {
        // Don't save history if line number is 0
        localStorage.removeItem(filename);
    }
}

/**
 * Retrieves reading progress from localStorage
 * @public
 * @async
 * @param {string} filename - The name of the file for which to get history
 * @param {Function} gotoLineFunc - Async function to go to a line
 * @param {boolean} consoleLog - Whether to log retrieval to console
 * @returns {number} The saved line number, or 0 if none found
 */
export async function getHistory(filename, gotoLineFunc = null, consoleLog = false) {
    let tempLine = localStorage.getItem(filename);
    if (tempLine) {
        try {
            tempLine = parseInt(tempLine) || 0;

            if (consoleLog) {
                console.log(`History of "${filename}" found! Line: ${tempLine}`);
            }

            // If gotoLineFunc is provided, try to go to the line
            if (gotoLineFunc && typeof gotoLineFunc === "function") {
                try {
                    let success = await gotoLineFunc(tempLine, false);
                    if (success === -1) {
                        tempLine = 0;
                    }
                } catch (funcError) {
                    console.log("Error executing gotoLineFunc:", funcError);
                }
            }

            return tempLine;
        } catch (error) {
            return 0;
        }
    }
    return 0;
}

/**
 * Clears all reading history from localStorage
 * @public
 */
export function removeAllHistory() {
    localStorage.clear();
}

/**
 * Removes all localStorage items related to a specific book
 * @public
 * @param {string} filename - The filename/key of the book to remove history for
 */
export function removeHistory(filename) {
    // Remove reading progress
    localStorage.removeItem(filename);

    // Remove all storage items related to this book
    // Book-related items usually have the filename as prefix or suffix
    const keysToRemove = [];

    // Iterate through all localStorage items
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // Check if item is related (contains filename)
        if (key && (key === filename || key.startsWith(`${filename}_`) || key.endsWith(`_${filename}`))) {
            keysToRemove.push(key);
        }
    }

    // Remove all found related items
    console.groupCollapsed("[Remove History]");
    keysToRemove.forEach((key) => {
        console.log(`Removing storage item: ${key}`);
        localStorage.removeItem(key);
    });
    console.log(`Removed ${keysToRemove.length} storage items for book: ${filename}`);
    console.groupEnd();
}

/**
 * Gets reading history and sets the chapter title active in TOC
 * @public
 * @async
 * @param {Function} gotoLineFunc - Async function to go to a line
 * @param {boolean} setActive - Whether to set the chapter title active
 * @param {boolean} consoleLog - Whether to log retrieval to console
 */
export async function getHistoryAndSetChapterTitleActive(gotoLineFunc, setActive = true, consoleLog = true) {
    CONFIG.VARS.HISTORY_LINE_NUMBER = await getHistory(CONFIG.VARS.FILENAME, gotoLineFunc, consoleLog);
    if (setActive && CONFIG.VARS.CURRENT_PAGE === 1 && CONFIG.VARS.HISTORY_LINE_NUMBER === 0 && getScrollY() === 0) {
        // if the first line is a header, it will show up in TOC
        await setChapterTitleActive(CONFIG.VARS.HISTORY_LINE_NUMBER);
    }
}

/**
 * Gets the line number of the current title
 * @public
 * @param {number} lineNumber - The line number to get the current title for
 * @returns {number} The line number of the current title
 */
export function getCurrentTitleLineNumber(lineNumber) {
    const arr = Object.keys(CONFIG.VARS.ALL_TITLES_IND);
    let left = 0,
        right = arr.length - 1;
    let result = -1;

    while (left <= right) {
        let mid = Math.floor((left + right) / 2);
        const numMid = parseInt(arr[mid]);

        if (numMid <= lineNumber) {
            result = numMid;
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    return result;
}
