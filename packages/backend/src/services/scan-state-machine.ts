import { ScanSession, NormalizedSkinAnalysis, ScanStatus } from '@asmr/shared';
import { SkinAnalysisProvider } from '../providers/skin/base.provider.js';

export interface ScanStore {
  getSession(scanId: string): Promise<ScanSession | null>;
  saveSession(session: ScanSession): Promise<void>;
  getSnapshot(userId: string, snapshotId: string): Promise<NormalizedSkinAnalysis | null>;
  saveSnapshot(userId: string, snapshot: NormalizedSkinAnalysis): Promise<void>;
  getQuota(userId: string): Promise<{ remainingScans: number; isPro: boolean }>;
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
   * Step 1: Client initiates scan session with an idempotency key.
   * Atomic quota check happens here BEFORE any upload URL is generated.
   */
  async createSession(userId: string, idempotencyKey: string): Promise<ScanSession> {
    const quota = await this.store.getQuota(userId);
    if (quota.remainingScans <= 0 && !quota.isPro) {
      throw new Error('MONTHLY_SCAN_QUOTA_EXCEEDED');
    }

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
   * If session was already COMPLETED, returns cached result immediately without calling vendor API again!
   */
  async processScan(scanId: string, imageBuffer: Buffer): Promise<NormalizedSkinAnalysis> {
    const session = await this.store.getSession(scanId);
    if (!session) {
      throw new Error(`Scan session ${scanId} not found`);
    }

    // IDEMPOTENCY CHECK: Do NOT re-call vendor if already analyzed
    if (session.status === 'COMPLETED' && session.resultSnapshotId) {
      // Re-fetch cached snapshot from store without costing any API credits
      return await this.fetchExistingSnapshot(session.userId, session.resultSnapshotId);
    }

    // Transition state: QUEUED -> ANALYZING
    await this.updateStatus(session, 'ANALYZING');

    let normalized: NormalizedSkinAnalysis;

    try {
      // Deduct quota atomically on first actual analysis attempt
      await this.store.decrementQuota(session.userId);

      // Call Skin Provider
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
