# Role Management

## Overview

Role management allows administrators to view roles, manage role permissions, and view role statistics. Roles define what permissions users have in the system, enabling fine-grained access control through a role-based access control (RBAC) system.

**Key Features:**
- **Predefined roles** - SuperAdmin, Admin, Accountant, Bookkeeper, Viewer
- **Custom roles** - Create custom roles with specific permissions
- **Permission assignment** - Assign granular permissions to roles
- **Statistics** - View role usage and distribution

## Flow

### Role Permission Assignment Flow

```
SuperAdmin selects role
  ↓
System loads available permissions
  ↓
SuperAdmin selects permissions
  ↓
Existing permissions removed
  ↓
New permissions assigned
  ↓
User permissions recalculated
  ↓
Role permissions updated
```

### User Role Assignment Flow

```
Admin assigns role to user
  ↓
System validates role exists
  ↓
System checks permissions
  ↓
Existing user roles removed
  ↓
New roles assigned
  ↓
User permissions aggregated
  ↓
User access updated
```

## Features Implemented

### ✅ Role Management
- List all roles with pagination
- Get role by ID
- Get role with permissions
- View role statistics

### ✅ Permission Management
- Update role permissions
- View all permissions
- Validate permission assignments
- Permission aggregation for users

### ✅ Predefined Roles
- SuperAdmin (global, all permissions)
- Admin (tenant-specific, full access)
- Accountant (tenant-specific, account management)
- Bookkeeper (tenant-specific, transaction management)
- Viewer (tenant-specific, read-only)

### ✅ Security Features
- SuperAdmin role protection
- Permission validation
- Role validation
- Tenant isolation

## Database Schema

### Roles Table

The `roles` table contains the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `name` | VARCHAR(255) | Role name (unique) |
| `display_name` | VARCHAR(255) | Display name |
| `description` | TEXT | Role description |
| `is_active` | BOOLEAN | Whether role is active |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |
| `deleted_at` | TIMESTAMP | Soft delete timestamp |

**Key Features:**
- Unique constraint on `name`
- Soft delete support
- Active/inactive status

### Role Permissions Table

The `role_permissions` table links roles to permissions:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `role_id` | UUID | Foreign key to roles |
| `permission_id` | UUID | Foreign key to permissions |
| `created_at` | TIMESTAMP | Assignment timestamp |

**Key Features:**
- Many-to-many relationship
- Unique constraint on `(role_id, permission_id)`
- Cascade delete on role/permission deletion

## Architecture

### Technology Stack

**Backend:**
- Objection.js - ORM for database operations
- Knex - SQL query builder

### File Structure

```
src/
├── controllers/
│   └── role.controller.ts          # Role API controllers
├── models/
│   ├── Role.ts                     # Role model
│   └── Permission.ts               # Permission model
├── queries/
│   └── role.queries.ts             # Role database queries
├── routes/
│   └── role.route.ts               # Role routes
└── schema/
    └── role.schema.ts              # Role validation schemas
```

## API Endpoints

All role endpoints are under `/api/v1/roles/`:

### 1. List Roles

```http
GET /api/v1/roles?page=1&limit=20
Authorization: Bearer <admin-token>

Response:
{
  "success": true,
  "statusCode": 200,
  "message": "Roles retrieved successfully",
  "data": {
    "items": [
      {
        "id": "role-uuid",
        "name": "admin",
        "displayName": "Admin",
        "description": "Tenant administrator",
        "permissions": [
          {
            "id": "perm-uuid",
            "name": "view_dashboard",
            "displayName": "View Dashboard"
          }
        ],
        "createdAt": "2025-01-15T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

**Authorization:** SuperAdmin, Admin

### 2. Get Role by ID

```http
GET /api/v1/roles/:id
Authorization: Bearer <admin-token>

Response:
{
  "success": true,
  "statusCode": 200,
  "message": "Role retrieved successfully",
  "data": {
    "id": "role-uuid",
    "name": "admin",
    "displayName": "Admin",
    "description": "Tenant administrator",
    "permissions": [
      {
        "id": "perm-uuid",
        "name": "view_dashboard",
        "displayName": "View Dashboard"
      }
    ],
    "createdAt": "2025-01-15T00:00:00.000Z",
    "updatedAt": "2025-01-15T00:00:00.000Z"
  }
}
```

### 3. Get Role with Permissions

```http
GET /api/v1/roles/:id/with-permissions
Authorization: Bearer <admin-token>

