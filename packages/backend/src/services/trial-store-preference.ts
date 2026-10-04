import * as admin from 'firebase-admin';
import type { StoreVerifiedEntitlement, VerifiedEntitlement } from './revenuecat-verifier.js';
import { TrialAccountUnavailableError } from './app-free-trial.js';
import { StaleStoreVerificationError } from './verified-entitlement-store.js';

/** Prefer a fresh store purchase after conversion without risking trial access. */
export class TrialStorePreference {
  constructor(
    private readonly db: admin.firestore.Firestore,
    private readonly verifyStore: (userId: string) => Promise<StoreVerifiedEntitlement>,
    private readonly cacheStore: (userId: string, verified: StoreVerifiedEntitlement) => Promise<boolean>,
    private readonly now: () => number = Date.now
  ) {}

  async current(userId: string): Promise<(VerifiedEntitlement & { source: 'revenuecat_server' }) | null> {
    let cachedPurchase: admin.firestore.DocumentSnapshot;
    try {
      cachedPurchase = await this.db.collection('users').doc(userId)
        .collection('entitlements').doc('pro').get();
    } catch {
      // The validated app trial remains usable during a cache read failure.
      return null;
    }
    const expiresAt = cachedPurchase.get('expiresAt');
    if (!cachedPurchase.exists || cachedPurchase.get('source') !== 'revenuecat_server' ||
        cachedPurchase.get('isPro') !== true ||
        !(expiresAt instanceof admin.firestore.Timestamp) || expiresAt.toMillis() <= this.now()) {
      return null;
    }

    let verified: StoreVerifiedEntitlement;
    try {
      verified = await this.verifyStore(userId);
    } catch (error) {
      console.warn('[Billing] Store recheck unavailable during active trial.', {
        errorName: error instanceof Error ? error.name : 'UnknownError'
      });
      return null;
    }
    // A no-access result must also replace a stale purchase cache, so a
    // refunded subscription cannot continue to appear purchased in rules.
    try {
      if (!await this.cacheStore(userId, verified)) throw new TrialAccountUnavailableError();
    } catch (error) {
      // A concurrent, newer revocation can win while this trial recheck is in
      // flight. Keep the independently valid app trial, not the stale paid flag.
      if (error instanceof StaleStoreVerificationError) return null;
      throw error;
    }
    const { requestDateMs: _requestDateMs, ...access } = verified;
    return access.isPro ? { ...access, source: 'revenuecat_server' } : null;
  }
}
