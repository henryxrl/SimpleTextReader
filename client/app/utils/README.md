# Utils Directory

The `utils/` directory contains small, reusable helper functions and utility modules that provide common functionality across the application. These utilities are designed to be lightweight, modular, and independent of specific features.

---

## Contents

### 1. `base.js`

**Purpose**: Contains foundational utility functions that are widely applicable across the application.

**Examples**:

- General-purpose helper methods.

- Core functions for debugging or performance enhancements.

---

### 2. `helpers-bookshelf.js`

**Purpose**: Provides helper functions for managing bookshelf-related functionality.

**Examples**:

- Sorting and filtering books on the bookshelf.

- Utility methods for accessing or modifying bookshelf metadata.

---

### 3. `helpers-fonts.js`

**Purpose**: Includes utility functions for font validation and management.

**Examples**:

- Font file format validation (TTF/OTF).

- Font rendering validation for both English and Chinese characters.

---

### 4. `helpers-reader.js`

**Purpose**: Includes utility functions specific to the text reader functionality.

**Examples**:

- Navigating between pages in the reader.

- Managing reading progress or bookmarks.

---

### 5. `helpers-server.js`

**Purpose**: Includes utility functions specific to API communication and file handling with the backend.

**Examples**:

- Making authenticated API requests.

- Converting web sources to File objects.

---

### 6. `helpers-settings.js`

**Purpose**: Provides utility functions for managing user settings.

**Examples**:

- Loading and saving settings to local storage.

- Default value initialization for settings.

---

### 7. `helpers-ui.js`

**Purpose**: Focuses on UI-related helper functions.

**Examples**:

- DOM manipulation utilities.

- Animations or style adjustments.

---

### 8. `helpers-worker.js`

**Purpose**: Provides utility functions for creating and managing Web Workers and handling module imports in different environments.

**Examples**:

- Creating workers with proper URL handling for both web and extension environments.

- Managing module imports with correct path resolution.

- Detecting and handling browser extension environments.

- Providing consistent worker creation across different browser platforms.

---

## Best Practices

1. **Keep Functions Small and Focused**:

    - Each utility should perform a single, well-defined task.

2. **Avoid Feature-Specific Logic**:

    - Place feature-specific helpers in the corresponding module (e.g., `modules/features/`) rather than in `utils/`.

3. **Reuse Where Possible**:

    - Consolidate common patterns into reusable utilities to reduce duplication across the codebase.

4. **Document Functions**:
    - Include inline comments and examples for complex or non-intuitive utilities.

---

## Notes

- Utilities in this directory should not have side effects or depend on other modules unless absolutely necessary.

- If a utility grows in complexity or becomes tightly coupled with a specific module, consider moving it to the relevant `modules/` subdirectory.
