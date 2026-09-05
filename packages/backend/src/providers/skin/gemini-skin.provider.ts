import { GoogleAuth } from 'google-auth-library';
import {
  NormalizedSkinAnalysis,
  ScanSession,
  SkinAnalysisInput,
  GeminiSkinScanOutput,
  GeminiSkinScanOutputSchema,
  FocusArea,
  SkinMetricValue,
  MetricSeverity,
  buildScannerInstructionPrompt,
  SKIN_SCANNER_PROMPT_VERSION,
  SKIN_SCORING_RUBRIC_VERSION,
  CAPTURE_PROTOCOL_VERSION,
  CROP_PROTOCOL_VERSION,
  NORMALIZATION_VERSION,
  GEMINI_PRODUCTION_MODEL_ID,
  StandardizedCropType
} from '@asmr/shared';
import { SkinAnalysisProvider } from './base.provider.js';
import { calculateGeminiCostUsd, getPricingVersion } from '../../config/pricing.config.js';

export interface GeminiSkinConfig {
  apiKey?: string;
  projectId?: string;
  location?: string;
  modelId?: string;
  temperature?: number;
  thinkingLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  mediaResolution?: 'LOW' | 'MEDIUM' | 'HIGH';
}

const METRIC_DISPLAY_NAMES: Record<string, string> = {
  visibleBlemishes: 'Visible Blemishes',
  visibleRedness: 'Visible Redness',
  visiblePores: 'Pore Appearance',
  textureIrregularity: 'Texture Smoothness',
  visibleSpotsOrUnevenTone: 'Tone Evenness',
  surfaceShine: 'Surface Shine Balance',
  darkCircleAppearance: 'Under-Eye Appearance',
  fineLineAppearance: 'Fine-Line Appearance'
};

const METRIC_ROUTINE_SUGGESTIONS: Record<string, string> = {
  visibleBlemishes: 'Gentle clarifying botanical support and non-comedogenic moisture',
  visibleRedness: 'Calming barrier support with ceramides and centella',
  visiblePores: 'Gentle T-zone oil balance and daily hydration',
  textureIrregularity: 'Hydrating barrier maintenance to promote smooth micro-texture',
  visibleSpotsOrUnevenTone: 'Consistent daily broad-spectrum SPF 50 and antioxidant support',
  surfaceShine: 'Lightweight fluid hydrator to normalize surface oil production',
  darkCircleAppearance: 'Nocturnal hydration and gentle under-eye lipid recovery',
  fineLineAppearance: 'Plumping hydration and daily barrier nourishment'
};

export class GeminiSkinAnalysisProvider implements SkinAnalysisProvider {
  readonly providerName: 'gemini' = 'gemini';
  readonly modelVersion: string;
  private apiKey?: string;
  private projectId: string;
  private location: string;
  private auth: GoogleAuth;
  private temperature: number;
  private thinkingLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  private mediaResolution: 'LOW' | 'MEDIUM' | 'HIGH';

  constructor(config: GeminiSkinConfig = {}) {
    this.apiKey = config.apiKey || process.env.GEMINI_API_KEY;
    this.projectId =
      config.projectId ||
      process.env.GCLOUD_PROJECT ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      'asmr-skin-coach';
    this.location = config.location || process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
    this.modelVersion = config.modelId || process.env.GEMINI_SKIN_MODEL || GEMINI_PRODUCTION_MODEL_ID;
    this.temperature = config.temperature ?? 0.7; // Recommended Gemini default (never forced to 0)
    this.thinkingLevel = config.thinkingLevel || 'MEDIUM';
    this.mediaResolution = config.mediaResolution || 'HIGH';
    this.auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
  }

