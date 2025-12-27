import type { QueryBuilder } from 'objection'
import { Model, ModelOptions, QueryContext, snakeCaseMappers } from 'objection'
import { v4 as uuidv4 } from 'uuid'

import { getCurrentDate, getCurrentISOString } from '@utils/date'

/**
 * BaseModel
 * - UUID primary key
 * - Timestamps
 * - Soft deletes
 */
export abstract class BaseModel extends Model {
  id!: string // UUID
  createdAt!: Date
  updatedAt!: Date
  deletedAt?: Date | null

  /**
   * Table name must be implemented by child class
   */
  static override get tableName(): string {
    throw new Error('tableName must be implemented by child class')
  }

  /**
   * JSON schema for validation
   */
  static override get jsonSchema() {
    return {
      type: 'object',
      required: [] as string[],
      properties: {
        id: { type: 'string', format: 'uuid' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        deletedAt: { type: ['string', 'null'], format: 'date-time' },
      },
    }
  }

  /**
   * Query builder modifiers for soft deletes
   */
  static override get modifiers() {
    return {
      // Only non-deleted records
      notDeleted(query: QueryBuilder<BaseModel>) {
        query.whereNull('deleted_at')
      },
      // Only deleted records
      deleted(query: QueryBuilder<BaseModel>) {
        query.whereNotNull('deleted_at')
      },
    }
  }

  /**
   * Map JS camelCase properties <-> DB snake_case columns
   */
  static override get columnNameMappers() {
    return snakeCaseMappers()
  }

  /**
   * Before insert hook → set UUID and timestamps
   */
  override $beforeInsert(_ctx: QueryContext): void {
    if (!this.id) this.id = uuidv4()
    const now = getCurrentDate()
    this.createdAt = now
    this.updatedAt = now
    this.deletedAt = null
  }

  /**
   * Before update hook → update timestamp
   */
  override $beforeUpdate(_opt: ModelOptions, _ctx: QueryContext): void {
    this.updatedAt = getCurrentDate()
  }

  /**
   * Helper: check if model is new (not saved yet)
   */
  isNew(): boolean {
    return !this.$id()
  }

  /**
   * Helper: get model's ID
   */
  getId(): string | undefined {
    return this.$id()
  }

  /**
   * Soft delete - mark as deleted instead of removing
   */
  async softDelete(): Promise<void> {
    const deletedAt = getCurrentISOString() as unknown as Date
    await this.$query().patch({ deletedAt })
    // Update the instance property after successful patch
    // Objection will convert Date to string when loading from DB
    const updated = await this.$query().findById(this.id)
    if (updated) {
      this.deletedAt = updated.deletedAt ?? null
      this.updatedAt = updated.updatedAt
    }
  }

  /**
   * Restore soft deleted record
   */
  async restore(): Promise<void> {
    await this.$query().patch({ deletedAt: null })
    // Update the instance property after successful patch
    const updated = await this.$query().findById(this.id)
    if (updated) {
      this.deletedAt = updated.deletedAt ?? null
      this.updatedAt = updated.updatedAt
    }
  }

  /**
   * Check if record is soft deleted
   */
  isDeleted(): boolean {
    return this.deletedAt !== null && this.deletedAt !== undefined
  }
}
