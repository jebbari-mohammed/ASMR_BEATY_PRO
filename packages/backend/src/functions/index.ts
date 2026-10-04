import * as admin from 'firebase-admin';
import { onRequest, onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as functionsV1 from 'firebase-functions/v1';
import { AccountDeletionService } from '../services/account-deletion.service.js';
import { RevenueCatVerifier } from '../services/revenuecat-verifier.js';
import { VerifiedEntitlementStore } from '../services/verified-entitlement-store.js';
import { ReviewAccessGrant } from '../services/review-access-grant.js';
import { AppFreeTrial, TrialAccountUnavailableError } from '../services/app-free-trial.js';
import { TrialStorePreference } from '../services/trial-store-preference.js';
import { StoreAccessResolver } from '../services/store-access-resolver.js';
import { SubscriptionVerificationLimiter } from '../services/subscription-verification-limiter.js';
import { SkinFeelCheckinWriter } from '../services/skin-feel-checkin-writer.js';
import { InvalidRevenueCatWebhookError, RevenueCatWebhookReconciler } from '../services/revenuecat-webhook-reconciler.js';
import { ProductDiscoveryCatalog } from '../services/product-discovery.js';
import { requireRecentAuthentication } from './recent-auth.js';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });
const storage = admin.storage();
const deletionService = new AccountDeletionService(db, storage, admin.auth());
const entitlementStore = new VerifiedEntitlementStore(db, admin.auth());
const reviewAccessGrant = new ReviewAccessGrant(db, admin.auth());
const appFreeTrial = new AppFreeTrial(db, admin.auth());
const subscriptionVerificationLimiter = new SubscriptionVerificationLimiter(db);
const skinFeelCheckinWriter = new SkinFeelCheckinWriter(db, admin.auth());
const productDiscoveryCatalog = new ProductDiscoveryCatalog(db);
const trialStorePreference = new TrialStorePreference(
  db,
  userId => new RevenueCatVerifier(process.env.REVENUECAT_SECRET_API_KEY).verify(userId),
  (userId, verified) => entitlementStore.cache(userId, verified)
);
const storeAccessResolver = new StoreAccessResolver(
  userId => new RevenueCatVerifier(process.env.REVENUECAT_SECRET_API_KEY).verify(userId),
  (userId, verified) => entitlementStore.cache(userId, verified),
  userId => entitlementStore.recentPaidAccess(userId)
);
const webhookReconciler = new RevenueCatWebhookReconciler(
  admin.auth(),
  userId => new RevenueCatVerifier(process.env.REVENUECAT_SECRET_API_KEY).verify(userId),
  (userId, verified, eventType) => entitlementStore.cache(userId, verified, eventType)
);

/**
 * 1. RevenueCat Server-to-Server Webhook Handler
 * Verifies webhook token and writes trusted subscription state to Firestore.
 * Client state is NEVER trusted for subscription gating.
 */
export const onRevenueCatWebhook = onRequest(
  // RevenueCat disconnects after 60 seconds. At most 32 identities are
  // handled in four batches of eight, each vendor request capped at 8 seconds.
  { secrets: ['REVENUECAT_WEBHOOK_TOKEN', 'REVENUECAT_SECRET_API_KEY'], timeoutSeconds: 55 },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed.');
      return;
    }
    const authHeader = req.headers.authorization;
    const expectedToken = process.env.REVENUECAT_WEBHOOK_TOKEN;

    if (!expectedToken) {
      res.status(503).send('Webhook authentication is not configured.');
      return;
    }
    if (authHeader !== `Bearer ${expectedToken}`) {
      res.status(401).send('Unauthorized webhook signature.');
      return;
    }

    const event = req.body?.event;
    if (!event) {
      res.status(400).send('Missing event payload.');
      return;
    }

    const eventType = event.type;
    if (eventType === 'TEST') {
      res.status(200).json({ received: true, test: true });
      return;
    }

    try {
      // The event may be delayed or arrive out of order. Always reconcile with
      // RevenueCat's current state for every affected account, including both
      // sides of a transfer and Firebase UIDs present only in aliases.
      await webhookReconciler.reconcile(event);
    } catch (error) {
      if (error instanceof InvalidRevenueCatWebhookError) {
        res.status(400).send(error.message);
        return;
      }
      console.error('[Billing] Webhook reconciliation failed:', error);
      res.status(503).send('Subscription verification unavailable.');
      return;
    }

    res.status(200).json({ received: true });
  }
);

