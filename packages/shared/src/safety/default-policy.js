"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SAFETY_POLICY_V1 = void 0;
exports.DEFAULT_SAFETY_POLICY_V1 = {
    policyVersion: '1.0.0-cosmetic-safety-2026',
    reviewedBy: 'Board Skincare Safety Protocol Review',
    effectiveDate: '2026-09-01',
    maxNewActivesIntroducedPerMonth: 1,
    disallowedSimultaneousActives: [
        {
            activeA: 'retinoid',
            activeB: 'aha',
            reason: 'Combining retinoids with alpha hydroxy acids significantly elevates barrier irritation risk.',
            severity: 'forbidden_same_routine'
        },
        {
            activeA: 'retinoid',
            activeB: 'bha',
            reason: 'Combining retinoids with salicylic acid simultaneously causes excessive stratum corneum desquamation.',
            severity: 'forbidden_same_routine'
        },
        {
            activeA: 'retinoid',
            activeB: 'benzoyl_peroxide',
            reason: 'Benzoyl peroxide can oxidize certain retinoids and increases acute erythema risk when layered.',
            severity: 'alternate_nights_only'
        },
        {
            activeA: 'vitamin_c_l_ascorbic',
            activeB: 'aha',
            reason: 'Layering low-pH L-ascorbic acid directly with AHAs causes stinging and compromised moisture barrier.',
            severity: 'forbidden_same_routine'
        },
        {
            activeA: 'vitamin_c_l_ascorbic',
            activeB: 'bha',
            reason: 'Simultaneous low-pH direct acids risk irritation and redness flare-up.',
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
