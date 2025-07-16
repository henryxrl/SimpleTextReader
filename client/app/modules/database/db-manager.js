/**
 * @fileoverview IndexedDB Manager Module
 *
 * This module provides a high-level abstraction for IndexedDB operations through the DBManager class.
 * It simplifies common database operations while providing robust error handling and transaction
 * management. The module supports:
 *
 * - Multiple object store operations in single transactions
 * - Cursor-based and direct data retrieval
 * - Flexible data filtering and transformation
 * - Hooks for operation lifecycle (before/after)
 * - Partial success handling for batch operations
 *
 * @module client/app/modules/database/db-manager
 * @requires IndexedDB
 * @requires shared/utils/logger
 * @requires client/app/utils/helpers-worker
 * @requires shared/core/callback/callback-registry
 */

import { Logger } from "../../../../shared/utils/logger.js";
import { createWorker } from "../../utils/helpers-worker.js";
import { cbReg } from "../../../../shared/core/callback/callback-registry.js";

/**
 * @class DBManager
 * @description A class for managing IndexedDB operations with support for multiple object stores
 * and transaction management. Provides a high-level API for common database operations.
 */
export class DBManager {
    /**
     * Variables
     * @private
     */
    #indexedDB =
        typeof window !== "undefined"
            ? window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB
            : self.indexedDB;
    #db = null;
    #dbVersion = 0;
    #dbName = "";
    #objectStores = [];
    #errorCallback = null;
    #worker = null;
    #pendingOperations = new Map();
    #operationId = 0;
    #logger = Logger.getLogger("DBManager", false);

    /**
     * Constants for chunking
     * @static
     */
    static CHUNK_SIZE = 1024 * 1024 * 64; // 64MB
    static CHUNK_THRESHOLD = 1024 * 1024 * 50; // 50MB

    /**
     * Creates a new DBManager instance
     * @param {Object} config - Configuration object for the database
     * @param {string} config.dbName - Name of the database
     * @param {number} config.dbVersion - Version of the database
     * @param {Array<Object>} config.objectStores - Array of object store configurations
     * @param {string} config.objectStores[].name - Name of the object store
     * @param {Object} config.objectStores[].options - Options for the object store (e.g., keyPath)
     * @param {Function} [config.errorCallback] - Callback function for error handling
     * @throws {Error} When required configuration is missing
     */
    constructor(config) {
        if (!this.#indexedDB) {
            throw new Error("IndexedDB not supported in this environment");
        }

        this.#dbName = config.dbName;
        this.#dbVersion = config.dbVersion;
        this.#objectStores = config.objectStores;
        this.#errorCallback = config.errorCallback;

        // Initialize worker
        this.#worker = createWorker("client/app/modules/database/db-worker.js", import.meta.url);
        this.#worker.onmessage = this.#handleWorkerMessage.bind(this);
    }

    /**
     * Handles messages from the worker
     * @private
     * @param {MessageEvent} e - The message event
     */
    #handleWorkerMessage(e) {
        const { type, id, error, chunkRefs, result } = e.data;
        const operation = this.#pendingOperations.get(id);
        if (!operation) return;

        this.#pendingOperations.delete(id);

