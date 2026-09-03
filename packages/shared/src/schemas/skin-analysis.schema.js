"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScanSessionSchema = exports.NormalizedSkinAnalysisSchema = exports.ImageQualityReportSchema = exports.FocusAreaSchema = exports.SkinMetricValueSchema = exports.MetricSeveritySchema = exports.SkinMetricTypeSchema = void 0;
const zod_1 = require("zod");
exports.SkinMetricTypeSchema = zod_1.z.enum([
    'visible_blemishes',
    'redness_appearance',
    'texture_smoothness',
    'visible_pores',
    'oiliness_shine_appearance',
    'uneven_tone_appearance',
    'dark_circle_appearance',
    'fine_line_appearance'
]);
exports.MetricSeveritySchema = zod_1.z.enum(['subtle', 'mild', 'moderate', 'noticeable']);
exports.SkinMetricValueSchema = zod_1.z.object({
    type: exports.SkinMetricTypeSchema,
    displayName: zod_1.z.string().min(1),
    score: zod_1.z.number().min(0).max(100),
    confidence: zod_1.z.number().min(0).max(1),
    severity: exports.MetricSeveritySchema,
    description: zod_1.z.string().min(1)
});
exports.FocusAreaSchema = zod_1.z.object({
    metricType: exports.SkinMetricTypeSchema,
    title: zod_1.z.string().min(1),
    summary: zod_1.z.string().min(1),
    suggestedRoutineFocus: zod_1.z.string().min(1),
    priority: zod_1.z.union([zod_1.z.literal(1), zod_1.z.literal(2), zod_1.z.literal(3)])
});
exports.ImageQualityReportSchema = zod_1.z.object({
    isPassed: zod_1.z.boolean(),
    faceDetected: zod_1.z.boolean(),
    isCentered: zod_1.z.boolean(),
    lightingAcceptable: zod_1.z.boolean(),
    sharpnessScore: zod_1.z.number().min(0).max(1),
    neutralExpression: zod_1.z.boolean(),
    noSunglassesOrMajorOcclusion: zod_1.z.boolean(),
    failureReasons: zod_1.z.array(zod_1.z.string())
});
exports.NormalizedSkinAnalysisSchema = zod_1.z.object({
    scanId: zod_1.z.string().uuid(),
    userId: zod_1.z.string().min(1),
    capturedAt: zod_1.z.string().datetime(),
    provider: zod_1.z.enum(['perfect_corp', 'haut_ai', 'mock', 'internal']),
    providerModelVersion: zod_1.z.string().min(1),
    anglesAnalyzed: zod_1.z.array(zod_1.z.enum(['front', 'left_profile', 'right_profile'])).min(1),
    qualityReport: exports.ImageQualityReportSchema,
    metrics: zod_1.z.record(exports.SkinMetricTypeSchema, exports.SkinMetricValueSchema),
    baselineCosmeticScore: zod_1.z.number().min(0).max(100),
    topFocusAreas: zod_1.z.array(exports.FocusAreaSchema).min(1).max(3),
    changesFromPreviousScan: zod_1.z.object({
        previousScanId: zod_1.z.string(),
        daysSincePrevious: zod_1.z.number().nonnegative(),
        probabilisticObservations: zod_1.z.array(zod_1.z.string())
    }).optional()
});
exports.ScanSessionSchema = zod_1.z.object({
    scanId: zod_1.z.string().uuid(),
    userId: zod_1.z.string().min(1),
    status: zod_1.z.enum([
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
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    angles: zod_1.z.array(zod_1.z.enum(['front', 'left_profile', 'right_profile'])),
    idempotencyKey: zod_1.z.string().min(8),
    storagePaths: zod_1.z.record(zod_1.z.string(), zod_1.z.string()),
    resultSnapshotId: zod_1.z.string().optional(),
    failureReason: zod_1.z.string().optional(),
    retryCount: zod_1.z.number().nonnegative()
});