  /**
   * Primary SkinAnalysisProvider contract:
   * Analyzes standardized captures + crops and outputs NormalizedSkinAnalysis.
   */
  async analyze(input: SkinAnalysisInput): Promise<NormalizedSkinAnalysis> {
    const startTime = Date.now();
    const systemPrompt = buildScannerInstructionPrompt();

    // Prepare multimodal content parts
    const contentParts: any[] = [];

    for (const img of input.images) {
      contentParts.push({
        text: `[IMAGE_REGION_CROP: ${img.type}]`
      });
      contentParts.push({
        inlineData: {
          mimeType: img.mimeType || 'image/jpeg',
          data: img.buffer.toString('base64')
        }
      });
    }

    contentParts.push({
      text: `Standardized facial captures and region crops are provided above.
Apply SKIN_SCORING_RUBRIC_V1 to determine cosmetic metric scores (0-100) or null if unobservable.
Output strictly the required JSON object conforming to the schema.
Do NOT include any medical diagnoses, disease labels, or free-form text outside JSON.`
    });

    const responseSchema = {
      type: 'OBJECT',
      properties: {
        usable: { type: 'BOOLEAN' },
        metrics: {
          type: 'OBJECT',
          properties: {
            visibleBlemishes: {
              type: 'OBJECT',
              properties: {
                score: { type: 'NUMBER', nullable: true },
                reliability: { type: 'STRING', enum: ['high', 'medium', 'low', 'unavailable'] },
                regions: { type: 'ARRAY', items: { type: 'STRING' } }
              },
              required: ['score', 'reliability', 'regions']
            },
            visibleRedness: {
              type: 'OBJECT',
              properties: {
                score: { type: 'NUMBER', nullable: true },
                reliability: { type: 'STRING', enum: ['high', 'medium', 'low', 'unavailable'] },
                regions: { type: 'ARRAY', items: { type: 'STRING' } }
              },
              required: ['score', 'reliability', 'regions']
            },
            visiblePores: {
              type: 'OBJECT',
              properties: {
                score: { type: 'NUMBER', nullable: true },
                reliability: { type: 'STRING', enum: ['high', 'medium', 'low', 'unavailable'] },
                regions: { type: 'ARRAY', items: { type: 'STRING' } }
              },
              required: ['score', 'reliability', 'regions']
            },
            textureIrregularity: {
              type: 'OBJECT',
              properties: {
                score: { type: 'NUMBER', nullable: true },
                reliability: { type: 'STRING', enum: ['high', 'medium', 'low', 'unavailable'] },
                regions: { type: 'ARRAY', items: { type: 'STRING' } }
              },
              required: ['score', 'reliability', 'regions']
            },
            visibleSpotsOrUnevenTone: {
              type: 'OBJECT',
              properties: {
                score: { type: 'NUMBER', nullable: true },
                reliability: { type: 'STRING', enum: ['high', 'medium', 'low', 'unavailable'] },
                regions: { type: 'ARRAY', items: { type: 'STRING' } }
              },
              required: ['score', 'reliability', 'regions']
            },
            surfaceShine: {
              type: 'OBJECT',
              properties: {
                score: { type: 'NUMBER', nullable: true },
                reliability: { type: 'STRING', enum: ['high', 'medium', 'low', 'unavailable'] },
                regions: { type: 'ARRAY', items: { type: 'STRING' } }
              },
              required: ['score', 'reliability', 'regions']
            },
            darkCircleAppearance: {
              type: 'OBJECT',
              properties: {
                score: { type: 'NUMBER', nullable: true },
                reliability: { type: 'STRING', enum: ['high', 'medium', 'low', 'unavailable'] },
                regions: { type: 'ARRAY', items: { type: 'STRING' } }
              },
              required: ['score', 'reliability', 'regions']
            },
            fineLineAppearance: {
              type: 'OBJECT',
              properties: {
                score: { type: 'NUMBER', nullable: true },
                reliability: { type: 'STRING', enum: ['high', 'medium', 'low', 'unavailable'] },
                regions: { type: 'ARRAY', items: { type: 'STRING' } }
              },
              required: ['score', 'reliability', 'regions']
            }
          },
          required: [
            'visibleBlemishes',
            'visibleRedness',
            'visiblePores',
            'textureIrregularity',
            'visibleSpotsOrUnevenTone',
            'surfaceShine',
            'darkCircleAppearance',
            'fineLineAppearance'
          ]
        }
      },
      required: ['usable', 'metrics']
    };

    const requestBody = {
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [
        {
          role: 'user',
          parts: contentParts
        }
      ],
      generationConfig: {
        temperature: this.temperature,
        responseMimeType: 'application/json',
        responseSchema,
        mediaResolution: this.mediaResolution,
        thinkingConfig: {
          thinkingBudget: this.thinkingLevel === 'MEDIUM' ? 1024 : 512
        }
      },
      store: false
    };

    let rawJson: any;
    let inputTokens = 0;
    let outputTokens = 0;
    let thinkingTokens = 0;

    // First Attempt
    try {
      const callResult = await this.executeGeminiCall(requestBody);
      rawJson = callResult.json;
      inputTokens = callResult.usage.promptTokenCount || 0;
      outputTokens = callResult.usage.candidatesTokenCount || 0;
      thinkingTokens = callResult.usage.thinkingTokenCount || 0;
    } catch (firstErr: any) {
      console.warn(`[GeminiSkinProvider] Primary inference call failed: ${firstErr.message}. Retrying once...`);
      // Controlled single retry with error recovery prompt
      const retryBody = {
        ...requestBody,
        contents: [
          ...requestBody.contents,
          {
            role: 'model',
            parts: [{ text: '{"error": "invalid format"}' }]
          },
          {
            role: 'user',
            parts: [
              {
                text: 'Your previous output was unparseable or failed. Output ONLY strict JSON adhering to the schema. No markdown codeblocks or text.'
              }
            ]
          }
        ]
      };
      const retryResult = await this.executeGeminiCall(retryBody);
      rawJson = retryResult.json;
      inputTokens += retryResult.usage.promptTokenCount || 0;
      outputTokens += retryResult.usage.candidatesTokenCount || 0;
      thinkingTokens += retryResult.usage.thinkingTokenCount || 0;
    }

    // Server-Side Schema & Boundary Validation (Untrusted LLM Output)
    const validationResult = GeminiSkinScanOutputSchema.safeParse(rawJson);
    if (!validationResult.success) {
      console.error('[GeminiSkinProvider] Schema validation failure:', validationResult.error.format());
      throw new Error(`MALFORMED_GEMINI_RESPONSE: ${validationResult.error.message}`);
    }

    const scanOutput: GeminiSkinScanOutput = validationResult.data;
    const latencyMs = Date.now() - startTime;
    const estimatedCostUsd = calculateGeminiCostUsd(
      this.modelVersion,
      inputTokens,
      outputTokens,
      thinkingTokens
    );

    // Normalize output into canonical NormalizedSkinAnalysis
    return this.normalizeScanOutput(
      input.scanId,
      input.userId,
      scanOutput,
      input.images.map((i) => i.type),
      {
        inputTokens,
        outputTokens,
        thinkingTokens,
        totalTokens: inputTokens + outputTokens,
        estimatedCostUsd,
        latencyMs,
        modelId: this.modelVersion,
        pricingVersion: getPricingVersion(this.modelVersion)
      }
    );
  }

