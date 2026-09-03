"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafetyEngine = void 0;
const default_policy_js_1 = require("./default-policy.js");
class SafetyEngine {
    policy;
    constructor(policy = default_policy_js_1.DEFAULT_SAFETY_POLICY_V1) {
        this.policy = policy;
    }
    /**
     * Evaluates whether user-reported context contains high-risk medical or out-of-scope symptoms.
     * If detected, returns immediate guidance to seek professional care. No products are recommended.
     */
    checkHighRiskSymptoms(symptomTextOrList) {
        const rawText = Array.isArray(symptomTextOrList)
            ? symptomTextOrList.join(' ').toLowerCase()
            : (symptomTextOrList || '').toLowerCase();
        const detected = this.policy.highRiskSymptomsKeywords.filter(keyword => rawText.includes(keyword.toLowerCase()));
        if (detected.length > 0) {
            return {
                hasHighRiskSymptom: true,
                detectedKeywords: detected,
                escalationMessage: 'What you described may require prompt medical evaluation rather than skincare products. Please consult a board-certified dermatologist, physician, or urgent care clinic for safe in-person evaluation.'
            };
        }
        return {
            hasHighRiskSymptom: false,
            detectedKeywords: []
        };
    }
    /**
     * Evaluates a single candidate product against a user's safety profile.
     * Deterministic: No LLM intervention.
     */
    evaluateCandidate(input) {
        const rejectionReasons = [];
        const allergenConflicts = [];
        const activeConflicts = [];
        let duplicateStepDetected = false;
        // 1. Check for emergency / high-risk symptoms in input
        if (input.userReportedSymptoms && input.userReportedSymptoms.length > 0) {
            const riskCheck = this.checkHighRiskSymptoms(input.userReportedSymptoms);
            if (riskCheck.hasHighRiskSymptom) {
                return {
                    isSafeToRecommend: false,
                    rejectionReasons: ['HIGH_RISK_SYMPTOM_PRESENT'],
                    requiresProfessionalEscalation: true,
                    escalationMessage: riskCheck.escalationMessage,
                    auditTrail: {
                        policyVersion: this.policy.policyVersion,
                        productId: input.candidateProduct.productId,
                        allergenConflictsFound: [],
                        activeConflictsFound: [],
                        duplicateStepDetected: false,
                        evaluatedAt: new Date().toISOString()
                    }
                };
            }
        }
        // 2. Catalog status verification
        if (input.candidateProduct.catalogStatus !== 'active') {
            rejectionReasons.push('CATALOG_STATUS_INACTIVE');
        }
        if (input.candidateProduct.safetyReviewStatus !== 'approved') {
            rejectionReasons.push('SAFETY_REVIEW_NOT_APPROVED');
        }
        // 3. Known Allergens & Sensitivities
        const normalizedInci = input.candidateProduct.inciIngredients.map(i => i.toLowerCase().trim());
        const normalizedAllergies = input.knownAllergies.map(a => a.toLowerCase().trim());
        for (const allergy of normalizedAllergies) {
            if (!allergy)
                continue;
            const matched = normalizedInci.find(ing => ing.includes(allergy));
            if (matched) {
                allergenConflicts.push(`Allergen conflict: "${allergy}" matches INCI ingredient "${matched}"`);
                rejectionReasons.push(`ALLERGEN_CONFLICT_${allergy.toUpperCase().replace(/\s+/g, '_')}`);
            }
        }
        // 4. Sensitive Skin Forbidden Ingredients Check
        if (input.userPerceivedSkinType === 'sensitive' || input.recentIrritationReported) {
            for (const irritant of this.policy.sensitiveSkinForbiddenIngredients) {
                const matched = normalizedInci.find(ing => ing.includes(irritant));
                if (matched) {
                    rejectionReasons.push(`SENSITIVE_SKIN_IRRITANT_${irritant.toUpperCase().replace(/\s+/g, '_')}`);
                }
            }
        }
        // 5. Active Ingredient Conflict Matrix
        const candidateActives = input.candidateProduct.activeCategories;
        for (const step of input.currentRoutineSteps) {
            for (const existingActive of step.activeCategories) {
                for (const candidateActive of candidateActives) {
                    const conflict = this.policy.disallowedSimultaneousActives.find(rule => (rule.activeA === existingActive && rule.activeB === candidateActive) ||
                        (rule.activeA === candidateActive && rule.activeB === existingActive));
                    if (conflict) {
                        activeConflicts.push(`Active conflict between "${existingActive}" and "${candidateActive}": ${conflict.reason}`);
                        rejectionReasons.push(`ACTIVE_CONFLICT_${conflict.severity.toUpperCase()}`);
                    }
                }
            }
        }
        // 6. Step Duplication Filter (Trust Principle: Don't sell what they already have)
        const alreadyOwnsStep = input.currentRoutineSteps.some(step => step.category === input.candidateProduct.routineStep);
        // If the candidate is a standard routine step (cleanser, moisturizer, spf) and user already has it
        if (alreadyOwnsStep && ['cleanse', 'hydrate_moisturize', 'protect_spf'].includes(input.candidateProduct.routineStep)) {
            duplicateStepDetected = true;
            rejectionReasons.push('REDUNDANT_STEP_OWNED');
        }
        const isSafe = rejectionReasons.length === 0;
        return {
            isSafeToRecommend: isSafe,
            rejectionReasons,
            requiresProfessionalEscalation: false,
            auditTrail: {
                policyVersion: this.policy.policyVersion,
                productId: input.candidateProduct.productId,
                allergenConflictsFound: allergenConflicts,
                activeConflictsFound: activeConflicts,
                duplicateStepDetected,
                evaluatedAt: new Date().toISOString()
            }
        };
    }
    /**
     * Filter and rank candidate products.
     * CRITICAL GUARANTEE: Affiliate commission is strictly forbidden from influencing ranking.
     * Products are sorted by compatibility score only.
     */
    filterAndRankCandidates(candidates, userContext) {
        const recommendationId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const rejectedProductIdsWithReasons = {};
        const approvedCandidates = [];
        // Evaluate each candidate deterministically
        for (const item of candidates) {
            const evalInput = {
                userId: userContext.userId,
                userPerceivedSkinType: userContext.skinType,
                knownAllergies: userContext.knownAllergies,
                reportedSensitivities: userContext.reportedSensitivities,
                currentRoutineSteps: userContext.currentRoutineSteps,
                recentIrritationReported: userContext.recentIrritationReported,
                userReportedSymptoms: userContext.userReportedSymptoms,
                candidateProduct: item.product
            };
            const result = this.evaluateCandidate(evalInput);
            if (result.requiresProfessionalEscalation) {
                // Short-circuit immediately for safety
                return {
                    alternatives: [],
                    auditRecord: {
                        recommendationId,
                        userId: userContext.userId,
                        safetyPolicyVersion: this.policy.policyVersion,
                        engineVersion: '1.0.0-deterministic',
                        timestamp: new Date().toISOString(),
                        candidateProductIdsEvaluated: candidates.map(c => c.product.productId),
                        approvedProductIds: [],
                        rejectedProductIdsWithReasons: {
                            all: ['HIGH_RISK_SYMPTOM_ESCALATION']
                        },
                        selectedAlternativeProductIds: [],
                        reasonCodes: ['PROFESSIONAL_ESCALATION_REQUIRED'],
                        requiresHumanCareSuggestion: true
                    },
                    noSafeCandidateReason: result.escalationMessage
                };
            }
            if (result.isSafeToRecommend) {
                // Calculate non-commission compatibility score (0 - 100)
                let score = 70; // baseline safe score
                if (item.product.fragranceStatus === 'fragrance_free' && userContext.skinType === 'sensitive') {
                    score += 15;
                }
                if (item.bestRetailOffer?.inStock) {
                    score += 10;
                }
                approvedCandidates.push({ productWithOffer: item, compatibilityScore: score });
            }
            else {
                rejectedProductIdsWithReasons[item.product.productId] = result.rejectionReasons;
            }
        }
        // Sort strictly by compatibilityScore descending
        // NOTICE: commissionRatePercent is explicitly excluded from sorting!
        approvedCandidates.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
        if (approvedCandidates.length === 0) {
            return {
                alternatives: [],
                auditRecord: {
                    recommendationId,
                    userId: userContext.userId,
                    safetyPolicyVersion: this.policy.policyVersion,
                    engineVersion: '1.0.0-deterministic',
                    timestamp: new Date().toISOString(),
                    candidateProductIdsEvaluated: candidates.map(c => c.product.productId),
                    approvedProductIds: [],
                    rejectedProductIdsWithReasons,
                    selectedAlternativeProductIds: [],
                    reasonCodes: ['NO_SAFE_CANDIDATE_SURVIVED_FILTER'],
                    requiresHumanCareSuggestion: false
                },
                noSafeCandidateReason: 'Based on your current routine and sensitivities, your skin coach does not recommend introducing any new product right now. Keeping your routine consistent and minimal is currently best.'
            };
        }
        const bestFit = approvedCandidates[0].productWithOffer;
        const alternatives = approvedCandidates.slice(1, 3).map(c => c.productWithOffer);
        const auditRecord = {
            recommendationId,
            userId: userContext.userId,
            safetyPolicyVersion: this.policy.policyVersion,
            engineVersion: '1.0.0-deterministic',
            timestamp: new Date().toISOString(),
            candidateProductIdsEvaluated: candidates.map(c => c.product.productId),
            approvedProductIds: approvedCandidates.map(c => c.productWithOffer.product.productId),
            rejectedProductIdsWithReasons,
            selectedBestProductId: bestFit.product.productId,
            selectedAlternativeProductIds: alternatives.map(a => a.product.productId),
            reasonCodes: ['SAFE_COMPATIBLE_MATCH_FOUND'],
            requiresHumanCareSuggestion: false
        };
        return {
            bestFit,
            alternatives,
            auditRecord
        };
    }
}
exports.SafetyEngine = SafetyEngine;
