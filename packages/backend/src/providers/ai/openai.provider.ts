import { StructuredCoachResponse, StructuredCoachResponseSchema } from '@asmr/shared';
import { AIReasoningProvider, CoachReasoningContext } from './base.provider.js';

export interface OpenAIConfig {
  apiKey: string;
  defaultModel?: string; // default: 'gpt-4o-mini'
  organization?: string;
}

export class OpenAIProvider implements AIReasoningProvider {
  readonly providerName = 'openai';
  readonly defaultModel: string;
  private apiKey: string;

  constructor(config: OpenAIConfig) {
    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel || 'gpt-4o-mini';
  }

  async generateCoachResponse(context: CoachReasoningContext): Promise<StructuredCoachResponse> {
    const systemPrompt = `You are the AI Skin Coach in a consumer skincare app.
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

    const userPrompt = `<user_untrusted_input>
${context.userMessage}
</user_untrusted_input>`;

    let rawResponse: any;

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.defaultModel,
          temperature: 0.2,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'structured_coach_response',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  intent: { type: 'string' },
                  summary: { type: 'string' },
                  candidateProductIds: {
                    type: 'array',
                    items: { type: 'string' }
                  },
                  routineAdjustmentSuggestions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        stepId: { type: 'string' },
                        order: { type: 'number' },
                        category: { type: 'string' },
                        name: { type: 'string' },
                        productId: { type: 'string' },
                        customInstructions: { type: 'string' },
                        isActive: { type: 'boolean' }
                      },
                      required: ['stepId', 'order', 'category', 'name', 'isActive'],
                      additionalProperties: false
                    }
                  },
                  reasonCodes: {
                    type: 'array',
                    items: { type: 'string' }
                  },
                  riskFlags: {
                    type: 'array',
                    items: { type: 'string' }
                  },
                  requiresHumanCareSuggestion: { type: 'boolean' },
                  messageToUser: { type: 'string' }
                },
                required: [
                  'intent',
                  'summary',
                  'candidateProductIds',
                  'routineAdjustmentSuggestions',
                  'reasonCodes',
                  'riskFlags',
                  'requiresHumanCareSuggestion',
                  'messageToUser'
                ],
                additionalProperties: false
              }
            }
          },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ]
        })
      });

      if (!res.ok) {
        throw new Error(`OpenAI API error ${res.status}: ${await res.text()}`);
      }

      const json = (await res.json()) as any;
      rawResponse = JSON.parse(json.choices[0].message.content);
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

    // SERVER-SIDE VALIDATION: Validate with Zod
    const parsed = StructuredCoachResponseSchema.parse(rawResponse);

    // DEFENSE IN DEPTH: Strip any product IDs that were NOT in the server's pre-approved list!
    const validatedProductIds = (parsed.candidateProductIds || []).filter(id =>
      context.allowedCandidateProductIds.includes(id)
    );

    return {
      ...parsed,
      candidateProductIds: validatedProductIds
    } as StructuredCoachResponse;
  }
}
