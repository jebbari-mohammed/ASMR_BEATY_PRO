import { StoreAccessResolver } from '../store-access-resolver.js';
import { RevenueCatTransientError, RevenueCatVerifier, type VerifiedEntitlement } from '../revenuecat-verifier.js';
import { TrialAccountUnavailableError } from '../app-free-trial.js';

const NOW_MS = 1_800_000_000_000;
const paid: VerifiedEntitlement = {
  isPro: true, status: 'active', tier: 'PRO_MONTHLY', expiresAtMs: NOW_MS + 24 * 60 * 60 * 1000
};
const revoked: VerifiedEntitlement = {
  isPro: false, status: 'expired', tier: 'FREE', expiresAtMs: null
};
const cached = { ...paid, source: 'revenuecat_cache' as const };

function setup() {
  const verifyStore = jest.fn<Promise<VerifiedEntitlement>, [string]>().mockResolvedValue(paid);
  const cacheStore = jest.fn<Promise<boolean>, [string, VerifiedEntitlement]>().mockResolvedValue(true);
  const recentPaidAccess = jest.fn().mockResolvedValue(cached);
  return {
    resolver: new StoreAccessResolver(verifyStore, cacheStore, recentPaidAccess),
    verifyStore, cacheStore, recentPaidAccess
  };
}

test('a fresh server check writes the purchase', async () => {
  const { resolver, cacheStore, recentPaidAccess } = setup();
  await expect(resolver.current('alice', false)).resolves.toEqual({
    ...paid, source: 'revenuecat_server'
  });
  expect(cacheStore).toHaveBeenCalledWith('alice', paid);
  expect(recentPaidAccess).not.toHaveBeenCalled();
});

test('a vendor outage can use a recent paid cache for ordinary access', async () => {
  const { resolver, verifyStore, cacheStore, recentPaidAccess } = setup();
  verifyStore.mockRejectedValueOnce(new RevenueCatTransientError('RevenueCat unavailable', 503));
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  try {
    await expect(resolver.current('alice', false)).resolves.toEqual(cached);
  } finally {
    warn.mockRestore();
  }
  expect(recentPaidAccess).toHaveBeenCalledWith('alice');
  expect(cacheStore).not.toHaveBeenCalled();
});

test('purchase and restore demand a fresh store result during an outage', async () => {
  const { resolver, verifyStore, recentPaidAccess } = setup();
  verifyStore.mockRejectedValueOnce(new RevenueCatTransientError('RevenueCat unavailable', 503));
  await expect(resolver.current('alice', true)).rejects.toThrow('RevenueCat unavailable');
  expect(recentPaidAccess).not.toHaveBeenCalled();
});

test.each([401, 404])('HTTP %i is a fatal store result and never uses cached access', async status => {
  const { cacheStore, recentPaidAccess } = setup();
  const request = jest.fn().mockResolvedValue({ ok: false, status }) as unknown as typeof fetch;
  const verifier = new RevenueCatVerifier('server-secret', request);
  const resolver = new StoreAccessResolver(uid => verifier.verify(uid), cacheStore, recentPaidAccess);
  await expect(resolver.current('alice', false)).rejects.toThrow(`(${status})`);
  expect(recentPaidAccess).not.toHaveBeenCalled();
});

test('HTTP 503 can use recent server-verified access', async () => {
  const { cacheStore, recentPaidAccess } = setup();
  const request = jest.fn().mockResolvedValue({ ok: false, status: 503 }) as unknown as typeof fetch;
  const verifier = new RevenueCatVerifier('server-secret', request);
  const resolver = new StoreAccessResolver(uid => verifier.verify(uid), cacheStore, recentPaidAccess);
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  try {
    await expect(resolver.current('alice', false)).resolves.toEqual(cached);
  } finally {
    warn.mockRestore();
  }
  expect(recentPaidAccess).toHaveBeenCalledWith('alice');
});

test('a transport failure can use recent server-verified access', async () => {
  const { cacheStore, recentPaidAccess } = setup();
  const request = jest.fn().mockRejectedValue(new TypeError('fetch failed')) as unknown as typeof fetch;
  const verifier = new RevenueCatVerifier('server-secret', request);
  const resolver = new StoreAccessResolver(uid => verifier.verify(uid), cacheStore, recentPaidAccess);
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  try {
    await expect(resolver.current('alice', false)).resolves.toEqual(cached);
  } finally {
    warn.mockRestore();
  }
  expect(recentPaidAccess).toHaveBeenCalledWith('alice');
});

test('a malformed HTTP 200 response never uses cached access', async () => {
  const { cacheStore, recentPaidAccess } = setup();
  const request = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as unknown as typeof fetch;
  const verifier = new RevenueCatVerifier('server-secret', request);
  const resolver = new StoreAccessResolver(uid => verifier.verify(uid), cacheStore, recentPaidAccess);
  await expect(resolver.current('alice', false)).rejects.toThrow('response malformed');
  expect(recentPaidAccess).not.toHaveBeenCalled();
});

test('a Unicode secret is rejected before fetch and never uses cached access', async () => {
  const { cacheStore, recentPaidAccess } = setup();
  const request = jest.fn() as unknown as typeof fetch;
  const verifier = new RevenueCatVerifier('abc☃', request);
  const resolver = new StoreAccessResolver(uid => verifier.verify(uid), cacheStore, recentPaidAccess);
  await expect(resolver.current('alice', false)).rejects.toThrow('not configured');
  expect(request).not.toHaveBeenCalled();
  expect(recentPaidAccess).not.toHaveBeenCalled();
});

test('unknown verifier exceptions never use a cached purchase', async () => {
  const { resolver, verifyStore, recentPaidAccess } = setup();
  verifyStore.mockRejectedValueOnce(new Error('malformed response'));
  await expect(resolver.current('alice', false)).rejects.toThrow('malformed response');
  expect(recentPaidAccess).not.toHaveBeenCalled();
});

test('an explicit refund response clears the old purchase instead of falling back', async () => {
  const { resolver, verifyStore, cacheStore, recentPaidAccess } = setup();
  verifyStore.mockResolvedValueOnce(revoked);
  await expect(resolver.current('alice', false)).resolves.toEqual({
    ...revoked, source: 'revenuecat_server'
  });
  expect(cacheStore).toHaveBeenCalledWith('alice', revoked);
  expect(recentPaidAccess).not.toHaveBeenCalled();
});

test('a failed cache write or account deletion never falls back to old paid access', async () => {
  const { resolver, cacheStore, recentPaidAccess } = setup();
  cacheStore.mockResolvedValueOnce(false);
  await expect(resolver.current('alice', false)).rejects.toBeInstanceOf(TrialAccountUnavailableError);
  expect(recentPaidAccess).not.toHaveBeenCalled();
});
