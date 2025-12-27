# MFA Email OTP

## Overview

Email OTP (One-Time Password) is a multi-factor authentication method where users receive a 6-digit code via email after entering their password. This adds an extra layer of security to the login process by requiring both something the user knows (password) and something they have access to (email).

**Key Benefits:**
- **Simple to use** - No additional apps required
- **Secure** - 6-digit codes with 5-minute expiration
- **One-time use** - Codes are invalidated after verification
- **Email-based** - Works with any email address

## Flow

### Email OTP Login Flow

```
User enters email/password
  ↓
Credentials validated
  ↓
MFA enabled?
  ├─ No → Generate tokens & login
  └─ Yes → Generate 6-digit OTP
      ↓
      Store OTP in database
      ↓
      Queue OTP email
      ↓
      User receives email
      ↓
      User enters OTP code
      ↓
      Backend verifies OTP
      ↓
      OTP invalidated (one-time use)
      ↓
      Generate tokens & login
```

### Enable/Disable MFA Flow

```
User requests to enable MFA
  ↓
Backend sets mfaEnabled = true
  ↓
MFA now required for login
  ↓
User requests to disable MFA
  ↓
Backend sets mfaEnabled = false
  ↓
MFA no longer required
```

## Features Implemented

### ✅ Email OTP Generation
- Cryptographically secure 6-digit codes
- 5-minute expiration window
- One-time use (invalidated after verification)
- Automatic cleanup of expired codes

### ✅ Email Delivery
- Queued email delivery (non-blocking)
- HTML email template
- Graceful failure handling
- Email enumeration prevention

### ✅ MFA Management
- Enable/disable MFA for users
- Check MFA status
- Automatic OTP invalidation
- Rate limiting protection

### ✅ Security Features
- Rate limiting on verification attempts
- OTP expiration enforcement
- One-time use enforcement
- Old OTP invalidation

## Database Schema

### Migration: `create_mfa_email_otps_table.ts`

Created a new `mfa_email_otps` table with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to users table |
| `code` | VARCHAR(255) | 6-digit OTP code (unique) |
| `expires_at` | TIMESTAMP | Expiration timestamp |
| `user_agent` | VARCHAR(500) | Browser/device during generation |
| `ip_address` | VARCHAR(45) | IP address during generation |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |
| `deleted_at` | TIMESTAMP | Soft delete timestamp |

**Key Features:**
- Unique constraint on `code`
- Indexes for efficient querying
- Soft delete support
- Automatic expiration checking

**Indexes:**
- `user_id` - For finding OTPs by user
- `code` - For OTP verification (unique)
- `expires_at` - For cleanup of expired OTPs
- `(expires_at, deleted_at)` - For cleanup queries
- `(user_id, deleted_at)` - For finding active OTPs
- `(user_id, code, deleted_at)` - For verification

## Architecture

### Technology Stack

**Backend:**
- BullMQ - Email job queue
- AWS SES - Email delivery service
- Node.js crypto - Secure OTP generation

### File Structure

```
src/
├── controllers/
│   └── auth.controller.ts           # MFA OTP controllers
├── models/
│   └── MfaEmailOtp.ts              # OTP model
├── queries/
│   └── mfa.queries.ts               # OTP database queries
├── routes/
│   └── auth.route.ts                # MFA routes
├── schema/
│   └── auth.schema.ts               # MFA validation schemas
├── services/
│   └── mailQueue.service.ts        # Email queue service
└── database/
    └── migrations/
        └── create_mfa_email_otps_table.ts
```

## API Endpoints

All MFA endpoints are under `/api/v1/auth/mfa/`:

### 1. Enable Email OTP MFA

```http
POST /api/v1/auth/mfa/enable
Authorization: Bearer <access_token>

Response:
{
  "success": true,
  "statusCode": 200,
  "message": "Email OTP MFA enabled successfully",
  "data": {
    "mfaEnabled": true
  }
}
```

**Purpose:** Enables MFA for the authenticated user.

**Steps:**
1. User must be authenticated
2. System sets `mfaEnabled = true` on user account
3. MFA will be required for future logins

### 2. Disable Email OTP MFA