        if (type === "error") {
            operation.reject(new Error(error));
        } else {
            operation.resolve(result);
        }
    }

    /**
     * Executes a database operation in the worker
     * @private
     * @async
     * @param {string} type - The type of operation to execute
     * @param {Object} data - The data for the operation
     * @returns {Promise<any>} The result of the operation
     */
    async #execInWorker(type, data) {
        const id = this.#operationId++;
        return new Promise((resolve, reject) => {
            this.#pendingOperations.set(id, { resolve, reject });

            this.#worker.postMessage({
                type,
                data: {
                    id,
                    dbName: this.#dbName,
                    dbVersion: this.#dbVersion,
                    ...data,
                },
            });
        });
    }

    /**
     * Initializes the database connection and performs cleanup
     * @async
     * @returns {Promise<boolean>} True if initialization successful, false otherwise
     */
    async init() {
        try {
            if (!this.#db) {
                this.#db = await this.#connect();
            }
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    /**
     * Establishes a connection to the IndexedDB database
     * @private
     * @async
     * @returns {Promise<IDBDatabase>} Database connection
     * @throws {Error} When connection fails or database creation fails
     */
    async #connect() {
        if (this.#db) {
            try {
                const state = this.#db.state;
                if (state !== "versionchange") {
                    return this.#db;
                }
            } catch (e) {
                console.error("Existing connection is invalid, creating new one");
                this.#db = null;
            }
        }

        return new Promise((resolve, reject) => {
            const req = this.#indexedDB.open(this.#dbName, this.#dbVersion);

            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                const oldVersion = e.oldVersion;

                console.log("Database upgrade needed!");
                console.log("Old version:", oldVersion);
                console.log("New version:", this.#dbVersion);

                const storesByVersion = this.#objectStores.sort((a, b) => a.index - b.index);
                this.#logger.log("storesByVersion", storesByVersion);
                storesByVersion.forEach((store) => {
                    if (store.index < this.#dbVersion) {
                        if (!db.objectStoreNames.contains(store.name)) {
                            console.log(`Creating store ${store.name} for version ${store.index + 1}`);
                            db.createObjectStore(store.name, store.options);
                        }
                    }
                });
            };

            req.onsuccess = (e) => {
                this.#db = e.target.result;
                resolve(e.target.result);
            };

            req.onerror = (e) => {
                console.error("openDB.onError");
                if (this.#errorCallback) this.#errorCallback();
                reject(e.target.error);
            };
        });
    }

    /**
     * Executes a database request
     * @private
     * @param {IDBRequest} request - The request to execute
     * @returns {Promise} Promise that resolves with the request result
     */
    async #exec(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Gets the database version
     * @async
     * @returns {Promise<number>} Database version
     * @throws {Error} When database operation fails
     */
    async getDBVersion() {
        const request = this.#indexedDB.open(this.#dbName);
        const db = await this.#exec(request);
        const version = db.version;
        db.close();
        return version;
    }

    /**
     * Checks if a store is available in the database
     * @async
     * @param {string} storeName - Name of the store to check
     * @returns {Promise<boolean>} Whether the store is available
     * @throws {Error} When database operation fails
     */
    async isStoreAvailable(storeName) {
        if (!this.#db) {
            await this.init();
        }
        return this.#db.objectStoreNames.contains(storeName);
    }

    /**
     * Ensures that the required stores are available in the database
     * @param {string[]} storeNames - Names of the stores to check
     * @returns {Promise<boolean>} Whether all stores are available
     * @throws {Error} When required stores are not available
     */
    async ensureStoresAvailable(storeNames) {
        if (!this.#db) {
            await this.init();
        }

        const unavailableStores = storeNames.filter((name) => !this.#db.objectStoreNames.contains(name));

        if (unavailableStores.length > 0) {
            throw new Error(`Required stores not available: ${unavailableStores.join(", ")}`);
        }

        return true;
    }

    /**
     * Gets the configured database version
     * @returns {number} The configured database version
     */
    getConfiguredDBVersion() {
        return this.#dbVersion;
    }

    /**
     * Gets data from specified object stores
     * @async
     * @param {string|string[]} storeNames - Name(s) of the object store(s)
     * @param {string|number} key - Key to retrieve
     * @param {Object} [options] - Additional options
     * @param {boolean} [options.requireAll=false] - Whether all stores must have data
     * @param {Function} [options.mergeStrategy] - Custom function to merge results
     * @returns {Promise<Object|null>} Retrieved data or null if not found
     * @throws {Error} When database operation fails
     */
    async get(storeNames, key, options = {}) {
        if (!(await this.init())) {
            throw new Error("Init local db error!");
        }

        try {
            const results = await this.#execInWorker("get", {
                storeNames,
                key,
                options,
            });

            // Check if there are results
            const hasResults = results.some((r) => r.data !== undefined);
            if (!hasResults) return null;

            // Check if all stores must have data
            if (options.requireAll && results.some((r) => r.data === undefined)) {
                return null;
            }

            // Use custom merge strategy or default merge
            if (options.mergeStrategy) {
                return options.mergeStrategy(results);
            }

            // Merge all results into a single object
            return results.reduce(
                (merged, { data }) => ({
                    ...merged,
                    ...(data || {}),
                }),
                {}
            );
        } catch (error) {
            console.error("Error getting data from stores:", error);
            throw error;
        }
    }

    /**
     * Retrieves all records from specified object stores
     * @async
     * @param {string|string[]} storeNames - Name(s) of the object store(s)
     * @param {Object} [options] - Additional options
     * @param {boolean} [options.useCursor=false] - Whether to use cursor for retrieval
     * @param {IDBKeyRange} [options.range] - Range of keys to retrieve
     * @param {Function} [options.filter] - Filter function for records
     * @param {Function} [options.transform] - Transform function for records
     * @returns {Promise<Array|Object>} Retrieved records
     * @throws {Error} When database operation fails
     */
    async getAll(storeNames, options = {}) {
        if (!(await this.init())) {
            throw new Error("Init local db error!");
        }

        const names = Array.isArray(storeNames) ? storeNames : [storeNames];
        const transaction = this.#db.transaction(names, "readonly");
        const stores = names.reduce((acc, name) => {
            acc[name] = transaction.objectStore(name);
            return acc;
        }, {});

        try {
            if (options.useCursor) {
                return await this.#getAllWithCursor(stores, options);
            } else {
                return await this.#getAllDirect(stores, options);
            }
        } catch (error) {
            transaction.abort();
            console.error("Error getting all records:", error);
            throw error;
        }
    }

    /**
     * Retrieves all records from stores using a cursor
     * @private
     * @async
     * @param {Object.<string, IDBObjectStore>} stores - Map of store names to object stores
     * @param {Object} options - Retrieval options
     * @param {IDBKeyRange} [options.range] - Range of keys to retrieve
     * @param {string} [options.indexName] - Name of the index to use
     * @param {Function} [options.filter] - Filter function for records
     * @param {Function} [options.transform] - Transform function for records
     * @returns {Promise<Array|Object.<string, Array>>} Records from stores
     * @throws {Error} When cursor operation fails
     */
    async #getAllWithCursor(stores, options) {
        const results = {};
        const storeNames = Object.keys(stores);

        await Promise.all(
            storeNames.map(async (storeName) => {
                const store = stores[storeName];
                const records = [];

                return new Promise((resolve, reject) => {
                    const request = options.indexName
                        ? store.index(options.indexName).openCursor(options.range)
                        : store.openCursor(options.range);

                    request.onsuccess = (e) => {
                        const cursor = e.target.result;
                        if (cursor) {
                            const record = cursor.value;

                            if (!options.filter || options.filter(record)) {
                                const transformedRecord = options.transform ? options.transform(record) : record;
                                records.push(transformedRecord);
                            }
                            cursor.continue();
                        } else {
                            results[storeName] = records;
                            resolve();
                        }
                    };

                    request.onerror = () => reject(request.error);
                });
            })
        );

        return storeNames.length === 1 ? results[storeNames[0]] : results;
    }

    /**
     * Retrieves all records from stores directly using getAll
     * @private
     * @async
     * @param {Object.<string, IDBObjectStore>} stores - Map of store names to object stores
     * @param {Object} options - Retrieval options
     * @param {IDBKeyRange} [options.range] - Range of keys to retrieve
     * @param {Function} [options.filter] - Filter function for records
     * @param {Function} [options.transform] - Transform function for records
     * @returns {Promise<Array|Object.<string, Array>>} Records from stores
     * @throws {Error} When getAll operation fails
     */
    async #getAllDirect(stores, options) {
        const results = {};
        const storeNames = Object.keys(stores);

        await Promise.all(
            storeNames.map(async (storeName) => {
                const store = stores[storeName];
                let records = await this.#exec(store.getAll(options.range));

                if (options.filter) {
                    records = records.filter(options.filter);
                }

                if (options.transform) {
                    records = records.map(options.transform);
                }

                results[storeName] = records;
            })
        );

        return storeNames.length === 1 ? results[storeNames[0]] : results;
    }

    /**
     * Puts data into multiple stores in a single transaction
     * @async
     * @param {Object} data - Data to store
     * @param {Object} options - Storage options
     * @param {Object.<string, Function>} options.stores - Map of store names to data transform functions
     * @param {Function} [options.beforePut] - Hook called before putting data
     * @param {Function} [options.afterPut] - Hook called after putting data
     * @param {boolean} [options.allowPartialSuccess=false] - Whether to allow some stores to fail
     * @returns {Promise<boolean>} Success status
     * @throws {Error} When database operation fails
     */
    async put(data, options) {
        if (!(await this.init())) {
            throw new Error("Init local db error!");
        }

        try {
            if (options.beforePut) {
                await options.beforePut(data);
            }

            const results = await Promise.all(
                Object.keys(options.stores).map(async (storeName) => {
                    let storeData = options.stores[storeName](data);

                    try {
                        if (typeof storeData === "object") {
                            for (const [field, value] of Object.entries(storeData)) {
                                if (Array.isArray(value)) {
                                    const sizeCheck = await this.#needsChunking(value);
                                    this.#logger.log("sizeCheck", sizeCheck);
                                    if (sizeCheck.needsChunking) {
                                        const chunks = await this.#storeInChunks(
                                            storeName,
                                            data.name,
                                            field,
                                            value,
                                            sizeCheck.size
                                        );
                                        this.#logger.log("chunks", chunks);
                                        storeData[field] = chunks;
                                    }
                                }
                            }
                        }
                        await this.#execInWorker("put", { storeName, storeData });
                        return true;
                    } catch (error) {
                        if (options.allowPartialSuccess) {
                            return false;
                        }
                        throw error;
                    }
                })
            );

            if (options.afterPut) {
                await options.afterPut(data, results);
            }

            // Trigger the callback after database save
            if (data.file_content_chunks) {
                await cbReg.go("afterDBSave");
            }

            return options.allowPartialSuccess
                ? results.some((success) => success)
                : results.every((success) => success);
        } catch (error) {
            console.error("Error putting data:", error);
            throw error;
        }
    }

    /**
     * Checks if data needs to be stored in chunks
     * @private
     * @async
     * @param {*} data - Data to check
     * @returns {Promise<boolean>} - Whether chunking is needed
     * @throws {Error} - When database operation fails
     */
    async #needsChunking(data) {
        if (!data) return false;

        try {
            const response = await this.#execInWorker("checkSize", {
                data,
                threshold: DBManager.CHUNK_THRESHOLD,
            });

            this.#logger.log("Got response from worker", response);

            return response;
        } catch (error) {
            console.error("Error checking data size:", error);
            return { needsChunking: false, size: 0 };
        }
    }

    /**
     * Stores data in chunks
     * @private
     * @async
     * @param {string} storeName - The name of the object store to store the data in
     * @param {string} key - The key to store the data under
     * @param {string} fieldName - The field name to store the data in
     * @param {Array} data - The data to store
     * @returns {Promise<string[]>} - The chunk keys
     * @throws {Error} - When database operation fails
     */
    async #storeInChunks(storeName, key, fieldName, data, size) {
        try {
            this.#logger.log("storeInChunks");
            return this.#execInWorker("storeChunks", {
                storeName,
                key,
                fieldName,
                data,
                chunkSize: DBManager.CHUNK_SIZE,
                size,
            });
        } catch (error) {
            console.error("Error in storeInChunks:", error);
            throw error;
        }
    }

    /**
     * Checks if a key exists in a store
     * @async
     * @param {string} storeName - Name of the store to check
     * @param {string|number} key - Key to check
     * @returns {Promise<boolean>} Whether the key exists
     * @throws {Error} When database operation fails
     */
    async exists(storeName, key) {
        if (!(await this.init())) {
            throw new Error("Init local db error!");
        }

        try {
            const result = await this.get([storeName], key);
            return !!result;
        } catch (error) {
            console.error("Error checking if key exists:", error);
            throw error;
        }
    }

    /**
     * Deletes data from multiple stores in a single transaction
     * @async
     * @param {string[]} storeNames - Names of stores to delete from
     * @param {string|number} key - Key to delete
     * @param {Object} [options] - Delete options
     * @param {Function} [options.beforeDelete] - Hook called before deletion
     * @param {Function} [options.afterDelete] - Hook called after deletion
     * @param {boolean} [options.allowPartialSuccess=false] - Whether to allow some deletes to fail
     * @returns {Promise<boolean>} Success status
     * @throws {Error} When database operation fails
     */
    async delete(storeNames, key, options = {}) {
        if (!(await this.init())) {
            throw new Error("Init local db error!");
        }

        try {
            if (options.beforeDelete) {
                await options.beforeDelete(key);
            }

            const results = await this.#execInWorker("delete", {
                storeNames,
                key,
                options,
            });

            if (options.afterDelete) {
                await options.afterDelete(key, results);
            }

            return options.allowPartialSuccess
                ? results.some((success) => success)
                : results.every((success) => success);
        } catch (error) {
            console.error("Error deleting data:", error);
            throw error;
        }
    }

    /**
     * Prints all records in specified stores
     * @async
     * @param {Object} options - Print options
     * @param {string[]} [options.storeNames=[]] - Names of stores to print
     * @param {Object.<string, Function>} [options.preprocessors] - Map of store names to record preprocessors
     * @returns {Promise<void>}
     * @throws {Error} When database operation fails
     */
    async printStoreRecords(options = {}) {
        if (!(await this.init())) {
            throw new Error("Init local db error!");
        }

        const { storeNames = [], preprocessors = {} } = options;

        for (const storeName of storeNames) {
            try {
                const records = await this.getAll([storeName], {
                    useCursor: true,
                });

                if (!records || records.length === 0) {
                    console.log(`No records found in ${storeName}.`);
                } else {
                    console.log(`All records in ${storeName}:`);

                    const processedRecords = preprocessors[storeName] ? records.map(preprocessors[storeName]) : records;

                    console.table(processedRecords);
                }
            } catch (error) {
                console.error(`Error printing ${storeName}:`, error);
            }
        }
    }
}
