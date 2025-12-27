"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const knex_1 = __importDefault(require("knex"));
const objection_1 = require("objection");
const env_1 = require("../config/env");
const knexfile_1 = __importDefault(require("../config/knexfile"));
/**
 * Get database connection instance
 * @returns Knex database connection instance
 */
const getConnection = () => {
    const config = knexfile_1.default[env_1.env.NODE_ENV] ?? knexfile_1.default["production"];
    if (!config) {
        throw new Error("Database configuration not found");
    }
    return (0, knex_1.default)(config);
};
const conn = getConnection();
objection_1.Model.knex(conn);
exports.default = conn;
