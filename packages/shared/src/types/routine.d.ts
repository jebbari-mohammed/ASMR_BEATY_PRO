/**
 * Routine domain models: Minimal, Essential, and Advanced schedules.
 */
import { RoutineStepCategory } from './product.js';
export type RoutineComplexity = 'MINIMAL' | 'ESSENTIAL' | 'ADVANCED';
export interface RoutineStep {
    stepId: string;
    order: number;
    category: RoutineStepCategory;
    name: string;
    productId?: string;
    customInstructions?: string;
    isActive: boolean;
    frequencyDaysPerWeek?: number;
    scheduledDays?: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[];
}
export interface Routine {
    routineId: string;
    userId: string;
    version: number;
    complexity: RoutineComplexity;
    morningSteps: RoutineStep[];
    eveningSteps: RoutineStep[];
    updatedAt: string;
}
export interface RoutineLogStep {
    stepId: string;
    completed: boolean;
    completedAt?: string;
    skippedReason?: string;
}
export interface DailyRoutineLog {
    logId: string;
    userId: string;
    date: string;
    morningCompleted: boolean;
    eveningCompleted: boolean;
    morningSteps: RoutineLogStep[];
    eveningSteps: RoutineLogStep[];
    userReportedDrynessOrOiliness?: 'normal' | 'dry' | 'oily' | 'combination';
    userReportedIrritation?: boolean;
    notes?: string;
}
export interface RoutineConsistencyMetrics {
    currentStreakDays: number;
    bestStreakDays: number;
    completedRoutinesLast7Days: number;
    completionRatePercent: number;
    totalCheckIns: number;
}
//# sourceMappingURL=routine.d.ts.map