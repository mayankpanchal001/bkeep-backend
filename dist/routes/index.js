"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const account_route_1 = __importDefault(require("./account.route"));
const audit_route_1 = __importDefault(require("./audit.route"));
const auth_route_1 = __importDefault(require("./auth.route"));
const authenticator_route_1 = __importDefault(require("./authenticator.route"));
const chartOfAccount_route_1 = __importDefault(require("./chartOfAccount.route"));
const journalEntry_route_1 = __importDefault(require("./journalEntry.route"));
const passkey_route_1 = __importDefault(require("./passkey.route"));
const role_route_1 = __importDefault(require("./role.route"));
const tax_route_1 = __importDefault(require("./tax.route"));
const taxExemption_route_1 = __importDefault(require("./taxExemption.route"));
const taxGroup_route_1 = __importDefault(require("./taxGroup.route"));
const tenant_route_1 = __importDefault(require("./tenant.route"));
const user_route_1 = __importDefault(require("./user.route"));
const router = (0, express_1.Router)();
// Auth routes
router.use("/auth", auth_route_1.default);
// Passkey routes
router.use("/passkey", passkey_route_1.default);
// Authenticator routes
router.use("/authenticator", authenticator_route_1.default);
// Role routes
router.use("/roles", role_route_1.default);
// Tenant routes
router.use("/tenants", tenant_route_1.default);
// User routes
router.use("/users", user_route_1.default);
// Account routes
router.use("/accounts", account_route_1.default);
// Chart of Accounts routes
router.use("/chart-of-accounts", chartOfAccount_route_1.default);
// Journal Entry routes
router.use("/journal-entries", journalEntry_route_1.default);
// Tax routes
router.use("/taxes", tax_route_1.default);
// Tax Group routes
router.use("/tax-groups", taxGroup_route_1.default);
// Tax Exemption routes
router.use("/tax-exemptions", taxExemption_route_1.default);
// Audit log routes
router.use("/audit-logs", audit_route_1.default);
exports.default = router;
