import * as admin from 'firebase-admin';
import type { VerifiedEntitlement } from './revenuecat-verifier.js';

/** Persist verified purchases only while the corresponding app account exists. */
export class VerifiedEntitlementStore {
  constructor(
    private readonly db: admin.firestore.Firestore,
    private readonly auth: admin.auth.Auth
  ) {}

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
