# CSS Directory

The `css/` directory contains all stylesheets for the application. It is organized to separate styles by purpose, ensuring clarity, modularity, and maintainability.

---

## Structure Overview

### 1. **Top-Level Files**

These styles define the core appearance and functionality of the application.

- **`ui.css`**

  - General UI layout and structural styles.

  - Handles global styling such as positioning, spacing, and typography.

- **`variables.css`**

  - Contains CSS variables for colors, fonts, and other shared values.

  - Serves as the central place to manage design tokens.

- **`buttons.css`**

  - Styles specifically for buttons used throughout the application.

  - Ensures consistent appearance and behavior.

- **`footnotes.css`**

  - Styles related to the footnotes feature.

  - Handles formatting and interaction for footnote elements.

- **`reader.css`**

  - Styles specific to the reader interface.

  - Includes text formatting, layout adjustments, and responsive behavior.

---

### 2. **`lib/` Directory**

This directory contains third-party stylesheets used for specific UI components and features.

#### `yaireo/` Subdirectory

- **`color-picker.css`**

  - Styles for the color picker widget.

  - Part of the `yaireo` library integration.

- **`my-color.css`**

  - Custom styles or overrides for the color picker.

- **`my-range.css`**

  - Custom styles or overrides for range sliders.

- **`ui-range.css`**

  - Styles for range sliders provided by the `yaireo` library.

#### Other External Libraries

- **`sweetalert2.css`**

  - Styles for SweetAlert2 dialogs and notifications.

  - Provides modern, customizable alert boxes.

  - [Documentation](https://sweetalert2.github.io)

---

## Best Practices

1. **Consistency**:

    - Keep global styles in `ui.css` and `variables.css`.

    - Place feature-specific styles (e.g., `reader.css`, `footnotes.css`) in dedicated files.

2. **Modularity**:

    - Avoid mixing unrelated styles within a single file.

    - Use separate files for components, features, and third-party overrides.

3. **Third-Party Styles**:

    - Maintain all third-party styles in the `lib/` directory to isolate them from custom code.

    - Avoid modifying third-party files directly; use separate overrides if necessary.

4. **Scalability**:

    - When adding new features, create dedicated CSS files to keep styles organized.

---

## Notes

- The `css/` directory forms the visual foundation of the application.

- Use `variables.css` to update themes or make global design changes efficiently.

- Refer to the `lib/` directory for styling specific to integrated third-party libraries.
