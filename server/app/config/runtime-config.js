/**
 * @fileoverview Runtime configuration manager
 *
 * Manages runtime configuration received from the client side.
 * Provides methods to update and access configuration values.
 *
 * @module server/app/config/runtime-config
 */

/**
 * Runtime configuration manager class
 * @class RuntimeConfigManager
 */
class RuntimeConfigManager {
    /**
     * Private configuration object
     * @private
     * @type {Object}
     * @property {Object|null} CONST_PAGINATION - Pagination configuration
     * @property {boolean|null} PAGE_BREAK_ON_TITLE - Whether to break on title
     * @property {Object|null} STYLE - Style configuration
     */
    #config = {
        CONST_PAGINATION: null,
        PAGE_BREAK_ON_TITLE: null,
        STYLE: null,
    };

    /**
     * Creates a new RuntimeConfigManager instance
     * @constructor
     */
    constructor() {
        this.isReady = false;
    }

    /**
     * Updates configuration with values from client
     * @async
     * @param {Object} clientConfig - Configuration from client
     * @param {Object} [clientConfig.CONST_PAGINATION] - Pagination configuration
     * @param {boolean} [clientConfig.PAGE_BREAK_ON_TITLE] - Whether to break on title
     * @param {Object} [clientConfig.STYLE] - Style configuration
     * @returns {Promise<void>}
     * @public
     */
    updateConfig(clientConfig) {
        if (clientConfig.CONST_PAGINATION !== undefined) {
            this.#config.CONST_PAGINATION = clientConfig.CONST_PAGINATION;
        }
        if (clientConfig.PAGE_BREAK_ON_TITLE !== undefined) {
            this.#config.PAGE_BREAK_ON_TITLE = clientConfig.PAGE_BREAK_ON_TITLE;
        }
        if (clientConfig.STYLE !== undefined) {
            this.#config.STYLE = clientConfig.STYLE;
        }

        // Check if all required config is set
        this.isReady = this.#checkConfigReady();
        // console.log("Runtime config updated:", this.#config);
    }

    /**
     * Checks if all required configuration values are set
     * @private
     * @returns {boolean} Whether config is ready
     */
    #checkConfigReady() {
        return (
            this.#config.CONST_PAGINATION !== null &&
            this.#config.PAGE_BREAK_ON_TITLE !== null &&
            this.#config.STYLE !== null
        );
    }

    /**
     * Gets the current configuration
     * @throws {Error} If configuration is not ready
     * @returns {Object} Current configuration
     * @public
     */
    get config() {
        if (!this.isReady) {
            throw new Error("Runtime config not ready");
        }
        return this.#config;
    }

    /**
     * Waits for configuration to be ready
     * @async
     * @param {number} [timeout=30000] - Timeout in milliseconds
     * @throws {Error} If timeout is reached
     * @returns {Promise<void>}
     * @public
     */
    async waitForReady(timeout = 30000) {
        const startTime = Date.now();

        while (!this.isReady) {
            if (Date.now() - startTime > timeout) {
                throw new Error("Timeout waiting for runtime config");
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }
}

/**
 * Singleton instance of RuntimeConfigManager
 * @type {RuntimeConfigManager}
 */
export const runtimeConfig = new RuntimeConfigManager();
