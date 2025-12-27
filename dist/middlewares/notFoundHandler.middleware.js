"use strict";
/**
 * Not Found Middleware
 * Catches all unmatched routes and throws NotFoundError
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = void 0;
const http_1 = require("../constants/http");
const ApiError_1 = require("../utils/ApiError");
/**
 * Catch-all middleware for unmatched routes
 * Must be placed after all other routes
 */
const notFoundHandler = (req, _res, next) => {
    next(new ApiError_1.ApiError(http_1.HTTP_STATUS.NOT_FOUND, `Route ${req.originalUrl} not found`, false));
};
exports.notFoundHandler = notFoundHandler;
