# Modules Directory

The `modules/` directory contains the core application logic, organized into specific subdirectories to maintain a modular and scalable structure. Each subdirectory represents a distinct area of functionality or responsibility.

---

## Subdirectories

### 1. `api/`

**Purpose**: Manages communication between the client application and backend services, enabling server integration and cloud library functionality.

**Examples**:

- `fetch-worker.js`: A dedicated web worker for handling authenticated file fetching operations in the background, improving performance by offloading network requests from the main thread.

- `server-connector.js`: Handles backend server communication and manages cloud library features.

- `websocket-client.js`: Manages real-time bidirectional communication with the server using WebSocket protocol, enabling features like live book processing status updates.

---

### 2. `components/`

**Purpose**: Contains reusable UI components that are shared across different features or pages.

**Examples**:

- `cover-animation.js`: Provides animated loading effects for book covers during processing and loading operations, with support for different animation types like radar and progress bars.

- `cover-generator-canvas.js` and `cover-generator-dom.js`: A utility for generating and visualizing book cover designs.

- `custom-color-picker.js`: A customizable color picker component.

- `dropdown-selector.js`: A dropdown menu component for selecting options.

- `message-indicator.js`: A utility for displaying a message indicator on the screen with an icon and text.

- `popup-manager.js`: A utility for displaying user-friendly popups and notifications with customizable content and behavior.

- `sidebar-splitview.js`: A utility for a resizable sidebar component.

---

### 3. `database/`

**Purpose**: Provides tools and abstractions for managing IndexedDB operations, ensuring efficient and reliable data storage and retrieval.

**Examples**:

- `db-manager.js`: The main database module that abstracts complex IndexedDB interactions, including transaction handling, batch operations, and data retrieval.

- `db-worker.js`: A background worker that handles database operations asynchronously, preventing UI blocking during intensive database tasks like batch imports or large queries.

- `bookshelf-db-worker.js`: A background worker that handles bookshelf database operations asynchronously.

---

### 4. `features/`

**Purpose**: Houses high-level features or flows of the application. These files typically combine multiple components, utilities, and business logic to implement specific features.

**Examples**:

- `bookshelf.js`: Manages the bookshelf view and its interactions, such as browsing and organizing books.

- `fontpool.js`: Handles custom font management, including user-uploaded fonts and integration with the text display.

- `footnotes.js`: Dynamically generates and manages footnotes for text content, ensuring accurate references.

- `init-webpage.js`: Handles the initial configuration and rendering of the webpage upon loading.

- `reader.js`: Implements the main text-reading functionality, including navigation, font adjustments, and highlighting.

- `settings.js`: Manages user preferences and configuration options, such as theme selection and language settings.

---

### 5. `file/`

**Purpose**: Handles file-related logic, such as processing and loading files into the application.

**Examples**:

- `file-handler.js`: Handles processing text files and managing book content.

- `file-processor.js`: Processes user-uploaded files, preparing them for display and interaction.

- `file-processor-worker.js`: Utilizes a worker thread to perform intensive file processing tasks in the background, improving performance.

---

### 6. `text/`

**Purpose**: Responsible for text parsing, processing, and rendering logic.

**Examples**:

- `text-processor.js`, `text-processor-dom.js`: Process and parse text content, extracting book titles, author names, languages, chapter titles, and removing unnecessary ads or metadata.

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
