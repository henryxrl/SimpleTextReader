/**
 * @fileoverview Main application entry point
 * Initializes UI and sets up event listeners for file handling and user interactions
 *
 * @module main
 * @requires config/index
 * @requires modules/ui/bookshelf
 * @requires modules/ui/settings
 * @requires modules/ui/reader
 * @requires utils/base
 * @requires utils/helpers-reader
 * @requires utils/helpers-file
 * @requires utils/helpers-ui
 */

import * as CONFIG from "./config/index.js";
import { initBookshelf } from "./modules/ui/bookshelf.js";
import { initSettings } from "./modules/ui/settings.js";
import { reader } from "./modules/ui/reader.js";
import { isVariableDefined, removeHashbang, isEllipsisActive } from "./utils/base.js";
import {
    setTitle,
    getHistory,
    GetScrollPositions,
    showOriginalTitle,
    showShortenedTitle,
} from "./utils/helpers-reader.js";
import { handleMultipleFiles } from "./utils/helpers-file.js";
import {
    setMainContentUI,
    setUIMode,
    updateTOCUI,
    showDropZone,
    hideDropZone,
    resetUI,
    resetVars,
} from "./utils/helpers-ui.js";

/**
 * Log the app language and respect user language setting
 */
console.log(
    `App language is "${CONFIG.RUNTIME_VARS.WEB_LANG}". Respect user language setting is ${CONFIG.RUNTIME_VARS.RESPECT_USER_LANG_SETTING}.`
);
setTitle();
setMainContentUI();
initBookshelf();
initSettings();

/**
 * Set up event listeners for drag and drop functionality
 */
const dropzone = CONFIG.DOM_ELEMENT.DROPZONE;
if (isVariableDefined(dropzone)) {
    dropzone.addEventListener("dragenter", allowDrag);
    dropzone.addEventListener("dragenter", handleDragEnter, false);
    dropzone.addEventListener("dragover", allowDrag);
    dropzone.addEventListener("dragover", handleDragOver, false);
    dropzone.addEventListener("drop", handleDrop, false);
    dropzone.addEventListener("dragleave", handleDragLeave, false);
    dropzone.addEventListener("dblclick", openFileSelector, false);
}

/**
 * Set up dark mode toggle listener
 */
const darkModeToggle = CONFIG.DOM_ELEMENT.DARK_MODE_TOGGLE;
if (isVariableDefined(darkModeToggle)) {
    darkModeToggle.addEventListener("change", (e) => {
        setUIMode(!e.target.checked);
    });
}

/**
 * Handle window resize events for TOC UI updates
 */
window.addEventListener("resize", () => {
    const isIncreasing = window.innerWidth >= CONFIG.RUNTIME_VARS.STORE_PREV_WINDOW_WIDTH;
    CONFIG.RUNTIME_VARS.STORE_PREV_WINDOW_WIDTH = window.innerWidth;
    updateTOCUI(isIncreasing);
});

/**
 * Handle drag enter events on window
 */
window.addEventListener("dragenter", (event) => {
    CONFIG.VARS.HISTORY_LINE_NUMBER = getHistory(CONFIG.VARS.FILENAME, reader.gotoLine.bind(reader));
    CONFIG.VARS.INIT = true;
    event.preventDefault();
    if (showDropZone(true) === 0) {
        CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.style.display = "none";
    }
});

/**
 * Handle scroll events for reading progress
 */
window.onscroll = (event) => {
    event.preventDefault();
    if (!CONFIG.VARS.INIT) {
        GetScrollPositions();
    }
};

/**
 * Handle keyboard navigation
 */
