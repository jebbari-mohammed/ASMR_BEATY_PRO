import { ScanStateMachine, ScanStore } from '../scan-state-machine.js';
import { MockSkinProvider } from '../../providers/skin/mock.provider.js';
import { ScanSession, NormalizedSkinAnalysis } from '@asmr/shared';

describe('ScanStateMachine Unit Tests', () => {
  let mockProvider: MockSkinProvider;
  let mockStore: ScanStore;
  let stateMachine: ScanStateMachine;
  let sessionsDb: Map<string, ScanSession>;
  let snapshotsDb: Map<string, NormalizedSkinAnalysis>;
  let quotaDb: Map<string, { remainingScans: number; isPro: boolean }>;
  let deletedPhotos: string[];

  beforeEach(() => {
    mockProvider = new MockSkinProvider();
    sessionsDb = new Map();
    snapshotsDb = new Map();
    quotaDb = new Map();
    deletedPhotos = [];

    // Setup initial user quota
    quotaDb.set('usr_valid', { remainingScans: 1, isPro: false });
    quotaDb.set('usr_exhausted', { remainingScans: 0, isPro: false });
    quotaDb.set('usr_pro', { remainingScans: 0, isPro: true }); // Pro user can scan

    mockStore = {
      getSession: async (id: string) => sessionsDb.get(id) || null,
      saveSession: async (session: ScanSession) => {
        sessionsDb.set(session.scanId, { ...session });
      },
      getSnapshot: async (_userId: string, snapshotId: string) => snapshotsDb.get(snapshotId) || null,
      saveSnapshot: async (_userId: string, snapshot: NormalizedSkinAnalysis) => {
        snapshotsDb.set(snapshot.scanId, snapshot);
      },
      getQuota: async (userId: string) => quotaDb.get(userId) || { remainingScans: 0, isPro: false },
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

  test('Rejects session creation when quota is exhausted for free user', async () => {
    await expect(
      stateMachine.createSession('usr_exhausted', 'idem_key_123')
    ).rejects.toThrow('MONTHLY_SCAN_QUOTA_EXCEEDED');
  });

  test('Creates scan session and decrements quota upon analysis execution', async () => {
    const session = await stateMachine.createSession('usr_valid', 'idem_key_valid');
    expect(session.status).toBe('CREATED');
    expect(session.scanId).toBeDefined();

    const dummyImage = Buffer.from('fake_image_bytes');
    const result = await stateMachine.processScan(session.scanId, dummyImage);

    expect(result.scanId).toBe(session.scanId);
    expect(result.baselineCosmeticScore).toBeGreaterThan(0);
    expect(result.topFocusAreas).toHaveLength(3);

    // Verify session state updated to COMPLETED
    const updatedSession = await mockStore.getSession(session.scanId);
    expect(updatedSession?.status).toBe('COMPLETED');

    // Verify transient photo was purged immediately
    expect(deletedPhotos).toContain(session.storagePaths.front);
  });

  test('Idempotency: Processing already completed session returns cached snapshot without re-calling vendor', async () => {
    const session = await stateMachine.createSession('usr_pro', 'idem_key_pro');
    const dummyImage = Buffer.from('fake_image_bytes');

    // Spy on provider
    const analyzeSpy = jest.spyOn(mockProvider, 'analyzeSkin');

    // First execution
    const firstResult = await stateMachine.processScan(session.scanId, dummyImage);
    expect(analyzeSpy).toHaveBeenCalledTimes(1);

    // Second execution with identical scanId (simulate mobile retry)
    const secondResult = await stateMachine.processScan(session.scanId, dummyImage);

    // Provider should NOT have been called again!
    expect(analyzeSpy).toHaveBeenCalledTimes(1);
    expect(secondResult.scanId).toBe(firstResult.scanId);
  });
});
