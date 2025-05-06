/**
 * @fileoverview Message indicator module for displaying messages on the screen
 *
 * This module provides a class for displaying messages on the screen using a message indicator element.
 * The message indicator is a fixed position element that displays an icon and text message.
 *
 * @module client/app/modules/components/message-indicator
 */

/**
 * Message indicator class for displaying messages on the screen
 * @class
 * @description
 * This class provides functionality for displaying messages on the screen using a message indicator element.
 * The message indicator is a fixed position element that displays an icon and text message.
 */
export class MessageIndicator {
    /**
     * Constructor for the MessageIndicator class
     * @param {Object} options - Configuration options for the message indicator
     * @param {HTMLElement} [options.container=null] - The DOM element where the message appears
     * @param {Object} options.messages - Message configurations (icons + text's span element id)
     * @param {number} [options.autoHideDuration=1500] - Auto-hide delay in ms
     */
    constructor({ container = null, messages, autoHideDuration = 1500 }) {
        this.messages = messages;
        this.autoHideDuration = autoHideDuration;
        this.timeout = null;
        this.isActive = false;

        // Create a container if none is provided
        if (!container) {
            this.container = document.createElement("div");
            this.container.id = "message-indicator";
            this.container.classList.add("prevent-select");
            document.body.appendChild(this.container);
        } else {
            this.container = container;
        }

        // Scroll event on the container should be handled by the parent
        // this.container.addEventListener("wheel", (e) => {
        //     e.stopPropagation();
        // }, { passive: false });

        // Ensure the message box is hidden initially
        this.hide();
    }

    /**
     * Show a message indicator with an icon and text
     * @param {string} type - The type of message to display
     * @param {number} [duration=null] - The duration to display the message indicator. If null, the default duration will be used.
     */
    show(type, duration = null) {
        // Validate type
        if (!this.messages[type]) {
            console.warn(`Message type "${type}" is not defined.`);
            return;
        }

        // Set the message indicator as active
        this.isActive = true;

        // Clear previous content
        this.container.innerHTML = "";

        // Create icon element
        const icon = document.createElement("div");
        icon.classList.add("icon", "prevent-select");
        icon.innerHTML = this.messages[type].icon;
        // icon.addEventListener("wheel", (e) => {
        //     e.stopPropagation();
        // }, { passive: false });

        // Create text element
        const text = document.createElement("span");
        text.classList.add("text", "prevent-select");
        text.id = this.messages[type].textId;
        // text.addEventListener("wheel", (e) => {
        //     e.stopPropagation();
        // }, { passive: false });

        // Append elements
        this.container.appendChild(icon);
        this.container.appendChild(text);

        // Show message box
        this.container.style.display = "flex";

        // Auto-hide after the set duration and set the message indicator as inactive
        clearTimeout(this.timeout);
        this.timeout = setTimeout(() => {
            if (this.isActive) {
                this.hide();
                this.isActive = false;
            }
        }, duration ?? this.autoHideDuration);
    }

    /**
     * Hide the message indicator
     * @param {number} [duration=250] - The duration to animate the message indicator.
     */
    hide(duration = 250) {
        // animate the message indicator out
        const animation = this.container.animate(
            {
                opacity: [1, 0],
            },
            { duration, easing: "ease-in-out" }
        );

        // wait for the animation to finish
        animation.onfinish = () => {
            this.container.style.display = "none";
            this.container.style.opacity = 1;
            this.isActive = false;
        };
    }
}
