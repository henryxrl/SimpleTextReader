/**
 * @fileoverview Main application entry point
 * Initializes UI and sets up event listeners for file handling and user interactions
 *
 * @module client/app/app
 * @requires client/app/config/index
 * @requires shared/core/callback/callback-registry
 * @requires client/app/modules/api/server-connector
 * @requires client/app/modules/features/bookshelf
 * @requires client/app/modules/features/fontpool
 * @requires client/app/modules/features/settings
 * @requires client/app/modules/features/reader
 * @requires client/app/modules/file/file-handler
 * @requires client/app/modules/components/sidebar-splitview
 * @requires client/app/utils/base
 * @requires client/app/utils/helpers-reader
 * @requires client/app/utils/helpers-ui
 */

import * as CONFIG from "./config/index.js";
import { cbReg } from "../../shared/core/callback/callback-registry.js";
import { initServerConnector } from "./modules/api/server-connector.js";
import { initBookshelf } from "./modules/features/bookshelf.js";
import { initFontpool } from "./modules/features/fontpool.js";
import { initSettings } from "./modules/features/settings.js";
import { initReader } from "./modules/features/reader.js";
import { FileHandler } from "./modules/file/file-handler.js";
import { SidebarSplitView } from "./modules/components/sidebar-splitview.js";
import {
    isVariableDefined,
    removeHashbang,
    isEllipsisActive,
    fetchVersionData,
    fetchFontBaselineOffsets,
    debounce,
    requestIdleCallbackPolyfill,
    onReady,
    toBool,
    createStylesheet,
} from "./utils/base.js";
import { setTitle } from "./utils/helpers-reader.js";
import {
    setHelpButton,
    toggleHelpButton,
    setCustomCursor,
    toggleCustomCursor,
    setCustomTooltip,
    initUIMode,
    setUIMode,
    updatePaginationCalculations,
    showDropZone,
    hideDropZone,
    resetDropZoneState,
    hideContent,
    showLoadingScreen,
    hideLoadingScreen,
    resetUI,
    updateVersionData,
    updateGlobalFontBaselineOffsets,
    handleGlobalScrolling,
} from "./utils/helpers-ui.js";

/*
 * Start application initialization
 */
(async function initializeApp() {
    if (window.consoleTime) console.time("[time] App Initialization");

    /**
     * Polyfill for requestIdleCallback because Safari does not support it
     */
    requestIdleCallbackPolyfill();

    /**
     * Fetch version data in the background (non-blocking)
     */
    if (window.consoleTime) console.time("[time][background] Fetch Version Data");
    window.fetchVersionDataPromise = fetchVersionData().then((versionData) => {
        if (window.consoleTime) console.timeEnd("[time][background] Fetch Version Data");
        updateVersionData(versionData);
    });

    /**
     * Fetch font baseline offsets in the background (non-blocking)
     */
    if (window.consoleTime) console.time("[time][background] Fetch Font Baseline Offsets");
    window.fetchFontBaselineOffsetsPromise = fetchFontBaselineOffsets(CONFIG.CONST_FONT.FONT_BASELINE_OFFSET_JSON).then(
        (fontBaselineOffsets) => {
            updateGlobalFontBaselineOffsets(fontBaselineOffsets);
            if (window.consoleTime) console.timeEnd("[time][background] Fetch Font Baseline Offsets");
            return fontBaselineOffsets;
        }
    );

    /**
     * Initialize core UI components after rendering
     */
    console.log(
        `App language is "${CONFIG.RUNTIME_VARS.WEB_LANG}". Respect user language setting is ${CONFIG.RUNTIME_VARS.RESPECT_USER_LANG_SETTING}.`
    );
    if (window.consoleTime) console.time("[time] Initialize Core UI Components");
    updateMetaTags();
    requestIdleCallback(() => {
        setTitle();
        setCustomCursor();
        setCustomTooltip();
        initUIMode();
        displayDarkModeToggleButton();
        setHelpButton();
        setupReaderUISplitView();
    });
    if (window.consoleTime) console.timeEnd("[time] Initialize Core UI Components");

    /**
     * Show loading screen if opened as no UI mode
     */
    if (window.consoleTime) console.time("[time] Check No-UI Mode");
    const openedAsNoUI = document.documentElement.getAttribute("openedAsNoUI") === "true";
    if (openedAsNoUI) {
        showLoadingScreen();
    }
    if (window.consoleTime) console.timeEnd("[time] Check No-UI Mode");

    /**
     * Load fonts in the background
     * This is quite fast since we don't use split fonts.
     */
    if (window.consoleTime) console.time("[time][background] Load Fonts");
    await loadFontsInBackground();
    if (window.consoleTime) console.timeEnd("[time][background] Load Fonts");

    /**
     * Initialize reader, settings, bookshelf and fontpool
     */
    if (window.consoleTime) console.time("[time] Initialize All Modules");

    // Sequential execution of initReader and initSettings
    if (window.consoleTime) console.time("[time][background] Initialize Reader");
    initReader();
    if (window.consoleTime) console.timeEnd("[time][background] Initialize Reader");
    if (window.consoleTime) console.time("[time][background] Initialize Settings");
    initSettings();
    if (window.consoleTime) console.timeEnd("[time][background] Initialize Settings");

    // Parallel execution of initBookshelf & initFontpool
    if (window.consoleTime) console.time("[time][background] Initialize Bookshelf");
    if (window.consoleTime) console.time("[time][background] Initialize Fontpool");
    await Promise.all([
        initBookshelf(!openedAsNoUI).then(() => {
            if (window.consoleTime) console.timeEnd("[time][background] Initialize Bookshelf");
        }),
        initFontpool().then(() => {
            if (window.consoleTime) console.timeEnd("[time][background] Initialize Fontpool");
        }),
    ]);

    if (window.consoleTime) console.timeEnd("[time] Initialize All Modules");

    /**
     * Set up the dropzone text after all modules are initialized
     */
    setupDropzoneText();

    /**
     * Hide loading screen and don't show bookshelf trigger button
     */
    if (!openedAsNoUI) {
        hideLoadingScreen(false);
    }

    if (window.consoleTime) console.timeEnd("[time] App Initialization");
})();

