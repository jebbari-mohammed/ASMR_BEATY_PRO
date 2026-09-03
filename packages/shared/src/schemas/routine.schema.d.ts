import { z } from 'zod';
export declare const RoutineComplexitySchema: z.ZodEnum<["MINIMAL", "ESSENTIAL", "ADVANCED"]>;
export declare const RoutineStepSchema: z.ZodObject<{
    stepId: z.ZodString;
    order: z.ZodNumber;
    category: z.ZodEnum<["cleanse", "tone", "treat", "hydrate_moisturize", "protect_spf"]>;
    name: z.ZodString;
    productId: z.ZodOptional<z.ZodString>;
    customInstructions: z.ZodOptional<z.ZodString>;
    isActive: z.ZodBoolean;
    frequencyDaysPerWeek: z.ZodOptional<z.ZodNumber>;
    scheduledDays: z.ZodOptional<z.ZodArray<z.ZodEnum<["mon", "tue", "wed", "thu", "fri", "sat", "sun"]>, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    category: "cleanse" | "tone" | "treat" | "hydrate_moisturize" | "protect_spf";
    stepId: string;
    order: number;
    isActive: boolean;
    productId?: string | undefined;
    customInstructions?: string | undefined;
    frequencyDaysPerWeek?: number | undefined;
    scheduledDays?: ("mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun")[] | undefined;
}, {
    name: string;
    category: "cleanse" | "tone" | "treat" | "hydrate_moisturize" | "protect_spf";
    stepId: string;
    order: number;
    isActive: boolean;
    productId?: string | undefined;
    customInstructions?: string | undefined;
    frequencyDaysPerWeek?: number | undefined;
    scheduledDays?: ("mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun")[] | undefined;
}>;
export declare const RoutineSchema: z.ZodObject<{
    routineId: z.ZodString;
    userId: z.ZodString;
    version: z.ZodNumber;
    complexity: z.ZodEnum<["MINIMAL", "ESSENTIAL", "ADVANCED"]>;
    morningSteps: z.ZodArray<z.ZodObject<{
        stepId: z.ZodString;
        order: z.ZodNumber;
        category: z.ZodEnum<["cleanse", "tone", "treat", "hydrate_moisturize", "protect_spf"]>;
        name: z.ZodString;
        productId: z.ZodOptional<z.ZodString>;
        customInstructions: z.ZodOptional<z.ZodString>;
        isActive: z.ZodBoolean;
        frequencyDaysPerWeek: z.ZodOptional<z.ZodNumber>;
        scheduledDays: z.ZodOptional<z.ZodArray<z.ZodEnum<["mon", "tue", "wed", "thu", "fri", "sat", "sun"]>, "many">>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        category: "cleanse" | "tone" | "treat" | "hydrate_moisturize" | "protect_spf";
        stepId: string;
        order: number;
        isActive: boolean;
        productId?: string | undefined;
        customInstructions?: string | undefined;
        frequencyDaysPerWeek?: number | undefined;
        scheduledDays?: ("mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun")[] | undefined;
    }, {
        name: string;
        category: "cleanse" | "tone" | "treat" | "hydrate_moisturize" | "protect_spf";
        stepId: string;
        order: number;
        isActive: boolean;
        productId?: string | undefined;
        customInstructions?: string | undefined;
        frequencyDaysPerWeek?: number | undefined;
        scheduledDays?: ("mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun")[] | undefined;
    }>, "many">;
    eveningSteps: z.ZodArray<z.ZodObject<{
        stepId: z.ZodString;
        order: z.ZodNumber;
        category: z.ZodEnum<["cleanse", "tone", "treat", "hydrate_moisturize", "protect_spf"]>;
        name: z.ZodString;
        productId: z.ZodOptional<z.ZodString>;
        customInstructions: z.ZodOptional<z.ZodString>;
        isActive: z.ZodBoolean;
        frequencyDaysPerWeek: z.ZodOptional<z.ZodNumber>;
        scheduledDays: z.ZodOptional<z.ZodArray<z.ZodEnum<["mon", "tue", "wed", "thu", "fri", "sat", "sun"]>, "many">>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        category: "cleanse" | "tone" | "treat" | "hydrate_moisturize" | "protect_spf";
        stepId: string;
        order: number;
        isActive: boolean;
        productId?: string | undefined;
        customInstructions?: string | undefined;
        frequencyDaysPerWeek?: number | undefined;
        scheduledDays?: ("mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun")[] | undefined;
    }, {
        name: string;
        category: "cleanse" | "tone" | "treat" | "hydrate_moisturize" | "protect_spf";
        stepId: string;
        order: number;
        isActive: boolean;
        productId?: string | undefined;
        customInstructions?: string | undefined;
        frequencyDaysPerWeek?: number | undefined;
        scheduledDays?: ("mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun")[] | undefined;
    }>, "many">;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    userId: string;
    updatedAt: string;
    routineId: string;
    version: number;
    complexity: "MINIMAL" | "ESSENTIAL" | "ADVANCED";
    morningSteps: {
        name: string;
        category: "cleanse" | "tone" | "treat" | "hydrate_moisturize" | "protect_spf";
        stepId: string;
        order: number;
        isActive: boolean;
        productId?: string | undefined;
        customInstructions?: string | undefined;
        frequencyDaysPerWeek?: number | undefined;
        scheduledDays?: ("mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun")[] | undefined;
    }[];
    eveningSteps: {
        name: string;
        category: "cleanse" | "tone" | "treat" | "hydrate_moisturize" | "protect_spf";
        stepId: string;
        order: number;
        isActive: boolean;
        productId?: string | undefined;
        customInstructions?: string | undefined;
        frequencyDaysPerWeek?: number | undefined;
        scheduledDays?: ("mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun")[] | undefined;
    }[];
}, {
    userId: string;
    updatedAt: string;
    routineId: string;
    version: number;
    complexity: "MINIMAL" | "ESSENTIAL" | "ADVANCED";
    morningSteps: {
        name: string;
        category: "cleanse" | "tone" | "treat" | "hydrate_moisturize" | "protect_spf";
        stepId: string;
        order: number;
        isActive: boolean;
        productId?: string | undefined;
        customInstructions?: string | undefined;
        frequencyDaysPerWeek?: number | undefined;
        scheduledDays?: ("mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun")[] | undefined;
    }[];
    eveningSteps: {
        name: string;
        category: "cleanse" | "tone" | "treat" | "hydrate_moisturize" | "protect_spf";
        stepId: string;
        order: number;
        isActive: boolean;
        productId?: string | undefined;
        customInstructions?: string | undefined;
        frequencyDaysPerWeek?: number | undefined;
        scheduledDays?: ("mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun")[] | undefined;
    }[];
}>;
export declare const DailyRoutineLogSchema: z.ZodObject<{
    logId: z.ZodString;
    userId: z.ZodString;
    date: z.ZodString;
    morningCompleted: z.ZodBoolean;
    eveningCompleted: z.ZodBoolean;
    morningSteps: z.ZodArray<z.ZodObject<{
        stepId: z.ZodString;
        completed: z.ZodBoolean;
        completedAt: z.ZodOptional<z.ZodString>;
        skippedReason: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        stepId: string;
        completed: boolean;
        completedAt?: string | undefined;
        skippedReason?: string | undefined;
    }, {
        stepId: string;
        completed: boolean;
        completedAt?: string | undefined;
        skippedReason?: string | undefined;
    }>, "many">;
    eveningSteps: z.ZodArray<z.ZodObject<{
        stepId: z.ZodString;
        completed: z.ZodBoolean;
        completedAt: z.ZodOptional<z.ZodString>;
        skippedReason: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        stepId: string;
        completed: boolean;
        completedAt?: string | undefined;
        skippedReason?: string | undefined;
    }, {
        stepId: string;
        completed: boolean;
        completedAt?: string | undefined;
        skippedReason?: string | undefined;
    }>, "many">;
    userReportedDrynessOrOiliness: z.ZodOptional<z.ZodEnum<["normal", "dry", "oily", "combination"]>>;
    userReportedIrritation: z.ZodOptional<z.ZodBoolean>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    date: string;
    userId: string;
    morningSteps: {
        stepId: string;
        completed: boolean;
        completedAt?: string | undefined;
        skippedReason?: string | undefined;
    }[];
    eveningSteps: {
        stepId: string;
        completed: boolean;
        completedAt?: string | undefined;
        skippedReason?: string | undefined;
    }[];
    logId: string;
    morningCompleted: boolean;
    eveningCompleted: boolean;
    userReportedDrynessOrOiliness?: "normal" | "dry" | "oily" | "combination" | undefined;
    userReportedIrritation?: boolean | undefined;
    notes?: string | undefined;
}, {
    date: string;
    userId: string;
    morningSteps: {
        stepId: string;
        completed: boolean;
        completedAt?: string | undefined;
        skippedReason?: string | undefined;
    }[];
    eveningSteps: {
        stepId: string;
        completed: boolean;
        completedAt?: string | undefined;
        skippedReason?: string | undefined;
    }[];
    logId: string;
    morningCompleted: boolean;
    eveningCompleted: boolean;
    userReportedDrynessOrOiliness?: "normal" | "dry" | "oily" | "combination" | undefined;
    userReportedIrritation?: boolean | undefined;
    notes?: string | undefined;
}>;
//# sourceMappingURL=routine.schema.d.ts.map