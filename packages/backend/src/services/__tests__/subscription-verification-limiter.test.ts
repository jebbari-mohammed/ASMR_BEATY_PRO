import { SubscriptionVerificationLimiter } from '../subscription-verification-limiter.js';

function setup() {
  let nowMs = 1_700_000_000_000;
  let version = 0;
  let guardExists = false;
  let window: { windowStartMs: number; count: number } | undefined;
  let writes = 0;
  const db: any = {
    collection: (name: string) => ({ doc: (id: string) => ({ path: `${name}/${id}` }) }),
    runTransaction: async (callback: (transaction: any) => Promise<unknown>) => {
      // Simulate Firestore's optimistic retry if another caller commits after
      // this transaction read the usage document.
      for (let attempt = 0; attempt < 30; attempt++) {
        const readVersion = version;
        const readWindow = window && { ...window };
        const readGuard = guardExists;
        let nextWindow: typeof window;
        const transaction = {
          get: async (ref: { path: string }) => {
            await Promise.resolve();
            return ref.path.startsWith('accountDeletionGuards/')
              ? { exists: readGuard }
              : { get: (field: string) => field === 'subscriptionVerification' ? readWindow : undefined };
          },
          set: (_ref: unknown, data: { subscriptionVerification: typeof window }) => {
            nextWindow = data.subscriptionVerification;
          }
        };
        const result = await callback(transaction);
        await Promise.resolve();
        if (version !== readVersion) continue;
        if (nextWindow) {
          window = nextWindow;
          writes += 1;
          version += 1;
        }
        return result;
      }
      throw new Error('Test transaction exceeded retry limit');
    }
  };
  return {
    limiter: new SubscriptionVerificationLimiter(db, () => nowMs),
    setNow: (value: number) => { nowMs = value; },
    installGuard: () => { guardExists = true; version += 1; },
    window: () => window,
    writes: () => writes
  };
}

test('allows twelve checks per minute and resets at the next minute boundary', async () => {
  const { limiter, setNow, window } = setup();
  for (let i = 0; i < 12; i++) await limiter.consume('user_123');
  expect(window()?.count).toBe(12);
  await expect(limiter.consume('user_123')).rejects.toMatchObject({ code: 'resource-exhausted' });
  setNow(1_700_000_059_999);
  await expect(limiter.consume('user_123')).rejects.toMatchObject({ code: 'resource-exhausted' });
  setNow(1_700_000_060_000);
  await expect(limiter.consume('user_123')).resolves.toBeUndefined();
  expect(window()).toMatchObject({ windowStartMs: 1_700_000_060_000, count: 1 });
});

test('concurrent calls cannot exceed the twelve-check budget', async () => {
  const { limiter, window, writes } = setup();
  const results = await Promise.allSettled(Array.from({ length: 13 }, () => limiter.consume('user_123')));
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(12);
  expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
  expect(window()?.count).toBe(12);
  expect(writes()).toBe(12);
});

test('a deletion guard blocks verification before recreating usage', async () => {
  const { limiter, installGuard, writes } = setup();
  installGuard();
  await expect(limiter.consume('user_123')).rejects.toMatchObject({ code: 'failed-precondition' });
  expect(writes()).toBe(0);
});