document.onkeydown = (event) => {
    if (!(isVariableDefined(dropzone) && dropzone.style.visibility === "hidden")) {
        return;
    }

    switch (event.key) {
        case "ArrowLeft":
            if (CONFIG.VARS.CURRENT_PAGE > 1) {
                reader.gotoPage(CONFIG.VARS.CURRENT_PAGE - 1, "bottom");
            }
            break;
        case "ArrowRight":
            if (CONFIG.VARS.CURRENT_PAGE < CONFIG.VARS.TOTAL_PAGES) {
                reader.gotoPage(CONFIG.VARS.CURRENT_PAGE + 1);
            }
            break;
        case "Escape":
            resetUI();
            break;
    }
};

/**
 * Remove hashbang from URL
 */
$(document).ready(() => {
    removeHashbang();
});

/**
 * Handle tooltip display for truncated text
 */
$("body:not(:empty)").on("mouseover", "a", (e) => {
    const target = $(e.target);
    if (isEllipsisActive(target)) {
        target.attr("title", target.text());
    } else {
        target.removeAttr("title");
    }
});

/**
 * Handle TOC hover events for title display
 */
const tocContent = CONFIG.DOM_ELEMENT.TOC_CONTAINER;
tocContent.addEventListener("mouseenter", () => {
    CONFIG.VARS.IS_MOUSE_INSIDE_TOC_CONTENT = true;
    const allActiveTitles = CONFIG.DOM_ELEMENT.TOC_CONTAINER.querySelectorAll(".chapter-title-container.toc-active");
    allActiveTitles.forEach((title) => showOriginalTitle(title));
});

tocContent.addEventListener("mouseleave", () => {
    CONFIG.VARS.IS_MOUSE_INSIDE_TOC_CONTENT = false;
    const allActiveTitles = CONFIG.DOM_ELEMENT.TOC_CONTAINER.querySelectorAll(".chapter-title-container.toc-active");
    allActiveTitles.forEach((title) => showShortenedTitle(title, 2000));
});

/**
 * Opens a file selector dialog for choosing text files
 * @param {Event} event - The triggering event
 */
function openFileSelector(event) {
    event.preventDefault();
    const fileSelector = document.createElement("input");
    fileSelector.type = "file";
    fileSelector.accept = CONFIG.CONST_FILE.SUPPORTED_EXT;
    fileSelector.multiple = true;
    fileSelector.click();
    fileSelector.onchange = async () => await handleMultipleFiles(fileSelector.files);
    fileSelector.remove();
}

/**
 * Allows drag operations by preventing default behavior
 * @param {DragEvent} event - The drag event
 */
function allowDrag(event) {
    event.dataTransfer.dropEffect = "copy";
    event.preventDefault();
}

/**
 * Handles drag enter events on the dropzone
 * @param {DragEvent} event - The drag enter event
 */
function handleDragEnter(event) {
    CONFIG.VARS.DRAG_COUNTER++;
    event.preventDefault();
    showDropZone(true);
    CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.style.display = "none";
}

/**
 * Handles drag over events on the dropzone
 * @param {DragEvent} event - The drag over event
 */
function handleDragOver(event) {
    event.preventDefault();
    showDropZone(true);
    CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.style.display = "none";
}

/**
 * Handles drag leave events on the dropzone
 * Manages visibility of dropzone and content based on drag state
 * @param {DragEvent} event - The drag leave event
 */
function handleDragLeave(event) {
    CONFIG.VARS.DRAG_COUNTER--;
    event.preventDefault();
    if (CONFIG.VARS.DRAG_COUNTER === 0) {
        if (CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.innerHTML === "") {
            showDropZone();
            CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.style.display = "none";
        } else {
            hideDropZone();
            CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.style.display = "block";
            reader.gotoLine(CONFIG.VARS.HISTORY_LINE_NUMBER, false);
            CONFIG.VARS.INIT = false;
        }
    }
}

/**
 * Handles file drop events
 * Processes dropped files and updates UI accordingly
 * @param {DragEvent} event - The drop event
 */
async function handleDrop(event) {
    event.preventDefault();
    hideDropZone();
    CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.style.display = "block";
    resetVars();
    await handleMultipleFiles(event.dataTransfer.files);
}
