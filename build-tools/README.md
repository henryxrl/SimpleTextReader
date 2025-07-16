# Build-Tools Directory

The `build-tools/` directory contains scripts that automate key project management tasks, including building browser extensions, Docker containers, subsetting fonts, and generating changelogs. These tools streamline development and deployment, reducing manual effort.

---

## Structure Overview

### 1. `build.py`

**Purpose**: Automates the build process for Chrome and Firefox extensions, as well as Docker containers.

**Responsibilities**:

- Copies necessary files to the `dist/` directory for extension builds.
- Prepares files according to `Dockerfile` and `.dockerignore` for container builds.
- Updates version numbers in `version.json` and `manifest.json`.
- Packages extensions into `.zip` files.
- Builds and pushes Docker containers to Docker Hub.
- Integrates font manifest/css generation via `splitfont_css2manifest.py`.

**Usage**:

- Build extensions and Docker containers:

  ```bash
  python build.py
  ```

- Build with a specific version:

  ```bash
  python build.py -v ${VERSION}
  ```

- Display help:

  ```bash
  python build.py -h
  ```

- Output:

  - Browser extensions are stored in the `dist/` directory.
  - Docker images are automatically pushed to Docker Hub.

---

### 2. `font_names.py`

**Purpose:** Prints the font family names included in a given font file.

**Responsibilities:**

- Parses a TTF/OTF/WOFF font file and extracts all family/style names.
- Useful for verifying the exact name to be used in CSS or for subsetting.

**Usage:**

  ```bash
  python font_names.py yourfont.ttf [anotherfont.otf ...]
  ```

---

### 3. `font_subset.py`

**Purpose**: Creates a subset of a font file by extracting only the necessary characters.

**Responsibilities**:

- Scans specified files to collect all characters or only Chinese characters.
- Uses the extracted characters to generate a subset of the original font.
- Outputs a new font file containing only the selected characters.

**Usage**:

- Generate a subsetted font:

  ```bash
  python build-tools/font_subset.py [full-font] [subset-font]
  ```

---

### 4. `generate_changelog.py`

**Purpose**: Generates a formatted `CHANGELOG.md` file from Git commit messages.

**Responsibilities**:

- Retrieves commit messages from the Git repository.
- Formats the messages into a readable changelog.
- Outputs the result as `CHANGELOG.md`.

**Usage**:

- Generate the changelog:

  ```bash
  python generate_changelog.py
  ```

- **Note:** Ensure your Git repository contains meaningful commit messages.

---

### 5. `splitfont_css2manifest.py`

**Purpose:** Converts a split-font CSS file into a JSON manifest or modified CSS, adjusting font-face properties for browser compatibility.

**Responsibilities:**

- Fetches the CSS file for a split-font, either from an online source or local file.
- Uses the css2manifest method to:
  - Convert the CSS to a JSON manifest (legacy; rarely used now).
  - Or output a modified CSS with:
  - Custom font-face names
  - Added properties like size-adjust
  - Fixed url() paths for local font splits, ensuring browser compatibility
- Provides save_manifest and save_css methods for outputting these files as part of the build.
- Called from build.py to integrate into the main build workflow.

**Usage:**

- Usually called automatically as part of build.py.
- Can also be used independently:

  ```bash
  python build-tools/splitfont_css2manifest.py --url [css-file] --out [manifest|css] --rename [font-face-name] --size-adjust [size-adjust-percentage]
  ```

## Best Practices

1. **Keep Scripts Modular**:
   - Ensure that each script handles a specific task (e.g., building extensions, generating changelogs).
   - Avoid adding unrelated logic to the scripts.

2. **Run Scripts Regularly**:
   - Use `build_extensions.py` before releasing a new version of the browser extensions.
   - Run `generate_changelog.py` to maintain an up-to-date changelog with meaningful commit messages.

3. **Document Updates**:
   - Update this README file whenever a new script is added or existing scripts are modified.
   - Include usage instructions for any new tools.

4. **Validate Outputs**:
   - Verify that the `dist/` directory contains properly packaged extensions after running `build_extensions.py`.
   - Check the formatting of `CHANGELOG.md` after running `generate_changelog.py`.

---

## Notes

- The `build-tools/` directory is critical for automating development and deployment workflows.
- Ensure Python 3 is installed before running the scripts.
- For additional help or script modifications, refer to the script-specific comments and documentation.
