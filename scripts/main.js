/**
 * @fileoverview Main application entry point
 * Initializes UI and sets up event listeners for file handling and user interactions
 *
 * @module main
 * @requires config/index
 * @requires modules/features/bookshelf
 * @requires modules/features/fontpool
 * @requires modules/features/settings
 * @requires modules/features/reader
 * @requires modules/components/popup-manager
 * @requires utils/base
 * @requires utils/helpers-reader
 * @requires utils/helpers-file
 * @requires utils/helpers-ui
 */

import * as CONFIG from "./config/index.js";
import { initBookshelf, forceRecalculateFilterBar } from "./modules/features/bookshelf.js";
import { initFontpool } from "./modules/features/fontpool.js";
import { initSettings } from "./modules/features/settings.js";
import { reader } from "./modules/features/reader.js";
import { PopupManager } from "./modules/components/popup-manager.js";
import { isVariableDefined, removeHashbang, isEllipsisActive, fetchVersionData } from "./utils/base.js";
import {
    setTitle,
    getHistoryAndSetChapterTitleActive,
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
    resetDropZoneState,
    hideContent,
    showLoadingScreen,
    resetUI,
} from "./utils/helpers-ui.js";

/**
 * Log the app language, respect user language setting, and extension mode
 */
console.log(
    `App language is "${CONFIG.RUNTIME_VARS.WEB_LANG}". Respect user language setting is ${CONFIG.RUNTIME_VARS.RESPECT_USER_LANG_SETTING}.`
);
setTitle();
setMainContentUI();
const openedAsNoUI = document.documentElement.getAttribute("openedAsNoUI") === "true";
if (openedAsNoUI) {
    showLoadingScreen();
}
await initFontpool();
await initSettings();
await initBookshelf(!openedAsNoUI);

/*
 * Show changelog popup
 */
const versionData = await fetchVersionData();
CONFIG.RUNTIME_VARS.APP_VERSION = versionData.version;
if (versionData) {
    PopupManager.showChangelogPopup({
        version: versionData.version,
        changelog: versionData.changelog,
        previousVersions: 2,
        forceShow: false,
    });
}

/**
 * Set up event listeners for drag and drop functionality
 */
const dropzone = CONFIG.DOM_ELEMENT.DROPZONE;
if (isVariableDefined(dropzone)) {
    dropzone.addEventListener("dblclick", openFileSelector, false);
    dropzone.addEventListener("dragenter", allowDrag);
    dropzone.addEventListener("dragenter", handleDragEnter, false);
    dropzone.addEventListener("dragover", allowDrag);
    dropzone.addEventListener("dragover", handleDragOver, false);
    dropzone.addEventListener("drop", handleDrop, false);
    dropzone.addEventListener("dragleave", (event) => {
        // Check if the mouse truly left the dropzone
        if (!dropzone.contains(event.relatedTarget)) {
            handleDragLeave(event);
        }
    });
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
let resizeTimeout;
window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        const isIncreasing = window.innerWidth >= CONFIG.RUNTIME_VARS.STORE_PREV_WINDOW_WIDTH;
        CONFIG.RUNTIME_VARS.STORE_PREV_WINDOW_WIDTH = window.innerWidth;
        updateTOCUI(isIncreasing);

        requestAnimationFrame(() => {
            forceRecalculateFilterBar();
        });
    }, 100);
});

/**
 * Handle drag enter events on window
 */
