import * as admin from 'firebase-admin';
import { StaleStoreVerificationError, VerifiedEntitlementStore } from '../verified-entitlement-store.js';
import { PAID_CACHE_OUTAGE_WINDOW_MS } from '../verified-entitlement-store.js';
import { StoreAccessResolver } from '../store-access-resolver.js';
import type { StoreVerifiedEntitlement } from '../revenuecat-verifier.js';

const verified = {
  isPro: true,
  status: 'active' as const,
  tier: 'PRO_MONTHLY' as const,
  expiresAtMs: Date.now() + 60_000,
  requestDateMs: Date.now()
};

function setup({ accountExists = true, guardExists = false, profileExists = true, deleting = false } = {}) {
  const ref = (path: string): any => ({
    path,
    collection: (name: string) => ({ doc: (id: string) => ref(`${path}/${name}/${id}`) })
  });
  const set = jest.fn();
  const transaction = {
    get: jest.fn(async (document: { path: string }) => document.path.startsWith('accountDeletionGuards/')
      ? { exists: guardExists }
      : { exists: profileExists, get: () => deleting ? 'deleting' : undefined }),
    set
  };
  const db: any = {
    collection: (name: string) => ({ doc: (id: string) => ref(`${name}/${id}`) }),
    runTransaction: jest.fn(async (operation: (tx: typeof transaction) => Promise<boolean>) => operation(transaction))
  };
  const auth: any = {
    getUser: jest.fn(async () => {
      if (!accountExists) throw Object.assign(new Error('No user'), { code: 'auth/user-not-found' });
      return { disabled: false };
    })
  };
  return { store: new VerifiedEntitlementStore(db, auth), db, auth, set };
}

test('caches a verified entitlement for a live account', async () => {
  const { store, set } = setup();
  expect(await store.cache('user_123', verified, 'RENEWAL')).toBe(true);
  expect(set).toHaveBeenCalledTimes(1);
  expect(set.mock.calls[0][0].path).toBe('users/user_123/entitlements/pro');
  expect(set.mock.calls[0][1]).toMatchObject({
    isPro: true,
    source: 'revenuecat_server',
    vendorRequestDateMs: verified.requestDateMs,
    lastEventType: 'RENEWAL'
  });
});

test.each([
  ['deleted Auth account', { accountExists: false }],
  ['deletion guard', { guardExists: true }],
  ['deleting profile', { deleting: true }]
])('does not recreate entitlements for a %s', async (_description, options) => {
  const { store, set } = setup(options);
  expect(await store.cache('user_123', verified)).toBe(false);
  expect(set).not.toHaveBeenCalled();
});

test('supports existing verified accounts without a parent profile document', async () => {
  const { store, set } = setup({ profileExists: false });
  expect(await store.cache('user_123', verified)).toBe(true);
  expect(set).toHaveBeenCalledTimes(1);
});

test('transient Auth failures propagate so webhook delivery can retry', async () => {
  const { store, auth, db, set } = setup();
  auth.getUser.mockRejectedValueOnce(new Error('Auth unavailable'));
  await expect(store.cache('user_123', verified)).rejects.toThrow('Auth unavailable');
  expect(db.runTransaction).not.toHaveBeenCalled();
  expect(set).not.toHaveBeenCalled();
});

function orderedStoreFixture() {
  const data = new Map<string, Record<string, unknown>>();
  const ref = (path: string): any => ({
    path,
    collection: (name: string) => ({ doc: (id: string) => ref(`${path}/${name}/${id}`) })
  });
  const db: any = {
    collection: (name: string) => ({ doc: (id: string) => ref(`${name}/${id}`) }),
    runTransaction: async (operation: (transaction: any) => Promise<unknown>) => {
      const writes: Array<{ path: string; value: Record<string, unknown> }> = [];
      const transaction = {
        get: async (document: { path: string }) => {
          const value = data.get(document.path);
          return { exists: value !== undefined, get: (field: string) => value?.[field] };
        },
        set: (document: { path: string }, value: Record<string, unknown>) => {
          writes.push({ path: document.path, value });
        }
      };
      const result = await operation(transaction);
      for (const write of writes) data.set(write.path, write.value);
      return result;
    }
  };
  const auth: any = { getUser: jest.fn(async (uid: string) => ({ uid, disabled: false })) };
  return { store: new VerifiedEntitlementStore(db, auth), data };
}

test('a slow older paid verification cannot reopen access after newer revocation', async () => {
  const { store, data } = orderedStoreFixture();
  let releaseOld!: (result: StoreVerifiedEntitlement) => void;
  const oldVerification = new Promise<StoreVerifiedEntitlement>(resolve => { releaseOld = resolve; });
  const oldPaid: StoreVerifiedEntitlement = {
    isPro: true, status: 'active', tier: 'PRO_MONTHLY', expiresAtMs: 1_900_000_000_000,
    requestDateMs: 1_800_000_000_000
  };
  const newerRevocation: StoreVerifiedEntitlement = {
    isPro: false, status: 'expired', tier: 'FREE', expiresAtMs: null,
    requestDateMs: 1_800_000_000_001
  };
  const cache = (uid: string, result: StoreVerifiedEntitlement) => store.cache(uid, result);
  const slow = new StoreAccessResolver(() => oldVerification, cache, async () => null)
    .current('user_123', false);
  const fast = new StoreAccessResolver(async () => newerRevocation, cache, async () => null);
  await expect(fast.current('user_123', false)).resolves.toMatchObject({ isPro: false });
  releaseOld(oldPaid);
  await expect(slow).rejects.toBeInstanceOf(StaleStoreVerificationError);
  expect(data.get('users/user_123/entitlements/pro')).toMatchObject({
    isPro: false, vendorRequestDateMs: newerRevocation.requestDateMs
  });
});

