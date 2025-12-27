"use strict";
/**
 * Passkey Validation Schemas
 * Zod schemas for validating passkey-related requests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.passkeyStatsSchema = exports.passkeyDisableSchema = exports.passkeyEnableSchema = exports.passkeyDeleteSchema = exports.passkeyRenameParamsSchema = exports.passkeyRenameSchema = exports.passkeyGetSchema = exports.passkeyListSchema = exports.passkeyAuthenticationVerifySchema = exports.passkeyAuthenticationOptionsSchema = exports.passkeyRegistrationVerifySchema = exports.passkeyRegistrationOptionsSchema = void 0;
const zod_1 = require("zod");
/**
 * Schema for generating passkey registration options
 * No body parameters needed - uses authenticated user from JWT
 */
exports.passkeyRegistrationOptionsSchema = zod_1.z.object({}).optional();
/**
 * Schema for verifying passkey registration
 * Contains the WebAuthn credential creation response from the client
 */
exports.passkeyRegistrationVerifySchema = zod_1.z.object({
    // Friendly name for the passkey
    name: zod_1.z
        .string()
        .min(1, "Passkey name is required")
        .max(255, "Passkey name must be less than 255 characters")
        .trim(),
    // WebAuthn credential response (as JSON)
    credential: zod_1.z.object({
        id: zod_1.z.string().min(1),
        rawId: zod_1.z.string().min(1),
        response: zod_1.z.object({
            clientDataJSON: zod_1.z.string().min(1),
            attestationObject: zod_1.z.string().min(1),
            authenticatorData: zod_1.z.string().optional(),
            transports: zod_1.z
                .array(zod_1.z.enum([
                "internal",
                "usb",
                "nfc",
                "ble",
                "hybrid",
                "cable",
                "smart-card",
            ]))
                .optional(),
            publicKeyAlgorithm: zod_1.z.number().optional(),
            publicKey: zod_1.z.string().optional(),
        }),
        authenticatorAttachment: zod_1.z.enum(["platform", "cross-platform"]).optional(),
        clientExtensionResults: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
        type: zod_1.z.literal("public-key"),
    }),
});
/**
 * Schema for generating passkey authentication options
 * Optional: can specify user email for usernameless flow
 */
exports.passkeyAuthenticationOptionsSchema = zod_1.z
    .object({
    // Optional: email for usernameless authentication
    email: zod_1.z.string().email().optional(),
})
    .optional();
/**
 * Schema for verifying passkey authentication
 * Contains the WebAuthn assertion response from the client
 */
exports.passkeyAuthenticationVerifySchema = zod_1.z.object({
    // WebAuthn authentication response (as JSON)
    credential: zod_1.z.object({
        id: zod_1.z.string().min(1),
        rawId: zod_1.z.string().min(1),
        response: zod_1.z.object({
            clientDataJSON: zod_1.z.string().min(1),
            authenticatorData: zod_1.z.string().min(1),
            signature: zod_1.z.string().min(1),
            userHandle: zod_1.z.string().optional(),
        }),
        authenticatorAttachment: zod_1.z.enum(["platform", "cross-platform"]).optional(),
        clientExtensionResults: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
        type: zod_1.z.literal("public-key"),
    }),
});
/**
 * Schema for listing user's passkeys
 * No parameters needed - uses authenticated user from JWT
 */
exports.passkeyListSchema = zod_1.z
    .object({
    // Optional: filter by credential type
    credentialType: zod_1.z.enum(["platform", "roaming"]).optional(),
    // Optional: filter by active status
    isActive: zod_1.z
        .string()
        .optional()
        .transform((val) => val === "true"),
})
    .optional();
/**
 * Schema for getting a single passkey
 */
exports.passkeyGetSchema = zod_1.z.object({
    id: zod_1.z.string().uuid("Invalid passkey ID"),
});
/**
 * Schema for renaming a passkey (body)
 */
exports.passkeyRenameSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(1, "Passkey name is required")
        .max(255, "Passkey name must be less than 255 characters")
        .trim(),
});
/**
 * Schema for renaming a passkey (params)
 */
exports.passkeyRenameParamsSchema = zod_1.z.object({
    id: zod_1.z.string().uuid("Invalid passkey ID"),
});
/**
 * Schema for deleting a passkey (params)
 */
exports.passkeyDeleteSchema = zod_1.z.object({
    id: zod_1.z.string().uuid("Invalid passkey ID"),
});
/**
 * Schema for enabling a passkey (params)
 */
exports.passkeyEnableSchema = zod_1.z.object({
    id: zod_1.z.string().uuid("Invalid passkey ID"),
});
/**
 * Schema for disabling a passkey (params)
 */
exports.passkeyDisableSchema = zod_1.z.object({
    id: zod_1.z.string().uuid("Invalid passkey ID"),
});
/**
 * Schema for getting passkey statistics
 * No parameters needed - uses authenticated user from JWT
 */
exports.passkeyStatsSchema = zod_1.z.object({}).optional();
