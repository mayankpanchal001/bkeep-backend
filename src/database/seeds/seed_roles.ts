/* eslint-disable unicorn/filename-case */
import { readFileSync } from 'node:fs'
import path from 'node:path'

import type { Knex } from 'knex'
import { v4 as uuidv4 } from 'uuid'

/**
 * Seeds the roles table in the database.
 *
 * This function reads role data from roles.json and inserts them.
 *
 * @param {Knex} knex - Knex instance
 * @returns {Promise<void>}
 */
export async function seed(knex: Knex): Promise<void> {
  // Get the data directory path (seeds is in database/seeds, data is in database/data)
  const dataDir = path.resolve(__dirname, '..', 'data')

  // Read roles from JSON file
  const rolesData = JSON.parse(
    readFileSync(path.join(dataDir, 'roles.json'), 'utf-8')
  )

  // Clear existing roles (but keep permissions)
  await knex('user_roles').del()
  await knex('role_permissions').del()
  await knex('roles').del()

  const roles = rolesData.map((role: Record<string, unknown>) => ({
    id: uuidv4(),
    ...role,
  }))

  // Insert roles
  await knex('roles').insert(roles)

  // Step 2: Assign permissions to roles
  // Get all permissions
  const allPermissions = await knex('permissions')
    .whereNull('deleted_at')
    .where('is_active', true)

  if (allPermissions.length === 0) {
    // eslint-disable-next-line no-console
    console.warn(
      '⚠️  No permissions found. Please run seed_permissions.ts first.'
    )
    return
  }

  // Get inserted roles with their IDs
  const insertedRoles = await knex('roles')
    .whereNull('deleted_at')
    .select('id', 'name')

  // Find superadmin role
  const superAdminRole = insertedRoles.find(
    (role: { name: string }) => role.name === 'superadmin'
  )

  if (superAdminRole) {
    // Assign all permissions to superadmin role
    const superAdminRolePermissions = allPermissions.map(
      (permission: { id: string }) => ({
        role_id: superAdminRole.id,
        permission_id: permission.id,
        created_at: new Date(),
      })
    )

    await knex('role_permissions').insert(superAdminRolePermissions)

    // eslint-disable-next-line no-console
    console.log(
      `✅ Assigned ${allPermissions.length} permission(s) to superadmin role`
    )
  }

  // Optional: Assign specific permissions to other roles
  // You can extend this mapping based on your requirements
  const rolePermissionMapping: Record<string, string[]> = {
    admin: allPermissions.map((p: { name: string }) => p.name), // Admin gets all permissions
    viewer: ['view_dashboard'], // Viewer only gets view_dashboard
    // Add more mappings as needed
  }

  for (const [roleName, permissionNames] of Object.entries(
    rolePermissionMapping
  )) {
    const role = insertedRoles.find(
      (r: { name: string }) => r.name === roleName
    )
    if (role) {
      const rolePermissions = allPermissions
        .filter((p: { name: string }) => permissionNames.includes(p.name))
        .map((permission: { id: string }) => ({
          role_id: role.id,
          permission_id: permission.id,
          created_at: new Date(),
        }))

      if (rolePermissions.length > 0) {
        await knex('role_permissions').insert(rolePermissions)
        // eslint-disable-next-line no-console
        console.log(
          `✅ Assigned ${rolePermissions.length} permission(s) to ${roleName} role`
        )
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log(`✅ Seeded ${roles.length} role(s)`)
}
