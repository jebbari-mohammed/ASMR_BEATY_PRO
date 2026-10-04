import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APP_TRIAL_MS, activeStoreCache, classifySubscriber, summarizeOwnerFunnel,
  validAppTrial, validReviewGrant, validateRevenueMetric
} from './owner-funnel-metrics.mjs';

const nowMs = Date.parse('2026-10-04T12:00:00Z');
const ts = ms => ({ toMillis: () => ms });
const account = {
  uid: 'qa_1', createdAtMs: nowMs - 10 * 86400000, emailVerified: true,
  disabled: false, knownQa: true, firstWeekRoutineDays: 3
};

test('app trial requires the exact ten-day lease and is separate from a store purchase', () => {
  const trial = {
    uid: 'qa_1', purpose: 'app_trial',
    startedAt: ts(nowMs - 2 * 86400000), endsAt: ts(nowMs - 2 * 86400000 + APP_TRIAL_MS)
  };
  assert.deepEqual(validAppTrial(trial, 'qa_1', nowMs), { started: nowMs - 2 * 86400000, active: true });
  assert.equal(validAppTrial({ ...trial, uid: 'other' }, 'qa_1', nowMs), null);
  assert.equal(validAppTrial({ ...trial, endsAt: ts(nowMs + 9 * 86400000) }, 'qa_1', nowMs), null);
  assert.equal(validAppTrial({ ...trial, startedAt: '2026-10-02' }, 'qa_1', nowMs), null);
});

test('review grants and server store caches have distinct validity rules', () => {
  const review = { uid: 'qa_1', purpose: 'store_review', enabled: true,
    issuedAt: ts(nowMs - 86400000), expiresAt: ts(nowMs + 86400000) };
  assert.deepEqual(validReviewGrant(review, 'qa_1', nowMs), { active: true });
  assert.equal(validReviewGrant({ ...review, enabled: false }, 'qa_1', nowMs), null);
  assert.equal(validReviewGrant({ ...review, expiresAt: ts(nowMs + 31 * 86400000) }, 'qa_1', nowMs), null);
  assert.equal(activeStoreCache({ source: 'revenuecat_server', isPro: true,
    tier: 'PRO_MONTHLY', status: 'active', expiresAt: ts(nowMs + 1) }, nowMs), true);
  assert.equal(activeStoreCache({ source: 'app_trial', isPro: true,
    tier: 'PRO_MONTHLY', status: 'active', expiresAt: ts(nowMs + 1) }, nowMs), false);
});

function subscription(overrides = {}) {
  return {
    purchase_date: '2026-10-01T00:00:00Z', original_purchase_date: '2026-09-01T00:00:00Z',
    expires_date: '2026-11-01T00:00:00Z', is_sandbox: false,
    store: 'app_store', period_type: 'normal', ownership_type: 'PURCHASED', refunded_at: null,
    ...overrides
  };
}
function subscriber(...purchases) {
  return { subscriber: { subscriptions: Object.fromEntries(purchases) } };
}

test('production standard period is separated from sandbox, trials, promotions, and family sharing', () => {
  const product = 'skincoach_699_1m';
  const live = classifySubscriber(subscriber([product, subscription()]), nowMs);
  assert.equal(live.activeProductionStandardPeriod, true);
  assert.equal(live.laterPurchaseRecorded, true);
  assert.equal(classifySubscriber(subscriber([product, subscription({ is_sandbox: true })]), nowMs)
    .activeSandboxOrTest, true);
  assert.equal(classifySubscriber(subscriber([product, subscription({ store: 'test_store' })]), nowMs)
    .activeSandboxOrTest, true);
  assert.equal(classifySubscriber(subscriber([product, subscription({ period_type: 'trial' })]), nowMs)
    .activeProductionTrial, true);
  assert.equal(classifySubscriber(subscriber([product, subscription({ period_type: 'promotional' })]), nowMs)
    .activeProductionPromotion, true);
  assert.equal(classifySubscriber(subscriber([product, subscription({ period_type: 'intro' })]), nowMs)
    .activeProductionIntroOrUnknown, true);
  assert.equal(classifySubscriber(subscriber([product, subscription({ ownership_type: 'FAMILY_SHARED' })]), nowMs)
    .activeProductionStandardPeriod, false);
});

