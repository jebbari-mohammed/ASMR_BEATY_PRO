import * as admin from 'firebase-admin';

// A reviewer lease can be renewed while store review access is required, but
// each individual grant must have a finite, short lifetime.
export const MAX_REVIEW_GRANT_MS = 30 * 24 * 60 * 60 * 1000;

export interface VerifiedReviewAccess {
  isPro: true;
  status: 'active';
  tier: 'PRO_REVIEW';
  expiresAtMs: number;
  source: 'store_review';
}

/** Read an explicitly issued review grant without changing purchase state. */
export class ReviewAccessGrant {
  constructor(
    private readonly db: admin.firestore.Firestore,
    private readonly auth: admin.auth.Auth,
    private readonly now: () => number = Date.now
  ) {}

  async verify(userId: string): Promise<VerifiedReviewAccess | null> {
    if (!userId || userId.length > 128 || userId.includes('/')) {
      throw new Error('Invalid authenticated user ID');
    }

    const profileRef = this.db.collection('users').doc(userId);
    const guardRef = this.db.collection('accountDeletionGuards').doc(userId);
    const grantRef = profileRef.collection('entitlements').doc('review');
    // Most callers have no review grant. Avoid additional Auth and transaction
    // reads on their normal purchase-verification path.
    if (!(await grantRef.get()).exists) return null;

    try {
      const user = await this.auth.getUser(userId);
      if (user.disabled || !user.emailVerified) return null;
    } catch (error) {
      if ((error as { code?: string })?.code === 'auth/user-not-found') return null;
      throw error;
    }

    return this.db.runTransaction(async transaction => {
      const [guard, profile, grant] = await Promise.all([
        transaction.get(guardRef),
        transaction.get(profileRef),
        transaction.get(grantRef)
      ]);
      if (guard.exists || (profile.exists && profile.get('deletionStatus') === 'deleting') || !grant.exists) {
        return null;
      }

      const issuedAt = grant.get('issuedAt');
      const expiresAt = grant.get('expiresAt');
      if (grant.get('uid') !== userId || grant.get('purpose') !== 'store_review' ||
          grant.get('enabled') !== true ||
          !(issuedAt instanceof admin.firestore.Timestamp) ||
          !(expiresAt instanceof admin.firestore.Timestamp)) {
        return null;
      }

      const issuedAtMs = issuedAt.toMillis();
      const expiresAtMs = expiresAt.toMillis();
      const nowMs = this.now();
      if (issuedAtMs > nowMs || expiresAtMs <= nowMs ||
          expiresAtMs <= issuedAtMs || expiresAtMs - issuedAtMs > MAX_REVIEW_GRANT_MS) {
        return null;
      }

      return {
        isPro: true,
        status: 'active',
        tier: 'PRO_REVIEW',
        expiresAtMs,
        source: 'store_review'
      };
    });
  }
}