test('same-millisecond conflict resolves toward revoked access', async () => {
  const { store, data } = orderedStoreFixture();
  const paid: StoreVerifiedEntitlement = {
    isPro: true, status: 'active', tier: 'PRO_ANNUAL', expiresAtMs: 1_900_000_000_000,
    requestDateMs: 1_800_000_000_000
  };
  const revoked: StoreVerifiedEntitlement = {
    isPro: false, status: 'expired', tier: 'FREE', expiresAtMs: null,
    requestDateMs: paid.requestDateMs
  };
  expect(await store.cache('user_123', paid)).toBe(true);
  expect(await store.cache('user_123', revoked)).toBe(true);
  await expect(store.cache('user_123', paid)).rejects.toBeInstanceOf(StaleStoreVerificationError);
  expect(data.get('users/user_123/entitlements/pro')).toMatchObject({ isPro: false });
});

const NOW_MS = 1_800_000_000_000;
const stamp = (time: number) => admin.firestore.Timestamp.fromMillis(time);
const recentPaid = () => ({
  source: 'revenuecat_server', isPro: true, status: 'active', tier: 'PRO_MONTHLY',
  expiresAt: stamp(NOW_MS + 24 * 60 * 60 * 1000), updatedAt: stamp(NOW_MS - 60_000)
});

function setupFallback({
  purchase = recentPaid(), guard = false, deleting = false, account = true,
  disabled = false, emailVerified = true
}: {
  purchase?: Record<string, unknown> | null;
  guard?: boolean; deleting?: boolean; account?: boolean;
  disabled?: boolean; emailVerified?: boolean;
} = {}) {
  const ref = (path: string): any => ({
    path,
    collection: (name: string) => ({ doc: (id: string) => ref(`${path}/${name}/${id}`) })
  });
  const transaction = {
    get: jest.fn(async (document: { path: string }) => {
      const path = document.path;
      const exists = path.startsWith('accountDeletionGuards/') ? guard
        : path.endsWith('/entitlements/pro') ? purchase !== null : true;
      const data = path.endsWith('/entitlements/pro') ? purchase
        : path.startsWith('users/') ? { deletionStatus: deleting ? 'deleting' : 'active' } : null;
      return { exists, get: (field: string) => data?.[field as keyof typeof data] };
    })
  };
  const db: any = {
    collection: (name: string) => ({ doc: (id: string) => ref(`${name}/${id}`) }),
    runTransaction: jest.fn(async (operation: (tx: typeof transaction) => Promise<unknown>) => operation(transaction))
  };
  const auth: any = {
    getUser: jest.fn(async () => {
      if (!account) throw Object.assign(new Error('No user'), { code: 'auth/user-not-found' });
      return { disabled, emailVerified };
    })
  };
  return { store: new VerifiedEntitlementStore(db, auth, () => NOW_MS), auth, db };
}

test('recent paid proof bridges an outage only until its store and freshness deadlines', async () => {
  const { store } = setupFallback();
  await expect(store.recentPaidAccess('alice')).resolves.toMatchObject({
    isPro: true, tier: 'PRO_MONTHLY', status: 'active', source: 'revenuecat_cache',
    expiresAtMs: NOW_MS + 24 * 60 * 60 * 1000
  });
});

test.each([
  ['refunded', { ...recentPaid(), isPro: false }],
  ['wrong source', { ...recentPaid(), source: 'client' }],
  ['expired store period', { ...recentPaid(), expiresAt: stamp(NOW_MS) }],
  ['stale six-hour proof', { ...recentPaid(), updatedAt: stamp(NOW_MS - PAID_CACHE_OUTAGE_WINDOW_MS) }],
  ['future verification', { ...recentPaid(), updatedAt: stamp(NOW_MS + 1) }],
  ['missing verification timestamp', { ...recentPaid(), updatedAt: null }],
  ['unapproved tier', { ...recentPaid(), tier: 'LIFETIME' }],
  ['inactive status', { ...recentPaid(), status: 'canceled' }]
])('%s cannot be used as outage fallback', async (_description, purchase) => {
  await expect(setupFallback({ purchase }).store.recentPaidAccess('alice')).resolves.toBeNull();
});

test.each([
  ['deletion guard', { guard: true }],
  ['deleting profile', { deleting: true }],
  ['deleted Auth account', { account: false }],
  ['disabled Auth account', { disabled: true }],
  ['unverified Auth email', { emailVerified: false }],
  ['missing purchase', { purchase: null }]
] as const)('%s prevents outage fallback', async (_description, options) => {
  await expect(setupFallback(options).store.recentPaidAccess('alice')).resolves.toBeNull();
});
