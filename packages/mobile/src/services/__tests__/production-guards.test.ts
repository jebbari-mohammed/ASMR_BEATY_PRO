import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import { REVENUECAT_CONFIG, SubscriptionService } from '../subscription-service';
import { ScanService } from '../scan-service';
import { CoachAIEngine } from '../coach-ai-engine';
import { OnboardingService, INITIAL_ONBOARDING_STATE } from '../onboarding-machine';
import { clearLegacyRoutineCheckoffs } from '../legacy-routine-cleanup';
import { isFeatureReady } from '../feature-readiness';

let mockCurrentUser: { uid: string; emailVerified: boolean } | null = null;
const mockVerify = jest.fn();
const mockProfileSet = jest.fn();

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn()
}));

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///app/',
  getInfoAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn()
}));

jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    getCustomerInfo: jest.fn(),
    getOfferings: jest.fn(),
    purchasePackage: jest.fn(),
    purchaseSubscriptionOption: jest.fn(),
    restorePurchases: jest.fn(),
    checkTrialOrIntroductoryPriceEligibility: jest.fn(),
    INTRO_ELIGIBILITY_STATUS: { INTRO_ELIGIBILITY_STATUS_ELIGIBLE: 2 },
    logIn: jest.fn(),
    logOut: jest.fn()
  }
}));

jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: () => ({ currentUser: mockCurrentUser })
}));
jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: () => ({ collection: () => ({ doc: () => ({ set: mockProfileSet }) }) })
}));
jest.mock('@react-native-firebase/functions', () => ({
  __esModule: true,
  default: () => ({ httpsCallable: () => mockVerify })
}));

const storeGet = SecureStore.getItemAsync as jest.Mock;
const storeSet = SecureStore.setItemAsync as jest.Mock;
const storeDelete = SecureStore.deleteItemAsync as jest.Mock;
const purchasePackage = Purchases.purchasePackage as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  (Platform as { OS: string }).OS = 'ios';
  mockCurrentUser = null;
  storeGet.mockResolvedValue(null);
  storeSet.mockReset().mockResolvedValue(undefined);
  storeDelete.mockResolvedValue(undefined);
  mockProfileSet.mockReset().mockResolvedValue(undefined);
  mockVerify.mockReset();
  (Purchases.logIn as jest.Mock).mockReset().mockResolvedValue(undefined);
  (Purchases.logOut as jest.Mock).mockReset().mockResolvedValue(undefined);
  (FileSystem.writeAsStringAsync as jest.Mock).mockReset().mockResolvedValue(undefined);
  (FileSystem.deleteAsync as jest.Mock).mockReset().mockResolvedValue(undefined);
  (FileSystem.getInfoAsync as jest.Mock).mockImplementation(async (path: string) => ({
    exists: path === 'file:///app/installation-boundary-v1.txt'
  }));
});

test('Android checkout selects only the explicit eligible 14-day offer and falls back to the base plan when disabled', async () => {
  const originalKey = REVENUECAT_CONFIG.googleApiKey;
  REVENUECAT_CONFIG.googleApiKey = 'goog_test';
  (Platform as { OS: string }).OS = 'android';
  mockCurrentUser = { uid: 'android-trial-user', emailVerified: true };
  const base = { id: 'annual:annual', isBasePlan: true };
  const trial = { id: 'annual:trial-14d', isBasePlan: false,
    freePhase: { price: { amountMicros: 0 }, billingPeriod: { iso8601: 'P2W' } } };
  const pkg = { identifier: 'annual', packageType: 'ANNUAL', product: {
    identifier: 'skincoach_3999_1y:annual', subscriptionOptions: [base, trial]
  } } as unknown as PurchasesPackage;
  (Purchases.getOfferings as jest.Mock).mockResolvedValue({ all: {
    default: { availablePackages: [pkg] }, trial_14d: { availablePackages: [pkg] }
  } });
  (Purchases.purchaseSubscriptionOption as jest.Mock).mockResolvedValue({});
  try {
    await SubscriptionService.initialize('android-trial-user');
    await expect(SubscriptionService.getFreeTrialPeriods([pkg])).resolves.toEqual({ annual: 'P2W' });
    mockVerify.mockResolvedValueOnce({ data: { trialEnabled: true, offeringId: 'trial_14d' } })
      .mockResolvedValueOnce({ data: { isPro: true, source: 'revenuecat_server', expiresAtMs: Date.now() + 60_000 } });
    await expect(SubscriptionService.purchasePlan('annual', 'skincoach_3999_1y:annual', 'annual:trial-14d'))
      .resolves.toMatchObject({ success: true });
    expect(Purchases.purchaseSubscriptionOption).toHaveBeenLastCalledWith(trial);

    mockVerify.mockResolvedValueOnce({ data: { trialEnabled: false, offeringId: 'default' } });
    await expect(SubscriptionService.purchasePlan('annual', 'skincoach_3999_1y:annual', 'annual:trial-14d'))
      .rejects.toThrow('Trial availability changed');
    expect(Purchases.purchaseSubscriptionOption).toHaveBeenCalledTimes(1);

    mockVerify.mockResolvedValueOnce({ data: { trialEnabled: false, offeringId: 'default' } })
      .mockResolvedValueOnce({ data: { isPro: true, source: 'revenuecat_server', expiresAtMs: Date.now() + 60_000 } });
    await expect(SubscriptionService.purchasePlan('annual', 'skincoach_3999_1y:annual'))
      .resolves.toMatchObject({ success: true });
    expect(Purchases.purchaseSubscriptionOption).toHaveBeenLastCalledWith(base);
  } finally {
    await SubscriptionService.forgetIdentity();
    REVENUECAT_CONFIG.googleApiKey = originalKey;
    mockCurrentUser = null;
    (Platform as { OS: string }).OS = 'ios';
  }
});

