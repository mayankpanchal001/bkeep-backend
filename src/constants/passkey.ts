/**
 * Passkey Constants
 * Configuration and constants for WebAuthn/FIDO2 passkey authentication
 */

import type { WebAuthnConfig } from '@/types/passkey.type'
import { env } from '@config/env'

/**
 * WebAuthn configuration
 */
export const WEBAUTHN_CONFIG: WebAuthnConfig = {
  // Relying Party (RP) Name - displayed to user during registration
  rpName: 'BKeep',
  // RP ID - domain name (e.g., 'example.com' or 'localhost')
  // Should match the domain where the frontend is hosted
  rpID: env.WEBAUTHN_RP_ID ?? 'localhost',
  // Expected origin - full URL of the frontend
  origin: env.FRONTEND_URL ?? 'http://localhost:3000',
  // Timeout for registration/authentication (60 seconds)
  timeout: 60000,
} as const

/**
 * Challenge expiration time (5 minutes in milliseconds)
 */
export const CHALLENGE_EXPIRATION_MS = 5 * 60 * 1000

/**
 * Passkey credential types
 */
export const PASSKEY_CREDENTIAL_TYPES = {
  PLATFORM: 'platform',
  ROAMING: 'roaming',
} as const

/**
 * Passkey device type mapping
 */
export const PASSKEY_DEVICE_TYPE = {
  SINGLE_DEVICE: 'platform',
  MULTI_DEVICE: 'roaming',
} as const

/**
 * Friendly names for passkey credential types
 */
export const PASSKEY_TYPE_NAMES = {
  platform: 'Platform Authenticator (Face ID, Touch ID, Windows Hello)',
  roaming: 'Security Key (USB, NFC, Bluetooth)',
} as const

/**
 * Friendly names for transport methods
 */
export const TRANSPORT_NAMES: Record<string, string> = {
  internal: 'Built-in',
  usb: 'USB',
  nfc: 'NFC',
  ble: 'Bluetooth',
  hybrid: 'Hybrid',
  cable: 'Cable',
  'smart-card': 'Smart Card',
} as const
