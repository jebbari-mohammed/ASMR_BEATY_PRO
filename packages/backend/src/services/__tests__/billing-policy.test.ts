import { BillingPolicyStore } from '../billing-policy.js';
import type * as admin from 'firebase-admin';

test('missing, malformed, and disabled policy all select the standard store offering', async () => {
  let value: unknown;
  const get = jest.fn(async () => ({ get: () => value }));
  const db = { collection: () => ({ doc: () => ({ get }) }) } as unknown as admin.firestore.Firestore;
  const policy = new BillingPolicyStore(db);
  for (value of [undefined, 'true', 1, false]) {
    await expect(policy.current()).resolves.toEqual({ trialEnabled: false, offeringId: 'default' });
  }
});

test('only a server-owned true value selects the separate trial offering', async () => {
  const db = { collection: () => ({ doc: () => ({ get: async () => ({ get: () => true }) }) }) } as unknown as admin.firestore.Firestore;
  await expect(new BillingPolicyStore(db).current()).resolves.toEqual({
    trialEnabled: true, offeringId: 'trial_14d'
  });
});
