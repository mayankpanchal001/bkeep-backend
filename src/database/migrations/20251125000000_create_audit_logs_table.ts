import type { Knex } from 'knex'

/**
 * Create audit_logs table migration
 * Stores immutable audit trail for all system operations
 * Design: Event-sourcing pattern with JSONB for flexibility
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('audit_logs', (table) => {
    // Primary key - UUID
    table.uuid('id').primary()

    // Action performed
    // Using VARCHAR instead of ENUM to allow adding new actions without migration
    // Validation is enforced at application level via @constants/audit.ts
    table
      .string('action', 100)
      .notNullable()
      .comment(
        'Namespaced action (e.g., user.created, user.updated, user.deleted, user.logged_in)'
      )

    // Actor - Who performed the action
    // JSONB structure: { type: 'user' | 'system' | 'api_key', id: string, email?: string, name?: string }
    table
      .jsonb('actor')
      .notNullable()
      .comment('Who performed the action: { type, id, email?, name? }')

    // Targets - What was affected
    // JSONB structure: [{ type: string, id: string, ...metadata }]
    // Supports multiple targets per event (e.g., user + role assignment)
    table
      .jsonb('targets')
      .notNullable()
      .comment('Array of affected entities: [{ type, id, ...metadata }]')

    // Tenant context
    table.uuid('tenant_id').notNullable()

    // Request context
    // JSONB structure: { ip?: string, userAgent?: string, method?: string, endpoint?: string, requestId?: string }
    table
      .jsonb('context')
      .notNullable()
      .comment(
        'Request metadata: { ip, userAgent, method, endpoint, requestId }'
      )

    // Success status
    table
      .boolean('success')
      .notNullable()
      .defaultTo(true)
      .comment('Whether the action succeeded')

    // Timestamps
    table.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now())
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now())

    // Indexes for efficient queries
    table.index('action')
    table.index('tenant_id')
    table.index('occurred_at')
    table.index('success')
    table.index(['tenant_id', 'occurred_at']) // For finding tenant activity
    table.index(['action', 'occurred_at']) // For finding actions by type and time
  })

  // GIN indexes for JSONB queries (created after table creation)
  await knex.raw(
    'CREATE INDEX idx_audit_logs_actor_gin ON audit_logs USING GIN (actor jsonb_path_ops)'
  )
  await knex.raw(
    'CREATE INDEX idx_audit_logs_targets_gin ON audit_logs USING GIN (targets jsonb_path_ops)'
  )
  await knex.raw(
    'CREATE INDEX idx_audit_logs_context_gin ON audit_logs USING GIN (context jsonb_path_ops)'
  )
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('audit_logs')
}
