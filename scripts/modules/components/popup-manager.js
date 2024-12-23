/**
 * @fileoverview Popup manager module for displaying popups and notifications
 *
 * This module provides utility functions for:
 * - Displaying notifications with customizable icons and text
 * - Showing confirmation popups with customizable icons, text, and actions
 *
 * @module modules/components/popup-manager
 * @requires config/index
 * @requires config/icons
 * @requires lib/sweetalert2/src/sweetalert2
 */

import * as CONFIG from "../../config/index.js";
import { ICONS } from "../../config/icons.js";
import Swal from "../../lib/sweetalert2/src/sweetalert2.js";

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
     * @type {string} Log prefix
     * @private
     */
    static #LOG_PREFIX = "[PopupManager";

    /**
     * @type {boolean} Whether to enable debug mode
     * @private
     */
    static #DEBUG = false;

    /**
     * Custom class for the popup
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
        icon: "booklist-remove-all-popup-icon prevent-select",
        popup: "booklist-remove-all-popup prevent-select",
        title: "booklist-remove-all-popup prevent-select",
        htmlContainer: "booklist-remove-all-popup prevent-select",
        confirmButton: "booklist-remove-all-popup prevent-select",
        cancelButton: "booklist-remove-all-popup prevent-select",
        actions: "booklist-remove-all-popup swal2-actions prevent-select",
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
    static #MAX_NOTIFICATIONS = 5;

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
     * @param {number} [options.timer=2000] - Duration to show the notification in milliseconds
     * @param {string} [options.iconColor="mainColor_inactive"] - Color of the icon
     */
    static showNotification({ iconName, text, timer = 3000, iconColor = "mainColor_inactive" }) {
        this.#log("[Notification] Starting animation");
        this.isAnimating = true;
        const icon = ICONS[iconName.toUpperCase()];
        const color = CONFIG.RUNTIME_VARS.STYLE[iconColor] || CONFIG.RUNTIME_VARS.STYLE.mainColor_inactive;
        const htmlContent = text.replace(/\n/g, "<br>");

        // If the current active notification is full, add to the queue
        if (this.#activeNotifications.length >= this.#MAX_NOTIFICATIONS) {
            this.#notificationQueue.push({ iconName, text, timer, iconColor });
            this.#log(`[Notification] Notification queued. Queue length: ${this.#notificationQueue.length}`);
            return;
        }

        // Create a unique ID for each notification
        const notificationId = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Create the notification element
        const notification = document.createElement("div");
        notification.className = "swal2-container swal2-center swal2-backdrop-hide swal2-shown";
        notification.id = notificationId;
        notification.style.display = "flex";
        notification.innerHTML = `
            <div class="swal2-popup swal2-toast ${this.#customClass.popup}" style="background: var(--bgColor)">
                <div class="swal2-html-container ${this.#customClass.htmlContainer}">
                    <div class="swal-custom-notification prevent-select">
                        <span class="swal-icon-wrapper ${this.#customClass.icon}">
                            ${icon}
                        </span>
                        <span class="swal-text">${htmlContent}</span>
                    </div>
                </div>
            </div>
        `;

        // Create a separate style for each notification
        let style = null;
        if (iconColor !== "mainColor_inactive") {
            style = document.createElement("style");
            style.textContent = `
                #${notificationId} .swal-custom-notification .swal-icon-wrapper svg {
                    stroke: ${color} !important;
                }
            `;
            document.head.appendChild(style);
        }

        // Add to container
        CONFIG.DOM_ELEMENT.NOTIFICATION_CONTAINER.appendChild(notification);
        this.#activeNotifications.push({ element: notification, style });

        // Add ESC key listener
        const handleEsc = (e) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                // e.stopImmediatePropagation(); // Enabling this will make notifications dismiss one by one
                this.#removeNotification({ element: notification, style });
                document.removeEventListener("keydown", handleEsc, true);
            }
        };
        document.addEventListener("keydown", handleEsc, true);

        // If a timer is set, automatically remove after the timer expires
        if (timer !== null) {
            setTimeout(() => {
                this.#removeNotification({ element: notification, style });
            }, timer);
        }

        setTimeout(() => {
            this.isAnimating = false;
            this.#log(`[Notification] Animation ended, executing ${this.pendingUIUpdates.size} pending updates`);
            // Execute all pending UI updates
            this.executePendingUpdates();
        }, 300); // Animation ends
    }

    /**
     * Removes a notification
     * @param {Object} options - The notification options
     * @param {Object} options.element - The notification element
     * @param {Object} options.style - The notification style
     */
    static #removeNotification({ element, style }) {
        this.#log("[Notification] Starting removal animation");
        this.isAnimating = true;

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
                const index = this.#activeNotifications.findIndex((n) => n.element === element);
                if (index > -1) {
                    this.#activeNotifications.splice(index, 1);

                    // 6. Use requestAnimationFrame to ensure the element is removed after the transition
                    requestAnimationFrame(() => {
                        element.style.willChange = "auto";

                        // 7. Wait for the notification to be removed before showing the next one
                        setTimeout(() => {
                            if (this.#notificationQueue.length > 0) {
                                const nextNotification = this.#notificationQueue.shift();
                                this.showNotification(nextNotification);
                            }
                        }, 330); // Wait for the position adjustment animation to complete
                    });
                }

                // 8. Remove the element after the transition
                requestAnimationFrame(() => {
                    element.remove();
                    if (style) {
                        style.remove();
                    }
                });
            }, 660); // More than CSS transition time (0.3s)
        });

        // 9. Wait for the removal animation to complete before executing pending updates
        setTimeout(() => {
            this.isAnimating = false;
            this.#log(
                `[Notification] Removal animation ended, executing ${this.pendingUIUpdates.size} pending updates`
            );
            this.executePendingUpdates();
        }, 300);
    }

    /**
     * Executes all pending UI updates
     */
    static executePendingUpdates() {
        if (!this.isAnimating && this.pendingUIUpdates.size > 0) {
            this.#log(`[UI Updates] Executing ${this.pendingUIUpdates.size} pending updates`);
            for (const update of this.pendingUIUpdates) {
                update();
            }
            this.#log(`[UI Updates] Executed ${this.pendingUIUpdates.size} pending updates`);
            this.pendingUIUpdates.clear();
        }
    }

    /**
     * Show a confirmation popup with an icon, title, text, and actions
     * @param {string} iconName - The name of the icon to display
     * @param {string} title - The title of the popup
     * @param {string} text - The text to display
     * @param {function} onConfirm - The function to call when the user confirms
     */
    static showConfirmationPopup({ iconName, title, text, onConfirm }) {
        const icon = ICONS[iconName.toUpperCase()];
        Swal.fire({
            title,
            text,
            iconHtml: icon,
            customClass: this.#customClass,
            iconColor: CONFIG.RUNTIME_VARS.STYLE.mainColor_inactive,
            showCancelButton: true,
            confirmButtonColor: CONFIG.RUNTIME_VARS.STYLE.mainColor_inactive,
            cancelButtonColor: CONFIG.RUNTIME_VARS.STYLE.fontInfoColor,
            confirmButtonText: CONFIG.RUNTIME_VARS.STYLE.ui_removeAllBooks_confirm_btn,
            cancelButtonText: CONFIG.RUNTIME_VARS.STYLE.ui_removeAllBooks_cancel_btn,
            background: CONFIG.RUNTIME_VARS.STYLE.bgColor,
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
     * @returns {Promise<void>}
     */
    static async showChangelogPopup(options) {
        const version = options.version ?? "";
        const changelog = options.changelog ?? {};
        const previousVersions = options.previousVersions ?? 2;
        const forceShow = options.forceShow ?? false;

        if (
            !version ||
            !changelog ||
            !changelog[version] ||
            !changelog[version]["changes"] ||
            !Array.isArray(changelog[version]["changes"]["zh"]) ||
            !Array.isArray(changelog[version]["changes"]["en"]) ||
            changelog[version]["changes"]["zh"].length === 0 ||
            changelog[version]["changes"]["en"].length === 0
        )
            return;

        const STORAGE_KEY = "app_version";
        const savedVersion = localStorage.getItem(STORAGE_KEY);

        // Only show when version changes or debug mode is enabled
        if (savedVersion !== version || forceShow) {
            const currentChangelog = changelog[version];
            const currentChanges = currentChangelog.changes[CONFIG.RUNTIME_VARS.WEB_LANG];
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
                                    ${log.changes[CONFIG.RUNTIME_VARS.WEB_LANG]
                                        .map((change) => `<li>${change}</li>`)
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
                            ${currentChanges.map((change) => `<li>${change}</li>`).join("")}
                        </ul>
                    </div>
                    ${previousChangelogs}
                </div>`,
                confirmButtonText: CONFIG.RUNTIME_VARS.STYLE.ui_changelog_button_text,
                confirmButtonColor: CONFIG.RUNTIME_VARS.STYLE.mainColor_inactive,
                customClass: {
                    ...this.#customClass,
                    title: "booklist-remove-all-popup changelog-title prevent-select",
                    htmlContainer: "changelog-container prevent-select",
                },
                background: CONFIG.RUNTIME_VARS.STYLE.bgColor,
            });

            // Save the new version number
            localStorage.setItem(STORAGE_KEY, version);
        }
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
            customClass: this.#customClass,
            background: CONFIG.RUNTIME_VARS.STYLE.bgColor,
            backdrop: false,
            width: "auto",
            timer,
        });
    }

    /**
     * Logs debug information with line numbers and context
     * @private
     * @param {string} message - Message to log
     * @param {Object} [data=null] - Additional data to include in the log
     * @param {Error} [error=null] - Error object if logging an error
     * @description
     * Enhanced logging features:
     * - Includes line numbers from call stack
     * - Formats error messages with context
     * - Supports object inspection for debugging
     * - Conditional output based on debug mode
     */
    static #log(message, data = null, error = null) {
        if (!PopupManager.#DEBUG) return;

        const stack = new Error().stack;
        const callerLine = stack.split("\n")[2];
        const match = callerLine.match(/:(\d+):\d+\)?$/);
        const lineNumber = match ? match[1] : "unknown";
        const prefix = `${PopupManager.#LOG_PREFIX}: ${lineNumber}]`;

        if (error) {
            console.error(`${prefix} ERROR - ${message}:`, error);
            if (data) console.error(`${prefix} Context:`, data);
            console.error(`${prefix} Stack:`, error.stack);
        } else if (data) {
            console.log(`${prefix} ${message}:`, data);
        } else {
            console.log(`${prefix} ${message}`);
        }
    }

    /**
     * Test multiple notifications
     * @param {number} num - The number of notifications to show
     * @param {number} timeGap - The time gap between notifications in milliseconds
     */
    static testMultipleNotifications(num = 12, timeGap = 100) {
        const messages = Array.from({ length: num }, (_, index) => `Notification ${index + 1}`);
        messages.forEach((msg, index) => {
            setTimeout(() => {
                this.showNotification({
                    iconName: "BOOK",
                    text: `${msg} (${index + 1}/${num})`,
                    timer: 3000,
                    iconColor: "mainColor_inactive",
                });
            }, index * timeGap);
        });
    }
}
