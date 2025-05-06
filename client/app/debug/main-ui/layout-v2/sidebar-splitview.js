/**
 * @fileoverview Provides functionality for a resizable sidebar component.
 * This module implements a sidebar that can be resized by dragging, collapsed/expanded
 * with a toggle button, and persists its width settings in localStorage.
 *
 * The sidebar supports:
 * - Drag resizing with visual feedback
 * - Width constraints (min/max)
 * - Double-click to reset to default width
 * - Collapsing/expanding with animation
 * - Width persistence across sessions
 * - Callback registration for resize events
 * - Optional style injection via sidebarStyle object
 *
 * @module client/app/debug/main-ui/layout-v2/resizable-sidebar
 */

/**
 * Class representing a split-view layout with a resizable sidebar.
 */
export class SidebarSplitView {
    /**
     * Create a SidebarSplitView instance.
     *
     * @param {Object} options - Configuration options.
     * @param {HTMLElement} options.container - The grid container element.
     * @param {HTMLElement} options.divider - The draggable divider element between sidebar and main content.
     * @param {HTMLElement} [options.tooltip] - Optional tooltip element to show width during resizing.
     * @param {HTMLElement} [options.toggleButton] - Optional button to collapse/expand the sidebar.
     * @param {string} [options.storageKey="sidebarWidth"] - LocalStorage key used to persist sidebar width.
     * @param {Object} [options.sidebarStyle={}] - Optional style overrides for layout variables.
     * @param {string} [options.sidebarStyle.sidebarWidthDefault] - Default sidebar width (e.g., "15.5vw").
     * @param {string} [options.sidebarStyle.sidebarWidth] - Initial sidebar width, overrides saved value.
     * @param {string} [options.sidebarStyle.gapWidth] - Width of the gap between sidebar and content.
     * @param {string} [options.sidebarStyle.marginWidth] - Horizontal margin around the layout.
     * @param {string} [options.sidebarStyle.sidebarInnerWidth] - Width of the inner content container inside the sidebar.
     * @param {string} [options.sidebarStyle.contentInnerWidth] - Width of the main content container.
     * @param {string} [options.sidebarStyle.contentInnerHeight] - Height of the main content container.
     * @param {string} [options.sidebarStyle.tooltipTriangleSize] - Size of the triangle in the tooltip.
     * @param {boolean} [options.sidebarStyle.autoHide] - Whether to auto-hide the divider and toggle button.
     */
    constructor({
        container,
        divider,
        tooltip = null,
        toggleButton = null,
        storageKey = "sidebar-splitview-sidebarWidth",
        sidebarStyle = {},
    }) {
        if (!tooltip) {
            document.querySelector(".sidebar-splitview-tooltip").style.display = "none";
        }
        if (!toggleButton) {
            document.querySelector(".sidebar-splitview-toggle").style.display = "none";
        }

        const root = document.documentElement;
        if (sidebarStyle.sidebarWidthDefault)
            root.style.setProperty("--sidebar-splitview-sidebar-width-default", sidebarStyle.sidebarWidthDefault);
        if (sidebarStyle.sidebarWidth)
            root.style.setProperty("--sidebar-splitview-sidebar-width", sidebarStyle.sidebarWidth);
        if (sidebarStyle.gapWidth) root.style.setProperty("--sidebar-splitview-gap-width", sidebarStyle.gapWidth);
        if (sidebarStyle.marginWidth)
            root.style.setProperty("--sidebar-splitview-margin-width", sidebarStyle.marginWidth);
        if (sidebarStyle.sidebarInnerWidth)
            root.style.setProperty("--sidebar-splitview-sidebar-inner-width", sidebarStyle.sidebarInnerWidth);
        if (sidebarStyle.contentInnerWidth)
            root.style.setProperty("--sidebar-splitview-content-inner-width", sidebarStyle.contentInnerWidth);
        if (sidebarStyle.contentInnerHeight)
            root.style.setProperty("--sidebar-splitview-content-inner-height", sidebarStyle.contentInnerHeight);
        if (sidebarStyle.tooltipTriangleSize)
            root.style.setProperty("--sidebar-splitview-tooltip-triangle-size", sidebarStyle.tooltipTriangleSize);

        this.container = container;
        this.divider = divider;
        this.tooltip = tooltip;
        this.toggleButton = toggleButton;
        this.storageKey = storageKey;
        this.displayTooltipUnit = "%";

        const computed = getComputedStyle(root);
        this.defaultWidth = parseFloat(computed.getPropertyValue("--sidebar-splitview-sidebar-width-default"));
        this.gapWidth = parseFloat(computed.getPropertyValue("--sidebar-splitview-gap-width"));
        this.marginWidth = parseFloat(computed.getPropertyValue("--sidebar-splitview-margin-width"));
        this.tooltipTriangleSize = parseFloat(computed.getPropertyValue("--sidebar-splitview-tooltip-triangle-size"));
        this.minWidth = this.defaultWidth;
        this.maxWidth = 50 - this.gapWidth - this.marginWidth; // Slightly less than 50vw
        this.autoHide = sidebarStyle.autoHide ?? true;
        if (this.autoHide) {
            const gap = this.divider.closest(".sidebar-splitview-gap");
            if (gap) {
                gap.addEventListener("mouseenter", () => this.#setControlsVisible(true));
                gap.addEventListener("mouseleave", () => {
                    const shouldDefer = this.isResizing || (this.tooltip && !this.tooltip.hidden);
                    if (!shouldDefer) {
                        this.#setControlsVisible(false);
                    } else {
                        const observer = new MutationObserver(() => {
                            if (!this.isResizing && (!this.tooltip || this.tooltip.hidden)) {
                                this.#setControlsVisible(false);
                                observer.disconnect();
                            }
                        });
                        observer.observe(this.tooltip, { attributes: true, attributeFilter: ["hidden"] });
                    }
                });
            }
        } else {
            this.#setControlsVisible(true);
        }

        this.lastExpandedWidth = this.defaultWidth;
        this.isResizing = false;
        this.startX = 0;
        this.startWidth = 0;
        this.tooltipDoubleClickTimeout = null;
        this.tooltipHideTimeout = null;
        this.tooltipHideTimeoutDuration = 1000;
        this.tooltipPending = false;
        this.tooltipLocked = false;

        this.#loadSavedWidth();
        this.#attachEventListeners();
    }

    /**
     * Handler for mousedown event to begin resizing.
     * @param {MouseEvent} e
     * @private
     */
    #onMouseDown = (e) => {
        this.container.classList.add("resizing");
        this.isResizing = true;
        this.startX = e.clientX;
        const viewportWidth = window.innerWidth;
        const currentSidebarWidth = parseFloat(
            getComputedStyle(this.container).getPropertyValue("--sidebar-splitview-sidebar-width")
        );
        this.startWidth = (currentSidebarWidth / 100) * viewportWidth;
        document.body.style.cursor = "col-resize";
        e.preventDefault();

        if (this.tooltip) {
            this.tooltipPending = true;
            this.tooltipDoubleClickTimeout = setTimeout(() => {
                if (this.tooltipPending && this.isResizing) {
                    this.tooltip.hidden = false;
                    this.tooltip.style.opacity = "1";
                    this.tooltip.style.pointerEvents = "auto";
                    this.tooltip.textContent = `${currentSidebarWidth.toFixed(1)}${this.displayTooltipUnit}`;
                    this.#positionTooltip(e);
                }
            }, 100);
        }
    };

