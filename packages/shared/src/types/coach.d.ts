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
    candidateProductIds?: string[];
    routineAdjustmentSuggestions?: RoutineStep[];
    reasonCodes: string[];
    riskFlags: string[];
    requiresHumanCareSuggestion: boolean;
    messageToUser: string;
}
export interface CoachUserMemorySummary {
    userId: string;
    lastUpdated: string;
    userGoalsSummary: string;
    sensitivitiesSummary: string;
    routineAdherenceSummary: string;
    recentProductsIntroduced: {
        productId: string;
        name: string;
        dateIntroduced: string;
        irritationReported: boolean;
    }[];
    lastSkinSnapshotSummary: string;
}
//# sourceMappingURL=coach.d.ts.map