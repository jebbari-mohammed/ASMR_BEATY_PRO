import type * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';

const WINDOW_MS = 60_000;
const MAX_CHECKS = 12;

type VerificationWindow = { windowStartMs: number; count: number };

function readWindow(value: unknown): VerificationWindow | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (!Number.isSafeInteger(record.windowStartMs) || !Number.isSafeInteger(record.count)) return null;
  return { windowStartMs: record.windowStartMs as number, count: record.count as number };
}

/** Atomically bounds per-account vendor checks before calling RevenueCat. */
export class SubscriptionVerificationLimiter {
  constructor(
    private readonly db: admin.firestore.Firestore,
    private readonly now: () => number = Date.now
  ) {}

  async consume(userId: string): Promise<void> {
    const nowMs = this.now();
    const guardRef = this.db.collection('accountDeletionGuards').doc(userId);
    const usageRef = this.db.collection('usage').doc(userId);
    await this.db.runTransaction(async transaction => {
      // Both reads precede the write. A deletion guard committed concurrently
      // forces Firestore to retry, so this call cannot recreate usage after erasure.
      const [guard, usage] = await Promise.all([
        transaction.get(guardRef),
        transaction.get(usageRef)
      ]);
      if (guard.exists) {
        throw new HttpsError('failed-precondition', 'This account is unavailable.');
      }

      const prior = readWindow(usage.get('subscriptionVerification'));
      const withinWindow = prior !== null && nowMs >= prior.windowStartMs &&
        nowMs - prior.windowStartMs < WINDOW_MS;
      const count = withinWindow ? prior.count : 0;
      if (count >= MAX_CHECKS) {
        throw new HttpsError('resource-exhausted', 'Too many membership checks. Wait a moment and try again.');
      }
      transaction.set(usageRef, {
        subscriptionVerification: {
          windowStartMs: withinWindow ? prior.windowStartMs : nowMs,
          count: count + 1
        }
      }, { merge: true });
    });
  }
}