/**
 * Handle DOMContentLoaded tasks
 */
onReady(() => {
    if (window.consoleTime) console.time("[time] DOMContentLoaded Tasks");

    /**
     * Set up event listeners
     */
    if (window.consoleTime) console.time("[time] Setup Event Listeners");
    setupDarkModeToggleListener();
    setupDropzoneListeners();
    setupUIEventListeners();
    if (window.consoleTime) console.timeEnd("[time] Setup Event Listeners");

    /**
     * Remove hashbang from URL
     */
    if (window.consoleTime) console.time("[time] Remove Hashbang");
    removeHashbang();
    //Listen for hash changes and remove the hashbang immediately
    $(window).on("hashchange popstate", removeHashbang);
    if (window.consoleTime) console.timeEnd("[time] Remove Hashbang");

    /**
     * Start cloud library when the DOM is loaded
     * Only if backend server is available
     * No need to await
     */
    if (window.consoleTime) console.time("[time][background] Initialize Server Connector");
    initServerConnector().then(() => {
        if (window.consoleTime) console.timeEnd("[time][background] Initialize Server Connector");
    });

    /**
     * Set up the extension message listener
     */
    if (window.consoleTime) console.time("[time][background] Setup Extension Message Listener");
    setupExtensionMessageListener();
    if (window.consoleTime) console.timeEnd("[time][background] Setup Extension Message Listener");

    if (window.consoleTime) console.timeEnd("[time] DOMContentLoaded Tasks");
});

/**
 * Load fonts in the background
 */
