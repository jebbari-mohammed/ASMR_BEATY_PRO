import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import Purchases from 'react-native-purchases';
import { REVENUECAT_CONFIG, SubscriptionService } from '../subscription-service';
import { ScanService } from '../scan-service';
import { CoachAIEngine } from '../coach-ai-engine';
import { OnboardingService, INITIAL_ONBOARDING_STATE } from '../onboarding-machine';
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
    restorePurchases: jest.fn(),
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
  mockCurrentUser = null;
  storeGet.mockResolvedValue(null);
  storeSet.mockReset().mockResolvedValue(undefined);
  storeDelete.mockResolvedValue(undefined);
  mockProfileSet.mockReset().mockResolvedValue(undefined);
  (FileSystem.getInfoAsync as jest.Mock).mockImplementation(async (path: string) => ({
    exists: path === 'file:///app/installation-boundary-v1.txt'
  }));
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
  expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
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
