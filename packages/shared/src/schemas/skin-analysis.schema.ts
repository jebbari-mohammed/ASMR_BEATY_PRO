import { z } from 'zod';

export const StandardizedCropTypeSchema = z.enum([
  'FULL_FRONT',
  'FULL_LEFT',
  'FULL_RIGHT',
  'FOREHEAD',
  'LEFT_CHEEK',
  'RIGHT_CHEEK',
  'NOSE_T_ZONE',
  'CHIN',
  'LEFT_UNDER_EYE',
  'RIGHT_UNDER_EYE'
]);

export const SkinMetricTypeSchema = z.enum([
  'visibleBlemishes',
  'visibleRedness',
  'visiblePores',
  'textureIrregularity',
  'visibleSpotsOrUnevenTone',
  'surfaceShine',
  'darkCircleAppearance',
  'fineLineAppearance',
  // Backward compatibility aliases
  'visible_blemishes',
  'redness_appearance',
  'texture_smoothness',
  'visible_pores',
  'oiliness_shine_appearance',
  'uneven_tone_appearance',
  'dark_circle_appearance',
  'fine_line_appearance'
]);

export const MetricSeveritySchema = z.enum(['subtle', 'mild', 'moderate', 'noticeable']);
export const MetricReliabilitySchema = z.enum(['high', 'medium', 'low', 'unavailable']);

export const SkinMetricValueSchema = z.object({
  type: SkinMetricTypeSchema,
  displayName: z.string().min(1),
  score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  severity: MetricSeveritySchema,
  reliability: MetricReliabilitySchema.optional(),
  regions: z.array(z.string()).optional(),
  description: z.string().min(1)
});

export const FocusAreaSchema = z.object({
  metricType: SkinMetricTypeSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  suggestedRoutineFocus: z.string().min(1),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)])
});

export const ImageQualityReportSchema = z.object({
  isPassed: z.boolean(),
  faceDetected: z.boolean(),
  isCentered: z.boolean(),
  lightingAcceptable: z.boolean(),
  sharpnessScore: z.number().min(0).max(1),
  neutralExpression: z.boolean(),
  noSunglassesOrMajorOcclusion: z.boolean(),
  failureReasons: z.array(z.string())
});

export const AnalysisVersionMetadataSchema = z.object({
  provider: z.enum(['gemini', 'mock', 'internal', 'perfect_corp', 'haut_ai']),
  modelId: z.string().min(1),
  scannerPromptVersion: z.string().min(1),
  scoringRubricVersion: z.string().min(1),
  captureProtocolVersion: z.string().min(1),
  cropProtocolVersion: z.string().min(1),
  normalizationVersion: z.string().min(1),
  createdAt: z.string()
});

export const ScanTelemetrySchema = z.object({
  inputTokens: z.number().nonnegative(),
  outputTokens: z.number().nonnegative(),
  thinkingTokens: z.number().nonnegative().optional(),
  totalTokens: z.number().nonnegative(),
  estimatedCostUsd: z.number().nonnegative(),
  latencyMs: z.number().nonnegative(),
  modelId: z.string(),
  pricingVersion: z.string().min(1)
});

export const NormalizedSkinAnalysisSchema = z.object({
  scanId: z.string(),
  userId: z.string().min(1),
  capturedAt: z.string(),
  provider: z.enum(['gemini', 'mock', 'internal', 'perfect_corp', 'haut_ai']),
  providerModelVersion: z.string().min(1),
  versionMetadata: AnalysisVersionMetadataSchema.optional(),
  anglesAnalyzed: z.array(z.string()).min(1),
  cropsAnalyzed: z.array(StandardizedCropTypeSchema).optional(),
  qualityReport: ImageQualityReportSchema,
  metrics: z.record(SkinMetricValueSchema),
  baselineCosmeticScore: z.number().min(0).max(100),
  topFocusAreas: z.array(FocusAreaSchema).min(1).max(3),
  changesFromPreviousScan: z.object({
    previousScanId: z.string(),
    daysSincePrevious: z.number().nonnegative(),
    probabilisticObservations: z.array(z.string())
  }).optional(),
  telemetry: ScanTelemetrySchema.optional()
});

export const GeminiMetricResultSchema = z.object({
  score: z.number().min(0).max(100).nullable(),
  reliability: MetricReliabilitySchema,
  regions: z.array(z.string())
});

export const GeminiSkinScanOutputSchema = z.object({
  usable: z.boolean(),
  metrics: z.object({
    visibleBlemishes: GeminiMetricResultSchema,
    visibleRedness: GeminiMetricResultSchema,
    visiblePores: GeminiMetricResultSchema,
    textureIrregularity: GeminiMetricResultSchema,
    visibleSpotsOrUnevenTone: GeminiMetricResultSchema,
    surfaceShine: GeminiMetricResultSchema,
    darkCircleAppearance: GeminiMetricResultSchema,
    fineLineAppearance: GeminiMetricResultSchema
  })
});

export const ScanSessionSchema = z.object({
  scanId: z.string(),
  userId: z.string().min(1),
  status: z.enum([
    'CREATED',
    'CAPTURED',
    'UPLOAD_PENDING',
    'UPLOADED',
    'QUALITY_VALIDATED',
    'ENTITLEMENT_VERIFIED',
    'QUEUED',
    'ANALYZING',
    'NORMALIZING',
    'COMPLETED',
    'FAILED_RETAKE',
    'FAILED_RETRYABLE',
    'FAILED_INVALID_IMAGE',
    'FAILED_TERMINAL'
  ]),
  createdAt: z.string(),
  updatedAt: z.string(),
  angles: z.array(z.string()),
  crops: z.array(StandardizedCropTypeSchema).optional(),
  idempotencyKey: z.string().min(8),
  storagePaths: z.record(z.string()),
  resultSnapshotId: z.string().optional(),
  failureReason: z.string().optional(),
  retryCount: z.number().nonnegative()
});
