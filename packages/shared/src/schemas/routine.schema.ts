import { z } from 'zod';
import { RoutineStepCategorySchema } from './product.schema.js';

export const RoutineComplexitySchema = z.enum(['MINIMAL', 'ESSENTIAL', 'ADVANCED']);

export const RoutineStepSchema = z.object({
  stepId: z.string().min(1),
  order: z.number().int().nonnegative(),
  category: RoutineStepCategorySchema,
  name: z.string().min(1),
  productId: z.string().optional(),
  customInstructions: z.string().optional(),
  isActive: z.boolean(),
  frequencyDaysPerWeek: z.number().int().min(1).max(7).optional(),
  scheduledDays: z.array(z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])).optional()
});

export const RoutineSchema = z.object({
  routineId: z.string().min(1),
  userId: z.string().min(1),
  version: z.number().int().positive(),
  complexity: RoutineComplexitySchema,
  morningSteps: z.array(RoutineStepSchema),
  eveningSteps: z.array(RoutineStepSchema),
  updatedAt: z.string().datetime()
});

export const DailyRoutineLogSchema = z.object({
  logId: z.string().min(1),
  userId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  morningCompleted: z.boolean(),
  eveningCompleted: z.boolean(),
  morningSteps: z.array(z.object({
    stepId: z.string(),
    completed: z.boolean(),
    completedAt: z.string().datetime().optional(),
    skippedReason: z.string().optional()
  })),
  eveningSteps: z.array(z.object({
    stepId: z.string(),
    completed: z.boolean(),
    completedAt: z.string().datetime().optional(),
    skippedReason: z.string().optional()
  })),
  userReportedDrynessOrOiliness: z.enum(['normal', 'dry', 'oily', 'combination']).optional(),
  userReportedIrritation: z.boolean().optional(),
  notes: z.string().optional()
});
