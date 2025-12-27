/**
 * Passkey Type Definitions
 * TypeScript types for WebAuthn/FIDO2 passkey authentication
 */

import type { AuthenticatorTransportFuture } from '@simplewebauthn/server'

/**
 * Passkey credential types
 */
export type PasskeyCredentialType = 'platform' | 'roaming'

/**
 * Interface for creating a new passkey
 */
export interface CreatePasskeyData {
  userId: string
  credentialId: string
  publicKey: string
  counter: number
  credentialType: PasskeyCredentialType
  transports?: AuthenticatorTransportFuture[]
  aaguid?: string
  name: string
  userAgent?: string | null
  ipAddress?: string | null
  backupEligible: boolean
  backupState: boolean
}

/**
 * Interface for updating passkey data
 */
export interface UpdatePasskeyData {
  name?: string
  counter?: number
  lastUsedAt?: Date
  isActive?: boolean
}

/**
 * Interface for passkey credential data
 */
export interface PasskeyCredential {
  credentialId: string
  publicKey: string
  counter: number
  transports?: AuthenticatorTransportFuture[]
  aaguid?: string
  backupEligible: boolean
  backupState: boolean
}

/**
 * Interface for passkey statistics
 */
export interface PasskeyStats {
  total: number
  active: number
  platform: number
  roaming: number
  lastUsed?: Date
}

/**
 * WebAuthn configuration interface
 */
export interface WebAuthnConfig {
  rpName: string
  rpID: string
  origin: string
  timeout: number
}

/**
 * Challenge storage interface
 */
export interface StoredChallenge {
  challenge: string
  timestamp: number
}
