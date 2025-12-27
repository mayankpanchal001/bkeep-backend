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
const connection_1 = __importDefault(require("../connection"));
const tenant_service_1 = require("../../services/tenant.service");
/**
 * Seeds the tenants table in the database.
 *
 * This function:
 * 1. Reads tenant data from tenant.json
 * 2. Creates tenant records in the tenants table
 * 3. Creates tenant schemas in the database
 * 4. Runs tenant-specific migrations for each schema
 *
 * @param {Knex} knex - Knex instance
 * @returns {Promise<void>}
 */
async function seed(knex) {
    // Get the data directory path (seeds is in database/seeds, data is in database/data)
    const dataDir = node_path_1.default.resolve(__dirname, "..", "data");
    // Read tenants from JSON file
    const tenantsData = JSON.parse((0, node_fs_1.readFileSync)(node_path_1.default.join(dataDir, "tenant.json"), "utf-8"));
    const now = new Date();
    const tenantMap = new Map();
    // Step 1: Create or get tenant records
    for (const tenantData of tenantsData) {
        // Check if tenant already exists
        let tenant = await knex("tenants")
            .where({ schema_name: tenantData.schema_name })
            .whereNull("deleted_at")
            .first();
        if (!tenant) {
            // Create tenant record
            const [insertedTenant] = await knex("tenants")
                .insert({
                id: (0, uuid_1.v4)(),
                name: tenantData.name,
                schema_name: tenantData.schema_name,
                is_active: tenantData.is_active ?? true,
                created_at: now,
                updated_at: now,
            })
                .returning("*");
            tenant = insertedTenant;
            // eslint-disable-next-line no-console
            console.log(`✅ Created tenant: ${tenant.name} (${tenant.schema_name})`);
        }
        else {
            // eslint-disable-next-line no-console
            console.log(`⏭️  Tenant already exists: ${tenant.name} (${tenant.schema_name})`);
        }
        tenantMap.set(tenantData.schema_name, tenant);
    }
    // Step 2: Create tenant schemas and run migrations
    for (const [schemaName] of tenantMap.entries()) {
        // Ensure schema name has tenant_ prefix
        const fullSchemaName = schemaName.startsWith("tenant_")
            ? schemaName
            : `tenant_${schemaName}`;
        // Check if schema exists
        const schemaExists = await connection_1.default.raw(`SELECT EXISTS(
        SELECT 1 FROM information_schema.schemata 
        WHERE schema_name = ?
      )`, [fullSchemaName]);
        if (!schemaExists.rows[0].exists) {
            // Create schema
            await connection_1.default.raw("CREATE SCHEMA IF NOT EXISTS ??", [fullSchemaName]);
            // eslint-disable-next-line no-console
            console.log(`📦 Created tenant schema: ${fullSchemaName}`);
            // Run tenant migrations (only if schema was just created)
            try {
                await (0, tenant_service_1.runTenantMigrations)(schemaName);
                // eslint-disable-next-line no-console
                console.log(`🔄 Ran tenant migrations for: ${fullSchemaName}`);
            }
            catch (error) {
                // eslint-disable-next-line no-console
                console.error(`❌ Failed to run migrations for ${fullSchemaName}:`, error);
                throw error;
            }
        }
        else {
            // eslint-disable-next-line no-console
            console.log(`⏭️  Schema already exists: ${fullSchemaName}`);
        }
    }
    // eslint-disable-next-line no-console
    console.log(`✅ Seeded ${tenantMap.size} tenant(s)`);
}
