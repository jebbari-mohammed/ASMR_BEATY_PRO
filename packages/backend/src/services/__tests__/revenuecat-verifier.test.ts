import { RevenueCatTransientError, RevenueCatVerifier } from '../revenuecat-verifier.js';

const now = Date.parse('2026-09-27T12:00:00Z');

function subscriberResponse(subscriber: Record<string, unknown>) {
  return jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ request_date_ms: now, subscriber })
  }) as unknown as typeof fetch;
}

function response(
  expiresDate: string | null,
  graceDate: string | null = null,
  productIdentifier = 'skincoach_3999_1y'
) {
  return jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      request_date_ms: now,
      subscriber: {
        entitlements: {
          asmr_beaty_pro_pro: {
            expires_date: expiresDate,
            grace_period_expires_date: graceDate,
            purchase_date: '2026-09-01T00:00:00Z',
            product_identifier: productIdentifier
          }
        }
      }
    })
  }) as unknown as typeof fetch;
}

test('server API grants access only for an unexpired entitlement', async () => {
  const request = response('2026-10-01T00:00:00Z');
  const result = await new RevenueCatVerifier('server-secret', request, () => now).verify('user-123');
  expect(result).toMatchObject({ isPro: true, status: 'active', tier: 'PRO_ANNUAL' });
  expect(request).toHaveBeenCalledWith(
    'https://api.revenuecat.com/v1/subscribers/user-123',
    expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer server-secret' }) })
  );
});

test('approved active subscription survives a coexisting Test Store lifetime projection', async () => {
  const request = subscriberResponse({
    entitlements: {
      asmr_beaty_pro_pro: {
        product_identifier: 'test_lifetime',
        purchase_date: '2026-09-01T00:00:00Z',
        expires_date: null
      }
    },
    subscriptions: {
      'skincoach_3999_1y:annual': {
        purchase_date: '2026-09-01T00:00:00Z',
        expires_date: '2026-10-01T00:00:00Z',
        grace_period_expires_date: null,
        refunded_at: null
      },
      'unrelated_trial': {
        purchase_date: '2026-09-01T00:00:00Z',
        expires_date: '2027-10-01T00:00:00Z'
      }
    }
  });
  const result = await new RevenueCatVerifier('server-secret', request, () => now).verify('user-123');
  expect(result).toEqual({
    isPro: true,
    status: 'active',
    tier: 'PRO_ANNUAL',
    expiresAtMs: Date.parse('2026-10-01T00:00:00Z'),
    requestDateMs: now
  });
});

test('an approved active subscription does not grant access without the Pro entitlement', async () => {
  const request = subscriberResponse({
    entitlements: {},
    subscriptions: {
      skincoach_699_1m: {
        purchase_date: '2026-09-01T00:00:00Z',
        expires_date: '2026-10-01T00:00:00Z'
      }
    }
  });
  await expect(new RevenueCatVerifier('server-secret', request, () => now).verify('user-123'))
    .resolves.toEqual({ isPro: false, status: 'expired', tier: 'FREE', expiresAtMs: null, requestDateMs: now });
});

test('subscription grace period is honored when the entitlement projects another product', async () => {
  const request = subscriberResponse({
    entitlements: {
      asmr_beaty_pro_pro: {
        product_identifier: 'test_lifetime',
        purchase_date: '2026-09-01T00:00:00Z',
        expires_date: null
      }
    },
    subscriptions: {
      'skincoach_699_1m:monthly': {
        purchase_date: '2026-09-01T00:00:00Z',
        expires_date: '2026-09-26T00:00:00Z',
        grace_period_expires_date: '2026-09-29T00:00:00Z'
      }
    }
  });
  const result = await new RevenueCatVerifier('server-secret', request, () => now).verify('user-123');
  expect(result).toEqual({
    isPro: true,
    status: 'grace_period',
    tier: 'PRO_MONTHLY',
    expiresAtMs: Date.parse('2026-09-29T00:00:00Z'),
    requestDateMs: now
  });
});

test.each([
  ['expired', '2026-09-26T00:00:00Z', null],
  ['refunded', '2026-10-01T00:00:00Z', '2026-09-25T00:00:00Z'],
  ['missing expiration', null, null]
])('%s subscription cannot turn a lifetime projection into Pro access', async (_case, expiry, refund) => {
  const request = subscriberResponse({
    entitlements: {
      asmr_beaty_pro_pro: {
        product_identifier: 'test_lifetime',
        purchase_date: '2026-09-01T00:00:00Z',
        expires_date: null
      }
    },
    subscriptions: {
      skincoach_699_1m: {
        purchase_date: '2026-09-01T00:00:00Z',
        expires_date: expiry,
        grace_period_expires_date: null,
        refunded_at: refund
      }
    }
  });
  await expect(new RevenueCatVerifier('server-secret', request, () => now).verify('user-123'))
    .resolves.toEqual({ isPro: false, status: 'expired', tier: 'FREE', expiresAtMs: null, requestDateMs: now });
});

test('a refunded subscription record overrides a stale active entitlement projection', async () => {
  const request = subscriberResponse({
    entitlements: {
      asmr_beaty_pro_pro: {
        product_identifier: 'skincoach_699_1m',
        purchase_date: '2026-09-01T00:00:00Z',
        expires_date: '2026-10-01T00:00:00Z'
      }
    },
    subscriptions: {
      skincoach_699_1m: {
        purchase_date: '2026-09-01T00:00:00Z',
        expires_date: '2026-10-01T00:00:00Z',
        refunded_at: '2026-09-25T00:00:00Z'
      }
    }
  });
  await expect(new RevenueCatVerifier('server-secret', request, () => now).verify('user-123'))
    .resolves.toEqual({ isPro: false, status: 'expired', tier: 'FREE', expiresAtMs: null, requestDateMs: now });
});

