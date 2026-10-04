import * as admin from 'firebase-admin';
import { VerifiedEntitlementStore } from '../verified-entitlement-store.js';
import { PAID_CACHE_OUTAGE_WINDOW_MS } from '../verified-entitlement-store.js';

const verified = {
  isPro: true,
  status: 'active' as const,
  tier: 'PRO_MONTHLY',
  expiresAtMs: Date.now() + 60_000
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
