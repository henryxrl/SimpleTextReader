# Build-Tools Directory

The `build-tools/` directory contains scripts designed to automate and simplify key project management tasks, such as building browser extensions and generating changelogs. These tools enhance efficiency and reduce manual effort during the development and deployment process.

---

## Structure Overview

### 1. `build_extensions.py`

**Purpose**: Automates the process of building Chrome and Firefox extensions.

**Responsibilities**:

- Copies all necessary files to the `dist/` directory.
- Updates version numbers in `version.json` and `manifest.json` files.
- Packages the extensions into `.zip` files for Chrome and `.xpi` files for Firefox.

**Usage**:

- To run the script and build extensions, use the following command:

  ```bash
  python build_extensions.py
  ```

- The resulting extension files will be stored in the `dist/` directory.

---

### 2. `generate_changelog.py`

**Purpose**: Generates a formatted `CHANGELOG.md` file from Git commit messages.

**Responsibilities**:

- Retrieves commit messages from the Git repository.
- Formats the messages into a readable changelog.
- Outputs the result as a `CHANGELOG.md` file.

**Usage**:

- To generate a changelog, use the following command:

  ```bash
  python generate_changelog.py
  ```

- Ensure that you have an active Git repository with meaningful commit messages.

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
- Ensure that Python 3 is installed on your system before running the scripts.
- For additional help or script modifications, refer to the script-specific comments and documentation.
