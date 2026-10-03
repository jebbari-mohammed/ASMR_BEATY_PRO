# ASMR Beauty Pro

A premium, person-free skincare routine app for iOS and Android. This repository contains an Expo SDK 57 mobile app, Firebase Functions and security rules, shared domain code, and a small public support/legal site.

## Current mobile experience

- Seven-choice onboarding, a personalized plan reveal, a guided morning preview, email account with verification, and an account-bound hard paywall.
- Annual and monthly subscriptions displayed with the app store's localized prices. RevenueCat handles purchase and restore; the backend verifies `asmr_beaty_pro_pro` before Firestore allows paid data access.
- Editable morning and evening routines, a guided step-by-step ritual, daily checkoffs, a 14-day consistency calendar, a manual product shelf, and optional local reminders.
- In-app account deletion, privacy policy, terms, and support contact.
- Editorial art contains no people. Scan, AI coach, and photo journaling are unavailable while their safety and privacy checks are incomplete.

The app provides general cosmetic self-care information. It does not diagnose conditions or promise skin outcomes.

## Project layout

| Path | Purpose |
| --- | --- |
| `packages/mobile` | Expo Router app, React Native screens, RevenueCat and Firebase client |
| `packages/backend` | Firebase Functions, subscription verification, deletion service |
| `packages/shared` | Domain types and safety code for future validated features |
| `firestore.rules`, `storage.rules` | Client access controls |
| `hosting` | Public support, privacy, and terms pages for Firebase Hosting |
| `docs/production-plan.md` | Product plan and launch gates |

## Local verification

```bash
npm ci
npm run build
npm test
cd packages/mobile && npx expo-doctor
```

The paid Firestore rules are tested with the Firebase emulator:

```bash
JAVA_HOME=/path/to/jdk-21 firebase emulators:exec --project demo-asmr-paid-rules --only firestore 'node packages/backend/scripts/test-paid-firestore-rules.cjs'
```

For native checks, run `npx expo prebuild --platform all`, then the normal Android Gradle and iOS CocoaPods/Xcode builds. Generated `android` and `ios` folders are ignored because cloud builds use Expo's config generation.

## Release configuration

The mobile app needs Firebase service configuration files and platform-specific `EXPO_PUBLIC_RC_APPLE_API_KEY` / `EXPO_PUBLIC_RC_GOOGLE_API_KEY` values. Firebase Functions need `REVENUECAT_SECRET_API_KEY` and `REVENUECAT_WEBHOOK_TOKEN` secrets. RevenueCat's entitlement identifier is `asmr_beaty_pro_pro`.

See [production-plan.md](docs/production-plan.md), [release-readiness.md](docs/release-readiness.md), and [growth-plan.md](docs/growth-plan.md) for the remaining device, store, and commercial validation gates. A successful local build does not by itself authorize a public launch.
