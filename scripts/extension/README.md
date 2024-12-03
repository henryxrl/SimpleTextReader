# Extension Directory

The `extension/` directory contains the core scripts for handling the functionality of this browser extension. These scripts enable the extension to replace the default behavior of opening `.txt` files in the browser with a custom interface. This allows users to seamlessly view and interact with `.txt` files using the extension's custom features.

---

## Overview

The directory contains the following two files:

### 1. **`activate.js`**

**Purpose**:  
Handles extension-related background tasks, including intercepting messages from content scripts and managing tab updates to display the custom interface.

**Key Functionalities**:

- **Browser Action**:
  - Opens the `index.html` page when the extension icon is clicked.
  - Supports both Chrome Manifest V3 and Firefox Manifest V2.
- **Tab Replacement**:
  - Replaces the current tab (when a `.txt` file is detected) with the extension's `index.html` page.
  - Transfers the file's content and metadata (e.g., filename, file type) to the newly loaded `index.html` page.
- **Message Handling**:
  - Listens for messages from `contentScript.js` to manage file processing and tab updates.
  - Converts `.txt` file content into Base64 format for safe transmission between scripts.

**Dependencies**:

- Uses the `chrome` or `browser` API, depending on the browser environment.
- Relies on storage APIs (`api.storage.local`) to handle intermediate state.

---

### 2. **`contentScript.js`**

**Purpose**:  
Interacts with `.txt` files opened directly in the browser (`file://` URLs), extracts their content, and sends it to `activate.js` for processing.

**Key Functionalities**:

- **File Detection**:
  - Monitors the browser's current URL and detects `.txt` files using a regex pattern (`file://...*.txt*`).
- **Content Extraction**:
  - Extracts the `.txt` file content, ensuring it supports various browser implementations (e.g., files rendered in `<pre>` tags or as plain text).
  - Encodes the content into Base64 format to ensure safe transmission.
- **Tab Replacement**:
  - Sends a message (`replaceCurrentTab`) to `activate.js` to replace the current tab with `index.html`.
  - Passes the extracted file content, filename, and metadata to the background script for further processing.
- **Browser Compatibility**:
  - Designed to work seamlessly in both Chrome (MV3) and Firefox (MV2).

---

## Workflow

1. **Opening `.txt` Files**:
   - When a user drags or opens a `.txt` file in the browser (e.g., `file://path/to/file.txt*`), `contentScript.js` detects the file URL and extracts its content.

2. **Content Processing**:
   - `contentScript.js` encodes the content into Base64 and sends it to `activate.js` along with the filename and file type.

3. **Tab Replacement**:
   - `activate.js` replaces the current tab with the extension's `index.html` page.
   - It then passes the extracted file details (content, name, and type) to `index.html` for rendering.

4. **Rendering**:
   - The file content is processed and displayed in the custom interface provided by `index.html`.

---

## Browser Compatibility

- **Chrome**: Fully supports Manifest V3.
- **Firefox**: Fully supports Manifest V2.

---

## Notes

1. **Custom Behavior**:
   - This extension replaces the default `.txt` file viewer in the browser with a custom viewer.
   - The extension ensures compatibility with files opened directly via `file://*.txt*` URLs.

2. **Supported Features**:
   - Handles large `.txt` files efficiently.
   - Supports various text encodings (e.g., UTF-8, ASCII, Chinese characters).

3. **Known Limitations**:
   - The current implementation depends on browser-specific APIs and permissions.
   - Certain edge cases (e.g., malformed `.txt` URLs or extremely large files) may require additional optimization.
