"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DailyRoutineLogSchema = exports.RoutineSchema = exports.RoutineStepSchema = exports.RoutineComplexitySchema = void 0;
const zod_1 = require("zod");
const product_schema_js_1 = require("./product.schema.js");
exports.RoutineComplexitySchema = zod_1.z.enum(['MINIMAL', 'ESSENTIAL', 'ADVANCED']);
exports.RoutineStepSchema = zod_1.z.object({
    stepId: zod_1.z.string().min(1),
    order: zod_1.z.number().int().nonnegative(),
    category: product_schema_js_1.RoutineStepCategorySchema,
    name: zod_1.z.string().min(1),
    productId: zod_1.z.string().optional(),
    customInstructions: zod_1.z.string().optional(),
    isActive: zod_1.z.boolean(),
    frequencyDaysPerWeek: zod_1.z.number().int().min(1).max(7).optional(),
    scheduledDays: zod_1.z.array(zod_1.z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])).optional()
});
exports.RoutineSchema = zod_1.z.object({
    routineId: zod_1.z.string().min(1),
    userId: zod_1.z.string().min(1),
    version: zod_1.z.number().int().positive(),
    complexity: exports.RoutineComplexitySchema,
    morningSteps: zod_1.z.array(exports.RoutineStepSchema),
    eveningSteps: zod_1.z.array(exports.RoutineStepSchema),
    updatedAt: zod_1.z.string().datetime()
});
exports.DailyRoutineLogSchema = zod_1.z.object({
    logId: zod_1.z.string().min(1),
    userId: zod_1.z.string().min(1),
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    morningCompleted: zod_1.z.boolean(),
    eveningCompleted: zod_1.z.boolean(),
    morningSteps: zod_1.z.array(zod_1.z.object({
        stepId: zod_1.z.string(),
        completed: zod_1.z.boolean(),
        completedAt: zod_1.z.string().datetime().optional(),
        skippedReason: zod_1.z.string().optional()
    })),
    eveningSteps: zod_1.z.array(zod_1.z.object({
        stepId: zod_1.z.string(),
        completed: zod_1.z.boolean(),
        completedAt: zod_1.z.string().datetime().optional(),
        skippedReason: zod_1.z.string().optional()
    })),
    userReportedDrynessOrOiliness: zod_1.z.enum(['normal', 'dry', 'oily', 'combination']).optional(),
    userReportedIrritation: zod_1.z.boolean().optional(),
    notes: zod_1.z.string().optional()
});