test('onboarding completion does not depend on the iOS Keychain', async () => {
  await OnboardingService.markCompleted();
  expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith('file:///app/onboarding-completed.txt', 'true');
  expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
});

test('a fresh installation discards surviving Keychain answers and scan before saving new choices', async () => {
  const values = new Map<string, string>([
    ['asmr_onboarding_state_v1', JSON.stringify({ ...INITIAL_ONBOARDING_STATE, currentStep: 'COMPLETED', selectedGoals: ['old_goal'] })],
    ['asmr_onboarding_pending_account_uid', 'old-user'],
    ['asmr_onboarding_completed', 'true'],
    ['asmr_latest_skin_scan_v1', '{"photoUri":"file:///old-face.jpg"}']
  ]);
  let installed = false;
  (FileSystem.getInfoAsync as jest.Mock).mockImplementation(async (path: string) => ({
    exists: path === 'file:///app/installation-boundary-v1.txt' && installed
  }));
  (FileSystem.writeAsStringAsync as jest.Mock).mockImplementation(async (path: string) => {
    if (path === 'file:///app/installation-boundary-v1.txt') installed = true;
  });
  storeGet.mockImplementation(async (key: string) => values.get(key) ?? null);
  storeSet.mockImplementation(async (key: string, value: string) => { values.set(key, value); });
  storeDelete.mockImplementation(async (key: string) => { values.delete(key); });

  await expect(OnboardingService.loadState()).resolves.toEqual(INITIAL_ONBOARDING_STATE);
  expect(installed).toBe(true);
  expect([...values.keys()]).toEqual([]);
  await expect(OnboardingService.isCompleted()).resolves.toBe(false);

  const newState = { ...INITIAL_ONBOARDING_STATE, currentStep: 'GOALS' as const };
  await OnboardingService.saveState(newState);
  await expect(OnboardingService.loadState()).resolves.toEqual(newState);
});

