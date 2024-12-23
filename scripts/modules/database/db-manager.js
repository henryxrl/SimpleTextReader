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
 * @module database/db-manager
 * @requires IndexedDB
 */

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
    #indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    #db = null;
    #dbVersion = 0;
    #dbName = "";
    #objectStores = [];
    #errorCallback = null;

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
        this.#dbName = config.dbName;
        this.#dbVersion = config.dbVersion;
        this.#objectStores = config.objectStores;
        this.#errorCallback = config.errorCallback;
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
            console.log(e);
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
                console.log("Existing connection is invalid, creating new one");
                this.#db = null;
            }
        }

        return new Promise((resolve, reject) => {
            const req = this.#indexedDB.open(this.#dbName, this.#dbVersion);

            req.onupgradeneeded = (evt) => {
                const db = evt.target.result;
                const oldVersion = evt.oldVersion;

                console.log("Database upgrade needed!");
                console.log("Old version:", oldVersion);
                console.log("New version:", this.#dbVersion);

                const storesByVersion = this.#objectStores.sort((a, b) => a.index - b.index);
                // console.log("storesByVersion", storesByVersion);
                storesByVersion.forEach((store) => {
                    if (store.index < this.#dbVersion) {
                        if (!db.objectStoreNames.contains(store.name)) {
                            console.log(`Creating store ${store.name} for version ${store.index + 1}`);
                            db.createObjectStore(store.name, store.options);
                        }
                    }
                });
            };

            req.onsuccess = (evt) => {
                this.#db = evt.target.result;
                resolve(evt.target.result);
            };

            req.onerror = (evt) => {
                console.log("openDB.onError");
                if (this.#errorCallback) this.#errorCallback();
                reject(evt.target.error);
            };
        });
    }

    /**
     * Gets object store(s) from the database
     * @private
     * @param {string|string[]} storeNames - Name(s) of the object store(s)
     * @param {IDBTransactionMode} [mode="readonly"] - Transaction mode ("readonly" or "readwrite")
     * @param {IDBTransaction} [transaction=null] - Existing transaction to use
     * @returns {IDBObjectStore|Object.<string, IDBObjectStore>} Single object store or map of stores
     * @throws {Error} When store names are invalid or stores don't exist
     */
    #getObjectStore(storeNames, mode = "readonly", transaction = null) {
        // Ensure storeNames is either a string or an array
        if (typeof storeNames !== "string" && !Array.isArray(storeNames)) {
            throw new Error("storeNames must be a string or an array.");
        }

        // Normalize to array for consistent handling
        const names = Array.isArray(storeNames) ? storeNames : [storeNames];

        const activeTransaction = transaction || this.#db.transaction(names, mode);
        activeTransaction.onerror = function (evt) {
            console.error("Transaction error:", evt.target.error);
        };

        // Return an object mapping store names to their respective object stores
        return names.reduce((stores, name) => {
            stores[name] = activeTransaction.objectStore(name);
            return stores;
        }, {});
    }

    /**
     * Executes an IndexedDB request and returns a promise
     * @private
     * @param {IDBRequest} request - The IndexedDB request to execute
     * @returns {Promise<any>} Result of the request
     * @throws {Error} When the request fails
     */
    #exec(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = (evt) => {
                resolve(evt.target.result);
            };
            request.onerror = (evt) => {
                console.log("exec.onError: ");
                console.log(evt.target);
                reject(evt.target.error);
            };
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

        const transaction = this.#db.transaction(storeNames, "readonly");

        try {
            const stores = this.#getObjectStore(storeNames, "readonly", transaction);

            // Get data from all stores
            const results = await Promise.all(
                storeNames.map(async (storeName) => {
                    const store = stores[storeName] || stores;
                    const data = await this.#exec(store.get(key));
                    return {
                        storeName,
                        data,
                    };
                })
            );

            // Check if we have any results
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

            // Default merge: combine all results into one object
            return results.reduce(
                (merged, { data }) => ({
                    ...merged,
                    ...(data || {}),
                }),
                {}
            );
        } catch (error) {
            transaction.abort();
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

                    request.onsuccess = (event) => {
                        const cursor = event.target.result;
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

        const storeNames = Object.keys(options.stores);
        const transaction = this.#db.transaction(storeNames, "readwrite");
        const stores = this.#getObjectStore(storeNames, "readwrite", transaction);

        try {
            if (options.beforePut) {
                await options.beforePut(data, stores);
            }

            const results = await Promise.all(
                storeNames.map(async (storeName) => {
                    const store = stores[storeName];
                    const storeData = options.stores[storeName](data);

                    try {
                        await this.#exec(store.put(storeData));
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
                await options.afterPut(data, stores, results);
            }

            return options.allowPartialSuccess
                ? results.some((success) => success)
                : results.every((success) => success);
        } catch (error) {
            transaction.abort();
            console.error("Error putting data:", error);
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

        const transaction = this.#db.transaction(storeNames, "readwrite");
        const stores = this.#getObjectStore(storeNames, "readwrite", transaction);

        try {
            if (options.beforeDelete) {
                await options.beforeDelete(key, stores);
            }

            const results = await Promise.all(
                storeNames.map(async (storeName) => {
                    const store = stores[storeName];
                    try {
                        await this.#exec(store.delete(key));
                        return true;
                    } catch (error) {
                        if (options.allowPartialSuccess) {
                            return false;
                        }
                        throw error;
                    }
                })
            );

            if (options.afterDelete) {
                await options.afterDelete(key, stores, results);
            }

            return options.allowPartialSuccess
                ? results.some((success) => success)
                : results.every((success) => success);
        } catch (error) {
            transaction.abort();
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
