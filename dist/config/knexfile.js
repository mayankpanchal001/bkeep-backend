"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const env_1 = require("./env");
const config = {
    development: {
        client: "pg",
        connection: {
            host: env_1.env.DB_HOST,
            port: env_1.env.DB_PORT,
            database: env_1.env.DB_NAME,
            user: env_1.env.DB_USER,
            password: env_1.env.DB_PASSWORD,
            ...(env_1.env.DB_SSL ? { ssl: { rejectUnauthorized: false } } : {}),
        },
        pool: {
            min: 2,
            max: 10,
        },
        migrations: {
            tableName: "knex_migrations",
            directory: node_path_1.default.join(__dirname, "..", "database", "migrations"),
        },
        seeds: {
            directory: node_path_1.default.join(__dirname, "..", "database", "seeds"),
        },
    },
    production: {
        client: "pg",
        connection: {
            host: env_1.env.DB_HOST,
            port: env_1.env.DB_PORT,
            database: env_1.env.DB_NAME,
            user: env_1.env.DB_USER,
            password: env_1.env.DB_PASSWORD,
            ...(env_1.env.DB_SSL ? { ssl: { rejectUnauthorized: false } } : {}),
        },
        pool: {
            min: 2,
            max: 10,
        },
        migrations: {
            tableName: "knex_migrations",
            directory: node_path_1.default.join(__dirname, "..", "database", "migrations"),
        },
        seeds: {
            directory: node_path_1.default.join(__dirname, "..", "database", "seeds"),
        },
    },
    test: {
        client: "pg",
        connection: {
            host: env_1.env.DB_HOST,
            port: env_1.env.DB_PORT,
            database: env_1.env.DB_NAME,
            user: env_1.env.DB_USER,
            password: env_1.env.DB_PASSWORD,
            ...(env_1.env.DB_SSL ? { ssl: { rejectUnauthorized: false } } : {}),
        },
        pool: {
            min: 1,
            max: 5,
        },
        migrations: {
            tableName: "knex_migrations",
            directory: node_path_1.default.join(__dirname, "..", "database", "migrations"),
        },
        seeds: {
            directory: node_path_1.default.join(__dirname, "..", "database", "seeds"),
        },
    },
};
exports.default = config;
