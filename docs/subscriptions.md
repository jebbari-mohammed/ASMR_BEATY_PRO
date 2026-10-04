# Subscriptions and paid access

This document describes the routine, calendar, shelf, and reminder release. Photo analysis, AI coaching, and guided face exercise are not included in the current app or paywall.

## Products

After adult onboarding, Firebase email verification, and account sign-in, a member can explicitly start one exact ten-day period of free app access. It does not start store billing or charge automatically. When it ends, the hard paywall requires an active store subscription. The paywall displays localized prices returned by the store through RevenueCat. The intended US prices are $39.99 per year and $6.99 per month; the store controls the final price and territory availability.

| Store | Annual product | Monthly product |
| --- | --- | --- |
| Apple App Store | `skincoach_3999_1y` | `skincoach_699_1m` |
| Google Play | `skincoach_3999_1y:annual` | `skincoach_699_1m:monthly` |

Both products are in RevenueCat offering `default` and attached to the existing entitlement `asmr_beaty_pro_pro`. The default offering also contains a Test Store lifetime package. The mobile paywall filters its visible choices to annual and monthly. A purchase is not treated as active because a client says so: the Firebase callable queries RevenueCat's subscriber API for the authenticated Firebase UID, checks this entitlement and expiration, and writes a server-owned entitlement record. Firestore rules require that record and email verification to read or write paid records.

The deployed verifier checks the exact four store product identifiers above, a finite subscription expiration, refund status, and grace period. It can recognize an approved active subscription even when RevenueCat projects the separate Test Store lifetime package into the Pro entitlement. Firestore rules also require a future timestamp on the server-owned Pro cache, so a lifetime Test Store record cannot retain paid data access. The Functions and rules were deployed October 3, 2026 Pacific time; signed purchase, restore, and account-switch QA still need to confirm live behavior before public release.

## Purchase and restore

1. Firebase Auth identifies the person by UID. The app configures RevenueCat with that UID.
2. The paywall loads current store packages and shows each store-localized price and renewal period.
3. Apple or Google completes the payment. The app asks the server to verify the current RevenueCat entitlement before opening paid tabs.
4. Restore asks the store for purchases, then repeats server verification. Cancellation, expiry, refund, account switch, and grace period must be tested on signed builds before launch.
5. The RevenueCat webhook authenticates with its bearer secret and reconciles current subscriber state with RevenueCat. Webhook payloads alone are not trusted to grant Pro.

If store packages cannot load, paid purchase remains unavailable, but an eligible member can still start free app access. The paywall offers retry, restore, account switching, and legal links. If the store accepts payment but server verification has not caught up, the user can restore; the app does not grant local access as a shortcut.

For ordinary access checks, a transport failure or RevenueCat HTTP 429/5xx response can use a server-verified paid record only if its store period remains unexpired, the verification is less than six hours old, the Auth account is verified and enabled, and deletion is not in progress. HTTP 4xx errors other than 429, configuration faults, and malformed responses cannot use this fallback. Purchase and restore always require a fresh store check; an explicit refund or no-access result clears the old cache. The app rechecks access on launch and foreground as before. This six-hour limit applies to the callable fallback, not to Firestore's separate paid-data rule: Firestore relies on the server-owned record's finite store expiry and webhook reconciliation. A refund that cannot be reconciled during an outage may therefore retain direct data access until the cached store expiry.

## Release gates

- The first Apple subscription group and both products are still marked **Prepare for Submission** in App Store Connect. Apple requires the first group to be submitted with an app version. Annual/monthly descriptions and group localization now describe the shipped routine, calendar, shelf, and reminders; review screenshots and first-version submission remain open.
- Google Play annual and monthly base plans are active, but closed-test purchases on a final signed Android App Bundle remain unverified.
- Verify the exact ten-day free period, purchase, restore, cancellation, expiration, refund, grace period, reinstall, account switch, and displayed localized prices on both stores with the deployed backend.
- The RevenueCat webhook destination and server secret were confirmed after deployment. Never put server secrets in the mobile bundle.

See [release-checklist.md](release-checklist.md) for the current verification gates.
