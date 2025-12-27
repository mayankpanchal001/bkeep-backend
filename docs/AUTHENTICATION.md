# Authentication

## Overview

Bkeep uses **JWT (JSON Web Tokens)** for authentication with access tokens and refresh tokens. The system supports multi-factor authentication (MFA) with both email OTP and TOTP (authenticator apps).

## Authentication Flow

```
User Login
  ↓
Credentials Validated
  ↓
MFA Enabled?
  ├─ No → Generate Tokens → Return Tokens
  └─ Yes → Check MFA Type
      ├─ Email OTP → Send OTP → Verify OTP → Generate Tokens
      └─ TOTP → Return MFA Required → Verify TOTP → Generate Tokens
```

## API Endpoints

### Login

```typescript
POST /api/v1/auth/login
Content-Type: application/json

Body: {
  "email": "user@example.com",
  "password": "SecurePassword123!"
}

// Response (No MFA)
{
  "success": true,
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "admin",
      "permissions": ["view_dashboard", "view_users", ...],
      "tenant": {
        "id": "tenant-uuid",
        "name": "Acme Corp"
      }
    },
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token"
  }
}

// Response (MFA Required - Email OTP)
{
  "success": true,
  "statusCode": 200,
  "message": "Verification code sent to your email",
  "data": {
    "requiresMfa": true,
    "mfaType": "email_otp",
    "email": "user@example.com"
  }
}

// Response (MFA Required - TOTP)
{
  "success": true,
  "statusCode": 200,
  "message": "TOTP verification required",
  "data": {
    "requiresMfa": true,
    "mfaType": "totp",
    "email": "user@example.com"
  }
}
```

### Logout

```typescript
POST /api/v1/auth/logout
Authorization: Bearer <access-token>

// Response
{
  "success": true,
  "statusCode": 200,
  "message": "Logout successful"
}
```

### Refresh Token

```typescript
POST /api/v1/auth/refresh-token
Content-Type: application/json

Body: {
  "refreshToken": "jwt-refresh-token"  // Optional if sent as cookie
}

// Response
{
  "success": true,
  "statusCode": 200,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "new-jwt-access-token",
    "refreshToken": "new-jwt-refresh-token"
  }
}
```

## JWT Token Structure

### Access Token

```typescript
// Payload
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "role": "admin",                    // Primary role name
    "permissions": [                    // Aggregated permissions
      "view_dashboard",
      "view_users",
      "create_users",
      // ...
    ],
    "selectedTenantId": "tenant-uuid"   // Selected tenant ID
  },
  "iat": 1700000000,                    // Issued at
  "exp": 1700086400                     // Expires at (1 day)
}
```

### Refresh Token

```typescript
// Payload
{
  "userId": "user-uuid",
  "tokenId": "refresh-token-uuid",      // Database token ID
  "iat": 1700000000,
  "exp": 1700604800                     // Expires at (7 days)
}
```

## Token Generation

### Sign Tokens

```typescript
// Location: src/utils/jwt.ts

export const signTokens = async (user: User): Promise<{
  accessToken: string
  refreshToken: string
}> => {
  // 1. Get user with relations
  const userWithRelations = await findUserByIdComplete(user.id)

  // 2. Extract roles and permissions
  const roles = userWithRelations.roles ?? []
  const permissions = aggregatePermissions(roles)

  // 3. Get primary tenant
  const tenants = userWithRelations.tenants ?? []
  const primaryTenant = tenants.find(t => t.userTenants?.isPrimary) ?? tenants[0]

  // 4. Build JWT payload
  const payload: JwtUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: roles[0]?.name ?? 'viewer',
    permissions: permissions.map(p => p.name),
    selectedTenantId: primaryTenant?.id,
  }

  // 5. Generate access token (1 day expiry)
  const accessToken = jwt.sign(
    { user: payload },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRY }
  )

  // 6. Create refresh token in database
  const refreshTokenRecord = await createRefreshToken(user.id)

  // 7. Generate refresh token (7 days expiry)
  const refreshToken = jwt.sign(
    {
      userId: user.id,
      tokenId: refreshTokenRecord.id,
    },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRY }
  )

  return { accessToken, refreshToken }
}
```

## Token Validation

### Access Token Validation

```typescript
// Location: src/middlewares/auth.middleware.ts

export const authenticate = asyncHandler(async (req, res, next) => {
  // 1. Extract token from header
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null

  if (!token) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'No token provided')
  }

  // 2. Verify token signature
  const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload

  // 3. Extract user from payload
  const jwtUser = decoded.user as JwtUser

  // 4. Verify user still exists and is active
  const user = await User.query()
    .modify('notDeleted')
    .findById(jwtUser.id)

  if (!user || !user.isActive) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'User not found or inactive')
  }

  // 5. Attach user to request
  req.user = jwtUser
  next()
})
```

### Refresh Token Validation

```typescript
// Location: src/utils/jwt.ts

export const verifyRefreshToken = async (
  token: string
): Promise<RefreshToken> => {
  // 1. Verify token signature
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as {
    userId: string
    tokenId: string
  }

  // 2. Find token in database
  const refreshToken = await findRefreshTokenByToken(decoded.tokenId)

  if (!refreshToken) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid refresh token')
  }

  // 3. Check if token is revoked
  if (refreshToken.revokedAt) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Token has been revoked')
  }

  // 4. Check if token is expired
  if (refreshToken.expiresAt < new Date()) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Token has expired')
  }

  return refreshToken
}
```

