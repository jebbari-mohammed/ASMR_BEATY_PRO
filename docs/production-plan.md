# ASMR Beauty Pro: premium production roadmap

Prepared 27 September 2026. This plan is based on the current workspace and the supplied App Store pages and screenshots. The screenshots are design references and competitor marketing, not product requirements or evidence that their outcome claims are true.

## Product position

**Promise:** A calm, trustworthy daily skincare companion that helps someone build a sensible routine, use the products they already own, and record changes over time.

**How we can be better:** Join the useful parts of Skin Bliss (product intelligence and routine guidance), FaceYogi (short guided rituals and motivation), and Thea (clear explanations and adaptive plans) in a quieter, more credible experience. Show why guidance was given and never invent a skin result or imply a human expert is present when there is none. The user has chosen an account-bound hard paywall after onboarding.

**Launch audience:** Adults who want a simple AM/PM skincare routine. Start with cosmetic wellness guidance. Human expert messaging, prescriptions, diagnostic claims, and dramatic face-shaping promises require separate operations, evidence, and review; they are outside V1.

## Evidence from the initial September 2026 audit (historical)

At the initial audit, the repository had an Expo/React Native app, Firebase Functions, Firestore and Storage rules, a shared safety engine, and tests for backend services. The mobile implementation then still contained prototype behavior despite production language in README and docs:

| Area | Observed state | Production action |
| --- | --- | --- |
| Face scan | `scan-service.ts` creates scores from a URI/timestamp-derived seed, saves them locally, and labels them a real optical analysis. Onboarding and Scan use timed processing animations. | Replace with a real, validated backend flow or remove numerical analysis. Never show a result on timeout alone. |
| Payments | `subscription-service.ts` grants Pro on startup and on purchase or restore failures. Local SecureStore is treated as entitlement. | Remove auto-grants; connect store purchase, RevenueCat identity, webhook, and server-side entitlement. Fail closed with a helpful retry path. |
| Identity/data | Mobile package has no Firebase client/auth integration; Today, Routine, Shelf, and parts of Progress use static or in-memory content. | Add account identity, cloud data contracts, local cache, sync, and migration; remove sample user data from normal screens. |
| Coach | Mobile `coach-ai-engine.ts` returns canned text. UI portrays a named, verified aesthetic director. | Use a clearly labeled AI coach backed by server safety checks, or ship a curated FAQ. Remove invented human credentials. |
| Privacy/deletion | Settings only resets onboarding, then claims server data is erased. Photo and reminder switches are local state. Legal links show alerts. | Wire actual deletion/export/preferences; publish real terms and privacy pages; verify erasure. |
| Security | At the initial audit, the scan callable lacked App Check enforcement and the mobile app did not use the backend. | The deployed callable code now sets `enforceAppCheck: true`; signed physical-device verification and Firestore/Storage service enforcement remain release gates. Scan remains disabled. |
| Quality | Shared/backend tests pass; mobile test script only prints success. No CI workflow was found. Five starter products are seeded. | Add mobile integration and device tests, CI, staged releases, observability, and catalog governance. |

`npm test` and mobile/backend TypeScript builds passed during this review. That confirms code compiles and the existing unit tests pass; it does not verify a working production journey. The workspace has existing uncommitted changes, which this plan does not alter.

## Current implementation status

Work started after the initial audit. The mobile app removes the legacy locally granted entitlement and refuses to synthesize a skin score from a photo URI. Firebase email accounts, App Check initialization, account-bound RevenueCat identity, a hard paywall using store-localized offerings, backend subscription verification, account deletion, cloud-backed routine logs, a real consistency calendar, and a manual product shelf are implemented. Scan and coach remain unavailable until their accuracy and safety gates pass. The old canned coach responses and synthetic default scan result have been removed from the source. The visible paid experience has four tabs: Today, Routine, Progress, and Shelf.

The app has been upgraded from Expo SDK 52 to SDK 57. Expo Doctor passes 21/21 checks after aligning Expo Router, Expo Constants, and React. iOS and Android simulator QA passed for the current paid feature set and value-first onboarding. Signed iOS build `1.0.1 (8)` is In Testing in the one-person owner TestFlight group; signed Android `1.0.1 (9)` is the latest owner-only Play internal release. Both include the current mobile account-deletion security fixes. The old Android folder is preserved at `/Users/Apple/Desktop/ASMR-BEAUTY-ANDROID-SDK52-BACKUP-20260927`. Firebase and the legal site are live. The iOS build uses a replacement Apple Distribution certificate, EAS production environment variables, and a build-time guard for purchase keys. Physical-device store sandbox testing, complete store screenshots and reviewer access, and operational checks remain before public release. The current gates are in [release-checklist.md](release-checklist.md).

A later whole-workspace dependency audit found high advisories, many through Expo/Metro tooling. The deployed backend now has a standalone lockfile and a clean production install audit with zero high or critical findings; nine moderate transitive `uuid` advisory entries remain documented in [security.md](security.md). A passing TypeScript build does not settle the device or billing release gates.

