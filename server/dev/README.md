# Dev Directory

The `dev/` directory contains development-time scripts and build utilities. These scripts are used for tasks such as asset generation, testing, measurement, or other automation required during the development and build process, but **are not included in production deployment**.

---

## Purpose

- Provides tools and scripts to streamline and automate development workflows.
- Houses utilities for generating assets (e.g., font metrics), diagnostics, or project maintenance.
- Keeps build-time logic and developer tools separate from production application code.

---

## Structure Overview

### 1. `measure_font_baselines.js`

**Purpose**:  
Measures the baseline offset of all supported fonts for accurate vertical alignment in the application.

**Responsibilities**:

- Starts a temporary static server to serve font and CSS assets from the project.
- Launches a headless browser (via Puppeteer) to render text in each font and calculates its vertical offset from a reference font.
- Outputs the normalized offsets to a JSON file used by the application for precise font rendering.

**Notes**:

- Not required at runtime; intended to be run as a build step or when updating font assets.
- Supports both headless and debug (browser-visible) modes for troubleshooting.

---

## Best Practices

1. **Script Documentation**:  
   Each script should include file-level comments or JSDoc explaining its usage, configuration, and output.

2. **Non-Production**:  
   Scripts in `dev/` should not be required or imported by production code.

3. **Automation**:  
   Use these scripts as part of automated build or asset-generation pipelines where possible.

4. **Organization**:  
   Keep each script focused on a single, well-defined responsibility. Add subfolders if multiple related dev tools are added.

---

## Notes

- The `dev/` directory is for developer-facing tools only. End-users and production deployments do **not** depend on any code here.
- For details about each script, refer to in-file comments or the command-line help/usage instructions.
