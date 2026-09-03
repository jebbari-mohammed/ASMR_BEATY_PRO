import { z } from 'zod';

export const StructuredCoachResponseSchema = z.object({
  intent: z.string().min(1),
  summary: z.string().min(1),
  candidateProductIds: z.array(z.string()).optional(),
  routineAdjustmentSuggestions: z.array(z.object({
    stepId: z.string(),
    order: z.number(),
    category: z.string(),
    name: z.string(),
    productId: z.string().optional(),
    customInstructions: z.string().optional(),
    isActive: z.boolean()
  })).optional(),
  reasonCodes: z.array(z.string()),
  riskFlags: z.array(z.string()),
  requiresHumanCareSuggestion: z.boolean(),
  messageToUser: z.string().min(1)
});

export const CoachMessageSchema = z.object({
  messageId: z.string().uuid(),
  conversationId: z.string().min(1),
  sender: z.enum(['user', 'coach', 'system']),
  content: z.string().min(1),
  timestamp: z.string().datetime(),
  structuredResponse: StructuredCoachResponseSchema.optional()
});