async function loadFontsInBackground() {
    // Define fonts
    window.localFonts = CONFIG.CONST_FONT.APP_FONTS.filter((font) => !font.isSplitFont).map((font) => font.en);
    window.localCSSFonts = CONFIG.CONST_FONT.APP_FONTS.filter((font) => font.isSplitFont).map((font) => font.en);
    window.remoteFonts = CONFIG.CONST_FONT.REMOTE_FONTS.filter((font) => !font.isSplitFont).map((font) => font.en);
    window.remoteCSSFonts = CONFIG.CONST_FONT.REMOTE_FONTS.filter((font) => font.isSplitFont).map((font) => font.en);
    const allSingleFonts = [...window.localFonts, ...window.remoteFonts];
    const allCSSFonts = [...window.localCSSFonts, ...window.remoteCSSFonts];
    const allFonts = [...allSingleFonts, ...allCSSFonts];

    // Global font status tracker
    window.FONT_STATUS = {}; // Stores: { "font-name": "loading" | "loaded" | "failed" }

    // Initialize all fonts as "loading"
    allFonts.forEach((font) => (window.FONT_STATUS[font] = "loading"));

    // Get all split font CSS file paths
    const splitFontCSSFiles = [
        ...window.localCSSFonts.map((font) => `./client/fonts/local-${font}.css`),
        ...window.remoteCSSFonts.map((font) => `./client/fonts/remote-${font}.css`),
    ];

    // Load all fonts in the background
    await Promise.allSettled([
        // Load split font CSS files
        Promise.allSettled(
            splitFontCSSFiles.map(async (href, index) => {
                const font = allCSSFonts[index];
                try {
                    const res = await fetch(href);
                    if (res.ok) {
                        createStylesheet(href);
                        window.FONT_STATUS[font] = "loaded";
                        _finalizeSingleFontLoading(font);
                    } else {
                        window.FONT_STATUS[font] = "failed";
                        console.warn(`[FAILED] "${font}" failed to load`);
                    }
                } catch (e) {
                    window.FONT_STATUS[font] = "failed";
                    console.warn(`[FAILED] "${font}" failed to load`, e);
                }
            })
        ),

        // Load single file fonts
        Promise.allSettled(
            allSingleFonts.map(async (font) => {
                if (window.consoleTime) console.time(`[time][background] Load Font "${font}"`);

                try {
                    await document.fonts.load(`12px ${font}`);
                    window.FONT_STATUS[font] = "loaded";
                    _finalizeSingleFontLoading(font);
                } catch (e) {
                    window.FONT_STATUS[font] = "failed";
                    console.warn(`[FAILED] "${font}" failed to load`, e);
                } finally {
                    if (window.consoleTime) console.timeEnd(`[time][background] Load Font "${font}"`);
                }
            })
        ),
    ]);

    // Now wait for full loading confirmation
    console.log("Final font status:", window.FONT_STATUS);
    requestAnimationFrame(() => {
        cbReg.go("updateAllBookCovers");
    });

    /**
     * Finalizes font loading status and updates the UI accordingly.
     * @param {string} font - The font to finalize.
     */
    function _finalizeSingleFontLoading(font) {
        if (window.FONT_STATUS[font] !== "failed") {
            // Remove loading indicators
            document.querySelectorAll(`option[value="${font}"], li[rel="${font}"]`).forEach((el) => {
                // Reset data-status attributes
                el.setAttribute("data-status", "");
                el.removeAttribute("data-status");
                el.offsetHeight; // Forces reflow (if needed)

                // If it's an <li>, check for .option-actions and remove loading-button
                if (el.matches("li[rel]")) {
                    el.querySelectorAll(".option-actions").forEach((optionAction) => {
                        if (optionAction.querySelector(".option-action.loading-button")) {
                            optionAction.remove();
                        }
                    });
                }
            });

            // Switch to full UI font
            // if (font === "wenkai") {
            //     _switchToFullUIFont();
            // }

            // Trigger custom event
            requestAnimationFrame(() => {
                cbReg.go("updateAllBookCovers");
            });
        }

        // console.log(`"${font}" is fully loaded`);
    }

    /**
     * Switch the UI font from the subset version to the full version dynamically
     */
    function _switchToFullUIFont() {
        console.log("[INFO] Switching UI font to full version...");

        // Firefox-specific fix: Temporarily hide text to prevent multiple flashes
        const isFirefox = navigator.userAgent.includes("Firefox");
        if (isFirefox) {
            document.body.style.visibility = "hidden"; // Hide text to prevent flash
        }

        // Inject new @font-face rule for full UI font
        const newFontFaceRule = `
            @font-face {
                font-family: "ui";
                src: local("霞鹜文楷 屏幕阅读版"), local("霞鹜文楷 GB 屏幕阅读版"), local("LXGW WenKai Screen"),
                    local("LXGW WenKai GB Screen"), url(/client/fonts/LXGWWenKaiScreen.woff2) format("woff2");
                font-display: swap;
            }
        `;
        document.styleSheets[0].insertRule(newFontFaceRule, document.styleSheets[0].cssRules.length);

        // Slight delay to let rendering stabilize before forcing the font switch
        requestAnimationFrame(() => {
            setTimeout(() => {
                document.body.style.fontFamily = "ui"; // Apply full font

                if (isFirefox) {
                    setTimeout(() => {
                        document.body.style.visibility = "visible"; // Restore text
                    }, 50); // Delay un-hiding to ensure stability
                }

                console.log("[INFO] UI font switched successfully.");

                // // Optional: Remove old subset font rule AFTER transition
                // setTimeout(() => {
                //     const existingRules = getStylesheet().cssRules;
                //     for (let i = 0; i < existingRules.length; i++) {
                //         if (existingRules[i].cssText.includes("font-family: ui")) {
                //             console.log("[INFO] Deleting existing subsetted font rule...");
                //             document.styleSheets[0].deleteRule(i);
                //             break;
                //         }
                //     }
                // }, 500); // Ensure a smooth transition before removing the subset font
            }, 50); // Small delay before applying font to prevent flickering
        });
    }
}

