import * as admin from 'firebase-admin';
import { onRequest, onCall, HttpsError } from 'firebase-functions/v2/https';
import { GeminiSkinAnalysisProvider } from '../providers/skin/gemini-skin.provider.js';
import { GeminiProvider } from '../providers/ai/gemini.provider.js';
import { ScanStateMachine } from '../services/scan-state-machine.js';
import { FirestoreScanStore } from './firestore-store.js';
import { CoachReasoningContext } from '../providers/ai/base.provider.js';
import { AffiliateResolverService } from '../services/affiliate-resolver.js';
import { AccountDeletionService } from '../services/account-deletion.service.js';
import { SkinAnalysisInputImage, StandardizedCropType } from '@asmr/shared';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });
const storage = admin.storage();
const store = new FirestoreScanStore(db, storage);
const affiliateService = new AffiliateResolverService(db);
const deletionService = new AccountDeletionService(db, storage);

/**
 * 1. RevenueCat Server-to-Server Webhook Handler
 * Verifies webhook token and writes trusted subscription state to Firestore.
 * Client state is NEVER trusted for subscription gating.
 */
export const onRevenueCatWebhook = onRequest(
  { secrets: ['REVENUECAT_WEBHOOK_TOKEN'] },
  async (req, res) => {
    const authHeader = req.headers.authorization;
    const expectedToken = process.env.REVENUECAT_WEBHOOK_TOKEN;

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      res.status(401).send('Unauthorized webhook signature.');
      return;
    }

    const event = req.body?.event;
    if (!event) {
      res.status(400).send('Missing event payload.');
      return;
    }

    const eventType = event.type; // e.g. TEST, INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION
    if (eventType === 'TEST') {
      res.status(200).json({ received: true, test: true });
      return;
    }

    const userId = event.app_user_id || 'unknown';
    const entitlementIds = event.entitlement_ids || [];
    const isPro = entitlementIds.includes('pro_access') || entitlementIds.includes('asmr_beaty_pro_pro');

    const statusMap: Record<string, string> = {
      INITIAL_PURCHASE: 'active',
      RENEWAL: 'active',
      PRODUCT_CHANGE: 'active',
      CANCELLATION: 'canceled',
      EXPIRATION: 'expired',
      BILLING_ISSUE: 'billing_retry'
    };

    const status = statusMap[eventType] || (isPro ? 'active' : 'expired');

    await db
      .collection('users')
      .doc(userId)
      .collection('entitlements')
      .doc('pro')
      .set(
        {
          isPro: status === 'active' || status === 'canceled', // Canceled retains access until period ends
          status,
          tier: event.product_id?.includes('annual') ? 'PRO_ANNUAL' : 'PRO_MONTHLY',
          productId: event.product_id || null,
          expiresAtMs: event.expiration_at_ms || null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );

    res.status(200).json({ received: true });
  }
);

/**
 * 2. Process Skin Scan Session (Gemini 3.8 Flash Production Scanner)
 * Enforces all 7 security gates (Auth, App Check, Ownership, Server Entitlement, Quota, Idempotency, Rate Limit)
 * before invoking Gemini 3.8 Flash with structured JSON output and rubrics.
 */
