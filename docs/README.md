# Bkeep Backend Documentation

This directory contains comprehensive documentation for the Bkeep TypeScript backend.

## 📚 Documentation Index

### Getting Started

#### [API_ARCHITECTURE.md](./API_ARCHITECTURE.md) ⭐ **START HERE**
Complete overview of the Bkeep backend architecture, technology stack, and design patterns.

**Topics Covered:**
- Technology stack & dependencies
- Project structure & organization
- Architecture patterns (layered architecture, separation of concerns)
- Complete API endpoint reference
- Database schema overview
- Security best practices
- Development workflow
- Deployment guide

**Use this when:**
- Starting with the codebase
- Understanding overall architecture
- Looking for specific features
- Onboarding new developers

---

### Authentication & Security Features

#### [AUTHENTICATION.md](./AUTHENTICATION.md)
Complete guide to JWT-based authentication system.

**Topics Covered:**
- Login flow (with MFA integration)
- JWT token structure (access & refresh tokens)
- Token generation & validation
- Logout & token revocation
- Token refresh flow
- MFA integration (Email OTP & TOTP)
- Security best practices

**Use this when:**
- Implementing login/logout
- Understanding token management
- Troubleshooting authentication issues
- Integrating with frontend

---

#### [MFA_EMAIL_OTP.md](./MFA_EMAIL_OTP.md)
Email OTP (One-Time Password) multi-factor authentication.

**Topics Covered:**
- Email OTP flow
- OTP generation & storage
- Email delivery
- OTP verification
- Security considerations
- Best practices

**Use this when:**
- Implementing email OTP MFA
- Understanding email OTP flow
- Troubleshooting OTP issues

---

#### [TOTP_IMPLEMENTATION.md](./TOTP_IMPLEMENTATION.md)
Time-Based One-Time Password (TOTP) with authenticator apps.

**Topics Covered:**
- TOTP architecture and flow
- Authenticator app setup (Google Authenticator, Microsoft Authenticator)
- API endpoints for TOTP management
- Backup codes for account recovery
- Database schema for user authenticators
- Security considerations and best practices
- Testing guide

**Use this when:**
- Implementing authenticator app support
- Understanding TOTP verification flow
- Managing backup codes
- Troubleshooting TOTP issues

---

#### [TOTP_QUICK_START.md](./TOTP_QUICK_START.md)
Quick reference guide for TOTP functionality.

**Topics Covered:**
- Quick API reference
- Common use cases
- Code snippets
- Troubleshooting tips

**Use this when:**
- You need a quick API reference
- Looking for code examples
- Quick troubleshooting

---

#### [PASSWORD_RESET.md](./PASSWORD_RESET.md)
Password reset flow via email.

**Topics Covered:**
- Password reset flow
- Token generation & validation
- Email delivery
- Security considerations (email enumeration prevention)
- Best practices

**Use this when:**
- Implementing password reset
- Understanding reset token flow
- Troubleshooting password reset issues

---

### User Management Features

#### [USER_MANAGEMENT.md](./USER_MANAGEMENT.md)
User account management (CRUD operations).

**Topics Covered:**
- List, create, update, delete users
- User activation/deactivation
- User statistics
- Role assignment
- Security considerations

**Use this when:**
- Managing user accounts
- Understanding user operations
- Implementing user features

---

#### [USER_INVITATIONS.md](./USER_INVITATIONS.md)
User invitation system for onboarding new users.

**Topics Covered:**
- Invitation flow
- Creating & revoking invitations
- Accepting invitations
- Email templates
- Security considerations

**Use this when:**
- Implementing user invitations
- Understanding invitation flow
- Troubleshooting invitation issues

---

#### [ROLE_MANAGEMENT.md](./ROLE_MANAGEMENT.md)
Role management and permission assignment.

**Topics Covered:**
- Role listing & details
- Updating role permissions
- Role statistics
- Predefined roles
- Security considerations

**Use this when:**
- Managing roles
- Assigning permissions to roles
- Understanding role structure

---

### Core System Features

#### [MULTI_TENANCY.md](./MULTI_TENANCY.md)
Schema-based multi-tenancy architecture.

**Topics Covered:**
- Multi-tenancy architecture (schema-based isolation)
- Database structure (global vs tenant-specific)
- Tenant lifecycle (onboarding, management)
- Tenant context & middleware
- Query patterns for tenant data
- Security considerations
- Migration management
- Best practices & troubleshooting

**Use this when:**
- Understanding tenant isolation
- Implementing tenant-specific features
- Troubleshooting tenant access issues
- Planning multi-tenant features

---

#### [ACCOUNT_MANAGEMENT.md](./ACCOUNT_MANAGEMENT.md)
Bookkeeping account management (tenant-specific).

