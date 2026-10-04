# Release operations

## Before rollout

1. Confirm the signed build, Firebase project, RevenueCat project, and both store app IDs all use `com.asmr.beautypro` and the RevenueCat entitlement `asmr_beaty_pro_pro`.
2. Review the [release checklist](release-checklist.md), the exact Git diff, the App Store privacy form, and Google Play Data safety form. Do not promote the app while any release gate is open.
3. Ensure `REVENUECAT_SECRET_API_KEY` and `REVENUECAT_WEBHOOK_TOKEN` have current versions in Firebase Secret Manager. Set the RevenueCat webhook URL to the deployed `onRevenueCatWebhook` endpoint and test a signed test event. Never print or commit secret values.
4. Functions, Firestore rules, Storage rules, and Hosting are deployed to `asmr-skin-coach`. Recheck live `/privacy`, `/terms`, `/support`, and `/delete-account`; verify email and paid access on signed devices before rollout.
5. Use the matching Android upload key for the version code 10 App Bundle. Keep the original keystore backed up securely. iOS build `1.0.1 (9)` is In Testing for Team `6SUDVC57MM` in the one-person owner-only TestFlight group; Android `1.0.1 (10)` is on the one-person Play internal list. Confirm the membership screen, store purchases, App Check, and deletion on physical hardware before public release.
6. Submit the first Apple subscription group with the app version. Use a verified, unprivileged reviewer account supplied through the stores' review fields.

## Beta and launch checks

- Run first install, sign-in, verification, purchase, restore, routine edit, daily log, shelf edit, reminders, account deletion, and subscription management on physical iPhone and Android devices.
- Check purchase cancellation, expiry, refund, grace period, reinstall, offline return, and account switch. Confirm Firestore denies a user immediately after verified expiration.
- Check VoiceOver, TalkBack, larger text, contrast, and smaller screens. Inspect store screenshots for actual build behavior and the no-people image rule.
- Monitor Firebase Function errors, billing verification failures, Firestore denials, sign-in/verification failures, crash-free sessions, and support inbox during closed tests and staged rollout. Do not log passwords, subscription tokens, or user routine contents.

## Local Android signing backup

The historical SDK 52 backup is outside this repository. Its release keystore and Gradle file are restricted to owner read/write (`0600`). The two release passwords were moved from that Gradle file into the macOS login Keychain under account `com.asmr.beautypro`, services `asmr-beauty-pro-android-store-password` and `asmr-beauty-pro-android-key-password`. The backup Gradle file now reads `ASMR_RELEASE_STORE_PASSWORD` and `ASMR_RELEASE_KEY_PASSWORD` from the environment. Retrieve those Keychain values into the environment before a local signed build; keep them out of command output, logs, and repository files. The keystore itself and its registered Play upload certificate were not changed.

## Rollback

- Pause staged store rollout before changing a broken release. Keep the last working signed build and Firebase ruleset available.
- For a backend defect, redeploy the last reviewed Functions and rules from a tagged commit. Avoid reopening legacy scan, coach, affiliate, or photo endpoints.
- For a billing outage, retain the hard paywall and restore path. Do not grant Pro from local storage or an unverified webhook. Post a support notice and resolve the verifier/vendor failure.
- For a privacy or deletion failure, stop promotion, preserve relevant server logs with limited access, fix the service, and verify affected requests before resuming.

**Current owner:** the project owner must assign support and rollout responsibility before public submission. Support: jabbarimed2020@gmail.com.
