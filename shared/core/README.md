# Core Directory

The `core/` directory contains foundational logic for file handling and text processing. These subdirectories house reusable, environment-agnostic algorithms essential for the application's functionality.

---

## Subdirectories

### 1. `callback/`

**Purpose**: Provides a generic, topic-based callback registry for decoupled event-style logic across the application.

**Examples**:

- **`callback-registry.js`**:
  Implements a shared callback registry, allowing modules to register, unregister, and invoke callback functions by topic. Supports both chaining (pipeline) and parallel invocation, and works seamlessly across frontend and backend environments.

---

### 2. `file/`

**Purpose**: Handles file-related logic, such as processing and loading files into the application.

**Examples**:

- **`file-processor-core.js`**:  
  Provides the core logic for processing files, including validating file contents, extracting metadata, and preparing files for further processing.

---

### 3. `text/`

**Purpose**: Responsible for text parsing, processing, and rendering logic.

**Examples**:

- **`bracket-processor.js`**:  
  Parses and processes different types of brackets (paired or unpaired), ensuring proper text formatting and normalization.

- **`pagination-calculator.js`**:  
  Calculates and manages pagination for text content, enabling smooth and efficient navigation in readers.

- **`regex-rules.js`**:  
  Stores and manages reusable regular expressions for parsing, cleaning, and identifying patterns in text.

- **`text-processor-core.js`**:  
  Provides centralized logic for text processing, including splitting, cleaning, and preparing text for display.

- **`title-pattern-detector.js`**:  
  Dynamically identifies and extracts chapter title patterns, adapting to varying text structures for accurate chapter recognition.

---

## Best Practices

1. **Environment-Agnostic Logic**:
   - Ensure that all logic in the `core/` directory remains free of platform-specific dependencies.

2. **Reusability**:
   - Reuse and extend the modules in the `file/` and `text/` subdirectories across both frontend and backend implementations.

3. **Documentation**:
   - Each subdirectory should include inline comments and maintain clear documentation for its core functionalities.

---

## Notes

- The `core/` directory is integral to the application's shared functionality, focusing on reusable and consistent logic for file and text operations.
- Any foundational logic that applies broadly across the project should reside in this directory.
- Avoid mixing non-core or environment-specific logic here to maintain modularity and simplicity.
