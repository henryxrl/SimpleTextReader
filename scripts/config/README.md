# config Directory

The `config/` directory contains configuration files and constants that define global settings, variables, and shared configurations used throughout the application.

---

## Contents

### 1. `constants.js`

**Purpose**: Stores immutable global constants that are used across the application.

**Examples**:

- API endpoints

- Default configuration values

- Error messages

---

### 2. `index.js`

**Purpose**: Entry point for exporting and centralizing all configuration files in this directory.

**Examples**:

    ```javascript
    import constants from "./constants.js";
    import variables from "./variables.js";

    export { constants, variables };
    ```

---

### 3. `variables.js`

**Purpose**: Contains dynamic global variables that can change during runtime or be initialized at startup.

**Examples**:

- Flags for enabling/disabling features

- User preferences loaded from storage

---

### 4. `variables-dom.js`

**Purpose**: Defines DOM-related variables or references to key elements in the application.

**Examples**:

- IDs or classes for frequently accessed DOM elements

- Predefined CSS selectors

---

## Notes

**Usage**: These files should not contain any business logic. They are strictly for defining and organizing configurations.

**Maintenance**: Ensure that constants and variables are well-documented within the files to improve code readability and maintainability.

**Best Practices**:

- Keep constants immutable and avoid mixing them with dynamic variables.

- Use descriptive names to make the purpose of each variable clear.
