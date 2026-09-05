/**
 * Centralized Pricing & Cost Configuration for AI inference.
 * Tracks actual token consumption and computes estimated cost in USD for gross margin analysis.
 *
 * Current Official Google Gemini 3.8 Flash Introductory Pricing:
 * - $0.75 / 1M input tokens
 * - $3.75 / 1M output tokens (including thinking tokens)
 *
 * Gemini 3 Media Resolution Token Consumption:
 * - HIGH resolution: approximately 1,120 tokens per image.
 * - Full Standard Scan Payload:
 *   - 3 Full images (Front, Left turn, Right turn)
 *   - 6 Region crops (Forehead, Left cheek, Right cheek, Nose/T-zone, Chin, Under-eye)
 *   - Total visual images = 9
 *   - Total visual tokens = 9 * 1,120 = 10,080 tokens (before text prompt).
 *   - Text prompt + scoring rubric: ~1,500 - 1,850 tokens.
 *   - Total estimated input tokens: ~11,500 - 12,000 tokens.
 *   - Structured output tokens: ~500 - 800 tokens (plus thinking budget).
 *   - Estimated cost per scan: ~$0.010 - $0.015 USD (~1 to 1.5 cents).
 */

export interface ModelPricingConfig {
  inputPerMillionTokensUsd: number;
  outputPerMillionTokensUsd: number;
  thinkingPerMillionTokensUsd: number;
  tokensPerHighResImage: number;
  pricingVersion: string;
}

export const HIGH_RES_TOKENS_PER_IMAGE = 1120;
export const STANDARD_SCAN_IMAGE_COUNT = 9;
export const STANDARD_SCAN_VISUAL_TOKENS = STANDARD_SCAN_IMAGE_COUNT * HIGH_RES_TOKENS_PER_IMAGE; // 10,080
export const STANDARD_SCAN_ESTIMATED_INPUT_TOKENS = 11930; // 10,080 visual + ~1,850 text
export const STANDARD_SCAN_ESTIMATED_OUTPUT_TOKENS = 800; // structured JSON + thinking

export const CURRENT_PRICING_VERSION = 'gemini-3.8-flash-intro-2026';

export const GEMINI_PRICING: Record<string, ModelPricingConfig> = {
  'gemini-3.8-flash': {
    inputPerMillionTokensUsd: 0.75,
    outputPerMillionTokensUsd: 3.75,
    thinkingPerMillionTokensUsd: 3.75,
    tokensPerHighResImage: HIGH_RES_TOKENS_PER_IMAGE,
    pricingVersion: CURRENT_PRICING_VERSION
  },
  'gemini-2.5-flash': {
    inputPerMillionTokensUsd: 0.30,
    outputPerMillionTokensUsd: 1.20,
    thinkingPerMillionTokensUsd: 1.20,
    tokensPerHighResImage: HIGH_RES_TOKENS_PER_IMAGE,
    pricingVersion: 'gemini-2.5-flash-std'
  }
};

/**
 * Calculates estimated cost in USD based on actual model pricing and token counts.
 * In Gemini 3 API, outputTokens (candidatesTokenCount) includes generated thinking tokens.
 * If thinkingTokens are reported separately, they are accounted for without double-counting.
 */
export function calculateGeminiCostUsd(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
  thinkingTokens: number = 0
): number {
  const pricing = GEMINI_PRICING[modelId] || GEMINI_PRICING['gemini-3.8-flash'];
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillionTokensUsd;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillionTokensUsd;
  
  return Number((inputCost + outputCost).toFixed(6));
}

/**
 * Returns the current active pricing version identifier for telemetry.
 */
export function getPricingVersion(modelId: string): string {
  return (GEMINI_PRICING[modelId] || GEMINI_PRICING['gemini-3.8-flash']).pricingVersion;
}

/**
 * Estimates baseline cost for a standard 9-image scan.
 */
export function estimateStandardScanCostUsd(modelId: string = 'gemini-3.8-flash'): number {
  return calculateGeminiCostUsd(
    modelId,
    STANDARD_SCAN_ESTIMATED_INPUT_TOKENS,
    STANDARD_SCAN_ESTIMATED_OUTPUT_TOKENS
  );
}

