import type { Knex } from 'knex'

/**
 * Create user_passkeys table migration
 * Stores WebAuthn/FIDO2 passkey credentials for passwordless authentication
 *
 * Supports platform authenticators (Face ID, Touch ID, Windows Hello)
 * and roaming authenticators (USB security keys like YubiKey)
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user_passkeys', (table) => {
    // Primary key - UUID
    table.uuid('id').primary()

    // Foreign key to users table
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')

    // WebAuthn credential ID (base64url encoded, unique identifier for this credential)
    // This is the credentialId returned from navigator.credentials.create()
    table.string('credential_id', 1024).notNullable().unique()

    // Public key (base64url encoded, used to verify authentication signatures)
    table.text('public_key').notNullable()

    // Counter for replay attack protection (increments with each use)
    table.bigInteger('counter').notNullable().defaultTo(0)

    // Credential type: 'platform' (built-in like Face ID) or 'roaming' (USB keys)
    table
      .enum('credential_type', ['platform', 'roaming'], {
        useNative: true,
        enumName: 'passkey_credential_type_enum',
      })
      .notNullable()

    // Transport methods supported by this authenticator
    // Example: ['internal', 'usb', 'nfc', 'ble']
    table.jsonb('transports').nullable()

    // AAGUID (Authenticator Attestation Globally Unique Identifier)
    // Identifies the authenticator model
    table.string('aaguid', 255).nullable()

    // Friendly name for this passkey (e.g., "iPhone 13", "YubiKey 5", "MacBook Pro")
    table.string('name', 255).notNullable()

    // Whether this passkey is currently active
    table.boolean('is_active').notNullable().defaultTo(true)

    // Track last successful use
    table.timestamp('last_used_at').nullable()

    // Metadata for audit and display purposes
    table.string('user_agent', 500).nullable() // Browser/device during registration
    table.string('ip_address', 45).nullable() // IP address during registration

    // Backup eligibility and state (for credential backup)
    table.boolean('backup_eligible').notNullable().defaultTo(false)
    table.boolean('backup_state').notNullable().defaultTo(false)

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable()

    // Soft delete
    table.timestamp('deleted_at').nullable()

    // Indexes
    table.index('user_id')
    table.index('credential_id')
    table.index(['user_id', 'is_active', 'deleted_at']) // Find active passkeys
    table.index('last_used_at')
    table.index('created_at')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_passkeys')
  // Drop the enum type
  await knex.raw('DROP TYPE IF EXISTS passkey_credential_type_enum')
}