**Topics Covered:**
- Account CRUD operations
- Database schema and model
- Tenant-specific queries
- API endpoints
- Search and filtering
- Activation/deactivation
- Soft deletes and restoration
- Security & permissions

**Use this when:**
- Managing bookkeeping accounts
- Understanding account structure
- Implementing account features
- Querying tenant-specific accounts

---

#### [AUDIT_LOGGING.md](./AUDIT_LOGGING.md)
Comprehensive audit logging system for tracking system operations.

**Topics Covered:**
- Audit logging architecture
- Database schema (JSONB storage)
- Audit service and helper functions
- API endpoints for querying logs
- Usage examples and patterns
- Querying audit logs
- Security considerations

**Use this when:**
- Implementing audit logging
- Querying audit trails
- Understanding audit log structure
- Troubleshooting audit issues
- Compliance and security auditing

---

#### [MAIL_QUEUE.md](./MAIL_QUEUE.md)
Email service and job queue system.

**Topics Covered:**
- BullMQ + Redis job queue architecture
- AWS SES integration
- Email templates (Handlebars)
- Queue worker management
- Email types (MFA OTP, password reset, invitations)
- Error handling & retry logic
- Monitoring & performance
- Best practices

**Use this when:**
- Implementing email notifications
- Understanding queue system
- Troubleshooting email delivery
- Monitoring email jobs

---

### Database Schema

#### [DATABASE_SCHEMA_MFA.md](./DATABASE_SCHEMA_MFA.md)
Multi-Factor Authentication database schema.

**Topics Covered:**
- `mfa_email_otps` table structure (email OTP codes)
- `user_authenticators` table structure (TOTP authenticators)
- Relationships and foreign keys
- Indexes for performance
- Soft delete implementation
- Query patterns and examples
- Schema design rationale

**Use this when:**
- Understanding MFA database design
- Writing queries for MFA data
- Optimizing MFA-related queries
- Planning schema changes

---

## 🗂️ Documentation Organization

```
docs/
├── README.md                      # 📋 Documentation index (this file)
│
├── Getting Started
│   └── API_ARCHITECTURE.md        # ⭐ Overall architecture (START HERE)
│
├── Authentication & Security
│   ├── AUTHENTICATION.md          # Login, logout, JWT tokens
│   ├── MFA_EMAIL_OTP.md           # Email OTP MFA
│   ├── TOTP_IMPLEMENTATION.md     # TOTP authenticator apps
│   ├── TOTP_QUICK_START.md        # Quick TOTP reference
│   └── PASSWORD_RESET.md          # Password reset flow
│
├── User Management
│   ├── USER_MANAGEMENT.md         # User CRUD operations
│   ├── USER_INVITATIONS.md        # User invitation system
│   └── ROLE_MANAGEMENT.md         # Role & permission management
│
├── Core System
│   ├── MULTI_TENANCY.md           # Multi-tenancy architecture
│   ├── ACCOUNT_MANAGEMENT.md       # Bookkeeping accounts
│   ├── AUDIT_LOGGING.md           # Audit trail system
│   └── MAIL_QUEUE.md              # Email service & queue
│
└── Database Schema
    └── DATABASE_SCHEMA_MFA.md     # MFA database schema
```

---

## 🎯 Quick Navigation

### For Developers

**Starting with the codebase?**
1. Read [API_ARCHITECTURE.md](./API_ARCHITECTURE.md) for overall structure ⭐
2. Review [MULTI_TENANCY.md](./MULTI_TENANCY.md) for data isolation
3. Study [ROLE_MANAGEMENT.md](./ROLE_MANAGEMENT.md) for access control
4. Check [DATABASE_SCHEMA_MFA.md](./DATABASE_SCHEMA_MFA.md) for database design

**Implementing a new feature?**
1. Check if related documentation exists
2. Review database schema documentation
3. Follow established patterns (see API_ARCHITECTURE.md)
4. Update documentation when making changes

**Troubleshooting?**
1. Check [TOTP_QUICK_START.md](./TOTP_QUICK_START.md) for MFA issues
2. Review [MAIL_QUEUE.md](./MAIL_QUEUE.md) for email problems
3. Check [MULTI_TENANCY.md](./MULTI_TENANCY.md) for tenant access issues
4. Review [ROLE_MANAGEMENT.md](./ROLE_MANAGEMENT.md) for authorization errors
5. Check [AUDIT_LOGGING.md](./AUDIT_LOGGING.md) for audit log queries

**Learning the codebase?**
1. Start with [API_ARCHITECTURE.md](./API_ARCHITECTURE.md) for big picture ⭐
2. Read [MULTI_TENANCY.md](./MULTI_TENANCY.md) for tenant isolation
3. Study [ROLE_MANAGEMENT.md](./ROLE_MANAGEMENT.md) for access control
4. Review [SCHEMA_IMPROVEMENTS.md](./SCHEMA_IMPROVEMENTS.md) for design philosophy

