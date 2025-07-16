# Client Directory

The top-level directory serves as the root of the frontend portion of the project. It contains essential files and subdirectories that organize the application's logic, styles, assets, and configurations. This directory is structured to ensure modularity, maintainability, and clarity.

---

## Structure Overview

### 1. `app/`

**Purpose**: Contains the core logic and modules of the client-side application.

**Subdirectories**:

- **`config/`**:
  - Stores global configuration files, constants, and shared variables.
  - Includes files like `constants.js` and `variables.js` for centralizing app-wide settings.

- **`debug/`**:
  - Contains debugging tools for specific features, such as database migration, pagination calculators, and title pattern detection.
  - Organized further into functional categories (`database`, `pagination-calculator`, `title-pattern-detector`).

- **`extension/`**:
  - Includes scripts specific to browser extensions (e.g., Chrome, Firefox).
  - Handles activation and content script functionality.

- **`lib/`**:
  - Houses third-party libraries and utilities, such as `jquery.min.js`, `sweetalert2`, and `yaireo`.

- **`modules/`**:
  - Contains core modules organized by functional areas, such as `api`, `components`, `database`, `features`, `file`, and `text`.

- **`utils/`**:
  - Provides reusable utility functions for managing bookshelves, files, fonts, readers, and server interactions.

**Notes**:

- Modular organization ensures maintainability and scalability.
- Each subdirectory includes a `README.md` file explaining its purpose and key contents.

---

### 2. `css/`

**Purpose**: Stores all stylesheets for the client-side application.

**Subdirectories**:

- **Root Stylesheets**:
  - Includes files like `buttons.css`, `reader.css`, and `variables.css` for defining core styles and reusable CSS variables.
  
- **`lib/`**:
  - Contains styles for third-party libraries, such as `sweetalert2.css` and `yaireo` styles.

**Notes**:

- Use `variables.css` to manage shared styles and simplify theme customization.
- Keep library-specific styles isolated in `css/lib` for better maintainability.

---

### 3. `fonts/`

**Purpose**: Stores custom fonts used in the application.

**Files**:

- Includes `.woff` files like `KingHwa_OldSong.woff`, `LXGWWenKaiScreen.woff2`, and `ZhuqueFangsong-Regular.woff`.

**Notes**:

- Ensure that font files are properly licensed and optimized for performance.

---

### 4. `images/`

**Purpose**: Stores all static image assets used in the application.

**Files**:

- Contains icons (e.g., `icon128.png`, `icon64.png`) and visual elements like `seal_en.png`.

**Notes**:

- Optimize images for performance and responsiveness.
- Use consistent naming conventions to indicate their purpose.

---

### 5. `manifests/`

**Purpose**: Stores manifest files for platform-specific configurations, such as browser extensions and PWAs.

**Subdirectories**:

- **`Chrome/`**: Contains `manifest.json` for the Chrome extension.
- **`Firefox/`**: Contains `manifest.json` for the Firefox extension.
- **`PWA/`**: Contains `manifest.json` for the Progressive Web App.

**Notes**:

- Ensure each manifest file meets platform-specific requirements for compatibility.

---

### 6. `package.json`

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

1. **Modular Organization**:
   - Use the `app/` directory to structure core application logic into `config`, `debug`, `modules`, and `utils`.
   - Keep feature-specific code isolated in the `modules/` subdirectory.

2. **Asset Management**:
   - Place static assets (e.g., fonts, images) in their dedicated folders for clarity.
   - Use optimized file formats for performance.

3. **Style Consistency**:
   - Manage shared styles and variables in `css/variables.css`.
   - Keep library-specific styles in `css/lib`.

4. **Documentation**:
   - Maintain `README.md` files in each subdirectory to describe its purpose and structure.

5. **Scalability**:
   - Use modular design principles to make adding new features or modules easier.
   - Separate third-party libraries and utilities into the `lib/` subdirectory.

---

## Notes

- The `client/` directory is the foundation of the frontend application.
- Follow naming conventions and keep related files organized in dedicated subdirectories.
- Ensure that each feature or module is well-documented for future maintainability.
