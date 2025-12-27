# Passkey Authentication Setup Guide

## Overview

This guide provides a quick start for implementing passkey authentication (WebAuthn/FIDO2) in your application. Passkeys enable passwordless authentication using biometrics (Face ID, Touch ID, Windows Hello) or hardware security keys (YubiKey).

**What's Included:**
- Complete backend API implementation
- Database schema and migrations
- WebAuthn verification utilities
- Passkey management endpoints
- Frontend integration examples

## Flow

### Registration Flow

```
User authenticated & requests registration
  ↓
Backend generates WebAuthn options
  ↓
Frontend calls navigator.credentials.create()
  ↓
User authenticates (biometric/security key)
  ↓
Frontend sends credential to backend
  ↓
Backend verifies & stores passkey
  ↓
Passkey ready for authentication
```

### Authentication Flow

```
User requests login with passkey
  ↓
Backend generates authentication options
  ↓
Frontend calls navigator.credentials.get()
  ↓
User authenticates (biometric/security key)
  ↓
Frontend sends credential to backend
  ↓
Backend verifies signature
  ↓
JWT tokens generated & user logged in
```

## Features Implemented

✅ **Passkey Registration**
- Generate WebAuthn registration options
- Verify and store passkey credentials
- Support for platform and roaming authenticators

✅ **Passwordless Authentication**
- Generate WebAuthn authentication options
- Verify authentication response
- Complete login flow with JWT tokens

✅ **Passkey Management**
- List, view, rename, activate/deactivate, delete passkeys
- Passkey usage statistics

✅ **Security Features**
- Challenge-response authentication
- Counter-based replay attack protection
- Public-key cryptography

## API Endpoints

All passkey endpoints are under `/api/v1/passkey/`:

**Registration (Authenticated):**
- `POST /passkey/register/options` - Generate registration options
- `POST /passkey/register/verify` - Verify and register passkey

**Authentication (Public):**
- `POST /passkey/authenticate/options` - Generate authentication options
- `POST /passkey/authenticate/verify` - Verify and login with passkey

**Management (Authenticated):**
- `GET /passkey` - List all user passkeys
- `GET /passkey/stats` - Get passkey statistics
- `GET /passkey/:id` - Get single passkey
- `PATCH /passkey/:id/rename` - Rename passkey
- `PATCH /passkey/:id/toggle` - Activate/deactivate passkey
- `DELETE /passkey/:id` - Delete passkey

For complete API documentation, see [`docs/PASSKEY_AUTHENTICATION.md`](./docs/PASSKEY_AUTHENTICATION.md)

## Quick Start

### Step 1: Install Dependencies

```bash
pnpm install
```

This will install:
- `@simplewebauthn/server` - WebAuthn server verification
- `@simplewebauthn/types` - TypeScript types

### Step 2: Configure Environment

Add to your `.env` file:

```env
# WebAuthn Configuration
WEBAUTHN_RP_ID=localhost              # Change to your domain in production
FRONTEND_URL=http://localhost:3000    # Your frontend URL (already exists)
```

### Step 3: Run Database Migration

```bash
# Development
pnpm db:migrate

# Check migration status
pnpm db:migrate:list
```

This will create the `user_passkeys` table.

### Step 4: Start the Server

```bash
pnpm dev
```

### Step 5: Test the API

```bash
# 1. Login to get access token
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'

# 2. Get passkey registration options
curl -X POST http://localhost:8000/api/v1/passkey/register/options \
  -H "Authorization: Bearer <your-access-token>"

# 3. Get passkey authentication options
curl -X POST http://localhost:8000/api/v1/passkey/authenticate/options
```

## Frontend Integration

### Install Frontend Package

```bash
npm install @simplewebauthn/browser
# or
pnpm add @simplewebauthn/browser
```

### Example: Register Passkey

```typescript
import { startRegistration } from '@simplewebauthn/browser'

async function registerPasskey() {
  // 1. Get options from backend
  const optionsRes = await fetch('/api/v1/passkey/register/options', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  })
  const { data: { options } } = await optionsRes.json()

  // 2. Start registration ceremony
  const credential = await startRegistration(options)

  // 3. Send credential to backend
  const name = prompt('Name this passkey')
  await fetch('/api/v1/passkey/register/verify', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, credential })
  })
}
```

