import * as admin from 'firebase-admin';
import type { VerifiedEntitlement } from './revenuecat-verifier.js';
import { TrialAccountUnavailableError } from './app-free-trial.js';

/** Prefer a fresh store purchase after conversion without risking trial access. */
export class TrialStorePreference {
  constructor(
    private readonly db: admin.firestore.Firestore,
    private readonly verifyStore: (userId: string) => Promise<VerifiedEntitlement>,
    private readonly cacheStore: (userId: string, verified: VerifiedEntitlement) => Promise<boolean>,
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

    let verified: VerifiedEntitlement;
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
    if (!await this.cacheStore(userId, verified)) throw new TrialAccountUnavailableError();
    return verified.isPro ? { ...verified, source: 'revenuecat_server' } : null;
  }
}