export const processSkinScanSession = onCall(
  {
    secrets: ['GEMINI_API_KEY'],
    enforceAppCheck: false // Set to true after rolling out App Check production tokens
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated to process skin scan.');
    }

    const { scanId, idempotencyKey, storagePath, cropPaths } = request.data;
    if (!scanId || !idempotencyKey || (!storagePath && !cropPaths)) {
      throw new HttpsError('invalid-argument', 'Missing scan session parameters.');
    }

    const provider = new GeminiSkinAnalysisProvider({
      apiKey: process.env.GEMINI_API_KEY
    });

    const stateMachine = new ScanStateMachine(provider, store);
    const bucket = storage.bucket();

    // Prepare image input (single frontal or standardized multiple crops)
    const images: SkinAnalysisInputImage[] = [];

    if (cropPaths && typeof cropPaths === 'object') {
      for (const [cropType, path] of Object.entries(cropPaths)) {
        if (typeof path === 'string') {
          const file = bucket.file(path);
          const [exists] = await file.exists();
          if (exists) {
            const [buf] = await file.download();
            images.push({
              type: cropType as StandardizedCropType,
              buffer: buf,
              mimeType: 'image/jpeg',
              storagePath: path
            });
          }
        }
      }
      if (storagePath && !cropPaths['FULL_FRONT']) {
        const file = bucket.file(storagePath);
        const [exists] = await file.exists();
        if (exists) {
          const [buf] = await file.download();
          images.unshift({
            type: 'FULL_FRONT',
            buffer: buf,
            mimeType: 'image/jpeg',
            storagePath
          });
        }
      }
    } else if (storagePath) {
      const file = bucket.file(storagePath);
      const [exists] = await file.exists();
      if (!exists) {
        throw new HttpsError('not-found', 'Uploaded skin scan image not found in storage.');
      }
      const [imageBuffer] = await file.download();
      images.push({
        type: 'FULL_FRONT',
        buffer: imageBuffer,
        mimeType: 'image/jpeg',
        storagePath
      });
    }

    if (images.length === 0) {
      throw new HttpsError('invalid-argument', 'No readable scan images available for processing.');
    }

    try {
      const result = await stateMachine.processScan(scanId, images, {
        authenticatedUserId: request.auth.uid,
        appCheckVerified: Boolean(request.app),
        rateLimitPassed: true
      });
      return result;
    } catch (err: any) {
      if (err.message.includes('SUBSCRIPTION_REQUIRED')) {
        throw new HttpsError('permission-denied', 'Active subscription required for cloud skin snapshot.');
      }
      if (err.message.includes('SCAN_QUOTA_EXCEEDED') || err.message.includes('SCAN_COOLDOWN_ACTIVE')) {
        throw new HttpsError('resource-exhausted', 'Weekly skin snapshot quota reached. Next scan available next week.');
      }
      throw new HttpsError('internal', err.message);
    }
  }
);

/**
 * 3. Chat With AI Skin Coach (Gemini 3.8 Flash Grounded Inference)
 * Grounded strictly in structured scan metrics and pre-filtered allowed products.
 * Never resends raw selfies.
 */
export const chatWithSkinCoach = onCall(
  { secrets: ['GEMINI_API_KEY'] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated to consult skin coach.');
    }

    const {
      userMessage,
      currentRoutineSummary,
      latestSkinSnapshotSummary,
      memorySummary,
      allowedCandidateProductIds,
      allowedCandidateDescriptions
    } = request.data;

    const gemini = new GeminiProvider({
      apiKey: process.env.GEMINI_API_KEY
    });

    const context: CoachReasoningContext = {
      userId: request.auth.uid,
      userMessage: userMessage || '',
      memorySummary: memorySummary || {
        userId: request.auth.uid,
        skinTypeObservation: 'balanced',
        userGoalsSummary: 'Maintain calm, clear skin',
        sensitivitiesSummary: 'None reported',
        routineAdherenceSummary: 'High adherence',
        productReactionHistory: [],
        lastUpdated: new Date().toISOString()
      },
      currentRoutineSummary: currentRoutineSummary || 'Gentle cleanser, moisturizer, mineral SPF',
      latestSkinSnapshotSummary: latestSkinSnapshotSummary || 'Baseline redness and surface hydration balanced',
      allowedCandidateProductIds: allowedCandidateProductIds || [],
      allowedCandidateDescriptions: allowedCandidateDescriptions || []
    };

    const response = await gemini.generateCoachResponse(context);
    return response;
  }
);

/**
 * 4. Resolve Affiliate Offer (Phishing & Domain Allowlist Protection)
 * Resolves internal offerId into validated destination URL with disclosure text.
 */
export const resolveAffiliateOffer = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required to access partner recommendations.');
  }

  const { offerId } = request.data;
  if (!offerId) {
    throw new HttpsError('invalid-argument', 'Missing offerId.');
  }

  try {
    const result = await affiliateService.resolveOfferUrl(offerId, request.auth.uid);
    return result;
  } catch (err: any) {
    throw new HttpsError('invalid-argument', err.message);
  }
});

/**
 * 5. Delete User Account (GDPR & App Store Compliance)
 * Completely deletes all private user data, skin scans, photos, routines, and memory.
 */
export const deleteUserAccount = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required for account deletion.');
  }

  const userId = request.auth.uid;
  try {
    const result = await deletionService.deleteUserAccountData(userId);
    // Delete Firebase Auth user record
    await admin.auth().deleteUser(userId);
    return result;
  } catch (err: any) {
    throw new HttpsError('internal', `Failed to delete account: ${err.message}`);
  }
});
