/**
 * @fileoverview DBWorker module for handling database operations in a background worker
 * @module client/app/modules/database/db-worker
 * @requires client/app/utils/helpers-worker
 * @requires shared/utils/logger
 */

/**
 * Worker message handler
 */
self.onmessage = async function (e) {
    const { importDependencies } = await import("../../utils/helpers-worker.js");
    const { type, data } = e.data;
    let logger = null;

    try {
        const [Logger] = await importDependencies(["shared/utils/logger.js"], import.meta.url);

        logger = Logger.getLogger("DBWorker", false);

        logger.log("Worker received message", type);
        logger.log("Payload", data);

        switch (type) {
            case "put":
                try {
                    logger.log("DBWorker put");
                    const { storeName, storeData, dbName, dbVersion } = data;
                    const db = await openDatabase(dbName, dbVersion);
                    const tx = db.transaction(storeName, "readwrite");
                    const store = tx.objectStore(storeName);

                    logger.log("DBWorker put", storeData);

                    await wrapRequest(store.put(storeData));
                    self.postMessage({ type: "success", id: data.id });
                } catch (error) {
                    console.error("DBWorker put error", error);
                    self.postMessage({ type: "error", error: error.message, id: data.id });
                }
                break;

            case "checkSize":
                try {
                    logger.log("DBWorker checkSize");
                    const { data: checkData, threshold } = data;
                    const size = calculateSize(checkData);
                    const needsChunking = size > threshold;

                    logger.log("DBWorker checkSize - before postMessage", {
                        threshold,
                        size,
                        needsChunking,
                    });

                    const message = {
                        type: "success",
                        id: data.id,
                        result: {
                            needsChunking,
                            size,
                        },
                    };

                    logger.log("DBWorker checkSize - message to send", message);

                    self.postMessage(message);

                    logger.log("DBWorker checkSize - after postMessage");
                } catch (error) {
                    console.error("DBWorker checkSize error", error);
                    self.postMessage({
                        type: "error",
                        error: error.message,
                        id: data.id,
                    });
                }
                break;

            case "storeChunks":
                try {
                    logger.log("DBWorker storeChunks");
                    const { data: originalData, chunkSize, key, fieldName, dbName, dbVersion, storeName, size } = data;

                    const db = await openDatabase(dbName, dbVersion);
                    const tx = db.transaction(storeName, "readwrite");
                    const store = tx.objectStore(storeName);

                    const chunkRefs = await storeChunksData(store, key, fieldName, originalData, chunkSize, size);

                    logger.log("DBWorker storeChunks", { chunkRefs });

                    self.postMessage({
                        type: "success",
                        id: data.id,
                        result: chunkRefs,
                    });
                } catch (error) {
                    console.error("DBWorker storeChunks error", error);
                    self.postMessage({ type: "error", error: error.message, id: data.id });
                }
                break;

            case "get":
                try {
                    logger.log("DBWorker get");
                    const { storeNames, key, dbName, dbVersion } = data;
                    const db = await openDatabase(dbName, dbVersion);

                    const results = await Promise.all(
                        storeNames.map(async (storeName) => {
                            const tx = db.transaction(storeName, "readonly");
                            const store = tx.objectStore(storeName);
                            const storeData = await wrapRequest(store.get(key));

                            // Check if there are chunks to be reassembled
                            if (storeData && typeof storeData === "object") {
                                for (const [field, value] of Object.entries(storeData)) {
                                    if (isChunkRefs(value)) {
                                        storeData[field] = await loadChunksData(store, key, field, value);
                                    }
                                }
                            }

                            return {
                                storeName,
                                data: storeData,
                            };
                        })
                    );

                    self.postMessage({ type: "success", id: data.id, result: results });
                } catch (error) {
                    console.error("DBWorker get error", error);
                    self.postMessage({ type: "error", error: error.message, id: data.id });
                }
                break;

            case "delete":
                try {
                    logger.log("DBWorker delete");
                    const { storeNames, key, dbName, dbVersion } = data;
                    const db = await openDatabase(dbName, dbVersion);

                    const results = await Promise.all(
                        storeNames.map(async (storeName) => {
                            const tx = db.transaction(storeName, "readwrite");
                            const store = tx.objectStore(storeName);

                            try {
                                // Get data to check for chunks
                                const storeData = await wrapRequest(store.get(key));

                                // If there are chunks, delete all chunks first
                                if (storeData && typeof storeData === "object") {
                                    for (const [field, value] of Object.entries(storeData)) {
                                        if (isChunkRefs(value)) {
                                            await deleteChunksData(store, key, field, value);
                                        }
                                    }
                                }

                                // Remove the main record
                                await wrapRequest(store.delete(key));
                                return true;
                            } catch (error) {
                                console.error(`Error deleting from ${storeName}`, error);
                                return false;
                            }
                        })
                    );

                    self.postMessage({ type: "success", id: data.id, result: results });
                } catch (error) {
                    console.error("DBWorker delete error", error);
                    self.postMessage({ type: "error", error: error.message, id: data.id });
                }
                break;
        }
    } catch (error) {
        console.error("Worker error:", error);
        console.error("Error stack:", error.stack);
        self.postMessage({
            type: "error",
            id: data?.id,
            error: error.message,
            stack: error.stack,
        });
    }
};

/**
 * Opens a database connection
 * @param {string} name - The name of the database
 * @param {number} version - The version of the database
 * @returns {Promise<IDBDatabase>} A promise that resolves to the database connection
 */
