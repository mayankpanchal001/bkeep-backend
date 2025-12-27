import type { Knex } from 'knex'

/**
 * Create user_roles pivot table migration
 * Many-to-many relationship between users and roles
 * Includes tenant_id for multi-tenant support
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user_roles', (table) => {
    // Foreign keys
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
    table
      .uuid('role_id')
      .notNullable()
      .references('id')
      .inTable('roles')
      .onDelete('CASCADE')
    table
      .uuid('tenant_id')
      .notNullable()
      .references('id')
      .inTable('tenants')
      .onDelete('CASCADE')
      .comment('Multi-tenant support: role is scoped to a specific tenant')

    // Composite primary key: user_id + role_id + tenant_id
    // This ensures a user can only have a role once per tenant
    table.primary(['user_id', 'role_id', 'tenant_id'])

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()

    // Indexes for efficient lookups
    // Note: user_id is part of primary key, but we add indexes for role_id and tenant_id
    // for efficient reverse lookups (e.g., "find all users with role X in tenant Y")
    table.index('role_id')
    table.index('tenant_id')
    table.index(['tenant_id', 'role_id']) // Composite index for common queries
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_roles')
}
