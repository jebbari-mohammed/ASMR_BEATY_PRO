# System Architecture — AI Skin Coach

## 1. System Overview

The AI Skin Coach application is an enterprise-grade mobile application designed to turn top-of-funnel curiosity into high-retention skincare habits, subscription revenue, and affiliate commerce.

```
+-------------------------------------------------------------------------+
|                              MOBILE CLIENT                              |
|                 (React Native / Expo SDK 52 / Strict TS)                |
|                                                                         |
|  [Today Screen]   [Guided Camera]   [My Shelf]   [Coach]   [Progress]   |
+------------------------------------+------------------------------------+
                                     |
                Firebase App Check   |   Firebase Authentication
               (App Attest / Play)   |   (Apple / Google / Email)
                                     v
+------------------------------------+------------------------------------+
|                         BACKEND SERVICES                                |
|             (Cloud Functions 2nd Gen / Serverless Node.js)              |
|                                                                         |
|  +---------------------+   +---------------------+   +---------------+  |
|  | Scan State Machine  |   |  Safety Engine      |   | Coach Service |  |
|  | (Idempotent Worker) |   | (Deterministic TS)  |   | (LLM Router)  |  |
|  +----------+----------+   +----------+----------+   +-------+-------+  |
+-------------|-------------------------|----------------------|----------+
              |                         |                      |
              v                         v                      v
    +-------------------+      +------------------+    +----------------+
    | Perfect Corp /    |      |  Product Graph   |    | OpenAI         |
    | Haut.AI Adapter   |      |  & Offers DB     |    | (GPT-4o-mini / |
    | (Server-to-Server)|      |  (Firestore)     |    |  Structured)   |
    +-------------------+      +------------------+    +----------------+
```

## 2. Key Architectural Guarantees

1. **Decoupled Skin Analysis (`SkinAnalysisProvider`):**
   The application domain, Firestore schemas, recommendation logic, and client UI depend solely on `NormalizedSkinAnalysis`. Vendor-specific transformations belong strictly in adapters (`PerfectCorpSkinProvider`, `HautAISkinProvider`). This allows swapping or fallback without refactoring the client or database.

2. **Deterministic Safety Isolation:**
   The conversational LLM **never** decides which products are safe. The deterministic `SafetyEngine` operates independently on user sensitivities, current routine steps, ingredient conflict matrices, and symptom escalation rules. The LLM only receives vetted candidate IDs and explains them.

3. **Zero Secrets in Client:**
   No vendor API keys, AI model credentials, or affiliate network secrets exist in the mobile bundle. All external third-party calls are routed through Cloud Functions with secrets managed in Google Cloud Secret Manager.

4. **Transient Photo Minimization:**
   Raw scanner images are stored ephemerally in transient Cloud Storage paths (`transient-scans/{uid}/{scanId}.jpg`) and deleted immediately upon successful normalization (<1 hour). Downscaled progress photos are retained only with explicit user opt-in.
