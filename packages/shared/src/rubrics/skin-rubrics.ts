/**
 * Versioned Skin Scanner Prompts and Fixed Scoring Rubrics.
 * Pure cosmetic evaluation standards. Strictly non-medical.
 */

export const SKIN_SCANNER_PROMPT_VERSION = 'SKIN_SCANNER_PROMPT_V1';
export const SKIN_SCORING_RUBRIC_VERSION = 'SKIN_SCORING_RUBRIC_V1';
export const CAPTURE_PROTOCOL_VERSION = 'CAPTURE_PROTOCOL_V1';
export const CROP_PROTOCOL_VERSION = 'CROP_PROTOCOL_V1';
export const NORMALIZATION_VERSION = 'NORMALIZATION_V1';

/**
 * Production Gemini model identifier.
 * Pinned model identifier. No auto-changing alias like 'latest'.
 */
export const GEMINI_PRODUCTION_MODEL_ID = 'gemini-3.8-flash';

/**
 * Versioned System Instruction for Gemini 3.8 Flash Skin Scanner
 */
export const SKIN_SCANNER_PROMPT_V1 = `You are a cosmetic facial skin visual-analysis system.
Analyze only characteristics directly visible in the supplied standardized facial photographs.
The app is a cosmetic skincare coach, not a medical diagnostic service.
Never diagnose disease.
Never infer a medical condition.
Never infer internal skin biology that cannot be reliably observed visually.
Use the complete face photographs for context and the labeled facial-region crops for fine detail.
Apply the supplied scoring rubrics consistently.
Evaluate only the requested metrics.
If image quality prevents reliable evaluation of a metric, mark it unavailable or low reliability.
Never invent observations.
Return only the required structured output.`;

/**
 * Metric Rubric Definitions
 */
export interface MetricRubricDefinition {
  metricName: string;
  cosmeticFeature: string;
  relevantRegions: string[];
  excludedObservations: string[];
  anchors: {
    range: string;
    description: string;
  }[];
  unavailableSituations: string[];
}

