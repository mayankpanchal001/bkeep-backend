"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withTenantSchema = void 0;
const errors_1 = require("../constants/errors");
const http_1 = require("../constants/http");
const connection_1 = __importDefault(require("../database/connection"));
const ApiError_1 = require("./ApiError");
/**
 * Normalize schema name to include tenant_ prefix if needed
 * @param schemaName - Schema name (with or without tenant_ prefix)
 * @returns Full schema name with tenant_ prefix
 */
const normalizeSchemaName = (schemaName) => {
    return schemaName.startsWith("tenant_") ? schemaName : `tenant_${schemaName}`;
};
/**
 * Check if tenant schema exists in the database
 * @param schemaName - Tenant schema name (without tenant_ prefix)
 * @returns true if schema exists, false otherwise
 */
const schemaExists = async (schemaName) => {
    const fullSchemaName = normalizeSchemaName(schemaName);
    const result = await connection_1.default.raw(`SELECT EXISTS(
      SELECT 1 FROM information_schema.schemata 
      WHERE schema_name = ?
    )`, [fullSchemaName]);
    return result.rows[0].exists;
};
/**
 * Set tenant schema search path on a transaction
 * @param trx - Knex transaction instance
 * @param schemaName - Tenant schema name (without tenant_ prefix)
 */
const setTenantSearchPath = async (trx, schemaName) => {
    const fullSchemaName = normalizeSchemaName(schemaName);
    // Use Knex's identifier binding (??) to properly escape schema name
    // SET LOCAL search_path sets the search path for the current transaction only
    await trx.raw(`SET LOCAL search_path TO ??, public`, [fullSchemaName]);
};
/**
 * Execute a query with tenant schema search path set
 * Uses a transaction to ensure search path is set for all queries in the callback
 *
 * @param schemaName - Tenant schema name (without tenant_ prefix)
 * @param callback - Function that receives a Knex transaction with search path set
 * @returns Result of the callback function
 *
 * @example
 * const accounts = await withTenantSchema('acme', async (trx) => {
 *   return await Account.query(trx).where('is_active', true)
 * })
 */
const withTenantSchema = async (schemaName, callback) => {
    // Check if schema exists before proceeding
    const exists = await schemaExists(schemaName);
    if (!exists) {
        throw new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, errors_1.ERROR_MESSAGES.TENANT_SCHEMA_NOT_FOUND);
    }
    // Use a transaction to ensure search path is set for all queries
    return connection_1.default.transaction(async (trx) => {
        // Set search path for this transaction
        await setTenantSearchPath(trx, schemaName);
        // Execute callback with transaction (which has search path set)
        return callback(trx);
    });
};
exports.withTenantSchema = withTenantSchema;
