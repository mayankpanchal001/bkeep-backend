# User Management

## Overview

User management provides comprehensive CRUD operations for user accounts in the system. It supports user creation, listing, updating, activation/deactivation, role assignment, and user statistics. The system enforces tenant isolation and role-based access control.

**Key Features:**
- **Multi-tenant support** - Users are scoped to tenants
- **Role-based access** - Users have assigned roles with permissions
- **Soft deletes** - Users are never permanently deleted
- **Activation control** - Users can be activated/deactivated
- **Statistics** - User analytics and reporting

## Flow

### User Creation Flow

```
Admin creates user
  ↓
User account created
  ↓
Email verification sent
  ↓
User verifies email
  ↓
User account active
```

### User Deletion Flow

```
Admin deletes user
  ↓
System checks permissions
  ↓
User soft deleted (deletedAt set)
  ↓
User hidden from listings
  ↓
User can be restored
```

### Role Assignment Flow

```
Admin assigns roles to user
  ↓
System validates roles
  ↓
Existing roles removed
  ↓
New roles assigned
  ↓
Permissions recalculated
  ↓
User permissions updated
```

## Features Implemented

### ✅ User CRUD Operations
- Create new users
- List users with pagination and filtering
- Get user by ID with full details
- Update user information
- Soft delete users
- Restore deleted users

### ✅ User Activation
- Activate user accounts
- Deactivate user accounts
- Check activation status
- Prevent login for inactive users

### ✅ Role Management
- Assign roles to users
- Remove roles from users
- View user roles and permissions
- Validate role assignments

### ✅ User Statistics
- Total user count
- Verified vs unverified users
- Users with/without roles
- Recent user registrations

### ✅ Security Features
- Tenant isolation
- Role-based access control
- SuperAdmin protection
- Soft delete support

## Database Schema

### Users Table

The `users` table contains the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `email` | VARCHAR(255) | User email (unique) |
| `password` | VARCHAR(255) | Hashed password (bcrypt) |
| `name` | VARCHAR(255) | User's full name |
| `is_verified` | BOOLEAN | Email verification status |
| `is_active` | BOOLEAN | Account activation status |
| `mfa_enabled` | BOOLEAN | MFA enabled flag |
| `last_logged_in_at` | TIMESTAMP | Last login timestamp |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |
| `deleted_at` | TIMESTAMP | Soft delete timestamp |

**Key Features:**
- Unique constraint on `email`
- Indexes for efficient querying
- Soft delete support
- Password hashing with bcrypt

### User Roles Table

The `user_roles` table links users to roles:

| Field | Type | Description |
|-------|------|-------------|
| `user_id` | UUID | Foreign key to users |
| `role_id` | UUID | Foreign key to roles |
| `created_at` | TIMESTAMP | Assignment timestamp |

**Key Features:**
- Many-to-many relationship
- Composite primary key
- Automatic permission aggregation

## Architecture

### Technology Stack

**Backend:**
- Objection.js - ORM for database operations
- Knex - SQL query builder
- bcrypt - Password hashing

### File Structure

```
src/
├── controllers/
│   └── user.controller.ts          # User API controllers
├── models/
│   └── User.ts                     # User model
├── queries/
│   └── user.queries.ts             # User database queries
├── routes/
│   └── user.route.ts               # User routes
└── schema/
    └── user.schema.ts              # User validation schemas
```

## API Endpoints

All user endpoints are under `/api/v1/users/`:

### 1. List Users

```http
GET /api/v1/users?page=1&limit=20&search=john&isActive=true
Authorization: Bearer <admin-token>

Query Parameters:
  - page: Page number (default: 1)
  - limit: Items per page (default: 20, max: 100)
  - search: Search by name or email
  - isVerified: Filter by verification status
  - isActive: Filter by activation status
  - sort: Sort field (name, email, createdAt, updatedAt, lastLoggedInAt)
  - order: Sort order (asc, desc)

Response:
{
  "success": true,
  "statusCode": 200,
  "message": "Users retrieved successfully",
  "data": {
    "items": [
      {
        "id": "user-uuid",
        "email": "user@example.com",
        "name": "John Doe",
        "isVerified": true,
        "isActive": true,
        "mfaEnabled": false,
        "role": {
          "id": "role-uuid",
          "name": "admin",
          "displayName": "Admin"
        },
        "tenant": {
          "id": "tenant-uuid",
          "name": "Acme Corp"
        },
        "createdAt": "2025-01-15T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

**Authorization:**
- SuperAdmin: Can view all users
- Admin: Can view users in their tenant

### 2. Get User by ID

```http
GET /api/v1/users/:id
Authorization: Bearer <admin-token>

