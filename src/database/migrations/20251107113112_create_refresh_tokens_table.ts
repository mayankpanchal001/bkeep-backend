import type { Knex } from 'knex'

/**
 * Create refresh_tokens table migration
 * Stores refresh tokens for JWT authentication
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('refresh_tokens', (table) => {
    // Primary key - UUID
    table.uuid('id').primary()

    // Foreign key to users table
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')

    // Token information
    table.text('token').notNullable().unique()
    table.timestamp('expires_at').notNullable()

    // Additional metadata
    table.string('user_agent', 500).nullable()
    table.string('ip_address', 45).nullable() // IPv6 max length

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable()

    // Soft delete
    table.timestamp('deleted_at').nullable()

    // Indexes
    table.index('user_id')
    table.index('token')
    table.index('expires_at')
    table.index('deleted_at')
    // Composite indexes for common queries
    table.index(['user_id', 'expires_at']) // For user token cleanup
    table.index(['expires_at', 'deleted_at']) // For cleanup of expired tokens
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('refresh_tokens')
}
