/**
 * @fileoverview Database management module that provides core database operations
 * using Prisma client. Handles database connections, transactions, and CRUD operations.
 *
 * @module server/app/database/db-manager
 * @requires @prisma/client
 * @requires server/app/middleware/error
 */

import { PrismaClient } from "@prisma/client";
import { DatabaseError } from "../middleware/error.js";

/**
 * Core database management class that handles database operations
 * @class
 */
export class DBManager {
    /**
     * Creates a DBManager instance and initializes Prisma client
     * @constructor
     */
    constructor() {
        this.prisma = new PrismaClient();
    }

    /**
     * Initializes database connection
     * @returns {Promise<boolean>} True if connection successful, false otherwise
     */
    async init() {
        try {
            await this.prisma.$connect();
            return true;
        } catch (error) {
            throw new DatabaseError("Failed to connect to database", error);
        }
    }

    /**
     * Closes database connection
     * @returns {Promise<boolean>} True if disconnection successful, false otherwise
     */
    async disconnect() {
        try {
            await this.prisma.$disconnect();
            return true;
        } catch (error) {
            throw new DatabaseError("Failed to disconnect from database", error);
        }
    }

    /**
     * Retrieves database version
     * @returns {Promise<string>} Database version string
     */
    async getDBVersion() {
        const result = await this.prisma.$queryRaw`SELECT version()`;
        return result[0].version;
    }

    /**
     * Stores data in multiple database models using transformers
     * @param {Object} data - Data to be stored
     * @param {Object} options - Storage options
     * @param {Object} options.stores - Map of model names to transformer functions
     * @returns {Promise<boolean>} True if storage successful
     * @throws {Error} If database connection fails or transaction errors occur
     */
    async put(data, options) {
        if (!(await this.init())) {
            throw new DatabaseError("Database connection failed");
        }

        const { stores } = options;
        const results = [];

        try {
            await this.prisma.$transaction(async (prisma) => {
                for (const [model, transformer] of Object.entries(stores)) {
                    const transformedData = transformer(data);
                    const result = await prisma[model].upsert({
                        where: { name: transformedData.name },
                        update: transformedData,
                        create: transformedData,
                    });
                    results.push(result);
                }
            });
            return true;
        } catch (error) {
            throw new DatabaseError("Failed to store data", error);
        }
    }

    /**
     * Checks if a record exists in specified model
     * @param {string} model - Model name to check
     * @param {string} key - Key to search for
     * @returns {Promise<boolean>} True if record exists
     * @throws {Error} If database connection fails
     */
    async exists(model, key) {
        if (!(await this.init())) {
            throw new DatabaseError("Database connection failed");
        }
        try {
            const count = await this.prisma[model].count({
                where: { name: key },
            });
            return count > 0;
        } catch (error) {
            throw new DatabaseError(`Failed to check if ${model} exists`, error);
        }
    }

    /**
     * Retrieves records from specified models
     * @param {string[]} models - Array of model names to query
     * @param {string} key - Key to search for
     * @returns {Promise<Object|Array>} Single record if one model, array of records if multiple
     * @throws {Error} If database connection fails
     */
    async get(models, key) {
        if (!(await this.init())) {
            throw new DatabaseError("Database connection failed");
        }

        try {
            const results = await Promise.all(
                models.map(async (model) => {
                    const result = await this.prisma[model].findUnique({
                        where: { name: key },
                    });
                    return {
                        model,
                        data: result,
                    };
                })
            );

            return models.length === 1 ? results[0].data : results;
        } catch (error) {
            throw new DatabaseError("Failed to get data", error);
        }
    }

    /**
     * Retrieves all records from specified models
     * @param {string[]} models - Array of model names to query
     * @returns {Promise<Object|Array>} Single model's records if one model, array of records if multiple
     * @throws {Error} If database connection fails
     */
    async getAll(models) {
        if (!(await this.init())) {
            throw new DatabaseError("Database connection failed");
        }

        try {
            const results = await Promise.all(
                models.map(async (model) => {
                    const result = await this.prisma[model].findMany();
                    return {
                        model,
                        data: result,
                    };
                })
            );

            return models.length === 1 ? results[0].data : results;
        } catch (error) {
            throw new DatabaseError("Failed to get all data", error);
        }
    }

    /**
     * Deletes records from specified models
     * @param {string[]} models - Array of model names to delete from
     * @param {string} key - Key to identify records for deletion
     * @returns {Promise<boolean>} True if deletion successful
     * @throws {Error} If database connection fails
     */
    async delete(models, key) {
        if (!(await this.init())) {
            throw new DatabaseError("Database connection failed");
        }

        try {
            await this.prisma.$transaction(
                models.map((model) =>
                    this.prisma[model].delete({
                        where: { name: key },
                    })
                )
            );
            return true;
        } catch (error) {
            throw new DatabaseError("Failed to delete data", error);
        }
    }

    /**
     * Clears all records from specified models
     * @param {string[]} models - Array of model names to clear
     * @returns {Promise<boolean>} True if clearing successful
     * @throws {Error} If database connection fails
     */
    async clear(models) {
        if (!(await this.init())) {
            throw new DatabaseError("Database connection failed");
        }

        try {
            await this.prisma.$transaction(models.map((model) => this.prisma[model].deleteMany({})));
            return true;
        } catch (error) {
            throw new DatabaseError("Failed to clear data", error);
        }
    }

    /**
     * Prints all records from all models to console
     * @returns {Promise<void>}
     * @throws {Error} If database connection fails
     */
    async printAllDatabases() {
        if (!(await this.init())) {
            throw new DatabaseError("Database connection failed");
        }

        try {
            const models = Object.keys(this.prisma).filter(
                (key) => typeof this.prisma[key] === "object" && this.prisma[key].findMany
            );

            for (const model of models) {
                const data = await this.prisma[model].findMany();
                console.log(`\n=== ${model} ===`);
                console.log(data);
            }
        } catch (error) {
            throw new DatabaseError("Failed to print databases", error);
        }
    }
}
