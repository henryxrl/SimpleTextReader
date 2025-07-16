# Shared Directory

The `shared/` directory contains reusable code that can be utilized by both the frontend and backend of the application. It is structured to promote modularity, maintainability, and adaptability across different environments. Each subdirectory is focused on a specific purpose, ensuring clarity and scalability.

---

## Structure Overview

### 1. `adapters/`

**Purpose**: Provides environment-specific adapters to handle differences in imports and dependencies, ensuring compatibility between the frontend and backend.

**Examples**:

- **`jchardet.js`**: Adapts the `jchardet` library for character encoding detection, ensuring it works seamlessly across different environments.
- **`text-decoder.js`**: Implements a consistent text decoder interface for use in both browser and Node.js environments.

---

### 2. `config/`

**Purpose**: Centralizes configuration and shared constants that are used across the frontend and backend.

**Examples**:

- **`shared-config.js`**: Contains shared constants, API configurations, and settings required by both environments, ensuring consistent behavior.

---

### 3. `core/`

**Purpose**: Implements core algorithms and logic that are fundamental to the application's functionality. These algorithms are reusable and designed to work across different environments.

**Examples**:

- **`callback/`**:

  - **`callback-registry.js`**: Provides a generic, shared callback registry for registering, managing, and invoking callback functions by topic. Enables consistent, decoupled event-style behavior for any feature across both frontend and backend environments.

- **`file/`**:

  - **`file-processor-core.js`**: Provides the base logic for processing files, such as parsing, validation, and metadata extraction.

- **`text/`**:

  - **`bracket-processor.js`**: Processes and normalizes text brackets to ensure consistent formatting.
  - **`pagination-calculator.js`**: Provides algorithms for calculating pagination in long-form text, allowing efficient navigation.
  - **`regex-rules.js`**: Defines reusable regular expressions for parsing and identifying text patterns.
  - **`text-processor-core.js`**: Handles the main text processing logic, such as splitting, cleaning, and preparing text for display.
  - **`title-pattern-detector.js`**: Extracts patterns in titles, such as chapter headings, adapting dynamically to different text structures.

---

### 4. `utils/`

**Purpose**: Provides utility functions and helper modules that are shared between frontend and backend environments.

**Examples**:

- **`logger.js`**: A unified logging system that:
  - Provides consistent logging across frontend and backend
  - Supports different log levels (debug, info, warn, error)
  - Includes stack trace and caller information
  - Adapts output format based on environment
  - Allows enabling/disabling logging per module

---

### 5. `package.json`

**Purpose**: Defines the module system and configuration for the client directory.

**Key Configurations**:

- `"type": "module"` - Specifies that all JavaScript files in this directory and its subdirectories should be treated as ES modules
- Ensures consistent module resolution across different environments (development, production, Docker)

**Notes**:

- Required for proper ES module imports in modern JavaScript
- Maintains compatibility with the server-side module system
- Enables consistent behavior between local development and containerized environments

---

## Best Practices

1. **Environment-Agnostic Logic**:
   - All code in the `shared/` directory should be free from platform-specific dependencies.
   - Use the `adapters/` subdirectory to abstract away platform-specific logic.

2. **Centralized Configurations**:
   - Manage shared settings and constants in the `config/` directory to ensure consistency between the frontend and backend.

3. **Reusable Algorithms**:
   - Place reusable logic, such as file and text processing, in `core/` and `text/` to avoid duplication across the project.

4. **Documentation**:
   - Each subdirectory should have a `README.md` explaining its purpose and providing examples of its contents.

---

## Notes

- The `shared/` directory is a critical part of the project, enabling code reuse and consistency across the application.
- Any new shared logic should be added to the appropriate subdirectory or a new one, with clear documentation of its purpose and usage.
