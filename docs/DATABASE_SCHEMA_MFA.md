# MFA Database Schema Documentation

## Overview

This document describes the improved database schema for Multi-Factor Authentication (MFA) in the BKeep backend. The schema supports two independent MFA flows: **Email OTP** and **TOTP Authenticator Apps**.

## Schema Design Philosophy

### Separation of Concerns
- **`mfa` table**: Stores temporary email OTP codes
- **`user_authenticators` table**: Stores permanent TOTP authenticator configurations
- **`users` table**: Only tracks if MFA is enabled (boolean flag)

### Benefits
1. ✅ Clean separation between temporary (email OTP) and permanent (TOTP) credentials
2. ✅ Scalable design - easy to add more authenticator types (SMS, hardware keys, etc.)
3. ✅ Better queryability and performance
4. ✅ Audit trail with timestamps (`last_used_at`, `verified_at`)
5. ✅ Keeps `users` table lean and focused

## Tables

### 1. `mfa` Table (Existing - Email OTP)

**Purpose**: Stores temporary one-time passwords sent via email

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `user_id` | UUID | NOT NULL, FK(users.id) | User this OTP belongs to |
| `code` | VARCHAR(255) | NOT NULL, UNIQUE | 6-digit OTP code |
| `expires_at` | TIMESTAMP | NOT NULL | When the code expires (5 minutes) |
| `user_agent` | VARCHAR(500) | NULLABLE | Browser/device info |
| `ip_address` | VARCHAR(45) | NULLABLE | IP address of request |
| `created_at` | TIMESTAMP | NOT NULL | When code was created |
| `updated_at` | TIMESTAMP | NOT NULL | Last update timestamp |
| `deleted_at` | TIMESTAMP | NULLABLE | Soft delete timestamp |

**Indexes**:
- `user_id`
- `code`
- `expires_at`
- `(expires_at, deleted_at)` - For cleanup queries
- `(user_id, deleted_at)` - For finding active codes

**Migration**: `20251113090000_create_mfa_table.ts`

**Usage**:
```typescript
// Create OTP
await createMfaOtp(userId, '123456', 5, userAgent, ipAddress)

// Verify OTP
await verifyMfaOtp(userId, '123456')
```

---

### 2. `user_authenticators` Table (New - TOTP)

**Purpose**: Stores permanent TOTP authenticator configurations for Google Authenticator, Microsoft Authenticator, etc.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `user_id` | UUID | NOT NULL, FK(users.id) | User this authenticator belongs to |
| `type` | ENUM('totp') | NOT NULL | Authenticator type (extensible) |
| `secret` | VARCHAR(500) | NOT NULL | TOTP secret (base32 encoded) |
| `backup_codes` | TEXT | NULLABLE | JSON array of backup codes |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Whether authenticator is active |
| `verified_at` | TIMESTAMP | NULLABLE | When authenticator was verified |
| `last_used_at` | TIMESTAMP | NULLABLE | Last successful use timestamp |
| `device_name` | VARCHAR(255) | NULLABLE | Device/app name (e.g., "iPhone 13") |
| `user_agent` | VARCHAR(500) | NULLABLE | Browser/app that set it up |
| `ip_address` | VARCHAR(45) | NULLABLE | IP address during setup |
| `created_at` | TIMESTAMP | NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL | Last update timestamp |
| `deleted_at` | TIMESTAMP | NULLABLE | Soft delete timestamp |

**Indexes**:
- `user_id`
- `(user_id, type)`
- `(user_id, is_active, deleted_at)` - For finding active authenticators
- `verified_at`
- `last_used_at`

**Unique Constraint**:
```sql
CREATE UNIQUE INDEX user_authenticators_user_id_type_active_unique
ON user_authenticators (user_id, type)
WHERE deleted_at IS NULL AND is_active = true;
```

This ensures only **one active authenticator per type per user**.

**Migration**: `20251119145555_create_user_authenticators_table.ts`

**Model**: `UserAuthenticator`

**Usage**:
```typescript
// Setup TOTP
const authenticator = await setupUserTotp(userId, secret, backupCodes, userAgent, ipAddress)

// Verify and activate
await verifyAndEnableUserTotp(userId)

// Get active authenticator
const auth = await getUserTotpAuthenticator(userId)

// Verify TOTP code
const isValid = verifyTotpToken(code, auth.secret)

// Update last used
await updateAuthenticatorLastUsed(auth.id)

// Disable TOTP
await disableUserTotp(userId)
```

---

### 3. `users` Table (Modified)

**MFA-Related Fields**:

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `mfa_enabled` | BOOLEAN | false | Whether MFA is enabled for this user |

**Note**: The `users` table only stores a simple boolean flag. The actual MFA type (email vs TOTP) is determined by checking:
1. If `UserAuthenticator` exists and is active → TOTP
2. Otherwise → Email OTP (if `mfaEnabled` is true)

---

## How the Two Flows Work Together

### Login Flow Decision Tree

```
User enters email/password
    ↓
Is mfaEnabled = true?
    ├─ No → Login successful (no MFA)
    └─ Yes → Check for active TOTP authenticator
         ├─ Found active TOTP → Require TOTP code
         │    └─ Verify against user_authenticators.secret
         └─ No TOTP → Require email OTP
              ├─ Generate 6-digit code
              ├─ Store in mfa table
              ├─ Send via email
              └─ Verify against mfa table
```

### Code Implementation

