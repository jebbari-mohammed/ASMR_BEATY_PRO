import { NormalizedSkinAnalysis, ScanSession, SkinAnalysisInput } from '@asmr/shared';

export interface SkinAnalysisProvider {
  readonly providerName: string;
  readonly modelVersion: string;

  /**
   * Analyzes standardized skin photographs and crops, returning a normalized cosmetic profile.
   * Ephemeral: Provider implementation must NOT retain images for training.
   */
  analyze?(input: SkinAnalysisInput): Promise<NormalizedSkinAnalysis>;

  /**
   * Legacy / single-buffer compatibility adapter
   */
  analyzeSkin(session: ScanSession, imageBuffer: Buffer): Promise<NormalizedSkinAnalysis>;

  /**
   * Health check to detect if vendor API is experiencing downtime.
   */
  checkHealth(): Promise<boolean>;
}
