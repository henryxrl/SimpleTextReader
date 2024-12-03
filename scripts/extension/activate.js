/**
 * @fileoverview The entry point for the extension.
 *
 * This script handles the initialization and event listeners for the extension.
 */
(function () {
    /**
     * Get the extension API
     */
    const api = typeof chrome !== "undefined" ? chrome : typeof browser !== "undefined" ? browser : null;
    if (!api || !api.storage || !api.storage.local) {
        console.error("Extension API not available");
        return;
    }

    /**
     * Add listener for the extension icon click event
     */
    const addOnClickedListener = () => {
        if (api.action && api.action.onClicked) {
            api.action.onClicked.addListener(() => {
                api.tabs.create({
                    url: api.runtime.getURL("index.html"),
                    active: true,
                });
            });
        } else if (api.browserAction && api.browserAction.onClicked) {
            api.browserAction.onClicked.addListener(() => {
                api.tabs.create({
                    url: api.runtime.getURL("index.html"),
                    active: true,
                });
            });
        } else {
            console.error("Unsupported extension API.");
        }
    };

    /**
     * Add listener for the extension message event
     */
    const addMessageListener = () => {
        api.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === "replaceCurrentTab") {
                const currentTabId = sender.tab.id;

                api.storage.local.set({ openedAsNoUI: true }, () => {
                    api.tabs.update(
                        currentTabId,
                        {
                            url: api.runtime.getURL("index.html"),
                        },
                        (tab) => {
                            const sendFileToTab = (tabId) => {
                                api.storage.local.remove("openedAsNoUI");
                                api.tabs.sendMessage(tabId, {
                                    action: "loadFile",
                                    fileName: message.fileName,
                                    fileType: message.fileType,
                                    fileContent: message.fileContent,
                                });
                            };

                            if (api.tabs.onUpdated) {
                                const listener = (tabId, changeInfo) => {
                                    if (tabId === tab.id && changeInfo.status === "complete") {
                                        setTimeout(() => {
                                            sendFileToTab(tabId);
                                        }, 500);
                                        api.tabs.onUpdated.removeListener(listener);
                                    }
                                };
                                api.tabs.onUpdated.addListener(listener);
                            } else {
                                sendFileToTab(tab.id);
                            }
                        }
                    );
                });
                sendResponse({ success: true });
                return true;
            }
        });
    };

    /**
     * Initialize the extension
     */
    const initialize = () => {
        addOnClickedListener();
        addMessageListener();
    };

    initialize();
})();
