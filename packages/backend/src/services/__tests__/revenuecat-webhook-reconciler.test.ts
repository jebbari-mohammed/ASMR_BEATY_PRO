import {
  InvalidRevenueCatWebhookError,
  RevenueCatWebhookReconciler,
  revenueCatWebhookUserIds
} from '../revenuecat-webhook-reconciler.js';

const active = {
  isPro: true, status: 'active' as const, tier: 'PRO_MONTHLY' as const,
  expiresAtMs: 1_900_000_000_000, requestDateMs: 1_800_000_000_000
};
const expired = {
  isPro: false, status: 'expired' as const, tier: 'FREE' as const,
  expiresAtMs: null, requestDateMs: 1_800_000_000_001
};

test('transfer without app_user_id includes both the old and new account', () => {
  expect(revenueCatWebhookUserIds({
    type: 'TRANSFER', transferred_from: ['old_uid'], transferred_to: ['new_uid']
  })).toEqual(['old_uid', 'new_uid']);
});

test('an anonymous primary ID still reconciles its Firebase alias once', () => {
  expect(revenueCatWebhookUserIds({
    type: 'CANCELLATION', app_user_id: '$RCAnonymousID:abc',
    original_app_user_id: '$RCAnonymousID:abc',
    aliases: ['$RCAnonymousID:abc', 'firebase_uid', 'firebase_uid']
  })).toEqual(['firebase_uid']);
});

test('purchase redemption can identify users through redemption fields', () => {
  expect(revenueCatWebhookUserIds({
    type: 'PURCHASE_REDEEMED', redeemed_from: ['old_uid'], redeemed_by: ['new_uid']
  })).toEqual(['old_uid', 'new_uid']);
});

test.each([
  { type: 'TRANSFER', transferred_from: ['old_uid'] },
  { type: 'TRANSFER', transferred_from: 'old_uid', transferred_to: ['new_uid'] },
  { type: 'CANCELLATION', aliases: 'firebase_uid' },
  { type: 'CANCELLATION', aliases: [123] },
  { type: 'CANCELLATION' },
  { app_user_id: 'firebase_uid' }
])('rejects malformed webhook identities: %p', event => {
  expect(() => revenueCatWebhookUserIds(event)).toThrow(InvalidRevenueCatWebhookError);
});

test('bounds the number of user lookups from one event', () => {
  expect(() => revenueCatWebhookUserIds({
    type: 'CANCELLATION', aliases: Array.from({ length: 33 }, (_, i) => `user_${i}`)
  })).toThrow(InvalidRevenueCatWebhookError);
});

test('rechecks both sides of a transfer and revokes the source from vendor state', async () => {
  const getUser = jest.fn(async (uid: string) => ({ uid }));
  const verify = jest.fn(async (uid: string) => uid === 'old_uid' ? expired : active);
  const cache = jest.fn(async () => true);
  const reconciler = new RevenueCatWebhookReconciler({ getUser } as any, verify, cache);

  await expect(reconciler.reconcile({
    type: 'TRANSFER', transferred_from: ['old_uid'], transferred_to: ['new_uid']
  })).resolves.toBe(2);
  expect(verify).toHaveBeenCalledWith('old_uid');
  expect(verify).toHaveBeenCalledWith('new_uid');
  expect(cache).toHaveBeenCalledWith('old_uid', expired, 'TRANSFER');
  expect(cache).toHaveBeenCalledWith('new_uid', active, 'TRANSFER');
});

test('skips RevenueCat for an alias that is not an app account', async () => {
  const getUser = jest.fn(async (uid: string) => {
    if (uid === 'not_a_firebase_user') {
      throw Object.assign(new Error('Missing user'), { code: 'auth/user-not-found' });
    }
    return { uid };
  });
  const verify = jest.fn(async () => expired);
  const cache = jest.fn(async () => true);
  const reconciler = new RevenueCatWebhookReconciler({ getUser } as any, verify, cache);

  await expect(reconciler.reconcile({
    type: 'EXPIRATION', app_user_id: 'not_a_firebase_user', aliases: ['firebase_uid']
  })).resolves.toBe(1);
  expect(verify).toHaveBeenCalledTimes(1);
  expect(verify).toHaveBeenCalledWith('firebase_uid');
});

test('propagates vendor failures so the webhook can be retried', async () => {
  const vendorFailure = new Error('RevenueCat temporarily unavailable');
  const reconciler = new RevenueCatWebhookReconciler(
    { getUser: jest.fn(async (uid: string) => ({ uid })) } as any,
    jest.fn(async () => { throw vendorFailure; }),
    jest.fn(async () => true)
  );
  await expect(reconciler.reconcile({ type: 'EXPIRATION', app_user_id: 'firebase_uid' }))
    .rejects.toBe(vendorFailure);
});

test('limits concurrent vendor requests even when an event contains many aliases', async () => {
  let inFlight = 0;
  let peak = 0;
  const reconciler = new RevenueCatWebhookReconciler(
    { getUser: jest.fn(async (uid: string) => ({ uid })) } as any,
    jest.fn(async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise<void>(resolve => setImmediate(resolve));
      inFlight -= 1;
      return expired;
    }),
    jest.fn(async () => true)
  );
  await expect(reconciler.reconcile({
    type: 'EXPIRATION', aliases: Array.from({ length: 12 }, (_, i) => `user_${i}`)
  })).resolves.toBe(12);
  expect(peak).toBe(8);
});

test('a failed alias does not prevent later aliases from being reconciled before retry', async () => {
  const vendorFailure = new Error('RevenueCat unavailable for one account');
  const verify = jest.fn(async (uid: string) => {
    if (uid === 'user_0') throw vendorFailure;
    return expired;
  });
  const cache = jest.fn(async () => true);
  const reconciler = new RevenueCatWebhookReconciler(
    { getUser: jest.fn(async (uid: string) => ({ uid })) } as any, verify, cache
  );
  await expect(reconciler.reconcile({
    type: 'EXPIRATION', aliases: Array.from({ length: 12 }, (_, i) => `user_${i}`)
  })).rejects.toBe(vendorFailure);
  expect(verify).toHaveBeenCalledTimes(12);
  expect(cache).toHaveBeenCalledWith('user_11', expired, 'EXPIRATION');
});
