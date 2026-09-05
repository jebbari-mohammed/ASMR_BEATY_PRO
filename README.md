# ASMR Beauty Pro — Production AI Skin Coach (V1)

An enterprise-grade, secure, privacy-first personal mobile AI Skin Coach and cloud backend for iOS and Android. Built with React Native (Expo SDK 52, TypeScript Strict) and Firebase / Google Cloud serverless architecture.

Designed to turn top-of-funnel curiosity from viral skin macro content channels into daily skincare habits, high-intent subscription revenue, and trusted affiliate product purchases.

---

## 1. Core Architecture Highlights

1. **Production Gemini 3.8 Flash Skin Analysis (`GeminiSkinAnalysisProvider`):**
   - **Model:** `gemini-3.8-flash` with MEDIUM thinking and HIGH image media resolution.
   - **Structured Output:** Strict JSON output schema validated server-side against Zod schemas.
   - **Fixed Scoring Rubrics (`SKIN_SCORING_RUBRIC_V1`):** Fixed 0–100 cosmetic appearance visual anchors for all 8 metrics: `visibleBlemishes`, `visibleRedness`, `visiblePores`, `textureIrregularity`, `visibleSpotsOrUnevenTone`, `surfaceShine`, `darkCircleAppearance`, and `fineLineAppearance`.
   - **Provider Abstraction:** The entire application depends on `NormalizedSkinAnalysis`, completely isolated from raw LLM output.
   - **Full Versioning:** Every scan records `provider = "gemini"`, `modelId`, `scannerPromptVersion`, `scoringRubricVersion`, `captureProtocolVersion`, `cropProtocolVersion`, and `normalizationVersion`.
    - **Operational Telemetry:** Logs inputTokens (~11.9k with 9 high-res crops), outputTokens, thinkingTokens, totalTokens, estimatedCostUsd (~$0.012/scan based on $0.75/$3.75 introductory rates), latencyMs, modelId, and pricingVersion.

2. **Hard Conversion Funnel & Subscriptions:**
   - **Flow:** Social Install → Welcome (18+) → Choose Goals (up to 2) → Photo Privacy → Guided Camera Capture (Front + Profile turns) → Free On-Device Quality Checks → All Images Ready ("Your Skin Snapshot is ready to analyze") → **HARD PAYWALL** → Subscribe → Server Entitlement Verification → Gemini Scan → Skin Snapshot Reveal → Progressive Routine Personalization.
   - **Pricing:**
     - Annual: **$39.99/year** ($3.33/month equivalent) — Marked **BEST VALUE**
     - Monthly: **$6.99/month**
     - No mandatory free trial at launch (pay first, then execute expensive cloud scan).
   - **Zero Marginal Cost Protection:** Unauthenticated or unsubscribed users never trigger paid Gemini skin scans.

3. **Deterministic Safety Isolation (`SafetyEngine`):**
   - The conversational LLM **never** decides which products are safe.
   - The deterministic `SafetyEngine` evaluates user sensitivities, current routine steps, conservative active conflict policies (`AVOID_COMPLEX_ACTIVE_COMBINATION_V1`), and symptom escalation rules.
   - The LLM only receives pre-vetted candidate product IDs and explains why they fit.
   - Sometimes *"You don't need another product right now"* is the best recommendation.

4. **Trust-First Affiliate Economics:**
   - **Best Product Fit FIRST, Best Retail Option SECOND.**
   - Commission rates are strictly forbidden from influencing product ranking.
   - Transparent "Why This Product?" breakdown on every recommendation.
   - Phishing & open-redirect protection with strict merchant domain allowlists.
   - Mandatory disclosure: *"We may earn a commission if you purchase through our links. Commission does not affect compatibility ranking."*

5. **Security, Privacy & Data Minimization:**
   - **Zero Secrets on Device:** Gemini API keys, Firebase Admin credentials, and RevenueCat secrets live strictly in Google Cloud Secret Manager / IAM.
   - **Deny-by-Default Firestore & Storage:** User data is strictly isolated under `users/{userId}`. Entitlements and snapshots are read-only to clients and mutated only by backend.
   - **Data Minimization:** Transient scan images are deleted immediately post-normalization unless the user explicitly opted into progress photo retention.
   - **Account Deletion:** 1-click in-app deletion in Settings (GDPR & App Store compliant) completely purges Firestore records and Cloud Storage images.

---

## 2. Monorepo Structure

```
.
├── packages/
│   ├── shared/                # Universal domain models, Zod schemas, rubrics & SafetyEngine
│   │   ├── src/types/         # skin-analysis, product, routine, shelf, coach, entitlement
│   │   ├── src/schemas/       # Zod runtime validation schemas
│   │   ├── src/rubrics/       # SKIN_SCANNER_PROMPT_V1 & SKIN_SCORING_RUBRIC_V1
│   │   └── src/safety/        # Deterministic SafetyEngine & adversarial test suite
│   │
│   ├── backend/               # Firebase Functions (2nd Gen) & Serverless Workers
│   │   ├── src/providers/     # GeminiSkinAnalysisProvider, GeminiProvider (Coach), Mock
│   │   ├── src/services/      # ScanStateMachine, AffiliateResolver, AccountDeletion
│   │   ├── src/config/        # Centralized Gemini pricing & cost telemetry
│   │   ├── src/data/          # Curated starter product catalog (cleansers, moisturizers, SPF)
│   │   └── src/scripts/       # seed-catalog.ts for batch Firestore import
│   │
│   └── mobile/                # React Native Expo Mobile App (Apple Health editorial aesthetic)
│       ├── app/(tabs)/        # Today, Scan, Progress, Routine, Shelf, Coach
│       ├── app/modal/         # Paywall, Spot Journal, Settings & Account Deletion
│       ├── app/onboarding/    # Complete 24-step guided onboarding & hard paywall
│       └── src/theme/         # Design tokens (colors, typography, radii, spacing)
│
├── firestore.rules            # Deny-by-default security rules
├── storage.rules              # Authenticated, size-limited private storage rules
├── firebase.json              # Firebase emulators and deployment config
└── docs/                      # Production documentation suite
    ├── architecture.md        # Architecture overview & end-to-end data flow
    ├── security.md            # Security model, App Check, rules, and privacy
    ├── gemini-skin-analysis.md# Gemini 3.8 Flash prompt, rubrics, schema & settings
    ├── subscriptions.md       # RevenueCat integration, pricing, and entitlement checks
    ├── product-recommendations.md # SafetyEngine filtering & affiliate offer resolution
    └── release-checklist.md   # Final pre-submission checklist for App Store / Play
```

---

## 3. Testing & Verification

Run the test suite across workspaces:

```bash
# Run all tests across monorepo
npm test

# Run shared domain & SafetyEngine tests
npm run test:shared

# Run backend provider, state machine, affiliate & schema tests
npm run test:backend

# Run type checks
npm run typecheck

# Build all packages
npm run build
```