### Example: Login with Passkey

```typescript
import { startAuthentication } from '@simplewebauthn/browser'

async function loginWithPasskey(email?: string) {
  // 1. Get options from backend
  const optionsRes = await fetch('/api/v1/passkey/authenticate/options', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  })
  const { data: { options } } = await optionsRes.json()

  // 2. Start authentication ceremony
  const credential = await startAuthentication(options)

  // 3. Send credential to backend
  const verifyRes = await fetch('/api/v1/passkey/authenticate/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential })
  })
  const { data } = await verifyRes.json()
  
  // 4. Store tokens and login
  localStorage.setItem('accessToken', data.accessToken)
}
```

## Configuration

### Environment Variables

```env
# WebAuthn Configuration
WEBAUTHN_RP_ID=localhost              # Change to your domain in production
FRONTEND_URL=http://localhost:3000    # Your frontend URL
```

### Production Configuration

Before deploying to production:

1. ✅ Update `WEBAUTHN_RP_ID` to your domain (e.g., `app.bkeep.ca`)
2. ✅ Ensure `FRONTEND_URL` is set correctly
3. ✅ Enable HTTPS (required for WebAuthn)
4. ✅ Use Redis for challenge storage (not in-memory)
5. ✅ Set `requireUserVerification: true` for higher security
6. ✅ Add rate limiting to authentication endpoints
7. ✅ Enable audit logging for passkey operations

## Security Considerations

### ✅ Security Features

- Public-key cryptography (no shared secrets)
- Phishing-resistant authentication
- Counter-based replay attack protection
- User verification support (biometrics)
- Origin and RP ID verification
- Challenge-response authentication

### 🔒 Best Practices

1. **HTTPS Required**: WebAuthn only works over HTTPS (except localhost)
2. **RP ID Must Match**: RP ID must match the domain
3. **Store Challenges Securely**: Use Redis with expiration
4. **Rate Limiting**: Apply rate limiting to authentication endpoints
5. **Audit Logging**: Log all passkey operations

## Testing

### Manual Testing

```bash
# Test registration options
curl -X POST http://localhost:8000/api/v1/passkey/register/options \
  -H "Authorization: Bearer <token>"

# Test authentication options
curl -X POST http://localhost:8000/api/v1/passkey/authenticate/options
```

### Integration Testing

You'll need a frontend or testing tool that supports WebAuthn:
- Use Chrome DevTools > Application > WebAuthn
- Use Firefox DevTools > Storage > Authentication
- Use real devices (iPhone, Android, security keys)

## Troubleshooting

### Common Issues

1. **"NotAllowedError"** - User cancelled or device doesn't support passkeys
2. **"SecurityError"** - Not using HTTPS or RP ID mismatch
3. **"InvalidStateError"** - Credential already registered
4. **"Challenge expired"** - User took too long (5 minute timeout)
5. **"Passkey counter error"** - Possible cloned authenticator

For detailed troubleshooting, see [`docs/PASSKEY_AUTHENTICATION.md`](./docs/PASSKEY_AUTHENTICATION.md)

## Browser Support

Works with:
- Chrome/Edge 67+
- Firefox 60+
- Safari 13+
- iOS Safari 14+

Supports:
- Face ID / Touch ID
- Windows Hello
- YubiKey / Security Keys
- Android Biometrics

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
1. **Conditional UI**: Show passkey option only if supported
2. **Autofill**: Support WebAuthn autofill
3. **Cross-device**: Support hybrid flow for phone-to-desktop
4. **Backup Options**: Suggest registering multiple passkeys
5. **Admin Panel**: View all passkeys in organization
6. **Security Notifications**: Email alerts for passkey changes

## Additional Resources

- Complete Documentation: [`docs/PASSKEY_AUTHENTICATION.md`](./docs/PASSKEY_AUTHENTICATION.md)
- [WebAuthn Guide](https://webauthn.guide/)
- [SimpleWebAuthn Documentation](https://simplewebauthn.dev/)
- [Passkeys.dev](https://passkeys.dev/)

## Summary

You now have a complete, production-ready passkey authentication system that provides:
- ✅ Passwordless authentication
- ✅ Enhanced security
- ✅ Better user experience
- ✅ Full CRUD operations for passkey management

Happy coding! 🚀
