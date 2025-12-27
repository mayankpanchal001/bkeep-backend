"use strict";
/**
 * Request Middleware
 * Adds request tracking and user agent parsing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.userAgent = exports.requestId = void 0;
const node_crypto_1 = require("node:crypto");
const ua_parser_js_1 = require("ua-parser-js");
/**
 * Add request ID to each request
 * Uses x-request-id from header if present, otherwise generates a new UUID
 */
const requestId = (req, res, next) => {
    const existingRequestId = req.headers["x-request-id"];
    const id = existingRequestId?.toString() ?? (0, node_crypto_1.randomUUID)();
    // Make request ID available in req object
    req.requestId = id;
    // Add request ID to response headers
    res.setHeader("x-request-id", id);
    next();
};
exports.requestId = requestId;
/**
 * Parse user agent and add to request object
 */
const userAgent = (req, _res, next) => {
    const parser = (0, ua_parser_js_1.UAParser)(req.headers["user-agent"] ?? "");
    req.userAgent = {
        browser: parser.browser,
        os: parser.os,
        device: parser.device,
        engine: parser.engine,
        cpu: parser.cpu,
    };
    next();
};
exports.userAgent = userAgent;
