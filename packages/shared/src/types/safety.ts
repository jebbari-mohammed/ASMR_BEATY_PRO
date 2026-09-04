/**
 * Safety engine, allergen matching, conflict matrices, and out-of-scope escalation types.
 */

import { ActiveCategory, RoutineStepCategory } from './product.js';

export interface AllergenRule {
  allergenId: string;
  name: string;
  matchedIngredients: string[]; // lowercase partial/exact INCI matches
}

export interface IncompatibleActivePair {
  activeA: ActiveCategory;
  activeB: ActiveCategory;
  reason: string;
  severity: 'forbidden_same_routine' | 'alternate_nights_only' | 'caution_dryness';
}

export interface SafetyPolicy {
  policyVersion: string;
  reviewedBy: string; // e.g. "Clinical Safety Review V1"
  effectiveDate: string;
  maxNewActivesIntroducedPerMonth: number; // default 1
  disallowedSimultaneousActives: IncompatibleActivePair[];
  highRiskSymptomsKeywords: string[];
  sensitiveSkinForbiddenIngredients: string[];
}

export interface SafetyEvaluationInput {
  userId: string;
  userPerceivedSkinType: 'dry' | 'oily' | 'combination' | 'normal' | 'sensitive';
  knownAllergies: string[];
  reportedSensitivities: string[];
  currentRoutineSteps: {
    category: RoutineStepCategory;
    activeCategories: ActiveCategory[];
    inciIngredients: string[];
  }[];
  recentIrritationReported: boolean;
  sensitivityLevel?: 'almost_never' | 'occasionally' | 'sometimes' | 'often' | 'very_easily' | 'unsure';
  userReportedAllergy?: string[];
  userReportedSensitivity?: string[];
  budgetPreference?: string;
  productPreferencesToAvoid?: string[];
  userReportedSymptoms?: string[]; // check for emergency/medical escalations
  candidateProduct: {
    productId: string;
    brand: string;
    name: string;
    category: string;
    routineStep: RoutineStepCategory;
    activeCategories: ActiveCategory[];
    inciIngredients: string[];
    fragranceStatus: string;
    safetyReviewStatus: string;
    catalogStatus: string;
  };
}

export interface SafetyCheckResult {
  isSafeToRecommend: boolean;
  rejectionReasons: string[];
  requiresProfessionalEscalation: boolean;
  escalationMessage?: string;
  auditTrail: {
    policyVersion: string;
    productId: string;
    allergenConflictsFound: string[];
    activeConflictsFound: string[];
    duplicateStepDetected: boolean;
    evaluatedAt: string;
  };
}

export interface RecommendationAuditRecord {
  recommendationId: string;
  userId: string;
  safetyPolicyVersion: string;
  engineVersion: string;
  timestamp: string;
  candidateProductIdsEvaluated: string[];
  approvedProductIds: string[];
  rejectedProductIdsWithReasons: Record<string, string[]>;
  selectedBestProductId?: string;
  selectedAlternativeProductIds: string[];
  reasonCodes: string[];
  requiresHumanCareSuggestion: boolean;
}
