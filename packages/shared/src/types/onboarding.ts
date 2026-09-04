/**
 * Onboarding State Machine Types & Schema
 * Value-First Architecture: Pre-scan value -> Guided scan -> WOW Snapshot -> Progressive Personalization
 */

import { z } from 'zod';

export type OnboardingStep =
  | 'WELCOME'
  | 'AGE_GATE'
  | 'GOALS'
  | 'PHOTO_PRIVACY'
  | 'GUIDED_SCAN'
  | 'WOW_SNAPSHOT'
  | 'SKIN_FEEL'
  | 'SENSITIVITY'
  | 'CURRENT_ACTIVES'
  | 'KNOWN_REACTIONS'
  | 'EXISTING_ROUTINE'
  | 'SHELF_CAPTURE_PROMPT'
  | 'DESIRED_COMPLEXITY'
  | 'TIME_COMMITMENT'
  | 'SUNSCREEN_HABIT'
  | 'BUDGET_PREFERENCE'
  | 'PRODUCT_PREFERENCES'
  | 'COUNTRY_SELECT'
  | 'PRIMARY_MOTIVATION'
  | 'PLAN_GENERATION'
  | 'COMPLETED';

export type PrimaryGoalOption =
  | 'fewer_visible_breakouts'
  | 'calmer_looking_redness'
  | 'smoother_looking_texture'
  | 'less_noticeable_pores'
  | 'more_even_looking_tone'
  | 'more_hydration_less_dryness'
  | 'less_shine_oiliness'
  | 'dark_circle_appearance'
  | 'fine_line_appearance'
  | 'unsure_help_me_decide';

export type PhotoStorageChoice = 'save_progress_photos' | 'delete_after_analysis';

export type SkinFeelOption =
  | 'tight_or_dry'
  | 'oily_or_shiny'
  | 'combination_dry_and_oily'
  | 'comfortable_balanced'
  | 'changes_a_lot'
  | 'unsure';

export type SensitivityLevelOption =
  | 'almost_never'
  | 'occasionally'
  | 'sometimes'
  | 'often'
  | 'very_easily'
  | 'unsure';

export type CurrentActiveOption =
  | 'retinoid'
  | 'exfoliating_acids'
  | 'benzoyl_peroxide'
  | 'acne_treatment'
  | 'vitamin_c'
  | 'prescription_treatment'
  | 'unsure_of_ingredients'
  | 'none';

export type ExistingRoutineOption =
  | 'nothing_yet'
  | 'simple'
  | 'regular'
  | 'advanced'
  | 'unsure';

export type ShelfScanChoice =
  | 'scan_products'
  | 'search_manually'
  | 'later';

export type DesiredComplexityOption =
  | 'minimal'
  | 'balanced'
  | 'more_steps'
  | 'coach_decides';

export type TimeCommitmentOption =
  | 'about_2_minutes'
  | 'about_5_minutes'
  | 'ten_plus_minutes'
  | 'best_simple_routine';

export type SunscreenHabitOption =
  | 'every_day'
  | 'most_days'
  | 'mostly_sunny_days'
  | 'rarely'
  | 'never'
  | 'unsure';

export type BudgetPreferenceOption =
  | 'budget_under_15'
  | 'mid_range_15_30'
  | 'premium_30_60'
  | 'price_not_important'
  | 'best_value';

export type ProductAvoidanceOption =
  | 'fragrance'
  | 'essential_oils'
  | 'heavy_feeling'
  | 'very_expensive'
  | 'complicated_routines'
  | 'nothing_specific'
  | 'unsure';

export type PrimaryMotivationOption =
  | 'keep_it_simple'
  | 'see_visible_progress'
  | 'understand_my_skin'
  | 'find_right_products'
  | 'all_of_the_above';

export interface OnboardingStateV1 {
  version: 1;
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  isAdult18Plus?: boolean;
  selectedGoals: PrimaryGoalOption[]; // Max 2
  photoStoragePreference?: PhotoStorageChoice;
  skinFeelByEndOfDay?: SkinFeelOption;
  sensitivityLevel?: SensitivityLevelOption;
  currentActives: CurrentActiveOption[];
  knownReactions: {
    hasKnownReactions: boolean;
    userReportedAllergies: string[];
    userReportedSensitivities: string[];
  };
  existingRoutineTier?: ExistingRoutineOption;
  shelfScanChoice?: ShelfScanChoice;
  desiredComplexity?: DesiredComplexityOption;
  timeCommitment?: TimeCommitmentOption;
  sunscreenHabit?: SunscreenHabitOption;
  budgetPreference?: BudgetPreferenceOption;
  productPreferencesToAvoid: ProductAvoidanceOption[];
  countryCode?: string;
  primaryMotivation?: PrimaryMotivationOption;
  completedAt?: string;
}

export const OnboardingStateV1Schema = z.object({
  version: z.literal(1),
  currentStep: z.string(),
  completedSteps: z.array(z.string()),
  isAdult18Plus: z.boolean().optional(),
  selectedGoals: z.array(z.string()).max(2),
  photoStoragePreference: z.enum(['save_progress_photos', 'delete_after_analysis']).optional(),
  skinFeelByEndOfDay: z.string().optional(),
  sensitivityLevel: z.string().optional(),
  currentActives: z.array(z.string()),
  knownReactions: z.object({
    hasKnownReactions: z.boolean(),
    userReportedAllergies: z.array(z.string()),
    userReportedSensitivities: z.array(z.string())
  }),
  existingRoutineTier: z.string().optional(),
  shelfScanChoice: z.string().optional(),
  desiredComplexity: z.string().optional(),
  timeCommitment: z.string().optional(),
  sunscreenHabit: z.string().optional(),
  budgetPreference: z.string().optional(),
  productPreferencesToAvoid: z.array(z.string()),
  countryCode: z.string().optional(),
  primaryMotivation: z.string().optional(),
  completedAt: z.string().optional()
});
