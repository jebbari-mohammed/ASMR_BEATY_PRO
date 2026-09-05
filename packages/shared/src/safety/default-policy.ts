import { SafetyPolicy } from '../types/safety.js';

export const DEFAULT_SAFETY_POLICY_V1: SafetyPolicy = {
  policyVersion: '1.0.0-conservative-policy-2026',
  reviewedBy: 'Internal Cosmetic Policy Team (Conservative V1)',
  effectiveDate: '2026-09-01',
  maxNewActivesIntroducedPerMonth: 1,
  
  disallowedSimultaneousActives: [
    {
      activeA: 'retinoid',
      activeB: 'aha',
      reason: 'Conservative product policy: avoid simultaneous retinoid and alpha hydroxy acid layering in V1 routines to prioritize barrier comfort.',
      severity: 'forbidden_same_routine'
    },
    {
      activeA: 'retinoid',
      activeB: 'bha',
      reason: 'Conservative product policy: avoid simultaneous retinoid and beta hydroxy acid layering in V1 routines.',
      severity: 'forbidden_same_routine'
    },
    {
      activeA: 'retinoid',
      activeB: 'benzoyl_peroxide',
      reason: 'Conservative product policy: avoid simultaneous retinoid and benzoyl peroxide in the same routine step.',
      severity: 'alternate_nights_only'
    },
    {
      activeA: 'vitamin_c_l_ascorbic',
      activeB: 'aha',
      reason: 'Conservative product policy: avoid simultaneous direct L-ascorbic acid and AHA layering in the same routine step.',
      severity: 'forbidden_same_routine'
    },
    {
      activeA: 'vitamin_c_l_ascorbic',
      activeB: 'bha',
      reason: 'Conservative product policy: avoid simultaneous direct L-ascorbic acid and BHA layering in the same routine step.',
      severity: 'forbidden_same_routine'
    }
  ],

  highRiskSymptomsKeywords: [
    'severe pain',
    'extreme pain',
    'major swelling',
    'facial swelling',
    'severe swelling',
    'bleeding',
    'oozing',
    'pus',
    'infection',
    'infected',
    'fever',
    'rapidly changing mole',
    'irregular border',
    'black spot growing',
    'eye swelling',
    'swollen eye',
    'anaphylaxis',
    'hives spreading',
    'blistering'
  ],

  sensitiveSkinForbiddenIngredients: [
    'fragrance',
    'parfum',
    'denatured alcohol',
    'alcohol denat',
    'essential oil',
    'lavender oil',
    'eucalyptus oil',
    'citrus limon peel oil',
    'menthol',
    'camphor'
  ]
};
