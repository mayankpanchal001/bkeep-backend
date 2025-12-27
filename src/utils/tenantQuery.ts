import type { Knex } from 'knex'

import { ERROR_MESSAGES } from '@constants/errors'
import { HTTP_STATUS } from '@constants/http'
import db from '@database/connection'
import { ApiError } from '@utils/ApiError'

/**
 * Normalize schema name to include tenant_ prefix if needed
 * @param schemaName - Schema name (with or without tenant_ prefix)
 * @returns Full schema name with tenant_ prefix
 */
const normalizeSchemaName = (schemaName: string): string => {
  return schemaName.startsWith('tenant_') ? schemaName : `tenant_${schemaName}`
}

/**
 * Check if tenant schema exists in the database
 * @param schemaName - Tenant schema name (without tenant_ prefix)
 * @returns true if schema exists, false otherwise
 */
const schemaExists = async (schemaName: string): Promise<boolean> => {
  const fullSchemaName = normalizeSchemaName(schemaName)

  const result = await db.raw(
    `SELECT EXISTS(
      SELECT 1 FROM information_schema.schemata 
      WHERE schema_name = ?
    )`,
    [fullSchemaName]
  )

  return result.rows[0].exists
}

/**
 * Set tenant schema search path on a transaction
 * @param trx - Knex transaction instance
 * @param schemaName - Tenant schema name (without tenant_ prefix)
 */
const setTenantSearchPath = async (
  trx: Knex.Transaction,
  schemaName: string
): Promise<void> => {
  const fullSchemaName = normalizeSchemaName(schemaName)
  // Use Knex's identifier binding (??) to properly escape schema name
  // SET LOCAL search_path sets the search path for the current transaction only
  await trx.raw(`SET LOCAL search_path TO ??, public`, [fullSchemaName])
}

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
export const withTenantSchema = async <T>(
  schemaName: string,
  callback: (trx: Knex.Transaction) => Promise<T>
): Promise<T> => {
  // Check if schema exists before proceeding
  const exists = await schemaExists(schemaName)
  if (!exists) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      ERROR_MESSAGES.TENANT_SCHEMA_NOT_FOUND
    )
  }

  // Use a transaction to ensure search path is set for all queries
  return db.transaction(async (trx) => {
    // Set search path for this transaction
    await setTenantSearchPath(trx, schemaName)

    // Execute callback with transaction (which has search path set)
    return callback(trx)
  })
}
