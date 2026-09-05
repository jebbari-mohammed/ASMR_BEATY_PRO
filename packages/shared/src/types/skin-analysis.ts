/**
 * Domain types for normalized cosmetic skin analysis.
 * Strictly adheres to cosmetic/wellness framing. No medical disease claims.
 */

export type StandardizedCropType =
  | 'FULL_FRONT'
  | 'FULL_LEFT'
  | 'FULL_RIGHT'
  | 'FOREHEAD'
  | 'LEFT_CHEEK'
  | 'RIGHT_CHEEK'
  | 'NOSE_T_ZONE'
  | 'CHIN'
  | 'LEFT_UNDER_EYE'
  | 'RIGHT_UNDER_EYE';

export type SkinMetricType =
  | 'visibleBlemishes'
  | 'visibleRedness'
  | 'visiblePores'
  | 'textureIrregularity'
  | 'visibleSpotsOrUnevenTone'
  | 'surfaceShine'
  | 'darkCircleAppearance'
  | 'fineLineAppearance'
  // Legacy aliases for backward compatibility with UI components
  | 'visible_blemishes'
  | 'redness_appearance'
  | 'texture_smoothness'
  | 'visible_pores'
  | 'oiliness_shine_appearance'
  | 'uneven_tone_appearance'
  | 'dark_circle_appearance'
  | 'fine_line_appearance';

export type MetricSeverity = 'subtle' | 'mild' | 'moderate' | 'noticeable';
export type MetricReliability = 'high' | 'medium' | 'low' | 'unavailable';

export interface SkinMetricValue {
  type: SkinMetricType;
  displayName: string;
  score: number; // 0 to 100
  confidence: number; // 0.0 to 1.0
  severity: MetricSeverity;
  reliability?: MetricReliability;
  regions?: string[];
  description: string; // Non-shaming, cosmetic observation
}

export interface FocusArea {
  metricType: SkinMetricType;
  title: string;
  summary: string;
  suggestedRoutineFocus: string; // e.g. "Gentle calming barrier support", "Balanced hydration"
  priority: 1 | 2 | 3;
}

export type ScanAngle = 'front' | 'left_profile' | 'right_profile' | 'front_neutral' | 'left_turn' | 'right_turn';

export interface ImageQualityReport {
  isPassed: boolean;
  faceDetected: boolean;
  isCentered: boolean;
  lightingAcceptable: boolean;
  sharpnessScore: number; // 0.0 to 1.0 (>= 0.6 is acceptable)
  neutralExpression: boolean;
  noSunglassesOrMajorOcclusion: boolean;
  failureReasons: string[];
}

export interface AnalysisVersionMetadata {
  provider: 'gemini' | 'mock' | 'internal' | 'perfect_corp' | 'haut_ai';
  modelId: string;
  scannerPromptVersion: string;
  scoringRubricVersion: string;
  captureProtocolVersion: string;
  cropProtocolVersion: string;
  normalizationVersion: string;
  createdAt: string;
}

export interface ScanTelemetry {
  inputTokens: number;
  outputTokens: number;
  thinkingTokens?: number;
  totalTokens: number;
  estimatedCostUsd: number;
  latencyMs: number;
  modelId: string;
  pricingVersion: string;
}

export interface NormalizedSkinAnalysis {
  scanId: string;
  userId: string;
  capturedAt: string; // ISO 8601
  provider: 'gemini' | 'mock' | 'internal' | 'perfect_corp' | 'haut_ai';
  providerModelVersion: string;
  versionMetadata?: AnalysisVersionMetadata;
  anglesAnalyzed: ScanAngle[];
  cropsAnalyzed?: StandardizedCropType[];
  qualityReport: ImageQualityReport;
  
  // Normalized 0-100 cosmetic scores
  metrics: Record<string, SkinMetricValue>;
  
  // Overall non-clinical snapshot score (cosmetic baseline)
  baselineCosmeticScore: number;
  
  // Top actionable areas for routine personalization
  topFocusAreas: FocusArea[];
  
  // Longitudinal comparison if previous snapshot exists
  changesFromPreviousScan?: {
    previousScanId: string;
    daysSincePrevious: number;
    probabilisticObservations: string[]; // Non-causal: "Visible redness appears slightly lower than previous baseline"
  };

  telemetry?: ScanTelemetry;
}

export type ScanStatus =
  | 'CREATED'
  | 'CAPTURED'
  | 'UPLOAD_PENDING'
  | 'UPLOADED'
  | 'QUALITY_VALIDATED'
  | 'ENTITLEMENT_VERIFIED'
  | 'QUEUED'
  | 'ANALYZING'
  | 'NORMALIZING'
  | 'COMPLETED'
  | 'FAILED_RETAKE'
  | 'FAILED_RETRYABLE'
  | 'FAILED_INVALID_IMAGE'
  | 'FAILED_TERMINAL';

export interface ScanSession {
  scanId: string;
  userId: string;
  status: ScanStatus;
  createdAt: string;
  updatedAt: string;
  angles: ScanAngle[];
  crops?: StandardizedCropType[];
  idempotencyKey: string;
  storagePaths: Record<string, string>;
  resultSnapshotId?: string;
  failureReason?: string;
  retryCount: number;
}

export interface SkinAnalysisInputImage {
  type: StandardizedCropType;
  buffer: Buffer;
  mimeType: string;
  storagePath?: string;
}

export interface SkinAnalysisInput {
  scanId: string;
  userId: string;
  images: SkinAnalysisInputImage[];
  metadata?: {
    captureProtocolVersion?: string;
    cropProtocolVersion?: string;
  };
}

export interface GeminiMetricResult {
  score: number | null;
  reliability: MetricReliability;
  regions: string[];
}

export interface GeminiSkinScanOutput {
  usable: boolean;
  metrics: {
    visibleBlemishes: GeminiMetricResult;
    visibleRedness: GeminiMetricResult;
    visiblePores: GeminiMetricResult;
    textureIrregularity: GeminiMetricResult;
    visibleSpotsOrUnevenTone: GeminiMetricResult;
    surfaceShine: GeminiMetricResult;
    darkCircleAppearance: GeminiMetricResult;
    fineLineAppearance: GeminiMetricResult;
  };
}

export type ProgressChangeCategory = 'stable' | 'small_visible_change' | 'noticeable_change';

export function categorizeMetricChange(previousScore: number, currentScore: number): {
  delta: number;
  category: ProgressChangeCategory;
  observation: string;
} {
  const delta = Math.abs(currentScore - previousScore);
  if (delta <= 4) {
    return {
      delta,
      category: 'stable',
      observation: 'Cosmetic appearance has remained stable compared to your previous baseline.'
    };
  }
  if (delta <= 10) {
    return {
      delta,
      category: 'small_visible_change',
      observation: 'Small visible change observed compared to your previous baseline.'
    };
  }
  return {
    delta,
    category: 'noticeable_change',
    observation: 'Noticeable cosmetic change observed compared to your previous baseline.'
  };
}
