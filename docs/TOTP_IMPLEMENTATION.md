# Google & Microsoft Authenticator (TOTP) Implementation

## Overview

This document describes the implementation of Time-Based One-Time Password (TOTP) authentication for Google Authenticator, Microsoft Authenticator, and other TOTP-compatible authenticator apps. TOTP provides a secure, app-based multi-factor authentication method that works offline.

**Key Benefits:**
- **Offline operation** - Works without internet connection
- **No SMS dependency** - No phone number required
- **Industry standard** - RFC 6238 compliant
- **Wide app support** - Works with all major authenticator apps

## Flow

### TOTP Setup Flow

```
User requests TOTP setup
  ↓
Backend generates secret key
  ↓
QR code generated with secret
  ↓
10 backup codes generated
  ↓
User scans QR code with app
  ↓
User enters 6-digit code
  ↓
Backend verifies code
  ↓
TOTP enabled & active
```

### TOTP Login Flow

```
User enters email/password
  ↓
Credentials validated
  ↓
TOTP enabled?
  ├─ No → Generate tokens & login
  └─ Yes → Request TOTP code
      ↓
      User enters 6-digit code
      ↓
      Backend verifies code
      ↓
      Generate tokens & login
```

### Backup Code Login Flow

```
User enters email/password
  ↓
Credentials validated
  ↓
TOTP enabled?
  ├─ No → Generate tokens & login
  └─ Yes → User uses backup code
      ↓
      Backend verifies backup code
      ↓
      Backup code removed (one-time use)
      ↓
      Generate tokens & login
```

## Features Implemented

### ✅ Dual MFA System
- **Email OTP**: Existing email-based OTP system (6-digit codes sent via email)
- **TOTP Authenticator**: New TOTP-based system using authenticator apps

### ✅ TOTP Setup Flow
- Generate secret key (base32 encoded)
- QR code generation for easy scanning
- Backup codes generation (10 codes for account recovery)
- Verification before activation
- Device/app name tracking

### ✅ TOTP Login Flow
- Automatic detection of TOTP requirement
- 30-second time window verification
- Support for backup codes
- Last used timestamp tracking

### ✅ Backup Codes
- 10 backup codes generated during setup
- Each code is 8 characters (alphanumeric, uppercase)
- One-time use (removed after verification)
- Can be regenerated at any time
- Old codes invalidated on regeneration

## Database Schema

### Migration: `20251119145555_create_user_authenticators_table.ts`

Created a new `user_authenticators` table with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to users table |
| `type` | ENUM('totp') | Authenticator type (extensible) |
| `secret` | VARCHAR(500) | TOTP secret key (base32 encoded) |
| `backup_codes` | TEXT | JSON array of backup codes |
| `is_active` | BOOLEAN | Whether authenticator is active |
| `verified_at` | TIMESTAMP | When authenticator was verified |
| `last_used_at` | TIMESTAMP | Last successful use timestamp |
| `device_name` | VARCHAR(255) | Device/app name |
| `user_agent` | VARCHAR(500) | Browser/app during setup |
| `ip_address` | VARCHAR(45) | IP address during setup |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |
| `deleted_at` | TIMESTAMP | Soft delete timestamp |

**Key Features:**
- Unique constraint on `user_id` + `type` (one active TOTP per user)
- Indexes for efficient querying
- Soft delete support
- Audit trail with user agent and IP

**Why a separate table?**
- Clean separation between temporary (email OTP in `mfa` table) and permanent (TOTP) credentials
- Scalable design - easy to add more authenticator types (SMS, hardware keys)
- Better audit trail with `last_used_at` and verification timestamps
- Keeps `users` table lean

## Architecture

### Technology Stack

**Backend:**
- `otplib` - TOTP token generation and verification
- `qrcode` - QR code generation for authenticator app setup

### File Structure

```
src/
├── controllers/
│   └── auth.controller.ts           # TOTP controller methods
├── models/
│   └── UserAuthenticator.ts         # TOTP authenticator model
├── queries/
│   └── user.queries.ts              # TOTP database queries
├── routes/
│   └── auth.route.ts                # TOTP routes
├── schema/
│   └── auth.schema.ts               # TOTP validation schemas
├── utils/
│   └── totp.ts                      # TOTP utility functions
├── constants/
│   └── security.ts                  # TOTP configuration
└── database/
    └── migrations/
        └── 20251119145555_create_user_authenticators_table.ts
```

## API Endpoints

All TOTP endpoints are under `/api/auth/totp/`:

### 1. Setup TOTP Authenticator