/** Verify a store purchase, active app trial, or explicit store-review grant. */
export const verifySubscriptionAccess = onCall(
  { secrets: ['REVENUECAT_SECRET_API_KEY'], enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in to verify subscription access.');
    }
    if (request.auth.token.email_verified !== true) {
      throw new HttpsError('permission-denied', 'Verify your email before accessing a membership.');
    }
    try {
      await subscriptionVerificationLimiter.consume(request.auth.uid);
      // Purchase and restore must prove a store transaction. A reviewer grant
      // is valid for app access, but cannot make a purchase look successful.
      if (request.data?.purchaseOnly !== true) {
        const reviewAccess = await reviewAccessGrant.verify(request.auth.uid);
        if (reviewAccess) return reviewAccess;
        const trialAccess = await appFreeTrial.verify(request.auth.uid);
        if (trialAccess) {
          return await trialStorePreference.current(request.auth.uid) ?? trialAccess;
        }
      }
      return await storeAccessResolver.current(request.auth.uid, request.data?.purchaseOnly === true);
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      if (error instanceof TrialAccountUnavailableError) {
        throw new HttpsError('failed-precondition', error.message);
      }
      console.error('[Billing] Subscription verification unavailable:', error);
      throw new HttpsError('unavailable', 'Subscription verification is temporarily unavailable.');
    }
  }
);

/** An account can see its one-time, no-billing trial status before choosing. */
export const getFreeTrialStatus = onCall({ enforceAppCheck: true }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to view free access.');
  if (request.auth.token.email_verified !== true) {
    throw new HttpsError('permission-denied', 'Verify your email before starting free access.');
  }
  try {
    await subscriptionVerificationLimiter.consume(request.auth.uid);
    return await appFreeTrial.status(request.auth.uid);
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    if (error instanceof TrialAccountUnavailableError) {
      throw new HttpsError('failed-precondition', error.message);
    }
    console.error('[Trial] Status unavailable:', error);
    throw new HttpsError('unavailable', 'Free access status is temporarily unavailable.');
  }
});

/** Start exactly ten days of free app access without initiating a store charge. */
export const startFreeTrial = onCall({ enforceAppCheck: true }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to start free access.');
  if (request.auth.token.email_verified !== true) {
    throw new HttpsError('permission-denied', 'Verify your email before starting free access.');
  }
  try {
    await subscriptionVerificationLimiter.consume(request.auth.uid);
    return await appFreeTrial.start(request.auth.uid);
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    if (error instanceof TrialAccountUnavailableError) {
      throw new HttpsError('failed-precondition', error.message);
    }
    console.error('[Trial] Start failed:', error);
    throw new HttpsError('unavailable', 'Free access could not be started. Please try again.');
  }
});

/**
 * 2. Skin analysis remains unavailable until independent accuracy and bias
 * validation supports consumer-facing results.
 */
export const processSkinScanSession = onCall({ enforceAppCheck: true, secrets: [] }, async () => {
  throw new HttpsError('failed-precondition', 'Skin analysis is not available in this release.');
});

/** Legacy AI coaching is unavailable in this routine-only release. */
export const chatWithSkinCoach = onCall({ enforceAppCheck: true, secrets: [] }, async () => {
  throw new HttpsError('failed-precondition', 'Skin coach is unavailable while safety validation is in progress.');
});

/** Legacy affiliate resolution is disabled until the product catalog is live. */
export const resolveAffiliateOffer = onCall({ enforceAppCheck: true }, async () => {
  throw new HttpsError('failed-precondition', 'Partner offers are not available in this release.');
});

