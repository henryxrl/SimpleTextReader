# Config Directory

The `config/` directory centralizes the configuration logic for the backend application. It defines environment variables, server settings, API endpoints, file system paths, session configurations, token settings, and security configurations. This directory ensures a consistent and maintainable approach to managing settings across the application.

---

## Contents

### 1. `config.js`

**Purpose**: Provides a comprehensive configuration object for the application.

**Examples**:

- Environment settings such as `NODE_ENV` and `SESSION_SECRET`.
- Server configurations including the port number and base URL.
- API endpoint paths for internal and external communication.
- File system paths, including the project root and library folder.
- File and font type support settings.
- Session management settings, such as cookie behavior and lifespan.
- Token settings for expiry and cleanup intervals.
- Security configurations, including HTTPS and security headers.

**Features**:

- Automatically loads environment variables from `.env` files using `dotenv`.
- Utilizes `Object.freeze` to prevent runtime modifications to the configuration object.
- Dynamic configurations such as session cookies adapt to the environment (e.g., production vs. development).

---

### 2. `runtime-config.js`

**Purpose**: Manages runtime configuration received from the client side.

**Features**:

- Singleton pattern for consistent configuration access
- Asynchronous configuration updates
- Configuration readiness checks
- Timeout-protected waiting mechanism

**Configuration Items**:

- `CONST_PAGINATION`: Pagination settings
- `PAGE_BREAK_ON_TITLE`: Title-based page break control
- `STYLE`: Style variables and settings

**Methods**:

- `updateConfig()`: Updates configuration with client values
- `waitForReady()`: Waits for configuration to be fully set
- `config`: Getter for accessing current configuration

---

## Notes

**Centralized Management**: These files consolidate all application settings, ensuring no hardcoded values are scattered throughout the codebase.

**Environment Variables**: Sensitive or environment-specific settings should be managed through `.env` files and referenced within these files.

**Best Practices**:

- Avoid directly modifying configuration files during runtime.
- Keep sensitive information (e.g., API keys, database credentials) in environment variables and reference them securely.
- Review and update configurations for security (e.g., HTTPS settings) before deploying to production.
- Use runtime configuration for client-dependent settings that need to be synchronized.
