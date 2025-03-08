# Build-Tools Directory

The `build-tools/` directory contains scripts that automate key project management tasks, including building browser extensions, Docker containers, and generating changelogs. These tools streamline development and deployment, reducing manual effort.

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

### 2. `generate_changelog.py`

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