Response:
{
  "success": true,
  "statusCode": 200,
  "message": "User retrieved successfully",
  "data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "isVerified": true,
    "isActive": true,
    "roles": [
      {
        "id": "role-uuid",
        "name": "admin",
        "displayName": "Admin",
        "permissions": [...]
      }
    ],
    "permissions": [
      "view_dashboard",
      "view_users",
      // ... aggregated from all roles
    ],
    "tenant": {
      "id": "tenant-uuid",
      "name": "Acme Corp"
    },
    "createdAt": "2025-01-15T00:00:00.000Z",
    "updatedAt": "2025-01-15T00:00:00.000Z"
  }
}
```

### 3. Get User Statistics

```http
GET /api/v1/users/statistics
Authorization: Bearer <superadmin-token>

Response:
{
  "success": true,
  "statusCode": 200,
  "message": "User statistics retrieved successfully",
  "data": {
    "total": 100,
    "verified": 95,
    "unverified": 5,
    "withRoles": 90,
    "withoutRoles": 10,
    "recentUsers": [
      {
        "id": "user-uuid",
        "email": "newuser@example.com",
        "name": "New User",
        "createdAt": "2025-01-15T10:00:00.000Z"
      }
    ]
  }
}
```

**Authorization:** SuperAdmin only

### 4. Delete User

```http
DELETE /api/v1/users/:id
Authorization: Bearer <superadmin-token>

Response:
{
  "success": true,
  "statusCode": 200,
  "message": "User deleted successfully",
  "data": {}
}
```

**Purpose:** Soft deletes a user account.

**Restrictions:**
- Cannot delete SuperAdmin users
- Cannot delete yourself
- Soft delete only (can be restored)

### 5. Activate/Deactivate User

```http
PATCH /api/v1/users/:id/activation
Authorization: Bearer <superadmin-token>
Content-Type: application/json

{
  "isActive": true
}

Response:
{
  "success": true,
  "statusCode": 200,
  "message": "User account activated successfully",
  "data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "isActive": true,
    "updatedAt": "2025-01-15T10:00:00.000Z"
  }
}
```

**Purpose:** Activates or deactivates a user account.

**Authorization:** SuperAdmin only

**Notes:**
- Deactivated users cannot log in
- Account data is preserved

### 6. Restore User

```http
PATCH /api/v1/users/:id/restore
Authorization: Bearer <superadmin-token>

Response:
{
  "success": true,
  "statusCode": 200,
  "message": "User restored successfully",
  "data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "deletedAt": null,
    "updatedAt": "2025-01-15T10:00:00.000Z"
  }
}
```

**Purpose:** Restores a soft-deleted user account.

**Authorization:** SuperAdmin only

### 7. Update User Roles

```http
PUT /api/v1/users/:id/roles
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "roleIds": ["role-uuid-1", "role-uuid-2"]
}

