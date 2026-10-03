import { requireRecentAuthentication } from '../recent-auth.js';

const NOW_MS = 1_700_000_000_000;
const NOW_SECONDS = NOW_MS / 1000;

describe('account deletion recent authentication', () => {
  test('accepts a fresh sign-in and the five-minute boundary', () => {
    expect(() => requireRecentAuthentication(NOW_SECONDS, NOW_MS)).not.toThrow();
    expect(() => requireRecentAuthentication(NOW_SECONDS - 300, NOW_MS)).not.toThrow();
  });

  test.each([
    ['older than five minutes', NOW_SECONDS - 301],
    ['missing', undefined],
    ['non-numeric', String(NOW_SECONDS)],
    ['fractional', NOW_SECONDS - 0.5],
    ['future-dated', NOW_SECONDS + 1],
    ['zero', 0]
  ])('rejects %s auth time before deleting anything', (_label, authTime) => {
    expect(() => requireRecentAuthentication(authTime, NOW_MS)).toThrow(
      expect.objectContaining({ code: 'failed-precondition' })
    );
  });
});