/**
 * Handle window resize events for TOC UI updates
 */
window.addEventListener(
    "resize",
    debounce(() => {
        const isIncreasing = window.innerWidth >= CONFIG.RUNTIME_VARS.STORE_PREV_WINDOW_WIDTH;
        CONFIG.RUNTIME_VARS.STORE_PREV_WINDOW_WIDTH = window.innerWidth;
        updatePaginationCalculations(isIncreasing);
        cbReg.go("updateFilterBar");
        cbReg.go("footnotes:hide");
    }, 150)
);

/**
 * Handle drag enter events on window
 */
window.addEventListener("dragenter", (e) => {
    CONFIG.VARS.INIT = true;
    e.preventDefault();
    updateDropzoneVisualState();
});

/**
 * Prevent dragging of selected text and non-draggable elements
 */
document.addEventListener("dragstart", (e) => {
    if (e.target instanceof Element) {
        if (!e.target.hasAttribute("draggable")) {
            e.preventDefault();
        }
    }
});

/**
 * Handle drag enter events on the dropzone
 */
document.addEventListener("dragenter", () => {
    setOverlayActiveState(true);
});

/**
 * Handle tooltip display for truncated text
 */
document.body.addEventListener("mouseover", (e) => {
    const target = e.target.closest("a");
    if (!target) return;

    if (isEllipsisActive(target)) {
        target.setAttribute("data-title", target.textContent);
    } else {
        target.removeAttribute("data-title");
    }
});

/**
 * Handle global scroll events to hide tooltips and footnotes
 */
window.addEventListener(
    "scroll",
    () =>
        handleGlobalScrolling({
            isScrolling: true,
            delay: 150,
            destroy: true,
        }),
    { capture: true }
);

/**
 * Update Open Graph meta tags dynamically
 */
function updateMetaTags() {
    const updateMetaTag = (id, content) => {
        const metaTag = document.getElementById(id);
        if (metaTag) {
            metaTag.setAttribute("content", content);
        }
    };

    const currentUrl = window.location.href;
    updateMetaTag("og-title", CONFIG.RUNTIME_VARS.STYLE.ui_title);
    updateMetaTag("og-description", CONFIG.RUNTIME_VARS.STYLE.ui_description);
    updateMetaTag("og-url", currentUrl);
    updateMetaTag("og-image", new URL("/client/images/icon.png", currentUrl).href);
}

/**
 * Set up the dropzone text
 */
function setupDropzoneText() {
    const dropzoneText = CONFIG.DOM_ELEMENT.DROPZONE_TEXT;
    if (isVariableDefined(dropzoneText)) {
        dropzoneText.classList.remove(
            "dropzone-text-loading-text",
            "dropzone-text-loading-text-1",
            "dropzone-text-loading-text-2",
            "dropzone-text-loading-text-3",
            "dropzone-text-loading-text-4"
        );
        dropzoneText.classList.add("dropzone-text-text");
    }
}

/**
 * Set up event listeners for drag and drop functionality
 */
function setupDropzoneListeners() {
    const dropzone = CONFIG.DOM_ELEMENT.DROPZONE;
    const overlay = CONFIG.DOM_ELEMENT.DROPZONE_OVERLAY;
    if (isVariableDefined(dropzone) && isVariableDefined(overlay)) {
        // Double click to open file selector
        dropzone.addEventListener("dblclick", openFileSelector);

        // Drag and drop events
        overlay.addEventListener("dragenter", handleDragEvent);
        overlay.addEventListener("dragover", handleDragEvent);
        overlay.addEventListener("dragleave", (e) => {
            if (!e.relatedTarget || !overlay.contains(e.relatedTarget)) {
                handleDragLeave(e);
            }
        });
        overlay.addEventListener("drop", handleDrop, true);
    }
}