```typescript
// In login controller
if (user.mfaEnabled) {
  const authenticator = await getUserTotpAuthenticator(user.id)
  
  if (authenticator && authenticator.isActiveAndVerified()) {
    // Use TOTP flow
    return { requiresMfa: true, mfaType: 'totp' }
  } else {
    // Use email OTP flow
    await createMfaOtp(user.id, generateOTP())
    await queueMfaOtpEmail(...)
    return { requiresMfa: true, mfaType: 'email' }
  }
}
```

---

## Data Lifecycle

### Email OTP Flow

1. **Create**: User logs in → System generates code → Stores in `mfa` table
2. **Send**: System queues email with OTP code
3. **Verify**: User submits code → System checks `mfa` table
4. **Cleanup**: Code is soft-deleted after use or expiry (5 minutes)

### TOTP Flow

1. **Setup**: User initiates setup → System generates secret → Stores in `user_authenticators` (unverified)
2. **Verify**: User scans QR code → Submits TOTP code → System verifies → Marks as verified
3. **Use**: User logs in → Submits TOTP code → System verifies against stored secret
4. **Track**: System updates `last_used_at` on each successful verification
5. **Disable**: User disables TOTP → System soft-deletes authenticator record

---

## Querying Examples

### Find user's MFA type
```sql
-- Check if user has active TOTP
SELECT EXISTS(
  SELECT 1 FROM user_authenticators 
  WHERE user_id = $1 
    AND is_active = true 
    AND verified_at IS NOT NULL 
    AND deleted_at IS NULL
) AS has_totp;
```

### Get all active authenticators for a user
```sql
SELECT * FROM user_authenticators
WHERE user_id = $1
  AND is_active = true
  AND deleted_at IS NULL
  AND verified_at IS NOT NULL
ORDER BY last_used_at DESC NULLS LAST;
```

### Cleanup expired email OTPs
```sql
DELETE FROM mfa
WHERE expires_at < NOW()
  OR deleted_at IS NOT NULL;
```

### Audit authenticator usage
```sql
SELECT 
  u.email,
  ua.type,
  ua.device_name,
  ua.verified_at,
  ua.last_used_at,
  EXTRACT(DAY FROM NOW() - ua.last_used_at) AS days_since_last_use
FROM user_authenticators ua
JOIN users u ON ua.user_id = u.id
WHERE ua.deleted_at IS NULL
  AND ua.is_active = true
ORDER BY ua.last_used_at DESC NULLS LAST;
```

---

## Security Considerations

### Email OTP
- ✅ Short expiry time (5 minutes)
- ✅ One-time use (soft-deleted after verification)
- ✅ Rate limiting on generation
- ✅ Tracks IP and user agent
- ⚠️ Vulnerable to email interception

### TOTP
- ✅ Offline verification (no network required)
- ✅ Time-based (30-second window)
- ✅ Not vulnerable to email interception
- ✅ Backup codes for account recovery
- ✅ Tracks last usage for audit
- ⚠️ Secret should be encrypted at rest in production
- ⚠️ Requires accurate server time (NTP recommended)

### Backup Codes
- ✅ One-time use (removed after verification)
- ✅ 10 codes generated (8 characters each)
- ✅ Can be regenerated at any time
- ⚠️ User must store them securely

---

## Future Enhancements

The current schema is designed to be extensible:

### 1. Add SMS OTP
```sql
ALTER TYPE authenticator_type_enum ADD VALUE 'sms';

-- Add phone number column
ALTER TABLE user_authenticators 
ADD COLUMN phone_number VARCHAR(20);
```

### 2. Add Hardware Keys (FIDO2/WebAuthn)
```sql
ALTER TYPE authenticator_type_enum ADD VALUE 'fido2';

-- Add credential fields
ALTER TABLE user_authenticators 
ADD COLUMN credential_id TEXT,
ADD COLUMN public_key TEXT,
ADD COLUMN counter BIGINT;
```

### 3. Multiple Authenticators Per User
The schema already supports this! The unique constraint only applies per type:
```typescript
// User can have one TOTP + one SMS simultaneously
const totp = await UserAuthenticator.findActiveByUserAndType(userId, 'totp')
const sms = await UserAuthenticator.findActiveByUserAndType(userId, 'sms')
```

---

## Migration Guide

### From Old Schema to New Schema

The old schema had TOTP fields directly in the `users` table:
- `mfa_type` (enum)
- `mfa_secret` 
- `mfa_backup_codes`
- `mfa_enabled_at`

**Migration performed**:
1. Rolled back old migration
2. Created new `user_authenticators` table
3. Updated all queries and controllers
4. Kept `users.mfa_enabled` as a simple boolean

### Rolling Back

If you need to rollback:
```bash
# Development
pnpm db:migrate:rollback

# Production
pnpm db:migrate:rollback:prod
```

This will:
1. Drop `user_authenticators` table
2. Drop `authenticator_type_enum` enum type
3. Keep `mfa` table (for email OTP)

---

## Summary

| Feature | `mfa` Table | `user_authenticators` Table |
|---------|-------------|---------------------------|
| **Purpose** | Temporary email OTP codes | Permanent TOTP configs |
| **Lifetime** | 5 minutes | Until disabled |
| **Type** | Email OTP | TOTP (extensible) |
| **Verification** | Database lookup + expiry check | Time-based algorithm |
| **Storage** | One row per OTP | One row per authenticator |
| **Cleanup** | Auto-expire + soft delete | Soft delete only |
| **Backup** | N/A (regenerate) | 10 one-time codes |
| **Audit** | IP + user agent | IP + user agent + last_used_at |

This improved schema provides:
- ✅ Clean separation of concerns
- ✅ Scalability for future MFA types
- ✅ Better performance and queryability
- ✅ Enhanced security and audit capabilities
- ✅ Backward compatibility with existing email OTP flow

