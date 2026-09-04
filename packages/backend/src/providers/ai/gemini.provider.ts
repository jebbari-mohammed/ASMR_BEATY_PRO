import { StructuredCoachResponse, StructuredCoachResponseSchema } from '@asmr/shared';
import { AIReasoningProvider, CoachReasoningContext } from './base.provider.js';

export interface GeminiConfig {
  apiKey: string;
  defaultModel?: string; // default: 'gemini-1.5-flash'
}

export class GeminiProvider implements AIReasoningProvider {
  readonly providerName = 'google_gemini';
  readonly defaultModel: string;
  private apiKey: string;

  constructor(config: GeminiConfig) {
    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel || 'gemini-1.5-flash';
  }

  async generateCoachResponse(context: CoachReasoningContext): Promise<StructuredCoachResponse> {
    const systemInstruction = `You are the AI Skin Coach in a consumer skincare app.
You are NOT a doctor, dermatologist, or medical diagnostic tool.
You do NOT diagnose diseases (e.g. melanoma, eczema, cystic acne) and you do NOT prescribe treatments or cure medical conditions.
Always use cosmetic, appearance-based language ("visible redness", "blemish appearance", "surface texture").

CRITICAL BOUNDARY RULES:
1. If the user asks for a medical diagnosis ("Do I have melanoma?", "What is this disease?"), clearly explain your limitation as a cosmetic skin coach and advise consulting a board-certified dermatologist. Set requiresHumanCareSuggestion = true.
2. If the user reports severe pain, bleeding, infection, rapid dark mole growth, or intense swelling, set requiresHumanCareSuggestion = true and provide calm medical referral language. Zero product recommendations.
3. ALLOWED PRODUCTS CONSTRAINT: You may ONLY recommend product IDs from the allowed list provided to you: ${JSON.stringify(context.allowedCandidateProductIds)}. It is STRICTLY FORBIDDEN to recommend or output any product ID not in this list. If none are appropriate or the list is empty, return an empty candidateProductIds array.
4. Respond with concise, warm, knowledgeable, human guidance. Never shame the user.

USER CONTEXT:
- Goals: ${context.memorySummary.userGoalsSummary}
- Sensitivities: ${context.memorySummary.sensitivitiesSummary}
- Routine Adherence: ${context.memorySummary.routineAdherenceSummary}
- Latest Snapshot: ${context.latestSkinSnapshotSummary}
- Current Routine: ${context.currentRoutineSummary}
- Allowed Products: ${JSON.stringify(context.allowedCandidateDescriptions)}`;

    const userPrompt = `<user_untrusted_input>\n${context.userMessage}\n</user_untrusted_input>`;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.defaultModel}:generateContent?key=${this.apiKey}`;

    const body = {
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    };

    let rawResponse: any;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        throw new Error(`Gemini API returned status ${res.status}: ${await res.text()}`);
      }

      const json: any = await res.json();
      const textPayload = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textPayload) {
        throw new Error('Gemini API returned empty text part.');
      }
      rawResponse = JSON.parse(textPayload);
    } catch (err: any) {
      // Fallback graceful degradation (Section 47)
      return {
        intent: 'fallback_error',
        summary: 'Temporary AI service interruption',
        candidateProductIds: [],
        routineAdjustmentSuggestions: [],
        reasonCodes: ['SERVICE_UNAVAILABLE_FALLBACK'],
        riskFlags: [],
        requiresHumanCareSuggestion: false,
        messageToUser:
          "I'm having a brief connection delay, but your routine and skin snapshot are safe. Stick with your gentle daily routine, and check back in a moment!"
      };
    }

    // Server-Side Defense: Validate against Zod schema
    const parsed = StructuredCoachResponseSchema.parse(rawResponse);

    // Defense-in-depth: Reject any product IDs that were NOT in the server's pre-approved candidate list
    const validatedProductIds = (parsed.candidateProductIds || []).filter((pid) =>
      context.allowedCandidateProductIds.includes(pid)
    );

    return {
      ...parsed,
      candidateProductIds: validatedProductIds
    } as StructuredCoachResponse;
  }
}
