import path from 'node:path'

import type { Knex } from 'knex'

import { env } from '@config/env'

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'pg',
    connection: {
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_NAME,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      ...(env.DB_SSL ? { ssl: { rejectUnauthorized: false } } : {}),
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: path.join(__dirname, '..', 'database', 'migrations'),
    },
    seeds: {
      directory: path.join(__dirname, '..', 'database', 'seeds'),
    },
  },

  production: {
    client: 'pg',
    connection: {
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_NAME,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      ...(env.DB_SSL ? { ssl: { rejectUnauthorized: false } } : {}),
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: path.join(__dirname, '..', 'database', 'migrations'),
    },
    seeds: {
      directory: path.join(__dirname, '..', 'database', 'seeds'),
    },
  },

  test: {
    client: 'pg',
    connection: {
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_NAME,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      ...(env.DB_SSL ? { ssl: { rejectUnauthorized: false } } : {}),
    },
    pool: {
      min: 1,
      max: 5,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: path.join(__dirname, '..', 'database', 'migrations'),
    },
    seeds: {
      directory: path.join(__dirname, '..', 'database', 'seeds'),
    },
  },
}

export default config
