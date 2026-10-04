# Subscriptions and paid access

This document describes the routine, calendar, shelf, and reminder app. Photo analysis and AI coaching are unavailable.

## Current checkout

After adult onboarding and email verification, the hard paywall loads the **server-selected RevenueCat offering**. A new trial always begins through an Apple or Google subscription checkout. The store requires a valid payment method and confirms the localized renewal price. The subscription renews automatically unless cancelled in store settings before the trial ends. The app does not collect card numbers.

The Firestore document `billingPolicy/current` controls new in-app checkout paths. `trialEnabled: false` selects RevenueCat offering `default`; `true` selects `trial_14d`. Missing or malformed configuration fails closed to `default`. Only backend operators can write this document. Use `node scripts/set-store-trial.mjs status --project asmr-skin-coach` to read it, or `on|off --project asmr-skin-coach --apply` to change it. The switch must stay off until signed-device purchase QA succeeds. Turning it off does not cancel trials already started and cannot revoke an offer presented outside the app by a store.

| Store | Standard annual | Trial annual | Monthly |
| --- | --- | --- | --- |
| App Store | `skincoach_3999_1y` | `skincoach_3999_1y_trial`, two-week introductory offer | `skincoach_699_1m` |
| Google Play | `skincoach_3999_1y:annual` | Same product, `annual:trial-14d` offer with two free weeks | `skincoach_699_1m:monthly` |

Apple enforces introductory eligibility for its subscription group. The app displays trial wording only when StoreKit confirms eligibility. Google Play verifies that the account has never subscribed to any app subscription. The Play offer has RevenueCat tag `rc-ignore-offer` so it is not selected automatically; when the backend switch is on, the app explicitly purchases `annual:trial-14d` only if the eligible free phase is returned. Otherwise it purchases the base plan and shows the store price. The Play US annual base plan currently displays $38.99; the Apple annual product is $39.99. The app uses actual store-localized prices rather than an identifier-derived price.

The trial Apple SKU, standard Apple SKUs, and Play base plans are attached to RevenueCat entitlement `asmr_beaty_pro_pro`. RevenueCat offering `trial_14d` maps the Apple trial SKU and the Play annual base plan to its annual package; both offerings include standard monthly products. The mobile app shows only annual and monthly packages, despite a separate Test Store lifetime package in the default offering.

The old ten-day **no-card** app lease is retired for new accounts: the backend `startFreeTrial` callable rejects new starts, and `getFreeTrialStatus` always reports ineligible. Existing valid leases continue until their saved end date. The app no longer offers a no-card start action.

## Server access and restore

The mobile client identifies RevenueCat with the Firebase UID. A purchase or restore calls `verifySubscriptionAccess` after the store returns. The backend independently checks RevenueCat's subscriber API, an approved product ID, the Pro entitlement, finite expiry, refund, and grace status before writing a server-owned entitlement. Firestore rules require that record and verified email for paid data. An unverified purchase stays in a Restore state and does not locally open access. The webhook authenticates with its secret and reconciles subscriber state; the payload alone never grants Pro.

Ordinary access checks can use a server-verified paid record for up to six hours only on transport failures or RevenueCat 429/5xx responses while the store period remains active. Purchase and restore require a fresh store check. Firestore's separate paid-data rule uses the finite server-owned store expiry and webhook reconciliation; a refund during an outage may retain direct data access until that expiry.

## Release gates

- The first App Store subscription group and products still need review screenshots and app-version submission. Public app release remains unchanged.
- Test the exact store checkout, trial eligibility, payment-method gate, full-price fallback, switch on/off, renewal display, purchase, restore, cancellation, expiration, refund, account switch, and backend verification on signed owner-only TestFlight and Play internal builds.
- Confirm Apple and Google store offer availability on real test accounts before enabling the backend switch. Store catalog propagation can take time.
- Do not publish the app or claim live trial availability based only on simulator or unit tests.

See [release-checklist.md](release-checklist.md) for the broader launch status.
