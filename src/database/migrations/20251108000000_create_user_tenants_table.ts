import type { Knex } from 'knex'

/**
 * Create user_tenants pivot table migration
 * Many-to-many relationship between users and tenants
 * This replaces the direct tenant_id column in users table
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user_tenants', (table) => {
    // Foreign keys
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
    table
      .uuid('tenant_id')
      .notNullable()
      .references('id')
      .inTable('tenants')
      .onDelete('CASCADE')

    // Composite primary key: user_id + tenant_id
    // This ensures a user can only belong to a tenant once
    table.primary(['user_id', 'tenant_id'])

    // Indicates if this is the primary tenant for the user
    table
      .boolean('is_primary')
      .defaultTo(false)
      .notNullable()
      .comment('Indicates if this is the primary tenant for the user')

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()

    // Indexes for efficient lookups
    table.index('tenant_id')
    // Composite indexes for common queries
    table.index(['user_id', 'is_primary']) // For finding primary tenant
  })
}

export async function down(knex: Knex): Promise<void> {
  // Drop user_tenants table
  await knex.schema.dropTableIfExists('user_tenants')
}
