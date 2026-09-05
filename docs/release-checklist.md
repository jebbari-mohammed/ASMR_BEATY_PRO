# Production Pre-Submission Release Checklist (Section 90)

## 1. Credentials & Secrets Security Gate
- [ ] **Zero Mobile Secrets:** Verify via grep/automated scan that no `GEMINI_API_KEY`, `FIREBASE_ADMIN_KEY`, or `REVENUECAT_SECRET_API_KEY` exists in `@asmr/mobile` or Git history.
- [ ] **Google Cloud Secret Manager:** Confirm `GEMINI_API_KEY` and `REVENUECAT_WEBHOOK_AUTH_TOKEN` are active in the production GCP project.
- [ ] **Separate Environments:** Ensure staging and production Firebase projects have isolated databases, buckets, and auth realms.

---

## 2. Firebase App Check & Security Rules
- [ ] **App Check Registration:**
  - Register Apple Team ID & Bundle Identifier (`ai.skincoach.app`) with Apple App Attest in Firebase Console.
  - Register Android SHA-256 fingerprint with Google Play Integrity in Firebase Console.
  - Switch App Check enforcement from Monitor to **Enforce** for Cloud Functions, Firestore, and Storage.
- [ ] **Firestore Rules:** Deploy `firestore.rules` and verify clients cannot write to `entitlements`, `usage`, `products`, `offers`, or `skinSnapshots`.
- [ ] **Cloud Storage Rules:** Deploy `storage.rules` and verify transient scan photos are restricted to authenticated user paths only.
- [ ] **Storage Lifecycle Rule:** Verify 24-hour auto-deletion lifecycle rule is active on Cloud Storage bucket for `users/*/scan-temp/*`.

---

## 3. Subscriptions & Payment Verification
- [ ] **App Store Connect In-App Purchases:**
  - Annual Subscription: `ai.skincoach.annual_3999` ($39.99/year)
  - Monthly Subscription: `ai.skincoach.monthly_699` ($6.99/month)
  - Subscription Group configured with localized descriptions and terms.
- [ ] **Google Play Console In-App Products:**
  - Subscription product `ai.skincoach.annual_3999` with base plan `annual-base` ($39.99/yr)
  - Subscription product `ai.skincoach.monthly_699` with base plan `monthly-base` ($6.99/mo)
- [ ] **RevenueCat Dashboard Configuration:**
  - Connect Apple App Store & Google Play service account credentials.
  - Create Entitlement `pro_access` attached to both products.
  - Configure Webhook endpoint pointing to `https://<REGION>-<PROJECT_ID>.cloudfunctions.net/onRevenueCatWebhook` with Bearer auth token matching `REVENUECAT_WEBHOOK_AUTH_TOKEN`.
- [ ] **Server Entitlement Gates:** Test mobile purchase, restore purchases, and verify that scan execution is blocked if entitlement is expired or missing.

---

## 4. AI Engine & Unit Economics
- [ ] **Gemini Model Configuration:** Verify production model pinned to `gemini-3.8-flash` with MEDIUM thinking and HIGH image resolution.
- [ ] **Quota & Cooldown:** Verify Pro users are restricted to 1 full scan every 7 days.
- [ ] **Failure Protection:** Verify that network or provider errors during analysis mark the session as `FAILED_RETRYABLE` without consuming user quota.
- [ ] **Cost Telemetry:** Confirm `ScanTelemetry` (`inputTokens`, `outputTokens`, `thinkingTokens`, `totalTokens`, `estimatedCostUsd`, `pricingVersion`) logs correctly in Cloud Logging (~$0.012/scan based on introductory rates and 10,080 visual tokens for 9 high-res crops).

---

## 5. Regulatory, Compliance & Store Guidelines
- [ ] **Cosmetic Classification Only (No Medical Claims):**
  - Verify app UI and marketing copy use purely cosmetic terminology (*visible blemishes*, *skin appearance*, *Skin Snapshot*, *cosmetic coach*).
  - Explicit disclaimer rendered on onboarding, camera, and settings:
    > *"This app provides cosmetic skincare coaching and visual observation only. It is not a medical device, does not diagnose skin conditions or diseases, and is not a substitute for professional dermatological care."*
- [ ] **Apple App Store Review Guidelines:**
  - Guideline 1.4.1 (Physical Harm / Medical Disclaimer): Prominent medical disclaimer visible before and after scan.
  - Guideline 3.1.2 (Subscriptions): Paywall shows clear billing duration, price, auto-renewal terms, and links to Terms of Service and Privacy Policy.
  - Guideline 5.1.1 (Data Collection & Account Deletion): In-app 1-click account deletion in Settings functional and verified.
- [ ] **Google Play Policies:**
  - Complete Health Apps declaration confirming cosmetic/lifestyle classification.
  - Data safety form completed indicating ephemeral selfie processing.
- [ ] **FTC & Affiliate Disclosures:**
  - Clear disclosure present on all recommendation and checkout screens:
    > *"We may earn a commission if you purchase through our links. Commission does not affect compatibility ranking."*

---

## 6. Pre-Submission Build & Seed
- [ ] **Seed Product Catalog:** Run `npm run seed -w @asmr/backend` against production Firestore to populate starter cleansers, moisturizers, treatments, and SPFs.
- [ ] **Deploy Cloud Functions:** `firebase deploy --only functions` (Node 22 runtime, 2nd Gen).
- [ ] **Deploy Security Rules:** `firebase deploy --only firestore:rules,storage:rules`.
- [ ] **Build EAS Production Binary:**
  - iOS: `eas build --platform ios --profile production`
  - Android: `eas build --platform android --profile production`