## Premium design direction

Use the existing forest green, warm porcelain, and champagne token palette as a foundation. Build a distinct editorial identity rather than copying the references' lavender/pink promotional screens. The design should feel like a high-end skincare journal: large readable type, generous space, controlled photography, precise charts, and restrained motion.

**Image rule from the user:** Use no people in promotional imagery, onboarding art, paywall art, app icon, or decorative UI. Close-up skin photos may be used only where the feature needs them, and product still lifes are preferred. The generated editorial still life and botanical app icon follow this rule. Existing competitor screenshots are reference material only; never place them in the app.

1. **Information architecture:** Prototype four primary destinations: Today, Routine, Discover, Progress. Put Scan inside Today/Progress and contextual AI help inside the relevant task. Keep Shelf inside Discover. Validate this with users before changing navigation.
2. **Daily home:** One dominant next action, AM/PM routine progress, a small recent check-in, and a clear path to the next photo. Show actual user state only; no preset streaks or synthetic day counts.
3. **Visual system:** Define a display face and a highly legible UI face with licensed fonts; 8-point spacing; consistent type, color, radii, buttons, empty states, photography, and icon rules. Reserve gold for small accents and premium moments. Use real, licensed, diverse imagery and avoid beautifying progress photos.
4. **Interaction:** Build polished loading, empty, offline, permission-denied, error, and success states. Use subtle haptics and motion with reduced-motion support. Prioritize fast navigation and one-handed routine completion.
5. **Accessibility:** Validate VoiceOver/TalkBack, dynamic text, touch targets, color contrast, screen reader labels, and camera alternatives on real devices.
6. **Design deliverables:** A screen inventory, wireframes, clickable prototype, component library, content style guide, and redline/spec for every launch flow. Review all screens at small and large phone sizes before implementation.

## V1 scope and feature priority

| Journey | V1 behavior | Acceptance criterion |
| --- | --- | --- |
| Onboarding | Goals, sensitivities, routine experience, privacy choice, optional photo, and a useful starter plan before asking for payment. | User can finish without granting camera access or buying Pro. Each permission appears only when needed. |
| Daily routine | Editable AM/PM steps, order, schedule, completion, reminders, and short step-by-step player. | State persists across app restarts and devices; reminders follow user settings; offline completions sync without duplicates. |
| Product shelf | Search/add owned product; manual entry when catalog has no match; ingredient and expiration details where verified. | Every product has source/provenance and correction flow; unknown data is identified as unknown. |
| Product guidance | Explain suitability using goals, sensitivities, existing products, and routine gaps. | No unsupported precision such as “99% match”; show factors and limitations; safety rules run server-side before recommendations. |
| Progress | Consent-based photo journal, consistent capture guidance, side-by-side comparison, subjective skin check-in, routine history. | Only real user photos appear; deletion and export work; comparisons distinguish observation from proven causation. |
| AI scan | Optional; only if validated for the supported devices, lighting, and range of skin tones. | Poor-quality photos trigger recapture; low-confidence cases abstain; no score appears without successful server response and versioned result. |
| AI coach | AI-labeled routine Q&A grounded in the user's actual plan and approved content. | Safety escalation works, unsupported claims are refused, and the coach never impersonates a clinician or named human. |
| Subscription | Clear free/Pro boundary, localized store price, purchase, restore, renewal and cancellation status. | Client access matches server/store state in purchase, expiry, refund, grace-period, offline, and restore tests. |

**After launch:** Guided facial relaxation or massage programs with expert-reviewed videos, broader product comparisons, barcode/OCR at catalog scale, weather guidance, widgets, and optional expert services. These are attractive references, but should not delay trustworthy core journeys. If guided content is added, describe it as wellness instruction and substantiate outcome claims before publication.

## Delivery sequence

Estimate: roughly **12–16 weeks** for two mobile engineers, one backend engineer, one product designer, part-time QA, and a skincare/clinical reviewer. This is a planning range, not a launch commitment. External review, catalog licensing, and AI validation can extend it.

