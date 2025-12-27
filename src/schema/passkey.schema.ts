/**
 * Passkey Validation Schemas
 * Zod schemas for validating passkey-related requests
 */

import { z } from 'zod'

/**
 * Schema for generating passkey registration options
 * No body parameters needed - uses authenticated user from JWT
 */
export const passkeyRegistrationOptionsSchema = z.object({}).optional()

/**
 * Schema for verifying passkey registration
 * Contains the WebAuthn credential creation response from the client
 */
export const passkeyRegistrationVerifySchema = z.object({
  // Friendly name for the passkey
  name: z
    .string()
    .min(1, 'Passkey name is required')
    .max(255, 'Passkey name must be less than 255 characters')
    .trim(),
  // WebAuthn credential response (as JSON)
  credential: z.object({
    id: z.string().min(1),
    rawId: z.string().min(1),
    response: z.object({
      clientDataJSON: z.string().min(1),
      attestationObject: z.string().min(1),
      authenticatorData: z.string().optional(),
      transports: z
        .array(
          z.enum([
            'internal',
            'usb',
            'nfc',
            'ble',
            'hybrid',
            'cable',
            'smart-card',
          ])
        )
        .optional(),
      publicKeyAlgorithm: z.number().optional(),
      publicKey: z.string().optional(),
    }),
    authenticatorAttachment: z.enum(['platform', 'cross-platform']).optional(),
    clientExtensionResults: z.record(z.string(), z.any()).optional(),
    type: z.literal('public-key'),
  }),
})

/**
 * Schema for generating passkey authentication options
 * Optional: can specify user email for usernameless flow
 */
export const passkeyAuthenticationOptionsSchema = z
  .object({
    // Optional: email for usernameless authentication
    email: z.string().email().optional(),
  })
  .optional()

/**
 * Schema for verifying passkey authentication
 * Contains the WebAuthn assertion response from the client
 */
export const passkeyAuthenticationVerifySchema = z.object({
  // WebAuthn authentication response (as JSON)
  credential: z.object({
    id: z.string().min(1),
    rawId: z.string().min(1),
    response: z.object({
      clientDataJSON: z.string().min(1),
      authenticatorData: z.string().min(1),
      signature: z.string().min(1),
      userHandle: z.string().optional(),
    }),
    authenticatorAttachment: z.enum(['platform', 'cross-platform']).optional(),
    clientExtensionResults: z.record(z.string(), z.any()).optional(),
    type: z.literal('public-key'),
  }),
})

/**
 * Schema for listing user's passkeys
 * No parameters needed - uses authenticated user from JWT
 */
export const passkeyListSchema = z
  .object({
    // Optional: filter by credential type
    credentialType: z.enum(['platform', 'roaming']).optional(),
    // Optional: filter by active status
    isActive: z
      .string()
      .optional()
      .transform((val) => val === 'true'),
  })
  .optional()

/**
 * Schema for getting a single passkey
 */
export const passkeyGetSchema = z.object({
  id: z.string().uuid('Invalid passkey ID'),
})

/**
 * Schema for renaming a passkey (body)
 */
export const passkeyRenameSchema = z.object({
  name: z
    .string()
    .min(1, 'Passkey name is required')
    .max(255, 'Passkey name must be less than 255 characters')
    .trim(),
})

/**
 * Schema for renaming a passkey (params)
 */
export const passkeyRenameParamsSchema = z.object({
  id: z.string().uuid('Invalid passkey ID'),
})

/**
 * Schema for deleting a passkey (params)
 */
export const passkeyDeleteSchema = z.object({
  id: z.string().uuid('Invalid passkey ID'),
})

/**
 * Schema for enabling a passkey (params)
 */
export const passkeyEnableSchema = z.object({
  id: z.string().uuid('Invalid passkey ID'),
})

/**
 * Schema for disabling a passkey (params)
 */
export const passkeyDisableSchema = z.object({
  id: z.string().uuid('Invalid passkey ID'),
})

/**
 * Schema for getting passkey statistics
 * No parameters needed - uses authenticated user from JWT
 */
export const passkeyStatsSchema = z.object({}).optional()

/**
 * Type exports for TypeScript
 */
export type PasskeyRegistrationOptionsInput = z.infer<
  typeof passkeyRegistrationOptionsSchema
>
export type PasskeyRegistrationVerifyInput = z.infer<
  typeof passkeyRegistrationVerifySchema
>
export type PasskeyAuthenticationOptionsInput = z.infer<
  typeof passkeyAuthenticationOptionsSchema
>
export type PasskeyAuthenticationVerifyInput = z.infer<
  typeof passkeyAuthenticationVerifySchema
>
export type PasskeyListInput = z.infer<typeof passkeyListSchema>
export type PasskeyGetInput = z.infer<typeof passkeyGetSchema>
export type PasskeyRenameInput = z.infer<typeof passkeyRenameSchema>
export type PasskeyRenameParamsInput = z.infer<typeof passkeyRenameParamsSchema>
export type PasskeyDeleteInput = z.infer<typeof passkeyDeleteSchema>
export type PasskeyEnableInput = z.infer<typeof passkeyEnableSchema>
export type PasskeyDisableInput = z.infer<typeof passkeyDisableSchema>
export type PasskeyStatsInput = z.infer<typeof passkeyStatsSchema>
