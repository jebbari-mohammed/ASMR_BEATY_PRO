import { VerifiedEntitlementStore } from '../verified-entitlement-store.js';

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
