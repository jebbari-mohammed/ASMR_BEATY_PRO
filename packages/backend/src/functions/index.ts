import * as admin from 'firebase-admin';
import { onRequest, onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { AccountDeletionService } from '../services/account-deletion.service.js';
import { RevenueCatVerifier } from '../services/revenuecat-verifier.js';
import { VerifiedEntitlementStore } from '../services/verified-entitlement-store.js';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });
const storage = admin.storage();
const deletionService = new AccountDeletionService(db, storage, admin.auth());
const entitlementStore = new VerifiedEntitlementStore(db, admin.auth());

/**
 * 1. RevenueCat Server-to-Server Webhook Handler
 * Verifies webhook token and writes trusted subscription state to Firestore.
 * Client state is NEVER trusted for subscription gating.
 */
export const onRevenueCatWebhook = onRequest(
  { secrets: ['REVENUECAT_WEBHOOK_TOKEN', 'REVENUECAT_SECRET_API_KEY'] },
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

    const userId = event.app_user_id;
    if (typeof userId !== 'string' || !userId || userId.includes('/') || userId.length > 128) {
      res.status(400).send('Invalid app user ID.');
      return;
    }
    try {
      // The event may be delayed or arrive out of order. Always reconcile with
      // RevenueCat's current subscription state rather than trusting its type.
      const verified = await new RevenueCatVerifier(process.env.REVENUECAT_SECRET_API_KEY).verify(userId);
      await entitlementStore.cache(userId, verified, eventType);
    } catch (error) {
      console.error('[Billing] Webhook reconciliation failed:', error);
      res.status(503).send('Subscription verification unavailable.');
      return;
    }

    res.status(200).json({ received: true });
  }
);

/** Verify the current RevenueCat entitlement for the authenticated Firebase user. */
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
      const verified = await new RevenueCatVerifier(process.env.REVENUECAT_SECRET_API_KEY).verify(request.auth.uid);
      if (!await entitlementStore.cache(request.auth.uid, verified)) {
        throw new HttpsError('failed-precondition', 'This account is unavailable.');
      }
      return verified;
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error('[Billing] Subscription verification unavailable:', error);
      throw new HttpsError('unavailable', 'Subscription verification is temporarily unavailable.');
    }
  }
);

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

/** Remove a user's cloud records and Firebase account. */
export const deleteUserAccount = onCall({ enforceAppCheck: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required for account deletion.');
  }

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
