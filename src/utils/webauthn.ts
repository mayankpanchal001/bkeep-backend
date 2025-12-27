/**
 * WebAuthn/FIDO2 Passkey Utility Functions
 * Provides helper functions for WebAuthn credential registration and authentication
 */

import type { PasskeyCredentialType } from '@/types/passkey.type'
import {
  PASSKEY_TYPE_NAMES,
  TRANSPORT_NAMES,
  WEBAUTHN_CONFIG,
} from '@constants/passkey'
import {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type VerifiedAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type WebAuthnCredential,
} from '@simplewebauthn/server'

/**
 * Generate registration options for creating a new passkey
 * This is step 1 of the registration ceremony
 */
export const generatePasskeyRegistrationOptions = async (
  userId: string,
  userEmail: string,
  userName: string,
  existingCredentials: Array<{
    credentialId: string
    transports?: AuthenticatorTransportFuture[]
  }> = []
): Promise<PublicKeyCredentialCreationOptionsJSON> => {
  // Generate options for passkey registration
  const options = await generateRegistrationOptions({
    rpName: WEBAUTHN_CONFIG.rpName,
    rpID: WEBAUTHN_CONFIG.rpID,
    userID: new TextEncoder().encode(userId),
    userName: userEmail,
    userDisplayName: userName,
    timeout: WEBAUTHN_CONFIG.timeout,
    attestationType: 'none', // 'none', 'indirect', or 'direct'
    // Exclude credentials that the user already registered
    excludeCredentials: existingCredentials
      .filter((cred) => cred.transports !== undefined)
      .map((cred) => ({
        id: cred.credentialId,
        transports: cred.transports as AuthenticatorTransportFuture[],
      })),
    // Authenticator selection criteria
    authenticatorSelection: {
      // Prefer platform authenticators (like Face ID, Touch ID)
      // But also allow cross-platform authenticators (USB keys)
      // Require user verification (biometric, PIN, etc.)
      userVerification: 'preferred', // 'required', 'preferred', or 'discouraged'
      // Require resident key (credential stored on authenticator)
      residentKey: 'preferred', // 'required', 'preferred', or 'discouraged'
      requireResidentKey: false,
    },
    // Supported algorithms (ES256 is most widely supported)
    supportedAlgorithmIDs: [-7, -257], // ES256 and RS256
  })

  return options
}

/**
 * Verify registration response from the client
 * This is step 2 of the registration ceremony
 */
export const verifyPasskeyRegistration = async (
  response: RegistrationResponseJSON,
  expectedChallenge: string
): Promise<{
  verified: boolean
  registrationInfo?: VerifiedRegistrationResponse['registrationInfo']
}> => {
  try {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: WEBAUTHN_CONFIG.origin,
      expectedRPID: WEBAUTHN_CONFIG.rpID,
      requireUserVerification: false, // Set to true for higher security
    })

    return {
      verified: verification.verified,
      registrationInfo: verification.registrationInfo,
    }
  } catch {
    return {
      verified: false,
    }
  }
}

/**
 * Generate authentication options for logging in with a passkey
 * This is step 1 of the authentication ceremony
 */
export const generatePasskeyAuthenticationOptions = async (
  allowedCredentials: Array<{
    credentialId: string
    transports?: AuthenticatorTransportFuture[]
  }> = []
): Promise<PublicKeyCredentialRequestOptionsJSON> => {
  // Generate options for passkey authentication
  const options = await generateAuthenticationOptions({
    rpID: WEBAUTHN_CONFIG.rpID,
    timeout: WEBAUTHN_CONFIG.timeout,
    // Allow specific credentials (if user has multiple passkeys)
    // Leave empty for usernameless/discoverable flow
    allowCredentials: allowedCredentials
      .filter((cred) => cred.transports !== undefined)
      .map((cred) => ({
        id: cred.credentialId,
        transports: cred.transports as AuthenticatorTransportFuture[],
      })),
    userVerification: 'preferred', // 'required', 'preferred', or 'discouraged'
  })

  return options
}

/**
 * Verify authentication response from the client
 * This is step 2 of the authentication ceremony
 */
export const verifyPasskeyAuthentication = async (
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
  credential: WebAuthnCredential
): Promise<{
  verified: boolean
  authenticationInfo?: VerifiedAuthenticationResponse['authenticationInfo']
}> => {
  try {
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: WEBAUTHN_CONFIG.origin,
      expectedRPID: WEBAUTHN_CONFIG.rpID,
      credential,
      requireUserVerification: false, // Set to true for higher security
    })

    return {
      verified: verification.verified,
      authenticationInfo: verification.authenticationInfo,
    }
  } catch {
    return {
      verified: false,
    }
  }
}

/**
 * Convert base64url string to Buffer
 */
export const base64urlToBuffer = (base64url: string): Buffer => {
  // Add padding if needed
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4)
  const base64 = base64url.replaceAll('-', '+').replaceAll('_', '/') + padding
  return Buffer.from(base64, 'base64')
}

/**
 * Convert Buffer to base64url string
 */
export const bufferToBase64url = (buffer: Buffer | Uint8Array): string => {
  const base64 = Buffer.from(buffer).toString('base64')
  return base64.replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

/**
 * Get friendly name for authenticator type
 */
export const getAuthenticatorTypeName = (
  credentialType: PasskeyCredentialType
): string => {
  return credentialType === 'platform'
    ? PASSKEY_TYPE_NAMES.platform
    : PASSKEY_TYPE_NAMES.roaming
}

/**
 * Get friendly names for transport methods
 */
export const getTransportNames = (
  transports?: AuthenticatorTransportFuture[]
): string[] => {
  if (!transports || transports.length === 0) {
    return ['Unknown']
  }

  return transports.map((t) => {
    const mapped = TRANSPORT_NAMES[t as keyof typeof TRANSPORT_NAMES]
    return mapped ?? t
  })
}