/** Public editorial product discovery for a signed-in, verified app account. */
export const getProductDiscovery = onCall({ enforceAppCheck: true }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to view product ideas.');
  if (request.auth.token.email_verified !== true) {
    throw new HttpsError('permission-denied', 'Verify your email before viewing product ideas.');
  }
  if (request.data == null || typeof request.data !== 'object' || Array.isArray(request.data) ||
      Object.keys(request.data).length !== 0) {
    throw new HttpsError('invalid-argument', 'This catalog does not accept personal filters.');
  }
  // This read-only list is not personalized and contains no private account
  // data; the paid My Shelf UI keeps its separate membership gate.
  return productDiscoveryCatalog.list();
});

/** Save or remove today's fixed-choice self-report with a server-owned TTL. */
export const changeSkinFeelCheckin = onCall({ enforceAppCheck: true }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to check in.');
  if (request.auth.token.email_verified !== true) {
    throw new HttpsError('permission-denied', 'Verify your email before checking in.');
  }
  const data = request.data;
  if (!data || typeof data !== 'object' || Array.isArray(data) ||
      Object.keys(data).length !== 2 || !Object.hasOwn(data, 'day') || !Object.hasOwn(data, 'feel')) {
    throw new HttpsError('invalid-argument', 'Choose a valid daily skin feel.');
  }
  try {
    if (!await skinFeelCheckinWriter.change(request.auth.uid, data.day, data.feel)) {
      throw new HttpsError('permission-denied', 'Active app access is required to check in.');
    }
    return { saved: true };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    if (error instanceof RangeError) throw new HttpsError('invalid-argument', error.message);
    console.error('[Checkin] Save unavailable:', { errorName: error instanceof Error ? error.name : 'UnknownError' });
    throw new HttpsError('unavailable', 'Your check-in could not be saved. Please try again.');
  }
});

/** Remove a user's cloud records and Firebase account. */
export const deleteUserAccount = onCall({ enforceAppCheck: true, timeoutSeconds: 300 }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required for account deletion.');
  }
  requireRecentAuthentication(request.auth.token.auth_time);

  const userId = request.auth.uid;
  try {
    return await deletionService.deleteUserAccount(userId);
  } catch (error) {
    console.error('[AccountDeletion] Request failed.', {
      errorName: error instanceof Error ? error.name : 'UnknownError'
    });
    throw new HttpsError('internal', 'Account deletion could not be completed. Please try again.');
  }
});

/** Recover data cleanup if an account is deleted directly through Firebase Auth. */
export const cleanupDeletedAuthUser = functionsV1
  .runWith({ timeoutSeconds: 300, failurePolicy: true })
  .auth.user().onDelete(async user => {
    await deletionService.deleteUserAccount(user.uid, { skipAuthDelete: true });
  });

/**
 * Recover a guard if Auth was deleted but the final TTL update failed. Only
 * guards marked after full cleanup are eligible; existing Auth users retain
 * their non-expiring guard for a caller-initiated retry.
 */
export const finalizeDeletedAccountGuards = onSchedule(
  { schedule: 'every 1 hours', timeZone: 'Etc/UTC', timeoutSeconds: 300, maxInstances: 1 },
  async () => {
    const due = await db.collection('accountDeletionGuards')
      .where('state', '==', 'awaiting-auth')
      .where('nextCheckAt', '<=', admin.firestore.Timestamp.now())
      .orderBy('nextCheckAt')
      .limit(100)
      .get();
    let finalized = 0;
    let retained = 0;
    let failed = 0;
    for (const guard of due.docs) {
      try {
        if (await deletionService.finalizeGuardForMissingAuth(guard.id)) {
          finalized += 1;
        } else {
          // Rotate active accounts out of the due set so another guard cannot
          // be starved by repeated checks of the same incomplete deletion.
          await guard.ref.update({
            nextCheckAt: admin.firestore.Timestamp.fromMillis(Date.now() + 2 * 60 * 60 * 1000)
          });
          retained += 1;
        }
      } catch {
        failed += 1;
        // A transient Auth or Firestore failure must never set a TTL. Leave
        // the guard intact and retry later; rotate it out of this due batch.
        try {
          await guard.ref.update({
            nextCheckAt: admin.firestore.Timestamp.fromMillis(Date.now() + 60 * 60 * 1000)
          });
        } catch {
          // If Firestore is also unavailable, the next invocation will retry.
        }
      }
    }
    console.info('[AccountDeletion] Guard check complete.', { finalized, retained, failed });
  }
);
