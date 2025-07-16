/**
 * @fileoverview CSS Global Variables
 *
 * @Package: css-global-variables (CSSGlobalVariables)
 * @Url: https://github.com/colxi/css-global-variables/
 * @Author: colxi
 * @Email: colxi.kl@gmail.com
 * @Date: 2018-03-18
 * @License: MIT
 * @Modified: Converted to ES Module and optimized by Henry Xu
 *
 * @module client/app/lib/css-global-variables
 */

/**
 * Private ID counter for all instances
 * @private
 * @type {number}
 */
let __identifierCounter__ = 0;

/**
 * CSSGlobalVariables class for managing CSS custom properties (variables)
 * Returns a Proxy containing all found CSS global variables
 * @class
 */
class CSSGlobalVariables {
    /**
     * Define private properties
     * @private
     * @type {Object}
     */
    #__config__;
    #__varsCache__;

    /**
     * Create a new CSSGlobalVariables instance
     * @param {Object} configObj - Configuration object
     * @param {string} [configObj.filter] - CSS selector to filter style elements
     * @param {boolean} [configObj.autoprefix=true] - Auto-prefix variable names with '--'
     * @param {Function} [configObj.normalize] - Function to normalize variable names
     * @throws {Error} If configuration is invalid
     */
    constructor(configObj = {}) {
        // Validate new keyword usage
        if (!new.target) {
            throw new Error('Calling CSSGlobalVariables constructor without "new" is forbidden');
        }

        // Initialize configuration with default values
        this.#__config__ = {
            filter: false,
            autoprefix: true,
            normalize: false,
        };