  /**
   * Adapter for legacy ScanStateMachine signature
   */
  async analyzeSkin(session: ScanSession, imageBuffer: Buffer): Promise<NormalizedSkinAnalysis> {
    const input: SkinAnalysisInput = {
      scanId: session.scanId,
      userId: session.userId,
      images: [
        {
          type: 'FULL_FRONT',
          buffer: imageBuffer,
          mimeType: 'image/jpeg'
        }
      ],
      metadata: {
        captureProtocolVersion: CAPTURE_PROTOCOL_VERSION,
        cropProtocolVersion: CROP_PROTOCOL_VERSION
      }
    };
    return this.analyze(input);
  }

  async checkHealth(): Promise<boolean> {
    return true;
  }

  private async executeGeminiCall(
    body: any
  ): Promise<{ json: any; usage: { promptTokenCount?: number; candidatesTokenCount?: number; thinkingTokenCount?: number } }> {
    let url: string;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (this.apiKey) {
      // Direct Google AI Gemini API endpoint
      url = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelVersion}:generateContent?key=${this.apiKey}`;
    } else {
      // Vertex AI in Google Cloud (IAM Token)
      const client = await this.auth.getClient();
      const accessToken = await client.getAccessToken();
      url = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.modelVersion}:generateContent`;
      headers['Authorization'] = `Bearer ${accessToken.token}`;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API HTTP ${res.status}: ${errText}`);
    }

    const resJson: any = await res.json();
    const candidate = resJson.candidates?.[0];
    const textPart = candidate?.content?.parts?.[0]?.text;

    if (!textPart) {
      throw new Error('Gemini returned empty content parts.');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(textPart);
    } catch {
      // Strip potential markdown fencing if present
      const cleaned = textPart.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    const usage = {
      promptTokenCount: resJson.usageMetadata?.promptTokenCount || 0,
      candidatesTokenCount: resJson.usageMetadata?.candidatesTokenCount || 0,
      thinkingTokenCount: resJson.usageMetadata?.thinkingTokenCount || 0
    };

    return { json: parsed, usage };
  }

  private normalizeScanOutput(
    scanId: string,
    userId: string,
    output: GeminiSkinScanOutput,
    cropsAnalyzed: StandardizedCropType[],
    telemetry: {
      inputTokens: number;
      outputTokens: number;
      thinkingTokens?: number;
      totalTokens: number;
      estimatedCostUsd: number;
      latencyMs: number;
      modelId: string;
      pricingVersion: string;
    }
  ): NormalizedSkinAnalysis {
    const metrics: Record<string, SkinMetricValue> = {};
    const candidatesForFocus: { metricKey: string; score: number; rawMetric: any }[] = [];

    for (const [key, raw] of Object.entries(output.metrics)) {
      const score = typeof raw.score === 'number' ? Math.max(0, Math.min(100, Math.round(raw.score))) : 50;
      const confidence = raw.reliability === 'high' ? 0.95 : raw.reliability === 'medium' ? 0.8 : 0.6;
      
      let severity: MetricSeverity = 'subtle';
      if (score > 70) severity = 'noticeable';
      else if (score > 45) severity = 'moderate';
      else if (score > 20) severity = 'mild';

      const displayName = METRIC_DISPLAY_NAMES[key] || key;
      const desc = `Observed ${displayName.toLowerCase()} appearance rated at ${score}/100 across visible zones.`;

      metrics[key] = {
        type: key as any,
        displayName,
        score,
        confidence,
        severity,
        reliability: raw.reliability,
        regions: raw.regions,
        description: desc
      };

      // Also set backward compatibility aliases if keys differ
      if (key === 'visibleBlemishes') metrics['visible_blemishes'] = { ...metrics[key], type: 'visible_blemishes' as any };
      if (key === 'visibleRedness') metrics['redness_appearance'] = { ...metrics[key], type: 'redness_appearance' as any };
      if (key === 'visiblePores') metrics['visible_pores'] = { ...metrics[key], type: 'visible_pores' as any };
      if (key === 'textureIrregularity') metrics['texture_smoothness'] = { ...metrics[key], type: 'texture_smoothness' as any };
      if (key === 'surfaceShine') metrics['oiliness_shine_appearance'] = { ...metrics[key], type: 'oiliness_shine_appearance' as any };
      if (key === 'visibleSpotsOrUnevenTone') metrics['uneven_tone_appearance'] = { ...metrics[key], type: 'uneven_tone_appearance' as any };
      if (key === 'darkCircleAppearance') metrics['dark_circle_appearance'] = { ...metrics[key], type: 'dark_circle_appearance' as any };
      if (key === 'fineLineAppearance') metrics['fine_line_appearance'] = { ...metrics[key], type: 'fine_line_appearance' as any };

      if (raw.reliability !== 'unavailable' && raw.score !== null) {
        candidatesForFocus.push({ metricKey: key, score, rawMetric: raw });
      }
    }

    // Sort candidates for top 3 focus areas:
    // Focus areas prioritize metrics that have the highest prominence (warranting routine care)
    candidatesForFocus.sort((a, b) => b.score - a.score);
    const top3 = candidatesForFocus.slice(0, 3);

    const topFocusAreas: FocusArea[] = top3.map((item, idx) => ({
      metricType: item.metricKey as any,
      title: METRIC_DISPLAY_NAMES[item.metricKey] || item.metricKey,
      summary: `Calibrated focus area based on observed ${METRIC_DISPLAY_NAMES[item.metricKey]?.toLowerCase()} appearance.`,
      suggestedRoutineFocus:
        METRIC_ROUTINE_SUGGESTIONS[item.metricKey] || 'Gentle daily barrier hydration and SPF protection',
      priority: (idx + 1) as 1 | 2 | 3
    }));

    // If less than 3, pad with gentle defaults
    if (topFocusAreas.length < 3) {
      topFocusAreas.push({
        metricType: 'visibleRedness' as any,
        title: 'Calming Barrier Support',
        summary: 'Consistent gentle hydration to maintain comfortable skin tone.',
        suggestedRoutineFocus: 'Gentle ceramide moisturization and sunscreen',
        priority: 3
      });
    }

    // Calculate baseline cosmetic score (calm, balanced baseline: 100 - average prominence of disruptions)
    const validScores = Object.values(output.metrics)
      .map((m) => m.score)
      .filter((s): s is number => typeof s === 'number');
    const avgDisruption =
      validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 25;
    const baselineCosmeticScore = Math.max(10, Math.min(95, Math.round(100 - avgDisruption * 0.4)));

    return {
      scanId,
      userId,
      capturedAt: new Date().toISOString(),
      provider: 'gemini',
      providerModelVersion: this.modelVersion,
      versionMetadata: {
        provider: 'gemini',
        modelId: this.modelVersion,
        scannerPromptVersion: SKIN_SCANNER_PROMPT_VERSION,
        scoringRubricVersion: SKIN_SCORING_RUBRIC_VERSION,
        captureProtocolVersion: CAPTURE_PROTOCOL_VERSION,
        cropProtocolVersion: CROP_PROTOCOL_VERSION,
        normalizationVersion: NORMALIZATION_VERSION,
        createdAt: new Date().toISOString()
      },
      anglesAnalyzed: ['front_neutral', 'left_turn', 'right_turn'],
      cropsAnalyzed,
      qualityReport: {
        isPassed: true,
        faceDetected: true,
        isCentered: true,
        lightingAcceptable: true,
        sharpnessScore: 0.92,
        neutralExpression: true,
        noSunglassesOrMajorOcclusion: true,
        failureReasons: []
      },
      metrics,
      baselineCosmeticScore,
      topFocusAreas,
      telemetry
    };
  }
}
