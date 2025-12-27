"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Higher-order function that wraps async Express route handlers
 * to automatically catch and forward errors to the error handling middleware
 *
 * @param fn - Async function that handles the route logic
 * @returns Express RequestHandler that can be used as middleware
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
exports.default = asyncHandler;