export const SKIN_SCORING_RUBRIC_V1: Record<string, MetricRubricDefinition> = {
  visibleBlemishes: {
    metricName: 'visibleBlemishes',
    cosmeticFeature: 'Surface cosmetic breakouts, localized redness bumps, and visible comedones on the skin surface.',
    relevantRegions: ['FOREHEAD', 'LEFT_CHEEK', 'RIGHT_CHEEK', 'NOSE_T_ZONE', 'CHIN'],
    excludedObservations: ['Cystic disease diagnosis', 'Infection', 'Fungal acne diagnosis', 'Boils or carbuncles'],
    anchors: [
      { range: '0-10', description: 'Very few to no visible surface blemishes or bumps.' },
      { range: '11-30', description: 'Mild localized surface spots in 1-2 small regions.' },
      { range: '31-50', description: 'Moderate visible surface spots across multiple facial regions.' },
      { range: '51-70', description: 'Multiple clearly prominent surface blemishes in multiple zones.' },
      { range: '71-90', description: 'Strong and widespread visible blemish prominence.' },
      { range: '91-100', description: 'Very pronounced visible blemish appearance across all visible zones.' }
    ],
    unavailableSituations: ['Severe motion blur', 'Heavy occlusion covering >50% of the relevant region']
  },

  visibleRedness: {
    metricName: 'visibleRedness',
    cosmeticFeature: 'Surface cutaneous erythema, visible warmth, and superficial cosmetic redness.',
    relevantRegions: ['FOREHEAD', 'LEFT_CHEEK', 'RIGHT_CHEEK', 'NOSE_T_ZONE', 'CHIN'],
    excludedObservations: ['Rosacea diagnosis', 'Eczema diagnosis', 'Lupus or systemic rash', 'Allergic dermatitis'],
    anchors: [
      { range: '0-10', description: 'Calm, completely even surface tone with minimal visible redness.' },
      { range: '11-30', description: 'Slight localized flushing or mild warmth on central cheeks.' },
      { range: '31-50', description: 'Moderate diffuse redness across mid-cheeks or nasal bridge.' },
      { range: '51-70', description: 'Prominent visible redness across cheeks and forehead.' },
      { range: '71-90', description: 'Strong and persistent redness across multiple facial planes.' },
      { range: '91-100', description: 'Intense, widespread superficial redness across entire face.' }
    ],
    unavailableSituations: ['Strong tinted/colored lighting (e.g., strong red or amber ambient lights)', 'Direct sunlight sunburn']
  },

  visiblePores: {
    metricName: 'visiblePores',
    cosmeticFeature: 'Visible follicular openings and superficial pore prominence.',
    relevantRegions: ['FOREHEAD', 'NOSE_T_ZONE', 'LEFT_CHEEK', 'RIGHT_CHEEK'],
    excludedObservations: ['Scarring diagnosis', 'Ice pick scars disease classification'],
    anchors: [
      { range: '0-10', description: 'Very little visible pore prominence; fine and indistinct pores.' },
      { range: '11-30', description: 'Mild localized pore visibility in central nasal or t-zone.' },
      { range: '31-50', description: 'Moderate visibility in relevant facial regions (nose, inner cheeks).' },
      { range: '51-70', description: 'Clearly visible pores across multiple regions.' },
      { range: '71-90', description: 'Strong and widespread visible pore prominence.' },
      { range: '91-100', description: 'Very pronounced pore appearance across all relevant visible regions.' }
    ],
    unavailableSituations: ['Out-of-focus capture', 'Resolution below minimum required detail']
  },

  textureIrregularity: {
    metricName: 'textureIrregularity',
    cosmeticFeature: 'Visible micro-surface roughness, uneven tactile appearance, and fine grain irregularity.',
    relevantRegions: ['FOREHEAD', 'LEFT_CHEEK', 'RIGHT_CHEEK', 'CHIN'],
    excludedObservations: ['Keratosis pilaris disease diagnosis', 'Psoriasis diagnosis'],
    anchors: [
      { range: '0-10', description: 'Smooth, glass-like, even visual texture across face.' },
      { range: '11-30', description: 'Mostly smooth with very minor micro-roughness in isolated spots.' },
      { range: '31-50', description: 'Moderate texture irregularity, minor dryness flakes or bumpy appearance.' },
      { range: '51-70', description: 'Noticeable textural unevenness in cheeks and forehead.' },
      { range: '71-90', description: 'Pronounced roughness and widespread visual unevenness.' },
      { range: '91-100', description: 'Severe visual texture irregularity across the entire surface.' }
    ],
    unavailableSituations: ['Severe blur', 'Harsh digital smoothing or beauty filter active']
  },

  visibleSpotsOrUnevenTone: {
    metricName: 'visibleSpotsOrUnevenTone',
    cosmeticFeature: 'Superficial cosmetic discoloration, post-blemish marks, and visible pigment variation.',
    relevantRegions: ['FOREHEAD', 'LEFT_CHEEK', 'RIGHT_CHEEK', 'NOSE_T_ZONE', 'CHIN'],
    excludedObservations: ['Melanoma diagnosis', 'Malignancy diagnosis', 'Dysplastic nevi classification', 'Melasma medical claim'],
    anchors: [
      { range: '0-10', description: 'Remarkably uniform cosmetic tone with virtually no visible dark marks.' },
      { range: '11-30', description: 'Few faint superficial post-blemish marks or minor tone variance.' },
      { range: '31-50', description: 'Moderate visible tone unevenness or scattered superficial spots.' },
      { range: '51-70', description: 'Multiple clearly defined spots and noticeable tone contrast.' },
      { range: '71-90', description: 'Significant and widespread cosmetic spot prominence.' },
      { range: '91-100', description: 'Dense, prominent discoloration across prominent facial regions.' }
    ],
    unavailableSituations: ['Cast shadows creating false tonal contrast', 'Heavy makeup or concealer']
  },

  surfaceShine: {
    metricName: 'surfaceShine',
    cosmeticFeature: 'Specular light reflection indicating surface oiliness and sebum sheen.',
    relevantRegions: ['FOREHEAD', 'NOSE_T_ZONE', 'CHIN', 'LEFT_CHEEK', 'RIGHT_CHEEK'],
    excludedObservations: ['Seborrhea diagnosis', 'Seborrheic dermatitis claim'],
    anchors: [
      { range: '0-10', description: 'Completely matte appearance, minimal to zero specular reflection.' },
      { range: '11-30', description: 'Balanced natural satin appearance, slight healthy dewy reflection.' },
      { range: '31-50', description: 'Moderate visible shine concentrated in the central T-zone.' },
      { range: '51-70', description: 'Noticeable surface shine extending across forehead and cheeks.' },
      { range: '71-90', description: 'High specular reflection and heavy visible oiliness across most zones.' },
      { range: '91-100', description: 'Very intense, greasy sheen across all facial regions.' }
    ],
    unavailableSituations: ['Direct harsh flash reflection causing overexposed glare blown highlights']
  },

  darkCircleAppearance: {
    metricName: 'darkCircleAppearance',
    cosmeticFeature: 'Infraorbital cosmetic shadow, visible under-eye darkness and fatigue appearance.',
    relevantRegions: ['LEFT_UNDER_EYE', 'RIGHT_UNDER_EYE'],
    excludedObservations: ['Periorbital edema disease claim', 'Allergic shiner diagnosis'],
    anchors: [
      { range: '0-10', description: 'Bright, uniform under-eye tone matching cheek coloration.' },
      { range: '11-30', description: 'Faint under-eye shadow or subtle cosmetic darkness.' },
      { range: '31-50', description: 'Moderate noticeable shadow in the tear-trough region.' },
      { range: '51-70', description: 'Pronounced dark circles clearly contrasting with surrounding skin.' },
      { range: '71-90', description: 'Deep, persistent dark circle appearance.' },
      { range: '91-100', description: 'Very prominent dark circles across entire infraorbital zone.' }
    ],
    unavailableSituations: ['Eyeglasses or spectacles casting shadow on orbital region', 'Extreme overhead lighting shadow']
  },

  fineLineAppearance: {
    metricName: 'fineLineAppearance',
    cosmeticFeature: 'Superficial cosmetic lines, crow’s feet appearance, and micro-creasing.',
    relevantRegions: ['FOREHEAD', 'LEFT_UNDER_EYE', 'RIGHT_UNDER_EYE'],
    excludedObservations: ['Atrophic skin disease claim', 'Elastosis pathology'],
    anchors: [
      { range: '0-10', description: 'Smooth skin with no prominent visible surface creasing at rest.' },
      { range: '11-30', description: 'Very fine, faint surface micro-lines visible upon close inspection.' },
      { range: '31-50', description: 'Moderate fine line prominence around eyes or forehead.' },
      { range: '51-70', description: 'Clearly visible fine lines and shallow creases.' },
      { range: '71-90', description: 'Pronounced and widespread surface creasing.' },
      { range: '91-100', description: 'Deep, pronounced lines across multiple facial planes.' }
    ],
    unavailableSituations: ['Smiling or squinting expression during capture', 'Low resolution']
  }
};

/**
 * Builds the complete instructions string to supply to Gemini along with photographs.
 */
export function buildScannerInstructionPrompt(): string {
  let rubricText = 'SCORING RUBRICS (SKIN_SCORING_RUBRIC_V1):\n';
  for (const [key, rubric] of Object.entries(SKIN_SCORING_RUBRIC_V1)) {
    rubricText += `\n[${key.toUpperCase()} - ${rubric.cosmeticFeature}]\n`;
    rubricText += `Relevant Regions: ${rubric.relevantRegions.join(', ')}\n`;
    rubricText += `Excluded: ${rubric.excludedObservations.join(', ')}\n`;
    rubricText += `Score Anchors (0-100):\n`;
    for (const anchor of rubric.anchors) {
      rubricText += `  * ${anchor.range}: ${anchor.description}\n`;
    }
  }

  return `${SKIN_SCANNER_PROMPT_V1}\n\n${rubricText}`;
}
