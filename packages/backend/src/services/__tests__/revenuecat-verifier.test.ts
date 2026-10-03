import { RevenueCatVerifier } from '../revenuecat-verifier.js';

const now = Date.parse('2026-09-27T12:00:00Z');

function response(expiresDate: string | null, graceDate: string | null = null) {
  return jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      subscriber: {
        entitlements: {
          asmr_beaty_pro_pro: {
            expires_date: expiresDate,
            grace_period_expires_date: graceDate,
            purchase_date: '2026-09-01T00:00:00Z',
            product_identifier: 'pro_annual'
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
  const failed = jest.fn().mockResolvedValue({ ok: false, status: 503 }) as unknown as typeof fetch;
  await expect(new RevenueCatVerifier('server-secret', failed, () => now).verify('user-123'))
    .rejects.toThrow('verification unavailable');
});
