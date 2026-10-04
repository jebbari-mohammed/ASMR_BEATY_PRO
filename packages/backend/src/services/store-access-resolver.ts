import { RevenueCatTransientError, type VerifiedEntitlement } from './revenuecat-verifier.js';
import { TrialAccountUnavailableError } from './app-free-trial.js';

export type ResolvedStoreAccess = VerifiedEntitlement & {
  source: 'revenuecat_server' | 'revenuecat_cache';
};

/** A recent paid cache only bridges a failed vendor request for normal access. */
export class StoreAccessResolver {
  constructor(
    private readonly verifyStore: (userId: string) => Promise<VerifiedEntitlement>,
    private readonly cacheStore: (userId: string, verified: VerifiedEntitlement) => Promise<boolean>,
    private readonly recentPaidAccess: (userId: string) => Promise<ResolvedStoreAccess | null>
  ) {}

  async current(userId: string, purchaseOnly: boolean): Promise<ResolvedStoreAccess> {
    let verified: VerifiedEntitlement;
    try {
      verified = await this.verifyStore(userId);
    } catch (error) {
      if (!purchaseOnly && error instanceof RevenueCatTransientError) {
        const cached = await this.recentPaidAccess(userId);
        if (cached) {
          console.warn('[Billing] Using recent server-verified purchase during store outage.');
          return cached;
        }
      }
      throw error;
    }

    // A definitive no-access result replaces any old Pro cache. Cache write
    // failures or deletion guards cannot be bypassed with stale purchase data.
    if (!await this.cacheStore(userId, verified)) throw new TrialAccountUnavailableError();
    return { ...verified, source: 'revenuecat_server' };
  }
}