test('failed sign-out cleanup blocks stale answers until a later purge succeeds', async () => {
  const values = new Map<string, string>([
    ['asmr_onboarding_state_v1', JSON.stringify({
      ...INITIAL_ONBOARDING_STATE,
      currentStep: 'COMPLETED',
      selectedGoals: ['more_hydration_less_dryness']
    })],
    ['asmr_latest_skin_scan_v1', '{"photoUri":"file:///old-face.jpg"}']
  ]);
  let pendingPurge = false;
  let failDeletion = true;
  (FileSystem.getInfoAsync as jest.Mock).mockImplementation(async (path: string) => ({
    exists: path === 'file:///app/installation-boundary-v1.txt' ||
      (path === 'file:///app/personal-data-purge-pending.txt' && pendingPurge)
  }));
  (FileSystem.writeAsStringAsync as jest.Mock).mockImplementation(async (path: string) => {
    if (path === 'file:///app/personal-data-purge-pending.txt') pendingPurge = true;
  });
  (FileSystem.deleteAsync as jest.Mock).mockImplementation(async (path: string) => {
    if (path === 'file:///app/personal-data-purge-pending.txt') pendingPurge = false;
  });
  storeGet.mockImplementation(async (key: string) => values.get(key) ?? null);
  storeSet.mockImplementation(async (key: string, value: string) => { values.set(key, value); });
  storeDelete.mockImplementation(async (key: string) => {
    if (key === 'asmr_onboarding_state_v1' && failDeletion) throw new Error('Keychain locked');
    values.delete(key);
  });

  await expect(OnboardingService.clearDevicePersonalData()).rejects.toThrow('Keychain locked');
  expect(pendingPurge).toBe(true);
  await expect(OnboardingService.loadState()).resolves.toEqual(INITIAL_ONBOARDING_STATE);
  expect(storeGet).not.toHaveBeenCalledWith('asmr_onboarding_state_v1');

  failDeletion = false;
  await expect(OnboardingService.loadState()).resolves.toEqual(INITIAL_ONBOARDING_STATE);
  expect(pendingPurge).toBe(false);
  expect([...values.keys()]).toEqual([]);
});

test('failed purge-marker write removes the install marker and stays closed on the next launch', async () => {
  const values = new Map<string, string>([
    ['asmr_onboarding_state_v1', JSON.stringify({
      ...INITIAL_ONBOARDING_STATE,
      currentStep: 'COMPLETED',
      selectedGoals: ['more_hydration_less_dryness']
    })]
  ]);
  let installed = true;
  let failDeletion = true;
  const getInfo = async (path: string) => ({
    exists: path === 'file:///app/installation-boundary-v1.txt' && installed
  });
  const deleteFile = async (path: string) => {
    if (path === 'file:///app/installation-boundary-v1.txt') installed = false;
  };
  const deleteValue = async (key: string) => {
    if (key === 'asmr_onboarding_state_v1' && failDeletion) throw new Error('Keychain locked');
    values.delete(key);
  };
  (FileSystem.getInfoAsync as jest.Mock).mockImplementation(getInfo);
  (FileSystem.writeAsStringAsync as jest.Mock).mockImplementation(async (path: string) => {
    if (path === 'file:///app/personal-data-purge-pending.txt') throw new Error('Disk write failed');
    if (path === 'file:///app/installation-boundary-v1.txt') installed = true;
  });
  (FileSystem.deleteAsync as jest.Mock).mockImplementation(deleteFile);
  storeDelete.mockImplementation(deleteValue);
  storeGet.mockImplementation(async (key: string) => values.get(key) ?? null);

  await expect(OnboardingService.clearDevicePersonalData()).rejects.toThrow('Keychain locked');
  expect(installed).toBe(false);

  await jest.isolateModulesAsync(async () => {
    const freshStore = require('expo-secure-store') as typeof SecureStore;
    const freshFiles = require('expo-file-system/legacy') as typeof FileSystem;
    (freshStore.getItemAsync as jest.Mock).mockImplementation(async (key: string) => values.get(key) ?? null);
    (freshStore.deleteItemAsync as jest.Mock).mockImplementation(deleteValue);
    (freshFiles.getInfoAsync as jest.Mock).mockImplementation(getInfo);
    (freshFiles.writeAsStringAsync as jest.Mock).mockImplementation(async (path: string) => {
      if (path === 'file:///app/installation-boundary-v1.txt') installed = true;
    });
    const { OnboardingService: FreshService } = require('../onboarding-machine') as typeof import('../onboarding-machine');
    await expect(FreshService.loadState()).resolves.toEqual(INITIAL_ONBOARDING_STATE);
    expect(freshStore.getItemAsync).not.toHaveBeenCalledWith('asmr_onboarding_state_v1');
  });

  failDeletion = false;
  await OnboardingService.loadState();
  expect([...values.keys()]).toEqual([]);
});

test('sign-out cleanup refuses account switching when neither disk guard nor Keychain purge works', async () => {
  (FileSystem.writeAsStringAsync as jest.Mock).mockRejectedValue(new Error('Disk write failed'));
  (FileSystem.deleteAsync as jest.Mock).mockRejectedValue(new Error('Disk delete failed'));
  storeDelete.mockRejectedValue(new Error('Keychain locked'));

  await expect(OnboardingService.clearDevicePersonalData())
    .rejects.toThrow('Device data could not be secured');

  (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);
  (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);
  storeDelete.mockResolvedValue(undefined);
  await OnboardingService.loadState();
});

