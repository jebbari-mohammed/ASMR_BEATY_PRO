/**
 * Domain types for normalized cosmetic skin analysis.
 * Strictly adheres to cosmetic/wellness framing. No medical disease claims.
 */
export type SkinMetricType = 'visible_blemishes' | 'redness_appearance' | 'texture_smoothness' | 'visible_pores' | 'oiliness_shine_appearance' | 'uneven_tone_appearance' | 'dark_circle_appearance' | 'fine_line_appearance';
export type MetricSeverity = 'subtle' | 'mild' | 'moderate' | 'noticeable';
export interface SkinMetricValue {
    type: SkinMetricType;
    displayName: string;
    score: number;
    confidence: number;
    severity: MetricSeverity;
    description: string;
}
export interface FocusArea {
    metricType: SkinMetricType;
    title: string;
    summary: string;
    suggestedRoutineFocus: string;
    priority: 1 | 2 | 3;
}
export type ScanAngle = 'front' | 'left_profile' | 'right_profile';
export interface ImageQualityReport {
    isPassed: boolean;
    faceDetected: boolean;
    isCentered: boolean;
    lightingAcceptable: boolean;
    sharpnessScore: number;
    neutralExpression: boolean;
    noSunglassesOrMajorOcclusion: boolean;
    failureReasons: string[];
}
export interface NormalizedSkinAnalysis {
    scanId: string;
    userId: string;
    capturedAt: string;
    provider: 'perfect_corp' | 'haut_ai' | 'mock' | 'internal';
    providerModelVersion: string;
    anglesAnalyzed: ScanAngle[];
    qualityReport: ImageQualityReport;
    metrics: Record<SkinMetricType, SkinMetricValue>;
    baselineCosmeticScore: number;
    topFocusAreas: [FocusArea, FocusArea, FocusArea] | FocusArea[];
    changesFromPreviousScan?: {
        previousScanId: string;
        daysSincePrevious: number;
        probabilisticObservations: string[];
    };
}
export type ScanStatus = 'CREATED' | 'UPLOAD_PENDING' | 'UPLOADED' | 'QUALITY_VALIDATED' | 'QUEUED' | 'ANALYZING' | 'NORMALIZING' | 'COMPLETED' | 'FAILED_RETRYABLE' | 'FAILED_INVALID_IMAGE' | 'FAILED_TERMINAL';
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
//# sourceMappingURL=skin-analysis.d.ts.map