import * as admin from 'firebase-admin';
import { CHECKIN_RETENTION_MS, SkinFeelCheckinWriter } from '../skin-feel-checkin-writer.js';

const nowMs = Date.UTC(2026, 9, 3, 12);
const stamp = (ms: number) => admin.firestore.Timestamp.fromMillis(ms);

function fixture(options: {
  disabled?: boolean;
  emailVerified?: boolean;
  purchase?: Record<string, unknown>;
  review?: Record<string, unknown>;
  trial?: Record<string, unknown>;
  guard?: Record<string, unknown>;
  profile?: Record<string, unknown>;
  existing?: Record<string, unknown>;
} = {}) {
  const documents = new Map<string, Record<string, unknown>>();
  const path = (suffix: string) => `users/alice/${suffix}`;
  if (options.purchase) documents.set(path('entitlements/pro'), options.purchase);
  if (options.review) documents.set(path('entitlements/review'), options.review);
  if (options.trial) documents.set(path('entitlements/trial'), options.trial);
  if (options.guard) documents.set('accountDeletionGuards/alice', options.guard);
  if (options.profile) documents.set('users/alice', options.profile);
  if (options.existing) documents.set(path('skinFeelCheckins/2026-10-03'), options.existing);
  const reference = (refPath: string): any => ({
    path: refPath,
    collection: (name: string) => ({ doc: (id: string) => reference(`${refPath}/${name}/${id}`) })
  });
  const set = jest.fn();
  const del = jest.fn();
  const transaction = {
    get: jest.fn(async (ref: { path: string }) => {
      const data = documents.get(ref.path);
      return { exists: !!data, get: (field: string) => data?.[field] };
    }),
    set,
    delete: del
  };
  const db = {
    collection: (name: string) => ({ doc: (id: string) => reference(`${name}/${id}`) }),
    runTransaction: jest.fn(async (operation: (tx: typeof transaction) => Promise<boolean>) => operation(transaction))
  };
  const auth = { getUser: jest.fn().mockResolvedValue({ disabled: options.disabled ?? false, emailVerified: options.emailVerified ?? true }) };
  const writer = new SkinFeelCheckinWriter(db as any, auth as any, () => nowMs);
  return { writer, db, auth, set, del };
}

const paid = { isPro: true, expiresAt: stamp(nowMs + 60_000) };
const validReview = {
  uid: 'alice', purpose: 'store_review', enabled: true,
  issuedAt: stamp(nowMs - 60_000), expiresAt: stamp(nowMs + 60_000)
};
const validTrial = {
  uid: 'alice', purpose: 'app_trial',
  startedAt: stamp(nowMs - 60_000),
  endsAt: stamp(nowMs - 60_000 + 10 * 24 * 60 * 60 * 1000)
};

test('the server authors a 30-day expiry and retains it when today’s choice changes', async () => {
  const first = fixture({ purchase: paid });
  await expect(first.writer.change('alice', '2026-10-03', 'dry_tight')).resolves.toBe(true);
  expect(first.set).toHaveBeenCalledWith(
    expect.objectContaining({ path: 'users/alice/skinFeelCheckins/2026-10-03' }),
    { day: '2026-10-03', feel: 'dry_tight', updatedAt: nowMs, expireAt: stamp(nowMs + CHECKIN_RETENTION_MS) }
  );

  const oldExpiry = stamp(nowMs + CHECKIN_RETENTION_MS - 10_000);
  const second = fixture({ purchase: paid, existing: { day: '2026-10-03', feel: 'dry_tight', expireAt: oldExpiry } });
  await expect(second.writer.change('alice', '2026-10-03', 'comfortable')).resolves.toBe(true);
  expect(second.set.mock.calls[0][1].expireAt.toMillis()).toBe(oldExpiry.toMillis());
});

test('removing today’s check-in deletes only its document', async () => {
  const { writer, set, del } = fixture({ purchase: paid });
  await expect(writer.change('alice', '2026-10-03', null)).resolves.toBe(true);
  expect(del).toHaveBeenCalledWith(expect.objectContaining({ path: 'users/alice/skinFeelCheckins/2026-10-03' }));
  expect(set).not.toHaveBeenCalled();
});

test.each([
  ['bad date', '2026-02-30', 'oily'],
  ['old date', '2026-09-20', 'oily'],
  ['unexpected option', '2026-10-03', 'diagnosed'],
  ['object payload', '2026-10-03', { note: 'text' }]
])('rejects %s before any database access', async (_description, day, feel) => {
  const { writer, db, set } = fixture({ purchase: paid });
  await expect(writer.change('alice', day, feel)).rejects.toThrow('Invalid daily skin-feel choice.');
  expect(db.runTransaction).not.toHaveBeenCalled();
  expect(set).not.toHaveBeenCalled();
});

test.each([
  ['unverified account', { emailVerified: false, purchase: paid }],
  ['disabled account', { disabled: true, purchase: paid }],
  ['no entitlement', {}],
  ['expired purchase', { purchase: { isPro: true, expiresAt: stamp(nowMs - 1) } }],
  ['deletion guard', { purchase: paid, guard: { state: 'deleting' } }],
  ['deleting profile', { purchase: paid, profile: { deletionStatus: 'deleting' } }],
  ['wrong reviewer', { review: { ...validReview, uid: 'bob' } }],
  ['expired reviewer', { review: { ...validReview, expiresAt: stamp(nowMs - 1) } }],
  ['wrong trial account', { trial: { ...validTrial, uid: 'bob' } }],
  ['extended trial', { trial: { ...validTrial, endsAt: stamp(nowMs + 11 * 24 * 60 * 60 * 1000) } }]
])('denies %s without writing', async (_description, options) => {
  const { writer, set, del } = fixture(options);
  await expect(writer.change('alice', '2026-10-03', 'sensitive')).resolves.toBe(false);
  expect(set).not.toHaveBeenCalled();
  expect(del).not.toHaveBeenCalled();
});

test('a valid time-limited store-review grant can save a check-in', async () => {
  const { writer, set } = fixture({ review: validReview });
  await expect(writer.change('alice', '2026-10-03', 'mixed')).resolves.toBe(true);
  expect(set).toHaveBeenCalledTimes(1);
});

test('an active ten-day app trial can save a check-in without store billing', async () => {
  const { writer, set } = fixture({ trial: validTrial });
  await expect(writer.change('alice', '2026-10-03', 'mixed')).resolves.toBe(true);
  expect(set).toHaveBeenCalledTimes(1);
});