test('sign-out cleanup refuses account switching when the initial install boundary cannot be read', async () => {
  (FileSystem.getInfoAsync as jest.Mock).mockRejectedValue(new Error('Disk unavailable'));
  await expect(OnboardingService.clearDevicePersonalData())
    .rejects.toThrow('Device data could not be secured');
  expect(FileSystem.writeAsStringAsync).not.toHaveBeenCalled();
  expect(storeDelete).not.toHaveBeenCalled();
});

test('old onboarding writes cannot reappear while device cleanup is running', async () => {
  let finishStateDeletion: (() => void) | undefined;
  storeDelete.mockImplementation((key: string) => key === 'asmr_onboarding_state_v1'
    ? new Promise<void>(resolve => { finishStateDeletion = resolve; })
    : Promise.resolve());

  const cleanup = OnboardingService.clearDevicePersonalData();
  await new Promise<void>(resolve => setImmediate(resolve));
  expect(finishStateDeletion).toBeDefined();
  await expect(OnboardingService.saveState({
    ...INITIAL_ONBOARDING_STATE,
    currentStep: 'GOALS'
  })).rejects.toThrow('Device cleanup is in progress');
  await expect(OnboardingService.loadState()).resolves.toEqual(INITIAL_ONBOARDING_STATE);

  finishStateDeletion?.();
  await cleanup;
  expect(storeSet).not.toHaveBeenCalledWith('asmr_onboarding_state_v1', expect.anything());
});

test('cleanup deletes an onboarding write that was already in flight', async () => {
  const values = new Map<string, string>();
  let finishStateWrite: (() => void) | undefined;
  storeSet.mockImplementation((key: string, value: string) => new Promise<void>(resolve => {
    finishStateWrite = () => { values.set(key, value); resolve(); };
  }));
  storeDelete.mockImplementation(async (key: string) => { values.delete(key); });

  const saving = OnboardingService.saveState({
    ...INITIAL_ONBOARDING_STATE,
    currentStep: 'SKIN_FEEL'
  });
  await new Promise<void>(resolve => setImmediate(resolve));
  expect(finishStateWrite).toBeDefined();

  const cleanup = OnboardingService.clearDevicePersonalData();
  await new Promise<void>(resolve => setImmediate(resolve));
  expect(storeDelete).not.toHaveBeenCalledWith('asmr_onboarding_state_v1');

  finishStateWrite?.();
  await saving;
  await cleanup;
  expect(values.has('asmr_onboarding_state_v1')).toBe(false);
});

test('rapid onboarding writes reach storage in choice order before reset', async () => {
  const finishWrites: Array<() => void> = [];
  storeSet.mockImplementation(() => new Promise<void>(resolve => finishWrites.push(resolve)));

  const first = OnboardingService.saveState({ ...INITIAL_ONBOARDING_STATE, currentStep: 'GOALS' });
  const second = OnboardingService.saveState({ ...INITIAL_ONBOARDING_STATE, currentStep: 'SKIN_FEEL' });
  await new Promise<void>(resolve => setImmediate(resolve));
  expect(storeSet).toHaveBeenCalledTimes(1);

  finishWrites[0]();
  await first;
  await new Promise<void>(resolve => setImmediate(resolve));
  expect(storeSet).toHaveBeenCalledTimes(2);
  expect(storeSet.mock.calls.map(([, value]) => JSON.parse(value).currentStep))
    .toEqual(['GOALS', 'SKIN_FEEL']);

  const reset = OnboardingService.reset();
  expect(storeDelete).not.toHaveBeenCalledWith('asmr_onboarding_state_v1');
  finishWrites[1]();
  await second;
  await reset;
  expect(storeDelete).toHaveBeenCalledWith('asmr_onboarding_state_v1');
});

