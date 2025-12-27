"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRefreshToken = exports.verifyAccessToken = exports.verifyToken = exports.signTokens = exports.signRefreshToken = exports.signAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const http_1 = require("../constants/http");
const ApiError_1 = require("./ApiError");
/**
 * Sign access token
 * @param user - User data to encode in token
 * @returns Access token string
 */
const signAccessToken = (user) => {
    return jsonwebtoken_1.default.sign({ user }, env_1.env.ACCESS_TOKEN_SECRET, {
        expiresIn: env_1.env.ACCESS_TOKEN_EXPIRY,
        algorithm: "HS256",
    });
};
exports.signAccessToken = signAccessToken;
/**
 * Sign refresh token
 * @param user - User data to encode in token (only id is needed)
 * @returns Refresh token string
 */
const signRefreshToken = (user) => {
    return jsonwebtoken_1.default.sign({ user: { id: user.id } }, env_1.env.REFRESH_TOKEN_SECRET, {
        expiresIn: env_1.env.REFRESH_TOKEN_EXPIRY,
        algorithm: "HS256",
    });
};
exports.signRefreshToken = signRefreshToken;
/**
 * Sign both access and refresh tokens
 * @param user - User data to encode in tokens
 * @returns Object containing accessToken and refreshToken
 */
const signTokens = (user) => {
    const accessToken = (0, exports.signAccessToken)(user);
    const refreshToken = (0, exports.signRefreshToken)(user);
    return { accessToken, refreshToken };
};
exports.signTokens = signTokens;
/**
 * Verify JWT token
 * @param token - Token to verify
 * @param secret - Secret key to verify against
 * @returns Decoded token payload
 */
const verifyToken = async (token, secret) => {
    return new Promise((resolve, reject) => {
        jsonwebtoken_1.default.verify(token, secret, (error, decoded) => {
            if (error) {
                reject(new ApiError_1.ApiError(http_1.HTTP_STATUS.UNAUTHORIZED, `Token verification failed: ${error.message}`));
            }
            else {
                resolve(decoded);
            }
        });
    });
};
exports.verifyToken = verifyToken;
/**
 * Verify access token
 * @param token - Refresh token to verify
 * @returns User ID from token
 */
const verifyAccessToken = async (token) => {
    const decoded = await (0, exports.verifyToken)(token, env_1.env.ACCESS_TOKEN_SECRET);
    return decoded.user;
};
exports.verifyAccessToken = verifyAccessToken;
/**
 * Verify refresh token
 * @param token - Refresh token to verify
 * @returns User ID from token
 */
const verifyRefreshToken = async (token) => {
    const decoded = await (0, exports.verifyToken)(token, env_1.env.REFRESH_TOKEN_SECRET);
    return decoded.user;
};
exports.verifyRefreshToken = verifyRefreshToken;
