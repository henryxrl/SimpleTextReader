# Books Directory

The `books/` directory serves as the "cloud library" for the application, housing all text files to be processed. Users can either utilize this directory directly or configure it to work with their own library through container mounts or symbolic links.

---

## Purpose

- Acts as the primary storage location for `.txt` files that the application processes.
- Enables users to easily manage and update their library of text files.

---

## Usage

### 1. Default Setup

- Place `.txt` files directly in this directory for processing.

### 2. Containerized Setup

- If running the application in a containerized environment (e.g., Docker), mount your library directory to replace or overlay the `books/` directory:

  ```bash
  docker run -v /path/to/your/library:/app/books your-container
  ```

  - This allows your own library to be seamlessly used by the application.

### 3. Symbolic Linking

- Link your library to this directory to avoid duplication:

  ```bash
  ln -s /path/to/your/library ./books
  ```

---

## Notes for Developers and Users

1. **File Format**:
   - Only `.txt` files should be added to this directory.
   - Other file types are not supported and will be ignored.

2. **Naming**:
   - Use descriptive and unique names for your files to make them easier to manage.

3. **ReadMe File**:
   - This `README.md` file provides guidance but does not interfere with mounting or linking operations.

---

## Best Practices

1. **Organizing Files**:
   - Group your files logically to make library management easier.

2. **Mounting Custom Libraries**:
   - Always verify file permissions after mounting or linking your library.
   - Ensure the application has read access to all files in the directory.
