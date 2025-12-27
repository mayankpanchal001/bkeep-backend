# Passkey Authentication (WebAuthn/FIDO2)

## Overview

Passkey authentication provides a secure, passwordless authentication system using WebAuthn/FIDO2 standards. Users can authenticate using biometrics (Face ID, Touch ID, Windows Hello) or hardware security keys (YubiKey) instead of passwords.

**Key Benefits:**
- **Phishing-resistant** - Credentials are bound to the domain
- **No shared secrets** - Uses public-key cryptography
- **Better UX** - Fast, convenient biometric authentication
- **Enhanced security** - Counter-based replay attack protection

## Flow

### Registration Flow

```
User requests registration options
  ↓
Backend generates WebAuthn options & challenge
  ↓
Frontend calls navigator.credentials.create()
  ↓
User authenticates (Face ID/Touch ID/Key)
  ↓
Frontend sends credential to backend
  ↓
Backend verifies credential & stores passkey
  ↓
Passkey registered successfully
```

### Authentication Flow (Passwordless Login)

```
User requests authentication options
  ↓
Backend generates WebAuthn options & challenge
  ↓
Frontend calls navigator.credentials.get()
  ↓
User authenticates (Face ID/Touch ID/Key)
  ↓
Frontend sends credential to backend
  ↓
Backend verifies signature & updates counter
  ↓
Backend generates JWT tokens
  ↓
User logged in successfully
```

## Features Implemented

### ✅ Passkey Registration
- Generate WebAuthn registration options
- Verify and store passkey credentials
- Support for platform and roaming authenticators
- Friendly naming of passkeys

### ✅ Passwordless Authentication
- Generate WebAuthn authentication options
- Verify authentication response
- Complete login flow with JWT tokens
- Support for usernameless authentication

### ✅ Passkey Management
- List all user passkeys
- View passkey details
- Rename passkeys
- Activate/deactivate passkeys
- Delete passkeys
- Passkey usage statistics

### ✅ Security Features
- Challenge-response authentication
- Counter-based replay attack protection
- Public-key cryptography
- User verification support
- Transport method tracking

## Database Schema

### Migration: `20251201182751_create_user_passkeys_table.ts`

Created a new `user_passkeys` table with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to users table |
| `credential_id` | VARCHAR(1024) | WebAuthn credential ID (unique) |
| `public_key` | TEXT | Public key for signature verification |
| `counter` | BIGINT | Counter for replay attack protection |
| `credential_type` | ENUM | 'platform' or 'roaming' |
| `transports` | JSONB | Transport methods (usb, nfc, ble, etc.) |
| `aaguid` | VARCHAR(255) | Authenticator model identifier |
| `name` | VARCHAR(255) | Friendly name for the passkey |
| `is_active` | BOOLEAN | Whether passkey is active |
| `last_used_at` | TIMESTAMP | Last successful authentication |
| `user_agent` | VARCHAR(500) | Browser/device during registration |
| `ip_address` | VARCHAR(45) | IP address during registration |
| `backup_eligible` | BOOLEAN | Credential backup eligibility |
| `backup_state` | BOOLEAN | Current backup state |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |
| `deleted_at` | TIMESTAMP | Soft delete timestamp |

**Key Features:**
- Unique constraint on `credential_id`
- Indexes for efficient querying
- Soft delete support
- Audit trail with user agent and IP

## Architecture

### Technology Stack

**Backend:**
- `@simplewebauthn/server` - WebAuthn server-side verification
- `@simplewebauthn/types` - TypeScript types for WebAuthn

**Frontend (Required):**
- `@simplewebauthn/browser` - WebAuthn client-side helpers
- Native `navigator.credentials` API

### File Structure

```
src/
├── controllers/
│   └── passkey.controller.ts          # Passkey API controllers
├── models/
│   └── UserPasskey.ts                 # Passkey model
├── queries/
│   └── passkey.queries.ts             # Database queries
├── routes/
│   └── passkey.route.ts               # Passkey routes
├── schema/
│   └── passkey.schema.ts              # Validation schemas
├── utils/
│   └── webauthn.ts                    # WebAuthn helpers
├── constants/
│   └── passkey.ts                     # Passkey constants
├── types/
│   └── passkey.type.ts                # Passkey type definitions
└── database/
    └── migrations/
        └── 20251201182751_create_user_passkeys_table.ts
```

