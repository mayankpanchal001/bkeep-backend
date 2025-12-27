"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const helmet_1 = __importDefault(require("helmet"));
/**
 * Helmet middleware configuration for security headers
 *
 * Features:
 * - Content Security Policy (CSP) with custom directives
 * - Cross-Origin Embedder Policy disabled for compatibility
 * - Protection against common web vulnerabilities
 */
const helmetMiddleware = (0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
            imgSrc: ["'self'", "data:", "https:", "https://unpkg.com"],
            fontSrc: ["'self'", "https://unpkg.com"],
            connectSrc: ["'self'"],
        },
    },
    crossOriginEmbedderPolicy: false,
});
exports.default = helmetMiddleware;
