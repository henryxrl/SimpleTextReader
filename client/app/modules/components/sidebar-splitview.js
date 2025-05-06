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
 * @module client/app/modules/components/sidebar-splitview
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
     * @param {HTMLElement} [options.dragTooltip] - Optional dragTooltip element to show width tooltip during resizing.
     * @param {HTMLElement} [options.toggleButton] - Optional button to collapse/expand the sidebar.
     * @param {string} [options.storageKey="sidebarWidth"] - LocalStorage key used to persist sidebar width.
     * @param {Object} [options.sidebarStyle={}] - Optional style overrides for layout variables.
     * @param {string} [options.sidebarStyle.sidebarWidthMin] - Minimum sidebar width (e.g., "10vw").
     * @param {string} [options.sidebarStyle.sidebarWidthMax] - Maximum sidebar width (e.g., "40vw").
     * @param {string} [options.sidebarStyle.sidebarWidthDefault] - Default sidebar width (e.g., "15.5vw").
     * @param {string} [options.sidebarStyle.sidebarWidth] - Initial sidebar width, overrides saved value.
     * @param {string} [options.sidebarStyle.gapWidthDefault] - Default gap width (e.g., "2.5vw").
     * @param {string} [options.sidebarStyle.gapWidth] - Width of the gap between sidebar and content.
     * @param {string} [options.sidebarStyle.marginWidth] - Horizontal margin around the layout.
     * @param {string} [options.sidebarStyle.sidebarInnerWidth] - Width of the inner content container inside the sidebar.
     * @param {string} [options.sidebarStyle.contentInnerWidth] - Width of the main content container.
     * @param {string} [options.sidebarStyle.contentInnerHeight] - Height of the main content container.
     * @param {string} [options.sidebarStyle.dividerWidth] - Width of the divider.
     * @param {string} [options.sidebarStyle.dragTooltipTriangleSize] - Size of the triangle in the dragTooltip.
     * @param {string} [options.sidebarStyle.dividerTitle] - Title (default tooltip) of the divider.
     * @param {string} [options.sidebarStyle.toggleButtonTitle] - Title (default tooltip) of the toggle button.
     * @param {boolean} [options.sidebarStyle.showSidebar] - Whether to show the sidebar on init.
     * @param {boolean} [options.sidebarStyle.showDragTooltip] - Whether to show the dragTooltip on init.
     * @param {boolean} [options.sidebarStyle.showToggleButton] - Whether to show the toggle button on init.
     * @param {boolean} [options.sidebarStyle.autoHide] - Whether to auto-hide the divider and toggle button.
     * @param {boolean} [options.sidebarStyle.proxyScroll] - Whether to proxy scroll events from the content-inner to the window.
     * @param {boolean} [options.sidebarStyle.customTitles] - Whether to use custom titles or default titles (tooltip) for the divider and toggle button.
     * @param {boolean} [options.sidebarStyle.patchWindowScroll] - Whether to patch the window.scrollTo, window.scrollBy, window.scrollX, and window.scrollY functions to use the sidebar-splitview-content-inner element.
     */
    constructor({
        container,
        divider,
        dragTooltip = null,
        toggleButton = null,
        storageKey = "sidebar-splitview-sidebarWidth",
        sidebarStyle = {},
    }) {
        const dividerTitle = sidebarStyle.dividerTitle ?? "Resize Sidebar";
        if (sidebarStyle.customTitles) {
            divider.setAttribute("data-title", dividerTitle);
        } else {
            divider.title = dividerTitle;
        }
        if (!dragTooltip) {
            document.querySelector(".sidebar-splitview-dragTooltip").style.display = "none";
        }
        if (!toggleButton) {
            document.querySelector(".sidebar-splitview-toggle").style.display = "none";
        } else {
            const toggleButtonTitle = sidebarStyle.toggleButtonTitle ?? "Toggle Sidebar";
            if (sidebarStyle.customTitles) {
                toggleButton.setAttribute("data-title", toggleButtonTitle);
            } else {
                toggleButton.title = toggleButtonTitle;
            }
        }

        const root = document.documentElement;
        if (sidebarStyle.sidebarWidthMin)
            root.style.setProperty("--sidebar-splitview-sidebar-width-min", sidebarStyle.sidebarWidthMin);
        if (sidebarStyle.sidebarWidthMax)
            root.style.setProperty("--sidebar-splitview-sidebar-width-max", sidebarStyle.sidebarWidthMax);
        if (sidebarStyle.sidebarWidthDefault)
            root.style.setProperty("--sidebar-splitview-sidebar-width-default", sidebarStyle.sidebarWidthDefault);
        if (sidebarStyle.sidebarWidth)
            root.style.setProperty("--sidebar-splitview-sidebar-width", sidebarStyle.sidebarWidth);
        if (sidebarStyle.gapWidthDefault)
            root.style.setProperty("--sidebar-splitview-gap-width-default", sidebarStyle.gapWidthDefault);
        if (sidebarStyle.gapWidth) root.style.setProperty("--sidebar-splitview-gap-width", sidebarStyle.gapWidth);
        if (sidebarStyle.marginWidth)
            root.style.setProperty("--sidebar-splitview-margin-width", sidebarStyle.marginWidth);
        if (sidebarStyle.sidebarInnerWidth)
            root.style.setProperty("--sidebar-splitview-sidebar-inner-width", sidebarStyle.sidebarInnerWidth);
        if (sidebarStyle.contentInnerWidth)
            root.style.setProperty("--sidebar-splitview-content-inner-width", sidebarStyle.contentInnerWidth);
        if (sidebarStyle.contentInnerHeight)
            root.style.setProperty("--sidebar-splitview-content-inner-height", sidebarStyle.contentInnerHeight);
        if (sidebarStyle.dividerWidth)
            root.style.setProperty("--sidebar-splitview-divider-width", sidebarStyle.dividerWidth);
        if (sidebarStyle.dragTooltipTriangleSize)
            root.style.setProperty(
                "--sidebar-splitview-dragTooltip-triangle-size",
                sidebarStyle.dragTooltipTriangleSize
            );

        this.container = container;
        this.divider = divider;
        this.dragTooltip = dragTooltip;
        this.toggleButton = toggleButton;
        this.storageKey = storageKey;
        this.displaydragTooltipUnit = "%";

        // Proxy scroll events from content-inner to window
        if (sidebarStyle.proxyScroll) {
            const scrollTarget = this.container.querySelector(".sidebar-splitview-content-inner");
            if (scrollTarget) {
                this._stopScrollProxy = this.#proxyScrollEvents(scrollTarget);
            }
        }

        // Patch window.scrollTo, window.scrollBy, window.scrollX, and window.scrollY
        if (sidebarStyle.patchWindowScroll) {
            this.patchWindowScroll();
        }

        const computed = getComputedStyle(root);
        this.defaultWidth = parseFloat(computed.getPropertyValue("--sidebar-splitview-sidebar-width-default"));
        this.defaultGapWidth = parseFloat(computed.getPropertyValue("--sidebar-splitview-gap-width-default"));
        this.gapWidth = parseFloat(computed.getPropertyValue("--sidebar-splitview-gap-width"));
        this.marginWidth = parseFloat(computed.getPropertyValue("--sidebar-splitview-margin-width"));
        this.dragTooltipTriangleSize = parseFloat(
            computed.getPropertyValue("--sidebar-splitview-dragTooltip-triangle-size")
        );
        this.minWidth =
            parseFloat(computed.getPropertyValue("--sidebar-splitview-sidebar-width-min")) ?? this.defaultWidth;
        this.maxWidth =
            parseFloat(computed.getPropertyValue("--sidebar-splitview-sidebar-width-max")) ??
            50 - this.gapWidth - this.marginWidth; // Slightly less than 50vw
        this.showSidebar = sidebarStyle.showSidebar ?? true;
        this.showDragTooltip = sidebarStyle.showDragTooltip ?? true;
        if (!this.showDragTooltip) {
            this.dragTooltip.style.display = "none";
            this.dragTooltip = null;
        }
        this.showToggleButton = sidebarStyle.showToggleButton ?? true;
        if (!this.showToggleButton) {
            this.toggleButton.style.display = "none";
            this.toggleButton = null;
        }
        this.autoHide = sidebarStyle.autoHide ?? true;
        if (this.autoHide) {
            const gap = this.divider.closest(".sidebar-splitview-gap");
            if (gap) {
                gap.addEventListener("mouseenter", () => this.#setControlsVisible(true));
                gap.addEventListener("mouseleave", () => {
                    const shouldDefer =
                        (this.dragTooltip && this.isResizing) || (this.dragTooltip && !this.dragTooltip.hidden);
                    if (!shouldDefer) {
                        this.#setControlsVisible(false);
                    } else {
                        const observer = new MutationObserver(() => {
                            const stillHovering = gap.matches(":hover");
                            if (!this.isResizing && (!this.dragTooltip || this.dragTooltip.hidden) && !stillHovering) {
                                this.#setControlsVisible(false);
                                observer.disconnect();
                            }
                        });
                        observer.observe(this.dragTooltip, { attributes: true, attributeFilter: ["hidden"] });
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
        this.dragTooltipDoubleClickTimeout = null;
        this.dragTooltipHideTimeout = null;
        this.dragTooltipHideTimeoutDuration = 1000;
        this.dragTooltipPending = false;
        this.dragTooltipLocked = false;

        this.#loadSavedWidth(true);
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

        if (this.dragTooltip) {
            this.dragTooltipPending = true;
            this.dragTooltipDoubleClickTimeout = setTimeout(() => {
                if (this.dragTooltipPending && this.isResizing) {
                    this.dragTooltip.hidden = false;
                    this.dragTooltip.style.opacity = "1";
                    this.dragTooltip.style.pointerEvents = "auto";
                    this.dragTooltip.textContent = `${currentSidebarWidth.toFixed(1)}${this.displaydragTooltipUnit}`;
                    this.#positionDragTooltip(e);
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

        if (this.dragTooltip) {
            this.dragTooltip.hidden = false;
            this.dragTooltip.style.opacity = "1";
            this.dragTooltip.textContent = `${clampedWidth.toFixed(1)}${this.displaydragTooltipUnit}`;
            this.#positionDragTooltip(e);

            const atEdge = clampedWidth === this.minWidth || clampedWidth === this.maxWidth;
            if (atEdge && !this.dragTooltipLocked) {
                this.dragTooltipLocked = true;
                this.#scheduleDragTooltipHide();
            } else if (!atEdge) {
                if (this.dragTooltipHideTimeout) {
                    clearTimeout(this.dragTooltipHideTimeout);
                    this.dragTooltipHideTimeout = null;
                    this.dragTooltipLocked = false;
                    this.dragTooltip.hidden = false;
                    this.dragTooltip.style.opacity = "1";
                    this.dragTooltip.style.pointerEvents = "auto";
                }
            }
        }
    };

    /**
     * Handler for mouseup to stop resizing.
     * @private
     */
    #onMouseUp = () => {
        if (this.dragTooltipDoubleClickTimeout) {
            clearTimeout(this.dragTooltipDoubleClickTimeout);
            this.dragTooltipDoubleClickTimeout = null;
        }

        this.dragTooltipPending = false;

        if (this.isResizing) {
            if (this.dragTooltipHideTimeout) {
                clearTimeout(this.dragTooltipHideTimeout);
                this.dragTooltipHideTimeout = null;
            }

            this.#scheduleDragTooltipHide();
            this.isResizing = false;
            this.container.classList.remove("resizing");
            document.body.style.cursor = "default";
        }
    };

    /**
     * Handler for double-click to reset sidebar width to default.
     * @param {MouseEvent} e
     * @private
     */
    #onDoubleClick = (e) => {
        if (this.dragTooltip) {
            this.dragTooltip.hidden = false; // Set to true to prevent the divider and toggle button from being hidden
            this.dragTooltip.style.opacity = "0";
            this.dragTooltip.style.pointerEvents = "none";
        }
        this.setWidth(this.defaultWidth);
        this.lastExpandedWidth = this.defaultWidth;
        if (this.toggleButton) {
            this.toggleButton.classList.remove("collapsed");
        }
        if (this.dragTooltip) {
            setTimeout(() => {
                this.dragTooltip.hidden = false;
                this.dragTooltip.style.opacity = "1";
                this.dragTooltip.style.pointerEvents = "auto";
                this.dragTooltip.textContent = `${this.defaultWidth.toFixed(1)}${this.displaydragTooltipUnit}`;
                this.#positionDragTooltip(e);
                this.#scheduleDragTooltipHide(this.dragTooltipHideTimeoutDuration * 2);
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
        const isCollapsed = currentWidth === 0;

        if (isCollapsed) {
            this.setWidth(this.lastExpandedWidth);
            if (this.toggleButton) {
                this.toggleButton.classList.remove("collapsed");
            }
        } else {
            this.lastExpandedWidth = currentWidth;
            this.setWidth(0);
            if (this.toggleButton) {
                this.toggleButton.classList.add("collapsed");
            }
        }
    };

    /**
     * Toggles the TOC area visibility.
     * @param {boolean} [show=true] - Whether to show the TOC area.
     * @param {boolean} [removeGap=true] - Whether to remove the gap between the sidebar and the content.
     */
    toggleTOCArea(show = true, removeGap = true) {
        const root = document.documentElement;
        const currentWidth = parseFloat(
            getComputedStyle(this.container).getPropertyValue("--sidebar-splitview-sidebar-width")
        );

        if (show) {
            if (removeGap) {
                root.style.setProperty("--sidebar-splitview-gap-width", `${this.defaultGapWidth}vw`);
            }
            this.#loadSavedWidth();
            if (this.toggleButton) {
                this.toggleButton.classList.remove("collapsed");
            }
        } else {
            this.lastExpandedWidth = currentWidth;
            if (removeGap) {
                root.style.setProperty("--sidebar-splitview-gap-width", "0vw");
            }
            this.setWidth(0, { writeToLocalStorage: false });
            if (this.toggleButton) {
                this.toggleButton.classList.add("collapsed");
            }
        }
    }

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
     * @param {Object} [options={}] - Options object.
     * @param {boolean} [options.writeToLocalStorage=true] - Whether to write the width to localStorage.
     */
    setWidth(vw, { writeToLocalStorage = true } = {}) {
        this.container.style.setProperty("--sidebar-splitview-sidebar-width", `${vw}vw`);
        if (writeToLocalStorage) {
            localStorage.setItem(this.storageKey, vw);
        }
        if (typeof this.onResizeCallback === "function") {
            this.onResizeCallback(vw);
        }
    }

    /**
     * Dynamically updates the max allowed sidebar width.
     * @param {number} newMax - New max width (in vw)
     * @param {Object} [options={}] - Options object.
     * @param {boolean} [options.writeToLocalStorage=true] - Whether to write the width to localStorage.
     */
    setMaxWidth(newMax, { writeToLocalStorage = true } = {}) {
        this.maxWidth = newMax;
        const currentWidth = parseFloat(
            getComputedStyle(this.container).getPropertyValue("--sidebar-splitview-sidebar-width")
        );
        if (currentWidth > this.maxWidth) {
            this.setWidth(this.maxWidth, { writeToLocalStorage });
        }
    }

    /**
     * Cleans up event listeners and state when destroying the instance.
     */
    destroy() {
        this.#detachEventListeners();
        if (this._stopScrollProxy) this._stopScrollProxy();
    }

    /**
     * Schedules the dragTooltip to be hidden after a delay.
     * Cancels any existing scheduled hide timeout.
     * @param {number} [delay=this.dragTooltipHideTimeoutDuration] - The delay in milliseconds.
     * @private
     */
    #scheduleDragTooltipHide(delay = this.dragTooltipHideTimeoutDuration) {
        if (this.dragTooltip) {
            if (this.dragTooltipHideTimeout) {
                clearTimeout(this.dragTooltipHideTimeout);
                this.dragTooltipHideTimeout = null;
            }
            this.dragTooltipHideTimeout = setTimeout(() => {
                this.dragTooltip.hidden = true;
                this.dragTooltipLocked = false;
                this.dragTooltip.style.opacity = "0";
                this.dragTooltip.style.pointerEvents = "none";
            }, delay);
        }
    }

    /**
     * Loads saved width from localStorage and applies it if valid.
     * Falls back to default width otherwise.
     * @param {boolean} [initialLoad=false] - Whether the width is being loaded for the first time.
     * @param {boolean} [removeGap=true] - Whether to remove the gap between the sidebar and the content.
     * @private
     */
    #loadSavedWidth(initialLoad = false, removeGap = true) {
        const root = document.documentElement;
        const saved = localStorage.getItem(this.storageKey);
        const num = parseFloat(saved);

        const isValidRange = !isNaN(num) && num >= this.minWidth && num <= this.maxWidth;
        let isCollapsed = num === 0 && this.toggleButton;
        if (initialLoad) {
            isCollapsed = isCollapsed || !this.showSidebar;
        }

        if (isValidRange || isCollapsed) {
            if (isCollapsed) {
                if (removeGap) {
                    root.style.setProperty("--sidebar-splitview-gap-width", "0vw");
                }
                this.setWidth(0, { writeToLocalStorage: !initialLoad });
                if (this.toggleButton) {
                    this.toggleButton.classList.add("collapsed");
                }

                // Use default for restoring later
                this.lastExpandedWidth = this.defaultWidth;
            } else {
                this.lastExpandedWidth = num;
                if (removeGap) {
                    root.style.setProperty("--sidebar-splitview-gap-width", `${this.defaultGapWidth}vw`);
                }
                this.setWidth(this.lastExpandedWidth, { writeToLocalStorage: !initialLoad });
            }
        } else if (saved !== null) {
            localStorage.removeItem(this.storageKey);
            console.warn("Invalid sidebar width detected in localStorage. Resetting to default.");
            this.lastExpandedWidth = this.defaultWidth;
            this.setWidth(this.lastExpandedWidth);
        } else {
            // console.log("No saved width found in localStorage. Setting to default.");
            this.lastExpandedWidth = this.defaultWidth;
            this.setWidth(this.lastExpandedWidth);
        }
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
     * Positions the dragTooltip next to the divider's center.
     * @param {MouseEvent} e - The mouse event that triggered the dragTooltip update.
     * @param {number} offsetY - The offset from the mouse position to the bottom of the dragTooltip.
     * @private
     */
    #positionDragTooltip(e, offsetY = 10) {
        const rect = this.divider.getBoundingClientRect();
        this.dragTooltip.style.left = `${rect.left + rect.width / 2}px`;
        const dragTooltipHeight = this.#getDragTooltipHeight();
        const dragTooltipY = Math.max(dragTooltipHeight + 10, Math.min(e.clientY - offsetY, rect.bottom - 5));
        this.dragTooltip.style.top = `${dragTooltipY}px`;
    }

    /**
     * Gets the height of the dragTooltip including margin and padding.
     * @returns {number} The height of the dragTooltip.
     * @private
     */
    #getDragTooltipHeight() {
        const rect = this.dragTooltip.getBoundingClientRect();
        const style = window.getComputedStyle(this.dragTooltip);
        const marginTop = parseFloat(style.marginTop) || 0;
        const marginBottom = parseFloat(style.marginBottom) || 0;
        return rect.height + marginTop + marginBottom + this.dragTooltipTriangleSize;
    }

    /**
     * Sets the visibility of the controls.
     * @param {boolean} show - Whether to show the controls.
     * @private
     */
    #setControlsVisible(show) {
        if (show) {
            this.divider.style.opacity = "1";
            // this.divider.classList.add("hover-simulated");
        } else {
            this.divider.style.opacity = "0";
            // this.divider.classList.remove("hover-simulated");
        }
        if (this.toggleButton) {
            this.toggleButton.style.opacity = show ? "1" : "0";
        }
    }

    /**
     * Proxies scroll events from one element to another.
     * Useful when scrolling happens in an inner container but logic is bound to `window` or `document`.
     *
     * @param {HTMLElement} fromEl - The element where actual scrolling happens.
     * @param {EventTarget} [toTarget=window] - The target to dispatch the synthetic scroll event to.
     * @returns {Function} - A cleanup function to remove the listener.
     */
    #proxyScrollEvents(fromEl, toTarget = window) {
        if (!fromEl || !fromEl.addEventListener) {
            console.warn("Invalid fromEl passed to proxyScrollEvents.");
            return () => {};
        }

        const forwardScroll = () => {
            const event = new CustomEvent("proxied-scroll", {
                detail: {
                    scrollTop: fromEl.scrollTop,
                    scrollHeight: fromEl.scrollHeight,
                    clientHeight: fromEl.clientHeight,
                    scrollLeft: fromEl.scrollLeft,
                    scrollWidth: fromEl.scrollWidth,
                    clientWidth: fromEl.clientWidth,
                },
                bubbles: false,
                cancelable: false,
            });

            toTarget.dispatchEvent(event);
        };

        fromEl.addEventListener("scroll", forwardScroll);

        // Return cleanup function
        return () => fromEl.removeEventListener("scroll", forwardScroll);
    }

    /**
     * Patches the window.scrollTo and window.scrollBy functions to use the sidebar-splitview-content-inner element.
     * @param {string} [containerSelector=".sidebar-splitview-content-inner"] - The selector for the container element.
     */
    patchWindowScroll(containerSelector = ".sidebar-splitview-content-inner") {
        const container = this.container.querySelector(containerSelector);
        if (!container) return;

        // Patch window.scrollTo
        window.scrollTo = function (x, y) {
            if (typeof x === "object" && x !== null) {
                let { top = 0, left = 0, behavior = "auto" } = x;

                // Replace document.body.scrollHeight or document.documentElement.scrollHeight
                const isScrollingToBottom =
                    top === document.body.scrollHeight || top === document.documentElement.scrollHeight;

                if (isScrollingToBottom) {
                    top = container.scrollHeight;
                }

                container.scrollTo({ top, left, behavior });
            } else {
                container.scrollTo(x, y);
            }
        };

        // Patch window.scrollBy
        window.scrollBy = function (x, y) {
            if (typeof x === "object" && x !== null) {
                const { top = 0, left = 0, behavior = "auto" } = x;
                container.scrollBy({ top, left, behavior });
            } else {
                container.scrollBy(x, y);
            }
        };

        // Patch window.scrollY
        try {
            Object.defineProperty(window, "scrollY", {
                get: () => container.scrollTop,
                configurable: true,
            });
        } catch (e) {
            window.__getScrollY__ = () => container.scrollTop;
        }

        // Patch window.scrollX
        try {
            Object.defineProperty(window, "scrollX", {
                get: () => container.scrollLeft,
                configurable: true,
            });
        } catch (e) {
            window.__getScrollX__ = () => container.scrollLeft;
        }

        // Patch scroll metrics getter
        window.__getScrollMetrics__ = () => {
            return {
                scrollHeight: container.scrollHeight,
                offsetHeight: container.offsetHeight,
                clientHeight: container.clientHeight,
            };
        };
    }
}