```http
POST /api/v1/auth/mfa/disable
Authorization: Bearer <access_token>

Response:
{
  "success": true,
  "statusCode": 200,
  "message": "Email OTP MFA disabled successfully",
  "data": {
    "mfaEnabled": false
  }
}
```

**Purpose:** Disables MFA for the authenticated user.

**Steps:**
1. User must be authenticated
2. System sets `mfaEnabled = false` on user account
3. MFA no longer required for logins

### 3. Get MFA Status

```http
GET /api/v1/auth/mfa/status
Authorization: Bearer <access_token>

Response:
{
  "success": true,
  "statusCode": 200,
  "message": "MFA status retrieved successfully",
  "data": {
    "mfaEnabled": true,
    "mfaType": "email"
  }
}
```

**Purpose:** Returns the current MFA status for the user.

### 4. Verify Email OTP (Login)

```http
POST /api/v1/auth/mfa/verify
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456"
}

Response:
{
  "success": true,
  "statusCode": 200,
  "message": "Multi-factor authentication successful",
  "data": {
    "user": { /* user data */ },
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token"
  }
}
```

**Purpose:** Verifies the OTP code and completes login.

**Steps:**
1. User enters email and OTP code
2. System finds active OTP for user
3. System verifies code matches and hasn't expired
4. OTP is invalidated (soft deleted)
5. JWT tokens are generated
6. User is logged in

### 5. Modified Login Endpoint

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response (if MFA enabled):
{
  "success": true,
  "message": "Verification code sent to your email",
  "data": {
    "requiresMfa": true,
    "mfaType": "email",
    "email": "user@example.com"
  }
}

Response (if MFA disabled):
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "user": { ... }
  }
}
```

**Purpose:** Handles login with automatic MFA detection.

**Flow:**
1. User submits email/password
2. System validates credentials
3. If MFA enabled: generates OTP, sends email, returns `requiresMfa: true`
4. If MFA disabled: generates tokens and returns user data

## Code Examples

### Frontend Integration

#### Login with MFA

```typescript
// 1. User enters email/password
const loginResponse = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
})

const loginData = await loginResponse.json()

// 2. Check if MFA is required
if (loginData.data.requiresMfa) {
  // Show OTP input field
  // User enters code from email
  
  const verifyResponse = await fetch('/api/v1/auth/mfa/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: loginData.data.email,
      code: userEnteredCode
    })
  })
  
  const { accessToken, refreshToken, user } = await verifyResponse.json()
  
  // Store tokens and complete login
  localStorage.setItem('accessToken', accessToken)
} else {
  // No MFA required, login complete
  const { accessToken, refreshToken, user } = loginData.data
}
```

#### Enable/Disable MFA

```typescript
// Enable MFA
const enableResponse = await fetch('/api/v1/auth/mfa/enable', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${accessToken}` }
})

// Disable MFA
const disableResponse = await fetch('/api/v1/auth/mfa/disable', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${accessToken}` }
})

// Check MFA status
const statusResponse = await fetch('/api/v1/auth/mfa/status', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
})
```

### Backend Implementation

#### Generating OTP

```typescript
// Location: src/controllers/auth.controller.ts

// Generate cryptographically secure 6-digit OTP
const otpCode = randomInt(100000, 999999).toString()

// Store in database
await createMfaOtp(
  user.id,
  otpCode,
  SECURITY_RULES.MFA_OTP_EXPIRY_MINUTES,  // 5 minutes
  req.headers['user-agent'] ?? null,
  req.ip ?? null
)
```

#### Sending OTP Email

```typescript
// Location: src/controllers/auth.controller.ts

try {
  await queueMfaOtpEmail({
    to: user.email,
    otpCode,
    expiryMinutes: SECURITY_RULES.MFA_OTP_EXPIRY_MINUTES,
    userName: user.name,
  })
  logger.info(`MFA OTP email queued for ${user.email}`)
} catch (error) {
  // Log but don't fail request (security: don't reveal if email exists)
  logger.error('Failed to queue MFA OTP email:', error)
}
```

#### Verifying OTP

```typescript
// Location: src/queries/mfa.queries.ts