        // Validate configuration object
        this.#validateConfig(configObj);
        Object.assign(this.#__config__, configObj);

        // Generate instance ID
        this.#__config__.id = ++__identifierCounter__;

        // Initialize variables cache
        this.#__varsCache__ = {};

        // Create and initialize proxy
        const proxy = this.#createProxy();

        // Initialize observer for style changes
        this.#initObserver();

        // Initial cache update
        this.#updateVarsCache();

        // Return a clean wrapper object
        const api = {
            vars: proxy,
            refresh: () => this.#updateVarsCache(),
            snapshot: () => ({ ...this.#__varsCache__ }),
        };

        return new Proxy(api, {
            get(target, prop, receiver) {
                if (prop in target) return Reflect.get(target, prop, receiver);
                return Reflect.get(target.vars, prop, receiver);
            },

            set(target, prop, value, receiver) {
                if (prop in target) return Reflect.set(target, prop, value, receiver);
                return Reflect.set(target.vars, prop, value, receiver);
            },

            has(target, prop) {
                return prop in target || prop in target.vars;
            },

            ownKeys(target) {
                const keys = new Set([...Reflect.ownKeys(target), ...Reflect.ownKeys(target.vars)]);
                return Array.from(keys);
            },

            getOwnPropertyDescriptor(target, prop) {
                if (Reflect.has(target, prop)) {
                    return Reflect.getOwnPropertyDescriptor(target, prop);
                }
                return Reflect.getOwnPropertyDescriptor(target.vars, prop);
            },

            defineProperty(target, prop, descriptor) {
                if (Reflect.has(target, prop)) {
                    return Reflect.defineProperty(target, prop, descriptor);
                }
                return Reflect.defineProperty(target.vars, prop, descriptor);
            },

            deleteProperty(target, prop) {
                // Block deletion of proxy methods like refresh/snapshot
                if (Reflect.has(target, prop)) return false;
                return Reflect.deleteProperty(target.vars, prop);
            },

            preventExtensions() {
                return false;
            },

            isExtensible() {
                return true;
            },
        });
    }

    /**
     * Validate configuration object and its properties
     * @private
     * @param {Object} configObj - Configuration to validate
     * @throws {Error} If configuration is invalid
     */
    #validateConfig(configObj) {
        if (typeof configObj !== "object") {
            throw new Error("CSSGlobalVariables constructor expects a config Object as first argument");
        }

        if (configObj.hasOwnProperty("normalize") && typeof configObj.normalize !== "function") {
            throw new Error('Config property "normalize" must be a function');
        }

        if (configObj.hasOwnProperty("autoprefix") && typeof configObj.autoprefix !== "boolean") {
            throw new Error('Config property "autoprefix" must be a boolean');
        }

        if (configObj.hasOwnProperty("filter")) {
            if (typeof configObj.filter !== "string") {
                throw new Error('Config property "filter" must be a string');
            }
            try {
                document.querySelectorAll(configObj.filter);
            } catch (e) {
                throw new Error('Provided "filter" is an invalid selector ("' + configObj.filter + '")');
            }
        }
    }

    /**
     * Create proxy for variables cache
     * @private
     * @returns {Proxy} Proxy object for accessing CSS variables
     */
    #createProxy() {
        return new Proxy(this.#__varsCache__, {
            get: (target, name) => {
                name = this.#normalizeVariableName(name);
                return Reflect.get(target, name);
            },
            set: (target, name, value) => {
                name = this.#normalizeVariableName(name);
                value = String(value);
                document.documentElement.style.setProperty(name, value);
                return Reflect.set(target, name, value);
            },
            deleteProperty: () => false,
            has: (target, name) => {
                name = this.#normalizeVariableName(name);
                return Reflect.has(target, name);
            },
            defineProperty: (target, name, attr) => {
                name = this.#normalizeVariableName(name);
                if (typeof attr === "object" && attr.hasOwnProperty("value")) {
                    const value = String(attr.value);
                    document.documentElement.style.setProperty(name, value);
                    Reflect.set(target, name, value);
                }
                return target;
            },
            ownKeys: (target) => Reflect.ownKeys(target),
            getOwnPropertyDescriptor: (target, name) => {
                name = this.#normalizeVariableName(name);
                return Reflect.getOwnPropertyDescriptor(target, name);
            },
        });
    }

    /**
     * Normalize CSS variable name
     * @private
     * @param {string} name - Variable name to normalize
     * @returns {string} Normalized variable name
     * @throws {Error} If name is invalid and autoprefix is disabled
     */
    #normalizeVariableName(name = "") {
        name = String(name);
        if (this.#__config__.normalize) {
            name = this.#__config__.normalize(name);
        }

        if (name.substring(0, 2) !== "--") {
            if (this.#__config__.autoprefix) {
                name = "--" + name;
            } else {
                throw new Error('Invalid CSS Variable name. Name must start with "--" (autoprefix=false)');
            }
        }

        return name;
    }

    /**
     * Update variables cache from all style sheets
     * @private
     * @returns {boolean} True if update successful
     */
    #updateVarsCache() {
        Array.from(document.styleSheets).forEach((styleSheet) => {
            if (styleSheet.ownerNode.getAttribute("css-global-vars-ignore")) return;

            if (this.#__config__.filter) {
                const elements = document.querySelectorAll(this.#__config__.filter);
                let isMember = false;
                for (let i in Object.keys(elements)) {
                    if (elements[i] === styleSheet.ownerNode) {
                        isMember = true;
                        break;
                    }
                }
                if (!isMember) return;
            }

            try {
                this.#processStyleSheet(styleSheet);
            } catch (e) {
                if (!styleSheet.ownerNode.hasAttribute("css-global-vars-ignore")) {
                    styleSheet.ownerNode.setAttribute("css-global-vars-ignore", true);
                    console.warn(
                        "Cross Origin Policy restrictions are blocking the access to the CSS rules of a remote stylesheet. The affected stylesheet is going to be ignored by CSSGlobalVariables. Check the documentation for instructions to prevent this issue."
                    );
                } else {
                    console.warn("Unexpected error reading CSS properties.");
                }
            }
        });

        this.#updateComputedValues();
        return true;
    }

    /**
     * Process individual style sheet
     * @private
     * @param {StyleSheet} styleSheet - Style sheet to process
     */
    #processStyleSheet(styleSheet) {
        let ids = styleSheet.ownerNode.getAttribute("css-global-vars-id");
        if (String(ids).split(",").includes(String(this.#__config__.id))) return;

        let value = styleSheet.ownerNode.getAttribute("css-global-vars-id");
        if (value === null || value === "") {
            value = this.#__config__.id;
        } else {
            value += "," + this.#__config__.id;
        }
        styleSheet.ownerNode.setAttribute("css-global-vars-id", value);

        Array.from(styleSheet.rules || styleSheet.cssRules).forEach((cssRule) => {
            if (cssRule.selectorText === ":root") {
                let css = cssRule.cssText.split("{");
                css = css[1].replace("}", "").split(";");
                for (let i = 0; i < css.length; i++) {
                    let prop = css[i].split(":");
                    if (prop.length === 2 && prop[0].indexOf("--") === 1) {
                        this.#__varsCache__[prop[0].trim()] = prop[1].trim();
                    }
                }
            }
        });
    }

    /**
     * Update computed values for all cached variables
     * @private
     */
    #updateComputedValues() {
        for (let p in this.#__varsCache__) {
            if (this.#__varsCache__.hasOwnProperty(p)) {
                this.#__varsCache__[p] = window
                    .getComputedStyle(document.documentElement, null)
                    .getPropertyValue(p)
                    .trim();
            }
        }
    }

    /**
     * Initialize mutation observer for style changes
     * @private
     */
    #initObserver() {
        const observer = new MutationObserver((mutations) => {
            let update = false;
            mutations.forEach((mutation) => {
                if (mutation.type === "childList") {
                    for (let i = 0; i < mutation.addedNodes.length; i++) {
                        if (mutation.addedNodes[i].tagName === "STYLE" || mutation.addedNodes[i].tagName === "LINK") {
                            update = true;
                        }
                    }
                    for (let i = 0; i < mutation.removedNodes.length; i++) {
                        if (
                            mutation.removedNodes[i].tagName === "STYLE" ||
                            mutation.removedNodes[i].tagName === "LINK"
                        ) {
                            update = true;
                        }
                    }
                }
            });
            if (update) {
                setTimeout(() => this.#updateVarsCache(), 500);
            }
        });

        observer.observe(document.documentElement, {
            attributes: false,
            childList: true,
            characterData: true,
            subtree: true,
        });
    }
}

/**
 * Create a new CSSGlobalVariables instance with default configuration
 * @param {Object} [config={}] - Configuration object
 * @returns {Proxy} Proxy object for accessing CSS variables
 */
export default function initCSSGlobalVariables(config = {}) {
    return new CSSGlobalVariables(config);
}
