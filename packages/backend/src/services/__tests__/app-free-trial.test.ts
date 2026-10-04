import * as admin from 'firebase-admin';
import { APP_FREE_TRIAL_MS, AppFreeTrial, TrialAccountUnavailableError } from '../app-free-trial.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const START_MS = 1_800_000_000_000;
const timestamp = (ms: number) => admin.firestore.Timestamp.fromMillis(ms);

function setup() {
  let nowMs = START_MS;
  let accountExists = true;
  let emailVerified = true;
  let disabled = false;
  let authFailure = false;
  const data = new Map<string, Record<string, unknown>>();
  const trialPath = 'users/user_123/entitlements/trial';
  const guardPath = 'accountDeletionGuards/user_123';
  const profilePath = 'users/user_123';
  const snapshot = (path: string) => ({
    exists: data.has(path),
    get: (field: string) => data.get(path)?.[field]
  });
  const ref = (path: string): any => ({
    path,
    get: jest.fn(async () => snapshot(path)),
    collection: (name: string) => ({ doc: (id: string) => ref(`${path}/${name}/${id}`) })
  });
  let queue: Promise<unknown> = Promise.resolve();
  const transactionCreates: string[] = [];
  const db: any = {
    collection: (name: string) => ({ doc: (id: string) => ref(`${name}/${id}`) }),
    runTransaction: jest.fn(<T>(operation: (transaction: any) => Promise<T>): Promise<T> => {
      const run = queue.then(async () => {
        const writes: Array<() => void> = [];
        const transaction = {
          get: jest.fn(async (document: { path: string }) => snapshot(document.path)),
          create: jest.fn((document: { path: string }, value: Record<string, unknown>) => {
            writes.push(() => {
              if (data.has(document.path)) throw new Error('Document already exists');
              data.set(document.path, value);
              transactionCreates.push(document.path);
            });
          })
        };
        const result = await operation(transaction);
        writes.forEach(write => write());
        return result;
      });
      queue = run.catch(() => undefined);
      return run;
    })
  };
  const auth: any = {
    getUser: jest.fn(async () => {
      if (authFailure) throw new Error('Auth unavailable');
      if (!accountExists) throw Object.assign(new Error('No user'), { code: 'auth/user-not-found' });
      return { uid: 'user_123', disabled, emailVerified };
    })
  };
  return {
    trial: new AppFreeTrial(db, auth, () => nowMs),
    db,
    auth,
    data,
    transactionCreates,
    trialPath,
    guardPath,
    profilePath,
    advance: (ms: number) => { nowMs += ms; },
    setAccountExists: (value: boolean) => { accountExists = value; },
    setEmailVerified: (value: boolean) => { emailVerified = value; },
    setDisabled: (value: boolean) => { disabled = value; },
    setAuthFailure: (value: boolean) => { authFailure = value; }
  };
}

test('checking eligibility does not start access or create a billing entitlement', async () => {
  const { trial, data, transactionCreates } = setup();
  await expect(trial.status('user_123')).resolves.toEqual({ eligible: true, active: false, endsAt: null });
  await expect(trial.verify('user_123')).resolves.toBeNull();
  expect(transactionCreates).toEqual([]);
  expect(data.size).toBe(0);
});

test('explicit start creates one exact ten-day lease and concurrent replay does not extend it', async () => {
  const { trial, data, transactionCreates, trialPath, advance } = setup();
  const [first, second] = await Promise.all([trial.start('user_123'), trial.start('user_123')]);
  const endsAt = new Date(START_MS + APP_FREE_TRIAL_MS).toISOString();
  expect(first).toEqual({ eligible: false, active: true, endsAt });
  expect(second).toEqual(first);
  expect(transactionCreates).toEqual([trialPath]);
  expect(data.get(trialPath)).toEqual({
    uid: 'user_123', purpose: 'app_trial',
    startedAt: timestamp(START_MS), endsAt: timestamp(START_MS + 10 * DAY_MS)
  });
  advance(5 * DAY_MS);
  await expect(trial.start('user_123')).resolves.toEqual(first);
  await expect(trial.verify('user_123')).resolves.toEqual({
    isPro: true, status: 'active', tier: 'PRO_TRIAL',
    expiresAtMs: START_MS + 10 * DAY_MS, source: 'app_trial'
  });
  expect(transactionCreates).toEqual([trialPath]);
});