## API Endpoints

All passkey endpoints are under `/api/v1/passkey/`:

### 1. Generate Registration Options

```http
POST /api/v1/passkey/register/options
Authorization: Bearer <access_token>
Content-Type: application/json

Response:
{
  "success": true,
  "message": "Passkey registration options generated successfully",
  "data": {
    "options": {
      "challenge": "...",
      "rp": { "name": "BKeep", "id": "localhost" },
      "user": { "id": "...", "name": "user@example.com", "displayName": "John Doe" },
      "pubKeyCredParams": [...],
      "timeout": 60000,
      "authenticatorSelection": {...},
      "excludeCredentials": [...]
    }
  }
}
```

**Purpose:** Initiates passkey registration by generating WebAuthn options.

**Steps:**
1. User must be authenticated
2. Server generates registration options
3. Server stores challenge temporarily
4. Frontend uses options to call `navigator.credentials.create()`

### 2. Verify Registration

```http
POST /api/v1/passkey/register/verify
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "My iPhone",
  "credential": {
    "id": "...",
    "rawId": "...",
    "response": {
      "clientDataJSON": "...",
      "attestationObject": "..."
    },
    "type": "public-key"
  }
}

Response:
{
  "success": true,
  "message": "Passkey registered successfully",
  "data": {
    "passkey": {
      "id": "...",
      "name": "My iPhone",
      "credentialType": "platform",
      "createdAt": "2025-12-01T18:30:00.000Z"
    }
  }
}
```

**Purpose:** Verifies the credential creation response and stores the passkey.

**Steps:**
1. Server retrieves stored challenge
2. Server verifies the credential response
3. Server stores the passkey in database
4. Challenge is deleted after verification

### 3. Generate Authentication Options

```http
POST /api/v1/passkey/authenticate/options
Content-Type: application/json

{
  "email": "user@example.com"  // Optional
}

Response:
{
  "success": true,
  "message": "Passkey authentication options generated successfully",
  "data": {
    "options": {
      "challenge": "...",
      "rpId": "localhost",
      "timeout": 60000,
      "userVerification": "preferred",
      "allowCredentials": [...]  // Empty for usernameless flow
    }
  }
}
```

**Purpose:** Initiates passkey authentication.

**Steps:**
1. Optional: Provide email to filter allowed credentials
2. Server generates authentication options
3. Server stores challenge temporarily
4. Frontend uses options to call `navigator.credentials.get()`

### 4. Verify Authentication (Login)

```http
POST /api/v1/passkey/authenticate/verify
Content-Type: application/json

{
  "credential": {
    "id": "...",
    "rawId": "...",
    "response": {
      "clientDataJSON": "...",
      "authenticatorData": "...",
      "signature": "..."
    },
    "type": "public-key"
  }
}

Response:
{
  "success": true,
  "message": "Passkey authentication successful",
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "user": {
      "id": "...",
      "email": "user@example.com",
      "name": "John Doe",
      "role": {...},
      "permissions": [...],
      "tenants": [...]
    }
  }
}
```

**Purpose:** Verifies authentication and completes login.

**Steps:**
1. Server finds passkey by credential ID
2. Server retrieves stored challenge
3. Server verifies the signature
4. Server updates counter (replay protection)
5. Server generates JWT tokens
6. User is logged in

### 5. List Passkeys

```http
GET /api/v1/passkey
Authorization: Bearer <access_token>

Query Parameters:
  - credentialType: 'platform' | 'roaming' (optional)
  - isActive: boolean (optional)

Response:
{
  "success": true,
  "message": "Passkeys retrieved successfully",
  "data": {
    "passkeys": [
      {
        "id": "...",
        "name": "My iPhone",
        "credentialType": "platform",
        "transports": ["internal"],
        "isActive": true,
        "lastUsedAt": "2025-12-01T18:00:00.000Z",
        "backupEligible": true,
        "backupState": true,
        "createdAt": "2025-12-01T10:00:00.000Z",
        "updatedAt": "2025-12-01T18:00:00.000Z"
      }
    ],
    "total": 1
  }
}
```

