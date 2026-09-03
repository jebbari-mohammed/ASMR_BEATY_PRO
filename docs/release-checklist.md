# Production Release Checklist (Section 126 Definition of Done)

## Pre-Launch Security & Verification Gates

- [ ] **1. Secrets & Credentials Audit:**
  - Verify zero API keys or secrets in mobile bundle (ran automated secret scan `detect-secrets` or `trufflehog`).
  - Staging and production Firebase projects are completely separated.
  - Development debug tokens removed from production builds.

- [ ] **2. Firebase App Check Enforcement:**
  - Apple App Attest verified on physical iOS devices.
  - Play Integrity verified on physical Android devices.
  - App Check enforcement enabled on Firestore, Storage, and Cloud Functions.

- [ ] **3. Security Rules & Storage Validation:**
  - Automated security rules unit test suite passed (`npm run test:rules`).
  - Verified that client writes to `entitlements`, `usage`, `products`, `offers`, and `skinSnapshots` are strictly denied.
  - Verified user cannot read or write another user's photos or documents.

- [ ] **4. AI Safety & Recommendation Verification:**
  - Deterministic SafetyEngine unit tests passed (`npm test`).
  - Adversarial allergen, conflict, symptom escalation, and duplicate step tests passed.
  - Verified that prompt injection attempts do not alter safety filters or produce unvetted product IDs.

- [ ] **5. Unit Economics & Quota Controls:**
  - Rate limiting and monthly scan allowances enforced server-side.
  - Cloud Storage lifecycle auto-deletion rule verified for `transient-scans/`.
  - GCP Billing budgets and alerts configured.

- [ ] **6. Store Compliance & Regulatory:**
  - Google Play Health Apps declaration submitted with cosmetic classification and mandatory disclaimer.
  - Apple App Store Guideline 1.4.1 compliance verified (no medical claims, cosmetic appearance vocabulary used).
  - Apple Privacy Nutrition Label & Google Play Data Safety forms match actual ephemeral processing.
  - Prominent affiliate disclosure visible on all recommendation surfaces.

- [ ] **7. User Privacy & Right to Erasure:**
  - In-app Privacy Center allows one-tap account deletion and instant photo purge.
  - Cascading deletion verified across Firestore and Cloud Storage.