test('expiry is exact and the retained lease prevents a second trial', async () => {
  const { trial, advance, transactionCreates, trialPath } = setup();
  await trial.start('user_123');
  advance(APP_FREE_TRIAL_MS - 1);
  await expect(trial.verify('user_123')).resolves.toMatchObject({ source: 'app_trial' });
  advance(1);
  await expect(trial.verify('user_123')).resolves.toBeNull();
  const expired = { eligible: false, active: false, endsAt: new Date(START_MS + APP_FREE_TRIAL_MS).toISOString() };
  await expect(trial.status('user_123')).resolves.toEqual(expired);
  await expect(trial.start('user_123')).resolves.toEqual(expired);
  expect(transactionCreates).toEqual([trialPath]);
});

test.each([
  ['another account', { uid: 'attacker' }],
  ['another purpose', { purpose: 'admin' }],
  ['wrong period', { endsAt: timestamp(START_MS + 11 * DAY_MS) }],
  ['missing start', { startedAt: null }],
  ['string end', { endsAt: new Date(START_MS + 10 * DAY_MS).toISOString() }]
])('a malformed %s record cannot grant or restart access', async (_description, override) => {
  const { trial, data, trialPath, transactionCreates } = setup();
  data.set(trialPath, {
    uid: 'user_123', purpose: 'app_trial',
    startedAt: timestamp(START_MS), endsAt: timestamp(START_MS + 10 * DAY_MS),
    ...override
  });
  await expect(trial.status('user_123')).resolves.toEqual({ eligible: false, active: false, endsAt: null });
  await expect(trial.verify('user_123')).resolves.toBeNull();
  await expect(trial.start('user_123')).resolves.toEqual({ eligible: false, active: false, endsAt: null });
  expect(transactionCreates).toEqual([]);
});

test('deletion guard prevents starting and immediately revokes an existing lease', async () => {
  const { trial, data, guardPath } = setup();
  await trial.start('user_123');
  data.set(guardPath, { state: 'deleting' });
  await expect(trial.status('user_123')).rejects.toBeInstanceOf(TrialAccountUnavailableError);
  await expect(trial.start('user_123')).rejects.toBeInstanceOf(TrialAccountUnavailableError);
  await expect(trial.verify('user_123')).resolves.toBeNull();
});

test('deleting profile prevents starting or using the lease', async () => {
  const { trial, data, profilePath } = setup();
  await trial.start('user_123');
  data.set(profilePath, { deletionStatus: 'deleting' });
  await expect(trial.start('user_123')).rejects.toBeInstanceOf(TrialAccountUnavailableError);
  await expect(trial.verify('user_123')).resolves.toBeNull();
});

test.each(['missing', 'disabled', 'unverified'] as const)('a %s Auth account cannot start or use a trial', async kind => {
  const harness = setup();
  await harness.trial.start('user_123');
  if (kind === 'missing') harness.setAccountExists(false);
  if (kind === 'disabled') harness.setDisabled(true);
  if (kind === 'unverified') harness.setEmailVerified(false);
  await expect(harness.trial.status('user_123')).rejects.toBeInstanceOf(TrialAccountUnavailableError);
  await expect(harness.trial.start('user_123')).rejects.toBeInstanceOf(TrialAccountUnavailableError);
  await expect(harness.trial.verify('user_123')).resolves.toBeNull();
});

test('an Auth outage never turns a trial into access', async () => {
  const harness = setup();
  await harness.trial.start('user_123');
  harness.setAuthFailure(true);
  await expect(harness.trial.verify('user_123')).rejects.toThrow('Auth unavailable');
});
