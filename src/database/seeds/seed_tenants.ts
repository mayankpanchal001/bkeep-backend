/* eslint-disable unicorn/filename-case */
import { readFileSync } from 'node:fs'
import path from 'node:path'

import type { Knex } from 'knex'
import { v4 as uuidv4 } from 'uuid'

import db from '@database/connection'
import { runTenantMigrations } from '@services/tenant.service'

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
export async function seed(knex: Knex): Promise<void> {
  // Get the data directory path (seeds is in database/seeds, data is in database/data)
  const dataDir = path.resolve(__dirname, '..', 'data')

  // Read tenants from JSON file
  const tenantsData = JSON.parse(
    readFileSync(path.join(dataDir, 'tenant.json'), 'utf-8')
  )

  const now = new Date()
  const tenantMap = new Map<string, { id: string; schema_name: string }>()

  // Step 1: Create or get tenant records
  for (const tenantData of tenantsData) {
    // Check if tenant already exists
    let tenant = await knex('tenants')
      .where({ schema_name: tenantData.schema_name })
      .whereNull('deleted_at')
      .first()

    if (!tenant) {
      // Create tenant record
      const [insertedTenant] = await knex('tenants')
        .insert({
          id: uuidv4(),
          name: tenantData.name,
          schema_name: tenantData.schema_name,
          is_active: tenantData.is_active ?? true,
          created_at: now,
          updated_at: now,
        })
        .returning('*')
      tenant = insertedTenant
      // eslint-disable-next-line no-console
      console.log(`✅ Created tenant: ${tenant.name} (${tenant.schema_name})`)
    } else {
      // eslint-disable-next-line no-console
      console.log(
        `⏭️  Tenant already exists: ${tenant.name} (${tenant.schema_name})`
      )
    }

    tenantMap.set(tenantData.schema_name, tenant)
  }

  // Step 2: Create tenant schemas and run migrations
  for (const [schemaName] of tenantMap.entries()) {
    // Ensure schema name has tenant_ prefix
    const fullSchemaName = schemaName.startsWith('tenant_')
      ? schemaName
      : `tenant_${schemaName}`

    // Check if schema exists
    const schemaExists = await db.raw(
      `SELECT EXISTS(
        SELECT 1 FROM information_schema.schemata 
        WHERE schema_name = ?
      )`,
      [fullSchemaName]
    )

    if (!schemaExists.rows[0].exists) {
      // Create schema
      await db.raw('CREATE SCHEMA IF NOT EXISTS ??', [fullSchemaName])
      // eslint-disable-next-line no-console
      console.log(`📦 Created tenant schema: ${fullSchemaName}`)

      // Run tenant migrations (only if schema was just created)
      try {
        await runTenantMigrations(schemaName)
        // eslint-disable-next-line no-console
        console.log(`🔄 Ran tenant migrations for: ${fullSchemaName}`)
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(
          `❌ Failed to run migrations for ${fullSchemaName}:`,
          error
        )
        throw error
      }
    } else {
      // eslint-disable-next-line no-console
      console.log(`⏭️  Schema already exists: ${fullSchemaName}`)
    }
  }

  // eslint-disable-next-line no-console
  console.log(`✅ Seeded ${tenantMap.size} tenant(s)`)
}
