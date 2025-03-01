# Restoring IndexedDB Database and Debugging

This document outlines the process to export, copy, and restore an IndexedDB database for debugging purposes. Additionally, it explains how to use a previous version of `bookshelf.js` to test your application's functionality.

---

## **Steps to Restore the Database**

### **1. Replace `bookshelf.js`**

1. Locate the current version of the `bookshelf.js` file.
2. Replace it with the previous version of `bookshelf.js` (`bookshelf-v1.js`) to debug.

---

### **2. Delete the Existing IndexedDB Manually**

1. Open browser's Developer Tools.
2. Navigate to the **Application** tab.
3. Under **Storage**, select **IndexedDB**.
4. Locate the `SimpleTextReader` database.
5. Right-click the database and choose **Delete Database**.
6. If you encounter a "Database deletion blocked" message, ensure all connections to the database are closed.

---

### **3. Create the Database and Debug**

1. Test the database by dragging text file(s) into the webpage UI.
