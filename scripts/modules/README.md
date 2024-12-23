# Modules Directory

The `modules/` directory contains the core application logic, organized into specific subdirectories to maintain a modular and scalable structure. Each subdirectory represents a distinct area of functionality or responsibility.

---

## Subdirectories

### 1. `components/`

**Purpose**: Contains reusable UI components that are shared across different features or pages.

**Examples**:

- `cover-generator.js`: A utility for generating and visualizing book cover designs.

- `custom-color-picker.js`: A customizable color picker component.

- `dropdown-selector.js`: A dropdown menu component for selecting options.

- `popup-manager.js`: A utility for displaying user-friendly popups and notifications with customizable content and behavior.

---

### 2. `database/`

**Purpose**: Provides tools and abstractions for managing IndexedDB operations, ensuring efficient and reliable data storage and retrieval.

**Examples**:

- `db-manager.js`: The main database module that abstracts complex IndexedDB interactions, including transaction handling, batch operations, and data retrieval.

---

### 3. `features/`

**Purpose**: Houses high-level features or flows of the application. These files typically combine multiple components, utilities, and business logic to implement specific features.

**Examples**:

- `bookshelf.js`: Manages the bookshelf view and its interactions, such as browsing and organizing books.

- `fontpool.js`: Handles custom font management, including user-uploaded fonts and integration with the text display.

- `footnotes.js`: Dynamically generates and manages footnotes for text content, ensuring accurate references.

- `init-webpage.js`: Handles the initial configuration and rendering of the webpage upon loading.

- `reader.js`: Implements the main text-reading functionality, including navigation, font adjustments, and highlighting.

- `settings.js`: Manages user preferences and configuration options, such as theme selection and language settings.

---

### 4. `file/`

**Purpose**: Handles file-related logic, such as processing and loading files into the application.

**Examples**:

- `file-processor.js`: Processes user-uploaded files, preparing them for display and interaction.

- `fileload-callback.js`: Executes specific actions once a file has been successfully loaded.

- `file-processor-worker.js`: Utilizes a worker thread to perform intensive file processing tasks in the background, improving performance.

---

### 5. `text/`

**Purpose**: Responsible for text parsing, processing, and rendering logic.

**Examples**:

- `bracket-processor.js`: Parses and processes different types of brackets (paired or unpaired), ensuring proper text formatting.

- `pagination-calculator.js`: Calculates and manages pagination for text content in the reader, enabling efficient navigation.

- `regex-rules.js`: Defines and manages regular expressions used for parsing, cleaning, and identifying text patterns.

- `text-processor.js`, `text-processor-dom.js`, `text-processor-worker.js`: Process and parse text content, extracting book titles, author names, languages, chapter titles, and removing unnecessary ads or metadata.

- `title-pattern-detector.js`: Identifies and extracts chapter title patterns dynamically, adapting to varying text structures for accurate chapter recognition.

---

## Best Practices

1. **Separation of Concerns**:

    - Keep each subdirectory focused on a specific area of functionality.
    - Avoid mixing unrelated logic within the same module.

2. **Reusability**:

    - Place reusable UI components in `components/` and avoid duplicating code in `features/`.

3. **Scalability**:

    - As the application grows, consider splitting large modules or adding new subdirectories to keep the codebase organized.

4. **Documentation**:

    - Include inline comments and, where necessary, additional documentation for complex modules or logic.

---

## Notes

- The `modules/` directory is the heart of the application, containing both core functionality and high-level features.
- Each subdirectory is designed to be modular, making it easier to debug, extend, or refactor specific parts of the application.
