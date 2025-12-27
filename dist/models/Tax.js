"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tax = exports.TaxType = void 0;
const BaseModel_1 = require("./BaseModel");
var TaxType;
(function (TaxType) {
    TaxType["NORMAL"] = "normal";
    TaxType["COMPOUND"] = "compound";
    TaxType["WITHHOLDING"] = "withholding";
})(TaxType || (exports.TaxType = TaxType = {}));
/**
 * Tax Model
 * Represents a tax rate configuration in tenant-specific schema
 * Supports normal, compound, and withholding tax types
 */
class Tax extends BaseModel_1.BaseModel {
    static get tableName() {
        return "taxes";
    }
    // JSON Schema
    static get jsonSchema() {
        return {
            type: "object",
            required: ["tenantId", "createdBy", "name", "type", "rate"],
            properties: {
                id: { type: "string", format: "uuid" },
                tenantId: { type: "string", format: "uuid" },
                createdBy: { type: "string", format: "uuid" },
                name: { type: "string", minLength: 1, maxLength: 255 },
                type: {
                    type: "string",
                    enum: ["normal", "compound", "withholding"],
                    default: "normal",
                },
                rate: { type: "number", minimum: 0, maximum: 100 },
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
            byType(query, type) {
                query.where("type", type);
            },
        };
    }
    /**
     * Calculate tax amount from base amount
     * @param amount - Base amount to calculate tax on
     * @returns Tax amount
     */
    calculateTax(amount) {
        return (amount * this.rate) / 100;
    }
    /**
     * Get amount with tax included
     * @param amount - Base amount
     * @returns Amount including tax
     */
    getAmountWithTax(amount) {
        return amount + this.calculateTax(amount);
    }
    /**
     * Get amount without tax (reverse calculation)
     * @param amountWithTax - Amount that includes tax
     * @returns Base amount without tax
     */
    getAmountWithoutTax(amountWithTax) {
        return amountWithTax / (1 + this.rate / 100);
    }
}
exports.Tax = Tax;