function openDatabase(name, version) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(name, version);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            // Create required object stores
            if (!db.objectStoreNames.contains("bookProcessed")) {
                db.createObjectStore("bookProcessed", { keyPath: "name" });
            }
        };
    });
}

/**
 * Wraps an IDBRequest in a Promise
 * @param {IDBRequest} request - The request to wrap
 * @returns {Promise<any>} A promise that resolves to the result of the request
 */
function wrapRequest(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Checks if the value is a chunk reference array
 * @param {any} value - The value to check
 * @returns {boolean} True if the value is a chunk reference array, false otherwise
 */
function isChunkRefs(value) {
    return (
        Array.isArray(value) &&
        value.length > 0 &&
        value.every((item) => typeof item === "string" && item.startsWith("chunk_"))
    );
}

/**
 * Calculates the size of data
 * @param {any} data - The data to calculate the size of
 * @returns {number} The size of the data
 */
function calculateSize(data) {
    if (data instanceof Blob || data instanceof ArrayBuffer) {
        return data.byteLength || data.size;
    } else if (typeof data === "string") {
        return new Blob([data]).size;
    } else if (Array.isArray(data)) {
        return new Blob([JSON.stringify(data)]).size;
    }
    return 0;
}

/**
 * Stores data in chunks using a single transaction and batch processing
 * @param {IDBObjectStore} store - The object store to store data in
 * @param {string} key - The key to store the data under
 * @param {string} fieldName - The field name to store the data in
 * @param {Array} originalData - The data to store
 * @param {number} chunkSize - The size of each chunk
 * @param {number} [size] - Optional pre-calculated total size
 * @returns {Promise<string[]>} Array of chunk references
 */
async function storeChunksData(store, key, fieldName, originalData, chunkSize, size) {
    // Calculate chunks needed
    const totalSize = size || calculateSize(originalData);
    const numChunks = Math.ceil(totalSize / chunkSize);
    const itemsPerChunk = Math.ceil(originalData.length / numChunks);

    // Prepare all chunks first
    const chunks = new Array(numChunks);
    const chunkRefs = new Array(numChunks);

    for (let i = 0; i < numChunks; i++) {
        const start = i * itemsPerChunk;
        const end = Math.min(start + itemsPerChunk, originalData.length);
        const chunkRef = `chunk_${i + 1}`;
        chunkRefs[i] = chunkRef;

        const chunkData = {};
        const chunkKey = `${key}_${fieldName}_${chunkRef}`;

        if (store.keyPath) {
            chunkData[store.keyPath] = chunkKey;
        }

        // Create chunk array and copy data
        const chunk = new Array(end - start);
        for (let j = 0, k = start; k < end; j++, k++) {
            chunk[j] = originalData[k];
        }
        chunkData[fieldName] = chunk;
        chunks[i] = chunkData;
    }

    // Store chunks in batches to prevent browser from freezing
    const BATCH_SIZE = 5;
    for (let i = 0; i < numChunks; i += BATCH_SIZE) {
        const batchEnd = Math.min(i + BATCH_SIZE, numChunks);
        const putRequests = chunks.slice(i, batchEnd).map((chunkData) => store.put(chunkData));

        // Wait for current batch to complete
        await Promise.all(putRequests.map((request) => wrapRequest(request)));

        // Small pause between batches
        if (i + BATCH_SIZE < numChunks) {
            await new Promise((resolve) => setTimeout(resolve, 0));
        }
    }

    return chunkRefs;
}

/**
 * Loads data from chunks using a single transaction
 * @param {IDBObjectStore} store - The object store to load data from
 * @param {string} key - The key of the data to load
 * @param {string} fieldName - The field name of the data to load
 * @param {string[]} chunkRefs - The chunk references to load
 * @returns {Promise<any[]>} A promise that resolves to the loaded data
 */
async function loadChunksData(store, key, fieldName, chunkRefs) {
    // Create all get requests within the same transaction
    const getRequests = chunkRefs.map((chunkRef) => {
        const chunkKey = `${key}_${fieldName}_${chunkRef}`;
        return store.get(chunkKey);
    });

    // Wait for all requests to complete
    const results = await Promise.all(getRequests.map((request) => wrapRequest(request)));

    // Process results
    let totalLength = 0;
    const chunks = results.map((chunk) => {
        if (chunk && Array.isArray(chunk[fieldName])) {
            totalLength += chunk[fieldName].length;
            return chunk[fieldName];
        }
        return null;
    });

    // Create final array and fill data
    const fullData = new Array(totalLength);
    let currentIndex = 0;

    // Copy data from stored chunks
    for (const chunkData of chunks) {
        if (chunkData) {
            for (let i = 0; i < chunkData.length; i++) {
                fullData[currentIndex + i] = chunkData[i];
            }
            currentIndex += chunkData.length;
        }
    }

    return fullData;
}

/**
 * Deletes data from chunks using a single transaction
 * @param {IDBObjectStore} store - The object store to delete data from
 * @param {string} key - The key of the data to delete
 * @param {string} fieldName - The field name of the data to delete
 * @param {string[]} chunkRefs - The chunk references to delete
 */
async function deleteChunksData(store, key, fieldName, chunkRefs) {
    // Create all delete requests within the same transaction
    const deleteRequests = chunkRefs.map((chunkRef) => {
        const chunkKey = `${key}_${fieldName}_${chunkRef}`;
        return store.delete(chunkKey);
    });

    // Wait for all requests to complete
    await Promise.all(deleteRequests.map((request) => wrapRequest(request)));
}
