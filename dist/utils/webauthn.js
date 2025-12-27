"use strict";
/**
 * WebAuthn/FIDO2 Passkey Utility Functions
 * Provides helper functions for WebAuthn credential registration and authentication
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTransportNames = exports.getAuthenticatorTypeName = exports.bufferToBase64url = exports.base64urlToBuffer = exports.verifyPasskeyAuthentication = exports.generatePasskeyAuthenticationOptions = exports.verifyPasskeyRegistration = exports.generatePasskeyRegistrationOptions = void 0;
const passkey_1 = require("../constants/passkey");
const server_1 = require("@simplewebauthn/server");
/**
 * Generate registration options for creating a new passkey
 * This is step 1 of the registration ceremony
 */
const generatePasskeyRegistrationOptions = async (userId, userEmail, userName, existingCredentials = []) => {
    // Generate options for passkey registration
    const options = await (0, server_1.generateRegistrationOptions)({
        rpName: passkey_1.WEBAUTHN_CONFIG.rpName,
        rpID: passkey_1.WEBAUTHN_CONFIG.rpID,
        userID: new TextEncoder().encode(userId),
        userName: userEmail,
        userDisplayName: userName,
        timeout: passkey_1.WEBAUTHN_CONFIG.timeout,
        attestationType: "none", // 'none', 'indirect', or 'direct'
        // Exclude credentials that the user already registered
        excludeCredentials: existingCredentials
            .filter((cred) => cred.transports !== undefined)
            .map((cred) => ({
            id: cred.credentialId,
            transports: cred.transports,
        })),
        // Authenticator selection criteria
        authenticatorSelection: {
            // Prefer platform authenticators (like Face ID, Touch ID)
            // But also allow cross-platform authenticators (USB keys)
            // Require user verification (biometric, PIN, etc.)
            userVerification: "preferred", // 'required', 'preferred', or 'discouraged'
            // Require resident key (credential stored on authenticator)
            residentKey: "preferred", // 'required', 'preferred', or 'discouraged'
            requireResidentKey: false,
        },
        // Supported algorithms (ES256 is most widely supported)
        supportedAlgorithmIDs: [-7, -257], // ES256 and RS256
    });
    return options;
};
exports.generatePasskeyRegistrationOptions = generatePasskeyRegistrationOptions;
/**
 * Verify registration response from the client
 * This is step 2 of the registration ceremony
 */
const verifyPasskeyRegistration = async (response, expectedChallenge) => {
    try {
        const verification = await (0, server_1.verifyRegistrationResponse)({
            response,
            expectedChallenge,
            expectedOrigin: passkey_1.WEBAUTHN_CONFIG.origin,
            expectedRPID: passkey_1.WEBAUTHN_CONFIG.rpID,
            requireUserVerification: false, // Set to true for higher security
        });
        return {
            verified: verification.verified,
            registrationInfo: verification.registrationInfo,
        };
    }
    catch {
        return {
            verified: false,
        };
    }
};
exports.verifyPasskeyRegistration = verifyPasskeyRegistration;
/**
 * Generate authentication options for logging in with a passkey
 * This is step 1 of the authentication ceremony
 */
const generatePasskeyAuthenticationOptions = async (allowedCredentials = []) => {
    // Generate options for passkey authentication
    const options = await (0, server_1.generateAuthenticationOptions)({
        rpID: passkey_1.WEBAUTHN_CONFIG.rpID,
        timeout: passkey_1.WEBAUTHN_CONFIG.timeout,
        // Allow specific credentials (if user has multiple passkeys)
        // Leave empty for usernameless/discoverable flow
        allowCredentials: allowedCredentials
            .filter((cred) => cred.transports !== undefined)
            .map((cred) => ({
            id: cred.credentialId,
            transports: cred.transports,
        })),
        userVerification: "preferred", // 'required', 'preferred', or 'discouraged'
    });
    return options;
};
exports.generatePasskeyAuthenticationOptions = generatePasskeyAuthenticationOptions;
/**
 * Verify authentication response from the client
 * This is step 2 of the authentication ceremony
 */
const verifyPasskeyAuthentication = async (response, expectedChallenge, credential) => {
    try {
        const verification = await (0, server_1.verifyAuthenticationResponse)({
            response,
            expectedChallenge,
            expectedOrigin: passkey_1.WEBAUTHN_CONFIG.origin,
            expectedRPID: passkey_1.WEBAUTHN_CONFIG.rpID,
            credential,
            requireUserVerification: false, // Set to true for higher security
        });
        return {
            verified: verification.verified,
            authenticationInfo: verification.authenticationInfo,
        };
    }
    catch {
        return {
            verified: false,
        };
    }
};
exports.verifyPasskeyAuthentication = verifyPasskeyAuthentication;
/**
 * Convert base64url string to Buffer
 */
const base64urlToBuffer = (base64url) => {
    // Add padding if needed
    const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
    const base64 = base64url.replaceAll("-", "+").replaceAll("_", "/") + padding;
    return Buffer.from(base64, "base64");
};
exports.base64urlToBuffer = base64urlToBuffer;
/**
 * Convert Buffer to base64url string
 */
const bufferToBase64url = (buffer) => {
    const base64 = Buffer.from(buffer).toString("base64");
    return base64.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};
exports.bufferToBase64url = bufferToBase64url;
/**
 * Get friendly name for authenticator type
 */
const getAuthenticatorTypeName = (credentialType) => {
    return credentialType === "platform"
        ? passkey_1.PASSKEY_TYPE_NAMES.platform
        : passkey_1.PASSKEY_TYPE_NAMES.roaming;
};
exports.getAuthenticatorTypeName = getAuthenticatorTypeName;
/**
 * Get friendly names for transport methods
 */
const getTransportNames = (transports) => {
    if (!transports || transports.length === 0) {
        return ["Unknown"];
    }
    return transports.map((t) => {
        const mapped = passkey_1.TRANSPORT_NAMES[t];
        return mapped ?? t;
    });
};
exports.getTransportNames = getTransportNames;
