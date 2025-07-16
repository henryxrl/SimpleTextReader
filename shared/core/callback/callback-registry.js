/**
 * @fileoverview Generic callback registry module with advanced features:
 * - Async+sync support (always returns a Promise)
 * - Error handling (stop or continue on error, per-callback error hook)
 * - Priorities (higher first)
 * - Once-only callbacks
 * - Token/id for easy deregistration
 * - Namespace support
 * - Deregister by function, token, or namespace
 * - Wildcard topic firing (experimental)
 *
 * This module provides a flexible, lightweight event-like system: you can
 * register callbacks (“listeners”) to named topics (like “events”) and fire
 * them (“emit”) from anywhere in your codebase. It serves as a general-purpose
 * event bus or signal/notification system for application logic, background
 * tasks, or state management.
 *
 * While its API and usage resemble classic event emitter patterns, it is **not**
 * a replacement for native browser events or DOM event listeners. Use standard
 * event APIs (like `addEventListener`) for UI interactions, user input, or
 * system/browser events.
 *
 * Aliases for concise API:
 *   add   → register
 *   once  → registerOnce
 *   rm    → deregister
 *   clear → deregisterAll
 *   go    → fire
 *   ls    → topics
 *   get   → getCallbacks
 *   sum   → summary
 *
 * @module shared/core/callback/callback-registry
 *
 * @example
 * // Register with priority, once-only, namespace, label
 * const token = cbReg.add("myTopic", async (v) => v + 1, {
 *     priority: 10,
 *     namespace: "main",
 *     label: "incrementer",
 * });
 * cbReg.once("myTopic", (v) => v * 2, { priority: 20, namespace: "plugins", label: "doubler" });
 *
 * // Fire as a chain (pipeline: left-to-right)
 * let out = await cbReg.go("myTopic", 1); // (1 * 2) + 1 = 3
 *
 * // Fire as a chain, with full trace
 * let { result: out2, trace } = await cbReg.go("myTopic", 1, { trace: true });
 * // out2: 3; trace: [{result:2, error:null, fnLabel: 'doubler', ...}, {result:3, error:null, fnLabel: 'incrementer', ...}]
 *
 * // Fire all, parallel (collect all results, does not chain)
 * let results = await cbReg.go("myTopic", 1, { chain: false });
 * // results: [{result:2, error:null, fnLabel: ..., ...}, {result:2, error:null, fnLabel: ..., ...}]
 *
 * // Deregister by token, function, or namespace
 * cbReg.rm("myTopic", token);
 * cbReg.clear({ namespace: "plugins" });
 *
 * // Error handling (stop on error)
 * cbReg.add("fail", () => {
 *     throw new Error("fail!");
 * });
 * try {
 *     await cbReg.go("fail", null);
 * } catch (e) {
 *     // e._callbackMeta will include: {topic, index, fnName, fnLabel, ...}
 *     console.error("Caught error!", e, e._callbackMeta);
 * }
 *
 * // Continue on error, and handle with onError
 * await cbReg.go("fail", null, {
 *     stopOnError: false,
 *     onError: (err, cb, val, meta) =>
 *         console.warn(`Error in topic "${meta.topic}" [#${meta.index}] (${meta.fnLabel}):`, meta, err),
 * });
 */

/**
 * @typedef {Object} CallbackOptions
 * @property {number} [priority=0]    - Higher priorities run first.
 * @property {boolean} [once=false]   - If true, callback is removed after first run.
 * @property {string} [namespace=""]  - Group for easy mass-deregistration.
 * @property {string} [label]         - Optional human-readable label for the callback (for debugging).
 */

/**
 * @typedef {Object} FireOptions
 * @property {boolean} [chain=true]        - If true, pipeline (chain) callbacks, otherwise parallel.
 * @property {boolean} [stopOnError=true]  - If true, stop on first error, else continue all.
 * @property {function} [onError]          - Handler called for each error: (error, callbackRecord, value, meta).
 * @property {boolean} [wildcard=false]    - Fire all topics matching a wildcard (e.g., "foo*").
 * @property {boolean} [trace=false]       - (Chaining mode) If true, return {result, trace} instead of just value.
 */

/**
 * @typedef {Object} CallbackRecord
 * @property {Function} fn
 * @property {number} priority
 * @property {boolean} once
 * @property {string} namespace
 * @property {symbol} token
 * @property {string} fnLabel   - Human-readable label for the callback (name, location, or user label)
 */

/**
 * Class representing an advanced callback registry.
 */
class CallbackRegistry {
    /** @type {Object<string, Array<CallbackRecord>>} */
    #topics = {};

