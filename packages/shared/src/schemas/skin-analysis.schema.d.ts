import { z } from 'zod';
export declare const SkinMetricTypeSchema: z.ZodEnum<["visible_blemishes", "redness_appearance", "texture_smoothness", "visible_pores", "oiliness_shine_appearance", "uneven_tone_appearance", "dark_circle_appearance", "fine_line_appearance"]>;
export declare const MetricSeveritySchema: z.ZodEnum<["subtle", "mild", "moderate", "noticeable"]>;
export declare const SkinMetricValueSchema: z.ZodObject<{
    type: z.ZodEnum<["visible_blemishes", "redness_appearance", "texture_smoothness", "visible_pores", "oiliness_shine_appearance", "uneven_tone_appearance", "dark_circle_appearance", "fine_line_appearance"]>;
    displayName: z.ZodString;
    score: z.ZodNumber;
    confidence: z.ZodNumber;
    severity: z.ZodEnum<["subtle", "mild", "moderate", "noticeable"]>;
    description: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "visible_blemishes" | "redness_appearance" | "texture_smoothness" | "visible_pores" | "oiliness_shine_appearance" | "uneven_tone_appearance" | "dark_circle_appearance" | "fine_line_appearance";
    displayName: string;
    score: number;
    confidence: number;
    severity: "subtle" | "mild" | "moderate" | "noticeable";
    description: string;
}, {
    type: "visible_blemishes" | "redness_appearance" | "texture_smoothness" | "visible_pores" | "oiliness_shine_appearance" | "uneven_tone_appearance" | "dark_circle_appearance" | "fine_line_appearance";
    displayName: string;
    score: number;
    confidence: number;
    severity: "subtle" | "mild" | "moderate" | "noticeable";
    description: string;
}>;
export declare const FocusAreaSchema: z.ZodObject<{
    metricType: z.ZodEnum<["visible_blemishes", "redness_appearance", "texture_smoothness", "visible_pores", "oiliness_shine_appearance", "uneven_tone_appearance", "dark_circle_appearance", "fine_line_appearance"]>;
    title: z.ZodString;
    summary: z.ZodString;
    suggestedRoutineFocus: z.ZodString;
    priority: z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>]>;
}, "strip", z.ZodTypeAny, {
    metricType: "visible_blemishes" | "redness_appearance" | "texture_smoothness" | "visible_pores" | "oiliness_shine_appearance" | "uneven_tone_appearance" | "dark_circle_appearance" | "fine_line_appearance";
    title: string;
    summary: string;
    suggestedRoutineFocus: string;
    priority: 1 | 2 | 3;
}, {
    metricType: "visible_blemishes" | "redness_appearance" | "texture_smoothness" | "visible_pores" | "oiliness_shine_appearance" | "uneven_tone_appearance" | "dark_circle_appearance" | "fine_line_appearance";
    title: string;
    summary: string;
    suggestedRoutineFocus: string;
    priority: 1 | 2 | 3;
}>;
export declare const ImageQualityReportSchema: z.ZodObject<{
    isPassed: z.ZodBoolean;
    faceDetected: z.ZodBoolean;
    isCentered: z.ZodBoolean;
    lightingAcceptable: z.ZodBoolean;
    sharpnessScore: z.ZodNumber;
    neutralExpression: z.ZodBoolean;
    noSunglassesOrMajorOcclusion: z.ZodBoolean;
    failureReasons: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    isPassed: boolean;
    faceDetected: boolean;
    isCentered: boolean;
    lightingAcceptable: boolean;
    sharpnessScore: number;
    neutralExpression: boolean;
    noSunglassesOrMajorOcclusion: boolean;
    failureReasons: string[];
}, {
    isPassed: boolean;
    faceDetected: boolean;
    isCentered: boolean;
    lightingAcceptable: boolean;
    sharpnessScore: number;
    neutralExpression: boolean;
    noSunglassesOrMajorOcclusion: boolean;
    failureReasons: string[];
}>;
export declare const NormalizedSkinAnalysisSchema: z.ZodObject<{
    scanId: z.ZodString;
    userId: z.ZodString;
    capturedAt: z.ZodString;
    provider: z.ZodEnum<["perfect_corp", "haut_ai", "mock", "internal"]>;
    providerModelVersion: z.ZodString;
    anglesAnalyzed: z.ZodArray<z.ZodEnum<["front", "left_profile", "right_profile"]>, "many">;
    qualityReport: z.ZodObject<{
        isPassed: z.ZodBoolean;
        faceDetected: z.ZodBoolean;
        isCentered: z.ZodBoolean;
        lightingAcceptable: z.ZodBoolean;
        sharpnessScore: z.ZodNumber;
        neutralExpression: z.ZodBoolean;
        noSunglassesOrMajorOcclusion: z.ZodBoolean;
        failureReasons: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        isPassed: boolean;
        faceDetected: boolean;
        isCentered: boolean;
        lightingAcceptable: boolean;
        sharpnessScore: number;
        neutralExpression: boolean;
        noSunglassesOrMajorOcclusion: boolean;
        failureReasons: string[];
    }, {
        isPassed: boolean;
        faceDetected: boolean;
        isCentered: boolean;
        lightingAcceptable: boolean;
        sharpnessScore: number;
        neutralExpression: boolean;
        noSunglassesOrMajorOcclusion: boolean;
        failureReasons: string[];
    }>;
    metrics: z.ZodRecord<z.ZodEnum<["visible_blemishes", "redness_appearance", "texture_smoothness", "visible_pores", "oiliness_shine_appearance", "uneven_tone_appearance", "dark_circle_appearance", "fine_line_appearance"]>, z.ZodObject<{
        type: z.ZodEnum<["visible_blemishes", "redness_appearance", "texture_smoothness", "visible_pores", "oiliness_shine_appearance", "uneven_tone_appearance", "dark_circle_appearance", "fine_line_appearance"]>;
        displayName: z.ZodString;
        score: z.ZodNumber;
        confidence: z.ZodNumber;
        severity: z.ZodEnum<["subtle", "mild", "moderate", "noticeable"]>;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "visible_blemishes" | "redness_appearance" | "texture_smoothness" | "visible_pores" | "oiliness_shine_appearance" | "uneven_tone_appearance" | "dark_circle_appearance" | "fine_line_appearance";
        displayName: string;
        score: number;
        confidence: number;
        severity: "subtle" | "mild" | "moderate" | "noticeable";
        description: string;
    }, {
        type: "visible_blemishes" | "redness_appearance" | "texture_smoothness" | "visible_pores" | "oiliness_shine_appearance" | "uneven_tone_appearance" | "dark_circle_appearance" | "fine_line_appearance";
        displayName: string;
        score: number;
        confidence: number;
        severity: "subtle" | "mild" | "moderate" | "noticeable";
        description: string;
    }>>;
    baselineCosmeticScore: z.ZodNumber;
    topFocusAreas: z.ZodArray<z.ZodObject<{
        metricType: z.ZodEnum<["visible_blemishes", "redness_appearance", "texture_smoothness", "visible_pores", "oiliness_shine_appearance", "uneven_tone_appearance", "dark_circle_appearance", "fine_line_appearance"]>;
        title: z.ZodString;
        summary: z.ZodString;
        suggestedRoutineFocus: z.ZodString;
        priority: z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>]>;
    }, "strip", z.ZodTypeAny, {
        metricType: "visible_blemishes" | "redness_appearance" | "texture_smoothness" | "visible_pores" | "oiliness_shine_appearance" | "uneven_tone_appearance" | "dark_circle_appearance" | "fine_line_appearance";
        title: string;
        summary: string;
        suggestedRoutineFocus: string;
        priority: 1 | 2 | 3;
    }, {
        metricType: "visible_blemishes" | "redness_appearance" | "texture_smoothness" | "visible_pores" | "oiliness_shine_appearance" | "uneven_tone_appearance" | "dark_circle_appearance" | "fine_line_appearance";
        title: string;
        summary: string;
        suggestedRoutineFocus: string;
        priority: 1 | 2 | 3;
    }>, "many">;
    changesFromPreviousScan: z.ZodOptional<z.ZodObject<{
        previousScanId: z.ZodString;
        daysSincePrevious: z.ZodNumber;
        probabilisticObservations: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        previousScanId: string;
        daysSincePrevious: number;
        probabilisticObservations: string[];
    }, {
        previousScanId: string;
        daysSincePrevious: number;
        probabilisticObservations: string[];
    }>>;
}, "strip", z.ZodTypeAny, {
    scanId: string;
    userId: string;
    capturedAt: string;
    provider: "perfect_corp" | "haut_ai" | "mock" | "internal";
    providerModelVersion: string;
    anglesAnalyzed: ("front" | "left_profile" | "right_profile")[];
    qualityReport: {
        isPassed: boolean;
        faceDetected: boolean;
        isCentered: boolean;
        lightingAcceptable: boolean;
        sharpnessScore: number;
        neutralExpression: boolean;
        noSunglassesOrMajorOcclusion: boolean;
        failureReasons: string[];
    };
    metrics: Partial<Record<"visible_blemishes" | "redness_appearance" | "texture_smoothness" | "visible_pores" | "oiliness_shine_appearance" | "uneven_tone_appearance" | "dark_circle_appearance" | "fine_line_appearance", {
        type: "visible_blemishes" | "redness_appearance" | "texture_smoothness" | "visible_pores" | "oiliness_shine_appearance" | "uneven_tone_appearance" | "dark_circle_appearance" | "fine_line_appearance";
        displayName: string;
        score: number;
        confidence: number;
        severity: "subtle" | "mild" | "moderate" | "noticeable";
        description: string;
    }>>;
    baselineCosmeticScore: number;
    topFocusAreas: {
        metricType: "visible_blemishes" | "redness_appearance" | "texture_smoothness" | "visible_pores" | "oiliness_shine_appearance" | "uneven_tone_appearance" | "dark_circle_appearance" | "fine_line_appearance";
        title: string;
        summary: string;
        suggestedRoutineFocus: string;
        priority: 1 | 2 | 3;
    }[];
    changesFromPreviousScan?: {
        previousScanId: string;
        daysSincePrevious: number;
        probabilisticObservations: string[];
    } | undefined;
}, {
    scanId: string;
    userId: string;
    capturedAt: string;
    provider: "perfect_corp" | "haut_ai" | "mock" | "internal";
    providerModelVersion: string;
    anglesAnalyzed: ("front" | "left_profile" | "right_profile")[];
    qualityReport: {
        isPassed: boolean;
        faceDetected: boolean;
        isCentered: boolean;
        lightingAcceptable: boolean;
        sharpnessScore: number;
        neutralExpression: boolean;
        noSunglassesOrMajorOcclusion: boolean;
        failureReasons: string[];
    };
    metrics: Partial<Record<"visible_blemishes" | "redness_appearance" | "texture_smoothness" | "visible_pores" | "oiliness_shine_appearance" | "uneven_tone_appearance" | "dark_circle_appearance" | "fine_line_appearance", {
        type: "visible_blemishes" | "redness_appearance" | "texture_smoothness" | "visible_pores" | "oiliness_shine_appearance" | "uneven_tone_appearance" | "dark_circle_appearance" | "fine_line_appearance";
        displayName: string;
        score: number;
        confidence: number;
        severity: "subtle" | "mild" | "moderate" | "noticeable";
        description: string;
    }>>;
    baselineCosmeticScore: number;
    topFocusAreas: {
        metricType: "visible_blemishes" | "redness_appearance" | "texture_smoothness" | "visible_pores" | "oiliness_shine_appearance" | "uneven_tone_appearance" | "dark_circle_appearance" | "fine_line_appearance";
        title: string;
        summary: string;
        suggestedRoutineFocus: string;
        priority: 1 | 2 | 3;
    }[];
    changesFromPreviousScan?: {
        previousScanId: string;
        daysSincePrevious: number;
        probabilisticObservations: string[];
    } | undefined;
}>;
export declare const ScanSessionSchema: z.ZodObject<{
    scanId: z.ZodString;
    userId: z.ZodString;
    status: z.ZodEnum<["CREATED", "UPLOAD_PENDING", "UPLOADED", "QUALITY_VALIDATED", "QUEUED", "ANALYZING", "NORMALIZING", "COMPLETED", "FAILED_RETRYABLE", "FAILED_INVALID_IMAGE", "FAILED_TERMINAL"]>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    angles: z.ZodArray<z.ZodEnum<["front", "left_profile", "right_profile"]>, "many">;
    idempotencyKey: z.ZodString;
    storagePaths: z.ZodRecord<z.ZodString, z.ZodString>;
    resultSnapshotId: z.ZodOptional<z.ZodString>;
    failureReason: z.ZodOptional<z.ZodString>;
    retryCount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    createdAt: string;
    status: "CREATED" | "UPLOAD_PENDING" | "UPLOADED" | "QUALITY_VALIDATED" | "QUEUED" | "ANALYZING" | "NORMALIZING" | "COMPLETED" | "FAILED_RETRYABLE" | "FAILED_INVALID_IMAGE" | "FAILED_TERMINAL";
    scanId: string;
    userId: string;
    updatedAt: string;
    angles: ("front" | "left_profile" | "right_profile")[];
    idempotencyKey: string;
    storagePaths: Record<string, string>;
    retryCount: number;
    resultSnapshotId?: string | undefined;
    failureReason?: string | undefined;
}, {
    createdAt: string;
    status: "CREATED" | "UPLOAD_PENDING" | "UPLOADED" | "QUALITY_VALIDATED" | "QUEUED" | "ANALYZING" | "NORMALIZING" | "COMPLETED" | "FAILED_RETRYABLE" | "FAILED_INVALID_IMAGE" | "FAILED_TERMINAL";
    scanId: string;
    userId: string;
    updatedAt: string;
    angles: ("front" | "left_profile" | "right_profile")[];
    idempotencyKey: string;
    storagePaths: Record<string, string>;
    retryCount: number;
    resultSnapshotId?: string | undefined;
    failureReason?: string | undefined;
}>;
//# sourceMappingURL=skin-analysis.schema.d.ts.map