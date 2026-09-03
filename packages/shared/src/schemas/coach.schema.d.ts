import { z } from 'zod';
export declare const StructuredCoachResponseSchema: z.ZodObject<{
    intent: z.ZodString;
    summary: z.ZodString;
    candidateProductIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    routineAdjustmentSuggestions: z.ZodOptional<z.ZodArray<z.ZodObject<{
        stepId: z.ZodString;
        order: z.ZodNumber;
        category: z.ZodString;
        name: z.ZodString;
        productId: z.ZodOptional<z.ZodString>;
        customInstructions: z.ZodOptional<z.ZodString>;
        isActive: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        name: string;
        category: string;
        stepId: string;
        order: number;
        isActive: boolean;
        productId?: string | undefined;
        customInstructions?: string | undefined;
    }, {
        name: string;
        category: string;
        stepId: string;
        order: number;
        isActive: boolean;
        productId?: string | undefined;
        customInstructions?: string | undefined;
    }>, "many">>;
    reasonCodes: z.ZodArray<z.ZodString, "many">;
    riskFlags: z.ZodArray<z.ZodString, "many">;
    requiresHumanCareSuggestion: z.ZodBoolean;
    messageToUser: z.ZodString;
}, "strip", z.ZodTypeAny, {
    summary: string;
    intent: string;
    reasonCodes: string[];
    riskFlags: string[];
    requiresHumanCareSuggestion: boolean;
    messageToUser: string;
    candidateProductIds?: string[] | undefined;
    routineAdjustmentSuggestions?: {
        name: string;
        category: string;
        stepId: string;
        order: number;
        isActive: boolean;
        productId?: string | undefined;
        customInstructions?: string | undefined;
    }[] | undefined;
}, {
    summary: string;
    intent: string;
    reasonCodes: string[];
    riskFlags: string[];
    requiresHumanCareSuggestion: boolean;
    messageToUser: string;
    candidateProductIds?: string[] | undefined;
    routineAdjustmentSuggestions?: {
        name: string;
        category: string;
        stepId: string;
        order: number;
        isActive: boolean;
        productId?: string | undefined;
        customInstructions?: string | undefined;
    }[] | undefined;
}>;
export declare const CoachMessageSchema: z.ZodObject<{
    messageId: z.ZodString;
    conversationId: z.ZodString;
    sender: z.ZodEnum<["user", "coach", "system"]>;
    content: z.ZodString;
    timestamp: z.ZodString;
    structuredResponse: z.ZodOptional<z.ZodObject<{
        intent: z.ZodString;
        summary: z.ZodString;
        candidateProductIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        routineAdjustmentSuggestions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            stepId: z.ZodString;
            order: z.ZodNumber;
            category: z.ZodString;
            name: z.ZodString;
            productId: z.ZodOptional<z.ZodString>;
            customInstructions: z.ZodOptional<z.ZodString>;
            isActive: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            name: string;
            category: string;
            stepId: string;
            order: number;
            isActive: boolean;
            productId?: string | undefined;
            customInstructions?: string | undefined;
        }, {
            name: string;
            category: string;
            stepId: string;
            order: number;
            isActive: boolean;
            productId?: string | undefined;
            customInstructions?: string | undefined;
        }>, "many">>;
        reasonCodes: z.ZodArray<z.ZodString, "many">;
        riskFlags: z.ZodArray<z.ZodString, "many">;
        requiresHumanCareSuggestion: z.ZodBoolean;
        messageToUser: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        summary: string;
        intent: string;
        reasonCodes: string[];
        riskFlags: string[];
        requiresHumanCareSuggestion: boolean;
        messageToUser: string;
        candidateProductIds?: string[] | undefined;
        routineAdjustmentSuggestions?: {
            name: string;
            category: string;
            stepId: string;
            order: number;
            isActive: boolean;
            productId?: string | undefined;
            customInstructions?: string | undefined;
        }[] | undefined;
    }, {
        summary: string;
        intent: string;
        reasonCodes: string[];
        riskFlags: string[];
        requiresHumanCareSuggestion: boolean;
        messageToUser: string;
        candidateProductIds?: string[] | undefined;
        routineAdjustmentSuggestions?: {
            name: string;
            category: string;
            stepId: string;
            order: number;
            isActive: boolean;
            productId?: string | undefined;
            customInstructions?: string | undefined;
        }[] | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    messageId: string;
    conversationId: string;
    sender: "user" | "coach" | "system";
    content: string;
    timestamp: string;
    structuredResponse?: {
        summary: string;
        intent: string;
        reasonCodes: string[];
        riskFlags: string[];
        requiresHumanCareSuggestion: boolean;
        messageToUser: string;
        candidateProductIds?: string[] | undefined;
        routineAdjustmentSuggestions?: {
            name: string;
            category: string;
            stepId: string;
            order: number;
            isActive: boolean;
            productId?: string | undefined;
            customInstructions?: string | undefined;
        }[] | undefined;
    } | undefined;
}, {
    messageId: string;
    conversationId: string;
    sender: "user" | "coach" | "system";
    content: string;
    timestamp: string;
    structuredResponse?: {
        summary: string;
        intent: string;
        reasonCodes: string[];
        riskFlags: string[];
        requiresHumanCareSuggestion: boolean;
        messageToUser: string;
        candidateProductIds?: string[] | undefined;
        routineAdjustmentSuggestions?: {
            name: string;
            category: string;
            stepId: string;
            order: number;
            isActive: boolean;
            productId?: string | undefined;
            customInstructions?: string | undefined;
        }[] | undefined;
    } | undefined;
}>;
//# sourceMappingURL=coach.schema.d.ts.map