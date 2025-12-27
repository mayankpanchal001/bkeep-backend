import swaggerJsdoc from 'swagger-jsdoc'

import { env, isProduction } from '@config/env'

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Accounting API',
      version: '1.0.0',
      description: 'API documentation for Accounting Backend',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      // {
      //   url: `https://bkeep.ca${env.API_PREFIX}`,
      //   description: 'Production server (HTTPS)',
      // },
      {
        url: `http://localhost:${env.PORT}${env.API_PREFIX}`,
        description: 'Local development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              maxLength: 255,
              example: 'user@example.com',
            },
            password: {
              type: 'string',
              format: 'password',
              minLength: 8,
              maxLength: 128,
              example: 'SecurePassword123!',
            },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Login successful',
            },
            data: {
              type: 'object',
              properties: {
                accessToken: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                },
                refreshToken: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                },
                user: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'string',
                      format: 'uuid',
                    },
                    email: {
                      type: 'string',
                    },
                    name: {
                      type: 'string',
                    },
                    role: {
                      type: 'object',
                      properties: {
                        id: {
                          type: 'string',
                          format: 'uuid',
                        },
                        name: {
                          type: 'string',
                          example: 'superadmin',
                        },
                        displayName: {
                          type: 'string',
                          example: 'Super Admin',
                        },
                      },
                    },
                    permissions: {
                      type: 'array',
                      description: 'List of permissions assigned to the user',
                      items: {
                        type: 'object',
                        properties: {
                          id: {
                            type: 'string',
                            format: 'uuid',
                            example: '123e4567-e89b-12d3-a456-426614174000',
                          },
                          name: {
                            type: 'string',
                            example: 'view_dashboard',
                          },
                          displayName: {
                            type: 'string',
                            example: 'View Dashboard',
                          },
                        },
                        required: ['id', 'name', 'displayName'],
                      },
                    },
                    tenants: {
                      type: 'array',
                      description: 'List of all tenants accessible to the user',
                      items: {
                        type: 'object',
                        properties: {
                          id: {
                            type: 'string',
                            format: 'uuid',
                            example: '123e4567-e89b-12d3-a456-426614174000',
                          },
                          name: {
                            type: 'string',
                            example: 'Acme Corp',
                          },
                          schemaName: {
                            type: 'string',
                            example: 'acme_corp',
                            description:
                              'Database schema name for the tenant (without tenant_ prefix)',
                          },
                          isPrimary: {
                            type: 'boolean',
                            example: true,
                            description:
                              'Whether this is the primary tenant for the user',
                          },
                        },
                        required: ['id', 'name', 'schemaName', 'isPrimary'],
                      },
                    },
                    selectedTenantId: {
                      type: 'string',
                      format: 'uuid',
                      example: '123e4567-e89b-12d3-a456-426614174000',
                      description: 'ID of the currently selected tenant',
                    },
                  },
                },
              },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            statusCode: {
              type: 'integer',
              example: 400,
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
            errors: {
              type: 'array',
              description: 'Validation errors (only for validation errors)',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    example: 'email',
                  },
                  message: {
                    type: 'string',
                    example: 'Invalid email format',
                  },
                },
              },
            },
            stack: {
              type: 'string',
              description: 'Error stack trace (only in development)',
            },
            data: {
              type: 'null',
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              minimum: 1,
              example: 1,
            },
            limit: {
              type: 'integer',
              minimum: 1,
              example: 20,
            },
            offset: {
              type: 'integer',
              minimum: 0,
              example: 0,
            },
            total: {
              type: 'integer',
              minimum: 0,
              example: 50,
            },
            totalPages: {
              type: 'integer',
              minimum: 0,
              example: 3,
            },
            hasNextPage: {
              type: 'boolean',
              example: true,
            },
            hasPreviousPage: {
              type: 'boolean',
              example: false,
            },
          },
          required: [
            'page',
            'limit',
            'offset',
            'total',
            'totalPages',
            'hasNextPage',
            'hasPreviousPage',
          ],
        },
        Permission: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            name: {
              type: 'string',
              example: 'view_dashboard',
            },
            displayName: {
              type: 'string',
              example: 'View Dashboard',
            },
          },
          required: ['id', 'name', 'displayName'],
        },
        PermissionWithDetails: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            name: {
              type: 'string',
              example: 'view_users',
            },
            displayName: {
              type: 'string',
              example: 'View Users',
            },
            description: {
              type: 'string',
              nullable: true,
              example: 'Permission to view users',
            },
            isActive: {
              type: 'boolean',
              example: true,
            },
          },
          required: ['id', 'name', 'displayName', 'isActive'],
        },
        Role: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            name: {
              type: 'string',
              example: 'admin',
            },
            displayName: {
              type: 'string',
              example: 'Admin',
            },
            description: {
              type: 'string',
              nullable: true,
              example: 'Members in admin role can view and do everything.',
            },
            isActive: {
              type: 'boolean',
              example: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-01-01T00:00:00.000Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-01-01T00:00:00.000Z',
            },
          },
          required: [
            'id',
            'name',
            'displayName',
            'isActive',
            'createdAt',
            'updatedAt',
          ],
        },
        RoleWithPermissions: {
          allOf: [
            {
              $ref: '#/components/schemas/Role',
            },
            {
              type: 'object',
              properties: {
                permissions: {
                  type: 'array',
                  description: 'List of permissions assigned to this role',
                  items: {
                    $ref: '#/components/schemas/PermissionWithDetails',
                  },
                },
              },
            },
          ],
        },
        Tenant: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            name: {
              type: 'string',
              example: 'Acme Corp',
            },
            isActive: {
              type: 'boolean',
              example: true,
            },
            isPrimary: {
              type: 'boolean',
              example: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-01-01T00:00:00.000Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-01-01T00:00:00.000Z',
            },
          },
          required: [
            'id',
            'name',
            'isActive',
            'isPrimary',
            'createdAt',
            'updatedAt',
          ],
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            name: {
              type: 'string',
              example: 'John Doe',
            },
            isVerified: {
              type: 'boolean',
              example: true,
            },
            verifiedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '2025-01-01T00:00:00.000Z',
            },
            isActive: {
              type: 'boolean',
              example: true,
            },
            lastLoggedInAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '2025-01-15T10:30:00.000Z',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-01-01T00:00:00.000Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-01-01T00:00:00.000Z',
            },
          },
          required: [
            'id',
            'email',
            'name',
            'isVerified',
            'isActive',
            'createdAt',
            'updatedAt',
          ],
        },
        UserWithRelations: {
          allOf: [
            {
              $ref: '#/components/schemas/User',
            },
            {
              type: 'object',
              properties: {
                tenants: {
                  type: 'array',
                  description: 'List of tenants associated with the user',
                  items: {
                    $ref: '#/components/schemas/Tenant',
                  },
                },
                roles: {
                  type: 'array',
                  description: 'List of roles assigned to the user',
                  items: {
                    $ref: '#/components/schemas/Role',
                  },
                },
                permissions: {
                  type: 'array',
                  description:
                    'List of permissions assigned to the user (aggregated from all roles)',
                  items: {
                    $ref: '#/components/schemas/Permission',
                  },
                },
              },
            },
          ],
        },
        RoleStatistics: {
          type: 'object',
          properties: {
            total: {
              type: 'integer',
              description: 'Total number of roles (excluding superadmin)',
              example: 10,
            },
            active: {
              type: 'integer',
              description: 'Number of active roles',
              example: 8,
            },
            inactive: {
              type: 'integer',
              description: 'Number of inactive roles',
              example: 2,
            },
            withPermissions: {
              type: 'integer',
              description: 'Number of roles with at least one permission',
              example: 7,
            },
            withoutPermissions: {
              type: 'integer',
              description: 'Number of roles without any permissions',
              example: 3,
            },
            totalPermissions: {
              type: 'integer',
              description:
                'Total number of unique permissions assigned to roles',
              example: 25,
            },
            averagePermissionsPerRole: {
              type: 'number',
              format: 'float',
              description:
                'Average number of permissions per role (for roles with permissions)',
              example: 3.57,
            },
            recentRoles: {
              type: 'array',
              description: 'Last 5 created roles',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    format: 'uuid',
                    example: '123e4567-e89b-12d3-a456-426614174000',
                  },
                  name: {
                    type: 'string',
                    example: 'viewer',
                  },
                  displayName: {
                    type: 'string',
                    example: 'Viewer',
                  },
                  createdAt: {
                    type: 'string',
                    format: 'date-time',
                    example: '2025-01-15T10:30:00.000Z',
                  },
                },
                required: ['id', 'name', 'displayName', 'createdAt'],
              },
            },
          },
          required: [
            'total',
            'active',
            'inactive',
            'withPermissions',
            'withoutPermissions',
            'totalPermissions',
            'averagePermissionsPerRole',
            'recentRoles',
          ],
        },
        UserStatistics: {
          type: 'object',
          properties: {
            total: {
              type: 'integer',
              description: 'Total number of users (non-deleted)',
              example: 50,
            },
            verified: {
              type: 'integer',
              description: 'Number of verified users',
              example: 45,
            },
            unverified: {
              type: 'integer',
              description: 'Number of unverified users',
              example: 5,
            },
            withRoles: {
              type: 'integer',
              description: 'Number of users with at least one role',
              example: 40,
            },
            withoutRoles: {
              type: 'integer',
              description: 'Number of users without any roles',
              example: 10,
            },
            recentUsers: {
              type: 'array',
              description: 'Last 5 created users',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    format: 'uuid',
                    example: '123e4567-e89b-12d3-a456-426614174000',
                  },
                  email: {
                    type: 'string',
                    format: 'email',
                    example: 'user@example.com',
                  },
                  name: {
                    type: 'string',
                    example: 'John Doe',
                  },
                  isVerified: {
                    type: 'boolean',
                    example: true,
                  },
                  createdAt: {
                    type: 'string',
                    format: 'date-time',
                    example: '2025-01-15T10:30:00.000Z',
                  },
                },
                required: ['id', 'email', 'name', 'isVerified', 'createdAt'],
              },
            },
          },
          required: [
            'total',
            'verified',
            'unverified',
            'withRoles',
            'withoutRoles',
            'recentUsers',
          ],
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              description: 'Array of items',
            },
            pagination: {
              $ref: '#/components/schemas/Pagination',
            },
          },
          required: ['items', 'pagination'],
        },
        CreateAccountRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 255,
              example: 'Checking Account',
            },
            number: {
              type: 'string',
              maxLength: 255,
              nullable: true,
              example: '1234567890',
            },
            currencyCode: {
              type: 'string',
              length: 3,
              default: 'CAD',
              example: 'CAD',
              description: 'ISO 4217 currency code',
            },
            openingBalance: {
              type: 'number',
              default: 0,
              example: 1000.0,
            },
            bankName: {
              type: 'string',
              maxLength: 255,
              nullable: true,
              example: 'Royal Bank of Canada',
            },
          },
        },
        UpdateAccountRequest: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 255,
              example: 'Checking Account',
            },
            number: {
              type: 'string',
              maxLength: 255,
              nullable: true,
              example: '1234567890',
            },
            currencyCode: {
              type: 'string',
              length: 3,
              example: 'CAD',
              description: 'ISO 4217 currency code',
            },
            openingBalance: {
              type: 'number',
              example: 1000.0,
            },
            bankName: {
              type: 'string',
              maxLength: 255,
              nullable: true,
              example: 'Royal Bank of Canada',
            },
            isActive: {
              type: 'boolean',
              example: true,
            },
          },
        },
        Account: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            tenantId: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            createdBy: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 255,
              example: 'Checking Account',
            },
            number: {
              type: 'string',
              maxLength: 255,
              nullable: true,
              example: '1234567890',
            },
            currencyCode: {
              type: 'string',
              minLength: 3,
              maxLength: 3,
              example: 'CAD',
              description: 'ISO 4217 currency code',
            },
            openingBalance: {
              type: 'number',
              example: 1000.0,
            },
            bankName: {
              type: 'string',
              maxLength: 255,
              nullable: true,
              example: 'Royal Bank of Canada',
            },
            isActive: {
              type: 'boolean',
              example: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-01-01T00:00:00.000Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-01-01T00:00:00.000Z',
            },
            deletedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: null,
            },
          },
          required: [
            'id',
            'tenantId',
            'createdBy',
            'name',
            'currencyCode',
            'openingBalance',
            'isActive',
            'createdAt',
            'updatedAt',
          ],
        },
        ImportField: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'Field key for mapping',
              example: 'accountName',
            },
            label: {
              type: 'string',
              description: 'Display label for the field',
              example: 'Account Name',
            },
            required: {
              type: 'boolean',
              description: 'Whether the field is required',
              example: true,
            },
          },
          required: ['key', 'label', 'required'],
        },
        ImportFieldsResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            statusCode: {
              type: 'integer',
              example: 200,
            },
            message: {
              type: 'string',
              example: 'Chart of accounts fetched successfully',
            },
            data: {
              type: 'array',
              description: 'List of available import fields',
              items: {
                $ref: '#/components/schemas/ImportField',
              },
            },
          },
          required: ['success', 'statusCode', 'message', 'data'],
        },
        AuditLog: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            action: {
              type: 'string',
              description:
                'Action type in namespaced format (e.g., "user.logged_in", "tenant.created", "account.updated"). Common patterns: tenant.*, user.*, account.*',
            },
            actor: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['user', 'system', 'api_key'],
                  example: 'user',
                },
                id: {
                  type: 'string',
                  format: 'uuid',
                  example: '123e4567-e89b-12d3-a456-426614174000',
                },
                email: {
                  type: 'string',
                  format: 'email',
                  nullable: true,
                  example: 'user@example.com',
                },
                name: {
                  type: 'string',
                  nullable: true,
                  example: 'John Doe',
                },
              },
              required: ['type', 'id'],
            },
            targets: {
              type: 'array',
              description: 'Array of target entities affected by the action',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    example: 'User',
                  },
                  id: {
                    type: 'string',
                    format: 'uuid',
                    example: '123e4567-e89b-12d3-a456-426614174000',
                  },
                  name: {
                    type: 'string',
                    nullable: true,
                    example: 'John Doe',
                  },
                },
                required: ['type', 'id'],
                additionalProperties: true,
              },
            },
            tenantId: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            context: {
              type: 'object',
              properties: {
                location: {
                  type: 'string',
                  nullable: true,
                  description: 'IP address or location identifier',
                  example: '123.123.123.123',
                },
                userAgent: {
                  type: 'string',
                  nullable: true,
                  example: 'Chrome/104.0.0.0',
                },
                method: {
                  type: 'string',
                  nullable: true,
                  example: 'POST',
                },
                endpoint: {
                  type: 'string',
                  nullable: true,
                  example: '/api/v1/users',
                },
                requestId: {
                  type: 'string',
                  nullable: true,
                  example: 'req-123e4567-e89b-12d3-a456-426614174000',
                },
              },
              additionalProperties: true,
            },
            success: {
              type: 'boolean',
              example: true,
            },
            occurredAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-01-15T10:30:00.000Z',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-01-15T10:30:00.000Z',
            },
          },
          required: [
            'id',
            'action',
            'actor',
            'targets',
            'tenantId',
            'context',
            'success',
            'occurredAt',
            'createdAt',
          ],
        },
      },
    },
  },
  // In production the code runs from "dist", so point swagger-jsdoc to built files.
  // In development/test, point to the TypeScript sources.
  apis: isProduction()
    ? ['./dist/routes/**/*.js', './dist/controllers/**/*.js', './dist/**/*.js']
    : ['./src/routes/**/*.ts', './src/controllers/**/*.ts', './src/**/*.ts'],
}

export const swaggerSpec = swaggerJsdoc(swaggerOptions)

export const swaggerUiOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Accounting API Documentation',
}
