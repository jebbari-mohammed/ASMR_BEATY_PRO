import * as admin from 'firebase-admin';
import { TrialAccountUnavailableError } from '../app-free-trial.js';
import { TrialStorePreference } from '../trial-store-preference.js';
import type { StoreVerifiedEntitlement } from '../revenuecat-verifier.js';
import { StaleStoreVerificationError } from '../verified-entitlement-store.js';

const NOW_MS = 1_800_000_000_000;
const paid: StoreVerifiedEntitlement = {
  isPro: true,
  status: 'active',
  tier: 'PRO_ANNUAL',
  expiresAtMs: NOW_MS + 30 * 24 * 60 * 60 * 1000,
  requestDateMs: NOW_MS
};
const refunded: StoreVerifiedEntitlement = {
  isPro: false, status: 'expired', tier: 'FREE', expiresAtMs: null, requestDateMs: NOW_MS + 1
};

function setup({
  exists = true,
  cacheReadFails = false,
  cacheData = {
    source: 'revenuecat_server',
    isPro: true,
    expiresAt: admin.firestore.Timestamp.fromMillis(NOW_MS + 1000)
  } as Record<string, unknown>,
  vendorResult = paid,
  cacheWriteSucceeds = true
} = {}) {
  const get = jest.fn(async () => {
    if (cacheReadFails) throw new Error('Firestore unavailable');
    return { exists, get: (field: string) => cacheData[field] };
  });
  const ref = (path: string): any => ({
    path,
    get,
    collection: (name: string) => ({ doc: (id: string) => ref(`${path}/${name}/${id}`) })
  });
  const db: any = { collection: (name: string) => ({ doc: (id: string) => ref(`${name}/${id}`) }) };
  const verifyStore = jest.fn(async () => vendorResult);
  const cacheStore = jest.fn(async () => cacheWriteSucceeds);
  return {
    preference: new TrialStorePreference(db, verifyStore, cacheStore, () => NOW_MS),
    get, verifyStore, cacheStore
  };
}

test('a fresh store check identifies a genuine purchase made during the app trial', async () => {
  const { preference, verifyStore, cacheStore } = setup();
  const { requestDateMs: _requestDateMs, ...paidPublic } = paid;
  await expect(preference.current('user_123')).resolves.toEqual({ ...paidPublic, source: 'revenuecat_server' });
  expect(verifyStore).toHaveBeenCalledWith('user_123');
  expect(cacheStore).toHaveBeenCalledWith('user_123', paid);
});

test.each([
  ['missing cache', { exists: false }],
  ['wrong source', { cacheData: { source: 'client', isPro: true, expiresAt: admin.firestore.Timestamp.fromMillis(NOW_MS + 1000) } }],
  ['inactive cache', { cacheData: { source: 'revenuecat_server', isPro: false, expiresAt: admin.firestore.Timestamp.fromMillis(NOW_MS + 1000) } }],
  ['expired cache', { cacheData: { source: 'revenuecat_server', isPro: true, expiresAt: admin.firestore.Timestamp.fromMillis(NOW_MS) } }],
  ['non-timestamp expiry', { cacheData: { source: 'revenuecat_server', isPro: true, expiresAt: new Date(NOW_MS + 1000).toISOString() } }],
  ['cache read outage', { cacheReadFails: true }]
] as const)('%s keeps valid trial access without treating cache as a purchase', async (_description, options) => {
  const { preference, verifyStore, cacheStore } = setup(options as Parameters<typeof setup>[0]);
  await expect(preference.current('user_123')).resolves.toBeNull();
  expect(verifyStore).not.toHaveBeenCalled();
  expect(cacheStore).not.toHaveBeenCalled();
});

test('a refunded store subscription clears the stale purchase cache but leaves the trial active', async () => {
  const { preference, cacheStore } = setup({ vendorResult: refunded });
  await expect(preference.current('user_123')).resolves.toBeNull();
  expect(cacheStore).toHaveBeenCalledWith('user_123', refunded);
});

test('a vendor outage does not interrupt valid app-trial access', async () => {
  const { preference, verifyStore, cacheStore } = setup();
  verifyStore.mockRejectedValueOnce(new Error('RevenueCat unavailable'));
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  try {
    await expect(preference.current('user_123')).resolves.toBeNull();
    expect(cacheStore).not.toHaveBeenCalled();
  } finally {
    warn.mockRestore();
  }
});

test('an account deleted during store reconciliation cannot receive paid access', async () => {
  const { preference } = setup({ cacheWriteSucceeds: false });
  await expect(preference.current('user_123')).rejects.toBeInstanceOf(TrialAccountUnavailableError);
});

test('a stale paid check cannot replace newer revocation during a valid app trial', async () => {
  const { preference, cacheStore } = setup();
  cacheStore.mockRejectedValueOnce(new StaleStoreVerificationError());
  await expect(preference.current('user_123')).resolves.toBeNull();
});