### 6. Get Passkey by ID

```http
GET /api/v1/passkey/:id
Authorization: Bearer <access_token>

Response:
{
  "success": true,
  "message": "Passkey retrieved successfully",
  "data": {
    "passkey": {...}
  }
}
```

### 7. Rename Passkey

```http
PATCH /api/v1/passkey/:id/rename
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "My MacBook Pro"
}

Response:
{
  "success": true,
  "message": "Passkey renamed successfully",
  "data": {
    "passkey": {
      "id": "...",
      "name": "My MacBook Pro",
      "updatedAt": "..."
    }
  }
}
```

### 8. Toggle Passkey Active Status

```http
PATCH /api/v1/passkey/:id/toggle
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "isActive": false
}

Response:
{
  "success": true,
  "message": "Passkey deactivated successfully",
  "data": {
    "passkey": {
      "id": "...",
      "isActive": false,
      "updatedAt": "..."
    }
  }
}
```

### 9. Delete Passkey

```http
DELETE /api/v1/passkey/:id
Authorization: Bearer <access_token>

Response:
{
  "success": true,
  "message": "Passkey deleted successfully",
  "data": {}
}
```

### 10. Get Passkey Statistics

```http
GET /api/v1/passkey/stats
Authorization: Bearer <access_token>

Response:
{
  "success": true,
  "message": "Passkey statistics retrieved successfully",
  "data": {
    "stats": {
      "total": 3,
      "active": 2,
      "platform": 2,
      "roaming": 1,
      "lastUsed": "2025-12-01T18:00:00.000Z"
    }
  }
}
```

## Code Examples

### Frontend Integration

#### Installation

```bash
npm install @simplewebauthn/browser
# or
pnpm add @simplewebauthn/browser
```

#### Registration Flow

```typescript
import { startRegistration } from '@simplewebauthn/browser'

async function registerPasskey() {
  try {
    // 1. Get registration options from server
    const optionsRes = await fetch('/api/v1/passkey/register/options', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })
    
    const { data: { options } } = await optionsRes.json()

    // 2. Start WebAuthn registration ceremony
    const credential = await startRegistration(options)

    // 3. Prompt user for passkey name
    const name = prompt('Name this passkey (e.g., "My iPhone")')

    // 4. Send credential to server for verification
    const verifyRes = await fetch('/api/v1/passkey/register/verify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, credential })
    })

    const result = await verifyRes.json()
    
    if (result.success) {
      alert('Passkey registered successfully!')
    }
  } catch (error) {
    console.error('Registration failed:', error)
    alert('Failed to register passkey')
  }
}
```

#### Authentication Flow

```typescript
import { startAuthentication } from '@simplewebauthn/browser'

async function loginWithPasskey(email?: string) {
  try {
    // 1. Get authentication options from server
    const optionsRes = await fetch('/api/v1/passkey/authenticate/options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }) // Optional
    })
    
    const { data: { options } } = await optionsRes.json()

    // 2. Start WebAuthn authentication ceremony
    const credential = await startAuthentication(options)

    // 3. Send credential to server for verification
    const verifyRes = await fetch('/api/v1/passkey/authenticate/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential })
    })

    const result = await verifyRes.json()
    
    if (result.success) {
      // Store tokens
      localStorage.setItem('accessToken', result.data.accessToken)
      
      // Redirect to dashboard
      window.location.href = '/dashboard'
    }
  } catch (error) {
    console.error('Authentication failed:', error)
    alert('Failed to authenticate with passkey')
  }
}
```

#### UI Components (React Example)

