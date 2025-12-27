import path from 'node:path'

import knex, { type Knex } from 'knex'

import { env } from '@config/env'
import { ERROR_MESSAGES } from '@constants/errors'
import { HTTP_STATUS } from '@constants/http'
import { ROLES } from '@constants/roles'
import db from '@database/connection'
import { Role } from '@models/Role'
import { Tenant } from '@models/Tenant'
import { UserRole } from '@models/UserRole'
import { UserTenant } from '@models/UserTenant'
import { ApiError } from '@utils/ApiError'

/**
 * Interface for tenant onboarding data
 */
export interface TenantOnboardingData {
  name: string
  schemaName: string
}

/**
 * Create database schema for tenant
 * @param schemaName - Schema name (without tenant_ prefix)
 * @returns void
 */
const createTenantSchema = async (schemaName: string): Promise<void> => {
  // Ensure schema name has tenant_ prefix
  const fullSchemaName = schemaName.startsWith('tenant_')
    ? schemaName
    : `tenant_${schemaName}`

  // Check if schema already exists
  const schemaExists = await db.raw(
    `SELECT EXISTS(
      SELECT 1 FROM information_schema.schemata 
      WHERE schema_name = ?
    )`,
    [fullSchemaName]
  )

  if (schemaExists.rows[0].exists) {
    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      ERROR_MESSAGES.TENANT_SCHEMA_ALREADY_EXISTS
    )
  }

  // Create schema
  await db.raw('CREATE SCHEMA IF NOT EXISTS ??', [fullSchemaName])
}

/**
 * Get Knex instance configured for a specific tenant schema
 * @param schemaName - Schema name (without tenant_ prefix)
 * @returns Knex instance configured for tenant schema
 */
export const getTenantKnex = (schemaName: string): Knex => {
  const fullSchemaName = schemaName.startsWith('tenant_')
    ? schemaName
    : `tenant_${schemaName}`

  const baseConfig = {
    client: 'pg',
    connection: {
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_NAME,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      ...(env.DB_SSL ? { ssl: { rejectUnauthorized: false } } : {}),
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      schemaName: fullSchemaName,
      tableName: 'knex_migrations',
      directory: path.join(__dirname, '..', 'database', 'migrations', 'tenant'),
    },
    searchPath: [fullSchemaName, 'public'],
  }

  return knex(baseConfig)
}

/**
 * Run tenant-specific migrations in a tenant schema
 * @param schemaName - Schema name (without tenant_ prefix)
 * @returns void
 */
export const runTenantMigrations = async (
  schemaName: string
): Promise<void> => {
  const tenantKnex = getTenantKnex(schemaName)

  try {
    // Run migrations in tenant schema
    await tenantKnex.migrate.latest()
  } finally {
    await tenantKnex.destroy()
  }
}

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
export const onboardTenant = async (
  data: TenantOnboardingData
): Promise<{ tenant: Tenant }> => {
  // Validate schema name format
  if (!Tenant.validateSchemaName(data.schemaName)) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      ERROR_MESSAGES.INVALID_TENANT_SCHEMA_NAME
    )
  }

  // Check if schema name already exists (before transaction)
  const existingTenant = await Tenant.findBySchemaName(data.schemaName)
  if (existingTenant) {
    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      ERROR_MESSAGES.TENANT_SCHEMA_ALREADY_EXISTS
    )
  }

  const tenant = await db.transaction(async (trx) => {
    // Step 1: Create tenant record
    const newTenant = await Tenant.query(trx).insert({
      name: data.name,
      schemaName: data.schemaName,
      isActive: true,
    })

    // Step 2: Find all users with superadmin role
    // Get superadmin role first
    const superadminRole = await Role.query(trx)
      .where('name', ROLES.SUPERADMIN)
      .modify('notDeleted')
      .modify('active')
      .first()

    if (!superadminRole) {
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      )
    }

    // Find all users with superadmin role (across any tenant)
    const superadminUserRoles = await UserRole.query(trx)
      .where('role_id', superadminRole.id)
      .select('user_id')
      .distinct('user_id')

    // Step 3: Create user_tenants and user_roles records for all superadmin users
    if (superadminUserRoles.length > 0) {
      // Create user_tenants records using UserTenant model
      const userTenantsRecords = superadminUserRoles.map((ur) => ({
        userId: ur.userId,
        tenantId: newTenant.id,
        isPrimary: false,
      }))

      await UserTenant.query(trx).insert(userTenantsRecords)

      // Create user_roles records using UserRole model
      const userRolesRecords = superadminUserRoles.map((ur) => ({
        userId: ur.userId,
        roleId: superadminRole.id,
        tenantId: newTenant.id,
      }))

      await UserRole.query(trx).insert(userRolesRecords)
    }

    return newTenant
  })

  try {
    // Step 4: Create database schema
    await createTenantSchema(data.schemaName)

    // Step 5: Run tenant-specific migrations only
    await runTenantMigrations(data.schemaName)

    return { tenant }
  } catch (error) {
    // If schema creation or migration fails, clean up tenant record and user_tenants
    const fullSchemaName = data.schemaName.startsWith('tenant_')
      ? data.schemaName
      : `tenant_${data.schemaName}`

    try {
      // Clean up user_roles associations using UserRole model
      await UserRole.query().where('tenant_id', tenant.id).delete()

      // Clean up user_tenants associations using UserTenant model
      await UserTenant.removeAllUsersFromTenant(tenant.id)

      // Soft delete tenant record
      await tenant.softDelete()

      // Drop schema if it was created
      await db.raw('DROP SCHEMA IF EXISTS ?? CASCADE', [fullSchemaName])
    } catch {
      // Ignore cleanup errors
    }

    throw error
  }
}