/**
 * Display the dark mode toggle button
 */
function displayDarkModeToggleButton() {
    const darkModeToggleBtn = CONFIG.DOM_ELEMENT.DARK_MODE_ACTUAL_BUTTON;
    if (isVariableDefined(darkModeToggleBtn)) {
        darkModeToggleBtn.style.visibility = "visible";
    }
}

/**
 * Set up dark mode toggle listener
 */
function setupDarkModeToggleListener() {
    const darkModeToggle = CONFIG.DOM_ELEMENT.DARK_MODE_TOGGLE;
    if (isVariableDefined(darkModeToggle)) {
        darkModeToggle.addEventListener("change", (e) => {
            setUIMode(!e.target.checked);
        });
    }
}

/**
 * Set up the reader UI splitview
 */
function setupReaderUISplitView() {
    const splitView = new SidebarSplitView({
        container: document.querySelector(CONFIG.CONST_UI.SIDEBAR_SPLITVIEW_CONFIG.elements.container),
        divider: document.querySelector(CONFIG.CONST_UI.SIDEBAR_SPLITVIEW_CONFIG.elements.divider),
        dragTooltip: document.querySelector(CONFIG.CONST_UI.SIDEBAR_SPLITVIEW_CONFIG.elements.dragTooltip),
        toggleButton: document.querySelector(CONFIG.CONST_UI.SIDEBAR_SPLITVIEW_CONFIG.elements.toggleButton),
        storageKey: CONFIG.CONST_UI.SIDEBAR_SPLITVIEW_CONFIG.storageKey,
        sidebarStyle: {
            ...CONFIG.CONST_UI.SIDEBAR_SPLITVIEW_CONFIG.sidebarStyle,
            showSidebar: toBool(localStorage.getItem("show_toc"), false) ?? CONFIG.CONST_CONFIG.SHOW_TOC_AREA,
            dividerTitle: CONFIG.RUNTIME_VARS.STYLE.ui_tooltip_divider,
        },
    });

    // Example: Add a callback to the onResize event
    // splitView.onResize((vw) => {
    //     console.log("onResize", vw);
    // });

    // Example: Update the max width of the sidebar based on the window size
    // window.addEventListener("resize", () => {
    //     const isNarrow = window.innerWidth < 1000;
    //     splitView.setMaxWidth(isNarrow ? 30 : 45);
    // });

    cbReg.add("toggleTOCArea", () => {
        splitView.toggleTOCArea(CONFIG.CONST_CONFIG.SHOW_TOC_AREA);
    });

    // Reveal layout once sidebar width is set
    document.querySelector(CONFIG.CONST_UI.SIDEBAR_SPLITVIEW_CONFIG.elements.outer).style.visibility = "visible";
}

/**
 * Set up event listeners for UI events
 */
function setupUIEventListeners() {
    // Handle resetUI event
    cbReg.add("resetUI", async (e) => {
        const { refreshBookshelf, hardRefresh, sortBookshelf, inFileProcessingCallback } = e;
        await resetUI(refreshBookshelf, hardRefresh, sortBookshelf, inFileProcessingCallback);
    });

    // Handle toggle help button event
    cbReg.add("toggleHelpBtn", () => {
        toggleHelpButton(CONFIG.CONST_CONFIG.SHOW_HELPER_BTN);
    });

    // Handle toggle custom cursor event
    cbReg.add("toggleCustomCursor", () => {
        toggleCustomCursor(CONFIG.CONST_CONFIG.ENABLE_CUSTOM_CURSOR);
    });
}

/**
 * Opens a file selector dialog for choosing text files
 * @param {Event} e - The triggering event
 */
