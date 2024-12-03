# Script Directory

The `script/` directory contains all JavaScript and related scripts that power the application. This directory is organized into subdirectories and a main entry point to promote modularity, maintainability, and clarity.

---

## Structure Overview

### 1. `main.js`

**Purpose**: The main entry point for the application.

**Responsibilities**:

- Initializes the application by orchestrating configurations, modules, and features.

- Serves as the starting point for execution when the project is loaded.

**Notes**:

- Ensure all necessary dependencies are imported here.

- Avoid adding feature-specific logic; delegate it to the appropriate modules.

---

### 2. `config/`

**Purpose**: Contains global configuration files that define constants, variables, and shared settings.

**Examples**:

- `constants.js`: Immutable global constants (e.g., API endpoints, default settings).

- `variables.js`: Dynamic variables initialized at runtime.

- `variables-dom.js`: DOM-related constants or variables.

---

### 3. `lib/`

**Purpose**: Contains third-party libraries and rewritten utilities integrated into the project.

**Examples**:

- `css-global-variables.js`: A rewritten utility for sharing variables between CSS and JS.

- `jquery.min.js`: Minified jQuery library.

- `yaireo/`: Libraries for color picking and DOM positioning.

---

### 4. `modules/`

**Purpose**: Houses the core application logic, structured into submodules for clarity and scalability.

**Subdirectories**:

- `components/`: Reusable UI components like dropdowns and color pickers.

- `features/`: High-level features such as the bookshelf and reader.

- `file/`: Logic for handling file inputs and processing.

- `text/`: Text-related logic, including parsing, processing, and pagination.

---

### 6. `utils/`

**Purpose**: Provides reusable helper functions for common operations across the application.

**Examples**:

- `helpers-ui.js`: Utility functions for UI-related tasks.

- `helpers-reader.js`: Functions for managing reading progress and navigation.

---

## Best Practices

1. **Entry Point (`main.js`)**:

    - Keep `main.js` concise and focused on initialization.

    - Delegate feature-specific or logic-heavy tasks to the appropriate modules.

2. **Modularity**:

    - Each subdirectory serves a specific purpose, ensuring clean separation of concerns.

3. **Documentation**:

    - Use inline comments for non-obvious logic and `README.md` files for detailed explanations of subdirectories.

4. **Consistency**:

    - Follow consistent naming conventions and adhere to established patterns for adding new scripts.

5. **Reuse and Refactor**:
    - Avoid duplicating logic by utilizing helper functions in `utils/` or reusable components in `modules/components/`.

---

## Notes

- The `script/` directory is the backbone of the application’s functionality.

- Refer to the `README.md` files in each subdirectory for more detailed explanations and usage guidelines.