```http
POST /api/auth/totp/setup
Authorization: Bearer <access_token>

Response:
{
  "success": true,
  "message": "TOTP authenticator setup initiated",
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCode": "data:image/png;base64,iVBORw0KG...",
    "backupCodes": ["A1B2C3D4", "E5F6G7H8", ...]
  }
}
```

**Purpose:** Initiates TOTP setup by generating secret, QR code, and backup codes.

**Steps:**
1. User must be authenticated
2. System generates TOTP secret
3. QR code generated with secret
4. 10 backup codes generated
5. User scans QR code with authenticator app
6. **Save backup codes securely** - they won't be shown again!

### 2. Verify and Enable TOTP

```http
POST /api/auth/totp/verify
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "code": "123456"
}

Response:
{
  "success": true,
  "message": "TOTP authenticator enabled successfully",
  "data": {
    "mfaEnabled": true,
    "mfaType": "totp"
  }
}
```

**Purpose:** Verifies the TOTP code and enables TOTP for the user.

**Steps:**
1. User enters 6-digit code from authenticator app
2. System verifies code (30-second window)
3. TOTP is enabled and activated

### 3. Login with TOTP

```http
POST /api/auth/totp/login
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456",
  "isBackupCode": false
}

Response:
{
  "success": true,
  "message": "Multi-factor authentication successful",
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "user": { ... }
  }
}
```

**Purpose:** Verifies TOTP code during login and completes authentication.

**Notes:**
- Use `isBackupCode: true` when using backup codes
- Backup codes are 8 characters (vs 6 for TOTP)
- Backup codes are one-time use

### 4. Disable TOTP

```http
POST /api/auth/totp/disable
Authorization: Bearer <access_token>

Response:
{
  "success": true,
  "message": "TOTP authenticator disabled successfully",
  "data": {
    "mfaEnabled": false,
    "mfaType": "email"
  }
}
```

**Purpose:** Disables TOTP and removes authenticator.

**Notes:**
- Removes TOTP secret and backup codes
- Reverts to email OTP if MFA still needed

### 5. Regenerate Backup Codes

```http
POST /api/auth/totp/backup-codes
Authorization: Bearer <access_token>

Response:
{
  "success": true,
  "message": "Backup codes generated successfully",
  "data": {
    "backupCodes": ["A1B2C3D4", "E5F6G7H8", ...]
  }
}
```

**Purpose:** Generates new backup codes.

**Notes:**
- Generates 10 new backup codes
- **Old backup codes are invalidated**
- Save the new codes securely

### 6. Modified Login Endpoint

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response (if TOTP enabled):
{
  "success": true,
  "message": "TOTP verification required",
  "data": {
    "requiresMfa": true,
    "mfaType": "totp",
    "email": "user@example.com"
  }
}

Response (if email OTP enabled):
{
  "success": true,
  "message": "Verification code sent to your email",
  "data": {
    "requiresMfa": true,
    "mfaType": "email",
    "email": "user@example.com"
  }
}
```

**Flow:**
1. User submits email/password
2. System checks `mfaEnabled` and `mfaType`
3. If TOTP: returns `mfaType: "totp"` (no email sent)
4. If email: sends OTP email and returns `mfaType: "email"`
5. Frontend redirects to appropriate verification screen

## Code Examples

### Frontend Integration

#### Setup Flow

```typescript
// 1. Initiate TOTP setup
const setupResponse = await fetch('/api/auth/totp/setup', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
})

const { secret, qrCode, backupCodes } = await setupResponse.json()

// 2. Display QR code for user to scan
// <img src={qrCode} alt="Scan with authenticator app" />

// 3. Show backup codes (user must save them!)
// Display backup codes with copy button

// 4. User enters code from authenticator app
const verifyResponse = await fetch('/api/auth/totp/verify', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ code: userEnteredCode })
})

// 5. TOTP is now enabled!
```

#### Login Flow

```typescript
// 1. User enters email/password
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
})

const loginData = await loginResponse.json()

