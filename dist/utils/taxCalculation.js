"use strict";
/**
 * Enhanced Tax Calculation Utilities
 * Provides utilities for calculating taxes with groups and exemptions
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateTaxWithGroupId = exports.calculateTaxWithTaxIds = exports.calculateTaxWithGroupAndExemptions = exports.calculateTaxWithExemptions = void 0;
const taxExemption_queries_1 = require("../queries/taxExemption.queries");
const tenantQuery_1 = require("./tenantQuery");
/**
 * Calculate tax with exemptions
 * @param amount - Base amount
 * @param taxes - Array of taxes to apply
 * @param contactId - Contact ID to check exemptions for (optional)
 * @param tenantId - Tenant ID
 * @param schemaName - Tenant schema name
 * @returns Tax calculation result
 */
const calculateTaxWithExemptions = async (amount, taxes, contactId, tenantId, schemaName) => {
    let currentAmount = amount;
    let totalTax = 0;
    const taxBreakdown = [];
    // Process each tax
    for (const tax of taxes) {
        // Check if contact is exempt from this tax
        let isExempt = false;
        if (contactId) {
            isExempt = await (0, taxExemption_queries_1.isContactExemptFromTax)(tenantId, schemaName, contactId, tax.id);
        }
        if (!isExempt) {
            // Calculate tax amount
            const taxAmount = tax.calculateTax(currentAmount);
            totalTax += taxAmount;
            taxBreakdown.push({
                taxId: tax.id,
                taxName: tax.name,
                taxType: tax.type,
                taxRate: tax.rate,
                taxAmount,
                isExempt: false,
            });
            // For compound taxes, add tax to base for next calculation
            if (tax.type === "compound") {
                currentAmount += taxAmount;
            }
        }
        else {
            taxBreakdown.push({
                taxId: tax.id,
                taxName: tax.name,
                taxType: tax.type,
                taxRate: tax.rate,
                taxAmount: 0,
                isExempt: true,
            });
        }
    }
    const totalAmount = amount + totalTax;
    const effectiveRate = amount > 0 ? (totalTax / amount) * 100 : 0;
    return {
        baseAmount: amount,
        taxAmount: totalTax,
        totalAmount,
        effectiveRate: Number(effectiveRate.toFixed(2)),
        taxBreakdown,
    };
};
exports.calculateTaxWithExemptions = calculateTaxWithExemptions;
/**
 * Calculate tax with tax group and exemptions
 * @param amount - Base amount
 * @param taxGroup - Tax group to use
 * @param contactId - Contact ID to check exemptions for (optional)
 * @param tenantId - Tenant ID
 * @param schemaName - Tenant schema name
 * @returns Tax calculation result
 */
const calculateTaxWithGroupAndExemptions = async (amount, taxGroup, contactId, tenantId, schemaName) => {
    if (!taxGroup.taxes || taxGroup.taxes.length === 0) {
        return {
            baseAmount: amount,
            taxAmount: 0,
            totalAmount: amount,
            effectiveRate: 0,
            taxBreakdown: [],
        };
    }
    return (0, exports.calculateTaxWithExemptions)(amount, taxGroup.taxes, contactId, tenantId, schemaName);
};
exports.calculateTaxWithGroupAndExemptions = calculateTaxWithGroupAndExemptions;
/**
 * Calculate tax with individual taxes and exemptions
 * @param amount - Base amount
 * @param taxIds - Array of tax IDs to apply
 * @param contactId - Contact ID to check exemptions for (optional)
 * @param tenantId - Tenant ID
 * @param schemaName - Tenant schema name
 * @returns Tax calculation result
 */
const calculateTaxWithTaxIds = async (amount, taxIds, contactId, tenantId, schemaName) => {
    return (0, tenantQuery_1.withTenantSchema)(schemaName, async (trx) => {
        const { Tax } = await Promise.resolve().then(() => __importStar(require("../models/Tax")));
        // Fetch taxes
        const taxes = await Tax.query(trx)
            .modify("notDeleted")
            .modify("byTenant", tenantId)
            .modify("active")
            .whereIn("id", taxIds)
            .orderBy("type", "asc"); // Order by type for proper compound tax calculation
        if (taxes.length !== taxIds.length) {
            throw new Error("One or more tax IDs are invalid");
        }
        return (0, exports.calculateTaxWithExemptions)(amount, taxes, contactId, tenantId, schemaName);
    });
};
exports.calculateTaxWithTaxIds = calculateTaxWithTaxIds;
/**
 * Calculate tax with tax group ID and exemptions
 * @param amount - Base amount
 * @param taxGroupId - Tax group ID to use
 * @param contactId - Contact ID to check exemptions for (optional)
 * @param tenantId - Tenant ID
 * @param schemaName - Tenant schema name
 * @returns Tax calculation result
 */
const calculateTaxWithGroupId = async (amount, taxGroupId, contactId, tenantId, schemaName) => {
    const { findTaxGroupById } = await Promise.resolve().then(() => __importStar(require("../queries/taxGroup.queries")));
    const taxGroup = await findTaxGroupById(tenantId, schemaName, taxGroupId);
    return (0, exports.calculateTaxWithGroupAndExemptions)(amount, taxGroup, contactId, tenantId, schemaName);
};
exports.calculateTaxWithGroupId = calculateTaxWithGroupId;
