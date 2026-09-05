# Security & Privacy Architecture (Production V1)

## 1. Authentication & Session Security

- **Authentication Providers:** Sign in with Apple and Google (Native SDKs + Firebase Auth). Eliminates custom password handling and credential stuffing risks.
- **Session Tokens:** Client receives short-lived Firebase ID tokens (1-hour expiry). Refresh tokens are managed securely in platform keychain (iOS Keychain / Android Keystore) via `expo-secure-store`.
- **Sensitive Operations:** Account deletion, data purge, and subscription modifications verify authenticated UID ownership.

## 2. Firebase App Check (Code Support vs Production Status)

- **Code Support:** FULLY IMPLEMENTED. The Scan State Machine (`ScanStateMachine`) and Cloud Functions explicitly verify incoming `X-Firebase-AppCheck` tokens via the Firebase Admin SDK before processing scans or privileged actions.
- **Supported Providers:** Apple App Attest with DeviceCheck fallback on iOS; Google Play Integrity on Android.
- **Production Status:** Code is complete. Production enforcement is **PENDING** console configuration (registering Apple Team ID, Bundle ID, and Google Play SHA-256 fingerprint in Firebase Console, then changing enforcement setting from Monitor to Enforce).

## 3. Storage Security & Photo Minimization

- **Zero Public Photo URLs:** Cloud Storage access rules (`storage.rules`) strictly deny public reads and limit access exclusively to `users/{userId}/...`.
- **Ephemerality by Design:** Transient scan photos are uploaded to short-lived paths (`users/{uid}/scan-temp/{scanId}/`) with a 24-hour Cloud Storage Object Lifecycle management auto-deletion backup.
- **Immediate Post-Normalization Deletion:** As soon as Gemini returns structured measurements and they are normalized into Firestore, the server invokes immediate deletion of the raw selfie files.
- **User-Controlled Progress Photos:** Retained photos are downscaled thumbnails stored in `users/{uid}/progress/{scanId}/` only with explicit user opt-in for the 42-day comparison slider. Users can toggle or purge these anytime in Settings.

## 4. Deny-by-Default Firestore Security

- **Client Restrictions:** Clients can never write to `entitlements`, `usage`, `products`, `offers`, or `skinSnapshots`. These are mutated strictly by backend administrative workers.
- **Per-User Isolation:** Subcollections under `users/{userId}/...` are readable and writable solely by the matching authenticated `request.auth.uid`.

## 5. Cloud Secret Management

- **Zero Secrets on Device:** The mobile bundle contains zero third-party API keys or service account tokens.
- **Secret Manager:** Gemini API keys (`GEMINI_API_KEY`) and RevenueCat webhook credentials (`REVENUECAT_WEBHOOK_AUTH_TOKEN`) are stored in Google Cloud Secret Manager.
- Cloud Functions declare dependencies via `runWith({ secrets: [...] })`, injecting credentials directly into execution memory without writing them to disk.

## 6. Complete Cascading Account Deletion (GDPR / App Store Guideline 5.1.1)

- In-app 1-click account deletion located in Settings.
- Executed via `deleteUserAccount` Cloud Function using Firebase Admin:
  1. Deletes all user documents across Firestore subcollections: `skinSnapshots`, `routines`, `shelf`, `spotJournal`, `chatThreads`, `entitlements`, `usage`.
  2. Deletes user document `users/{uid}`.
  3. Purges all associated Cloud Storage objects under `users/{uid}/`.
  4. Deletes the Firebase Authentication user record.

## 7. Gemini AI Privacy & Data Retention Scope

- **Interaction Storage Disabled:** Gemini visual inference requests specify `store: false` to disable Google Interactions API storage/state for that request.
- **Scope & Compliance:** Gemini interaction storage is disabled (`store: false`). Additional Google/Vertex logging and abuse-monitoring controls are governed by the production project configuration and applicable Google terms.
- **Data Minimization:** No PII (names, emails, user IDs, or location data) is passed to Gemini during skin analysis. Grounding tools (Search, Maps, external web tools) are disabled.
- **Direct Base64 Stream:** Visual tiles and crops are sent directly as base64 byte buffers in memory, avoiding permanent Cloud Storage public URLs or unnecessary Files API retention.
