import type { Knex } from 'knex'

/**
 * Create role_permissions pivot table migration
 * Many-to-many relationship between roles and permissions
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('role_permissions', (table) => {
    // Foreign keys
    table
      .uuid('role_id')
      .notNullable()
      .references('id')
      .inTable('roles')
      .onDelete('CASCADE')
    table
      .uuid('permission_id')
      .notNullable()
      .references('id')
      .inTable('permissions')
      .onDelete('CASCADE')

    // Composite primary key: role_id + permission_id
    // This ensures a role can only have a permission once
    table.primary(['role_id', 'permission_id'])

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()

    // Indexes (role_id and permission_id are already indexed as part of primary key)
    // Additional indexes for reverse lookups
    table.index('permission_id')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('role_permissions')
}
