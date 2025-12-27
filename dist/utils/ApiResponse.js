"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiResponse = void 0;
const http_1 = require("../constants/http");
/**
 * Standard API response wrapper class
 * Provides a consistent structure for API responses
 */
class ApiResponse {
    success;
    statusCode;
    message;
    data;
    constructor(statusCode, message, data) {
        this.statusCode = statusCode;
        this.data = data;
        this.message = message;
        this.success =
            statusCode >= http_1.HTTP_STATUS.OK && statusCode < http_1.HTTP_STATUS.BAD_REQUEST;
    }
}
exports.ApiResponse = ApiResponse;
