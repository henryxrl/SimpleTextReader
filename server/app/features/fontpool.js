// server/app/database/managers/fontpool.js
import { DBManager } from "./db-manager.js";

export class FontpoolDB extends DBManager {
    #objectStoreNames = {
        fontfiles: "Font",
    };

    constructor() {
        super();
    }

    async putFont(fontName, data) {
        if (!(await this.init())) {
            throw new Error("Database connection error");
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
                        label_zh: fontName?.zh ?? inputData.name,
                        label_en: fontName?.en ?? inputData.name,
                        en: fontName?.en ?? inputData.name,
                        zh: fontName?.zh ?? inputData.name,
                    }),
                },
            });

            return true;
        } catch (error) {
            console.error("Error putting font:", error);
            throw error;
        }
    }

    async getFont(name) {
        return await this.get([this.#objectStoreNames.fontfiles], name);
    }

    async getAllFonts() {
        return await this.getAll([this.#objectStoreNames.fontfiles]);
    }

    async removeFont(name) {
        return await this.delete([this.#objectStoreNames.fontfiles], name);
    }

    async removeAllFonts() {
        return await this.clear([this.#objectStoreNames.fontfiles]);
    }

    async isFontExist(name) {
        return await this.exists(this.#objectStoreNames.fontfiles, name);
    }
}

// 创建单例实例
const fontpool = {
    db: null,
    enabled: false,

    async enable() {
        if (!this.enabled) {
            this.db = new FontpoolDB();
            this.enabled = true;
            console.log("Module <Fontpool> enabled.");
        }
        return this;
    },

    async disable() {
        if (this.enabled) {
            await this.db.disconnect();
            this.db = null;
            this.enabled = false;
            console.log("Module <Fontpool> disabled.");
        }
        return this;
    },
};

export default fontpool;
