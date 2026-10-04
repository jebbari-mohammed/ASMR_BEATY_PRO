import * as admin from 'firebase-admin';
import { APP_FREE_TRIAL_MS } from './app-free-trial.js';
import { MAX_REVIEW_GRANT_MS } from './review-access-grant.js';

export const CHECKIN_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const FEELS = new Set(['comfortable', 'dry_tight', 'oily', 'sensitive', 'mixed']);

function currentLocalDayRange(day: string, nowMs: number): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const [year, month, date] = day.split('-').map(Number);
  const dayMs = Date.UTC(year, month - 1, date);
  const parsed = new Date(dayMs);
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() + 1 !== month || parsed.getUTCDate() !== date) return false;
  const todayUtcMs = Math.floor(nowMs / DAY_MS) * DAY_MS;
  // Local dates worldwide can be yesterday, today, or tomorrow in UTC.
  return Math.abs(dayMs - todayUtcMs) <= DAY_MS;
}

/** Server-owned, fixed-choice check-ins; the client never supplies an expiry. */
export class SkinFeelCheckinWriter {
  constructor(
    private readonly db: admin.firestore.Firestore,
    private readonly auth: admin.auth.Auth,
    private readonly now: () => number = Date.now
  ) {}

  async change(userId: string, day: unknown, feel: unknown): Promise<boolean> {
    const requestMs = this.now();
    if (!userId || userId.length > 128 || userId.includes('/') ||
        typeof day !== 'string' || !currentLocalDayRange(day, requestMs) ||
        (feel !== null && (typeof feel !== 'string' || !FEELS.has(feel)))) {
      throw new RangeError('Invalid daily skin-feel choice.');
    }

    try {
      const user = await this.auth.getUser(userId);
      if (user.disabled || !user.emailVerified) return false;
    } catch (error) {
      if ((error as { code?: string })?.code === 'auth/user-not-found') return false;
      throw error;
    }

    const profile = this.db.collection('users').doc(userId);
    const checkin = profile.collection('skinFeelCheckins').doc(day);
    const guard = this.db.collection('accountDeletionGuards').doc(userId);
    const purchase = profile.collection('entitlements').doc('pro');
    const review = profile.collection('entitlements').doc('review');
    const trial = profile.collection('entitlements').doc('trial');
    return this.db.runTransaction(async transaction => {
      const [guardDoc, profileDoc, purchaseDoc, reviewDoc, trialDoc, existing] = await Promise.all([
        transaction.get(guard), transaction.get(profile), transaction.get(purchase),
        transaction.get(review), transaction.get(trial), transaction.get(checkin)
      ]);
      // Transactions can retry after an entitlement crosses its expiry.
      const nowMs = this.now();
      if (guardDoc.exists || (profileDoc.exists && profileDoc.get('deletionStatus') === 'deleting')) return false;

      const purchaseExpiry = purchaseDoc.get('expiresAt');
      const paid = purchaseDoc.exists && purchaseDoc.get('isPro') === true &&
        purchaseExpiry instanceof admin.firestore.Timestamp && purchaseExpiry.toMillis() > nowMs;
      const issuedAt = reviewDoc.get('issuedAt');
      const reviewExpiry = reviewDoc.get('expiresAt');
      const reviewAccess = reviewDoc.exists && reviewDoc.get('uid') === userId &&
        reviewDoc.get('purpose') === 'store_review' && reviewDoc.get('enabled') === true &&
        issuedAt instanceof admin.firestore.Timestamp && reviewExpiry instanceof admin.firestore.Timestamp &&
        issuedAt.toMillis() <= nowMs && reviewExpiry.toMillis() > nowMs &&
        reviewExpiry.toMillis() <= issuedAt.toMillis() + MAX_REVIEW_GRANT_MS;
      const trialStarted = trialDoc.get('startedAt');
      const trialEnds = trialDoc.get('endsAt');
      const trialAccess = trialDoc.exists && trialDoc.get('uid') === userId &&
        trialDoc.get('purpose') === 'app_trial' &&
        trialStarted instanceof admin.firestore.Timestamp && trialEnds instanceof admin.firestore.Timestamp &&
        trialStarted.toMillis() <= nowMs && trialEnds.toMillis() > nowMs &&
        trialEnds.toMillis() - trialStarted.toMillis() === APP_FREE_TRIAL_MS;
      if (!paid && !reviewAccess && !trialAccess) return false;

      if (feel === null) {
        transaction.delete(checkin);
      } else {
        const priorExpiry = existing.get('expireAt');
        const expireAtMs = priorExpiry instanceof admin.firestore.Timestamp &&
          priorExpiry.toMillis() > nowMs && priorExpiry.toMillis() <= nowMs + CHECKIN_RETENTION_MS
          ? priorExpiry.toMillis()
          : nowMs + CHECKIN_RETENTION_MS;
        transaction.set(checkin, {
          day,
          feel,
          updatedAt: nowMs,
          expireAt: admin.firestore.Timestamp.fromMillis(expireAtMs)
        });
      }
      return true;
    });
  }
}
