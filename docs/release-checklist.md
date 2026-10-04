# ASMR Beauty Pro release checklist

This checklist records the current release status for the **routine, calendar, shelf, and reminder** app. The deployed controls and remaining security evidence are in [security.md](security.md). Scan, AI coach, photo journal, product scoring, and affiliate offers are excluded.

## Firebase deployment and remaining release gates

- [x] Review and deploy the current Functions, Firestore rules, Storage rules, and Hosting to `asmr-skin-coach`.
- [x] Confirm Firebase Email/Password sign-in and email verification are enabled for both registered apps. The live project-level Identity Toolkit config returned `signIn.email.enabled=true`, `passwordRequired=true`, and a configured verification-email template on October 3, 2026; both app registrations use this project. Signed-device delivery and link handling still need the physical-device checks below.
- [x] Confirm App Check provider registrations: Android Play Integrity, iOS App Attest and DeviceCheck are present in the production Firebase project.
- [ ] On final signed physical iPhone and Android builds, prove valid App Check tokens reach the membership callable and paid Firestore flows. Check verified/outdated request metrics for both platforms before changing service enforcement.
- [x] Deploy and verify the `accountDeletionGuards.expireAt` Firestore TTL policy (**ACTIVE**) and the `state` + `nextCheckAt` composite index (**READY**). The Cloud Scheduler API is enabled, its job is **ENABLED**, and `finalizeDeletedAccountGuards` is **ACTIVE**. A manual run logged zero due guards and zero errors on October 3, 2026.
- [x] Deploy the recent-login guard, subscription verification burst limit, and retry-enabled Auth deletion trigger. A disposable user deleted directly through Firebase Auth was removed from Auth, Firestore (including a nested routine and root entitlement/usage records), and Storage; its deletion guard completed with a two-hour `expireAt`.
- [ ] Test the callable account-deletion flow after fresh password reauthentication in a signed app build, then deliver a delayed RevenueCat account webhook. Confirm no user tree or entitlement is recreated, an incomplete guard has no `expireAt`, an Auth-missing cleanup-complete guard is finalized, and TTL eventually removes it.
- [ ] After signed-device QA, enable and verify App Check enforcement for Firestore and Storage, then repeat both-device flows and monitor rejected requests. The live API currently reports `UNENFORCED` for Firestore, Storage, Auth, and OAuth2; evaluate Auth/OAuth2 separately.
- [x] Confirm the RevenueCat ASMR server secret and webhook bearer token are current, and the webhook target is the deployed `onRevenueCatWebhook` URL.
- [x] Confirm the reviewed Functions, Firestore rules and indexes, Storage rules, and Hosting are live in `asmr-skin-coach`. The RevenueCat TEST webhook returned 401 without its bearer token and 200 with the configured secret; this does not verify a delayed account event.
- [x] Verify live account creation, email verification, simulator paid access, and public `https://asmr-skin-coach.web.app/privacy` and `/terms` links. The direct Auth deletion path passed the disposable live test; the current callable still needs the signed-device test above. Production App Check remains a physical-device gate.

## Billing on both stores

- [x] Confirm annual and monthly store products are attached to RevenueCat entitlement `asmr_beaty_pro_pro` and current offering `default` in the RevenueCat dashboard. Purchase delivery on signed builds remains open.
- [x] Deploy the exact-SKU, finite-expiration RevenueCat verifier and Firestore paid-access rule. Both affected Functions and the rule were updated October 3, 2026 Pacific time. The live rule text requires a future timestamp; the Test webhook returned 401 without its token and 200 with it. A read-only scan found five live entitlement records, with one Pro record carrying a timestamp expiry and none carrying a null expiry.
- [ ] Verify the deployed verifier against signed Apple and Play purchase, restore, refund, grace, and account-switch flows before public release. The authenticated membership callable requires a real signed-device App Check token, so local unit and emulator tests plus the webhook TEST event do not prove those flows.
- [ ] Complete a sandbox/closed-test purchase for each platform with the final signed build.
- [ ] Verify restore, cancellation, failed checkout, expiration, refund, grace period, reinstall, account switch, and offline return.
- [ ] Compare the displayed localized price, billing period, and any introductory offer against the store checkout sheet.

## Product and operations

- [ ] Test first run, routine edit, daily completion, calendar, shelf, reminders, sign-out, and account deletion on real small and large phones.
- [ ] Run VoiceOver and TalkBack, dynamic type, color contrast, and touch target checks.
- [ ] Publish truthful store screenshots with no people and no unshipped AI or photo claims.
- [x] Replace the App Store annual subscription description, complete monthly and group localization, and enable both products in the 175 configured regions at the existing prices. The copy is saved in App Store Connect.
- [ ] Add review screenshots and submit the first subscription group with the app version after signed build and billing tests.
- [x] Publish the App Store privacy label for the actual binary and save public privacy, support, and marketing URLs.
- [x] Complete and save the Play Data safety form as a draft, including the live account-deletion URL. Submission awaits target audience, content rating, and reviewer access details.
- [ ] Complete the remaining Play content declarations and send the saved changes for review after release testing and owner approval.
- [x] Produce a signed Android release App Bundle with the registered Google Play upload certificate; verify its identity, manifest, and archive integrity.
- [x] Produce a signed iOS App Store IPA with the verified Apple Distribution certificate and profile; verify signature, entitlements, version, and archive integrity.
- [x] Upload signed iOS build `1.0.1 (8)` through Transporter and add it to the one-person owner-only internal TestFlight group. App Store Connect shows it In Testing. Build 8 contains the recent-login and account-deletion fixes from source commit `42cff15`.
- [x] Publish signed Android `1.0.1 (9)` App Bundle to the owner-only Play internal-test list. Code 9 contains the same mobile fixes. The only Play warning concerns an optional deobfuscation file; release minification is disabled.
- [x] Complete iOS and Android simulator QA for the paid routine, calendar, shelf, reminders, paywall, and account flows. The signed Android APK also passed offline-launch and pre-purchase smoke tests.
- [ ] Install TestFlight build 8 and Play internal code 9 on physical devices. Verify App Check, sign-in, email verification, paid access, purchase and restore, routine data, sign-out, and fresh-password account deletion using disposable accounts. Then assign support and rollback owners and stage the public rollout.
