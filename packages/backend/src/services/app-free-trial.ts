import * as admin from 'firebase-admin';

export const APP_FREE_TRIAL_MS = 10 * 24 * 60 * 60 * 1000;

export interface AppFreeTrialStatus {
  eligible: boolean;
  active: boolean;
  endsAt: string | null;
}

export interface VerifiedAppFreeTrial {
  isPro: true;
  status: 'active';
  tier: 'PRO_TRIAL';
  expiresAtMs: number;
  source: 'app_trial';
}

export class TrialAccountUnavailableError extends Error {
  constructor() {
    super('This account is unavailable for a free trial.');
  }
}

/** A one-time, server-owned ten-day access lease. It never initiates billing. */
export class AppFreeTrial {
  constructor(
    private readonly db: admin.firestore.Firestore,
    private readonly auth: admin.auth.Auth,
    private readonly now: () => number = Date.now
  ) {}

  async status(userId: string): Promise<AppFreeTrialStatus> {
    const refs = this.refs(userId);
    if (!await this.hasLiveVerifiedAccount(userId)) throw new TrialAccountUnavailableError();
    return this.db.runTransaction(async transaction => {
      const [guard, profile, trial] = await Promise.all([
        transaction.get(refs.guard),
        transaction.get(refs.profile),
        transaction.get(refs.trial)
      ]);
      if (guard.exists || (profile.exists && profile.get('deletionStatus') === 'deleting')) {
        throw new TrialAccountUnavailableError();
      }
      return this.statusFromSnapshot(userId, trial, this.now());
    });
  }

  /** Explicit caller action. A transaction makes concurrent starts idempotent. */
  async start(userId: string): Promise<AppFreeTrialStatus> {
    const refs = this.refs(userId);
    if (!await this.hasLiveVerifiedAccount(userId)) throw new TrialAccountUnavailableError();
    return this.db.runTransaction(async transaction => {
      const [guard, profile, trial] = await Promise.all([
        transaction.get(refs.guard),
        transaction.get(refs.profile),
        transaction.get(refs.trial)
      ]);
      if (guard.exists || (profile.exists && profile.get('deletionStatus') === 'deleting')) {
        throw new TrialAccountUnavailableError();
      }
      if (trial.exists) return this.statusFromSnapshot(userId, trial, this.now());

      const startedAtMs = this.now();
      const endsAtMs = startedAtMs + APP_FREE_TRIAL_MS;
      transaction.create(refs.trial, {
        uid: userId,
        purpose: 'app_trial',
        startedAt: admin.firestore.Timestamp.fromMillis(startedAtMs),
        endsAt: admin.firestore.Timestamp.fromMillis(endsAtMs)
      });
      return { eligible: false, active: true, endsAt: new Date(endsAtMs).toISOString() };
    });
  }

  /** Verify the lease again before granting access; never use a cached client flag. */
  async verify(userId: string): Promise<VerifiedAppFreeTrial | null> {
    const refs = this.refs(userId);
    // The common subscribed/never-started paths need no extra Auth or
    // transaction reads after this absent-document check.
    if (!(await refs.trial.get()).exists) return null;
    if (!await this.hasLiveVerifiedAccount(userId)) return null;
    return this.db.runTransaction(async transaction => {
      const [guard, profile, trial] = await Promise.all([
        transaction.get(refs.guard),
        transaction.get(refs.profile),
        transaction.get(refs.trial)
      ]);
      if (guard.exists || (profile.exists && profile.get('deletionStatus') === 'deleting')) return null;
      const lease = this.validLease(userId, trial, this.now());
      if (!lease?.active) return null;
      return {
        isPro: true,
        status: 'active',
        tier: 'PRO_TRIAL',
        expiresAtMs: lease.endsAtMs,
        source: 'app_trial'
      };
    });
  }

  private statusFromSnapshot(
    userId: string,
    trial: admin.firestore.DocumentSnapshot,
    nowMs: number
  ): AppFreeTrialStatus {
    if (!trial.exists) return { eligible: true, active: false, endsAt: null };
    // A malformed existing record cannot be overwritten to obtain a new lease.
    const lease = this.validLease(userId, trial, nowMs);
    if (!lease) return { eligible: false, active: false, endsAt: null };
    return {
      eligible: false,
      active: lease.active,
      endsAt: new Date(lease.endsAtMs).toISOString()
    };
  }

  private validLease(
    userId: string,
    trial: admin.firestore.DocumentSnapshot,
    nowMs: number
  ): { active: boolean; endsAtMs: number } | null {
    if (!trial.exists || trial.get('uid') !== userId || trial.get('purpose') !== 'app_trial') return null;
    const startedAt = trial.get('startedAt');
    const endsAt = trial.get('endsAt');
    if (!(startedAt instanceof admin.firestore.Timestamp) ||
        !(endsAt instanceof admin.firestore.Timestamp)) return null;
    const startedAtMs = startedAt.toMillis();
    const endsAtMs = endsAt.toMillis();
    if (endsAtMs - startedAtMs !== APP_FREE_TRIAL_MS) return null;
    return { active: startedAtMs <= nowMs && endsAtMs > nowMs, endsAtMs };
  }

  private async hasLiveVerifiedAccount(userId: string): Promise<boolean> {
    try {
      const user = await this.auth.getUser(userId);
      return user.uid === userId && user.emailVerified && !user.disabled;
    } catch (error) {
      if ((error as { code?: string })?.code === 'auth/user-not-found') return false;
      throw error;
    }
  }

  private refs(userId: string) {
    if (!/^[A-Za-z0-9:_-]{1,128}$/.test(userId)) throw new Error('Invalid authenticated user ID');
    const profile = this.db.collection('users').doc(userId);
    return {
      profile,
      guard: this.db.collection('accountDeletionGuards').doc(userId),
      trial: profile.collection('entitlements').doc('trial')
    };
  }
}
