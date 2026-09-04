import {
  ScanStateMachine,
  ScanStore,
  ServerVerificationContext,
  UserSubscriptionEntitlement,
  UserScanQuota
} from '../scan-state-machine.js';
import { MockSkinProvider } from '../../providers/skin/mock.provider.js';
import { ScanSession, NormalizedSkinAnalysis } from '@asmr/shared';

describe('ScanStateMachine Unit & Security Gate Tests', () => {
  let mockProvider: MockSkinProvider;
  let mockStore: ScanStore;
  let stateMachine: ScanStateMachine;
  let sessionsDb: Map<string, ScanSession>;
  let snapshotsDb: Map<string, NormalizedSkinAnalysis>;
  let entitlementDb: Map<string, UserSubscriptionEntitlement>;
  let quotaDb: Map<string, UserScanQuota>;
  let deletedPhotos: string[];

  const validContext: ServerVerificationContext = {
    authenticatedUserId: 'usr_pro',
    appCheckVerified: true,
    rateLimitPassed: true
  };

  beforeEach(() => {
    mockProvider = new MockSkinProvider();
    sessionsDb = new Map();
    snapshotsDb = new Map();
    entitlementDb = new Map();
    quotaDb = new Map();
    deletedPhotos = [];

    // Setup initial users:
    // 1. Non-paying / Free user: No active entitlement
    entitlementDb.set('usr_free', {
      isPro: false,
      status: 'expired',
      tier: 'FREE'
    });
    quotaDb.set('usr_free', { remainingScans: 0 });

    // 2. Active Pro subscriber
    entitlementDb.set('usr_pro', {
      isPro: true,
      status: 'active',
      tier: 'PRO_ANNUAL'
    });
    quotaDb.set('usr_pro', { remainingScans: 4 });

    // 3. Pro user whose quota is exhausted
    entitlementDb.set('usr_pro_exhausted', {
      isPro: true,
      status: 'active',
      tier: 'PRO_MONTHLY'
    });
    quotaDb.set('usr_pro_exhausted', { remainingScans: 0 });

    mockStore = {
      getSession: async (id: string) => sessionsDb.get(id) || null,
      saveSession: async (session: ScanSession) => {
        sessionsDb.set(session.scanId, { ...session });
      },
      getSnapshot: async (_userId: string, snapshotId: string) => snapshotsDb.get(snapshotId) || null,
      saveSnapshot: async (_userId: string, snapshot: NormalizedSkinAnalysis) => {
        snapshotsDb.set(snapshot.scanId, snapshot);
      },
      getEntitlement: async (userId: string) =>
        entitlementDb.get(userId) || { isPro: false, status: 'canceled', tier: 'FREE' },
      getQuota: async (userId: string) => quotaDb.get(userId) || { remainingScans: 0 },
      decrementQuota: async (userId: string) => {
        const q = quotaDb.get(userId);
        if (q && q.remainingScans > 0) {
          q.remainingScans -= 1;
        }
      },
      deleteTransientPhoto: async (path: string) => {
        deletedPhotos.push(path);
      }
    };

    stateMachine = new ScanStateMachine(mockProvider, mockStore);
  });

  test('ZERO MARGINAL COST: Rejects non-paying install without calling cloud skin API', async () => {
    const analyzeSpy = jest.spyOn(mockProvider, 'analyzeSkin');

    await expect(
      stateMachine.createSession('usr_free', 'idem_key_free', {
        authenticatedUserId: 'usr_free',
        appCheckVerified: true,
        rateLimitPassed: true
      })
    ).rejects.toThrow('SUBSCRIPTION_REQUIRED');

    // Ensure zero third-party skin API credits were consumed
    expect(analyzeSpy).not.toHaveBeenCalled();
  });

  test('GATE 2: Rejects when Firebase App Check verification fails', async () => {
    await expect(
      stateMachine.createSession('usr_pro', 'idem_key_fake', {
        authenticatedUserId: 'usr_pro',
        appCheckVerified: false, // Invalid / spoofed app token
        rateLimitPassed: true
      })
    ).rejects.toThrow('APP_CHECK_VERIFICATION_FAILED');
  });

  test('GATE 1: Rejects when session ownership does not match authenticated user', async () => {
    await expect(
      stateMachine.createSession('usr_pro', 'idem_key_hijack', {
        authenticatedUserId: 'usr_attacker', // Mismatched UID
        appCheckVerified: true,
        rateLimitPassed: true
      })
    ).rejects.toThrow('UNAUTHORIZED_SESSION_OWNERSHIP_MISMATCH');
  });

  test('GATE 5: Rejects when Pro user monthly/weekly scan quota is exhausted', async () => {
    await expect(
      stateMachine.createSession('usr_pro_exhausted', 'idem_key_exhausted', {
        authenticatedUserId: 'usr_pro_exhausted',
        appCheckVerified: true,
        rateLimitPassed: true
      })
    ).rejects.toThrow('SCAN_QUOTA_EXCEEDED');
  });

  test('SUCCESS: Entitled Pro subscriber passes all 7 gates and executes scan', async () => {
    const session = await stateMachine.createSession('usr_pro', 'idem_key_pro', validContext);
    expect(session.status).toBe('CREATED');
    expect(session.scanId).toBeDefined();

    const dummyImage = Buffer.from('calibrated_face_pixels');
    const result = await stateMachine.processScan(session.scanId, dummyImage, validContext);

    expect(result.scanId).toBe(session.scanId);
    expect(result.baselineCosmeticScore).toBeGreaterThan(0);
    expect(result.topFocusAreas).toHaveLength(3);

    // Verify session completed and transient photo purged
    const updatedSession = await mockStore.getSession(session.scanId);
    expect(updatedSession?.status).toBe('COMPLETED');
    expect(deletedPhotos).toContain(session.storagePaths.front);

    // Verify quota decremented
    const quota = await mockStore.getQuota('usr_pro');
    expect(quota.remainingScans).toBe(3);
  });

  test('IDEMPOTENCY: Mobile retry returns cached snapshot with zero duplicate vendor charges', async () => {
    const session = await stateMachine.createSession('usr_pro', 'idem_key_retry', validContext);
    const dummyImage = Buffer.from('calibrated_face_pixels');

    const analyzeSpy = jest.spyOn(mockProvider, 'analyzeSkin');

    // First analysis invocation
    const firstResult = await stateMachine.processScan(session.scanId, dummyImage, validContext);
    expect(analyzeSpy).toHaveBeenCalledTimes(1);

    // Second analysis invocation with identical session ID (simulated network retry)
    const secondResult = await stateMachine.processScan(session.scanId, dummyImage, validContext);

    // Provider was NOT called a second time
    expect(analyzeSpy).toHaveBeenCalledTimes(1);
    expect(secondResult.scanId).toBe(firstResult.scanId);
  });
});
