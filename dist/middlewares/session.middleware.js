"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Session middleware configuration
 *
 * Features:
 * - Session store using Knex.js
 * - Session secret management
 * - Session cookie configuration
 * - Session cleanup interval
 */
const connect_session_knex_1 = require("connect-session-knex");
const express_session_1 = __importDefault(require("express-session"));
const env_1 = require("../config/env");
const index_1 = require("../constants/index");
const connection_1 = __importDefault(require("../database/connection"));
const store = new connect_session_knex_1.ConnectSessionKnexStore({
    knex: connection_1.default,
    tableName: "sessions",
    createTable: true,
    sidFieldName: "sid",
    cleanupInterval: 15 * 60 * 1000,
});
const sessionMiddleware = (0, express_session_1.default)({
    name: index_1.SECURITY_RULES.SESSION_NAME,
    secret: env_1.env.SESSION_SECRET,
    resave: false,
    rolling: true,
    saveUninitialized: false,
    cookie: {
        maxAge: index_1.SECURITY_RULES.SESSION_MAX_AGE,
        secure: (0, env_1.isProduction)(),
        httpOnly: (0, env_1.isProduction)(),
        sameSite: (0, env_1.isProduction)() ? "none" : "lax",
    },
    store,
});
exports.default = sessionMiddleware;
