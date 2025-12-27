import type { Knex } from 'knex'

/**
 * Create user_authenticators table migration
 * Stores TOTP/authenticator app credentials for users
 * Supports Google Authenticator, Microsoft Authenticator, etc.
 *
 * This stores permanent authenticator configurations.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user_authenticators', (table) => {
    // Primary key - UUID
    table.uuid('id').primary()

    // Foreign key to users table
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')

    // Authenticator type: 'totp' (can be extended: 'sms', 'hardware_key', etc.)
    table
      .enum('type', ['totp'], {
        useNative: true,
        enumName: 'authenticator_type_enum',
      })
      .notNullable()
      .defaultTo('totp')

    // TOTP secret key (base32 encoded, consider encryption at application layer)
    table.string('secret', 500).notNullable()

    // Backup/recovery codes (JSON array of strings)
    table.text('backup_codes').nullable()

    // Whether this authenticator is currently active
    table.boolean('is_active').notNullable().defaultTo(true)

    // When the authenticator was successfully verified and activated
    table.timestamp('verified_at').nullable()

    // Track last successful use
    table.timestamp('last_used_at').nullable()

    // Metadata for audit and display purposes
    table.string('device_name', 255).nullable() // e.g., "iPhone 13", "Google Authenticator"
    table.string('user_agent', 500).nullable() // Browser/app that set it up
    table.string('ip_address', 45).nullable() // Setup IP address

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable()

    // Soft delete
    table.timestamp('deleted_at').nullable()

    // Indexes
    table.index('user_id')
    table.index(['user_id', 'type'])
    table.index(['user_id', 'is_active', 'deleted_at']) // Find active authenticators
    table.index('verified_at')
    table.index('last_used_at')
  })

  // Constraint: One active authenticator per type per user
  // Using raw SQL for partial unique index
  await knex.raw(`
    CREATE UNIQUE INDEX user_authenticators_user_id_type_active_unique
    ON user_authenticators (user_id, type)
    WHERE deleted_at IS NULL AND is_active = true
  `)
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_authenticators')
  // Drop the enum type
  await knex.raw('DROP TYPE IF EXISTS authenticator_type_enum')
}
