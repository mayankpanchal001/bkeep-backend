"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaxGroupTax = void 0;
const BaseModel_1 = require("./BaseModel");
/**
 * TaxGroupTax Model
 * Junction table model for tax_group_taxes
 * Represents the relationship between a tax group and a tax
 */
class TaxGroupTax extends BaseModel_1.BaseModel {
    static get tableName() {
        return "tax_group_taxes";
    }
    // JSON Schema
    static get jsonSchema() {
        return {
            type: "object",
            required: ["taxGroupId", "taxId", "orderIndex"],
            properties: {
                id: { type: "string", format: "uuid" },
                taxGroupId: { type: "string", format: "uuid" },
                taxId: { type: "string", format: "uuid" },
                orderIndex: { type: "number", minimum: 0 },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
                deletedAt: { type: ["string", "null"], format: "date-time" },
            },
        };
    }
}
exports.TaxGroupTax = TaxGroupTax;