test('a RevenueCat Test Store lifetime entitlement is testing access, not a subscription', () => {
  const product = 'test_lifetime';
  const body = {
    subscriber: {
      entitlements: { asmr_beaty_pro_pro: { product_identifier: product, expires_date: null } },
      subscriptions: {}, non_subscriptions: { [product]: [{ store: 'test_store', is_sandbox: true }] }
    }
  };
  const classified = classifySubscriber(body, nowMs);
  assert.equal(classified.activeTestStoreLifetime, true);
  assert.equal(classified.activeSandboxOrTest, true);
  assert.equal(classified.hasKnownSubscription, false);
  assert.equal(classified.activeProductionStandardPeriod, false);
});

test('refund, expiry, and missing environment never become current production purchase evidence', () => {
  const product = 'skincoach_3999_1y:annual';
  assert.equal(classifySubscriber(subscriber([product, subscription({ refunded_at: '2026-10-02T00:00:00Z' })]), nowMs)
    .activeProductionStandardPeriod, false);
  assert.equal(classifySubscriber(subscriber([product, subscription({ refunded_at: 'malformed' })]), nowMs)
    .activeProductionStandardPeriod, false);
  assert.equal(classifySubscriber(subscriber([product, subscription({ expires_date: '2026-10-03T00:00:00Z' })]), nowMs)
    .activeProductionStandardPeriod, false);
  assert.equal(classifySubscriber(subscriber([product, subscription({ is_sandbox: undefined })]), nowMs)
    .activeUnknownEnvironment, true);
  assert.equal(classifySubscriber(subscriber(['unapproved_product', subscription()]), nowMs)
    .hasKnownSubscription, false);
});

test('aggregate report withholds store totals if one subscriber fetch failed and never calls entitlement revenue', () => {
  const present = classifySubscriber(subscriber(['skincoach_699_1m', subscription()]), nowMs);
  const rows = [
    { ...account, appTrial: { started: nowMs - 2 * 86400000, active: true },
      reviewGrant: null, storeCacheActive: false, subscriber: present },
    { ...account, uid: 'other', createdAtMs: nowMs - 5 * 86400000, knownQa: false,
      firstWeekRoutineDays: 0, appTrial: null, reviewGrant: null,
      storeCacheActive: true, subscriberError: true }
  ];
  const report = summarizeOwnerFunnel(rows, { nowMs, days: 35, subscriberRequested: true, qaManifestProvided: true });
  assert.equal(report.accountsCreated, 2);
  assert.equal(report.knownQaAccounts, 1);
  assert.equal(report.appTrialStarted, 1);
  assert.equal(report.storeCacheCurrentlyActive, 1);
  assert.equal(report.storeEvidence.activeProductionStandardPeriod, null);
  assert.equal(report.paidConversionRate, null);
  assert.equal(report.renewalRate, null);
  assert.equal(report.paidRetentionRate, null);
  assert.equal(report.revenueCatSubscriberCoverage.failed, 1);
  rows[1].subscriber = classifySubscriber(subscriber(), nowMs);
  delete rows[1].subscriberError;
  const complete = summarizeOwnerFunnel(rows, { nowMs, days: 35, subscriberRequested: true, qaManifestProvided: true });
  assert.equal(complete.storeEvidence.activeProductionStandardPeriod, 1);
  assert.equal(complete.knownQaStoreEvidence.activeProductionStandardPeriod, 1);
  const withoutQaManifest = summarizeOwnerFunnel(rows, { nowMs, days: 35, subscriberRequested: true });
  assert.equal(withoutQaManifest.knownQaAccounts, null);
  assert.equal(withoutQaManifest.knownQaStoreEvidence.activeProductionStandardPeriod, null);
});

test('RevenueCat revenue response must match request range, type, and currency', () => {
  const request = { startDate: '2026-09-01', endDate: '2026-10-04', revenueType: 'proceeds' };
  const payload = { object: 'revenue_metric', start_date: request.startDate,
    end_date: request.endDate, revenue_type: 'proceeds', currency: 'USD', value: 0 };
  assert.deepEqual(validateRevenueMetric(payload, request), { value: 0, currency: 'USD' });
  assert.throws(() => validateRevenueMetric({ ...payload, revenue_type: 'revenue' }, request));
  assert.throws(() => validateRevenueMetric({ ...payload, value: '0' }, request));
});
