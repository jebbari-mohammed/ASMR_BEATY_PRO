import * as admin from 'firebase-admin';

export class AccountDeletionService {
  constructor(
    private readonly db: admin.firestore.Firestore,
    private readonly storage: admin.storage.Storage,
    private readonly auth: admin.auth.Auth
  ) {}

  /** Erase account data and Auth, then start the stale-token guard's TTL. */
  async deleteUserAccount(
    userId: string,
    options: { skipAuthDelete?: boolean } = {}
  ): Promise<{ deleted: boolean; deletedCollections: string[] }> {
    if (!/^[A-Za-z0-9:_-]{1,128}$/.test(userId)) throw new Error('Invalid account ID');
    if (options.skipAuthDelete && !await this.isAuthMissing(userId)) {
      // A delayed Auth event may refer to an old account whose UID has since
      // been recreated. Leave the new account and its data untouched.
      return { deleted: false, deletedCollections: [] };
    }
    // Install the guard before any cleanup. An Auth onDelete trigger can arrive
    // after the Auth record is gone, while its old ID token remains valid.
    // The guard has no TTL until every cleanup step and Auth deletion succeed.
    const guard = this.db.collection('accountDeletionGuards').doc(userId);
    const profile = this.db.collection('users').doc(userId);
    const entitlement = profile.collection('entitlements').doc('pro');
    await this.db.runTransaction(async (transaction) => {
      const existing = await transaction.get(guard);
      const state = existing.get('state');
      // A concurrent/retried request cannot regress a cleanup-complete guard
      // to `deleting`, or remove a TTL added after another request succeeded.
      if (!existing.exists || (state !== 'awaiting-auth' && state !== 'completed')) {
        transaction.set(guard, {
          state: 'deleting',
          startedAt: admin.firestore.FieldValue.serverTimestamp(),
          nextCheckAt: admin.firestore.Timestamp.now()
        });
      }
      if (state !== 'completed') {
        transaction.set(profile, { deletionStatus: 'deleting' }, { merge: true });
        // Revoking this document in the same commit closes paid client access
        // before recursiveDelete begins.
        transaction.delete(entitlement);
      }
    });

    if (options.skipAuthDelete && !await this.isAuthMissing(userId)) {
      // If an Admin recreated the UID while the guard was being committed,
      // retain that guard for support review and avoid destructive cleanup.
      throw new Error('Auth account reappeared during deletion recovery');
    }

    // A storage failure leaves a non-expiring guard; event retries or a caller
    // retry can complete cleanup without reopening stale-token access.
    const bucket = this.storage.bucket();
    const prefixes = [
      `transient-scans/${userId}/`,
      `progress-photos/${userId}/`,
      `spot-journal/${userId}/`
    ];
    for (const prefix of prefixes) {
      await bucket.deleteFiles({ prefix, force: true });
    }

    // recursiveDelete includes nested journal entries and conversation messages.
    await this.db.recursiveDelete(profile);
    await this.db.collection('entitlements').doc(userId).delete();
    await this.db.collection('usage').doc(userId).delete();

    // Only this state certifies that all application data was removed. The
    // scheduled finalizer must never expire a guard left by partial cleanup.
    await this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(guard);
      if (!snapshot.exists) throw new Error('Deletion guard missing after cleanup');
      if (snapshot.get('state') === 'deleting') {
        transaction.update(guard, { state: 'awaiting-auth' });
      }
    });

    // A retry can observe an already-deleted Auth user after the earlier
    // invocation completed Auth deletion but failed to finalize the guard.
    if (!options.skipAuthDelete) {
      try {
        await this.auth.deleteUser(userId);
      } catch (error) {
        if (!isAuthUserNotFound(error)) throw error;
      }
    }

    // Confirm Auth is absent before adding a TTL. If this update fails, the
    // guard remains non-expiring; the scheduled finalizer can safely retry it.
    if (!await this.finalizeGuardForMissingAuth(userId)) {
      throw new Error('Account still exists after Auth deletion');
    }
    return {
      deleted: true,
      deletedCollections: ['users', 'entitlements', 'usage', 'transient-scans', 'progress-photos', 'spot-journal']
    };
  }

  /** Finalize only a guard whose Auth account is definitively absent. */
  async finalizeGuardForMissingAuth(userId: string): Promise<boolean> {
    if (!await this.isAuthMissing(userId)) return false;

    const guard = this.db.collection('accountDeletionGuards').doc(userId);
    return this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(guard);
      if (!snapshot.exists) return false;
      if (snapshot.get('state') === 'completed') return true;
      if (snapshot.get('state') !== 'awaiting-auth') return false;
      transaction.update(guard, {
        state: 'completed',
        expireAt: admin.firestore.Timestamp.fromMillis(Date.now() + 2 * 60 * 60 * 1000),
        nextCheckAt: admin.firestore.FieldValue.delete()
      });
      return true;
    });
  }

  private async isAuthMissing(userId: string): Promise<boolean> {
    try {
      await this.auth.getUser(userId);
      return false;
    } catch (error) {
      if (!isAuthUserNotFound(error)) throw error;
      return true;
    }
  }
}

function isAuthUserNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null &&
    'code' in error && error.code === 'auth/user-not-found';
}