test.each([
  ['App Store annual', 'skincoach_3999_1y', 'PRO_ANNUAL'],
  ['App Store annual trial product', 'skincoach_3999_1y_trial', 'PRO_ANNUAL'],
  ['Play annual', 'skincoach_3999_1y:annual', 'PRO_ANNUAL'],
  ['App Store monthly', 'skincoach_699_1m', 'PRO_MONTHLY'],
  ['Play monthly', 'skincoach_699_1m:monthly', 'PRO_MONTHLY']
])('%s subscription maps to the correct tier', async (_store, productId, tier) => {
  const result = await new RevenueCatVerifier(
    'server-secret', response('2026-10-01T00:00:00Z', null, productId), () => now
  ).verify('user-123');
  expect(result).toMatchObject({ isPro: true, status: 'active', tier });
});

test.each([
  ['unapproved finite product', 'unrelated_product', '2026-10-01T00:00:00Z'],
  ['Test Store lifetime product', 'test_lifetime', null],
  ['annual subscription without an expiry', 'skincoach_3999_1y', null],
  ['object-prototype product name', 'toString', '2026-10-01T00:00:00Z']
])('%s cannot grant paid access', async (_case, productId, expiration) => {
  const result = await new RevenueCatVerifier(
    'server-secret', response(expiration, null, productId), () => now
  ).verify('user-123');
  expect(result).toEqual({ isPro: false, status: 'expired', tier: 'FREE', expiresAtMs: null, requestDateMs: now });
});

test('grace period stays active until its verified expiry', async () => {
  const result = await new RevenueCatVerifier(
    'server-secret', response('2026-09-26T00:00:00Z', '2026-09-29T00:00:00Z'), () => now
  ).verify('user-123');
  expect(result).toMatchObject({ isPro: true, status: 'grace_period' });
});

test('expired entitlement is denied even if a webhook cache says Pro', async () => {
  const result = await new RevenueCatVerifier(
    'server-secret', response('2026-09-26T00:00:00Z'), () => now
  ).verify('user-123');
  expect(result).toMatchObject({ isPro: false, status: 'expired', tier: 'FREE' });
});

test('missing server key and vendor failure fail closed', async () => {
  await expect(new RevenueCatVerifier(undefined, response(null), () => now).verify('user-123'))
    .rejects.toThrow('not configured');
  const invalidKeyRequest = response(null);
  await expect(new RevenueCatVerifier('server-secret\n', invalidKeyRequest, () => now).verify('user-123'))
    .rejects.toThrow('not configured');
  await expect(new RevenueCatVerifier('abc☃', invalidKeyRequest, () => now).verify('user-123'))
    .rejects.toThrow('not configured');
  expect(invalidKeyRequest).not.toHaveBeenCalled();
  const failed = jest.fn().mockResolvedValue({ ok: false, status: 503 }) as unknown as typeof fetch;
  await expect(new RevenueCatVerifier('server-secret', failed, () => now).verify('user-123'))
    .rejects.toBeInstanceOf(RevenueCatTransientError);
});

test.each([429, 500, 503])('HTTP %i is a retryable verifier failure', async status => {
  const request = jest.fn().mockResolvedValue({ ok: false, status }) as unknown as typeof fetch;
  await expect(new RevenueCatVerifier('server-secret', request).verify('user-123'))
    .rejects.toMatchObject({ name: 'RevenueCatTransientError', status });
});

test.each([400, 401, 403, 404])('HTTP %i cannot activate the outage fallback', async status => {
  const request = jest.fn().mockResolvedValue({ ok: false, status }) as unknown as typeof fetch;
  await expect(new RevenueCatVerifier('server-secret', request).verify('user-123'))
    .rejects.not.toBeInstanceOf(RevenueCatTransientError);
});

test('network and timeout failures are retryable, while malformed responses are not', async () => {
  const network = jest.fn().mockRejectedValue(new TypeError('fetch failed')) as unknown as typeof fetch;
  await expect(new RevenueCatVerifier('server-secret', network).verify('user-123'))
    .rejects.toBeInstanceOf(RevenueCatTransientError);
  const timeout = jest.fn().mockRejectedValue(Object.assign(new Error('timed out'), { name: 'TimeoutError' })) as unknown as typeof fetch;
  await expect(new RevenueCatVerifier('server-secret', timeout).verify('user-123'))
    .rejects.toBeInstanceOf(RevenueCatTransientError);
  const malformed = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as unknown as typeof fetch;
  await expect(new RevenueCatVerifier('server-secret', malformed).verify('user-123'))
    .rejects.toThrow('response malformed');
  const invalidJson = jest.fn().mockResolvedValue({ ok: true, json: async () => { throw new SyntaxError('bad JSON'); } }) as unknown as typeof fetch;
  await expect(new RevenueCatVerifier('server-secret', invalidJson).verify('user-123'))
    .rejects.not.toBeInstanceOf(RevenueCatTransientError);
});

test('missing vendor observation time cannot produce an unordered cache write', async () => {
  const missingDate = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ subscriber: { entitlements: {} } })
  }) as unknown as typeof fetch;
  await expect(new RevenueCatVerifier('server-secret', missingDate).verify('user-123'))
    .rejects.toThrow('response malformed');
});
