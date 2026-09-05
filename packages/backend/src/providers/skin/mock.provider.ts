import {
  NormalizedSkinAnalysis,
  ScanSession,
  SkinAnalysisInput,
  SKIN_SCANNER_PROMPT_VERSION,
  SKIN_SCORING_RUBRIC_VERSION,
  CAPTURE_PROTOCOL_VERSION,
  CROP_PROTOCOL_VERSION,
  NORMALIZATION_VERSION
} from '@asmr/shared';
import { SkinAnalysisProvider } from './base.provider.js';

export class MockSkinProvider implements SkinAnalysisProvider {
  readonly providerName = 'mock';
  readonly modelVersion = 'mock-v1.0';

  async analyze(input: SkinAnalysisInput): Promise<NormalizedSkinAnalysis> {
    return {
      scanId: input.scanId,
      userId: input.userId,
      capturedAt: new Date().toISOString(),
      provider: 'mock',
      providerModelVersion: this.modelVersion,
      versionMetadata: {
        provider: 'mock',
        modelId: this.modelVersion,
        scannerPromptVersion: SKIN_SCANNER_PROMPT_VERSION,
        scoringRubricVersion: SKIN_SCORING_RUBRIC_VERSION,
        captureProtocolVersion: CAPTURE_PROTOCOL_VERSION,
        cropProtocolVersion: CROP_PROTOCOL_VERSION,
        normalizationVersion: NORMALIZATION_VERSION,
        createdAt: new Date().toISOString()
      },
      anglesAnalyzed: ['front_neutral', 'left_turn', 'right_turn'],
      cropsAnalyzed: input.images.map((i) => i.type),
      qualityReport: {
        isPassed: true,
        faceDetected: true,
        isCentered: true,
        lightingAcceptable: true,
        sharpnessScore: 0.92,
        neutralExpression: true,
        noSunglassesOrMajorOcclusion: true,
        failureReasons: []
      },
      metrics: {
        visibleBlemishes: {
          type: 'visibleBlemishes',
          displayName: 'Visible Blemishes',
          score: 25,
          confidence: 0.95,
          severity: 'mild',
          reliability: 'high',
          description: 'A few small visible spots observed primarily around the chin area.'
        },
        visibleRedness: {
          type: 'visibleRedness',
          displayName: 'Visible Redness',
          score: 30,
          confidence: 0.91,
          severity: 'moderate',
          reliability: 'high',
          description: 'Mild visible flushing noted across the mid-cheek region.'
        },
        textureIrregularity: {
          type: 'textureIrregularity',
          displayName: 'Texture Smoothness',
          score: 20,
          confidence: 0.89,
          severity: 'subtle',
          reliability: 'high',
          description: 'Overall skin surface looks largely smooth with balanced hydration.'
        },
        visiblePores: {
          type: 'visiblePores',
          displayName: 'Pore Appearance',
          score: 35,
          confidence: 0.94,
          severity: 'mild',
          reliability: 'high',
          description: 'Visible pore definition primarily focused on the nose and T-zone.'
        },
        surfaceShine: {
          type: 'surfaceShine',
          displayName: 'Shine & Oiliness',
          score: 30,
          confidence: 0.92,
          severity: 'mild',
          reliability: 'high',
          description: 'Balanced surface shine observed in frontal lighting.'
        },
        visibleSpotsOrUnevenTone: {
          type: 'visibleSpotsOrUnevenTone',
          displayName: 'Tone Uniformity',
          score: 22,
          confidence: 0.90,
          severity: 'subtle',
          reliability: 'high',
          description: 'Skin tone appears predominantly even with minor variation.'
        },
        darkCircleAppearance: {
          type: 'darkCircleAppearance',
          displayName: 'Eye Area Appearance',
          score: 28,
          confidence: 0.88,
          severity: 'mild',
          reliability: 'medium',
          description: 'Soft shadowing visible under the lower orbital contour.'
        },
        fineLineAppearance: {
          type: 'fineLineAppearance',
          displayName: 'Fine Lines',
          score: 15,
          confidence: 0.87,
          severity: 'subtle',
          reliability: 'medium',
          description: 'Subtle expression lines noted during neutral repose.'
        },
        // Backward compatibility keys
        visible_blemishes: {
          type: 'visible_blemishes',
          displayName: 'Visible Blemishes',
          score: 82,
          confidence: 0.95,
          severity: 'mild',
          description: 'A few small visible spots observed primarily around the chin area.'
        },
        redness_appearance: {
          type: 'redness_appearance',
          displayName: 'Redness Appearance',
          score: 74,
          confidence: 0.91,
          severity: 'moderate',
          description: 'Mild visible flushing noted across the mid-cheek region.'
        },
        texture_smoothness: {
          type: 'texture_smoothness',
          displayName: 'Texture Smoothness',
          score: 86,
          confidence: 0.89,
          severity: 'subtle',
          description: 'Overall skin surface looks largely smooth with balanced hydration.'
        },
        visible_pores: {
          type: 'visible_pores',
          displayName: 'Pore Appearance',
          score: 79,
          confidence: 0.94,
          severity: 'mild',
          description: 'Visible pore definition primarily focused on the nose and T-zone.'
        },
        oiliness_shine_appearance: {
          type: 'oiliness_shine_appearance',
          displayName: 'Shine & Oiliness',
          score: 80,
          confidence: 0.92,
          severity: 'mild',
          description: 'Balanced surface shine observed in frontal lighting.'
        },
        uneven_tone_appearance: {
          type: 'uneven_tone_appearance',
          displayName: 'Tone Uniformity',
          score: 84,
          confidence: 0.90,
          severity: 'subtle',
          description: 'Skin tone appears predominantly even.'
        },
        dark_circle_appearance: {
          type: 'dark_circle_appearance',
          displayName: 'Eye Area Appearance',
          score: 76,
          confidence: 0.88,
          severity: 'mild',
          description: 'Soft shadowing visible under orbital contour.'
        },
        fine_line_appearance: {
          type: 'fine_line_appearance',
          displayName: 'Fine Lines',
          score: 88,
          confidence: 0.87,
          severity: 'subtle',
          description: 'Subtle expression lines noted.'
        }
      },
      baselineCosmeticScore: 81,
      topFocusAreas: [
        {
          metricType: 'visibleRedness',
          title: 'Visible Redness',
          summary: 'Mild visible redness across the cheeks.',
          suggestedRoutineFocus: 'Gentle calming barrier support with panthenol or cica.',
          priority: 1
        },
        {
          metricType: 'darkCircleAppearance',
          title: 'Eye Contour',
          summary: 'Soft under-eye shadowing.',
          suggestedRoutineFocus: 'Adequate hydration and restorative eye moisturization.',
          priority: 2
        },
        {
          metricType: 'visiblePores',
          title: 'T-Zone Pores',
          summary: 'Pore definition concentrated in T-zone.',
          suggestedRoutineFocus: 'Balanced cleansing without stripping natural lipids.',
          priority: 3
        }
      ],
      telemetry: {
        inputTokens: 11930,
        outputTokens: 800,
        thinkingTokens: 512,
        totalTokens: 12730,
        estimatedCostUsd: 0.011948,
        latencyMs: 820,
        modelId: this.modelVersion,
        pricingVersion: 'gemini-3.8-flash-intro-2026'
      }
    };
  }

  async analyzeSkin(session: ScanSession, _imageBuffer: Buffer): Promise<NormalizedSkinAnalysis> {
    return this.analyze({
      scanId: session.scanId,
      userId: session.userId,
      images: [
        {
          type: 'FULL_FRONT',
          buffer: _imageBuffer,
          mimeType: 'image/jpeg'
        }
      ]
    });
  }

  async checkHealth(): Promise<boolean> {
    return true;
  }
}
