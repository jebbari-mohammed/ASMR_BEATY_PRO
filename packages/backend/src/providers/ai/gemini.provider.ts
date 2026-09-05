import { GoogleAuth } from 'google-auth-library';
import { StructuredCoachResponse, StructuredCoachResponseSchema } from '@asmr/shared';
import { AIReasoningProvider, CoachReasoningContext } from './base.provider.js';

export interface GeminiConfig {
  apiKey?: string;
  projectId?: string;
  location?: string;
  defaultModel?: string;
  temperature?: number;
}

export class GeminiProvider implements AIReasoningProvider {
  readonly providerName = 'google_gemini';
  readonly defaultModel: string;
  private apiKey?: string;
  private projectId: string;
  private location: string;
  private temperature: number;
  private auth: GoogleAuth;

  constructor(config: GeminiConfig = {}) {
    this.apiKey = config.apiKey || process.env.GEMINI_API_KEY;
    this.projectId =
      config.projectId ||
      process.env.GCLOUD_PROJECT ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      'asmr-skin-coach';
    this.location = config.location || process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
    this.defaultModel = config.defaultModel || process.env.GEMINI_COACH_MODEL || 'gemini-3.8-flash';
    this.temperature = config.temperature ?? 0.7;
    this.auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
  }

  async generateCoachResponse(context: CoachReasoningContext): Promise<StructuredCoachResponse> {
    const systemInstruction = `You are the AI Skin Coach in a consumer skincare app.
You are NOT a doctor, dermatologist, or medical diagnostic tool.
You do NOT diagnose diseases (e.g. melanoma, eczema, cystic acne) and you do NOT prescribe treatments or cure medical conditions.
Always use cosmetic, appearance-based language ("visible redness", "blemish appearance", "surface texture").

CRITICAL BOUNDARY & SAFETY RULES:
1. If the user asks for a medical diagnosis ("Do I have melanoma?", "What is this disease?"), clearly explain your limitation as a cosmetic skin coach and advise consulting a board-certified dermatologist. Set requiresHumanCareSuggestion = true.
2. If the user reports severe pain, bleeding, infection, rapid dark mole growth, or intense swelling, set requiresHumanCareSuggestion = true and provide calm medical referral language. Zero product recommendations.
3. ALLOWED PRODUCTS CONSTRAINT: You may ONLY recommend product IDs from the allowed list provided to you: ${JSON.stringify(context.allowedCandidateProductIds)}. It is STRICTLY FORBIDDEN to recommend or output any product ID not in this list. If none are appropriate or the list is empty, return an empty candidateProductIds array. Sometimes "You don't need another product right now" is the best recommendation.
4. Respond with concise, warm, knowledgeable, human guidance. Never shame the user. Keep it natural and direct.
5. NO CAUSALITY: Never claim a product caused a reaction with certainty. Frame timing observationally.

USER CONTEXT:
- Goals: ${context.memorySummary.userGoalsSummary}
- Sensitivities: ${context.memorySummary.sensitivitiesSummary}
- Routine Adherence: ${context.memorySummary.routineAdherenceSummary}
- Latest Snapshot: ${context.latestSkinSnapshotSummary}
- Current Routine: ${context.currentRoutineSummary}
- Allowed Products: ${JSON.stringify(context.allowedCandidateDescriptions)}`;

    const userPrompt = `<user_untrusted_input>\n${context.userMessage}\n</user_untrusted_input>`;

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
        temperature: this.temperature,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            intent: { type: 'STRING' },
            summary: { type: 'STRING' },
            candidateProductIds: {
              type: 'ARRAY',
              items: { type: 'STRING' }
            },
            reasonCodes: {
              type: 'ARRAY',
              items: { type: 'STRING' }
            },
            riskFlags: {
              type: 'ARRAY',
              items: { type: 'STRING' }
            },
            requiresHumanCareSuggestion: { type: 'BOOLEAN' },
            messageToUser: { type: 'STRING' }
          },
          required: [
            'intent',
            'summary',
            'reasonCodes',
            'riskFlags',
            'requiresHumanCareSuggestion',
            'messageToUser'
          ]
        },
        thinkingConfig: {
          thinkingBudget: 512
        }
      }
    };

    let rawResponse: any;

    try {
      let url: string;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      if (this.apiKey) {
        url = `https://generativelanguage.googleapis.com/v1beta/models/${this.defaultModel}:generateContent?key=${this.apiKey}`;
      } else {
        const client = await this.auth.getClient();
        const accessToken = await client.getAccessToken();
        url = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.defaultModel}:generateContent`;
        headers['Authorization'] = `Bearer ${accessToken.token}`;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers,
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
      try {
        rawResponse = JSON.parse(textPayload);
      } catch {
        const cleaned = textPayload.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        rawResponse = JSON.parse(cleaned);
      }
    } catch (err: any) {
      console.error('[GeminiProvider Error]:', err.message || err);
      // Graceful degradation fallback
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
