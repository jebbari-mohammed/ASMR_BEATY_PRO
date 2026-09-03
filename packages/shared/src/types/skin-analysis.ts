/**
 * Domain types for normalized cosmetic skin analysis.
 * Strictly adheres to cosmetic/wellness framing. No medical disease claims.
 */

export type SkinMetricType =
  | 'visible_blemishes'
  | 'redness_appearance'
  | 'texture_smoothness'
  | 'visible_pores'
  | 'oiliness_shine_appearance'
  | 'uneven_tone_appearance'
  | 'dark_circle_appearance'
  | 'fine_line_appearance';

export type MetricSeverity = 'subtle' | 'mild' | 'moderate' | 'noticeable';

export interface SkinMetricValue {
  type: SkinMetricType;
  displayName: string;
  score: number; // 0 to 100, where 100 is optimal/clear appearance
  confidence: number; // 0.0 to 1.0
  severity: MetricSeverity;
  description: string; // Non-shaming, cosmetic observation
}

export interface FocusArea {
  metricType: SkinMetricType;
  title: string;
  summary: string;
  suggestedRoutineFocus: string; // e.g. "Gentle calming barrier support", "Balanced hydration"
  priority: 1 | 2 | 3;
}

export type ScanAngle = 'front' | 'left_profile' | 'right_profile';

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

export interface NormalizedSkinAnalysis {
  scanId: string;
  userId: string;
  capturedAt: string; // ISO 8601
  provider: 'perfect_corp' | 'haut_ai' | 'mock' | 'internal';
  providerModelVersion: string;
  anglesAnalyzed: ScanAngle[];
  qualityReport: ImageQualityReport;
  
  // Normalized 0-100 cosmetic scores
  metrics: Record<SkinMetricType, SkinMetricValue>;
  
  // Overall non-clinical snapshot score (optional display, cosmetic baseline only)
  baselineCosmeticScore: number;
  
  // Top 3 actionable areas for routine personalization
  topFocusAreas: [FocusArea, FocusArea, FocusArea] | FocusArea[];
  
  // Longitudinal comparison if previous snapshot exists
  changesFromPreviousScan?: {
    previousScanId: string;
    daysSincePrevious: number;
    probabilisticObservations: string[]; // Non-causal: "Visible redness appears slightly lower than previous baseline"
  };
}

export type ScanStatus =
  | 'CREATED'
  | 'UPLOAD_PENDING'
  | 'UPLOADED'
  | 'QUALITY_VALIDATED'
  | 'QUEUED'
  | 'ANALYZING'
  | 'NORMALIZING'
  | 'COMPLETED'
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
  idempotencyKey: string;
  storagePaths: Record<ScanAngle, string>;
  resultSnapshotId?: string;
  failureReason?: string;
  retryCount: number;
}
