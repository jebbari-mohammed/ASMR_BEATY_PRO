import { NormalizedSkinAnalysis, ScanSession } from '@asmr/shared';

export interface SkinAnalysisProvider {
  readonly providerName: 'perfect_corp' | 'haut_ai' | 'mock' | 'internal';
  readonly modelVersion: string;

  /**
   * Analyzes standardized skin photographs and returns a normalized cosmetic profile.
   * Ephemeral: Provider implementation must NOT retain images for training.
   */
  analyzeSkin(session: ScanSession, imageBuffer: Buffer): Promise<NormalizedSkinAnalysis>;

  /**
   * Health check to detect if vendor API is experiencing downtime.
   */
  checkHealth(): Promise<boolean>;
}
