# Subscriptions & Monetization Architecture (Production V1)

## 1. Business & Pricing Model

The AI Skin Coach operates on a high-margin subscription model paired with a hard paywall to prevent non-paying API abuse while maximizing visitor-to-subscriber conversion:

| Tier | Price | Equivalent | Badge | Initial Trial |
| :--- | :--- | :--- | :--- | :--- |
| **Annual (Best Value)** | **$39.99 / year** | ~$3.33 / month | `BEST VALUE` | None (Pay-First) |
| **Monthly** | **$6.99 / month** | $6.99 / month | — | None (Pay-First) |

### Why Pay-First (No Mandatory Free Trial at Launch)?
Each guided skin scan invokes Gemini 3.8 Flash with high-resolution image crops. Providing free scans before subscription exposes the backend to bot farms, sybil attacks, and unbounded marginal costs. Requiring payment before cloud execution ensures **100% positive unit contribution margin** from Day 1.

---

## 2. In-App Purchase Architecture (RevenueCat SDK + Server Webhooks)

```
[Mobile Client (react-native-purchases)]
        |
        | 1. Purchases or Restores
        v
[Apple StoreKit 2 / Google Play Billing]
        |
        | 2. Receipt / Purchase Token
        v
[RevenueCat Backend Engine]
        |
        | 3. Authenticated Webhook (Authorization: Bearer <TOKEN>)
        v
[Cloud Function: onRevenueCatWebhook]
        |
        | 4. Atomically Updates Document
        v
[Firestore: users/{uid}/entitlements/current]
        ^
        | 5. Trusted Read Only
[Scan State Machine Gate 4]
```

### Store Product Identifiers
- **Entitlement ID:** `pro_access`
- **Apple App Store (iOS):**
  - Annual: `ai.skincoach.annual_3999`
  - Monthly: `ai.skincoach.monthly_699`
- **Google Play Store (Android):**
  - Annual: `ai.skincoach.annual_3999` (Base Plan: `annual-base`)
  - Monthly: `ai.skincoach.monthly_699` (Base Plan: `monthly-base`)

---

## 3. Server-Side Entitlement Enforcement

Client subscription state is **strictly untrusted**. An attacker modifying client memory or React Native bundles to set `isPro = true` will fail at the backend.

### 7-Gate Scan Verification Pipeline:
1. **Firebase Authentication:** Token must be valid and unexpired.
2. **Firebase App Check:** Device attestation (App Attest / Play Integrity) must verify legitimate binary.
3. **Session Ownership:** Authenticated `auth.uid` must match `session.userId`.
4. **Trusted Entitlement:** `users/{uid}/entitlements/current.isActive` must be `true` and `expiresAt` in the future.
5. **Scan Quota:** Pro subscribers receive **1 guided skin scan every 7 days**.
6. **Cooldown Period:** Timestamp difference between successive scans must satisfy the 7-day cooldown (configurable via Remote Config).
7. **Idempotency:** Re-sent requests return existing cached scan results without charging or re-invoking Gemini.

### Zero Marginal Cost & Failure Protection
- If a scan fails due to network or upstream Gemini errors, **no quota is deducted**.
- The scan status enters `FAILED_RETRYABLE`, allowing the user to retry without consuming another weekly slot.

---

## 4. Webhook Lifecycle Management

The `onRevenueCatWebhook` 2nd Gen Cloud Function listens to real-time events and updates the user's entitlement state in Firestore:

- `INITIAL_PURCHASE` / `RENEWAL`: Sets `isActive: true`, updates `expiresAt`.
- `CANCELLATION`: Sets `willRenew: false`, maintains `isActive: true` until the period ends.
- `EXPIRATION`: Sets `isActive: false`.
- `BILLING_ISSUE`: Sets `inGracePeriod: true` (or triggers grace period retention notification).
- `PRODUCT_CHANGE`: Upgrades or downgrades plan tier seamlessly.

---

## 5. Mobile Subscription Experience

- **Hard Paywall Modal (`/modal/paywall`):**
  - Compelling value-stacking: Personalized Skin Snapshot, 42-Day Consistency Program, Morning/Night adaptive routine, Spot Journal, and AI Coach.
  - Transparent pricing with clear billing terms.
  - 1-tap **Restore Purchases** handling for existing subscribers.
  - Graceful "Activating your membership..." pending state if webhook propagation takes a few seconds.