test('new account binding moves personal answers to its profile and removes the shared device copy', async () => {
  const values = new Map<string, string>([
    ['asmr_onboarding_state_v1', JSON.stringify({
      ...INITIAL_ONBOARDING_STATE,
      currentStep: 'COMPLETED',
      selectedGoals: ['more_hydration_less_dryness'],
      skinFeelByEndOfDay: 'tight_or_dry'
    })],
    ['asmr_latest_skin_scan_v1', '{"photoUri":"file:///old-face.jpg"}']
  ]);
  mockCurrentUser = { uid: 'new-user', emailVerified: false };
  storeGet.mockImplementation(async (key: string) => values.get(key) ?? null);
  storeSet.mockImplementation(async (key: string, value: string) => { values.set(key, value); });
  storeDelete.mockImplementation(async (key: string) => { values.delete(key); });

  await OnboardingService.bindNewAccount('new-user');

  expect(mockProfileSet).toHaveBeenCalledWith({ starterPreferences: expect.objectContaining({
    selectedGoals: ['more_hydration_less_dryness'],
    skinFeelByEndOfDay: 'tight_or_dry'
  }) }, { merge: true });
  expect(values.has('asmr_onboarding_state_v1')).toBe(false);
  expect(values.has('asmr_onboarding_pending_account_uid')).toBe(false);
  expect(values.has('asmr_latest_skin_scan_v1')).toBe(false);
  expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
    'file:///app/personal-data-purge-pending.txt',
    { idempotent: true }
  );
});

test('a pending preview cannot be synced to a different signed-in account', async () => {
  mockCurrentUser = { uid: 'another-user', emailVerified: true };
  storeGet.mockResolvedValue('first-user');

  await OnboardingService.syncPendingAccount('first-user');

  expect(mockProfileSet).not.toHaveBeenCalled();
  expect(storeDelete).not.toHaveBeenCalledWith('asmr_onboarding_pending_account_uid');
});

test('legacy self-granted Pro state is removed and never unlocks access', async () => {
  await SubscriptionService.initialize();
  expect(storeDelete).toHaveBeenCalledWith('asmr_user_subscription_entitlement_v1');
  await expect(SubscriptionService.hasActiveEntitlement()).resolves.toBe(false);
  expect(Purchases.getCustomerInfo).not.toHaveBeenCalled();
});

test('purchase is closed without a signed-in Firebase account', async () => {
  await expect(SubscriptionService.purchasePlan('pro_annual_3999_direct'))
    .rejects.toThrow('Pro enrollment is not available yet.');
  expect(purchasePackage).not.toHaveBeenCalled();
});

test('local photo URI cannot produce a skin score', async () => {
  await expect(ScanService.analyzeAndSaveScan('file:///photo.jpg'))
    .rejects.toThrow('Skin analysis is unavailable');
  await expect(ScanService.getLatestScan()).resolves.toBeNull();
  expect(storeDelete).toHaveBeenCalledWith('asmr_latest_skin_scan_v1');
});

test('disabled coach cannot generate a scripted answer', () => {
  expect(() => CoachAIEngine.generateReply('hello', {} as never))
    .toThrow('AI coaching is unavailable');
});

test('saved onboarding resumes before the disabled scan and paywall', async () => {
  storeGet.mockResolvedValue(JSON.stringify({
    ...INITIAL_ONBOARDING_STATE,
    currentStep: 'PROCESSING_SCAN',
    completedSteps: ['WELCOME', 'GUIDED_SCAN']
  }));
  const state = await OnboardingService.loadState();
  expect(state.currentStep).toBe('SKIN_FEEL');
  expect(state.completedSteps).not.toContain('GUIDED_SCAN');
  expect(SecureStore.setItemAsync).toHaveBeenCalled();
});

test('saved shelf prompt resumes after the unavailable product capture', async () => {
  storeGet.mockResolvedValue(JSON.stringify({
    ...INITIAL_ONBOARDING_STATE,
    currentStep: 'SHELF_CAPTURE_PROMPT',
    completedSteps: ['WELCOME', 'AGE_GATE', 'GOALS']
  }));
  const state = await OnboardingService.loadState();
  expect(state.currentStep).toBe('DESIRED_COMPLEXITY');
});

test('unverified personal-data features remain closed', () => {
  expect(['scan', 'coach'].every(feature =>
    !isFeatureReady(feature as Parameters<typeof isFeatureReady>[0])
  )).toBe(true);
});

test('a new store identity waits for the previous account logout to finish', async () => {
  const previousKey = REVENUECAT_CONFIG.appleApiKey;
  REVENUECAT_CONFIG.appleApiKey = 'appl_test_key';
  mockCurrentUser = { uid: 'first-user', emailVerified: true };
  let finishLogout: (() => void) | undefined;
  (Purchases.logOut as jest.Mock).mockImplementation(() => new Promise<void>(resolve => { finishLogout = resolve; }));
  try {
    await SubscriptionService.initialize('first-user');
    (Purchases.logIn as jest.Mock).mockClear();
    const logout = SubscriptionService.forgetIdentity();
    mockCurrentUser = { uid: 'second-user', emailVerified: true };
    await SubscriptionService.initialize('second-user');
    expect(Purchases.logIn).not.toHaveBeenCalled();
    expect(SubscriptionService.isPurchaseReady()).toBe(false);

    finishLogout?.();
    await logout;
    await SubscriptionService.initialize('second-user');
    expect(Purchases.logIn).toHaveBeenCalledWith('second-user');
  } finally {
    finishLogout?.();
    REVENUECAT_CONFIG.appleApiKey = previousKey;
  }
});

