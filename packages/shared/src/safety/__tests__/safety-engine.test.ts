import { SafetyEngine } from '../safety-engine.js';
import { ProductWithOffers } from '../../types/product.js';

describe('SafetyEngine Adversarial Test Suite', () => {
  let engine: SafetyEngine;

  beforeEach(() => {
    engine = new SafetyEngine();
  });

  const baseProduct: ProductWithOffers = {
    product: {
      productId: 'prod_moisturizer_001',
      brand: 'CeraVe',
      name: 'Daily Moisturizing Lotion',
      category: 'moisturizer',
      routineStep: 'hydrate_moisturize',
      inciIngredients: ['water', 'glycerin', 'caprylic/capric triglyceride', 'ceramide np', 'ceramide ap', 'hyaluronic acid'],
      keyIngredients: ['ceramides', 'hyaluronic acid'],
      activeCategories: ['ceramides', 'hyaluronic_acid'],
      fragranceStatus: 'fragrance_free',
      productDirections: 'Apply liberally to face and neck.',
      amPmCompatibility: 'AM_AND_PM',
      safetyReviewStatus: 'approved',
      catalogStatus: 'active',
      ingredientSource: 'manufacturer',
      ingredientSourceConfidence: 1.0,
      countryAvailability: ['US', 'CA', 'GB'],
      createdAt: '2026-01-01T00:00:00Z',
      lastVerifiedAt: '2026-09-01T00:00:00Z'
    },
    offers: [
      {
        offerId: 'off_iherb_001',
        productId: 'prod_moisturizer_001',
        merchant: 'iherb',
        merchantDisplayName: 'iHerb',
        region: 'US',
        price: 16.99,
        currency: 'USD',
        inStock: true,
        shippingAvailability: ['US', 'CA'],
        affiliateUrl: 'https://iherb.com/pr/cerave-daily-lotion',
        affiliateProvider: 'partnerize',
        commissionRatePercent: 5.0,
        lastVerifiedAt: '2026-09-01T00:00:00Z'
      }
    ],
    bestRetailOffer: {
      offerId: 'off_iherb_001',
      productId: 'prod_moisturizer_001',
      merchant: 'iherb',
      merchantDisplayName: 'iHerb',
      region: 'US',
      price: 16.99,
      currency: 'USD',
      inStock: true,
      shippingAvailability: ['US', 'CA'],
      affiliateUrl: 'https://iherb.com/pr/cerave-daily-lotion',
      affiliateProvider: 'partnerize',
      commissionRatePercent: 5.0,
      lastVerifiedAt: '2026-09-01T00:00:00Z'
    }
  };

  test('Rejects candidate when user reports high-risk/out-of-scope symptoms', () => {
    const result = engine.filterAndRankCandidates([baseProduct], {
      userId: 'usr_test_1',
      skinType: 'normal',
      knownAllergies: [],
      reportedSensitivities: [],
      currentRoutineSteps: [],
      recentIrritationReported: false,
      userReportedSymptoms: ['I have severe swelling and sudden bleeding near my eyebrow']
    });

    expect(result.bestFit).toBeUndefined();
    expect(result.auditRecord.requiresHumanCareSuggestion).toBe(true);
    expect(result.noSafeCandidateReason).toContain('medical evaluation');
  });

  test('Rejects candidate when it contains an ingredient the user is allergic to', () => {
    const allergicProduct: ProductWithOffers = {
      ...baseProduct,
      product: {
        ...baseProduct.product,
        productId: 'prod_snail_001',
        inciIngredients: ['snail secretion filtrate', 'sodium hyaluronate', 'panthenol']
      }
    };

    const result = engine.evaluateCandidate({
      userId: 'usr_test_2',
      userPerceivedSkinType: 'normal',
      knownAllergies: ['snail'],
      reportedSensitivities: [],
      currentRoutineSteps: [],
      recentIrritationReported: false,
      candidateProduct: allergicProduct.product
    });

    expect(result.isSafeToRecommend).toBe(false);
    expect(result.rejectionReasons).toContain('ALLERGEN_CONFLICT_SNAIL');
  });

  test('Rejects candidate when active conflicts with existing routine (Retinoid + AHA)', () => {
    const ahaSerum: ProductWithOffers = {
      ...baseProduct,
      product: {
        ...baseProduct.product,
        productId: 'prod_glycolic_001',
        category: 'serum',
        routineStep: 'treat',
        activeCategories: ['aha'],
        inciIngredients: ['water', 'glycolic acid', 'sodium hydroxide']
      }
    };

    const result = engine.evaluateCandidate({
      userId: 'usr_test_3',
      userPerceivedSkinType: 'normal',
      knownAllergies: [],
      reportedSensitivities: [],
      currentRoutineSteps: [
        {
          category: 'treat',
          activeCategories: ['retinoid'],
          inciIngredients: ['retinol']
        }
      ],
      recentIrritationReported: false,
      candidateProduct: ahaSerum.product
    });

    expect(result.isSafeToRecommend).toBe(false);
    expect(result.rejectionReasons).toContain('ACTIVE_CONFLICT_FORBIDDEN_SAME_ROUTINE');
  });

  test('Rejects duplicate step if user already owns an active cleanser/moisturizer/SPF', () => {
    const result = engine.evaluateCandidate({
      userId: 'usr_test_4',
      userPerceivedSkinType: 'normal',
      knownAllergies: [],
      reportedSensitivities: [],
      currentRoutineSteps: [
        {
          category: 'hydrate_moisturize',
          activeCategories: ['ceramides'],
          inciIngredients: ['water', 'ceramide np']
        }
      ],
      recentIrritationReported: false,
      candidateProduct: baseProduct.product
    });

    expect(result.isSafeToRecommend).toBe(false);
    expect(result.rejectionReasons).toContain('REDUNDANT_STEP_OWNED');
  });

  test('Rejects inactive or unapproved products from recommendation', () => {
    const disabledProduct: ProductWithOffers = {
      ...baseProduct,
      product: {
        ...baseProduct.product,
        catalogStatus: 'disabled'
      }
    };

    const result = engine.evaluateCandidate({
      userId: 'usr_test_5',
      userPerceivedSkinType: 'normal',
      knownAllergies: [],
      reportedSensitivities: [],
      currentRoutineSteps: [],
      recentIrritationReported: false,
      candidateProduct: disabledProduct.product
    });

    expect(result.isSafeToRecommend).toBe(false);
    expect(result.rejectionReasons).toContain('CATALOG_STATUS_INACTIVE');
  });

  test('GUARANTEE: High affiliate commission does NOT cause inferior product to outrank safe best fit', () => {
    const productA_lowCommission_highFit: ProductWithOffers = {
      ...baseProduct,
      product: {
        ...baseProduct.product,
        productId: 'prod_safe_cica',
        name: 'Centella Calming Serum',
        category: 'serum',
        routineStep: 'treat',
        fragranceStatus: 'fragrance_free',
        activeCategories: ['centella_cica']
      },
      bestRetailOffer: {
        ...baseProduct.bestRetailOffer!,
        commissionRatePercent: 3.0 // LOW COMMISSION
      }
    };

    const productB_highCommission_lowerFit: ProductWithOffers = {
      ...baseProduct,
      product: {
        ...baseProduct.product,
        productId: 'prod_expensive_hyped',
        name: 'Hyped Botanical Glow Oil',
        category: 'oil',
        routineStep: 'treat',
        fragranceStatus: 'contains_fragrance', // Not optimal for sensitive skin
        activeCategories: []
      },
      bestRetailOffer: {
        ...baseProduct.bestRetailOffer!,
        commissionRatePercent: 35.0 // HUGE COMMISSION
      }
    };

    const result = engine.filterAndRankCandidates(
      [productB_highCommission_lowerFit, productA_lowCommission_highFit],
      {
        userId: 'usr_test_sensitive',
        skinType: 'sensitive',
        knownAllergies: [],
        reportedSensitivities: ['fragrance'],
        currentRoutineSteps: [],
        recentIrritationReported: true
      }
    );

    // Product A must win despite paying only 3% vs 35%
    expect(result.bestFit?.product.productId).toBe('prod_safe_cica');
  });

  test('Returns NO_RECOMMENDATION cleanly when no candidates survive filtering', () => {
    const result = engine.filterAndRankCandidates([], {
      userId: 'usr_test_empty',
      skinType: 'normal',
      knownAllergies: [],
      reportedSensitivities: [],
      currentRoutineSteps: [],
      recentIrritationReported: false
    });

    expect(result.bestFit).toBeUndefined();
    expect(result.alternatives).toHaveLength(0);
    expect(result.auditRecord.reasonCodes).toContain('NO_SAFE_CANDIDATE_SURVIVED_FILTER');
    expect(result.noSafeCandidateReason).toContain('does not recommend introducing any new product');
  });
});
