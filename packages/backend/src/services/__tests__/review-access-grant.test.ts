import * as admin from 'firebase-admin';
import { MAX_REVIEW_GRANT_MS, ReviewAccessGrant } from '../review-access-grant.js';

const nowMs = 1_800_000_000_000;
const timestamp = (millis: number) => admin.firestore.Timestamp.fromMillis(millis);
const validGrant = () => ({
  uid: 'reviewer_123',
  purpose: 'store_review',
  enabled: true,
  issuedAt: timestamp(nowMs - 1000),
  expiresAt: timestamp(nowMs + 24 * 60 * 60 * 1000)
});

function setup({
  grant = validGrant() as Record<string, unknown> | null,
  revokedDuringCheck = false,
  authExists = true,
  authDisabled = false,
  emailVerified = true,
  guardExists = false,
  profileExists = true,
  deleting = false
} = {}) {
  const ref = (path: string): any => ({
    path,
    get: jest.fn(async () => ({ exists: grant !== null })),
    collection: (name: string) => ({ doc: (id: string) => ref(`${path}/${name}/${id}`) })
  });
  const transaction = {
    get: jest.fn(async (document: { path: string }) => {
      if (document.path.startsWith('accountDeletionGuards/')) return { exists: guardExists };
      if (document.path.endsWith('/entitlements/review')) {
        return {
          exists: grant !== null && !revokedDuringCheck,
          get: (field: string) => grant?.[field]
        };
      }
      return { exists: profileExists, get: () => deleting ? 'deleting' : undefined };
    })
  };
  const db: any = {
    collection: (name: string) => ({ doc: (id: string) => ref(`${name}/${id}`) }),
    runTransaction: jest.fn(async (operation: (tx: typeof transaction) => Promise<unknown>) => operation(transaction))
  };
  const auth: any = {
    getUser: jest.fn(async () => {
      if (!authExists) throw Object.assign(new Error('No user'), { code: 'auth/user-not-found' });
      return { disabled: authDisabled, emailVerified };
    })
  };
  return { verifier: new ReviewAccessGrant(db, auth, () => nowMs), db, auth, transaction };
}

test('recognizes a finite grant for its exact verified Auth account', async () => {
  const { verifier } = setup();
  await expect(verifier.verify('reviewer_123')).resolves.toEqual({
    isPro: true,
    status: 'active',
    tier: 'PRO_REVIEW',
    expiresAtMs: nowMs + 24 * 60 * 60 * 1000,
    source: 'store_review'
  });
});

test('ordinary accounts without a grant avoid Auth and transaction reads', async () => {
  const { verifier, auth, db } = setup({ grant: null });
  await expect(verifier.verify('ordinary_123')).resolves.toBeNull();
  expect(auth.getUser).not.toHaveBeenCalled();
  expect(db.runTransaction).not.toHaveBeenCalled();
});

test.each([
  ['another UID', { ...validGrant(), uid: 'somebody_else' }],
  ['another purpose', { ...validGrant(), purpose: 'qa' }],
  ['disabled grant', { ...validGrant(), enabled: false }],
  ['missing issue date', { ...validGrant(), issuedAt: null }],
  ['string expiry', { ...validGrant(), expiresAt: new Date(nowMs + 1000).toISOString() }],
  ['future issue date', { ...validGrant(), issuedAt: timestamp(nowMs + 1000) }],
  ['expired grant', { ...validGrant(), expiresAt: timestamp(nowMs) }],
  ['overlong grant', {
    ...validGrant(),
    issuedAt: timestamp(nowMs - 1000),
    expiresAt: timestamp(nowMs - 1000 + MAX_REVIEW_GRANT_MS + 1)
  }]
])('rejects %s', async (_description, grant) => {
  const { verifier } = setup({ grant });
  await expect(verifier.verify('reviewer_123')).resolves.toBeNull();
});

test.each([
  ['missing Auth account', { authExists: false }],
  ['disabled Auth account', { authDisabled: true }],
  ['unverified Auth email', { emailVerified: false }],
  ['deletion guard', { guardExists: true }],
  ['deleting profile', { deleting: true }],
  ['grant revoked between reads', { revokedDuringCheck: true }]
])('rejects a %s', async (_description, options) => {
  const { verifier } = setup(options);
  await expect(verifier.verify('reviewer_123')).resolves.toBeNull();
});

test('a transient Auth failure does not turn a grant into access', async () => {
  const { verifier, auth, db } = setup();
  auth.getUser.mockRejectedValueOnce(new Error('Auth unavailable'));
  await expect(verifier.verify('reviewer_123')).rejects.toThrow('Auth unavailable');
  expect(db.runTransaction).not.toHaveBeenCalled();
});
