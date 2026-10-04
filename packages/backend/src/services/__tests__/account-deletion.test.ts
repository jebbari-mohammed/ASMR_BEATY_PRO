import { AccountDeletionService } from '../account-deletion.service.js';

function userNotFound(): Error & { code: string } {
  return Object.assign(new Error('Auth user not found'), { code: 'auth/user-not-found' });
}

function setup() {
  const events: string[] = [];
  const storageDeleted: string[] = [];
  const guardWrites: Record<string, unknown>[] = [];
  let guardData: Record<string, unknown> | undefined;
  let failPrefix: string | undefined;
  let failAuthOnce = false;
  let failFinalizationOnce = false;
  let failRecursiveDeleteOnce = false;
  let authDeleted = false;
  let recreateOnSecondAuthCheck = false;
  let authGetCount = 0;
  let onAuthDelete: (() => Promise<void>) | undefined;

  const doc = (path: string): any => ({
    path,
    delete: jest.fn(async () => { events.push(`delete:${path}`); }),
    collection: (name: string) => ({ doc: (id: string) => doc(`${path}/${name}/${id}`) })
  });
  const db: any = {
    collection: (path: string) => ({ doc: (id: string) => doc(`${path}/${id}`) }),
    recursiveDelete: jest.fn(async (ref: { path: string }) => {
      if (!guardData) throw new Error('deletion guard was not committed');
      if (failRecursiveDeleteOnce) {
        failRecursiveDeleteOnce = false;
        throw new Error('recursive deletion unavailable');
      }
      events.push(`recursive-delete:${ref.path}`);
    }),
    runTransaction: jest.fn(async (callback: (transaction: any) => Promise<unknown>) => {
      const writes: Array<() => void> = [];
      const transaction = {
        get: jest.fn(async () => ({
          exists: !!guardData,
          get: (field: string) => guardData?.[field]
        })),
        set: jest.fn((ref: { path: string }, data: Record<string, unknown>) => {
          writes.push(() => {
            events.push(`transaction-set:${ref.path}`);
            if (ref.path.startsWith('accountDeletionGuards/')) {
              guardWrites.push(data);
              guardData = { ...data };
            }
          });
        }),
        delete: jest.fn((ref: { path: string }) => {
          writes.push(() => { events.push(`transaction-delete:${ref.path}`); });
        }),
        update: jest.fn((ref: { path: string }, data: Record<string, unknown>) => {
          writes.push(() => {
            events.push(`transaction-update:${ref.path}:${String(data.state)}`);
            guardData = { ...guardData, ...data };
          });
        })
      };
      const result = await callback(transaction);
      if (failFinalizationOnce && writes.length > 0 &&
          transaction.update.mock.calls.some((call: unknown[]) => (call[1] as any).state === 'completed')) {
        failFinalizationOnce = false;
        throw new Error('Firestore unavailable');
      }
      writes.forEach((write) => write());
      events.push('transaction-committed');
      return result;
    })
  };
  const storage: any = { bucket: () => ({ deleteFiles: async ({ prefix }: { prefix: string }) => {
    if (prefix === failPrefix) throw new Error('storage unavailable');
    storageDeleted.push(prefix);
    events.push(`storage-delete:${prefix}`);
  } }) };
  const auth: any = {
    deleteUser: jest.fn(async () => {
      events.push('auth-delete');
      if (failAuthOnce) {
        failAuthOnce = false;
        throw new Error('Auth unavailable');
      }
      if (authDeleted) throw userNotFound();
      authDeleted = true;
      if (onAuthDelete) await onAuthDelete();
    }),
    getUser: jest.fn(async () => {
      events.push('auth-get');
      authGetCount += 1;
      if (recreateOnSecondAuthCheck && authGetCount === 2) authDeleted = false;
      if (authDeleted) throw userNotFound();
      return { uid: 'user_123' };
    })
  };
  return {
    service: new AccountDeletionService(db, storage, auth),
    db,
    auth,
    events,
    guardWrites,
    storageDeleted,
    guardData: () => guardData,
    failStorageAt: (prefix: string) => { failPrefix = prefix; },
    failNextAuthDelete: () => { failAuthOnce = true; },
    failNextFinalization: () => { failFinalizationOnce = true; },
    failNextRecursiveDelete: () => { failRecursiveDeleteOnce = true; },
    seedGuard: (data: Record<string, unknown>) => { guardData = data; },
    deleteAuthExternally: () => { authDeleted = true; },
    recreateOnSecondAuthCheck: () => { recreateOnSecondAuthCheck = true; },
    onAuthDelete: (callback: () => Promise<void>) => { onAuthDelete = callback; }
  };
}

