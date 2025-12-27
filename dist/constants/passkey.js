"use strict";
/**
 * Passkey Constants
 * Configuration and constants for WebAuthn/FIDO2 passkey authentication
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRANSPORT_NAMES = exports.PASSKEY_TYPE_NAMES = exports.PASSKEY_DEVICE_TYPE = exports.PASSKEY_CREDENTIAL_TYPES = exports.CHALLENGE_EXPIRATION_MS = exports.WEBAUTHN_CONFIG = void 0;
const env_1 = require("../config/env");
/**
 * WebAuthn configuration
 */
exports.WEBAUTHN_CONFIG = {
    // Relying Party (RP) Name - displayed to user during registration
    rpName: "BKeep",
    // RP ID - domain name (e.g., 'example.com' or 'localhost')
    // Should match the domain where the frontend is hosted
    rpID: env_1.env.WEBAUTHN_RP_ID ?? "localhost",
    // Expected origin - full URL of the frontend
    origin: env_1.env.FRONTEND_URL ?? "http://localhost:3000",
    // Timeout for registration/authentication (60 seconds)
    timeout: 60000,
};
/**
 * Challenge expiration time (5 minutes in milliseconds)
 */
exports.CHALLENGE_EXPIRATION_MS = 5 * 60 * 1000;
/**
 * Passkey credential types
 */
exports.PASSKEY_CREDENTIAL_TYPES = {
    PLATFORM: "platform",
    ROAMING: "roaming",
};
/**
 * Passkey device type mapping
 */
exports.PASSKEY_DEVICE_TYPE = {
    SINGLE_DEVICE: "platform",
    MULTI_DEVICE: "roaming",
};
/**
 * Friendly names for passkey credential types
 */
exports.PASSKEY_TYPE_NAMES = {
    platform: "Platform Authenticator (Face ID, Touch ID, Windows Hello)",
    roaming: "Security Key (USB, NFC, Bluetooth)",
};
/**
 * Friendly names for transport methods
 */
exports.TRANSPORT_NAMES = {
    internal: "Built-in",
    usb: "USB",
    nfc: "NFC",
    ble: "Bluetooth",
    hybrid: "Hybrid",
    cable: "Cable",
    "smart-card": "Smart Card",
};