Response:
{
  "success": true,
  "statusCode": 200,
  "message": "Role with permissions retrieved successfully",
  "data": {
    "id": "role-uuid",
    "name": "admin",
    "displayName": "Admin",
    "permissions": [
      {
        "id": "perm-uuid",
        "name": "view_dashboard",
        "displayName": "View Dashboard",
        "isActive": true
      }
    ]
  }
}
```

### 4. Get Role Statistics

```http
GET /api/v1/roles/statistics
Authorization: Bearer <superadmin-token>

Response:
{
  "success": true,
  "statusCode": 200,
  "message": "Role statistics retrieved successfully",
  "data": {
    "total": 5,
    "withPermissions": 5,
    "withoutPermissions": 0,
    "usersWithRoles": 90,
    "usersWithoutRoles": 10,
    "recentRoles": [
      {
        "id": "role-uuid",
        "name": "custom_role",
        "displayName": "Custom Role",
        "createdAt": "2025-01-15T10:00:00.000Z"
      }
    ]
  }
}
```

**Authorization:** SuperAdmin only

### 5. Update Role Permissions

```http
PUT /api/v1/roles/:id/permissions
Authorization: Bearer <superadmin-token>
Content-Type: application/json

{
  "permissionIds": [
    "perm-uuid-1",
    "perm-uuid-2",
    "perm-uuid-3"
  ]
}