// 2. Check if MFA is required
if (loginData.data.requiresMfa) {
  const mfaType = loginData.data.mfaType
  
  if (mfaType === 'totp') {
    // Show TOTP input (6 digits)
    // Option to use backup code instead
    
    const totpResponse = await fetch('/api/auth/totp/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: loginData.data.email,
        code: userEnteredCode,
        isBackupCode: false
      })
    })
    
    // Get tokens and complete login
    const { accessToken, refreshToken, user } = await totpResponse.json()
  } else {
    // Show email OTP input
    // Use existing /api/auth/mfa/verify endpoint
  }
} else {
  // No MFA required, login complete
}
```

## Configuration

### Environment Variables

No additional environment variables required. TOTP configuration is in constants.

### TOTP Settings

TOTP settings in `src/constants/security.ts`:

```typescript
export const SECURITY_RULES = {
  // ... existing rules
  TOTP_WINDOW: 1,              // Allow 1 step before/after (30s window)
  TOTP_STEP: 30,               // 30 seconds per step
  TOTP_DIGITS: 6,              // 6-digit codes
  TOTP_ALGORITHM: 'sha1',      // Google Authenticator standard
  TOTP_ISSUER: 'BKeep',        // Issuer name in authenticator app
  BACKUP_CODES_COUNT: 10,      // Number of backup codes
  BACKUP_CODE_LENGTH: 8,       // Length of each backup code
}

export const MFA_TYPE = {
  EMAIL: 'email',
  TOTP: 'totp',
}
```

## Security Considerations

### ✅ Implemented Security Features

1. **Time-Based Verification**: 30-second time window with ±1 step tolerance
2. **Secret Storage**: Secrets stored in database (consider encryption in production)
3. **QR Code Security**: QR codes generated server-side
4. **Backup Codes**: One-time use codes for account recovery
5. **Rate Limiting**: Applied via `authRateLimiter` middleware

### 🔒 Best Practices

1. **Secret Storage**: Consider encrypting TOTP secrets at rest in production
2. **Backup Codes**: One-time use, removed after verification
3. **Time Sync**: Ensure server time is accurate (NTP recommended)
4. **Rate Limiting**: Already applied via `authRateLimiter` middleware
5. **HTTPS**: Always use HTTPS in production for QR code transmission
6. **User Education**: Inform users to save backup codes securely

## Testing

### Manual Testing

```bash
# 1. Setup TOTP
curl -X POST http://localhost:8000/api/auth/totp/setup \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json"

# 2. Verify and Enable
curl -X POST http://localhost:8000/api/auth/totp/verify \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"code": "123456"}'

# 3. Login with TOTP
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# Then verify with TOTP code
curl -X POST http://localhost:8000/api/auth/totp/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "code": "123456"}'

# 4. Login with Backup Code
curl -X POST http://localhost:8000/api/auth/totp/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "code": "A1B2C3D4", "isBackupCode": true}'
```

## Troubleshooting

### Common Issues

1. **"Invalid authenticator code"**
   - Ensure device time is synced (NTP)
   - Code expires every 30 seconds
   - Check if TOTP is properly enabled
   - Verify code is entered correctly (6 digits)

2. **"TOTP setup required before enabling"**
   - Must call `/totp/setup` before `/totp/verify`
   - Setup generates secret and QR code

3. **"Invalid backup code"**
   - Backup codes are one-time use
   - Codes are case-insensitive
   - Whitespace is automatically removed
   - Old codes invalidated after regeneration

4. **QR code not scanning**
   - Ensure image is displayed at sufficient size
   - Try manual entry using the secret key
   - Check image is not corrupted
   - Verify QR code format is correct

5. **"Code expired"**
   - TOTP codes change every 30 seconds
   - Enter the current code from authenticator app
   - System allows ±1 step tolerance (30s window)

## Migration Guide

To apply the database changes:

```bash
# Development
pnpm db:migrate

# Production
pnpm db:migrate:prod
```

To rollback:

```bash
# Development
pnpm db:migrate:rollback

# Production
pnpm db:migrate:rollback:prod
```

## Future Enhancements

Potential improvements:
1. **Encrypt TOTP secrets** at rest in production
2. **SMS as third MFA option** for additional flexibility
3. **Remember device** for 30 days to reduce MFA prompts
4. **Show last login IP/device** for security awareness
5. **Email notification** when TOTP is enabled/disabled
6. **Rate limiting** on verification attempts (per user)
7. **Admin panel** to view/manage user MFA settings
8. **Multiple authenticators** support (phone + tablet)

## Support for Authenticator Apps

This implementation is compatible with:
- ✅ Google Authenticator
- ✅ Microsoft Authenticator  
- ✅ Authy
- ✅ 1Password
- ✅ LastPass Authenticator
- ✅ Any TOTP RFC 6238 compliant app

## Additional Resources

- [RFC 6238 - TOTP Specification](https://tools.ietf.org/html/rfc6238)
- [Google Authenticator Wiki](https://github.com/google/google-authenticator/wiki)
- [otplib Documentation](https://github.com/yeojz/otplib)

---

**Note:** TOTP provides a secure, offline-capable MFA method. Encourage users to save backup codes in a secure location.
