/**
 * Onboarding State Machine & Persistence Service
 * Value-First Architecture with SecureStore persistence, resume capability, and schema validation.
 */

import * as SecureStore from 'expo-secure-store';
import {
  OnboardingStep,
  OnboardingStateV1,
  OnboardingStateV1Schema,
  PrimaryGoalOption,
  PhotoStorageChoice,
  SkinFeelOption,
  SensitivityLevelOption,
  CurrentActiveOption,
  ExistingRoutineOption,
  ShelfScanChoice,
  DesiredComplexityOption,
  TimeCommitmentOption,
  SunscreenHabitOption,
  BudgetPreferenceOption,
  ProductAvoidanceOption,
  PrimaryMotivationOption
} from '@asmr/shared';

const STORAGE_KEY = '@asmr_onboarding_state_v1';
const COMPLETED_FLAG_KEY = '@asmr_onboarding_completed';

export const INITIAL_ONBOARDING_STATE: OnboardingStateV1 = {
  version: 1,
  currentStep: 'WELCOME',
  completedSteps: [],
  selectedGoals: [],
  currentActives: [],
  knownReactions: {
    hasKnownReactions: false,
    userReportedAllergies: [],
    userReportedSensitivities: []
  },
  productPreferencesToAvoid: []
};

// Analytics event logger (can plug into Firebase Analytics in production)
export function logOnboardingAnalytics(eventName: string, params?: Record<string, any>) {
  console.log(`[Onboarding Analytics] ${eventName}`, params ?? {});
}

export class OnboardingService {
  /**
   * Load saved onboarding state or return fresh initial state
   */
  static async loadState(): Promise<OnboardingStateV1> {
    try {
      const raw = await SecureStore.getItemAsync(STORAGE_KEY);
      if (!raw) return INITIAL_ONBOARDING_STATE;
      const parsed = JSON.parse(raw);
      const validated = OnboardingStateV1Schema.safeParse(parsed);
      if (validated.success) {
        return validated.data as unknown as OnboardingStateV1;
      }
      return INITIAL_ONBOARDING_STATE;
    } catch (e) {
      console.warn('[OnboardingService] Failed to load state:', e);
      return INITIAL_ONBOARDING_STATE;
    }
  }

  /**
   * Persist onboarding state to SecureStore
   */
  static async saveState(state: OnboardingStateV1): Promise<void> {
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('[OnboardingService] Failed to save state:', e);
    }
  }

  /**
   * Check if onboarding has been completed
   */
  static async isCompleted(): Promise<boolean> {
    try {
      const val = await SecureStore.getItemAsync(COMPLETED_FLAG_KEY);
      return val === 'true';
    } catch (e) {
      return false;
    }
  }

  /**
   * Mark onboarding as completed
   */
  static async markCompleted(): Promise<void> {
    try {
      await SecureStore.setItemAsync(COMPLETED_FLAG_KEY, 'true');
      logOnboardingAnalytics('onboarding_finished');
    } catch (e) {
      console.warn('[OnboardingService] Failed to mark completed:', e);
    }
  }

  /**
   * Reset onboarding for testing
   */
  static async reset(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
      await SecureStore.deleteItemAsync(COMPLETED_FLAG_KEY);
      logOnboardingAnalytics('onboarding_reset');
    } catch (e) {
      console.warn('[OnboardingService] Failed to reset:', e);
    }
  }
}
