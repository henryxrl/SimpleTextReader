# Manifests Directory

The `manifests/` directory contains the configuration files required for various platforms and environments to recognize and interact with the application. These manifest files define essential metadata, permissions, and behaviors, ensuring compatibility with browsers, progressive web apps (PWA), and other platforms.

---

## Structure Overview

### 1. `Chrome/`

**Purpose**: Contains manifest files for Chrome-specific extensions.

**Examples**:

- `manifest.json`: Defines the extension's metadata, permissions, content scripts, and background processes.

---

### 2. `Firefox/`

**Purpose**: Contains manifest files for Firefox-specific extensions.

**Examples**:

- `manifest.json`: Specifies the extension's metadata, permissions, and compatibility settings for Firefox.

---

### 3. `PWA/`

**Purpose**: Contains the manifest file for the Progressive Web App (PWA) version of the application.

**Examples**:

- `manifest.json`: Provides metadata for the PWA, such as the app's name, icons, start URL, and display properties (e.g., standalone, full-screen).

---

## Best Practices

1. **Separation by Platform**:

    - Each platform has its dedicated folder for better organization and ease of management.

    - Ensure that the contents of `manifest.json` files align with the platform's requirements and guidelines.

2. **Consistency**:

    - Use consistent metadata across all platforms (e.g., name, description, and icons) to ensure brand alignment.

3. **Validation**:

    - Use appropriate tools to validate manifest files for each platform. For example:
        - Chrome: [Chrome Extension Validator](https://chrome.google.com/webstore/devconsole)
        - Firefox: [Firefox Add-ons Validator](https://addons.mozilla.org/en-US/developers/)

4. **Updates**:

    - Regularly update the manifests to match any changes in platform policies or application features.

---

## Notes

- The `manifests/` directory is crucial for cross-platform support and compatibility.

- Each `manifest.json` file should be kept up-to-date to reflect any new application features or platform-specific requirements.

- Refer to platform-specific documentation for guidance on creating and maintaining manifest files:
  - [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
  - [Firefox Extension Docs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
  - [PWA Manifest Docs](https://developer.mozilla.org/en-US/docs/Web/Manifest)
