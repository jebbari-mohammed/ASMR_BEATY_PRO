# Historical AI skin-coach architecture proposal

> **Status: historical proposal, not the deployed architecture.** The diagram and design principles below describe a planned scanner, coach, photo, product-graph, and affiliate system from the earlier AI concept. The October 2026 release is a routine, calendar, shelf, and reminder app on Expo SDK 57; scan, coach, private photo, and affiliate flows are disabled. Firebase email/password, server-verified RevenueCat entitlements, and account deletion are the deployed backend path. Firebase App Check service enforcement for Firestore and Storage remains pending signed physical-device QA. See [README.md](../README.md) and [security.md](security.md) for the current release.

## 1. System Overview

The AI Skin Coach application is an enterprise-grade mobile system engineered to convert top-of-funnel curiosity from viral skin macro video content into high-retention skincare habits, subscription revenue, and trusted affiliate commerce.

```
+---------------------------------------------------------------------------------+
|                                 MOBILE CLIENT                                   |
|                    (React Native / Expo SDK 52 / Strict TS)                     |
|                                                                                 |
|  [Today Screen]   [Guided Camera]   [My Shelf]   [Coach]   [Progress / Spot]    |
+---------------------------------------+-----------------------------------------+
                                        |
                   Firebase App Check   |   Firebase Authentication
                  (App Attest / Play)   |   (Apple / Google / Email)
                                        v
+---------------------------------------+-----------------------------------------+
|                            BACKEND SERVICES                                     |
|             (Cloud Functions 2nd Gen / Serverless Node 22 TypeScript)           |
|                                                                                 |
|  +------------------------+  +------------------------+  +-------------------+  |
|  |   Scan State Machine   |  |     Safety Engine      |  |   Coach Service   |  |
|  |  (7-Gate Verification) |  |   (Deterministic TS)   |  |  (Gemini 3.8 Fl.) |  |
|  +-----------+------------+  +-----------+------------+  +---------+---------+  |
+--------------|---------------------------|-------------------------|------------+
               |                           |                         |
               v                           v                         v
     +-------------------+       +--------------------+    +--------------------+
     |   Gemini 3.8 Fl.  |       |   Product Graph    |    |  Affiliate Engine  |
     |   Skin Provider   |       |   & Curated Shelf  |    | (Allowed Merchants |
     | (Structured JSON) |       |     (Firestore)    |    |   FTC Disclosure)  |
     +-------------------+       +--------------------+    +--------------------+
```

## 2. Key Architectural Principles

1. **Production Gemini 3.8 Flash Skin Analysis:**
   - Provider abstraction via `SkinAnalysisProvider` returning `NormalizedSkinAnalysis`.
   - Client and database code never interface directly with raw LLM outputs.
   - Pinned production model `gemini-3.8-flash` with MEDIUM thinking and HIGH media resolution.
   - Every completed scan logs immutable version metadata:
     - `provider = "gemini"`
     - `modelId = "gemini-3.8-flash"`
     - `scannerPromptVersion = "SKIN_SCANNER_PROMPT_V1"`
     - `scoringRubricVersion = "SKIN_SCORING_RUBRIC_V1"`
     - `captureProtocolVersion = "CAPTURE_PROTOCOL_V1"`
     - `cropProtocolVersion = "CROP_PROTOCOL_V1"`
     - `normalizationVersion = "NORMALIZATION_V1"`

2. **Zero Marginal Cost & Hard Paywall Funnel:**
   - Free on-device guided camera captures (Front + profile angles) and quality checks.
   - Hard paywall presented immediately before expensive cloud processing.
   - Scan State Machine enforces a strict 7-gate server verification before invoking Gemini.
   - Non-paying users never consume cloud AI resources.
   - 1 full scan permitted every 7 days for active subscribers.

3. **Deterministic Safety Isolation (`SafetyEngine`):**
   - The LLM **never** decides which products are safe.
   - A pure TypeScript rules engine executes deterministic checks:
     - User-reported allergens and sensitivities
     - High-risk medical symptoms (severe pain, bleeding, swelling, eye involvement) → immediate escalation to board-certified dermatologists
     - Ingredient conflict matrix (e.g., Retinoid + AHA/BHA)
     - Duplicate step protection
     - Verified catalog constraints
   - Only pre-vetted candidate product IDs are passed to the conversational coach for natural language explanation.

4. **Zero Client Secrets & App Check:**
   - All external API secrets (Gemini API keys, RevenueCat webhook authorization tokens, Firebase Admin credentials) are stored in Google Cloud Secret Manager.
   - Firebase App Check enforces that requests originate exclusively from genuine app instances (Apple App Attest on iOS, Play Integrity on Android).

5. **Data Minimization & Ephemeral Storage:**
   - Raw scan selfies are stored in private transient storage prefixes (`users/{uid}/scan-temp/{scanId}/`) and deleted immediately after normalization (<1 hour).
   - Long-term progress photo retention is strictly opt-in.
   - Full 1-click in-app account deletion satisfies GDPR / App Store data erasure requirements.
