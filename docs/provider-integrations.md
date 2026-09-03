# Third-Party Provider Integrations

## 1. Skin Analysis Engine: Perfect Corp (Primary V1) & Haut.AI (V2 Benchmark)

### Perfect Corp / YouCam AI Skin Analysis
- **Protocol:** Server-to-Server REST POST `/api/v1/skin-analysis`
- **Authentication:** `X-API-KEY` & `X-API-SECRET` from GCP Secret Manager
- **Image Handling:** Ephemeral base64 or temporary presigned GET URL with 5-minute expiry
- **Privacy Flag:** `save_image: false` passed in payload to disable vendor-side image retention
- **Latency:** 1.8s - 3.2s
- **Response Mapping:** Vendor returns 14 cosmetic indicators -> adapter normalizes scores (0-100) and maps them into `NormalizedSkinAnalysis`.

### SkinAnalysisProvider Interface
```typescript
export interface SkinAnalysisProvider {
  providerName: 'perfect_corp' | 'haut_ai' | 'mock';
  analyzeSkin(session: ScanSession, imageBuffer: Buffer): Promise<NormalizedSkinAnalysis>;
  checkHealth(): Promise<boolean>;
}
```

## 2. Conversational Reasoning: OpenAI (GPT-4o-mini / Luna)

- **Default Model:** `gpt-4o-mini` (fast, structured JSON, $0.15/1M input, $0.60/1M output).
- **Prompt Caching:** Static knowledge base and system guardrails are placed at the start of prompts to leverage 50% discount on cached inputs.
- **Strict JSON Outputs:** OpenAI `response_format: { type: "json_schema", ... }` enforces strict compliance with `StructuredCoachResponseSchema`.
- **Pre-Approved Product IDs:** Model only receives candidate IDs pre-vetted by the deterministic SafetyEngine.

## 3. Subscription & Entitlements: RevenueCat

- **Pricing:** Free up to $2,500 Monthly Tracked Revenue (MTR); 1% MTR thereafter.
- **Integration:** Mobile client uses `react-native-purchases`.
- **Webhook Security:** Server endpoint `POST /revenueCatWebhook` validates `Authorization: Bearer {REVENUECAT_WEBHOOK_AUTH_TOKEN}` and writes normalized state to `entitlements/{uid}` idempotently.
