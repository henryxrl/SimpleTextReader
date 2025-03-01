# Adapters Directory

The `adapters/` directory contains environment-specific adapters that ensure compatibility for shared modules across different runtime environments, such as the browser (frontend) and Node.js (backend). These adapters abstract platform-specific differences, allowing the shared code to function seamlessly in any environment.

---

## Purpose

The `adapters/` directory is designed to bridge the gap between frontend and backend dependencies by:

- Normalizing platform-specific APIs.
- Providing environment-agnostic implementations of common functionality (e.g., text decoding, encoding detection).
- Ensuring that shared logic can be reused without modification in both environments.

---

## Examples

### 1. **`jchardet.js`**

**Purpose**:
Provides an abstraction for using the `jchardet` library, which is responsible for detecting character encodings in text files. This adapter ensures compatibility across frontend and backend environments.

**Examples**:

- Wraps the `jchardet` functionality to handle character encoding detection.
- Normalizes the API for consistent usage in both browser and Node.js contexts.

---

### 2. **`text-decoder.js`**

**Purpose**:
Implements a consistent text decoding interface, adapting the `TextDecoder` API for use in both browsers and Node.js environments.

**Examples**:

- Uses the browser's native `TextDecoder` API if available.
- Falls back to a Node.js-compatible alternative when running in the backend.

---

## Best Practices

1. **Abstract Environment-Specific Logic**:
   - Place all environment-specific logic in this directory to keep the rest of the shared codebase clean and reusable.

2. **Add Adapters as Needed**:
   - When introducing new shared logic that requires platform-specific handling, add a new adapter file here.

3. **Keep APIs Consistent**:
   - Ensure that the adapters provide a unified interface regardless of the runtime environment.

---

## Notes

- The `adapters/` directory is critical for maintaining compatibility across different environments.
- As new dependencies or features are introduced, consider adding adapters to this directory to handle platform-specific differences.
- Always document any new adapters in this README to maintain clarity and consistency.
