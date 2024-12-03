/**
 * @fileoverview The content script for the extension.
 *
 * This script is responsible for detecting and processing `.txt` files opened in the browser.
 * It extracts the content from the file, converts it to Base64, and sends it to the extension's background script.
 */
(async function () {
    /**
     * Get the extension API
     */
    const api = chrome || browser;

    /**
     * Define the regex pattern for `.txt` files
     */
    const txtFileRegex = /^file:\/\/.*\/[^\/]+\.txt(?:\?.*|#.*|$)/;

    /**
     * Check if the current URL matches the `.txt` file pattern
     */
    if (txtFileRegex.test(location.href)) {
        const fileUrl = location.href;

        try {
            // Prevent the page from being rendered, but allow the content to be loaded
            document.documentElement.style.display = "none";
            document.documentElement.style.visibility = "hidden";
            document.documentElement.style.opacity = "0";

            if (document.readyState !== "complete") {
                await new Promise((resolve) => {
                    document.addEventListener("DOMContentLoaded", resolve, { once: true });
                });
            }

            // Ensure valid content
            if (!document.body && !document.documentElement) {
                throw new Error("Document not ready");
            }

            // Retrieve content from pre tag (Firefox/Chrome usually puts txt file content in pre tag)
            const content =
                document.querySelector("pre")?.textContent ||
                document.body?.textContent ||
                document.documentElement?.textContent;

            if (!content) {
                throw new Error("No content found");
            }

            const fileName = decodeURIComponent(fileUrl.split("/").pop());

            // Convert content to Base64
            const encoder = new TextEncoder();
            const uint8Array = encoder.encode(content);
            const base64Content = btoa(
                Array.from(uint8Array)
                    .map((byte) => String.fromCharCode(byte))
                    .join("")
            );

            // Directly send replaceCurrentTab message
            api.runtime.sendMessage({
                action: "replaceCurrentTab",
                fileName,
                fileType: "text/plain",
                fileContent: base64Content,
            });
        } catch (error) {
            console.error("Failed to process the text file:", error);
        }
    }
})();
