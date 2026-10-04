/** Pure classification for the owner-only, read-only acquisition report. */
export const APP_TRIAL_MS = 10 * 86400000;
export const REVIEW_MAX_MS = 30 * 86400000;
export const STORE_PRODUCTS = new Set([
  'skincoach_3999_1y', 'skincoach_3999_1y:annual',
  'skincoach_699_1m', 'skincoach_699_1m:monthly'
]);

const STORE_NAMES = new Set(['app_store', 'play_store']);

export function timestampMs(value) {
  if (value && typeof value.toMillis === 'function') {
    const ms = value.toMillis();
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

export function validAppTrial(data, uid, nowMs) {
  if (!data || data.uid !== uid || data.purpose !== 'app_trial') return null;
  const started = timestampMs(data.startedAt);
  const ended = timestampMs(data.endsAt);
  return started !== null && ended !== null && started <= nowMs &&
    ended - started === APP_TRIAL_MS ? { started, active: ended > nowMs } : null;
}

export function validReviewGrant(data, uid, nowMs) {
  if (!data || data.uid !== uid || data.purpose !== 'store_review' || data.enabled !== true) return null;
  const issued = timestampMs(data.issuedAt);
  const ended = timestampMs(data.expiresAt);
  return issued !== null && ended !== null && issued <= nowMs &&
    ended > issued && ended - issued <= REVIEW_MAX_MS ? { active: ended > nowMs } : null;
}

export function activeStoreCache(data, nowMs) {
  const ended = timestampMs(data?.expiresAt);
  return data?.source === 'revenuecat_server' && data?.isPro === true &&
    (data?.tier === 'PRO_ANNUAL' || data?.tier === 'PRO_MONTHLY') &&
    (data?.status === 'active' || data?.status === 'grace_period') &&
    ended !== null && ended > nowMs;
}

function validDateMs(value) {
  if (typeof value !== 'string') return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * RevenueCat v1's subscriber snapshot is evidence of subscription state, not
 * a ledger of payments or a source for proceeds, complete refunds, or LTV.
 */
export function classifySubscriber(body, nowMs) {
  if (!body || typeof body !== 'object' || !body.subscriber ||
      typeof body.subscriber !== 'object' ||
      !body.subscriber.subscriptions || typeof body.subscriber.subscriptions !== 'object' ||
      Array.isArray(body.subscriber.subscriptions)) {
    throw new Error('Malformed RevenueCat subscriber response');
  }
  const entitlement = body.subscriber.entitlements?.asmr_beaty_pro_pro;
  const lifetimeProduct = entitlement?.expires_date === null && typeof entitlement.product_identifier === 'string'
    ? entitlement.product_identifier : null;
  const lifetimePurchases = lifetimeProduct ? body.subscriber.non_subscriptions?.[lifetimeProduct] : null;
  const activeTestStoreLifetime = Array.isArray(lifetimePurchases) && lifetimePurchases.some(purchase =>
    purchase && typeof purchase === 'object' && purchase.store === 'test_store');
  const records = [];
  for (const [product, purchase] of Object.entries(body.subscriber.subscriptions)) {
    if (!STORE_PRODUCTS.has(product) || !purchase || typeof purchase !== 'object') continue;
    const purchasedAt = validDateMs(purchase.purchase_date);
    const originalAt = validDateMs(purchase.original_purchase_date);
    const expiresAt = validDateMs(purchase.expires_date);
    if (purchasedAt === null || expiresAt === null || purchasedAt > nowMs || expiresAt <= purchasedAt) continue;
    const store = purchase.store;
    const environment = store === 'test_store' ? 'test_store' :
      purchase.is_sandbox === true ? 'sandbox' :
      purchase.is_sandbox === false && STORE_NAMES.has(store) ? 'production' : 'unknown';
    const period = ['normal', 'intro', 'trial', 'promotional'].includes(purchase.period_type)
      ? purchase.period_type : 'unknown';
    const graceAt = validDateMs(purchase.grace_period_expires_date);
    const refunded = purchase.refunded_at !== null && purchase.refunded_at !== undefined;
    const active = !refunded && (expiresAt > nowMs || (graceAt !== null && graceAt > nowMs));
    records.push({
      environment, period, active, refunded,
      ownerPurchased: purchase.ownership_type === 'PURCHASED',
      laterPurchaseRecorded: originalAt !== null && purchasedAt > originalAt,
      product
    });
  }
  const active = records.filter(record => record.active);
  return {
    hasKnownSubscription: records.length > 0,
    activeTestStoreLifetime,
    activeSandboxOrTest: activeTestStoreLifetime || active.some(record =>
      record.environment === 'sandbox' || record.environment === 'test_store'),
    activeProductionTrial: active.some(record => record.environment === 'production' && record.period === 'trial'),
    activeProductionPromotion: active.some(record => record.environment === 'production' && record.period === 'promotional'),
    activeProductionStandardPeriod: active.some(record => record.environment === 'production' &&
      record.period === 'normal' && record.ownerPurchased),
    activeProductionIntroOrUnknown: active.some(record => record.environment === 'production' &&
      (record.period === 'intro' || record.period === 'unknown' || !record.ownerPurchased)),
    activeUnknownEnvironment: active.some(record => record.environment === 'unknown'),
    refundedRecord: records.some(record => record.refunded),
    laterPurchaseRecorded: records.some(record => record.environment === 'production' &&
      record.period === 'normal' && record.ownerPurchased && record.laterPurchaseRecorded)
  };
}

export function summarizeOwnerFunnel(rows, { nowMs, days, subscriberRequested, qaManifestProvided = false }) {
  if (!Number.isFinite(nowMs) || !Number.isInteger(days) || days < 1) throw new Error('Invalid reporting window');
  const cutoff = nowMs - days * 86400000;
  const cohort = rows.filter(row => Number.isFinite(row.createdAtMs) &&
    row.createdAtMs >= cutoff && row.createdAtMs <= nowMs);
  const count = predicate => cohort.filter(predicate).length;
  const verified = cohort.filter(row => row.emailVerified && !row.disabled);
  const mature = verified.filter(row => row.createdAtMs <= nowMs - 7 * 86400000);
  const subscribers = cohort.filter(row => row.subscriber !== undefined);
  const subscriberFailures = cohort.filter(row => row.subscriberError).length;
  const subscriberComplete = subscriberRequested && subscriberFailures === 0 &&
    subscribers.length === cohort.length;
  const subscriberCount = predicate => subscriberComplete ? subscribers.filter(row => predicate(row.subscriber)).length : null;
  const knownQaSubscriberCount = predicate => subscriberComplete && qaManifestProvided
    ? subscribers.filter(row => row.knownQa === true && predicate(row.subscriber)).length : null;
  return {
    windowDays: days,
    asOf: new Date(nowMs).toISOString(),
    accountsCreated: cohort.length,
    verifiedEnabledAccounts: verified.length,
    knownQaAccounts: qaManifestProvided ? count(row => row.knownQa === true) : null,
    qaClassification: qaManifestProvided
      ? 'Only explicitly supplied QA UIDs are tagged; unmarked QA accounts may remain in all counts.'
      : 'No QA UID manifest supplied; QA accounts cannot be separated from this cohort.',
    appTrialStarted: count(row => row.appTrial?.started !== undefined),
    appTrialCurrentlyActive: count(row => row.appTrial?.active === true),
    reviewGrantCurrentlyActive: count(row => row.reviewGrant?.active === true),
    storeCacheCurrentlyActive: count(row => row.storeCacheActive === true),
    verifiedAccountsWithRoutineUseInFirstSevenCalendarDays: verified.filter(row => row.firstWeekRoutineDays > 0).length,
    matureVerifiedAccounts: mature.length,
    matureVerifiedAccountsWithThreeRoutineDays: mature.filter(row => row.firstWeekRoutineDays >= 3).length,
    revenueCatSubscriberCoverage: {
      requested: subscriberRequested,
      complete: subscriberComplete,
      fetched: subscribers.length,
      failed: subscriberFailures,
      note: 'Subscriber snapshots are not a transaction ledger; counts include known QA unless reviewed separately.'
    },
    storeEvidence: {
      knownSubscription: subscriberCount(s => s.hasKnownSubscription),
      activeTestStoreLifetime: subscriberCount(s => s.activeTestStoreLifetime),
      activeSandboxOrTest: subscriberCount(s => s.activeSandboxOrTest),
      activeProductionTrial: subscriberCount(s => s.activeProductionTrial),
      activeProductionPromotion: subscriberCount(s => s.activeProductionPromotion),
      activeProductionStandardPeriod: subscriberCount(s => s.activeProductionStandardPeriod),
      activeProductionIntroOrUnknown: subscriberCount(s => s.activeProductionIntroOrUnknown),
      activeUnknownEnvironment: subscriberCount(s => s.activeUnknownEnvironment),
      refundedRecord: subscriberCount(s => s.refundedRecord),
      laterPurchaseRecorded: subscriberCount(s => s.laterPurchaseRecorded)
    },
    knownQaStoreEvidence: {
      activeSandboxOrTest: knownQaSubscriberCount(s => s.activeSandboxOrTest),
      activeProductionStandardPeriod: knownQaSubscriberCount(s => s.activeProductionStandardPeriod)
    },
    paidConversionRate: null,
    paidConversionReason: 'Needs production transaction evidence, QA exclusion, and a complete install/acquisition denominator. Current account cohort is not an install cohort.',
    renewalRate: null,
    renewalRateReason: 'A subscriber snapshot shows only the latest period per product; use a production transaction ledger or RevenueCat retention chart for cohort renewals.',
    paidRetentionRate: null,
    paidRetentionReason: 'No mature, QA-excluded production paid cohort or complete transaction history is available.'
  };
}

export function validateRevenueMetric(body, { startDate, endDate, revenueType }) {
  if (!body || body.object !== 'revenue_metric' || body.start_date !== startDate ||
      body.end_date !== endDate || body.revenue_type !== revenueType ||
      !Number.isFinite(body.value) || !/^[A-Z]{3}$/.test(body.currency ?? '')) {
    throw new Error('Malformed RevenueCat revenue metric');
  }
  return { value: body.value, currency: body.currency };
}
