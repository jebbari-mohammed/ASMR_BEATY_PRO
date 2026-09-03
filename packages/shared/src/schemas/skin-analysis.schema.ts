import { z } from 'zod';

export const SkinMetricTypeSchema = z.enum([
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

export const SkinMetricValueSchema = z.object({
  type: SkinMetricTypeSchema,
  displayName: z.string().min(1),
  score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  severity: MetricSeveritySchema,
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

export const NormalizedSkinAnalysisSchema = z.object({
  scanId: z.string().uuid(),
  userId: z.string().min(1),
  capturedAt: z.string().datetime(),
  provider: z.enum(['perfect_corp', 'haut_ai', 'mock', 'internal']),
  providerModelVersion: z.string().min(1),
  anglesAnalyzed: z.array(z.enum(['front', 'left_profile', 'right_profile'])).min(1),
  qualityReport: ImageQualityReportSchema,
  metrics: z.record(SkinMetricTypeSchema, SkinMetricValueSchema),
  baselineCosmeticScore: z.number().min(0).max(100),
  topFocusAreas: z.array(FocusAreaSchema).min(1).max(3),
  changesFromPreviousScan: z.object({
    previousScanId: z.string(),
    daysSincePrevious: z.number().nonnegative(),
    probabilisticObservations: z.array(z.string())
  }).optional()
});

export const ScanSessionSchema = z.object({
  scanId: z.string().uuid(),
  userId: z.string().min(1),
  status: z.enum([
    'CREATED',
    'UPLOAD_PENDING',
    'UPLOADED',
    'QUALITY_VALIDATED',
    'QUEUED',
    'ANALYZING',
    'NORMALIZING',
    'COMPLETED',
    'FAILED_RETRYABLE',
    'FAILED_INVALID_IMAGE',
    'FAILED_TERMINAL'
  ]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  angles: z.array(z.enum(['front', 'left_profile', 'right_profile'])),
  idempotencyKey: z.string().min(8),
  storagePaths: z.record(z.string(), z.string()),
  resultSnapshotId: z.string().optional(),
  failureReason: z.string().optional(),
  retryCount: z.number().nonnegative()
});
