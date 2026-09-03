import { NormalizedSkinAnalysis, ScanSession } from '@asmr/shared';
import { SkinAnalysisProvider } from './base.provider.js';

export class MockSkinProvider implements SkinAnalysisProvider {
  readonly providerName = 'mock';
  readonly modelVersion = 'mock-v1.0';

  async analyzeSkin(session: ScanSession, _imageBuffer: Buffer): Promise<NormalizedSkinAnalysis> {
    return {
      scanId: session.scanId,
      userId: session.userId,
      capturedAt: new Date().toISOString(),
      provider: 'mock',
      providerModelVersion: this.modelVersion,
      anglesAnalyzed: session.angles,
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
          description: 'Skin tone appears predominantly even with minor variation near the hairline.'
        },
        dark_circle_appearance: {
          type: 'dark_circle_appearance',
          displayName: 'Eye Area Appearance',
          score: 76,
          confidence: 0.88,
          severity: 'mild',
          description: 'Soft shadowing visible under the lower orbital contour.'
        },
        fine_line_appearance: {
          type: 'fine_line_appearance',
          displayName: 'Fine Lines',
          score: 88,
          confidence: 0.87,
          severity: 'subtle',
          description: 'Subtle expression lines noted during neutral repose.'
        }
      },
      baselineCosmeticScore: 81,
      topFocusAreas: [
        {
          metricType: 'redness_appearance',
          title: 'Visible Redness',
          summary: 'Mild visible redness across the cheeks.',
          suggestedRoutineFocus: 'Gentle calming barrier support with panthenol or cica.',
          priority: 1
        },
        {
          metricType: 'dark_circle_appearance',
          title: 'Eye Contour',
          summary: 'Soft under-eye shadowing.',
          suggestedRoutineFocus: 'Adequate hydration and restorative eye moisturization.',
          priority: 2
        },
        {
          metricType: 'visible_pores',
          title: 'T-Zone Pores',
          summary: 'Pore definition concentrated in T-zone.',
          suggestedRoutineFocus: 'Balanced cleansing without stripping natural lipids.',
          priority: 3
        }
      ]
    };
  }

  async checkHealth(): Promise<boolean> {
    return true;
  }
}
