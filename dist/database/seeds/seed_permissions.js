"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seed = seed;
/* eslint-disable unicorn/filename-case */
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const uuid_1 = require("uuid");
/**
 * Seeds the permissions table in the database.
 *
 * This function reads permission data from permissions.json and inserts them.
 *
 * @param {Knex} knex - Knex instance
 * @returns {Promise<void>}
 */
async function seed(knex) {
    // Get the data directory path (seeds is in database/seeds, data is in database/data)
    const dataDir = node_path_1.default.resolve(__dirname, "..", "data");
    // Read permissions from JSON file
    const permissionsData = JSON.parse((0, node_fs_1.readFileSync)(node_path_1.default.join(dataDir, "permissions.json"), "utf-8"));
    // Clear existing permissions
    await knex("role_permissions").del();
    await knex("permissions").del();
    const permissions = permissionsData.map((permission) => ({
        id: (0, uuid_1.v4)(),
        ...permission,
    }));
    // Insert permissions
    await knex("permissions").insert(permissions);
    // eslint-disable-next-line no-console
    console.log(`✅ Seeded ${permissions.length} permission(s)`);
}
