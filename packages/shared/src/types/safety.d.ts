/**
 * Safety engine, allergen matching, conflict matrices, and out-of-scope escalation types.
 */
import { ActiveCategory, RoutineStepCategory } from './product.js';
export interface AllergenRule {
    allergenId: string;
    name: string;
    matchedIngredients: string[];
}
export interface IncompatibleActivePair {
    activeA: ActiveCategory;
    activeB: ActiveCategory;
    reason: string;
    severity: 'forbidden_same_routine' | 'alternate_nights_only' | 'caution_dryness';
}
export interface SafetyPolicy {
    policyVersion: string;
    reviewedBy: string;
    effectiveDate: string;
    maxNewActivesIntroducedPerMonth: number;
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
    userReportedSymptoms?: string[];
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
//# sourceMappingURL=safety.d.ts.map