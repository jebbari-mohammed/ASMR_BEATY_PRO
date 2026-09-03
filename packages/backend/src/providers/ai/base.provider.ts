import { StructuredCoachResponse, CoachUserMemorySummary } from '@asmr/shared';

export interface CoachReasoningContext {
  userId: string;
  userMessage: string;
  memorySummary: CoachUserMemorySummary;
  currentRoutineSummary: string;
  latestSkinSnapshotSummary: string;
  allowedCandidateProductIds: string[]; // Strict constraint: model cannot output any product ID outside this list
  allowedCandidateDescriptions: { productId: string; name: string; brand: string; whyAllowed: string }[];
}

export interface AIReasoningProvider {
  readonly providerName: string;
  readonly defaultModel: string;

  /**
   * Generates a grounded, structured coach response strictly constrained to allowed candidates.
   */
  generateCoachResponse(context: CoachReasoningContext): Promise<StructuredCoachResponse>;
}