Response:
{
  "success": true,
  "statusCode": 200,
  "message": "Role permissions updated successfully",
  "data": {
    "id": "role-uuid",
    "name": "custom_role",
    "displayName": "Custom Role",
    "permissions": [
      {
        "id": "perm-uuid-1",
        "name": "view_dashboard",
        "displayName": "View Dashboard"
      },
      {
        "id": "perm-uuid-2",
        "name": "view_users",
        "displayName": "View Users"
      }
    ],
    "updatedAt": "2025-01-15T10:00:00.000Z"
  }
}
```

**Purpose:** Updates permissions assigned to a role.

**Authorization:** SuperAdmin only

**Notes:**
- Existing permissions are removed
- New permissions are assigned
- SuperAdmin role cannot be modified

## Code Examples

### Frontend Integration

#### List Roles

```typescript
async function fetchRoles(page = 1, limit = 20) {
  const res = await fetch(`/api/v1/roles?page=${page}&limit=${limit}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  })
  
  const { data } = await res.json()
  return data // { items: [...], pagination: {...} }
}
```

#### Update Role Permissions

```typescript
async function updateRolePermissions(roleId: string, permissionIds: string[]) {
  const res = await fetch(`/api/v1/roles/${roleId}/permissions`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ permissionIds })
  })
  
  const { data } = await res.json()
  return data // Updated role with permissions
}
```

### Backend Implementation

#### Updating Role Permissions

```typescript
// Location: src/queries/role.queries.ts

export const updateRolePermissions = async (
  roleId: string,
  permissionIds: string[]
): Promise<Role> => {
  // 1. Verify role exists
  const role = await Role.query()
    .modify('notDeleted')
    .findById(roleId)

  if (!role) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.ROLE_NOT_FOUND)
  }

  // 2. Check if SuperAdmin role (protected)
  if (role.name === ROLES.SUPERADMIN) {
    throw new ApiError(
      HTTP_STATUS.FORBIDDEN,
      ERROR_MESSAGES.CANNOT_MODIFY_SUPERADMIN_ROLE
    )
  }

  // 3. Validate permissions exist
  const permissions = await Permission.query()
    .modify('notDeleted')
    .whereIn('id', permissionIds)

  if (permissions.length !== permissionIds.length) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      ERROR_MESSAGES.ROLE_ID_INVALID
    )
  }

  // 4. Delete existing permissions
  await RolePermission.query()
    .where('role_id', roleId)
    .delete()

  // 5. Assign new permissions
  if (permissionIds.length > 0) {
    await RolePermission.query().insert(
      permissionIds.map(permissionId => ({
        roleId,
        permissionId,
      }))
    )
  }

  // 6. Return role with permissions
  return Role.query()
    .modify('notDeleted')
    .findById(roleId)
    .withGraphFetched('permissions')
}
```

## Configuration

### Environment Variables

No additional environment variables required. Role management uses existing database configuration.

### Predefined Roles

#### SuperAdmin
- **Name:** `superadmin`
- **Scope:** Global (cross-tenant)
- **Permissions:** All permissions
- **Restrictions:** Cannot be deleted or modified via API

#### Admin
- **Name:** `admin`
- **Scope:** Tenant-specific
- **Permissions:** Full tenant access, user management, role management

#### Accountant
- **Name:** `accountant`
- **Scope:** Tenant-specific
- **Permissions:** Account management, report viewing/generation

#### Bookkeeper
- **Name:** `bookkeeper`
- **Scope:** Tenant-specific
- **Permissions:** Account viewing, transaction creation/editing

#### Viewer
- **Name:** `viewer`
- **Scope:** Tenant-specific
- **Permissions:** Read-only access to all data

## Security Considerations

### ✅ Implemented Security Features

1. **SuperAdmin Protection**: SuperAdmin role cannot be modified or deleted
2. **Permission Validation**: All permission IDs are validated before assignment
3. **Role Validation**: Roles are validated before operations
4. **Tenant Isolation**: Admin can only manage roles in their context

### 🔒 Best Practices

1. **Validate Permissions**: Always verify permissions exist before assignment
2. **Protect System Roles**: Prevent modification of system roles
3. **Check Permissions**: Verify user has permission to manage roles
4. **Audit Trail**: Log all role permission changes
5. **Rate Limiting**: Apply rate limiting to role management endpoints

## Testing

### Manual Testing

```bash
# 1. List roles
curl -X GET "http://localhost:8000/api/v1/roles?page=1&limit=20" \
  -H "Authorization: Bearer <admin-token>"

# 2. Get role by ID
curl -X GET "http://localhost:8000/api/v1/roles/:id" \
  -H "Authorization: Bearer <admin-token>"

# 3. Get role with permissions
curl -X GET "http://localhost:8000/api/v1/roles/:id/with-permissions" \
  -H "Authorization: Bearer <admin-token>"

# 4. Update role permissions
curl -X PUT "http://localhost:8000/api/v1/roles/:id/permissions" \
  -H "Authorization: Bearer <superadmin-token>" \
  -H "Content-Type: application/json" \
  -d '{"permissionIds": ["perm-uuid-1", "perm-uuid-2"]}'

# 5. Get role statistics
curl -X GET "http://localhost:8000/api/v1/roles/statistics" \
  -H "Authorization: Bearer <superadmin-token>"
```

## Troubleshooting

### Common Issues

1. **"Cannot modify SuperAdmin role"**
   - SuperAdmin role is protected
   - Cannot modify via API
   - **Solution**: Use database directly if needed (not recommended)

2. **"One or more permissions not found"**
   - Invalid permission IDs provided
   - Permissions may be soft-deleted
   - **Solution**: Verify permission IDs exist and are active

3. **"Role not found"**
   - Role may be soft-deleted
   - Invalid role ID
   - **Solution**: Check role exists and is active

4. **"Forbidden"**
   - Only SuperAdmin can update role permissions
   - Check user permissions
   - **Solution**: Use SuperAdmin account

## Migration Guide

Role management uses existing database tables. No additional migrations required.

## Future Enhancements

Potential improvements:
1. **Role Hierarchy**: Support role inheritance
2. **Custom Roles**: Allow creating custom roles via API
3. **Role Templates**: Pre-configured role templates
4. **Permission Groups**: Group related permissions
5. **Role History**: Track role permission changes
6. **Bulk Operations**: Update multiple roles at once
7. **Role Import/Export**: Import/export role configurations

## Related Documentation

- [User Management](./USER_MANAGEMENT.md)
- [User Invitations](./USER_INVITATIONS.md)
- [Multi-Tenancy](./MULTI_TENANCY.md)

---

**Note:** Role management is critical for access control. Always validate permissions and protect system roles.