window.addEventListener("dragenter", (event) => {
    // getHistoryAndSetChapterTitleActive(reader.gotoLine.bind(reader), false);
    CONFIG.VARS.INIT = true;
    event.preventDefault();
    showDropZone(true, !(CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.innerHTML === ""));
    hideContent();
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
 * Prevent dragging of selected text and non-draggable elements
 */
document.addEventListener("dragstart", (event) => {
    // Check if the user is dragging selected text
    if (window.getSelection().toString()) {
        event.preventDefault();
    }

    // Ensure event.target is an Element before checking attributes
    if (event.target instanceof Element) {
        const isDraggable = event.target.hasAttribute("draggable") && event.target.getAttribute("draggable") === "true";
        if (!isDraggable) {
            event.preventDefault();
        }
    } else {
        event.preventDefault(); // Prevent dragging for non-Element targets
    }
});

/**
 * Handle keyboard navigation
 */
document.onkeydown = async (event) => {
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
            await resetUI();
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
    allActiveTitles.forEach((title) => {
        const curTitleID = title.id.split("_").pop();
        showOriginalTitle(curTitleID);
    });
});

tocContent.addEventListener("mouseleave", () => {
    CONFIG.VARS.IS_MOUSE_INSIDE_TOC_CONTENT = false;
    const allActiveTitles = CONFIG.DOM_ELEMENT.TOC_CONTAINER.querySelectorAll(".chapter-title-container.toc-active");
    allActiveTitles.forEach((title) => {
        const curTitleID = title.id.split("_").pop();
        showShortenedTitle(curTitleID, 2000);
    });
});

/**
 * Handle file object from extension
 * Listen for the file details sent by the extension's background script
 */
const api = typeof chrome !== "undefined" ? chrome : typeof browser !== "undefined" ? browser : null;
if (api?.runtime?.onMessage) {
    api.runtime.onMessage.addListener((message, sender, sendResponse) => {
        // Use Promise to handle asynchronous operations
        handleExtensionMessage(message)
            .then((result) => {
                // console.log("Message handled successfully:", result);
                sendResponse({ success: true });
            })
            .catch((error) => {
                console.error("Error handling message:", error);
                sendResponse({ success: false, error: error.message });
            });

        return true; // Keep the message channel open for asynchronous responses
    });
}

/**
 * Opens a file selector dialog for choosing text files
 * @param {Event} event - The triggering event
 */
function openFileSelector(event) {
    event.preventDefault();
    const fileSelector = document.createElement("input");
    fileSelector.type = "file";
    fileSelector.accept = CONFIG.CONST_FILE.SUPPORTED_FONT_EXT.concat(CONFIG.CONST_FILE.SUPPORTED_EXT).join(",");
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
    event.preventDefault();
    showDropZone(true, !(CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.innerHTML === ""));
    hideContent();
}

/**
 * Handles drag over events on the dropzone
 * @param {DragEvent} event - The drag over event
 */
function handleDragOver(event) {
    event.preventDefault();
    showDropZone(true, !(CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.innerHTML === ""));
    hideContent();
}

/**
 * Handles drag leave events on the dropzone
 * Manages visibility of dropzone and content based on drag state
 * @param {DragEvent} event - The drag leave event
 */
function handleDragLeave(event) {
    event.preventDefault();
    resetDropZoneState();
}

/**
 * Handles file drop events
 * Processes dropped files and updates UI accordingly
 * @param {DragEvent} event - The drop event
 */
async function handleDrop(event) {
    event.preventDefault();
    await handleMultipleFiles(event.dataTransfer.files);
}

/**
 * Handles messages from the extension
 * @param {Object} message - The message from the extension
 */
async function handleExtensionMessage(message) {
    if (message.action === "loadFile") {
        try {
            showLoadingScreen();

            // Decode the Base64 content back to binary
            const base64ToArrayBuffer = (base64) => {
                const binaryString = atob(base64);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                return bytes.buffer;
            };
            const arrayBuffer = base64ToArrayBuffer(message.fileContent);

            // Create a File object from the ArrayBuffer
            const fileObject = new File([arrayBuffer], message.fileName, {
                type: message.fileType,
            });

            // Call existing `handleMultipleFiles` function
            if (typeof handleMultipleFiles === "function") {
                await handleMultipleFiles([fileObject]);
            } else {
                console.error("handleMultipleFiles function is not defined.");
            }
        } catch (error) {
            console.error("Error loading the file into the page:", error);
        }
    }
}
