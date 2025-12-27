import knex, { type Knex } from 'knex'
import { Model } from 'objection'

import { env } from '@config/env'
import knexConfig from '@config/knexfile'

/**
 * Get database connection instance
 * @returns Knex database connection instance
 */
const getConnection = (): Knex => {
  const config = knexConfig[env.NODE_ENV] ?? knexConfig['production']
  if (!config) {
    throw new Error('Database configuration not found')
  }
  return knex(config)
}

const conn = getConnection()
Model.knex(conn)

export default conn