    /** @returns {symbol} Unique token for a callback. */
    #uniqueToken() {
        return Symbol();
    }

    /** Pretty-print function for debug labeling. */
    #prettyLabel(fn, label) {
        if (label) return label;
        if (fn.name && fn.name !== "anonymous") return fn.name;
        // Try to stringify, fallback to [anonymous]
        let s = fn.toString();
        // First line only, trimmed
        s = s.split("\n")[0].trim();
        if (s.length > 64) s = s.slice(0, 64) + "…";
        // If in dev tools, try to guess file info (not 100% reliable)
        return s || "[anonymous]";
    }

    /**
     * Register a callback to a topic.
     * @param {string} topic - Name of the topic.
     * @param {Function} fn - The callback function.
     * @param {CallbackOptions} [opts] - Registration options.
     * @returns {symbol} Token for later deregistration.
     *
     * @example
     * const token = cbReg.register("fileBefore", async f => { ... }, {priority: 10, namespace: "core"});
     */
    register(topic, fn, { priority = 0, once = false, namespace = "", label } = {}) {
        if (typeof fn !== "function") return null;
        if (!this.#topics[topic]) this.#topics[topic] = [];
        const token = this.#uniqueToken();
        const fnLabel = this.#prettyLabel(fn, label);
        this.#topics[topic].push({ fn, priority, once, namespace, token, fnLabel });
        this.#topics[topic].sort((a, b) => b.priority - a.priority); // Highest priority first
        return token;
    }

    /**
     * Register a callback that is removed after first invocation.
     * @param {string} topic - Name of the topic.
     * @param {Function} fn - Callback function.
     * @param {CallbackOptions} [opts] - Options (priority, namespace, label).
     * @returns {symbol} Token for later deregistration.
     */
    registerOnce(topic, fn, opts = {}) {
        return this.register(topic, fn, { ...opts, once: true });
    }

    /**
     * Deregister callback(s) from a topic.
     * Pass the function, token, or {namespace}.
     * @param {string} topic - Topic name.
     * @param {Function|symbol|Object} what - Callback, token, or {namespace}.
     *
     * @example
     * cbReg.deregister("fileBefore", myFn);
     * cbReg.deregister("fileBefore", token);
     * cbReg.deregister("fileBefore", {namespace: "plugins"});
     */
    deregister(topic, what) {
        if (!this.#topics[topic]) return;
        if (typeof what === "function") {
            this.#topics[topic] = this.#topics[topic].filter((r) => r.fn !== what);
        } else if (typeof what === "symbol") {
            this.#topics[topic] = this.#topics[topic].filter((r) => r.token !== what);
        } else if (typeof what === "object" && what.namespace) {
            this.#topics[topic] = this.#topics[topic].filter((r) => r.namespace !== what.namespace);
        }
    }

    /**
     * Deregister all callbacks from a topic, from all topics, or by namespace.
     * @param {string|Object} [topicOrNs] - Topic string, or {namespace: ...}, or omitted for all topics.
     *
     * @example
     * cbReg.deregisterAll("fileBefore"); // Only "fileBefore"
     * cbReg.deregisterAll({namespace: "plugins"}); // All topics, only "plugins"
     * cbReg.deregisterAll(); // Everything
     */
    deregisterAll(topicOrNs) {
        if (!topicOrNs) {
            this.#topics = {};
        } else if (typeof topicOrNs === "string" && this.#topics[topicOrNs]) {
            delete this.#topics[topicOrNs];
        } else if (typeof topicOrNs === "object" && topicOrNs.namespace) {
            for (const topic of Object.keys(this.#topics)) {
                this.#topics[topic] = this.#topics[topic].filter((r) => r.namespace !== topicOrNs.namespace);
            }
        }
    }

    /**
     * Fire all callbacks for a topic (or multiple if wildcard).
     *
     * @param {string} topic - Name of the topic.
     * @param {*} value - Initial value (for chaining), or value for all (parallel).
     * @param {FireOptions} [opts] - Fire options.
     * @returns {Promise<*>|Promise<Array<{result, error, topic, index, namespace, fnName, fnLabel, priority, token}>>|Promise<{result, trace: Array<{result, error, topic, index, namespace, fnName, fnLabel, priority, token}>}>}
     *
     * - **Chaining mode (chain:true, default):**
     *     - If `trace:false` (default): Returns the final value after passing through all callbacks (`result`).
     *     - If `trace:true`: Returns `{ result, trace }` where `result` is the final value, and `trace` is an array of detailed trace info for each callback.
     * - **Parallel mode (chain:false):**
     *     - Returns an array: `[{result, error, topic, ...}, ...]` for all callbacks, in order of priority.
     *
     * Each `trace`/result entry includes:
     * - result: callback result (if successful)
     * - error: error object (if failed)
     * - topic: topic name (string)
     * - index: callback index within topic (0 = highest priority)
     * - namespace: callback namespace (string)
     * - fnName: callback function name, if any
     * - fnLabel: human-friendly label for the function
     * - priority: callback priority (number)
     * - token: callback token (symbol)
     *
     * @example
     * // Chaining pipeline (default)
     * let value = await cbReg.fire("fileBefore", 1); // e.g., 3
     * let {result, trace} = await cbReg.fire("fileBefore", 1, {trace:true}); // {result:3, trace:[...]}
     *
     * // Parallel mode (no chaining)
     * let results = await cbReg.fire("settingsReady", undefined, {chain: false});
     * // results: [{result, error, topic, index, fnLabel, ...}, ...]
     *
     * // Error reporting (in onError handler)
     * await cbReg.fire("fail", null, {
     *   stopOnError: false,
     *   onError: (err, cbRec, val, meta) => {
     *     console.warn(`Error in topic "${meta.topic}" [#${meta.index}]`, {
     *       fnLabel: meta.fnLabel, fnName: meta.fnName, namespace: meta.namespace, priority: meta.priority, token: meta.token, err
     *     });
     *   }
     * });
     */
    async fire(topic, value, opts = {}) {
        const { chain = true, stopOnError = true, onError = null, wildcard = false, trace = false } = opts;
        let topicsToFire = [topic];
        if (wildcard && topic.includes("*")) {
            const re = new RegExp("^" + topic.replace(/\*/g, ".*") + "$");
            topicsToFire = Object.keys(this.#topics).filter((t) => re.test(t));
        }
        let results = [];
        let lastValue = value;
        for (const t of topicsToFire) {
            const callbacks = (this.#topics[t] || []).slice(); // Copy for safety
            if (!callbacks.length) continue;
            if (chain) {
                let current = lastValue;
                for (let i = 0; i < callbacks.length; i++) {
                    const r = callbacks[i];
                    const meta = {
                        topic: t,
                        index: i,
                        namespace: r.namespace,
                        fnName: r.fn.name || "(anonymous)",
                        fnLabel: r.fnLabel,
                        priority: r.priority,
                        token: r.token,
                    };
                    try {
                        let result = await Promise.resolve(r.fn(current));
                        if (typeof result !== "undefined") current = result;
                        results.push({ ...meta, result, error: null });
                        if (r.once) this.deregister(t, r.token);
                    } catch (error) {
                        if (onError) onError(error, r, current, meta);
                        results.push({ ...meta, result: null, error });
                        if (r.once) this.deregister(t, r.token);
                        if (stopOnError) {
                            if (trace) return { result: current, trace: results };
                            // If no trace, rethrow with meta info (so you see topic/index)
                            error._callbackMeta = meta;
                            throw error;
                        }
                    }
                }
                lastValue = current; // for multi-topic wildcard
            } else {
                // Parallel: all callbacks receive the same value, collect all results
                let proms = callbacks.map(async (r, i) => {
                    const meta = {
                        topic: t,
                        index: i,
                        namespace: r.namespace,
                        fnName: r.fn.name || "(anonymous)",
                        fnLabel: r.fnLabel,
                        priority: r.priority,
                        token: r.token,
                    };
                    try {
                        let result = await Promise.resolve(r.fn(value));
                        if (r.once) this.deregister(t, r.token);
                        return { ...meta, result, error: null };
                    } catch (error) {
                        if (onError) onError(error, r, value, meta);
                        if (r.once) this.deregister(t, r.token);
                        if (stopOnError) {
                            error._callbackMeta = meta;
                            throw error;
                        }
                        return { ...meta, result: null, error };
                    }
                });
                let arr = await Promise.all(proms);
                results.push(...arr);
            }
        }
        if (chain) {
            if (trace) return { result: lastValue, trace: results };
            return lastValue;
        }
        return results;
    }

    /**
     * List all registered topic names.
     * @returns {string[]}
     */
    topics() {
        return Object.keys(this.#topics);
    }

    /**
     * Get all registered callback functions for a topic.
     * @param {string} topic - Topic name.
     * @returns {Function[]}
     */
    getCallbacks(topic) {
        return this.#topics[topic] ? this.#topics[topic].map((r) => r.fn) : [];
    }

    /**
     * Get a summary of all topics and callback counts.
     * @returns {Object} e.g. {fileBefore: 2, settingsReady: 1}
     */
    summary() {
        const result = {};
        for (const topic of this.topics()) {
            result[topic] = this.#topics[topic].length;
        }
        return result;
    }
}

/**
 * Aliases for concise API
 */
CallbackRegistry.prototype.add = CallbackRegistry.prototype.register;
CallbackRegistry.prototype.once = CallbackRegistry.prototype.registerOnce;
CallbackRegistry.prototype.rm = CallbackRegistry.prototype.deregister;
CallbackRegistry.prototype.clear = CallbackRegistry.prototype.deregisterAll;
CallbackRegistry.prototype.go = CallbackRegistry.prototype.fire;
CallbackRegistry.prototype.ls = CallbackRegistry.prototype.topics;
CallbackRegistry.prototype.get = CallbackRegistry.prototype.getCallbacks;
CallbackRegistry.prototype.sum = CallbackRegistry.prototype.summary;

/*
 * Global instance, for use in app
 */
export const cbReg = new CallbackRegistry();
