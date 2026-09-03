"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoachMessageSchema = exports.StructuredCoachResponseSchema = void 0;
const zod_1 = require("zod");
exports.StructuredCoachResponseSchema = zod_1.z.object({
    intent: zod_1.z.string().min(1),
    summary: zod_1.z.string().min(1),
    candidateProductIds: zod_1.z.array(zod_1.z.string()).optional(),
    routineAdjustmentSuggestions: zod_1.z.array(zod_1.z.object({
        stepId: zod_1.z.string(),
        order: zod_1.z.number(),
        category: zod_1.z.string(),
        name: zod_1.z.string(),
        productId: zod_1.z.string().optional(),
        customInstructions: zod_1.z.string().optional(),
        isActive: zod_1.z.boolean()
    })).optional(),
    reasonCodes: zod_1.z.array(zod_1.z.string()),
    riskFlags: zod_1.z.array(zod_1.z.string()),
    requiresHumanCareSuggestion: zod_1.z.boolean(),
    messageToUser: zod_1.z.string().min(1)
});
exports.CoachMessageSchema = zod_1.z.object({
    messageId: zod_1.z.string().uuid(),
    conversationId: zod_1.z.string().min(1),
    sender: zod_1.z.enum(['user', 'coach', 'system']),
    content: zod_1.z.string().min(1),
    timestamp: zod_1.z.string().datetime(),
    structuredResponse: exports.StructuredCoachResponseSchema.optional()
});
