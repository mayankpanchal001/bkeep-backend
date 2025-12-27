/* eslint-disable unicorn/filename-case */
import { readFileSync } from 'node:fs'
import path from 'node:path'

import type { Knex } from 'knex'
import { v4 as uuidv4 } from 'uuid'

/**
 * Seeds the permissions table in the database.
 *
 * This function reads permission data from permissions.json and inserts them.
 *
 * @param {Knex} knex - Knex instance
 * @returns {Promise<void>}
 */
export async function seed(knex: Knex): Promise<void> {
  // Get the data directory path (seeds is in database/seeds, data is in database/data)
  const dataDir = path.resolve(__dirname, '..', 'data')

  // Read permissions from JSON file
  const permissionsData = JSON.parse(
    readFileSync(path.join(dataDir, 'permissions.json'), 'utf-8')
  )

  // Clear existing permissions
  await knex('role_permissions').del()
  await knex('permissions').del()

  const permissions = permissionsData.map(
    (permission: Record<string, unknown>) => ({
      id: uuidv4(),
      ...permission,
    })
  )

  // Insert permissions
  await knex('permissions').insert(permissions)

  // eslint-disable-next-line no-console
  console.log(`✅ Seeded ${permissions.length} permission(s)`)
}
