# ASMR Beauty Pro release checklist

The live release status and evidence are in [release-readiness.md](release-readiness.md). This checklist applies to the **routine, calendar, shelf, and reminder** release. Scan, AI coach, photo journal, product scoring, and affiliate offers are excluded.

## Firebase deployment and remaining release gates

- [x] Review and deploy the current Functions, Firestore rules, Storage rules, and Hosting to `asmr-skin-coach`.
- [ ] Confirm Firebase Email/Password sign-in and email verification are enabled for both registered apps.
- [x] Confirm App Check provider registrations: Android Play Integrity, iOS App Attest and DeviceCheck are present in the production Firebase project.
- [ ] On final signed physical iPhone and Android builds, prove valid App Check tokens reach the membership callable and paid Firestore flows. Check verified/outdated request metrics for both platforms before changing service enforcement.
- [x] Deploy and verify the `accountDeletionGuards.expireAt` Firestore TTL policy (**ACTIVE**) and the `state` + `nextCheckAt` composite index (**READY**). The Cloud Scheduler API is enabled, its job is **ENABLED**, and `finalizeDeletedAccountGuards` is **ACTIVE**. A manual run logged zero due guards and zero errors on October 3, 2026.
- [ ] Test a live account deletion and a delayed RevenueCat account webhook. Confirm no user tree or entitlement is recreated, an incomplete guard has no `expireAt`, an Auth-missing cleanup-complete guard is finalized, and TTL eventually removes it.
- [ ] After signed-device QA, enable and verify App Check enforcement for Firestore and Storage, then repeat both-device flows and monitor rejected requests. The live API currently reports `UNENFORCED` for Firestore, Storage, Auth, and OAuth2; evaluate Auth/OAuth2 separately.
- [x] Confirm the RevenueCat ASMR server secret and webhook bearer token are current, and the webhook target is the deployed `onRevenueCatWebhook` URL.
- [x] Confirm the reviewed Functions, Firestore rules and indexes, Storage rules, and Hosting are live in `asmr-skin-coach`. The RevenueCat TEST webhook returned 401 without its bearer token and 200 with the configured secret; this does not verify a delayed account event.
- [x] Verify live account creation, email verification, simulator paid access, and public `https://asmr-skin-coach.web.app/privacy` and `/terms` links. Deletion was exercised on an earlier deployed flow; the current deletion-guard deployment still needs the live account test above. Production App Check remains a physical-device gate.

## Billing on both stores

- [x] Confirm annual and monthly store products are attached to RevenueCat entitlement `asmr_beaty_pro_pro` and current offering `default` in the RevenueCat dashboard. Purchase delivery on signed builds remains open.
- [ ] Complete a sandbox/closed-test purchase for each platform with the final signed build.
- [ ] Verify restore, cancellation, failed checkout, expiration, refund, grace period, reinstall, account switch, and offline return.
- [ ] Compare the displayed localized price, billing period, and any introductory offer against the store checkout sheet.

## Product and operations

- [ ] Test first run, routine edit, daily completion, calendar, shelf, reminders, sign-out, and account deletion on real small and large phones.
- [ ] Run VoiceOver and TalkBack, dynamic type, color contrast, and touch target checks.
- [ ] Publish truthful store screenshots with no people and no unshipped AI or photo claims.
- [x] Replace the App Store annual subscription description, complete monthly and group localization, and enable both products in the 175 configured regions at the existing prices. Use [saved store copy](store-metadata.md).
- [ ] Add review screenshots and submit the first subscription group with the app version after signed build and billing tests.
- [x] Publish the App Store privacy label for the actual binary and save public privacy, support, and marketing URLs.
- [x] Complete and save the Play Data safety form as a draft, including the live account-deletion URL. Submission awaits target audience, content rating, and reviewer access details.
- [ ] Complete the remaining Play content declarations and send the saved changes for review after release testing and owner approval.
- [x] Produce a signed Android release App Bundle with the registered Google Play upload certificate; verify its identity, manifest, and archive integrity.
- [x] Produce a signed iOS App Store IPA with the verified Apple Distribution certificate and profile; verify signature, entitlements, version, and archive integrity.
- [x] Upload corrected signed iOS build 7 through Transporter and add it to the one-person owner-only internal TestFlight group. App Store Connect finished processing `1.0.1 (7)` and shows it In Testing. Broken build 6 was removed from the group.
- [x] Publish signed Android code 8 App Bundle to the owner-only Play internal-test list. The validation preview had only an optional missing-deobfuscation-file warning because release minification is disabled.
- [x] Complete iOS and Android simulator QA for the paid routine, calendar, shelf, reminders, paywall, and account flows. The signed Android APK also passed offline-launch and pre-purchase smoke tests.
- [ ] Run TestFlight and Play closed testing, assign support and rollback owners, and stage the public rollout.