    /**
     * Handler for mousemove to perform resizing.
     * @param {MouseEvent} e
     * @private
     */
    #onMouseMove = (e) => {
        if (!this.isResizing) return;
        const dx = e.clientX - this.startX;
        const viewportWidth = window.innerWidth;
        const newWidthPx = this.startWidth + dx;
        const newWidthVW = (newWidthPx / viewportWidth) * 100;
        const clampedWidth = Math.max(this.minWidth, Math.min(this.maxWidth, newWidthVW));
        this.setWidth(clampedWidth);

        if (this.tooltip) {
            this.tooltip.hidden = false;
            this.tooltip.style.opacity = "1";
            this.tooltip.textContent = `${clampedWidth.toFixed(1)}${this.displayTooltipUnit}`;
            this.#positionTooltip(e);

            const atEdge = clampedWidth === this.minWidth || clampedWidth === this.maxWidth;
            if (atEdge && !this.tooltipLocked) {
                this.tooltipLocked = true;
                this.#scheduleTooltipHide();
            } else if (!atEdge) {
                if (this.tooltipHideTimeout) {
                    clearTimeout(this.tooltipHideTimeout);
                    this.tooltipHideTimeout = null;
                    this.tooltipLocked = false;
                    this.tooltip.hidden = false;
                    this.tooltip.style.opacity = "1";
                    this.tooltip.style.pointerEvents = "auto";
                }
            }
        }
    };

    /**
     * Handler for mouseup to stop resizing.
     * @private
     */
    #onMouseUp = () => {
        if (this.tooltipDoubleClickTimeout) {
            clearTimeout(this.tooltipDoubleClickTimeout);
            this.tooltipDoubleClickTimeout = null;
        }

        this.tooltipPending = false;

        if (this.isResizing) {
            if (this.tooltipHideTimeout) {
                clearTimeout(this.tooltipHideTimeout);
                this.tooltipHideTimeout = null;
            }

            this.#scheduleTooltipHide();
            this.isResizing = false;
            this.container.classList.remove("resizing");
            document.body.style.cursor = "default";
        }
    };

    /**
     * Handler for double-click to reset sidebar width to default.
     * @private
     */
    #onDoubleClick = (e) => {
        if (this.tooltip) {
            this.tooltip.hidden = false; // Set to true to prevent the divider and toggle button from being hidden
            this.tooltip.style.opacity = "0";
            this.tooltip.style.pointerEvents = "none";
        }
        this.setWidth(this.defaultWidth);
        this.lastExpandedWidth = this.defaultWidth;
        if (this.toggleButton) this.toggleButton.classList.remove("collapsed");
        if (this.tooltip) {
            setTimeout(() => {
                this.tooltip.hidden = false;
                this.tooltip.style.opacity = "1";
                this.tooltip.style.pointerEvents = "auto";
                this.tooltip.textContent = `${this.defaultWidth.toFixed(1)}${this.displayTooltipUnit}`;
                this.#positionTooltip(e);
                this.#scheduleTooltipHide(this.tooltipHideTimeoutDuration * 2);
            }, 300);
        }
    };

    /**
     * Handler for toggle button click to collapse or expand sidebar.
     * @private
     */
    #onToggle = () => {
        const currentWidth = parseFloat(
            getComputedStyle(this.container).getPropertyValue("--sidebar-splitview-sidebar-width")
        );
        const isCollapsed = currentWidth <= 0.1;

        if (isCollapsed) {
            this.setWidth(this.lastExpandedWidth);
            if (this.toggleButton) this.toggleButton.classList.remove("collapsed");
        } else {
            this.lastExpandedWidth = currentWidth;
            this.setWidth(0);
            if (this.toggleButton) this.toggleButton.classList.add("collapsed");
        }
    };

    /**
     * Registers a callback that is called whenever the sidebar is resized.
     * @param {Function} callback - Called with the new width (in vw)
     */
    onResize(callback) {
        this.onResizeCallback = callback;
    }

    /**
     * Sets the sidebar width.
     * Updates the CSS variable and triggers any resize callbacks.
     * @param {number} vw - Width in viewport width units (vw)
     */
    setWidth(vw) {
        this.container.style.setProperty("--sidebar-splitview-sidebar-width", `${vw}vw`);
        localStorage.setItem(this.storageKey, vw);
        if (typeof this.onResizeCallback === "function") {
            this.onResizeCallback(vw);
        }
    }

    /**
     * Dynamically updates the max allowed sidebar width.
     * @param {number} newMax - New max width (in vw)
     */
    setMaxWidth(newMax) {
        this.maxWidth = newMax;
        const currentWidth = parseFloat(
            getComputedStyle(this.container).getPropertyValue("--sidebar-splitview-sidebar-width")
        );
        if (currentWidth > this.maxWidth) {
            this.setWidth(this.maxWidth);
        }
    }

    /**
     * Cleans up event listeners and state when destroying the instance.
     */
    destroy() {
        this.#detachEventListeners();
    }

    /**
     * Schedules the tooltip to be hidden after a delay.
     * Cancels any existing scheduled hide timeout.
     * @param {number} delay - The delay in milliseconds.
     * @private
     */
    #scheduleTooltipHide(delay = this.tooltipHideTimeoutDuration) {
        if (this.tooltip) {
            if (this.tooltipHideTimeout) {
                clearTimeout(this.tooltipHideTimeout);
                this.tooltipHideTimeout = null;
            }
            this.tooltipHideTimeout = setTimeout(() => {
                this.tooltip.hidden = true;
                this.tooltipLocked = false;
                this.tooltip.style.opacity = "0";
                this.tooltip.style.pointerEvents = "none";
            }, delay);
        }
    }

    /**
     * Loads saved width from localStorage and applies it if valid.
     * Falls back to default width otherwise.
     * @private
     */
    #loadSavedWidth() {
        const saved = localStorage.getItem(this.storageKey);
        const num = parseFloat(saved);
        if (!isNaN(num) && num >= this.minWidth && num <= this.maxWidth) {
            this.lastExpandedWidth = num;
        } else if (saved !== null) {
            localStorage.removeItem(this.storageKey);
            console.warn("Invalid sidebar width detected in localStorage. Resetting to default.");
        }
        this.setWidth(this.lastExpandedWidth);
    }

    /**
     * Attaches all necessary mouse and toggle event listeners.
     * @private
     */
    #attachEventListeners() {
        this.divider.addEventListener("mousedown", this.#onMouseDown);
        document.addEventListener("mousemove", this.#onMouseMove);
        document.addEventListener("mouseup", this.#onMouseUp);
        this.divider.addEventListener("dblclick", this.#onDoubleClick);
        if (this.toggleButton) {
            this.toggleButton.addEventListener("click", this.#onToggle);
        }
    }

    /**
     * Detaches all event listeners (for cleanup).
     * @private
     */
    #detachEventListeners() {
        this.divider.removeEventListener("mousedown", this.#onMouseDown);
        document.removeEventListener("mousemove", this.#onMouseMove);
        document.removeEventListener("mouseup", this.#onMouseUp);
        this.divider.removeEventListener("dblclick", this.#onDoubleClick);
        if (this.toggleButton) {
            this.toggleButton.removeEventListener("click", this.#onToggle);
        }
    }

    /**
     * Positions the tooltip next to the divider's center.
     * @param {MouseEvent} e - The mouse event that triggered the tooltip update.
     * @param {number} offsetY - The offset from the mouse position to the bottom of the tooltip.
     * @private
     */
    #positionTooltip(e, offsetY = 10) {
        const rect = this.divider.getBoundingClientRect();
        this.tooltip.style.left = `${rect.left + rect.width / 2}px`;
        const tooltipHeight = this.#getTooltipHeight();
        const tooltipY = Math.max(tooltipHeight + 10, Math.min(e.clientY - offsetY, rect.bottom - 5));
        this.tooltip.style.top = `${tooltipY}px`;
    }

    /**
     * Gets the height of the tooltip including margin and padding.
     * @returns {number} The height of the tooltip.
     * @private
     */
    #getTooltipHeight() {
        const rect = this.tooltip.getBoundingClientRect();
        const style = window.getComputedStyle(this.tooltip);
        const marginTop = parseFloat(style.marginTop) || 0;
        const marginBottom = parseFloat(style.marginBottom) || 0;
        return rect.height + marginTop + marginBottom + this.tooltipTriangleSize;
    }

    /**
     * Sets the visibility of the controls.
     * @param {boolean} show - Whether to show the controls.
     * @private
     */
    #setControlsVisible(show) {
        if (show) {
            this.divider.style.opacity = "1";
            this.divider.classList.add("hover-simulated");
        } else {
            this.divider.style.opacity = "0";
            this.divider.classList.remove("hover-simulated");
        }
        if (this.toggleButton) {
            this.toggleButton.style.opacity = show ? "1" : "0";
        }
    }
}