function openFileSelector(e) {
    e.preventDefault();

    // Define the file selector
    const fileSelector = document.createElement("input");
    fileSelector.type = "file";
    fileSelector.accept = CONFIG.CONST_FONT.SUPPORTED_FONT_EXT.concat(CONFIG.CONST_FILE.SUPPORTED_FILE_EXT).join(",");
    fileSelector.multiple = true;

    // Activate overlay before opening file dialog
    setOverlayActiveState(true);
    updateDropzoneVisualState();

    // Add to DOM to allow events
    document.body.appendChild(fileSelector);

    // Cleanup handler
    let cleanedUp = false;
    const cleanup = () => {
        if (cleanedUp) return;
        cleanedUp = true;
        setOverlayActiveState(false);
        resetDropZoneState();
        fileSelector.remove();
        window.removeEventListener("focus", handleWindowFocus);
    };

    // Handles the case when user cancels file picker
    const handleWindowFocus = () => {
        setTimeout(() => cleanup(), 150); // slight delay to let 'onchange' fire first if any
    };

    // Listen for file selection
    fileSelector.onchange = async () => {
        await FileHandler.handleMultipleFiles(fileSelector.files);
        cleanup();
    };

    // Watch for window regaining focus (after cancel or select)
    window.addEventListener("focus", handleWindowFocus);

    // Open the dialog
    fileSelector.click();
}

/**
 * Common drag utility — safely apply a class to overlay
 */
function setOverlayActiveState(active) {
    const overlay = CONFIG.DOM_ELEMENT.DROPZONE_OVERLAY;
    if (isVariableDefined(overlay)) {
        overlay.classList.toggle("dragActive", active);
    }
}

/**
 * Common drag utility — update dropzone UI state
 */
function updateDropzoneVisualState() {
    showDropZone(true, !(CONFIG.DOM_ELEMENT.CONTENT_CONTAINER.innerHTML === ""));
    hideContent();
}

/**
 * Allows drag operations by preventing default behavior
 * @param {DragEvent} e - The drag event
 */
function allowDrag(e) {
    e.dataTransfer.dropEffect = "copy";
    e.preventDefault();
}

/**
 * Handles drag events on the dropzone
 * @param {DragEvent} e - The drag event
 */
function handleDragEvent(e) {
    allowDrag(e);
    setOverlayActiveState(true);
    updateDropzoneVisualState();
}

/**
 * Handles drag leave events on the dropzone
 * Manages visibility of dropzone and content based on drag state
 * @param {DragEvent} e - The drag leave event
 */
function handleDragLeave(e) {
    e.preventDefault();
    setOverlayActiveState(false);
    resetDropZoneState();
}

/**
 * Handles file drop events
 * Processes dropped files and updates UI accordingly
 * @param {DragEvent} e - The drop event
 */
async function handleDrop(e) {
    e.preventDefault();
    setOverlayActiveState(false);
    await FileHandler.handleMultipleFiles(e.dataTransfer.files);
}

/**
 * Converts a Base64 string to an ArrayBuffer
 * @param {string} base64 - The Base64 string to convert
 * @returns {ArrayBuffer} The converted ArrayBuffer
 */
function base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Handle file object from extension
 * Listen for the file details sent by the extension's background script
 */
function setupExtensionMessageListener() {
    const api = typeof chrome !== "undefined" ? chrome : typeof browser !== "undefined" ? browser : null;
    if (!api?.runtime?.onMessage) {
        // console.warn("Extension messaging API is not available.");
        return;
    }

    /**
     * Processes the message received from the extension
     * @private
     * @param {Object} message - The message from the extension
     */
    async function _processExtensionMessage(message) {
        if (
            !message?.action ||
            message.action !== "loadFile" ||
            !message.fileContent ||
            !message.fileName ||
            !message.fileType
        ) {
            return;
        }

        try {
            // Show loading screen
            showLoadingScreen();

            // Decode the Base64 content back to binary
            const arrayBuffer = base64ToArrayBuffer(message.fileContent);

            // Create a File object from the ArrayBuffer
            const fileObject = new File([arrayBuffer], message.fileName, {
                type: message.fileType,
            });

            // Process the file
            await FileHandler.handleMultipleFiles([fileObject]);
        } catch (error) {
            console.error("Error loading the file into the page:", error);
            return { success: false, error: error.message };
        }
    }

    api.runtime.onMessage.addListener((message, sender, sendResponse) => {
        // Use Promise to handle asynchronous operations
        _processExtensionMessage(message)
            .then((result) => {
                // console.log("Message handled successfully:", result);
                sendResponse(result ?? { success: true });
            })
            .catch((error) => {
                // console.error("Error handling message:", error);
                sendResponse(error ?? { success: false, error: "Unknown error" });
            });

        return true; // Keep the message channel open for asynchronous responses
    });
}
