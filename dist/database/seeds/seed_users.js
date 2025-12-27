"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seed = seed;
/* eslint-disable unicorn/filename-case */
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const uuid_1 = require("uuid");
/**
 * Seeds the users table in the database.
 *
 * This function:
 * 1. Reads user data from users.json, hashes the passwords, and inserts the users
 * 2. Assigns the 'superadmin' role to each inserted user via user_roles table
 * 3. Links users to the tenant
 *
 * @param {Knex} knex - Knex instance
 * @returns {Promise<void>}
 */
async function seed(knex) {
    // Get the data directory path (seeds is in database/seeds, data is in database/data)
    const dataDir = node_path_1.default.resolve(__dirname, "..", "data");
    // Read tenants from JSON file
    const tenantsData = JSON.parse((0, node_fs_1.readFileSync)(node_path_1.default.join(dataDir, "tenant.json"), "utf-8"));
    // Read users from JSON file
    const usersData = JSON.parse((0, node_fs_1.readFileSync)(node_path_1.default.join(dataDir, "users.json"), "utf-8"));
    // Step 1: Get tenant
    const tenant = await knex("tenants")
        .where({ schema_name: tenantsData[0].schema_name })
        .whereNull("deleted_at")
        .first();
    if (!tenant) {
        throw new Error(`Tenant with schema_name "${tenantsData[0].schema_name}" not found. Please run seed_tenants.ts first.`);
    }
    const tenantId = tenant.id;
    // Step 2: Hash passwords and prepare user data
    const users = await Promise.all(usersData.map(async (user) => {
        const hashedPassword = await bcrypt_1.default.hash(user._password, 10);
        const { _password, ...userWithoutPassword } = user;
        return {
            id: (0, uuid_1.v4)(),
            ...userWithoutPassword,
            password_hash: hashedPassword,
        };
    }));
    // Step 3: Clear existing data (preserve tenants)
    await knex("user_roles").del();
    await knex("user_tenants").del();
    await knex("users").del();
    // Step 4: Insert users
    const insertedUsers = await knex("users").insert(users).returning("id");
    // Step 5: Insert user_tenants relationships (mark as primary)
    const tenantUsers = insertedUsers.map((user) => ({
        user_id: user.id,
        tenant_id: tenantId,
        is_primary: true,
        created_at: knex.fn.now(),
    }));
    await knex("user_tenants").insert(tenantUsers);
    // Step 6: Find superadmin role
    const superAdminRole = await knex("roles")
        .where({ name: "superadmin" })
        .whereNull("deleted_at")
        .first();
    if (!superAdminRole) {
        throw new Error("Superadmin role not found. Please run seed_roles.ts first.");
    }
    // Step 7: Assign superadmin role to all users
    const userRoles = insertedUsers.map((user) => ({
        user_id: user.id,
        role_id: superAdminRole.id,
        tenant_id: tenantId,
    }));
    await knex("user_roles").insert(userRoles);
    // eslint-disable-next-line no-console
    console.log(`✅ Seeded ${insertedUsers.length} user(s) with superadmin role`);
}
