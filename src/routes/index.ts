import { Router, type Router as RouterType } from 'express'

import accountRoutes from './account.route'
import auditRoutes from './audit.route'
import authRoutes from './auth.route'
import authenticatorRoutes from './authenticator.route'
import chartOfAccountRoutes from './chartOfAccount.route'
import journalEntryRoutes from './journalEntry.route'
import passkeyRoutes from './passkey.route'
import roleRoutes from './role.route'
import taxRoutes from './tax.route'
import taxExemptionRoutes from './taxExemption.route'
import taxGroupRoutes from './taxGroup.route'
import tenantRoutes from './tenant.route'
import userRoutes from './user.route'

const router: RouterType = Router()

// Auth routes
router.use('/auth', authRoutes)

// Passkey routes
router.use('/passkey', passkeyRoutes)

// Authenticator routes
router.use('/authenticator', authenticatorRoutes)

// Role routes
router.use('/roles', roleRoutes)

// Tenant routes
router.use('/tenants', tenantRoutes)

// User routes
router.use('/users', userRoutes)

// Account routes
router.use('/accounts', accountRoutes)

// Chart of Accounts routes
router.use('/chart-of-accounts', chartOfAccountRoutes)

// Journal Entry routes
router.use('/journal-entries', journalEntryRoutes)

// Tax routes
router.use('/taxes', taxRoutes)

// Tax Group routes
router.use('/tax-groups', taxGroupRoutes)

// Tax Exemption routes
router.use('/tax-exemptions', taxExemptionRoutes)

// Audit log routes
router.use('/audit-logs', auditRoutes)

export default router
