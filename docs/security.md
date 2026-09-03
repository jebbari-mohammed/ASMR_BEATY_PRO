# Security & Privacy Architecture

## 1. Authentication & Session Security

- **Authentication Providers:** Sign in with Apple and Google (Native SDKs + Firebase Auth). Eliminates password handling and credential stuffing.
- **Session Tokens:** Client receives short-lived Firebase ID tokens (1-hour expiry). Refresh tokens are managed securely in platform keychain (iOS Keychain / Android Keystore) via `expo-secure-store`.
- **Sensitive Operations:** Account deletion, data purge, and subscription changes require reauthentication (`promptForCredentials`).

## 2. Firebase App Check

- **iOS:** Apple App Attest with DeviceCheck fallback.
- **Android:** Play Integrity API.
- **Server Enforcement:** Custom Cloud Functions verify `X-Firebase-AppCheck` header using the Firebase Admin SDK. Requests with invalid or missing tokens are rejected with HTTP 401.

## 3. Storage Security & Photo Minimization

- **Ephemerality by Design:** Transient scan photos are uploaded to short-lived paths with a 24-hour Cloud Storage Object Lifecycle management rule.
- **Immediate Post-Normalization Deletion:** As soon as the skin analysis provider returns structured measurements and they are normalized into Firestore, the server invokes `storage.bucket().file(...).delete()`.
- **User-Controlled Progress Photos:** Retained photos are downscaled thumbnails stored in `progress-photos/{uid}/` only with explicit user opt-in for the 42-day comparison slider. Users can delete these anytime in the Privacy Center.

## 4. Cloud Secret Management

- Secret credentials (`PERFECT_CORP_API_KEY`, `OPENAI_API_KEY`, `REVENUECAT_SECRET_API_KEY`) are stored in Google Cloud Secret Manager.
- Cloud Functions declare dependencies via `runWith({ secrets: [...] })`, injecting secrets into environment memory at runtime without persisting them to disk.
