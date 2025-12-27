import type { Knex } from 'knex'

/**
 * Create journal_entries and journal_entry_lines tables migration
 * Tenant-specific tables for Journal Entries (double-entry bookkeeping)
 * Foundation for proper accounting and general ledger tracking
 * This migration should only be run in tenant schemas, not in public schema
 */
export async function up(knex: Knex): Promise<void> {
  // Journal Entries table
  await knex.schema.createTable('journal_entries', (table) => {
    // Primary key - UUID
    table.uuid('id').primary()

    // Tenant reference
    table
      .uuid('tenant_id')
      .notNullable()
      .references('id')
      .inTable('public.tenants')
      .onDelete('CASCADE')
      .comment('Reference to the tenant this journal entry belongs to')

    // Entry identification
    table
      .string('entry_number', 100)
      .nullable()
      .comment('Journal entry number (e.g., JE-2024-001)')

    table
      .timestamp('entry_date')
      .notNullable()
      .comment('Date of the journal entry')

    // Entry type and purpose
    table
      .string('entry_type', 50)
      .notNullable()
      .defaultTo('standard')
      .comment('Entry type: standard, adjusting, closing, reversing')

    table
      .boolean('is_adjusting')
      .notNullable()
      .defaultTo(false)
      .comment('Whether this is an adjusting entry')

    table
      .boolean('is_closing')
      .notNullable()
      .defaultTo(false)
      .comment('Whether this is a closing entry')

    table
      .boolean('is_reversing')
      .notNullable()
      .defaultTo(false)
      .comment('Whether this is a reversing entry')

    table
      .timestamp('reversal_date')
      .nullable()
      .comment('Date when this entry should be reversed')

    // Description and reference
    table
      .text('description')
      .nullable()
      .comment('Description of the journal entry')

    table
      .string('reference', 255)
      .nullable()
      .comment('External reference number or document number')

    table
      .text('memo')
      .nullable()
      .comment('General memo/notes for the journal entry')

    // Status
    table
      .string('status', 50)
      .notNullable()
      .defaultTo('draft')
      .comment('Status: draft, posted, voided')

    // Source tracking
    table
      .string('source_module', 100)
      .nullable()
      .comment('Source module (e.g., invoices, bills, manual, transactions)')

    table
      .uuid('source_id')
      .nullable()
      .comment('ID of the source document that created this entry')

    // Totals for validation
    table
      .decimal('total_debit', 15, 4)
      .notNullable()
      .defaultTo(0)
      .comment('Total debit amount (for validation)')

    table
      .decimal('total_credit', 15, 4)
      .notNullable()
      .defaultTo(0)
      .comment('Total credit amount (for validation)')

    // Approval workflow
    table
      .uuid('approved_by')
      .nullable()
      .references('id')
      .inTable('public.users')
      .onDelete('SET NULL')
      .comment('User who approved this journal entry')

    table
      .timestamp('approved_at')
      .nullable()
      .comment('Date when this journal entry was approved')

    // Posting
    table
      .uuid('posted_by')
      .nullable()
      .references('id')
      .inTable('public.users')
      .onDelete('SET NULL')
      .comment('User who posted this journal entry')

    table
      .timestamp('posted_at')
      .nullable()
      .comment('Date when this journal entry was posted')

    // Audit fields
    table
      .uuid('created_by')
      .notNullable()
      .references('id')
      .inTable('public.users')
      .onDelete('RESTRICT')
      .comment('User who created this journal entry')

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable()
    table.timestamp('deleted_at').nullable()

    // Indexes
    table.index(['tenant_id', 'deleted_at'])
    table.index(['tenant_id', 'entry_date'])
    table.index(['tenant_id', 'status'])
    table.index(['tenant_id', 'source_module', 'source_id'])
    table.unique(['tenant_id', 'entry_number', 'deleted_at'])
  })

  // Journal Entry Lines table
  await knex.schema.createTable('journal_entry_lines', (table) => {
    // Primary key - UUID
    table.uuid('id').primary()

    // Tenant reference
    table
      .uuid('tenant_id')
      .notNullable()
      .references('id')
      .inTable('public.tenants')
      .onDelete('CASCADE')
      .comment('Reference to the tenant this line belongs to')

    // Journal entry reference
    table
      .uuid('journal_entry_id')
      .notNullable()
      .references('id')
      .inTable('journal_entries')
      .onDelete('CASCADE')
      .comment('Reference to the parent journal entry')

    // Account reference
    table
      .uuid('account_id')
      .notNullable()
      .references('id')
      .inTable('chart_of_accounts')
      .onDelete('RESTRICT')
      .comment('Reference to the chart of account for this line')

    // Line order
    table
      .integer('line_number')
      .notNullable()
      .defaultTo(1)
      .comment('Line number within the journal entry')

    // Amounts
    table
      .decimal('debit', 15, 4)
      .notNullable()
      .defaultTo(0)
      .comment('Debit amount for this line')

    table
      .decimal('credit', 15, 4)
      .notNullable()
      .defaultTo(0)
      .comment('Credit amount for this line')

    // Description
    table.text('description').nullable().comment('Description for this line')

    // Memo
    table
      .text('memo')
      .nullable()
      .comment('Memo or additional notes for this line')

    // Tracking fields (optional - nullable since contacts table may not exist yet)
    // Note: Foreign key is commented out as contacts table may not exist
    // Uncomment when contacts table is created
    table
      .uuid('contact_id')
      .nullable()
      // .references('id')
      // .inTable('contacts')
      // .onDelete('SET NULL')
      .comment(
        'Reference to contact (customer/vendor) - uncomment FK when contacts table exists'
      )

    // Audit fields
    table
      .uuid('created_by')
      .notNullable()
      .references('id')
      .inTable('public.users')
      .onDelete('RESTRICT')
      .comment('User who created this line')

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable()
    table.timestamp('deleted_at').nullable()

    // Indexes
    table.index(['tenant_id', 'journal_entry_id'])
    table.index(['tenant_id', 'account_id'])
    table.index(['tenant_id', 'contact_id'])
    table.index(['tenant_id', 'deleted_at'])
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('journal_entry_lines')
  await knex.schema.dropTableIfExists('journal_entries')
}
