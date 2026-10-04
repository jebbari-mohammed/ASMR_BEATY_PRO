import {
  ScanStateMachine,
  ScanStore,
  ServerVerificationContext,
  UserSubscriptionEntitlement,
  UserScanQuota
} from '../scan-state-machine.js';
import { MockSkinProvider } from '../../providers/skin/mock.provider.js';
import { ScanSession, NormalizedSkinAnalysis, GeminiSkinScanOutputSchema } from '@asmr/shared';
import { calculateGeminiCostUsd } from '../../config/pricing.config.js';

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
    const analyzeSpy = jest.spyOn(mockProvider, 'analyze');

    await expect(
      stateMachine.createSession('usr_free', 'idem_key_free', {
        authenticatedUserId: 'usr_free',
        appCheckVerified: true,
        rateLimitPassed: true
      })
    ).rejects.toThrow('SUBSCRIPTION_REQUIRED');

    // Ensure zero cloud skin API credits were consumed
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

    // Verify version metadata is present
    expect(result.versionMetadata).toBeDefined();
    expect(result.versionMetadata?.scannerPromptVersion).toBe('SKIN_SCANNER_PROMPT_V1');
    expect(result.versionMetadata?.scoringRubricVersion).toBe('SKIN_SCORING_RUBRIC_V1');

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

    const analyzeSpy = jest.spyOn(mockProvider, 'analyze');

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

describe('Gemini Output Schema & Pricing Validation', () => {
  test('Valid Gemini structured output passes schema validation', () => {
    const validGeminiJson = {
      usable: true,
      metrics: {
        visibleBlemishes: { score: 25, reliability: 'high', regions: ['LEFT_CHEEK'] },
        visibleRedness: { score: 30, reliability: 'high', regions: ['LEFT_CHEEK', 'RIGHT_CHEEK'] },
        visiblePores: { score: 40, reliability: 'high', regions: ['NOSE_T_ZONE'] },
        textureIrregularity: { score: 20, reliability: 'medium', regions: ['FOREHEAD'] },
        visibleSpotsOrUnevenTone: { score: 15, reliability: 'high', regions: ['RIGHT_CHEEK'] },
        surfaceShine: { score: 35, reliability: 'high', regions: ['NOSE_T_ZONE'] },
        darkCircleAppearance: { score: 25, reliability: 'medium', regions: ['LEFT_UNDER_EYE', 'RIGHT_UNDER_EYE'] },
        fineLineAppearance: { score: 10, reliability: 'low', regions: ['LEFT_UNDER_EYE'] }
      }
    };

    const parsed = GeminiSkinScanOutputSchema.safeParse(validGeminiJson);
    expect(parsed.success).toBe(true);
  });

  test('Rejects invalid Gemini output with score out of 0-100 range', () => {
    const invalidJson = {
      usable: true,
      metrics: {
        visibleBlemishes: { score: 150, reliability: 'high', regions: [] } // > 100 invalid
      }
    };

    const parsed = GeminiSkinScanOutputSchema.safeParse(invalidJson);
    expect(parsed.success).toBe(false);
  });

  test('Computes estimated Gemini cost per scan accurately with real visual tokens', () => {
    // 9 images (3 full + 6 crops) = 10,080 visual tokens + ~1,850 prompt = ~11,930 input tokens, ~800 output tokens
    const cost = calculateGeminiCostUsd('gemini-3.8-flash', 11930, 800);
    expect(cost).toBeGreaterThan(0.01); // Approx 1.2 cents ($0.0119)
    expect(cost).toBeLessThan(0.02); // Under 2 cents per complete high-res scan
  });
});
