import type { SkinScanResult } from './scan-service';

export interface CoachReply {
  text: string;
  suggestedFollowUps?: string[];
}

/**
 * The coach is excluded from this release. Keep callers closed until a
 * reviewed service and real user data replace the former scripted replies.
 */
export class CoachAIEngine {
  static generateReply(_userPrompt: string, _scan: SkinScanResult): CoachReply {
    throw new Error('AI coaching is unavailable until a reviewed service is connected.');
  }
}
