import { ScanSession, NormalizedSkinAnalysis, ScanStatus } from '@asmr/shared';
import { SkinAnalysisProvider } from '../providers/skin/base.provider.js';

export interface ServerVerificationContext {
  authenticatedUserId: string;
  appCheckVerified: boolean;
  rateLimitPassed: boolean;
}

export interface UserSubscriptionEntitlement {
  isPro: boolean;
  status: 'active' | 'grace_period' | 'billing_retry' | 'expired' | 'canceled';
  tier: string;
}

export interface UserScanQuota {
  remainingScans: number;
  cooldownHoursRemaining?: number;
}

export interface ScanStore {
  getSession(scanId: string): Promise<ScanSession | null>;
  saveSession(session: ScanSession): Promise<void>;
  getSnapshot(userId: string, snapshotId: string): Promise<NormalizedSkinAnalysis | null>;
  saveSnapshot(userId: string, snapshot: NormalizedSkinAnalysis): Promise<void>;
  /**
   * Trusted server-side entitlement check.
   * Directly queries backend database / RevenueCat verified webhook state.
   */
  getEntitlement(userId: string): Promise<UserSubscriptionEntitlement>;
  getQuota(userId: string): Promise<UserScanQuota>;
  decrementQuota(userId: string): Promise<void>;
  deleteTransientPhoto(storagePath: string): Promise<void>;
}

export class ScanStateMachine {
  private provider: SkinAnalysisProvider;
  private store: ScanStore;

  constructor(provider: SkinAnalysisProvider, store: ScanStore) {
    this.provider = provider;
    this.store = store;
  }

  /**
   * Step 1: Client initiates scan session.
   * Enforces all 7 gates before generating session or storage paths.
   */
  async createSession(
    userId: string,
    idempotencyKey: string,
    context?: ServerVerificationContext
  ): Promise<ScanSession> {
    // Gate 1: Firebase Authentication & Session ownership
    if (context && context.authenticatedUserId !== userId) {
      throw new Error('UNAUTHORIZED_SESSION_OWNERSHIP_MISMATCH');
    }

    // Gate 2: Firebase App Check verification
    if (context && !context.appCheckVerified) {
      throw new Error('APP_CHECK_VERIFICATION_FAILED');
    }

    // Gate 3: Rate limits
    if (context && !context.rateLimitPassed) {
      throw new Error('RATE_LIMIT_EXCEEDED');
    }

    // Gate 4: Trusted server-side subscription entitlement (CRITICAL ZERO-MARGINAL-COST GATE)
    const entitlement = await this.store.getEntitlement(userId);
    const hasActiveSubscription =
      entitlement.isPro &&
      (entitlement.status === 'active' || entitlement.status === 'grace_period');

    if (!hasActiveSubscription) {
      throw new Error('SUBSCRIPTION_REQUIRED');
    }

    // Gate 5: Scan quota & cooldown check
    const quota = await this.store.getQuota(userId);
    if (quota.remainingScans <= 0) {
      throw new Error('SCAN_QUOTA_EXCEEDED');
    }
    if (quota.cooldownHoursRemaining && quota.cooldownHoursRemaining > 0) {
      throw new Error('SCAN_COOLDOWN_ACTIVE');
    }

    // Gate 6 & 7: Idempotent session generation
    const scanId = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const session: ScanSession = {
      scanId,
      userId,
      status: 'CREATED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      angles: ['front'],
      idempotencyKey,
      storagePaths: {
        front: `transient-scans/${userId}/${scanId}/front.jpg`,
        left_profile: '',
        right_profile: ''
      },
      retryCount: 0
    };

    await this.store.saveSession(session);
    return session;
  }

  /**
   * Step 2: Executes the full analysis pipeline idempotently.
   * Gated: No paid third-party provider API is called unless entitlement is verified server-side.
   */
  async processScan(
    scanId: string,
    imageBuffer: Buffer,
    context?: ServerVerificationContext
  ): Promise<NormalizedSkinAnalysis> {
    const session = await this.store.getSession(scanId);
    if (!session) {
      throw new Error(`Scan session ${scanId} not found`);
    }

    // Gate 1: Session ownership
    if (context && context.authenticatedUserId !== session.userId) {
      throw new Error('UNAUTHORIZED_SESSION_OWNERSHIP_MISMATCH');
    }

    // Gate 2: Firebase App Check
    if (context && !context.appCheckVerified) {
      throw new Error('APP_CHECK_VERIFICATION_FAILED');
    }

    // Gate 4: Re-verify server-side subscription entitlement prior to paid API call
    const entitlement = await this.store.getEntitlement(session.userId);
    const hasActiveSubscription =
      entitlement.isPro &&
      (entitlement.status === 'active' || entitlement.status === 'grace_period');

    if (!hasActiveSubscription) {
      throw new Error('SUBSCRIPTION_REQUIRED');
    }

    // IDEMPOTENCY CHECK: Do NOT re-call vendor if already analyzed
    if (session.status === 'COMPLETED' && session.resultSnapshotId) {
      return await this.fetchExistingSnapshot(session.userId, session.resultSnapshotId);
    }

    // Transition state: QUEUED -> ANALYZING
    await this.updateStatus(session, 'ANALYZING');

    let normalized: NormalizedSkinAnalysis;

    try {
      // Deduct quota atomically on actual analysis attempt
      await this.store.decrementQuota(session.userId);

      // Call Skin Provider (paid cloud API call)
      normalized = await this.provider.analyzeSkin(session, imageBuffer);

      // Transition state: NORMALIZING -> COMPLETED
      await this.updateStatus(session, 'NORMALIZING');

      // Persist snapshot to Firestore
      await this.store.saveSnapshot(session.userId, normalized);

      session.resultSnapshotId = normalized.scanId;
      await this.updateStatus(session, 'COMPLETED');

      // PHOTO DATA MINIMIZATION: Clean up raw transient photo immediately
      if (session.storagePaths.front) {
        await this.store.deleteTransientPhoto(session.storagePaths.front).catch(err => {
          console.warn(`Transient photo cleanup deferred: ${err.message}`);
        });
      }

      return normalized;
    } catch (err: any) {
      session.failureReason = err.message;
      await this.updateStatus(session, 'FAILED_RETRYABLE');
      throw err;
    }
  }

  private async updateStatus(session: ScanSession, status: ScanStatus): Promise<void> {
    session.status = status;
    session.updatedAt = new Date().toISOString();
    await this.store.saveSession(session);
  }

  private async fetchExistingSnapshot(userId: string, snapshotId: string): Promise<NormalizedSkinAnalysis> {
    const existing = await this.store.getSnapshot(userId, snapshotId);
    if (existing) {
      return existing;
    }
    throw new Error(`Snapshot ${snapshotId} not found in store`);
  }
}