---

## 📋 Documentation Standards

When adding new documentation:

1. **Use clear, descriptive filenames**
   - `FEATURE_NAME_IMPLEMENTATION.md` for complete guides
   - `FEATURE_NAME_QUICK_START.md` for quick references
   - `SCHEMA_DESCRIPTION.md` for database schema docs

2. **Include table of contents** for long documents

3. **Use consistent formatting**
   - Use headings hierarchy (##, ###, ####)
   - Include code examples
   - Add visual diagrams when helpful
   - Use emojis sparingly for visual markers

4. **Keep it up to date**
   - Update docs when changing functionality
   - Mark deprecated sections clearly
   - Include version/date information

5. **Cross-reference related docs**
   - Link to related documentation
   - Explain relationships between features
   - Provide navigation hints

---

## 🔗 Related Resources

### Project Root Files
- `README.md` - Project overview and setup (in root directory)
- `package.json` - Dependencies and scripts
- `.env.example` - Environment variable reference

### Code Documentation
- Inline comments in source code
- JSDoc comments for functions
- TypeScript type definitions

### External Resources
- [TOTP RFC 6238](https://datatracker.ietf.org/doc/html/rfc6238)
- [otplib Documentation](https://github.com/yeojz/otplib)
- [Objection.js Documentation](https://vincit.github.io/objection.js/)

---

## 💡 Contributing to Documentation

When contributing to documentation:

1. **Check existing docs** - Don't duplicate information
2. **Use clear language** - Assume the reader is smart but unfamiliar
3. **Include examples** - Show, don't just tell
4. **Test your examples** - Make sure code snippets actually work
5. **Get feedback** - Have someone review your docs

---

## 📝 Documentation Maintenance

This documentation is maintained by the development team. If you find:
- Outdated information
- Unclear explanations
- Missing documentation
- Broken links or examples

Please update the relevant documentation or create an issue for discussion.

---

## 🎓 Learning Path

### New to the Project?
1. **[API_ARCHITECTURE.md](./API_ARCHITECTURE.md)** - Start here for overall architecture ⭐
2. **[MULTI_TENANCY.md](./MULTI_TENANCY.md)** - Understand data isolation
3. **[ROLE_MANAGEMENT.md](./ROLE_MANAGEMENT.md)** - Learn access control system

### Building a Feature?
1. **[API_ARCHITECTURE.md](./API_ARCHITECTURE.md)** - Understand patterns
2. **[MULTI_TENANCY.md](./MULTI_TENANCY.md)** - If tenant-specific
3. **[ROLE_MANAGEMENT.md](./ROLE_MANAGEMENT.md)** - For access control
4. **[MAIL_QUEUE.md](./MAIL_QUEUE.md)** - If sending emails
5. **[AUDIT_LOGGING.md](./AUDIT_LOGGING.md)** - For audit logging

### Implementing Authentication?
1. **[AUTHENTICATION.md](./AUTHENTICATION.md)** - Login/logout flow
2. **[MFA_EMAIL_OTP.md](./MFA_EMAIL_OTP.md)** - Email OTP MFA
3. **[TOTP_IMPLEMENTATION.md](./TOTP_IMPLEMENTATION.md)** - TOTP authenticator
4. **[PASSWORD_RESET.md](./PASSWORD_RESET.md)** - Password reset

### Managing Users?
1. **[USER_MANAGEMENT.md](./USER_MANAGEMENT.md)** - User CRUD operations
2. **[USER_INVITATIONS.md](./USER_INVITATIONS.md)** - Invitation system
3. **[ROLE_MANAGEMENT.md](./ROLE_MANAGEMENT.md)** - Role assignment

### Working on Database?
1. **[API_ARCHITECTURE.md](./API_ARCHITECTURE.md)** - Schema overview
2. **[DATABASE_SCHEMA_MFA.md](./DATABASE_SCHEMA_MFA.md)** - MFA tables
3. **[MULTI_TENANCY.md](./MULTI_TENANCY.md)** - Tenant schemas

### Managing Emails?
1. **[MAIL_QUEUE.md](./MAIL_QUEUE.md)** - Complete email system guide
2. **Templates** in `public/templates/` directory
3. **Worker** in `src/workers/mail.worker.ts`

### Implementing Audit Logging?
1. **[AUDIT_LOGGING.md](./AUDIT_LOGGING.md)** - Complete audit logging guide
2. **[AUDIT_LOGGING.md](./AUDIT_LOGGING.md#audit-service)** - Service functions
3. **[AUDIT_LOGGING.md](./AUDIT_LOGGING.md#api-endpoints)** - API endpoints
4. **[AUDIT_LOGGING.md](./AUDIT_LOGGING.md#usage-examples)** - Usage examples

---

**Last Updated:** November 26, 2025  
**Documentation Version:** 1.1

