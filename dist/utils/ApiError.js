"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
/**
 * Creates a custom error with the given message, status code, and operational status.
 * @param {string} message - The error message to display.
 * @param {number} statusCode - The HTTP status code (default: 500).
 * @param {boolean} isOperational - Whether the error is operational (default: true).
 */
class ApiError extends Error {
    statusCode;
    isOperational;
    constructor(statusCode, message, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.ApiError = ApiError;
