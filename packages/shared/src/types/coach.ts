/**
 * Conversational AI Skin Coach domain models.
 * Operates on structured memory and strictly validated schemas.
 */

import { RoutineStep } from './routine.js';

export type CoachSender = 'user' | 'coach' | 'system';

export interface CoachMessage {
  messageId: string;
  conversationId: string;
  sender: CoachSender;
  content: string;
  timestamp: string;
  structuredResponse?: StructuredCoachResponse;
}

export interface StructuredCoachResponse {
  intent: string;
  summary: string;
  candidateProductIds?: string[]; // Must be in approved list provided to model
  routineAdjustmentSuggestions?: RoutineStep[];
  reasonCodes: string[];
  riskFlags: string[];
  requiresHumanCareSuggestion: boolean;
  messageToUser: string;
}

export interface CoachUserMemorySummary {
  userId: string;
  lastUpdated: string;
  userGoalsSummary: string; // e.g. "Focus on calming visible redness and maintaining barrier hydration"
  sensitivitiesSummary: string; // e.g. "Sensitive to synthetic fragrance and high % glycolic acid"
  routineAdherenceSummary: string; // e.g. "85% evening consistency, completed 14 consecutive days"
  recentProductsIntroduced: {
    productId: string;
    name: string;
    dateIntroduced: string;
    irritationReported: boolean;
  }[];
  lastSkinSnapshotSummary: string; // e.g. "Baseline score 78, top focus: redness appearance"
}
