/**
 * @fileoverview Popup manager module for displaying popups and notifications
 *
 * This module provides utility functions for:
 * - Displaying notifications with customizable icons and text
 * - Showing confirmation popups with customizable icons, text, and actions
 *
 * @module client/app/modules/components/popup-manager
 * @requires client/app/lib/sweetalert2
 * @requires client/app/config/index
 * @requires client/app/config/icons
 * @requires shared/utils/logger
 * @requires client/app/utils/base
 */

import * as CONFIG from "../../config/index.js";
import { ICONS } from "../../config/icons.js";
import { Logger } from "../../../../shared/utils/logger.js";
import { toBool, fetchHelpText, handleGlobalWheel } from "../../utils/base.js";

/**
 * Popup manager class for displaying popups and custom notifications
 * @class
 * @description
 * - Displays notifications with customizable icons and text
 * - Shows confirmation popups with customizable icons, text, and actions
 * - Manages a queue of notifications and ensures smooth transitions
 * - Logs debug information with line numbers and context
 */
export class PopupManager {
    /**
     * @type {Logger} Logger instance
     * @private
     * @static
     */
    static #logger = Logger.getLogger(PopupManager, false);

    /**
     * Custom class for general popups
     * @type {Object}
     * @property {string} icon - The icon class
     * @property {string} popup - The popup class
     * @property {string} title - The title class
     * @property {string} htmlContainer - The html container class
     * @property {string} confirmButton - The confirm button class
     * @property {string} cancelButton - The cancel button class
     * @property {string} actions - The actions class
     */
    static #customClass = {
        icon: "custom-popup-icon prevent-select",
        popup: "custom-popup prevent-select",
        title: "custom-popup-title prevent-select",
        htmlContainer: "custom-popup prevent-select",
        confirmButton: "custom-popup-confirm-btn prevent-select",
        cancelButton: "custom-popup-cancel-btn prevent-select",
        actions: "custom-popup-actions swal2-actions prevent-select",
    };

    /**
     * Active notifications
     * @type {Array}
     * @property {Object} notification - The notification object
     * @property {Object} styleEl - The style element
     */
    static #activeNotifications = [];

    /**
     * Notification queue
     * @type {Array}
     * @property {Object} notification - The notification object
     * @property {Object} styleEl - The style element
     */
    static #notificationQueue = [];

    /**
     * Maximum number of notifications showing at the same time
     * @type {number}
     */
    static #MAX_NOTIFICATIONS = 3;

    /**
     * Flag to check if the animation is currently in progress
     * @type {boolean}
     */
    static isAnimating = false;

    /**
     * Set of pending UI updates
     * @type {Set}
     */
    static pendingUIUpdates = new Set();

    /**
     * Shows a notification with customizable icon and text
     * @param {Object} options - The notification options
     * @param {string} options.iconName - The name of the icon to display
     * @param {string} options.text - The text content of the notification
     * @param {number} [options.timer=3000] - Duration to show the notification in milliseconds
     * @param {string} [options.iconColor="mainColor_inactive"] - Color of the icon
     * @param {number} [options.zIndex=null] - Z-index of the notification
     */
    static showNotification({ iconName, text, timer = 3000, iconColor = "mainColor_inactive", zIndex = null }) {
        PopupManager.#logger.log("[Notification] Starting animation");
        PopupManager.isAnimating = true;

        // Store the notification in the queue FIRST
        PopupManager.#notificationQueue.push({ iconName, text, timer, iconColor, zIndex });
        // PopupManager.#logger.log(
        //     `[Notification] Added to queue. Queue length: ${PopupManager.#notificationQueue.length}`
        // );
        PopupManager.#printQueues();

        // Process the queue
        PopupManager.#processNotificationQueue();
    }

    /**
     * Process the notification queue
     */
    static #processNotificationQueue() {
        while (
            PopupManager.#notificationQueue.length > 0 &&
            PopupManager.#activeNotifications.length < PopupManager.#MAX_NOTIFICATIONS
        ) {
            const nextNotification = PopupManager.#notificationQueue.shift(); // Get first notification in FIFO order
            PopupManager.#displayNotification(nextNotification);
        }
    }

    /**
     * Display a notification
     * @param {Object} options - The notification options
     * @param {string} options.iconName - The name of the icon to display
     * @param {string} options.text - The text content of the notification
     * @param {number} [options.timer=3000] - Duration to show the notification in milliseconds
     * @param {string} [options.iconColor="mainColor_inactive"] - Color of the icon
     * @param {number} [options.zIndex=null] - Z-index of the notification
     */
    static #displayNotification({ iconName, text, timer = 3000, iconColor = "mainColor_inactive", zIndex = null }) {
        // Get icon and color
        const icon = ICONS[iconName.toUpperCase()];
        const color = CONFIG.RUNTIME_VARS.STYLE[iconColor] || CONFIG.RUNTIME_VARS.STYLE.mainColor_inactive;
        const htmlContent = text.replace(/\n/g, "<br>");

        // Create a unique ID for each notification
        const notificationId = `notification-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

        // Create the notification element
        const notification = document.createElement("div");
        notification.className = "custom-notification";
        notification.id = notificationId;
        notification.style.display = "flex";
        notification.innerHTML = `
            <div class="custom-notification-popup ${
                PopupManager.#customClass.popup
            }" style="background: var(--bgColor)">
                <div class="custom-notification-container ${PopupManager.#customClass.htmlContainer}">
                    <div class="custom-notification prevent-select">
                        <span class="custom-notification-icon ${PopupManager.#customClass.icon}">
                            ${icon}
                        </span>
                        <span class="custom-notification-text">${htmlContent}</span>
                    </div>
                </div>
            </div>
        `;

        // Create a separate style for each notification
        let style = null;
        if (iconColor !== "mainColor_inactive") {
            style = document.createElement("style");
            style.textContent = `
                #${notificationId} .custom-notification .custom-notification-icon svg {
                    stroke: ${color} !important;
                }
            `;
            document.head.appendChild(style);
        }

        // Add to container
        if (zIndex && typeof zIndex === "number") {
            CONFIG.DOM_ELEMENT.NOTIFICATION_CONTAINER.style.zIndex = zIndex;
        }
        CONFIG.DOM_ELEMENT.NOTIFICATION_CONTAINER.appendChild(notification);
        PopupManager.#activeNotifications.push({ element: notification, style });

        // Add ESC key listener
        const handleEsc = (e) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                // e.stopImmediatePropagation(); // Enabling this will make notifications dismiss one by one
                PopupManager.#removeNotification({ element: notification, style });
                document.removeEventListener("keydown", handleEsc, true);
            }
        };
        document.addEventListener("keydown", handleEsc, true);

        // If a timer is set, automatically remove after the timer expires
        if (timer !== null) {
            setTimeout(() => {
                PopupManager.#removeNotification({ element: notification, style });
            }, timer);
        }

        setTimeout(() => {
            PopupManager.isAnimating = false;
            PopupManager.#logger.log(
                `[Notification] Animation ended, executing ${PopupManager.pendingUIUpdates.size} pending updates`
            );
            // Execute all pending UI updates
            PopupManager.#executePendingUpdates();
        }, 300); // Animation ends
    }

    /**
     * Removes a notification
     * @param {Object} options - The notification options
     * @param {Object} options.element - The notification element
     * @param {Object} options.style - The notification style
     */
    static #removeNotification({ element, style }) {
        PopupManager.#logger.log("[Notification] Starting removal animation");
        PopupManager.isAnimating = true;

        if (!element) return;

        // Use requestAnimationFrame to ensure the element is removed after the transition
        requestAnimationFrame(() => {
            // 1. Optimize animation performance
            // element.style.willChange = "transform, opacity, height";
            // element.style.backfaceVisibility = "hidden";
            // element.style.transform = "translateZ(0)";

            // 2. Save current height
            const height = element.offsetHeight;
            element.style.height = `${height}px`;

            // 3. Force browser reflow
            element.offsetHeight;

            // 4. Add removing class
            element.classList.add("removing");

            // 5. Wait longer than transition
            setTimeout(() => {
                const index = PopupManager.#activeNotifications.findIndex((n) => n.element === element);
                if (index > -1) {
                    PopupManager.#activeNotifications.splice(index, 1);

                    // // 6. Use requestAnimationFrame to ensure the element is removed after the transition
                    // requestAnimationFrame(() => {
                    //     element.style.willChange = "auto";

                    //     // 7. Wait for the notification to be removed before showing the next one
                    //     setTimeout(() => {
                    //         if (this.#notificationQueue.length > 0) {
                    //             const nextNotification = this.#notificationQueue.shift();
                    //             this.showNotification(nextNotification);
                    //         }
                    //     }, 330); // Wait for the position adjustment animation to complete
                    // });
                }

                // 8. Remove the element after the transition
                requestAnimationFrame(() => {
                    element.remove();
                    if (style) {
                        style.remove();
                    }
                });

                // Always process the queue in FIFO order
                PopupManager.#processNotificationQueue();
            }, 660);

            // Reset z-index
            CONFIG.DOM_ELEMENT.NOTIFICATION_CONTAINER.style.zIndex = CONFIG.RUNTIME_VARS.STYLE.ui_notification_zIndex;
        });

        // 9. Wait for the removal animation to complete before executing pending updates
        setTimeout(() => {
            PopupManager.isAnimating = false;
            PopupManager.#logger.log(
                `[Notification] Removal animation ended, executing ${PopupManager.pendingUIUpdates.size} pending updates`
            );
            PopupManager.#executePendingUpdates();
        }, 300);
    }

    /**
     * Executes all pending UI updates
     */
    static #executePendingUpdates() {
        if (!PopupManager.isAnimating && PopupManager.pendingUIUpdates.size > 0) {
            PopupManager.#logger.log(`[UI Updates] Executing ${PopupManager.pendingUIUpdates.size} pending updates`);
            for (const update of PopupManager.pendingUIUpdates) {
                update();
            }
            PopupManager.#logger.log(`[UI Updates] Executed ${PopupManager.pendingUIUpdates.size} pending updates`);
            PopupManager.pendingUIUpdates.clear();
        }
    }

    /**
     * Print the active notifications and the notification queue
     */
    static #printQueues() {
        PopupManager.#logger.log("Active Notifications:", [
            ...PopupManager.#activeNotifications.map((n) => n.element.innerText),
        ]);
        PopupManager.#logger.log("Notification Queue:", [...PopupManager.#notificationQueue.map((n) => n.text)]);
    }

    /**
     * Show a confirmation popup with an icon, title, text, and actions
     * @param {Object} options - The confirmation popup options
     * @param {string} options.iconName - The name of the icon to display
     * @param {string} options.title - The title of the popup
     * @param {string} options.text - The text to display
     * @param {function} options.onConfirm - The function to call when the user confirms
     */
    static showConfirmationPopup({ iconName, title, text, onConfirm }) {
        const icon = ICONS[iconName.toUpperCase()];
        Swal.fire({
            title,
            text,
            iconHtml: icon,
            customClass: {
                ...PopupManager.#customClass,
                title: "custom-popup-title confirmation-title prevent-select",
                htmlContainer: "confirmation-container prevent-select",
            },
            iconColor: CONFIG.RUNTIME_VARS.STYLE.mainColor_inactive,
            showCancelButton: true,
            confirmButtonText: CONFIG.RUNTIME_VARS.STYLE.ui_removeAllBooks_confirm_btn,
            cancelButtonText: CONFIG.RUNTIME_VARS.STYLE.ui_removeAllBooks_cancel_btn,
            background: CONFIG.RUNTIME_VARS.STYLE.bgColor,
            width: "auto",
            didOpen: () => {
                CONFIG.VARS.IS_POPUP_WINDOW_SHOWN = true;
                document.addEventListener("wheel", PopupManager.#handleGlobalWheel, { passive: false });
            },
            didClose: () => {
                CONFIG.VARS.IS_POPUP_WINDOW_SHOWN = false;
                document.removeEventListener("wheel", PopupManager.#handleGlobalWheel, { passive: false });
            },
        }).then((result) => {
            if (result.isConfirmed) {
                onConfirm();
            }
        });
    }

    /**
     * Shows a changelog popup when version changes
     * @param {Object} options - The changelog options
     * @param {string} options.version - Current version number
     * @param {Object} options.changelog - Changelog object
     * @param {number} [options.previousVersions=2] - Number of previous versions to show
     * @param {boolean} [options.forceShow=false] - Whether to force show the changelog popup
     * @param {function} [options.willClose] - Function to call when the popup is about to be closed
     * @param {function} [options.didClose] - Function to call when the popup is closed
     * @returns {Promise<void>}
     */
    static async showChangelogPopup(options) {
        const version = options.version ?? "";
        const changelog = options.changelog ?? {};
        const versionDate = (version && changelog?.[version]?.date) || "Unknown Date";
        const previousVersions = options.previousVersions ?? 2;
        const forceShow = options.forceShow ?? false;

        if (
            !version ||
            !changelog ||
            !versionDate ||
            !changelog[version] ||
            !changelog[version]["date"] ||
            !changelog[version]["changes"] ||
            !changelog[version]["changes"]["zh"] ||
            !changelog[version]["changes"]["en"] ||
            !Array.isArray(changelog[version]["changes"]["zh"]) ||
            !Array.isArray(changelog[version]["changes"]["en"]) ||
            changelog[version]["changes"]["zh"].length === 0 ||
            changelog[version]["changes"]["en"].length === 0
        )
            return;

        const STORAGE_KEY = "app_version";
        const STORAGE_KEY_DATE = "app_version_date";
        const savedVersion = localStorage.getItem(STORAGE_KEY);
        const savedVersionDate = localStorage.getItem(STORAGE_KEY_DATE);

        // Only show when version changes or debug mode is enabled
        if (savedVersion !== version || savedVersionDate !== versionDate || forceShow) {
            // Get the correct language
            // const currentLang = CONFIG.RUNTIME_VARS.WEB_LANG;
            const respectUserLangSetting = toBool(localStorage.getItem("respectUserLangSetting"), false) ?? false;
            const bookLang = CONFIG.VARS.IS_EASTERN_LAN ? "zh" : "en";
            const currentLang = !respectUserLangSetting && !CONFIG.VARS.INIT ? bookLang : CONFIG.RUNTIME_VARS.WEB_LANG;

            // Get the current changelog
            const currentChangelog = changelog[version];
            const currentChanges = currentChangelog.changes[currentLang];

            // Get the previous changelogs
            const previousChangelogs =
                previousVersions > 0
                    ? `<details class="previous-changes">
                    <summary>${CONFIG.RUNTIME_VARS.STYLE.ui_changelog_previous_changes}</summary>
                    ${Object.entries(changelog)
                        .filter(([ver]) => ver !== version)
                        .slice(0, previousVersions)
                        .map(
                            ([ver, log]) => `
                            <div class="version-block">
                                <span class="version-number">v${ver}</span>
                                <span class="version-date">(${log.date})</span>
                                <ul class="version-changes">
                                    ${log.changes[currentLang]
                                        .map(
                                            (change) =>
                                                `<li>${change
                                                    .replace(/##(.*?)##/g, "<span class='title'>$1</span>")
                                                    .replace(
                                                        /\*\*(.*?)\*\*/g,
                                                        "<span class='emphasis'>$1</span>"
                                                    )}</li>`
                                        )
                                        .join("")}
                                </ul>
                            </div>
                        `
                        )
                        .join("")}
                </details>`
                    : "";

            await Swal.fire({
                title: CONFIG.RUNTIME_VARS.STYLE.ui_changelog_title,
                html: `<div class="changelog-content">
                    <div class="version-block">
                        <span class="version-number">v${version}</span>
                        <span class="version-date">(${currentChangelog.date})</span>
                        <ul class="version-changes">
                            ${currentChanges
                                .map(
                                    (change) =>
                                        `<li>${change
                                            .replace(/##(.*?)##/g, "<span class='title'>$1</span>")
                                            .replace(/\*\*(.*?)\*\*/g, "<span class='emphasis'>$1</span>")}</li>`
                                )
                                .join("")}
                        </ul>
                    </div>
                    ${previousChangelogs}
                </div>`,
                confirmButtonText: CONFIG.RUNTIME_VARS.STYLE.ui_changelog_button_text,
                customClass: {
                    ...PopupManager.#customClass,
                    popup: "custom-popup changelog-popup prevent-select",
                    title: "custom-popup-title changelog-title prevent-select",
                    htmlContainer: "changelog-container prevent-select",
                },
                background: CONFIG.RUNTIME_VARS.STYLE.bgColor,
                willOpen: () => {
                    const popup = document.querySelector(".changelog-popup");
                    const maxWidth = popup.offsetWidth + 10;
                    popup.style.width = `${maxWidth}px`;
                },
                didOpen: () => {
                    CONFIG.VARS.IS_POPUP_WINDOW_SHOWN = true;
                    document.addEventListener("wheel", PopupManager.#handleGlobalWheel, { passive: false });
                },
                willClose: () => {
                    options.willClose?.call(this);
                },
                didClose: () => {
                    CONFIG.VARS.IS_POPUP_WINDOW_SHOWN = false;
                    document.removeEventListener("wheel", PopupManager.#handleGlobalWheel, { passive: false });
                    options.didClose?.call(this);
                },
            });

            // Save the new version number
            localStorage.setItem(STORAGE_KEY, version);
            localStorage.setItem(STORAGE_KEY_DATE, versionDate);
        }
    }

    /**
     * Shows a help popup with usage instructions
     * @returns {Promise<void>}
     */
    static async showHelpPopup() {
        // Get the correct language
        // const currentLang = CONFIG.RUNTIME_VARS.WEB_LANG;
        const respectUserLangSetting = toBool(localStorage.getItem("respectUserLangSetting"), false) ?? false;
        const bookLang = CONFIG.VARS.IS_EASTERN_LAN ? "zh" : "en";
        const currentLang = !respectUserLangSetting && !CONFIG.VARS.INIT ? bookLang : CONFIG.RUNTIME_VARS.WEB_LANG;

        // Fetch the help text
        const helpText = await fetchHelpText();

        if (
            !helpText ||
            !helpText["zh"] ||
            !helpText["en"] ||
            !Array.isArray(helpText["zh"]) ||
            !Array.isArray(helpText["en"]) ||
            helpText["zh"].length === 0 ||
            helpText["en"].length === 0 ||
            !helpText["zh"].every(
                (item) =>
                    typeof item === "object" &&
                    item.title &&
                    item.content &&
                    (typeof item.folded === "boolean" || item.folded === undefined) &&
                    Array.isArray(item.content) &&
                    item.content.length > 0
            ) ||
            !helpText["en"].every(
                (item) =>
                    typeof item === "object" &&
                    item.title &&
                    item.content &&
                    (typeof item.folded === "boolean" || item.folded === undefined) &&
                    Array.isArray(item.content) &&
                    item.content.length > 0
            )
        )
            return;

        // Get the help content
        const content = helpText[currentLang];
        if (!content) return;

        // Format the help content
        // Also add <strong> tags to the content when it contains **
        const formattedContent = content
            .map((block) => {
                const isFolded = block.folded ? "" : "open";
                return `
                <details class="help-block" ${isFolded}>
                    <summary class="help-block-title">${block.title}</summary>
                    <ul class="help-text">
                        ${block.content
                            .map(
                                (item) =>
                                    `<li>${item
                                        .replace(/##(.*?)##/g, "<span class='title'>$1</span>")
                                        .replace(/\*\*(.*?)\*\*/g, "<span class='emphasis'>$1</span>")}</li>`
                            )
                            .join("")}
                    </ul>
                </details>
            `;
            })
            .join("");

        Swal.fire({
            title: CONFIG.RUNTIME_VARS.STYLE.ui_help_title,
            html: `<div class="help-content">${formattedContent}</div>`,
            confirmButtonText: CONFIG.RUNTIME_VARS.STYLE.ui_help_button_text,
            customClass: {
                ...PopupManager.#customClass,
                popup: "custom-popup help-popup prevent-select",
                title: "custom-popup-title help-title prevent-select",
                htmlContainer: "help-container prevent-select",
            },
            background: CONFIG.RUNTIME_VARS.STYLE.bgColor,
            showClass: {
                popup: "swal2-noanimation",
            },
            willOpen: () => {
                // Set the width of the popup to the max width of the content
                const popup = document.querySelector(".help-popup");
                let maxWidth = popup.offsetWidth + 10;
                PopupManager._helpBlockListeners = [];
                document.querySelectorAll(".help-block").forEach((block) => {
                    const toggleHandler = () => {
                        const currentMaxWidth = parseInt(popup.getAttribute("data-max-width"), 10) || popup.offsetWidth;

                        if (currentMaxWidth >= maxWidth) {
                            maxWidth = currentMaxWidth;
                            popup.setAttribute("data-max-width", maxWidth);
                            popup.style.width = `${maxWidth}px`;
                        }
                    };
                    block.addEventListener("toggle", toggleHandler);
                    PopupManager._helpBlockListeners.push({ block, toggleHandler });
                });
                popup.setAttribute("data-max-width", maxWidth);
            },
            didOpen: () => {
                CONFIG.VARS.IS_POPUP_WINDOW_SHOWN = true;
                document.addEventListener("wheel", PopupManager.#handleGlobalWheel, { passive: false });
            },
            didClose: () => {
                CONFIG.VARS.IS_POPUP_WINDOW_SHOWN = false;
                document.removeEventListener("wheel", PopupManager.#handleGlobalWheel, { passive: false });

                // Reset popup width
                const popup = document.querySelector(".help-popup");
                if (popup) {
                    popup.style.width = "";
                    popup.removeAttribute("data-max-width");
                }
                if (PopupManager._helpBlockListeners) {
                    PopupManager._helpBlockListeners.forEach(({ block, toggleHandler }) => {
                        block.removeEventListener("toggle", toggleHandler);
                    });
                    PopupManager._helpBlockListeners = [];
                }
            },
        });
    }

    /**
     * Shows a notification with customizable icon and text
     * The original implementation of the notification
     * @param {Object} options - The notification options
     * @param {string} options.iconName - The name of the icon to display
     * @param {string} options.text - The text content of the notification
     * @param {number} [options.timer=2000] - Duration to show the notification in milliseconds
     * @param {string} [options.iconColor="mainColor_inactive"] - Color of the icon
     * @deprecated
     */
    static #showNotificationOriginal({ iconName, text, timer = 2000, iconColor = "mainColor_inactive" }) {
        const icon = ICONS[iconName.toUpperCase()];
        const htmlContent = text.replace(/\n/g, "<br>");
        const color = CONFIG.RUNTIME_VARS.STYLE[iconColor] || CONFIG.RUNTIME_VARS.STYLE.mainColor_inactive;

        // Create or update the style element
        if (iconColor !== "mainColor_inactive") {
            const styleId = "swal-icon-style";
            let styleEl = document.getElementById(styleId);
            if (!styleEl) {
                styleEl = document.createElement("style");
                styleEl.id = styleId;
                document.head.appendChild(styleEl);
            }
            styleEl.textContent = `
                .swal-custom-notification .swal-icon-wrapper svg {
                    stroke: ${color} !important;
                }
            `;
        }

        // Show the notification
        Swal.fire({
            position: "top-end",
            showConfirmButton: false,
            iconColor: color,
            html: `<div class="swal-custom-notification prevent-select">
                    <span class="swal-icon-wrapper">
                        ${icon}
                    </span>
                    <span class="swal-text">${htmlContent}</span>
                </div>`,
            customClass: PopupManager.#customClass,
            background: CONFIG.RUNTIME_VARS.STYLE.bgColor,
            backdrop: false,
            width: "auto",
            timer,
        });
    }

    /**
     * Handles global wheel events, preventing scroll on all elements except the popup
     * @param {WheelEvent} e - The wheel event
     */
    static #handleGlobalWheel = (e) => {
        if (CONFIG.VARS.IS_POPUP_WINDOW_SHOWN) {
            handleGlobalWheel(e, document.getElementById("swal2-html-container"));
        }
    };

    /**
     * Test multiple notifications
     * @param {number} num - The number of notifications to show
     * @param {number} timeGap - The time gap between notifications in milliseconds
     */
    static testMultipleNotifications(num = 12, timeGap = 300) {
        const messages = Array.from({ length: num }, (_, index) => `Notification ${index + 1}`);
        const iconNames = ["BOOK", "ERROR", "FONT_FILE", "FONT_FILE_INVALID", "WRONG_FILE_TYPE"];
        const iconColors = ["mainColor_inactive", "error", "warning"];

        let index = 0;
        const interval = setInterval(() => {
            if (index >= num) {
                clearInterval(interval);
                return;
            }

            const randomIconName = iconNames[Math.floor(Math.random() * iconNames.length)];
            const randomIconColor = iconColors[Math.floor(Math.random() * iconColors.length)];

            // console.log("Showing notification", index, messages[index]);

            PopupManager.showNotification({
                iconName: randomIconName,
                text: `${messages[index]} (${index + 1}/${num})`,
                timer: 3000,
                iconColor: randomIconColor,
            });

            index++;
        }, timeGap);
    }
}
