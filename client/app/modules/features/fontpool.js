/**
 * @fileoverview Fontpool module for managing custom fonts storage and rendering
 *
 * This module provides:
 * - IndexedDB storage for custom fonts
 * - Font management (add/remove/update)
 *
 * @module client/app/modules/features/fontpool
 * @requires client/app/config/index
 * @requires client/app/modules/database/db-manager
 * @requires client/app/modules/components/popup-manager
 * @requires client/app/utils/base
 * @requires client/app/utils/helpers-ui
 * @requires client/app/utils/helpers-fonts
 */

import * as CONFIG from "../../config/index.js";
import { DBManager } from "../database/db-manager.js";
import { PopupManager } from "../components/popup-manager.js";
import { triggerCustomEvent, removeFileExtension, constructNotificationMessageFromArray } from "../../utils/base.js";
import { resetUI } from "../../utils/helpers-ui.js";
import { extractFontName } from "../../utils/helpers-fonts.js";

/**
 * @class FontpoolDB
 * @description Handles IndexedDB operations for font storage
 * @private
 */
class FontpoolDB extends DBManager {
    /**
     * Object store names
     * @type {Object}
     * @private
     */
    #objectStoreNames = {
        fontfiles: CONFIG.CONST_DB.DB_STORES[2].name,
    };

    /**
     * Constructor for FontpoolDB
     * @constructor
     */
    constructor() {
        super({
            dbName: CONFIG.CONST_DB.DB_NAME,
            dbVersion: CONFIG.CONST_DB.DB_VERSION,
            objectStores: CONFIG.CONST_DB.DB_STORES,
            errorCallback: () => fontpool.disable(),
            initCallback: async () => {},
        });
    }

    /**
     * Stores a font in the database
     * @async
     * @param {string} name - Font filename
     * @param {File} data - Font file data
     * @returns {Promise<IDBValidKey>} Key of stored font
     * @throws {Error} When database initialization fails or transaction fails
     */
    async putFont(fontName, data) {
        if (!(await this.init())) {
            throw new Error("Init local db error!");
        }

        try {
            const fontData = {
                name: data.name,
                fontName,
                data,
            };

            await this.put(fontData, {
                stores: {
                    [this.#objectStoreNames.fontfiles]: (inputData) => ({
                        name: inputData.name,
                        data: inputData.data,
                        label_zh: fontName?.zh ?? removeFileExtension(inputData.name),
                        label_en: fontName?.en ?? removeFileExtension(inputData.name),
                        en: fontName?.en ?? removeFileExtension(inputData.name),
                        zh: fontName?.zh ?? removeFileExtension(inputData.name),
                    }),
                },
            });

            return true;
        } catch (error) {
            console.error("Error putting font:", error);
            throw error;
        }
    }

    /**
     * Retrieves a font from the database
     * @async
     * @param {string} name - Font filename
     * @returns {Promise<Object>} Font data
     * @throws {Error} When database initialization fails or transaction fails
     */
    async getFont(name) {
        if (!(await this.init())) {
            throw new Error("Init local db error!");
        }

        try {
            const [fontFile] = await Promise.all([this.get([this.#objectStoreNames.fontfiles], name)]);

            if (!fontFile) {
                return null;
            }

            return fontFile;
        } catch (error) {
            console.error("Error getting font:", error);
            throw error;
        }
    }

    /**
     * Retrieves all fonts from the database
     * @async
     * @returns {Promise<Array>} Array of all fonts
     * @throws {Error} When database initialization fails or transaction fails
     */
    async getAllFonts() {
        if (!(await this.init())) {
            throw new Error("Init local db error!");
        }

        try {
            return await this.getAll([this.#objectStoreNames.fontfiles], {
                useCursor: false,
            });
        } catch (error) {
            console.error("Error getting all fonts:", error);
            return [];
        }
    }

    /**
     * Checks if a font exists in the database
     * @async
     * @param {string} name - Font filename
     * @returns {Promise<boolean>} Whether font exists
     * @throws {Error} When database initialization fails or transaction fails
     */
    async isFontExist(name) {
        if (!(await this.init())) {
            throw new Error("Init local db error!");
        }

        return await this.exists(this.#objectStoreNames.fontfiles, name);
    }

    /**
     * Removes a font from the database
     * @async
     * @param {string} name - Font filename
     * @throws {Error} When database initialization fails or transaction fails
     */
    async removeFont(name) {
        if (!(await this.init())) {
            throw new Error("Init local db error!");
        }

        try {
            await this.delete([this.#objectStoreNames.fontfiles], name);
            return true;
        } catch (error) {
            console.error("Error removing font:", error);
            throw error;
        }
    }

    /**
     * Removes all fonts from the database
     * @async
     * @throws {Error} When database initialization fails or transaction fails
     */
    async removeAllFonts() {
        if (!(await this.init())) {
            throw new Error("Init local db error!");
        }

        try {
            await this.clear([this.#objectStoreNames.fontfiles]);
            return true;
        } catch (error) {
            console.error("Error removing all fonts:", error);
            throw error;
        }
    }

    /**
     * Converts a font family to a filename
     * @async
     * @param {string} fontFamily - Font family
     * @returns {string} Filename
     */
    async fontFamilyToFileName(fontFamily) {
        const fonts = await this.getAllFonts();
        const font = fonts.find((font) => font.zh === fontFamily || font.en === fontFamily);
        return font ? font.name : null;
    }

    /**
     * Upgrades the database schema
     * @async
     * @throws {Error} When database initialization fails or transaction fails
     */
    async upgradeFontpoolDB(force = false) {
        const currentDBVersion = await this.getDBVersion();
        const configuredDBVersion = this.getConfiguredDBVersion();

        if (currentDBVersion > configuredDBVersion) {
            throw new Error(
                `Database version mismatch! Current: ${currentDBVersion}, Expected: ${configuredDBVersion}`
            );
        } else if (currentDBVersion === configuredDBVersion && !force) {
            return;
        }

        if (!(await this.init())) {
            throw new Error("Init local db error!");
        }

        try {
            const fonts = await this.getAllFonts();
            for (const font of fonts) {
                await this.put(font, {
                    stores: {
                        [this.#objectStoreNames.fontfiles]: () => ({
                            name: font.name,
                            data: font.data,
                            label_zh: font.label_zh ?? font.name,
                            label_en: font.label_en ?? font.name,
                            en: font.en ?? font.name,
                            zh: font.zh ?? font.name,
                        }),
                    },
                });
            }

            if (fonts.length > 0) {
                await this.printAllDatabases();
                console.log("Database upgrade completed.");
            }

            return true;
        } catch (error) {
            console.error("Error upgrading database:", error);
            throw error;
        }
    }

    /**
     * Prints all records in "fontfiles" object store
     * @async
     * @throws {Error} When database initialization fails
     */
    async printAllDatabases() {
        if (!(await this.init())) {
            throw new Error("Init local db error!");
        }

        console.log("Printing all font-related database records...");

        try {
            await this.printStoreRecords({
                storeNames: [this.#objectStoreNames.fontfiles],
                preprocessors: {
                    [this.#objectStoreNames.fontfiles]: (record) => record,
                },
            });

            console.log("Finished printing all font-related database records.");
        } catch (error) {
            console.error("Error printing font-related databases:", error);
            throw error;
        }
    }
}

/**
 * Main fontpool object containing all functionality
 * @private
 * @namespace
 */
const fontpool = {
    enabled: false,
    db: null,

    /**
     * Saves a font file to IndexedDB storage
     * @async
     * @param {File} file - Font file to save
     * @returns {Promise<Array>} [boolean, FontName] Whether font was saved successfully
     */
    async saveFont(file) {
        if (fontpool.enabled) {
            try {
                // Get the name of the font
                const fontName = await extractFontName(file);
                if (!fontName) {
                    console.warn("Font name is not defined");
                    return [false, null];
                }
                // console.log(`Font name: "${fontName.zh}"; EN: "${fontName.en}"`);

                // Get all custom fonts
                const existingFonts = await fontpool.db.getAllFonts();

                // Check if the font is already in the list
                if (
                    existingFonts.some(
                        (font) => font.zh === fontName?.zh || font.en === fontName?.en || font.name === file.name
                    )
                ) {
                    return [false, fontName];
                }

                // Check if number of custom fonts has reached the limit
                if (existingFonts.length >= CONFIG.CONST_FONT.MAX_CUSTOM_FONTS) {
                    return [false, ""];
                }

                // Save the font
                await fontpool.db.putFont(fontName, file);
                if (!(await fontpool.db.isFontExist(file.name))) {
                    PopupManager.showNotification({
                        iconName: "ERROR",
                        text: CONFIG.RUNTIME_VARS.STYLE.ui_notification_text_failedToSave,
                        iconColor: "error",
                    });
                    await resetUI();
                    throw new Error(`saveBook error (localStorage full): "${file.name}"`);
                }

                return [true, fontName];
            } catch (e) {
                console.log("Error saving font:", e);
                return [false, null];
            }
        }
        return [false, null];
    },

    /**
     * Loads a font from IndexedDB storage
     * @async
     * @param {string} fontName - Font filename
     * @returns {Promise<Array>} [boolean, FontFace] Whether font was loaded successfully
     */
    async loadFont(fontName) {
        if (!this.enabled) {
            return [false, null];
        }

        try {
            // Retrieve font data from IndexedDB
            const fontData = await this.db.getFont(fontName);
            if (!fontData) {
                console.warn(`Font ${fontName} not found in database`);
                return [false, null];
            }

            // Create Blob and URL
            const fontBlob = new Blob([fontData.data], { type: fontData.data.type });
            const fontUrl = URL.createObjectURL(fontBlob);

            try {
                const fontFace = await this.addFontToRegistry(fontData, fontUrl);
                return [true, fontFace];
            } catch (error) {
                console.error(`Error loading font ${fontName}:`, error);
                return [false, null];
            } finally {
                // Clean up URL
                URL.revokeObjectURL(fontUrl);
            }
        } catch (error) {
            console.error(`Error retrieving font ${fontName} from database:`, error);
            return [false, null];
        }
    },

    /**
     * Loads all custom fonts from IndexedDB storage and registers them with the document
     *
     * This function:
     * 1. Retrieves all font files from IndexedDB
     * 2. Loads each font using FontFace API
     * 3. Ensures fonts are fully registered with the document
     * 4. Triggers a 'customFontsLoaded' event when fonts are ready
     *
     * @async
     * @returns {Promise<FontFace[]>} Array of successfully loaded FontFace objects
     * @throws {Error} If there's an error accessing the database or loading fonts
     *
     * @fires CustomEvent#customFontsLoaded - When fonts are successfully loaded
     */
    async loadAllFonts() {
        if (!this.enabled) {
            return [];
        }

        try {
            const fonts = await this.db.getAllFonts();
            const loadedFonts = [];
            const loadedFontPromises = [];

            // Collect all font loading promises
            for (const font of fonts) {
                const [success, fontFace] = await this.loadFont(font.name);
                if (success && fontFace) {
                    loadedFonts.push(fontFace);
                    // Add a Promise to wait for the font to be fully loaded and registered
                    loadedFontPromises.push(
                        fontFace.loaded.then(() => {
                            return new Promise((resolve) => {
                                // Ensure the font is fully registered
                                if (document.fonts.check(`12px "${fontFace.family}"`)) {
                                    resolve();
                                } else {
                                    document.fonts.ready.then(() => resolve());
                                }
                            });
                        })
                    );
                } else {
                    // console.warn(`Failed to load font: ${font.name}`);
                }
            }

            // Only proceed if we have successfully loaded fonts
            if (loadedFonts.length > 0) {
                // Wait for all fonts to be fully loaded and registered
                await Promise.all(loadedFontPromises);

                // Wait for one more frame to ensure all updates are complete
                await new Promise((resolve) => requestAnimationFrame(resolve));

                // Send custom event to notify font loading is complete
                triggerCustomEvent("customFontsLoaded", {
                    fontsCount: loadedFonts.length,
                    fonts: { ...CONFIG.VARS.CUSTOM_FONTS },
                });

                console.log(
                    `Custom fonts loaded. Current custom font pool size: ${
                        Object.keys(CONFIG.VARS.CUSTOM_FONTS).length
                    }.`
                );
            } else if (fonts.length > 0) {
                // If we had fonts to load but all failed
                // console.error("All fonts failed to load");
            }

            return loadedFonts;
        } catch (error) {
            console.error("Error loading all fonts:", error);
            return [];
        }
    },

    /**
     * Adds a font to the registry
     * @param {Object} fontData - Font data
     * @param {string} fontURL - Font URL
     * @returns {FontFace} Font face
     */
    async addFontToRegistry(fontData, fontURL) {
        const family = fontData.zh || fontData.en; // Use Chinese or English name as family

        if (!family) {
            console.warn("Font family is not defined");
            return null;
        }

        if (!CONFIG.VARS.CUSTOM_FONTS[family]) {
            const fontFace = new FontFace(family, `url(${fontURL})`);

            fontFace
                .load()
                .then(() => {
                    // Add the font to document fonts
                    document.fonts.add(fontFace);

                    CONFIG.VARS.CUSTOM_FONTS[family] = {
                        zh: fontData.zh,
                        en: fontData.en,
                        label_zh: fontData.label_zh,
                        label_en: fontData.label_en,
                    };

                    // console.log(`Font "${family}" added with metadata:`, fontData);
                })
                .catch((err) => {
                    console.error(`Failed to load font "${family}":`, err);
                    return null;
                });
            return fontFace;
        } else {
            console.log(`Font "${family}" is already in the registry.`);
            return null;
        }
    },

    /**
     * Checks if a font exists in storage
     * @async
     * @param {string} fontName - Font filename
     * @returns {Promise<boolean>} Whether font exists
     */
    async isFontExist(fontName) {
        if (this.enabled) {
            return await this.db.isFontExist(fontName);
        } else {
            return false;
        }
    },

    /**
     * Removes a font from storage
     * @async
     * @param {string} fontFamily - Font family
     * @param {Function} [onSucc=null] - Success callback
     */
    async removeFont(fontFamily, onSucc = null) {
        if (!this.enabled) {
            return false;
        }

        try {
            // Remove the font from the registry
            for (const font of document.fonts) {
                if (font.family === `"${fontFamily}"` || font.family === fontFamily) {
                    document.fonts.delete(font);
                    break;
                }
            }

            // Remove from custom fonts config and other global font configs
            if (CONFIG.VARS.CUSTOM_FONTS[fontFamily]) {
                delete CONFIG.VARS.CUSTOM_FONTS[fontFamily];
            }
            const index = CONFIG.VARS.FILTERED_FONT_NAMES[1].indexOf(fontFamily);
            if (index !== -1) {
                CONFIG.VARS.FILTERED_FONT_NAMES[1].splice(index, 1);
                CONFIG.VARS.FILTERED_FONT_LABELS[1].splice(index, 1);
                CONFIG.VARS.FILTERED_FONT_LABELS_ZH[1].splice(index, 1);
            }
            if (CONFIG.VARS.FILTERED_FONT_NAMES[1].length === 0) {
                CONFIG.VARS.FILTERED_FONT_NAMES.splice(1, 1);
                CONFIG.VARS.FILTERED_FONT_LABELS.splice(1, 1);
                CONFIG.VARS.FILTERED_FONT_LABELS_ZH.splice(1, 1);
                CONFIG.VARS.FONT_GROUPS.splice(1, 1);
                CONFIG.VARS.FONT_GROUPS_ZH.splice(1, 1);
            }

            // Remove from database
            const fontFileName = await this.db.fontFamilyToFileName(fontFamily);
            let success = false;
            if (fontFileName) {
                success = await this.db.removeFont(fontFileName);
            }

            // Call success callback if provided
            if (success && onSucc) {
                onSucc();
            }

            return success;
        } catch (error) {
            console.error(`Failed to remove font "${fontFamily}":`, error);
            return false;
        }
    },

    /**
     * Enables the fontpool module and sets up event handlers
     * @returns {Object} The fontpool instance for chaining
     */
    async enable() {
        if (!this.enabled) {
            this.db = new FontpoolDB();

            const currentDBVersion = await this.db.getDBVersion();
            const configuredDBVersion = this.db.getConfiguredDBVersion();
            if (Math.max(currentDBVersion, configuredDBVersion) < 3) {
                console.warn(
                    "Fontpool requires database version 3 or higher. Current max version:",
                    Math.max(currentDBVersion, configuredDBVersion)
                );
                this.db = null;
                return;
            }

            await this.db.upgradeFontpoolDB();
            this.enabled = true;

            if (CONFIG.RUNTIME_CONFIG.UPGRADE_DB) {
                await this.db.upgradeFontpoolDB(true);
            }

            if (CONFIG.RUNTIME_CONFIG.PRINT_DATABASE) {
                await this.db.printAllDatabases();
            }

            document.addEventListener("handleMultipleFonts", async (e) => {
                const { files } = e.detail;

                if (this.enabled) {
                    const successFonts = [];
                    const existingFonts = [];
                    let exceedingLimit = false;

                    for (const [i, file] of files.entries()) {
                        const [saveSuccess, fontName] = await this.saveFont(file);
                        if (saveSuccess && fontName) {
                            successFonts.push(fontName[CONFIG.RUNTIME_VARS.WEB_LANG] ?? file.name);
                        } else if (!saveSuccess && fontName) {
                            existingFonts.push(fontName[CONFIG.RUNTIME_VARS.WEB_LANG] ?? file.name);
                        } else if (!saveSuccess && fontName === "") {
                            exceedingLimit = true;
                        }
                    }

                    await this.loadAllFonts();

                    if (successFonts.length > 0) {
                        PopupManager.showNotification({
                            iconName: "FONT_FILE",
                            text: constructNotificationMessageFromArray(
                                CONFIG.RUNTIME_VARS.STYLE.ui_notification_text_addFontSuccess,
                                successFonts,
                                {
                                    language: CONFIG.RUNTIME_VARS.WEB_LANG,
                                    maxItems: 3,
                                    messageSuffix: CONFIG.RUNTIME_VARS.STYLE.ui_notification_text_andMore,
                                }
                            ),
                        });
                    }

                    if (existingFonts.length > 0) {
                        PopupManager.showNotification({
                            iconName: "ERROR",
                            iconColor: "warning",
                            text: constructNotificationMessageFromArray(
                                CONFIG.RUNTIME_VARS.STYLE.ui_notification_text_fontExists,
                                existingFonts,
                                {
                                    language: CONFIG.RUNTIME_VARS.WEB_LANG,
                                    maxItems: 3,
                                    messageSuffix: CONFIG.RUNTIME_VARS.STYLE.ui_notification_text_andMore,
                                }
                            ),
                        });
                    }

                    if (exceedingLimit) {
                        PopupManager.showNotification({
                            iconName: "ERROR",
                            iconColor: "warning",
                            text: CONFIG.RUNTIME_VARS.STYLE.ui_notification_text_maxFontsReached.replace(
                                "xxx",
                                CONFIG.CONST_FONT.MAX_CUSTOM_FONTS
                            ),
                        });
                    }
                }
            });

            document.addEventListener("deleteCustomFont", async (e) => {
                const { fontFamily } = e.detail;
                await this.removeFont(fontFamily, () => {
                    console.log(`Font "${fontFamily}" removed.`);
                });
            });

            // Load all fonts
            await this.loadAllFonts();
        }
    },

    /**
     * Disables the fontpool module and cleans up resources
     * @returns {Object} The fontpool instance for chaining
     */
    disable() {
        if (this.enabled) {
            this.db = null;
            this.enabled = false;
            console.log("Module disabled.");
        }
        return this;
    },
};

/**
 * Initializes the fontpool module
 * @public
 */
export async function initFontpool() {
    // Enable fontpool functionality
    if (CONFIG.RUNTIME_CONFIG.ENABLE_FONTPOOL) {
        await fontpool.enable();
    }
}