```tsx
import { useState, useEffect } from 'react'

function PasskeyManager() {
  const [passkeys, setPasskeys] = useState([])

  useEffect(() => {
    fetchPasskeys()
  }, [])

  async function fetchPasskeys() {
    const res = await fetch('/api/v1/passkey', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    const { data } = await res.json()
    setPasskeys(data.passkeys)
  }

  async function deletePasskey(id: string) {
    if (!confirm('Delete this passkey?')) return
    
    await fetch(`/api/v1/passkey/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    
    fetchPasskeys()
  }

  return (
    <div>
      <h2>Your Passkeys</h2>
      <button onClick={registerPasskey}>Add New Passkey</button>
      
      <ul>
        {passkeys.map(passkey => (
          <li key={passkey.id}>
            <strong>{passkey.name}</strong>
            <span>{passkey.credentialType}</span>
            <span>Last used: {passkey.lastUsedAt}</span>
            <button onClick={() => deletePasskey(passkey.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

## Configuration

### Environment Variables

Add to your `.env` file:

```env
# WebAuthn Configuration
WEBAUTHN_RP_ID=localhost              # Change to your domain in production
FRONTEND_URL=http://localhost:3000    # Your frontend URL
```

### Production Configuration

For production, update the following:

1. **RP ID**: Set to your domain (e.g., `app.bkeep.ca`)
2. **Origin**: Set to your frontend URL (e.g., `https://app.bkeep.ca`)
3. **User Verification**: Set to `required` for higher security
4. **Challenge Storage**: Use Redis instead of in-memory Map

## Security Considerations

### ✅ Implemented Security Features

1. **Public-Key Cryptography**: Private keys never leave the user's device
2. **Challenge-Response**: Prevents replay attacks
3. **Counter Verification**: Detects cloned authenticators
4. **Origin Verification**: Prevents phishing attacks
5. **RP ID Verification**: Ensures domain authenticity
6. **User Verification**: Supports biometric/PIN verification

### 🔒 Best Practices

1. **HTTPS Required**: WebAuthn only works over HTTPS (except localhost)
2. **RP ID Must Match**: RP ID must match the domain
3. **Store Challenges Securely**: Use Redis with expiration
4. **Rate Limiting**: Apply rate limiting to authentication endpoints
5. **Audit Logging**: Log all passkey operations
6. **User Communication**: Inform users about passkey changes via email

## Testing

### Manual Testing

```bash
# 1. Run migrations
pnpm db:migrate

# 2. Start server
pnpm dev

# 3. Test registration options
curl -X POST http://localhost:8000/api/v1/passkey/register/options \
  -H "Authorization: Bearer <token>"

# 4. Test authentication options
curl -X POST http://localhost:8000/api/v1/passkey/authenticate/options
```

### Unit Tests

```typescript
// tests/passkey.test.ts
import { generatePasskeyRegistrationOptions } from '@utils/webauthn'

describe('Passkey Utilities', () => {
  it('should generate registration options', async () => {
    const options = await generatePasskeyRegistrationOptions(
      'user-id',
      'user@example.com',
      'John Doe'
    )
    
    expect(options).toHaveProperty('challenge')
    expect(options.rp.name).toBe('BKeep')
  })
})
```

## Troubleshooting

### Common Issues

1. **"NotAllowedError: The operation either timed out or was not allowed"**
   - User cancelled the operation
   - User verification failed
   - Device doesn't support passkeys

2. **"SecurityError: The operation is insecure"**
   - Not using HTTPS (use localhost for testing)
   - RP ID doesn't match domain

3. **"InvalidStateError: The credential is already registered"**
   - Credential already exists for this user
   - Check `excludeCredentials` in registration options

4. **"Challenge expired"**
   - Challenge timeout (5 minutes)
   - User took too long to complete ceremony

5. **"Passkey counter error"**
   - Possible cloned authenticator
   - Counter rollback detected
   - Security risk - investigate further

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
7. **Device Trust**: Remember trusted devices
8. **Attestation**: Verify authenticator genuineness

## Additional Resources

- [WebAuthn Guide](https://webauthn.guide/)
- [FIDO Alliance](https://fidoalliance.org/)
- [W3C WebAuthn Specification](https://www.w3.org/TR/webauthn/)
- [SimpleWebAuthn Documentation](https://simplewebauthn.dev/)
- [Passkeys.dev](https://passkeys.dev/)

## Support

For issues or questions:
1. Check browser console for errors
2. Verify HTTPS/localhost requirement
3. Check RP ID configuration
4. Review server logs
5. Test with different authenticators

---

**Note:** Passkey authentication is a modern, secure alternative to passwords. Encourage users to register multiple passkeys (e.g., phone + laptop) for redundancy.
