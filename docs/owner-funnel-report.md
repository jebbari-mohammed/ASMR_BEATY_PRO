# Owner funnel and revenue evidence

Run the aggregate, read-only report from the repository root:

```sh
node scripts/owner-funnel-report.mjs --project asmr-skin-coach --days 35 --use-gcloud-v1-secret
node --test scripts/owner-funnel-metrics.test.mjs
```

The command uses Firebase Application Default Credentials to read current Auth accounts, their server-owned trial, review, and Pro records, and routine logs. With `--use-gcloud-v1-secret`, it reads the existing RevenueCat v1 key from GCP Secret Manager in memory and makes only `GET /v1/subscribers/{uid}` requests. Neither the key nor UIDs or emails are printed. Without the flag, `REVENUECAT_SECRET_API_KEY` may be supplied through a secure environment, or the RevenueCat subscriber counts stay unavailable.

For a reviewed QA split, create a private UTF-8 file containing one known tester Firebase UID per line, then add `--qa-uids-file /private/path/qa-uids.txt`. Do not commit the manifest. Without it, QA classification is unavailable. Even with it, any tester omitted from the file remains in the unmarked cohort, so this is not a valid public conversion denominator.

The report separates:

| Evidence | Meaning |
| --- | --- |
| `appTrialStarted` | Exact server-owned ten-day app access lease. No store payment method or automatic charge. |
| `reviewGrantCurrentlyActive` | Temporary store-review access. No payment. |
| `storeCacheCurrentlyActive` | Recent server-verified RevenueCat access cached by the backend. May be sandbox and does not prove a payment. |
| `activeSandboxOrTest` | Current Apple/Google sandbox subscription or RevenueCat Test Store subscription/lifetime entitlement. No production revenue. |
| `activeProductionTrial`, `activeProductionPromotion` | Store trial or promotional period. Not counted as standard purchase evidence. |
| `activeProductionStandardPeriod` | Current, nonrefunded, directly purchased Apple/Google subscription in a production standard period. A subscriber snapshot still lacks the price and transaction ledger. |
| `laterPurchaseRecorded` | Latest purchase date follows original purchase date. It is not a verified renewal rate. |

The report deliberately leaves `paidConversionRate`, `renewalRate`, and `paidRetentionRate` null. Auth accounts are not installs, deleted users are absent, and current private-build QA accounts cannot be reliably removed without a complete QA manifest. RevenueCat v1 shows the latest subscription period, not a complete renewal ledger. Routine use is approximated by the first seven UTC calendar dates from signup because logs use the device's local day label.

## Cash revenue

The existing GCP `REVENUECAT_SECRET_API_KEY` is a v1 API key. [RevenueCat says v1 keys cannot call its v2 API](https://www.revenuecat.com/docs/api-v2#authentication). To enable the monetary section, create a **v2 secret key with read-only `charts_metrics:overview:read` permission** and provide it securely as `REVENUECAT_V2_READ_KEY`; also pass the RevenueCat project ID as `--revenuecat-project PROJECT_ID`. The tool then makes only two `GET /v2/projects/{id}/metrics/revenue` calls for gross revenue and proceeds over the same date range, with USD requested. [That endpoint](https://www.revenuecat.com/docs/api-v2/charts-and-metrics#get-revenue-for-a-project) covers the **entire RevenueCat project across all apps**, returns an inclusive range, and may have partial data for the current day. It uses RevenueCat's production revenue chart rather than inferring cash from entitlements.

No key value belongs in a committed file or shell history. This report never creates entitlements, grants access, changes subscriptions, or publishes releases. RevenueCat proceeds are still not profit: marketing, infrastructure, support, and other costs must be measured separately. Store financial statements remain the final payout and tax reconciliation source.

## Production dashboard snapshot

At **2026-10-04 06:53 UTC**, the [ASMR BEATY PRO RevenueCat project overview](https://app.revenuecat.com/projects/7fb9f29d/overview) showed **Sandbox data off**, **$0 revenue for the last 28 days**, **0 active subscriptions**, **0 active store trials**, and **$0 MRR**. Its chart links identified the displayed date range as 2026-09-06 through 2026-10-04. This is a time-specific dashboard observation, not an all-time financial statement or a forecast. The dashboard also displayed 22 new RevenueCat customers in that period; those are not verified app accounts, installs, or paying subscribers.

The project's REST API v2 ID is `proj7fb9f29d`. Its API keys page displayed one existing secret key labeled version 1 and no version 2 key. GCP Secret Manager likewise lists the existing v1 RevenueCat secret, not a v2 read-only key. No new credential was created.
