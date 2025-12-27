"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaxGroup = void 0;
const objection_1 = require("objection");
const BaseModel_1 = require("./BaseModel");
const Tax_1 = require("./Tax");
/**
 * TaxGroup Model
 * Represents a tax group that combines multiple taxes
 * Example: "GST + PST" group combining 5% GST and 7% PST
 */
class TaxGroup extends BaseModel_1.BaseModel {
    static get tableName() {
        return "tax_groups";
    }
    // JSON Schema
    static get jsonSchema() {
        return {
            type: "object",
            required: ["tenantId", "createdBy", "name"],
            properties: {
                id: { type: "string", format: "uuid" },
                tenantId: { type: "string", format: "uuid" },
                createdBy: { type: "string", format: "uuid" },
                name: { type: "string", minLength: 1, maxLength: 255 },
                description: { type: ["string", "null"], maxLength: 1000 },
                isActive: { type: "boolean", default: true },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
                deletedAt: { type: ["string", "null"], format: "date-time" },
            },
        };
    }
    // Query modifiers
    static get modifiers() {
        return {
            ...super.modifiers,
            active(query) {
                query.where("is_active", true);
            },
            byTenant(query, tenantId) {
                query.where("tenant_id", tenantId);
            },
        };
    }
    // Relations
    static get relationMappings() {
        return {
            taxes: {
                relation: objection_1.Model.ManyToManyRelation,
                modelClass: Tax_1.Tax,
                join: {
                    from: "tax_groups.id",
                    through: {
                        from: "tax_group_taxes.tax_group_id",
                        to: "tax_group_taxes.tax_id",
                        extra: ["order_index"],
                    },
                    to: "taxes.id",
                },
                modify: (query) => {
                    query
                        .whereNull("taxes.deleted_at")
                        .whereNull("tax_group_taxes.deleted_at")
                        .orderBy("tax_group_taxes.order_index", "asc");
                },
            },
        };
    }
    /**
     * Calculate total tax amount from base amount for all taxes in group
     * Handles compound taxes correctly (tax on tax)
     * @param amount - Base amount to calculate tax on
     * @returns Total tax amount
     */
    calculateTax(amount) {
        if (!this.taxes || this.taxes.length === 0) {
            return 0;
        }
        let currentAmount = amount;
        let totalTax = 0;
        // Process taxes in order (important for compound taxes)
        for (const tax of this.taxes) {
            const taxAmount = tax.calculateTax(currentAmount);
            totalTax += taxAmount;
            // For compound taxes, add tax to base for next calculation
            if (tax.type === "compound") {
                currentAmount += taxAmount;
            }
        }
        return totalTax;
    }
    /**
     * Get amount with tax included
     * @param amount - Base amount
     * @returns Amount including all taxes in group
     */
    getAmountWithTax(amount) {
        return amount + this.calculateTax(amount);
    }
    /**
     * Get effective tax rate (combined rate of all taxes in group)
     * @returns Effective tax rate as percentage
     */
    getEffectiveRate() {
        if (!this.taxes || this.taxes.length === 0) {
            return 0;
        }
        // For simple case (no compound taxes), sum the rates
        const hasCompound = this.taxes.some((tax) => tax.type === "compound");
        if (!hasCompound) {
            return this.taxes.reduce((sum, tax) => sum + tax.rate, 0);
        }
        // For compound taxes, calculate effective rate from a sample amount
        const sampleAmount = 1000;
        const taxAmount = this.calculateTax(sampleAmount);
        return (taxAmount / sampleAmount) * 100;
    }
}
exports.TaxGroup = TaxGroup;