## MFA Integration

### Email OTP Flow

```typescript
// 1. Login with credentials
POST /auth/login
→ Returns: { requiresMfa: true, mfaType: "email_otp" }

// 2. Verify email OTP
POST /auth/mfa/verify
Body: { email: "...", code: "123456" }
→ Returns: { accessToken, refreshToken }
```

### TOTP Flow

```typescript
// 1. Login with credentials
POST /auth/login
→ Returns: { requiresMfa: true, mfaType: "totp" }

// 2. Verify TOTP code
POST /auth/totp/login
Body: { email: "...", code: "123456" }
→ Returns: { accessToken, refreshToken }
```

See:
- [MFA Email OTP](./MFA_EMAIL_OTP.md)
- [TOTP Implementation](./TOTP_IMPLEMENTATION.md)

## Logout Implementation

```typescript
// Location: src/controllers/auth.controller.ts

export const logout: RequestHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user

    if (!user) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated')
    }

    // Extract refresh token from request
    const refreshToken = req.body.refreshToken || req.cookies.refreshToken

    if (refreshToken) {
      try {
        // Revoke refresh token
        await revokeRefreshToken(refreshToken)
      } catch (error) {
        // Log but don't fail logout
        logger.error('Failed to revoke refresh token', { error })
      }
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
    })

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, SUCCESS_MESSAGES.LOGOUT_SUCCESSFUL)
    )
  }
)
```

## Token Refresh Flow

```typescript
// Location: src/controllers/auth.controller.ts

export const refreshToken: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Get refresh token from body or cookie
    const refreshToken = req.body.refreshToken || req.cookies.refreshToken

    if (!refreshToken) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Refresh token required')
    }

    // 2. Verify refresh token
    const tokenRecord = await verifyRefreshToken(refreshToken)

    // 3. Get user
    const user = await User.query()
      .modify('notDeleted')
      .findById(tokenRecord.userId)

    if (!user || !user.isActive) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'User not found or inactive')
    }

    // 4. Revoke old refresh token
    await revokeRefreshToken(refreshToken)

    // 5. Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = await signTokens(user)

    // 6. Set refresh token cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, SUCCESS_MESSAGES.TOKEN_REFRESHED, {
        accessToken,
        refreshToken: newRefreshToken,
      })
    )
  }
)
```

## Security Considerations

### Token Storage

**Access Token:**
- Stored in memory (JavaScript variable)
- Sent in `Authorization: Bearer <token>` header
- Never stored in localStorage (XSS risk)

**Refresh Token:**
- Stored in httpOnly cookie (preferred)
- Or sent in request body
- Never stored in localStorage

### Token Expiration

```typescript
// Access Token: 1 day
JWT_EXPIRY=1d

// Refresh Token: 7 days
JWT_REFRESH_EXPIRY=7d
```

### Token Rotation

```typescript
// On refresh, old token is revoked
await revokeRefreshToken(oldRefreshToken)

// New token is issued
const { accessToken, refreshToken } = await signTokens(user)
```

### Revocation

```typescript
// Revoke all tokens for user (on password change, etc.)
await revokeAllRefreshTokensForUser(userId)

// Revoke specific token (on logout)
await revokeRefreshToken(tokenId)
```

## Best Practices

### 1. Always Validate Tokens

```typescript
// ✅ Good - Validate on every request
export const authenticate = asyncHandler(async (req, res, next) => {
  const token = extractToken(req)
  const decoded = jwt.verify(token, env.JWT_SECRET)
  // ... validate user
})

// ❌ Bad - No validation
// Trust token without verification
```

### 2. Check User Status

```typescript
// ✅ Good - Verify user is active
const user = await User.query()
  .modify('notDeleted')
  .findById(jwtUser.id)

if (!user || !user.isActive) {
  throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'User inactive')
}

// ❌ Bad - Trust token without checking user
```

### 3. Handle Token Expiration

```typescript
// ✅ Good - Clear error message
try {
  const decoded = jwt.verify(token, secret)
} catch (error) {
  if (error.name === 'TokenExpiredError') {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Token expired')
  }
  throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid token')
}
```

### 4. Secure Token Transmission

```typescript
// ✅ Good - HTTPS only in production
secure: env.NODE_ENV === 'production'

// ✅ Good - HttpOnly cookies
httpOnly: true

// ✅ Good - SameSite protection
sameSite: 'strict'
```

## Troubleshooting

### Token Invalid

```
Error: Invalid token
```

**Causes:**
- Token signature invalid
- Token expired
- Secret key mismatch

**Solution:**
- Check JWT_SECRET matches
- Verify token hasn't expired
- Re-login to get new token

### Token Expired

```
Error: Token expired
```

**Solution:**
- Use refresh token to get new access token
- Or re-login

### User Not Found

```
Error: User not found or inactive
```

**Causes:**
- User deleted
- User deactivated
- User doesn't exist

**Solution:**
- Check user status in database
- Reactivate user if needed
- Re-login after user is active

## Related Documentation

- [MFA Email OTP](./MFA_EMAIL_OTP.md)
- [TOTP Implementation](./TOTP_IMPLEMENTATION.md)
- [Password Reset](./PASSWORD_RESET.md)
- [User Management](./USER_MANAGEMENT.md)