test('adds guard expiry only after data cleanup and confirmed Auth deletion', async () => {
  const { service, events, guardWrites, guardData, storageDeleted } = setup();
  const result = await service.deleteUserAccount('user_123');
  expect(result.deleted).toBe(true);
  expect(storageDeleted).toEqual([
    'transient-scans/user_123/', 'progress-photos/user_123/', 'spot-journal/user_123/'
  ]);
  expect(guardWrites).toHaveLength(1);
  expect(guardWrites[0]).toMatchObject({ state: 'deleting' });
  expect(guardWrites[0]).not.toHaveProperty('expireAt');
  expect(events.indexOf('transaction-committed')).toBeLessThan(events.indexOf('storage-delete:transient-scans/user_123/'));
  expect(events).toContain('transaction-delete:users/user_123/entitlements/review');
  expect(events.indexOf('transaction-delete:users/user_123/entitlements/review'))
    .toBeLessThan(events.indexOf('storage-delete:transient-scans/user_123/'));
  expect(events).toContain('transaction-delete:users/user_123/entitlements/trial');
  expect(events.indexOf('transaction-delete:users/user_123/entitlements/trial'))
    .toBeLessThan(events.indexOf('storage-delete:transient-scans/user_123/'));
  expect(events.indexOf('transaction-committed')).toBeLessThan(events.indexOf('recursive-delete:users/user_123'));
  expect(events.indexOf('delete:usage/user_123')).toBeLessThan(events.indexOf('transaction-update:accountDeletionGuards/user_123:awaiting-auth'));
  expect(events.indexOf('transaction-update:accountDeletionGuards/user_123:awaiting-auth')).toBeLessThan(events.indexOf('auth-delete'));
  expect(events.indexOf('auth-delete')).toBeLessThan(events.indexOf('auth-get'));
  expect(events.indexOf('auth-get')).toBeLessThan(events.indexOf('transaction-update:accountDeletionGuards/user_123:completed'));
  expect(guardData()).toMatchObject({ state: 'completed', expireAt: expect.anything() });
});

test('keeps a non-expiring guard when Storage cleanup fails', async () => {
  const { service, db, auth, events, guardWrites, guardData, failStorageAt } = setup();
  failStorageAt('progress-photos/user_123/');
  await expect(service.deleteUserAccount('user_123')).rejects.toThrow('storage unavailable');
  expect(db.recursiveDelete).not.toHaveBeenCalled();
  expect(auth.deleteUser).not.toHaveBeenCalled();
  expect(events).toContain('transaction-committed');
  expect(guardWrites).toHaveLength(1);
  expect(guardData()).toMatchObject({ state: 'deleting' });
  expect(guardData()).not.toHaveProperty('expireAt');
});

test('direct Auth deletion completes cleanup without an authenticated caller', async () => {
  const { service, auth, guardData, deleteAuthExternally } = setup();
  deleteAuthExternally();
  await expect(service.deleteUserAccount('user_123', { skipAuthDelete: true })).resolves.toMatchObject({ deleted: true });
  expect(auth.deleteUser).not.toHaveBeenCalled();
  expect(guardData()).toMatchObject({ state: 'completed', expireAt: expect.anything() });
});

test('Auth deletion event leaves a recreated account entirely untouched', async () => {
  const { service, db, auth, guardData, events } = setup();
  await expect(service.deleteUserAccount('user_123', { skipAuthDelete: true }))
    .resolves.toEqual({ deleted: false, deletedCollections: [] });
  expect(auth.deleteUser).not.toHaveBeenCalled();
  expect(db.recursiveDelete).not.toHaveBeenCalled();
  expect(db.runTransaction).not.toHaveBeenCalled();
  expect(events).toEqual(['auth-get']);
  expect(guardData()).toBeUndefined();
});

test('Auth recreation after guard installation stops destructive cleanup', async () => {
  const { service, db, auth, events, guardData, storageDeleted, deleteAuthExternally, recreateOnSecondAuthCheck } = setup();
  deleteAuthExternally();
  recreateOnSecondAuthCheck();
  await expect(service.deleteUserAccount('user_123', { skipAuthDelete: true }))
    .rejects.toThrow('Auth account reappeared during deletion recovery');
  expect(auth.getUser).toHaveBeenCalledTimes(2);
  expect(db.recursiveDelete).not.toHaveBeenCalled();
  expect(auth.deleteUser).not.toHaveBeenCalled();
  expect(storageDeleted).toHaveLength(0);
  expect(events).toContain('transaction-committed');
  expect(guardData()).toMatchObject({ state: 'deleting' });
  expect(guardData()).not.toHaveProperty('expireAt');
});