export const verifyMfaOtp = async (
  userId: string,
  code: string
): Promise<MfaEmailOtp> => {
  // 1. Find OTP by user ID and code
  const mfaOtp = await MfaEmailOtp.query()
    .modify('notDeleted')
    .where('user_id', userId)
    .where('code', code)
    .first()

  if (!mfaOtp) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_MESSAGES.MFA_OTP_INVALID_OR_EXPIRED
    )
  }

  // 2. Check if OTP has expired
  if (mfaOtp.isExpired()) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_MESSAGES.MFA_OTP_INVALID_OR_EXPIRED
    )
  }

  // 3. Soft delete OTP after successful verification
  await mfaOtp.softDelete()

  return mfaOtp
}
```

## Configuration

### Environment Variables

No additional environment variables required. MFA uses existing mail queue configuration.

### Security Constants

MFA settings in `src/constants/security.ts`:

```typescript
export const SECURITY_RULES = {
  // ... existing rules
  MFA_OTP_EXPIRY_MINUTES: 5,    // OTP expiration time
  MFA_OTP_LENGTH: 6,             // 6-digit codes
}
```

### Email Template

**Location:** `public/templates/mfa-otp.html`

**Template Variables:**
```typescript
{
  otpCode: string        // 6-digit OTP code
  expiryMinutes: number  // Minutes until expiration (5)
  userName: string       // User's name
}
```

**Example Email:**
```
Subject: Your Verification Code

Hello John,

Your verification code is:

123456

This code will expire in 5 minutes.

If you didn't request this code, please ignore this email.
```

## Security Considerations

### ✅ Implemented Security Features

1. **Cryptographically Secure OTPs**: Uses `randomInt()` for secure generation
2. **Time-Limited**: OTPs expire after 5 minutes
3. **One-Time Use**: Codes are invalidated after verification
4. **Rate Limiting**: Applied via `authRateLimiter` middleware
5. **Email Enumeration Prevention**: Don't reveal if email exists
6. **Old OTP Invalidation**: Only most recent OTP is valid

### 🔒 Best Practices

1. **Always Queue Emails**: Non-blocking email delivery
2. **Invalidate Old OTPs**: Only one active OTP per user
3. **Clean Up Expired OTPs**: Periodic cleanup job
4. **Handle Failures Gracefully**: Don't fail login if email fails
5. **Rate Limiting**: Prevent brute force attacks
6. **HTTPS Required**: Always use HTTPS in production

## Testing

### Manual Testing

```bash
# 1. Enable MFA
curl -X POST http://localhost:8000/api/v1/auth/mfa/enable \
  -H "Authorization: Bearer <token>"

# 2. Login (triggers OTP email)
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# 3. Verify OTP (check email for code)
curl -X POST http://localhost:8000/api/v1/auth/mfa/verify \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "code": "123456"}'

# 4. Disable MFA
curl -X POST http://localhost:8000/api/v1/auth/mfa/disable \
  -H "Authorization: Bearer <token>"
```

## Troubleshooting

### Common Issues

1. **OTP Not Received**
   - Check email was queued successfully (check logs)
   - Verify mail worker is running
   - Check email address is correct
   - Check spam folder
   - **Solution**: Request new OTP (login again)

2. **OTP Invalid or Expired**
   - OTP has expired (5 minutes)
   - OTP already used (one-time use)
   - Incorrect code entered
   - **Solution**: Request new OTP, check expiration time

3. **Multiple OTPs**
   - User requests multiple OTPs
   - Which one is valid?
   - **Solution**: System invalidates old OTPs when creating new one, only most recent OTP is valid

4. **Email Delivery Failed**
   - Mail queue not processing
   - AWS SES configuration issue
   - **Solution**: Check mail worker logs, verify SES credentials

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
1. **Resend OTP**: Allow users to request new OTP if not received
2. **OTP Attempts Tracking**: Track failed attempts per user
3. **Email Templates**: Multiple template options
4. **SMS OTP**: Alternative delivery method
5. **Remember Device**: Skip MFA for trusted devices
6. **OTP History**: Show recent OTP generation history

## Related Documentation

- [Authentication](./AUTHENTICATION.md)
- [TOTP Implementation](./TOTP_IMPLEMENTATION.md)
- [Mail Queue](./MAIL_QUEUE.md)
- [Database Schema - MFA](./DATABASE_SCHEMA_MFA.md)

---

**Note:** Email OTP provides a simple, secure MFA method. Ensure email delivery is reliable and monitor for delivery failures.