Response:
{
  "success": true,
  "statusCode": 200,
  "message": "User roles updated successfully",
  "data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "roles": [
      {
        "id": "role-uuid-1",
        "name": "admin",
        "displayName": "Admin",
        "permissions": [...]
      }
    ],
    "permissions": [
      "view_dashboard",
      "view_users",
      // ... aggregated from all roles
    ],
    "updatedAt": "2025-01-15T10:00:00.000Z"
  }
}
```

**Purpose:** Updates roles assigned to a user.

**Authorization:**
- SuperAdmin: Can assign any role
- Admin: Can assign roles (except SuperAdmin)

**Notes:**
- Existing roles are removed
- New roles are assigned
- Permissions are automatically recalculated

## Code Examples

### Frontend Integration

#### List Users

```typescript
async function fetchUsers(filters: {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
}) {
  const params = new URLSearchParams()
  if (filters.page) params.append('page', filters.page.toString())
  if (filters.limit) params.append('limit', filters.limit.toString())
  if (filters.search) params.append('search', filters.search)
  if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString())

  const res = await fetch(`/api/v1/users?${params}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  })
  
  const { data } = await res.json()
  return data // { items: [...], pagination: {...} }
}
```

#### Update User Roles

```typescript
async function updateUserRoles(userId: string, roleIds: string[]) {
  const res = await fetch(`/api/v1/users/${userId}/roles`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ roleIds })
  })
  
  const { data } = await res.json()
  return data // Updated user with roles and permissions
}
```

#### Activate/Deactivate User

```typescript
async function toggleUserActivation(userId: string, isActive: boolean) {
  const res = await fetch(`/api/v1/users/${userId}/activation`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ isActive })
  })
  
  const { data } = await res.json()
  return data
}
```

### Backend Implementation

#### Creating User

```typescript
// Location: src/queries/user.queries.ts

export const createUser = async (
  data: CreateUserData
): Promise<User> => {
  // 1. Check if user already exists
  const existing = await User.findByEmail(data.email)
  if (existing) {
    throw new ApiError(HTTP_STATUS.CONFLICT, ERROR_MESSAGES.USER_ALREADY_EXISTS)
  }

  // 2. Hash password
  const hashedPassword = await bcrypt.hash(data.password, 10)

  // 3. Create user
  const user = await User.query().insert({
    email: data.email,
    password: hashedPassword,
    name: data.name,
    isVerified: false,
    isActive: true,
    mfaEnabled: false,
  })

  return user
}
```

#### Soft Delete

```typescript
// Location: src/queries/user.queries.ts

export const deleteUser = async (userId: string): Promise<User> => {
  // 1. Find user
  const user = await User.query()
    .modify('notDeleted')
    .findById(userId)
    .withGraphFetched('roles')

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
  }

  // 2. Check if SuperAdmin
  const hasSuperAdminRole = user.roles?.some(
    role => role.name === ROLES.SUPERADMIN
  )
  if (hasSuperAdminRole) {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, ERROR_MESSAGES.CANNOT_DELETE_SUPERADMIN)
  }

  // 3. Soft delete
  await user.softDelete()

  return user
}
```

#### Role Assignment

```typescript
// Location: src/queries/user.queries.ts

export const updateUserRoles = async (
  userId: string,
  roleIds: string[]
): Promise<User> => {
  // 1. Verify user exists
  const user = await User.query()
    .modify('notDeleted')
    .findById(userId)

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND)
  }

  // 2. Delete existing roles
  await UserRole.query()
    .where('user_id', userId)
    .delete()

  // 3. Assign new roles
  if (roleIds.length > 0) {
    await UserRole.query().insert(
      roleIds.map(roleId => ({
        userId,
        roleId,
      }))
    )
  }

  // 4. Return user with roles
  return User.query()
    .modify('notDeleted')
    .findById(userId)
    .withGraphFetched('roles.permissions')
}
```

## Configuration

### Environment Variables

No additional environment variables required. User management uses existing database and authentication configuration.

### Security Constants

User management uses constants from `src/constants/`:
- `ROLES` - Role names (SUPERADMIN, ADMIN, etc.)
- `ERROR_MESSAGES` - Error messages
- `SUCCESS_MESSAGES` - Success messages
- `HTTP_STATUS` - HTTP status codes

## Security Considerations

### ✅ Implemented Security Features

1. **Password Hashing**: Passwords hashed with bcrypt (10 rounds)
2. **SuperAdmin Protection**: Cannot delete SuperAdmin users
3. **Tenant Isolation**: Admin can only manage users in their tenant
4. **Soft Deletes**: Users never permanently deleted
5. **Role Validation**: Cannot assign SuperAdmin role via API
6. **Self-Protection**: Cannot delete yourself

### 🔒 Best Practices

1. **Always Use Soft Delete**: Preserve data for audit trail
2. **Validate User Status**: Check if user is active before operations
3. **Check Permissions**: Verify admin can manage users
4. **Tenant Filtering**: Always filter by tenant for admin users
5. **Password Security**: Never store plain text passwords
6. **Rate Limiting**: Apply rate limiting to user management endpoints

## Testing

### Manual Testing

```bash
# 1. List users
curl -X GET "http://localhost:8000/api/v1/users?page=1&limit=20" \
  -H "Authorization: Bearer <admin-token>"

# 2. Get user by ID
curl -X GET "http://localhost:8000/api/v1/users/:id" \
  -H "Authorization: Bearer <admin-token>"

# 3. Update user roles
curl -X PUT "http://localhost:8000/api/v1/users/:id/roles" \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"roleIds": ["role-uuid-1", "role-uuid-2"]}'

# 4. Activate user
curl -X PATCH "http://localhost:8000/api/v1/users/:id/activation" \
  -H "Authorization: Bearer <superadmin-token>" \
  -H "Content-Type: application/json" \
  -d '{"isActive": true}'

# 5. Delete user (soft delete)
curl -X DELETE "http://localhost:8000/api/v1/users/:id" \
  -H "Authorization: Bearer <superadmin-token>"
```

## Troubleshooting

### Common Issues

1. **"User not found"**
   - User may be soft-deleted
   - Check `deletedAt` field
   - Use restore endpoint if needed

2. **"Cannot delete SuperAdmin"**
   - SuperAdmin users are protected
   - Remove SuperAdmin role first
   - Or use database directly (not recommended)

3. **"Forbidden"**
   - Admin can only manage users in their tenant
   - SuperAdmin can manage all users
   - Check user's selected tenant

4. **"User already exists"**
   - Email must be unique
   - Check for soft-deleted users with same email
   - Restore existing user instead

## Migration Guide

User management uses existing database tables. No additional migrations required.

## Future Enhancements

Potential improvements:
1. **Bulk Operations**: Update multiple users at once
2. **User Import**: CSV/Excel import functionality
3. **User Export**: Export user data
4. **Activity Log**: Track user management actions
5. **Email Notifications**: Notify users of account changes
6. **Password Policies**: Enforce password complexity rules
7. **Account Lockout**: Lock accounts after failed attempts

## Related Documentation

- [Authentication](./AUTHENTICATION.md)
- [Role Management](./ROLE_MANAGEMENT.md)
- [User Invitations](./USER_INVITATIONS.md)
- [Multi-Tenancy](./MULTI_TENANCY.md)

---

**Note:** User management is a core feature. Always validate permissions and maintain tenant isolation.
