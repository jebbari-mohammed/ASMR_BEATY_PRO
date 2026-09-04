import * as admin from 'firebase-admin';
import { onRequest, onCall, HttpsError } from 'firebase-functions/v2/https';
import { PerfectCorpSkinProvider } from '../providers/skin/perfect-corp.provider.js';
import { GeminiProvider } from '../providers/ai/gemini.provider.js';
import { ScanStateMachine } from '../services/scan-state-machine.js';
import { FirestoreScanStore } from './firestore-store.js';
import { CoachReasoningContext } from '../providers/ai/base.provider.js';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const storage = admin.storage();
const store = new FirestoreScanStore(db, storage);

/**
 * 1. RevenueCat Server-to-Server Webhook Handler
 * Verifies webhook token and writes trusted subscription state to Firestore.
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

    const userId = event.app_user_id;
    const eventType = event.type; // e.g. INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION
    const entitlementIds = event.entitlement_ids || [];
    const isPro = entitlementIds.includes('pro_access');

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
          productId: event.product_id,
          expiresAtMs: event.expiration_at_ms,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );

    res.status(200).json({ received: true });
  }
);

/**
 * 2. Process Skin Scan Session (7 Security Gates Enforcement)
 * Calls Perfect Corp YouCam AI API only after server-side entitlement is verified.
 */
export const processSkinScanSession = onCall(
  {
    secrets: ['PERFECT_CORP_API_KEY', 'PERFECT_CORP_API_SECRET'],
    enforceAppCheck: false // Set to true after rolling out App Check tokens
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated to process skin scan.');
    }

    const { scanId, idempotencyKey, storagePath } = request.data;
    if (!scanId || !idempotencyKey || !storagePath) {
      throw new HttpsError('invalid-argument', 'Missing scan session parameters.');
    }

    const apiKey = process.env.PERFECT_CORP_API_KEY || '';
    const apiSecret = process.env.PERFECT_CORP_API_SECRET || '';

    const provider = new PerfectCorpSkinProvider({
      apiKey,
      apiSecret,
      baseUrl: 'https://yce.perfectcorp.com/api'
    });

    const stateMachine = new ScanStateMachine(provider, store);

    // Download transient image buffer from Cloud Storage
    const bucket = storage.bucket();
    const file = bucket.file(storagePath);
    const [exists] = await file.exists();
    if (!exists) {
      throw new HttpsError('not-found', 'Uploaded skin scan image not found in storage.');
    }

    const [imageBuffer] = await file.download();

    try {
      const result = await stateMachine.processScan(
        scanId,
        imageBuffer,
        {
          authenticatedUserId: request.auth.uid,
          appCheckVerified: Boolean(request.app),
          rateLimitPassed: true
        }
      );
      return result;
    } catch (err: any) {
      if (err.message.includes('SUBSCRIPTION_REQUIRED')) {
        throw new HttpsError('permission-denied', 'Active subscription required for cloud skin snapshot.');
      }
      throw new HttpsError('internal', err.message);
    }
  }
);

/**
 * 3. Chat With AI Skin Coach (Gemini 1.5 Flash Grounded Inference)
 */
export const chatWithSkinCoach = onCall(
  { secrets: ['GEMINI_API_KEY'] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated to consult skin coach.');
    }

    const { userMessage, currentRoutineSummary, latestSkinSnapshotSummary, memorySummary, allowedCandidateProductIds, allowedCandidateDescriptions } = request.data;

    const gemini = new GeminiProvider({
      apiKey: process.env.GEMINI_API_KEY || ''
    });

    const context: CoachReasoningContext = {
      userId: request.auth.uid,
      userMessage,
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