| Phase | Time | Work and deliverable | Exit gate |
| --- | --- | --- | --- |
| 0. Truth and release freeze | Week 1 | Inventory every screen and claim; remove or feature-flag simulated scan results, fake Pro, false deletion success, placeholder links, invented expert persona, and sample progress in user flows. Map the complete V1 data journey. | No production build can display fabricated analysis or grant access without payment verification. |
| 1. Product/design specification | Weeks 1–3 | User interviews/usability tests; competitor teardown; four-tab navigation prototype; full visual system; content and photography guidelines; exact V1 screen specs. | Users can understand the first-run path and complete a routine in prototype tests; visual and accessibility review signed off. |
| 2. Platform foundation | Weeks 2–6 | Upgrade Expo incrementally to a supported stable SDK; separate staging/prod; identity; Firebase client integration; App Check; typed API/data contracts; secure uploads; persistent routine, shelf, preferences, and photo metadata; CI. | Fresh install, sign-in, backup/restore, offline sync, and cross-device restore work against staging. |
| 3. Core habit loop | Weeks 4–9 | Implement onboarding, Today, routine editor/player, reminders, shelf, journal and photo comparison from real data. Replace hardcoded states throughout. | A user can create, complete, and revisit seven days of routines and photos with no sample data appearing. |
| 4. Trustworthy intelligence and commerce | Weeks 6–11 | Connect scan and coach to backend; validate outputs and abstention; grow licensed/verified catalog; explain recommendations; wire actual purchase/restore/webhook/entitlement; complete account deletion and legal flows. | Safety, billing, privacy and failure-mode tests pass on both stores' sandbox environments. |
| 5. Hardening and launch | Weeks 10–16 | Accessibility, performance, device matrix, privacy/security review, crash and cost telemetry, load/abuse tests, TestFlight/Play closed testing, store assets, staged rollout and rollback runbook. | All launch gates below pass and a release owner signs off. |

Workstreams overlap, but phases 3–5 must not treat mocked results as complete features.

## Production architecture and operations

- **Single source of truth:** Firebase Auth identity and Firestore records for profile, routines, completions, shelf, journal, scans, and entitlements. Store secrets only in server-side secret management. The app should request data through typed repositories and show explicit freshness/offline status.
- **Scan flow:** Capture quality checks → user consent → private upload → server auth/App Check/ownership/entitlement/quota checks → provider analysis → schema and safety validation → stored versioned result → app render. Delete transient images according to the stated policy, and test retries/idempotency.
- **AI validity:** Create a review set spanning skin tones, ages, devices, lighting and common cosmetic concerns. Have qualified reviewers assess accuracy, bias, confusing outputs and false reassurance. Set minimum agreement and abstention thresholds before turning on scores. If the bar is not met, ship photo tracking and non-numeric guidance first.
- **Catalog:** Move beyond the five seeded products with licensed sources, normalized ingredient names, duplicate handling, freshness timestamps, moderation/corrections, and transparent affiliate disclosure. Do not infer safety from a product name alone.
- **Billing:** Bind RevenueCat App User ID to the authenticated UID, verify paid access against RevenueCat from the server, reconcile webhooks against current vendor state, and handle refunds/expiry/grace period. The selected product model is a hard paywall after onboarding with restore, account access, privacy, and terms available before purchase.
- **Privacy:** Minimize photo retention; make opt-in independent of subscription; support export and actual deletion of user records and stored photos; document processors and retention. The UI must reflect what the backend actually did. Review all photo, health and marketing claims with counsel/reviewer before store submission.
- **Reliability:** CI for lint/typecheck/unit/integration/UI tests, staging builds, device smoke tests, crash reporting with redacted data, performance and AI-cost dashboards, alerting, feature flags, and rollback. Do not log selfies, full prompts, or sensitive user text.

## Launch gates

All are mandatory before public release:

1. **Truth:** No placeholder scan, hardcoded personal progress, fake expert identity, unsupported result score, or fabricated testimonial remains in production paths.
2. **Billing:** Purchase, restore, expiration, refund, grace period, offline return, and failed checkout are verified on iOS and Android; backend rejects unentitled paid actions.
3. **Privacy/security:** Auth and App Check are enforced where intended; Firestore/Storage cross-user access and upload abuse tests pass; deletion/export and photo retention are verified in staging; privacy policy and Terms links open published pages.
4. **Quality:** CI green; successful end-to-end tests for first run, routine, photo, scan (if enabled), coach, billing, and deletion; no critical open defects; real-device accessibility pass. Target at least 99.5% crash-free sessions in beta and set measured latency targets from the beta baseline.
5. **Release operations:** Store listing and screenshots reflect actual functions, product/support/legal contacts work, subscriptions and disclosures are complete, analytics consent is respected, staged rollout and rollback owner are assigned.

**Suggested first build ticket:** Remove the automatic Pro grant and URI-generated scan result from production paths; replace their screens with honest unavailable/preview states until real services are connected. This is the dependency for every credible usability test and launch review.

## External reference notes

The earlier screen-library comparison and visual brief informed the premium design direction above.

- [Skin Bliss App Store page](https://apps.apple.com/us/app/skin-bliss-skincare-routines/id1385561364): face scan, routine builder/player, skin diary, product analysis, and tracking.
- [FaceYogi App Store page](https://apps.apple.com/us/app/faceyogi-face-yoga-massage/id1551099110): short guided programs, diary and motivation. Its promotional outcome claims are not adopted here.
- [Thea App Store page](https://apps.apple.com/us/app/thea-1-skincare-app/id6523434295): actual human expert offering, adaptive plan, product guidance, progress. That service model needs separate staffing and safeguards.
- [Expo SDK upgrade guidance](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/): recommends incremental SDK upgrades.
- [Apple account deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app): account deletion and subscription-management expectations.
