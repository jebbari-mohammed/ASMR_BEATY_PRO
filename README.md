# ASMR Beauty Pro — Production AI Skin Coach

An enterprise-grade, privacy-first mobile skincare coach application and cloud backend for iOS and Android. Built with React Native (Expo SDK 52, TypeScript Strict) and Firebase / Google Cloud serverless architecture.

Designed to turn top-of-funnel curiosity from viral skin content channels into long-term skincare habits, subscription revenue, and trusted affiliate commerce.

---

## Key Architectural Highlights

1. **Vendor-Independent Skin Analysis (`SkinAnalysisProvider`):**
   - V1 Primary: **Perfect Corp (YouCam AI Skin Analysis API)**.
   - V2 Benchmark: **Haut.AI Face Analysis**.
   - The application domain, Firestore schemas, recommendation logic, and client UI depend exclusively on `NormalizedSkinAnalysis`. Vendor-specific transformations belong strictly in adapters.

2. **Deterministic Safety Isolation:**
   - The conversational LLM **never** decides which products are safe.
   - The deterministic `SafetyEngine` evaluates user sensitivities, current routine steps, ingredient conflict matrices (e.g. Retinoids + AHAs), and symptom escalation rules.
   - The LLM only receives pre-vetted candidate product IDs and explains why they fit.

3. **Trust-First Affiliate Economics:**
   - **Best Product Fit FIRST, Best Retail Option SECOND.**
   - Affiliate commission rate is strictly forbidden from influencing product ranking.
   - Transparent "Why This Product?" breakdown on every recommendation.
   - Prominent affiliate disclosure on all recommendation surfaces.

4. **Zero Secrets in Client:**
   - No vendor API keys or privileged credentials in the mobile bundle.
   - External requests route through Cloud Functions with secrets in Google Cloud Secret Manager.
   - Firebase App Check (App Attest & Play Integrity) enforced on all endpoints.

5. **Photo Data Minimization:**
   - Raw scan images in Cloud Storage (`transient-scans/`) are ephemeral and auto-deleted immediately post-normalization (<1 hour lifecycle).
   - Retained photos are downscaled thumbnails stored only with explicit user opt-in for 42-day comparison tracking.

---

## Monorepo Structure

```
.
├── packages/
│   ├── shared/                # Universal domain models, Zod schemas & SafetyEngine
│   │   ├── src/types/         # skin-analysis, product, routine, shelf, coach, entitlement
│   │   ├── src/schemas/       # Zod runtime validation schemas
│   │   └── src/safety/        # Deterministic SafetyEngine & adversarial test suite
│   │
│   ├── backend/               # Firebase Functions (2nd Gen) & Serverless Workers
│   │   ├── src/providers/     # Skin (Perfect Corp, Haut.AI, Mock) & AI (OpenAI)
│   │   └── src/services/      # Idempotent ScanStateMachine, Quotas & Coach
│   │
│   └── mobile/                # React Native Expo Mobile App (Editorial Clean Beauty)
│       ├── app/(tabs)/        # Today, Scan, Progress, Routine, Shelf, Coach
│       ├── app/modal/         # Spot Journal, Paywall, Why-This-Product
│       └── src/theme/         # Design tokens (colors, typography, radii, spacing)
│
├── firestore.rules            # Production deny-by-default security rules
├── storage.rules              # Authenticated, size-limited storage rules
├── firebase.json              # Firebase emulators and deployment config
└── docs/                      # Complete architecture & compliance specifications
    ├── architecture.md        # System architecture diagram & guarantees
    ├── security.md            # Authentication, App Check, storage security
    ├── threat-model.md        # 14 threat vectors and concrete mitigations
    ├── data-model.md          # Firestore collections & Cloud Storage paths
    ├── ai-safety.md           # Medical boundaries, cosmetic framing & safety pipeline
    ├── affiliate-architecture.md # Product-offer separation & commission neutrality
    ├── provider-integrations.md  # Perfect Corp, Haut.AI, OpenAI, RevenueCat
    └── release-checklist.md   # Pre-launch security & regulatory gates
```

---

## Testing & Quality Gates

Run the test suite across workspaces:

```bash
# Run shared domain & SafetyEngine tests
npm run test:shared

# Run backend provider & scan state machine tests
npm run test:backend

# Run type checks
npm run typecheck
```
