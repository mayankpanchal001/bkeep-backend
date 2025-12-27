"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onboardTenant = exports.runTenantMigrations = exports.getTenantKnex = void 0;
const node_path_1 = __importDefault(require("node:path"));
const knex_1 = __importDefault(require("knex"));
const env_1 = require("../config/env");
const errors_1 = require("../constants/errors");
const http_1 = require("../constants/http");
const roles_1 = require("../constants/roles");
const connection_1 = __importDefault(require("../database/connection"));
const Role_1 = require("../models/Role");
const Tenant_1 = require("../models/Tenant");
const UserRole_1 = require("../models/UserRole");
const UserTenant_1 = require("../models/UserTenant");
const ApiError_1 = require("../utils/ApiError");
/**
 * Create database schema for tenant
 * @param schemaName - Schema name (without tenant_ prefix)
 * @returns void
 */
const createTenantSchema = async (schemaName) => {
    // Ensure schema name has tenant_ prefix
    const fullSchemaName = schemaName.startsWith("tenant_")
        ? schemaName
        : `tenant_${schemaName}`;
    // Check if schema already exists
    const schemaExists = await connection_1.default.raw(`SELECT EXISTS(
      SELECT 1 FROM information_schema.schemata 
      WHERE schema_name = ?
    )`, [fullSchemaName]);
    if (schemaExists.rows[0].exists) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.CONFLICT, errors_1.ERROR_MESSAGES.TENANT_SCHEMA_ALREADY_EXISTS);
    }
    // Create schema
    await connection_1.default.raw("CREATE SCHEMA IF NOT EXISTS ??", [fullSchemaName]);
};
/**
 * Get Knex instance configured for a specific tenant schema
 * @param schemaName - Schema name (without tenant_ prefix)
 * @returns Knex instance configured for tenant schema
 */
const getTenantKnex = (schemaName) => {
    const fullSchemaName = schemaName.startsWith("tenant_")
        ? schemaName
        : `tenant_${schemaName}`;
    const baseConfig = {
        client: "pg",
        connection: {
            host: env_1.env.DB_HOST,
            port: env_1.env.DB_PORT,
            database: env_1.env.DB_NAME,
            user: env_1.env.DB_USER,
            password: env_1.env.DB_PASSWORD,
            ...(env_1.env.DB_SSL ? { ssl: { rejectUnauthorized: false } } : {}),
        },
        pool: {
            min: 2,
            max: 10,
        },
        migrations: {
            schemaName: fullSchemaName,
            tableName: "knex_migrations",
            directory: node_path_1.default.join(__dirname, "..", "database", "migrations", "tenant"),
        },
        searchPath: [fullSchemaName, "public"],
    };
    return (0, knex_1.default)(baseConfig);
};
exports.getTenantKnex = getTenantKnex;
/**
 * Run tenant-specific migrations in a tenant schema
 * @param schemaName - Schema name (without tenant_ prefix)
 * @returns void
 */
const runTenantMigrations = async (schemaName) => {
    const tenantKnex = (0, exports.getTenantKnex)(schemaName);
    try {
        // Run migrations in tenant schema
        await tenantKnex.migrate.latest();
    }
    finally {
        await tenantKnex.destroy();
    }
};
exports.runTenantMigrations = runTenantMigrations;
/**
 * Onboard a new tenant
 * This creates:
 * 1. Tenant record in public schema
 * 2. Associates all superadmin users with the tenant (user_tenants and user_roles records)
 * 3. Database schema for the tenant
 * 4. Runs tenant-specific migrations only
 *
 * Note: All superadmin users are automatically associated with new tenants
 * @param data - Tenant onboarding data
 * @returns Created tenant
 */
const onboardTenant = async (data) => {
    // Validate schema name format
    if (!Tenant_1.Tenant.validateSchemaName(data.schemaName)) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.BAD_REQUEST, errors_1.ERROR_MESSAGES.INVALID_TENANT_SCHEMA_NAME);
    }
    // Check if schema name already exists (before transaction)
    const existingTenant = await Tenant_1.Tenant.findBySchemaName(data.schemaName);
    if (existingTenant) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.CONFLICT, errors_1.ERROR_MESSAGES.TENANT_SCHEMA_ALREADY_EXISTS);
    }
    const tenant = await connection_1.default.transaction(async (trx) => {
        // Step 1: Create tenant record
        const newTenant = await Tenant_1.Tenant.query(trx).insert({
            name: data.name,
            schemaName: data.schemaName,
            isActive: true,
        });
        // Step 2: Find all users with superadmin role
        // Get superadmin role first
        const superadminRole = await Role_1.Role.query(trx)
            .where("name", roles_1.ROLES.SUPERADMIN)
            .modify("notDeleted")
            .modify("active")
            .first();
        if (!superadminRole) {
            throw new ApiError_1.ApiError(http_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, errors_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
        // Find all users with superadmin role (across any tenant)
        const superadminUserRoles = await UserRole_1.UserRole.query(trx)
            .where("role_id", superadminRole.id)
            .select("user_id")
            .distinct("user_id");
        // Step 3: Create user_tenants and user_roles records for all superadmin users
        if (superadminUserRoles.length > 0) {
            // Create user_tenants records using UserTenant model
            const userTenantsRecords = superadminUserRoles.map((ur) => ({
                userId: ur.userId,
                tenantId: newTenant.id,
                isPrimary: false,
            }));
            await UserTenant_1.UserTenant.query(trx).insert(userTenantsRecords);
            // Create user_roles records using UserRole model
            const userRolesRecords = superadminUserRoles.map((ur) => ({
                userId: ur.userId,
                roleId: superadminRole.id,
                tenantId: newTenant.id,
            }));
            await UserRole_1.UserRole.query(trx).insert(userRolesRecords);
        }
        return newTenant;
    });
    try {
        // Step 4: Create database schema
        await createTenantSchema(data.schemaName);
        // Step 5: Run tenant-specific migrations only
        await (0, exports.runTenantMigrations)(data.schemaName);
        return { tenant };
    }
    catch (error) {
        // If schema creation or migration fails, clean up tenant record and user_tenants
        const fullSchemaName = data.schemaName.startsWith("tenant_")
            ? data.schemaName
            : `tenant_${data.schemaName}`;
        try {
            // Clean up user_roles associations using UserRole model
            await UserRole_1.UserRole.query().where("tenant_id", tenant.id).delete();
            // Clean up user_tenants associations using UserTenant model
            await UserTenant_1.UserTenant.removeAllUsersFromTenant(tenant.id);
            // Soft delete tenant record
            await tenant.softDelete();
            // Drop schema if it was created
            await connection_1.default.raw("DROP SCHEMA IF EXISTS ?? CASCADE", [fullSchemaName]);
        }
        catch {
            // Ignore cleanup errors
        }
        throw error;
    }
};
exports.onboardTenant = onboardTenant;