test('legacy device-only checkoffs are removed before their day index', async () => {
  storeGet.mockResolvedValue('["2026-09-10","2026-09-10","2026-09-11"]');
  await clearLegacyRoutineCheckoffs();
  expect(storeDelete.mock.calls.map(([key]) => key)).toEqual([
    'asmr_daily_routine_2026-09-10',
    'asmr_daily_routine_2026-09-11',
    'asmr_routine_days_v1'
  ]);
});

test('legacy day index remains for retry if a checkoff deletion fails', async () => {
  storeGet.mockResolvedValue('["2026-09-10"]');
  storeDelete.mockRejectedValue(new Error('Keychain locked'));
  await expect(clearLegacyRoutineCheckoffs()).rejects.toThrow('could not be removed');
  expect(storeDelete).not.toHaveBeenCalledWith('asmr_routine_days_v1');
});

test('billing verification outage does not appear as an expired membership', async () => {
  mockCurrentUser = { uid: 'alice', emailVerified: true };
  const originalKey = REVENUECAT_CONFIG.appleApiKey;
  REVENUECAT_CONFIG.appleApiKey = 'appl_test';
  mockVerify.mockRejectedValue(new Error('network unavailable'));
  try {
    await SubscriptionService.initialize('alice');
    await expect(SubscriptionService.hasActiveEntitlement())
      .rejects.toThrow('Membership verification is temporarily unavailable');
  } finally {
    REVENUECAT_CONFIG.appleApiKey = originalKey;
    mockCurrentUser = null;
  }
});

test('a verification burst limit tells the member when to retry', async () => {
  mockCurrentUser = { uid: 'alice', emailVerified: true };
  const originalKey = REVENUECAT_CONFIG.appleApiKey;
  REVENUECAT_CONFIG.appleApiKey = 'appl_test';
  mockVerify.mockRejectedValue({ code: 'functions/resource-exhausted' });
  try {
    await SubscriptionService.initialize('alice');
    await expect(SubscriptionService.hasActiveEntitlement())
      .rejects.toThrow('Wait a minute, then try again.');
  } finally {
    REVENUECAT_CONFIG.appleApiKey = originalKey;
    mockCurrentUser = null;
  }
});

test('store purchase cannot be confirmed by reviewer access', async () => {
  const originalKey = REVENUECAT_CONFIG.appleApiKey;
  REVENUECAT_CONFIG.appleApiKey = 'appl_test';
  mockCurrentUser = { uid: 'purchase-user', emailVerified: true };
  (Purchases.getOfferings as jest.Mock).mockResolvedValue({
    all: { default: { availablePackages: [{ identifier: 'annual', product: { identifier: 'skincoach_3999_1y' } }] } }
  });
  purchasePackage.mockResolvedValue({});
  mockVerify.mockResolvedValueOnce({ data: { trialEnabled: false, offeringId: 'default' } })
    .mockResolvedValueOnce({ data: { isPro: true, source: 'store_review' } });
  try {
    await SubscriptionService.initialize('purchase-user');
    await expect(SubscriptionService.purchasePlan('annual', 'skincoach_3999_1y'))
      .rejects.toThrow('Do not buy again. Use Restore purchases');
    expect(mockVerify).toHaveBeenCalledWith({ purchaseOnly: true });
    expect(purchasePackage).toHaveBeenCalledTimes(1);
  } finally {
    REVENUECAT_CONFIG.appleApiKey = originalKey;
    mockCurrentUser = null;
  }
});