test('Auth deletion trigger racing the callable cannot reopen a completed guard', async () => {
  const { service, guardData, onAuthDelete } = setup();
  onAuthDelete(async () => { await service.deleteUserAccount('user_123', { skipAuthDelete: true }); });
  await expect(service.deleteUserAccount('user_123')).resolves.toMatchObject({ deleted: true });
  expect(guardData()).toMatchObject({ state: 'completed', expireAt: expect.anything() });
});

test('keeps guard without TTL after Auth failure and permits an idempotent retry', async () => {
  const { service, auth, guardWrites, guardData, failNextAuthDelete } = setup();
  failNextAuthDelete();
  await expect(service.deleteUserAccount('user_123')).rejects.toThrow('Auth unavailable');
  expect(guardData()).toMatchObject({ state: 'awaiting-auth' });
  expect(guardData()).not.toHaveProperty('expireAt');

  await expect(service.deleteUserAccount('user_123')).resolves.toMatchObject({ deleted: true });
  expect(auth.deleteUser).toHaveBeenCalledTimes(2);
  expect(guardWrites).toHaveLength(1);
  expect(guardWrites[0]).not.toHaveProperty('expireAt');
  expect(guardData()).toMatchObject({ state: 'completed', expireAt: expect.anything() });
});

test('retry removes a legacy guard expiry before cleanup resumes', async () => {
  const { service, guardData, seedGuard, failNextRecursiveDelete } = setup();
  seedGuard({ expireAt: 'old expiry' });
  failNextRecursiveDelete();
  await expect(service.deleteUserAccount('user_123')).rejects.toThrow('recursive deletion unavailable');
  expect(guardData()).toMatchObject({ state: 'deleting' });
  expect(guardData()).not.toHaveProperty('expireAt');
});

test('scheduled recovery can finalize a guard after Auth deletion and failed TTL update', async () => {
  const { service, auth, guardData, failNextFinalization } = setup();
  failNextFinalization();
  await expect(service.deleteUserAccount('user_123')).rejects.toThrow('Firestore unavailable');
  expect(guardData()).toMatchObject({ state: 'awaiting-auth' });
  expect(guardData()).not.toHaveProperty('expireAt');

  await expect(service.finalizeGuardForMissingAuth('user_123')).resolves.toBe(true);
  expect(auth.getUser).toHaveBeenCalledTimes(2);
  expect(guardData()).toMatchObject({ state: 'completed', expireAt: expect.anything() });
});

test('a caller retry is idempotent after Auth was deleted but finalization failed', async () => {
  const { service, auth, guardData, failNextFinalization } = setup();
  failNextFinalization();
  await expect(service.deleteUserAccount('user_123')).rejects.toThrow('Firestore unavailable');
  await expect(service.deleteUserAccount('user_123')).resolves.toMatchObject({ deleted: true });
  expect(auth.deleteUser).toHaveBeenCalledTimes(2);
  expect(guardData()).toMatchObject({ state: 'completed', expireAt: expect.anything() });
});

test('a concurrent stale retry cannot regress a completed guard after its own cleanup fails', async () => {
  const { service, guardData, failNextRecursiveDelete } = setup();
  await service.deleteUserAccount('user_123');
  const completed = guardData();
  failNextRecursiveDelete();
  await expect(service.deleteUserAccount('user_123')).rejects.toThrow('recursive deletion unavailable');
  expect(guardData()).toMatchObject({ state: 'completed', expireAt: completed?.expireAt });
});

test('recovery never expires a guard after incomplete cleanup, even if Auth disappeared', async () => {
  const { service, auth, guardData, failNextRecursiveDelete, deleteAuthExternally } = setup();
  failNextRecursiveDelete();
  await expect(service.deleteUserAccount('user_123')).rejects.toThrow('recursive deletion unavailable');
  expect(auth.deleteUser).not.toHaveBeenCalled();
  expect(guardData()).toMatchObject({ state: 'deleting' });
  deleteAuthExternally();
  await expect(service.finalizeGuardForMissingAuth('user_123')).resolves.toBe(false);
  expect(guardData()).not.toHaveProperty('expireAt');
});

test('scheduled recovery leaves a guard non-expiring while Auth account exists', async () => {
  const { service, auth, guardData } = setup();
  await expect(service.finalizeGuardForMissingAuth('user_123')).resolves.toBe(false);
  expect(auth.getUser).toHaveBeenCalledTimes(1);
  expect(guardData()).toBeUndefined();
});
