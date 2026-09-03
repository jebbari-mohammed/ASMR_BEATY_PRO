/**
 * Routine domain models: Minimal, Essential, and Advanced schedules.
 */

import { RoutineStepCategory } from './product.js';

export type RoutineComplexity = 'MINIMAL' | 'ESSENTIAL' | 'ADVANCED';

export interface RoutineStep {
  stepId: string;
  order: number;
  category: RoutineStepCategory;
  name: string; // e.g. "Gentle Hydrating Cleanser"
  productId?: string; // Optional: user may use a general step without specific product
  customInstructions?: string; // e.g. "Use pea-sized amount, 3x per week"
  isActive: boolean;
  frequencyDaysPerWeek?: number; // default 7
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
  date: string; // YYYY-MM-DD
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