test('a completed store checkout with a verification outage stays in restore state', async () => {
  const originalKey = REVENUECAT_CONFIG.appleApiKey;
  REVENUECAT_CONFIG.appleApiKey = 'appl_test';
  mockCurrentUser = { uid: 'purchase-pending', emailVerified: true };
  (Purchases.getOfferings as jest.Mock).mockResolvedValue({
    all: { default: { availablePackages: [{ identifier: 'annual', product: { identifier: 'skincoach_3999_1y' } }] } }
  });
  purchasePackage.mockResolvedValue({});
  mockVerify.mockResolvedValueOnce({ data: { trialEnabled: false, offeringId: 'default' } })
    .mockRejectedValueOnce(new Error('network unavailable'));
  try {
    await SubscriptionService.initialize('purchase-pending');
    await expect(SubscriptionService.purchasePlan('annual', 'skincoach_3999_1y'))
      .rejects.toThrow('Do not buy again. Use Restore purchases');
    expect(purchasePackage).toHaveBeenCalledTimes(1);
    expect(mockVerify).toHaveBeenCalledWith({ purchaseOnly: true });
  } finally {
    REVENUECAT_CONFIG.appleApiKey = originalKey;
    mockCurrentUser = null;
  }
});

test('restore cannot mistake an unready store identity for no purchase', async () => {
  mockCurrentUser = null;
  await expect(SubscriptionService.restorePurchases())
    .rejects.toThrow('The store is not ready to restore purchases');
  expect(Purchases.restorePurchases).not.toHaveBeenCalled();
});

test('restore reports only an actual store membership', async () => {
  const originalKey = REVENUECAT_CONFIG.appleApiKey;
  REVENUECAT_CONFIG.appleApiKey = 'appl_test';
  mockCurrentUser = { uid: 'restore-user', emailVerified: true };
  (Purchases.restorePurchases as jest.Mock).mockResolvedValue({});
  try {
    await SubscriptionService.initialize('restore-user');
    mockVerify.mockResolvedValueOnce({ data: { isPro: true, source: 'store_review' } });
    await expect(SubscriptionService.restorePurchases()).resolves.toBe(false);
    mockVerify.mockResolvedValueOnce({ data: { isPro: true, source: 'app_trial' } });
    await expect(SubscriptionService.restorePurchases()).resolves.toBe(false);
    mockVerify.mockResolvedValueOnce({ data: {
      isPro: true, source: 'revenuecat_cache', expiresAtMs: Date.now() + 60_000
    } });
    await expect(SubscriptionService.restorePurchases()).resolves.toBe(false);
    mockVerify.mockResolvedValueOnce({ data: {
      isPro: true, source: 'revenuecat_server', status: 'active', tier: 'PRO', expiresAtMs: Date.now() + 60_000
    } });
    await expect(SubscriptionService.restorePurchases()).resolves.toBe(true);
    expect(mockVerify).toHaveBeenCalledWith({ purchaseOnly: true });
  } finally {
    REVENUECAT_CONFIG.appleApiKey = originalKey;
    mockCurrentUser = null;
  }
});

test('restore does not call a store-confirmed membership absent when server verification lags', async () => {
  const originalKey = REVENUECAT_CONFIG.appleApiKey;
  REVENUECAT_CONFIG.appleApiKey = 'appl_test';
  mockCurrentUser = { uid: 'restore-pending', emailVerified: true };
  (Purchases.restorePurchases as jest.Mock).mockResolvedValue({
    entitlements: { active: { [REVENUECAT_CONFIG.entitlementId]: { isActive: true } } }
  });
  try {
    await SubscriptionService.initialize('restore-pending');
    mockVerify.mockResolvedValueOnce({ data: {
      isPro: false, source: 'revenuecat_server', expiresAtMs: null
    } });
    await expect(SubscriptionService.restorePurchases())
      .rejects.toThrow('The store found an active membership');
    mockVerify.mockRejectedValueOnce(new Error('network unavailable'));
    await expect(SubscriptionService.restorePurchases())
      .rejects.toThrow('Do not buy again');
    expect(Purchases.restorePurchases).toHaveBeenCalledTimes(2);
  } finally {
    REVENUECAT_CONFIG.appleApiKey = originalKey;
    mockCurrentUser = null;
  }
});

