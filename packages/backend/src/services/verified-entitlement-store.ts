import * as admin from 'firebase-admin';
import type { VerifiedEntitlement } from './revenuecat-verifier.js';

// The callable can bridge a short RevenueCat outage with recent paid proof.
// Firestore's separate paid-data rule still follows the cached store expiry.
export const PAID_CACHE_OUTAGE_WINDOW_MS = 6 * 60 * 60 * 1000;

/** Persist verified purchases only while the corresponding app account exists. */
export class VerifiedEntitlementStore {
  constructor(
    private readonly db: admin.firestore.Firestore,
    private readonly auth: admin.auth.Auth,
    private readonly now: () => number = Date.now
  ) {}

  /** Read a recent server-verified purchase only when the vendor cannot respond. */
  async recentPaidAccess(userId: string): Promise<(VerifiedEntitlement & {
    source: 'revenuecat_cache';
  }) | null> {
    let user: admin.auth.UserRecord;
    try {
      user = await this.auth.getUser(userId);
    } catch (error) {
      if ((error as { code?: string })?.code === 'auth/user-not-found') return null;
      throw error;
    }
    if (user.disabled || !user.emailVerified) return null;

    const profileRef = this.db.collection('users').doc(userId);
    const guardRef = this.db.collection('accountDeletionGuards').doc(userId);
    const entitlementRef = profileRef.collection('entitlements').doc('pro');
    return this.db.runTransaction(async transaction => {
      const [guard, profile, entitlement] = await Promise.all([
        transaction.get(guardRef), transaction.get(profileRef), transaction.get(entitlementRef)
      ]);
      if (guard.exists || (profile.exists && profile.get('deletionStatus') === 'deleting') ||
          !entitlement.exists || entitlement.get('source') !== 'revenuecat_server' ||
          entitlement.get('isPro') !== true) return null;

      const status = entitlement.get('status');
      const tier = entitlement.get('tier');
      const expiresAt = entitlement.get('expiresAt');
      const updatedAt = entitlement.get('updatedAt');
      const nowMs = this.now();
      const expiresAtMs = expiresAt instanceof admin.firestore.Timestamp ? expiresAt.toMillis() : NaN;
      const updatedAtMs = updatedAt instanceof admin.firestore.Timestamp ? updatedAt.toMillis() : NaN;
      if ((status !== 'active' && status !== 'grace_period') ||
          (tier !== 'PRO_ANNUAL' && tier !== 'PRO_MONTHLY') ||
          !(expiresAt instanceof admin.firestore.Timestamp) ||
          !(updatedAt instanceof admin.firestore.Timestamp) ||
          !Number.isFinite(expiresAtMs) || !Number.isFinite(updatedAtMs) ||
          expiresAtMs <= nowMs || updatedAtMs > nowMs ||
          nowMs - updatedAtMs >= PAID_CACHE_OUTAGE_WINDOW_MS) return null;

      return {
        isPro: true,
        status,
        tier,
        expiresAtMs,
        source: 'revenuecat_cache' as const
      };
    });
  }

  async cache(userId: string, verified: VerifiedEntitlement, eventType?: string): Promise<boolean> {
    try {
      const user = await this.auth.getUser(userId);
      if (user.disabled) return false;
    } catch (error) {
      if ((error as { code?: string })?.code === 'auth/user-not-found') return false;
      throw error;
    }

    const profileRef = this.db.collection('users').doc(userId);
    const guardRef = this.db.collection('accountDeletionGuards').doc(userId);
    const entitlementRef = profileRef.collection('entitlements').doc('pro');
    return this.db.runTransaction(async transaction => {
      // Read both guards before writing. Firestore retries this transaction if
      // deletion commits either guard while reconciliation is in progress.
      const [guard, profile] = await Promise.all([
        transaction.get(guardRef),
        transaction.get(profileRef)
      ]);
      // Some older accounts have no parent profile document; their verified
      // Auth account is still valid unless deletion has installed the guard.
      if (guard.exists || (profile.exists && profile.get('deletionStatus') === 'deleting')) return false;

      transaction.set(entitlementRef, {
        ...verified,
        expiresAt: verified.expiresAtMs === null
          ? null
          : admin.firestore.Timestamp.fromMillis(verified.expiresAtMs),
        source: 'revenuecat_server',
        ...(eventType ? { lastEventType: eventType } : {}),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      return true;
    });
  }
}
