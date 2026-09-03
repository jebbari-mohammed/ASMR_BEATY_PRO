import { SafetyPolicy, SafetyEvaluationInput, SafetyCheckResult, RecommendationAuditRecord } from '../types/safety.js';
import { ProductWithOffers } from '../types/product.js';
export declare class SafetyEngine {
    private policy;
    constructor(policy?: SafetyPolicy);
    /**
     * Evaluates whether user-reported context contains high-risk medical or out-of-scope symptoms.
     * If detected, returns immediate guidance to seek professional care. No products are recommended.
     */
    checkHighRiskSymptoms(symptomTextOrList: string | string[]): {
        hasHighRiskSymptom: boolean;
        detectedKeywords: string[];
        escalationMessage?: string;
    };
    /**
     * Evaluates a single candidate product against a user's safety profile.
     * Deterministic: No LLM intervention.
     */
    evaluateCandidate(input: SafetyEvaluationInput): SafetyCheckResult;
    /**
     * Filter and rank candidate products.
     * CRITICAL GUARANTEE: Affiliate commission is strictly forbidden from influencing ranking.
     * Products are sorted by compatibility score only.
     */
    filterAndRankCandidates(candidates: ProductWithOffers[], userContext: {
        userId: string;
        skinType: 'dry' | 'oily' | 'combination' | 'normal' | 'sensitive';
        knownAllergies: string[];
        reportedSensitivities: string[];
        currentRoutineSteps: {
            category: any;
            activeCategories: any[];
            inciIngredients: string[];
        }[];
        recentIrritationReported: boolean;
        userReportedSymptoms?: string[];
        targetStep?: string;
    }): {
        bestFit?: ProductWithOffers;
        alternatives: ProductWithOffers[];
        auditRecord: RecommendationAuditRecord;
        noSafeCandidateReason?: string;
    };
}
//# sourceMappingURL=safety-engine.d.ts.map