test('an existing free lease remains readable but new trials require store configuration', async () => {
  mockCurrentUser = { uid: 'free-user', emailVerified: true };
  const originalKey = REVENUECAT_CONFIG.appleApiKey;
  REVENUECAT_CONFIG.appleApiKey = 'appl_placeholder_asmr';
  try {
    mockVerify.mockResolvedValueOnce({ data: { eligible: false, active: false, endsAt: null } });
    await expect(SubscriptionService.getFreeTrialStatus()).resolves.toEqual({
      eligible: false, active: false, endsAt: null
    });
    expect(mockVerify).toHaveBeenCalledTimes(1);
    mockVerify.mockResolvedValueOnce({ data: { eligible: false, active: true, endsAt: '2026-10-14T03:00:00.000Z' } });
    await expect(SubscriptionService.getFreeTrialStatus()).resolves.toMatchObject({ active: true });
    const expiresAtMs = Date.now() + 10 * 24 * 60 * 60 * 1000;
    mockVerify.mockResolvedValueOnce({ data: { isPro: true, source: 'app_trial', expiresAtMs } });
    await expect(SubscriptionService.verifyAccess()).resolves.toEqual({ active: true, expiresAtMs, source: 'app_trial' });
  } finally {
    REVENUECAT_CONFIG.appleApiKey = originalKey;
    mockCurrentUser = null;
  }
});

test('a malformed paid response cannot open the app gate', async () => {
  mockCurrentUser = { uid: 'paid-user', emailVerified: true };
  mockVerify.mockResolvedValueOnce({ data: { isPro: true, source: 'revenuecat_server' } });
  await expect(SubscriptionService.verifyAccess()).resolves.toMatchObject({ active: false });
  mockVerify.mockResolvedValueOnce({ data: {
    isPro: true, source: 'client_cache', expiresAtMs: Date.now() + 60_000
  } });
  await expect(SubscriptionService.verifyAccess()).resolves.toMatchObject({ active: false });
  mockCurrentUser = null;
});

test('a bounded server cache response opens ordinary access', async () => {
  mockCurrentUser = { uid: 'paid-user', emailVerified: true };
  const expiresAtMs = Date.now() + 60_000;
  mockVerify.mockResolvedValueOnce({ data: {
    isPro: true, source: 'revenuecat_cache', expiresAtMs
  } });
  await expect(SubscriptionService.verifyAccess()).resolves.toEqual({
    active: true, source: 'revenuecat_cache', expiresAtMs
  });
  mockCurrentUser = null;
});

test('billing policy and old lease reject malformed server status and unverified accounts', async () => {
  mockCurrentUser = { uid: 'free-user', emailVerified: true };
  mockVerify.mockResolvedValueOnce({ data: { eligible: true, active: true } });
  await expect(SubscriptionService.getFreeTrialStatus()).rejects.toThrow('temporarily unavailable');
  mockVerify.mockResolvedValueOnce({ data: { eligible: true, active: true, endsAt: '2026-10-14T03:00:00.000Z' } });
  await expect(SubscriptionService.getFreeTrialStatus()).rejects.toThrow('temporarily unavailable');
  mockVerify.mockResolvedValueOnce({ data: { trialEnabled: true, offeringId: 'default' } });
  await expect(SubscriptionService.getBillingPolicy()).rejects.toThrow('temporarily unavailable');
  mockCurrentUser = { uid: 'unverified', emailVerified: false };
  await expect(SubscriptionService.getBillingPolicy()).rejects.toThrow('Verify your email');
});

test('trial wording is withheld when iOS eligibility is unknown or unavailable', async () => {
  const originalKey = REVENUECAT_CONFIG.appleApiKey;
  REVENUECAT_CONFIG.appleApiKey = 'appl_test';
  mockCurrentUser = { uid: 'trial-user', emailVerified: true };
  const pkg = { identifier: 'annual', product: {
    identifier: 'skincoach_3999_1y', introPrice: { price: 0, period: 'P2W' }
  } } as PurchasesPackage;
  const check = Purchases.checkTrialOrIntroductoryPriceEligibility as jest.Mock;
  try {
    await SubscriptionService.initialize('trial-user');
    check.mockResolvedValueOnce({ skincoach_3999_1y: { status: 0 } });
    await expect(SubscriptionService.getFreeTrialPeriods([pkg])).resolves.toEqual({});
    check.mockRejectedValueOnce(new Error('StoreKit unavailable'));
    await expect(SubscriptionService.getFreeTrialPeriods([pkg])).resolves.toEqual({});
    check.mockResolvedValueOnce({ skincoach_3999_1y: { status: 2 } });
    await expect(SubscriptionService.getFreeTrialPeriods([pkg])).resolves.toEqual({ annual: 'P2W' });
  } finally {
    REVENUECAT_CONFIG.appleApiKey = originalKey;
    mockCurrentUser = null;
  }
});
