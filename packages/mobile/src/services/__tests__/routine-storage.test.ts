import { activeRoutineSteps, routineAvailability, RoutineService, STARTER_STEPS } from '../routine-service';
import { RoutineLogCorrectionError, RoutineLogService } from '../routine-log-service';
import { OnboardingService } from '../onboarding-machine';

const mockGet = jest.fn();
const mockSet = jest.fn();
const mockOnSnapshot = jest.fn();
const mockTransactionGet = jest.fn();
const mockTransactionSet = jest.fn();
const mockRunTransaction = jest.fn();
let mockUid: string | null = 'qa-user';

jest.mock('../onboarding-machine', () => ({
  OnboardingService: { getStarterPreferences: jest.fn().mockResolvedValue(null) }
}));

jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: () => ({ currentUser: mockUid ? { uid: mockUid } : null })
}));

jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: Object.assign(
    () => ({
      runTransaction: mockRunTransaction,
      collection: () => ({
        doc: () => ({
          collection: () => ({ doc: () => ({ get: mockGet, set: mockSet, onSnapshot: mockOnSnapshot }) })
        })
      })
    }),
    { FieldValue: {
      arrayUnion: (value: string) => ({ operation: 'union', value }),
      arrayRemove: (value: string) => ({ operation: 'remove', value })
    } }
  )
}));

beforeEach(() => {
  mockUid = 'qa-user';
  mockGet.mockReset();
  mockSet.mockReset();
  mockSet.mockResolvedValue(undefined);
  mockOnSnapshot.mockReset();
  mockTransactionGet.mockReset();
  mockTransactionSet.mockReset();
  mockRunTransaction.mockReset();
  mockRunTransaction.mockImplementation(callback => callback({ get: mockTransactionGet, set: mockTransactionSet }));
  jest.mocked(OnboardingService.getStarterPreferences).mockClear();
  jest.mocked(OnboardingService.getStarterPreferences).mockResolvedValue(null);
});

test('a missing routine document loads the starter steps', async () => {
  mockGet.mockResolvedValue({ exists: () => false, data: () => undefined });
  await expect(RoutineService.get()).resolves.toEqual(STARTER_STEPS);
});

test('a new account receives its previewed short routine before editing anything', async () => {
  mockGet.mockResolvedValue({ exists: () => false, data: () => undefined });
  jest.mocked(OnboardingService.getStarterPreferences).mockResolvedValue({
    selectedGoals: ['more_hydration_less_dryness'],
    skinFeelByEndOfDay: 'tight_or_dry',
    sensitivityLevel: 'very_easily',
    timeCommitment: 'about_2_minutes'
  });
  const steps = await RoutineService.get();
  expect(OnboardingService.getStarterPreferences).toHaveBeenCalledWith('qa-user');
  expect(steps).toHaveLength(4);
  expect(steps[0]?.name).toBe('Moisturize');
});

test('the owned basics answer changes the routine after membership unlock', async () => {
  mockGet.mockResolvedValue({ exists: () => false, data: () => undefined });
  jest.mocked(OnboardingService.getStarterPreferences).mockResolvedValue({
    selectedGoals: ['unsure_help_me_decide'],
    timeCommitment: 'about_2_minutes',
    ownedBasics: ['none_yet']
  });
  const steps = await RoutineService.get();
  expect(steps.map(step => step.name)).toEqual([
    'Moisturize when ready', 'Protect outdoors', 'Rinse gently', 'Moisturize when ready'
  ]);
});

test('pausing a step is reversible and does not erase past completion data', async () => {
  const routine = [
    { ...STARTER_STEPS[0], paused: true },
    STARTER_STEPS[1],
    { ...STARTER_STEPS[2], paused: false }
  ];
  const completedIds = ['m1', 'm2'];
  expect(activeRoutineSteps(routine).map(step => step.id)).toEqual(['m2', 'm3']);
  expect(activeRoutineSteps(routine).filter(step => completedIds.includes(step.id)).map(step => step.id)).toEqual(['m2']);
  expect(activeRoutineSteps(routine.map(step => step.id === 'm1' ? { ...step, paused: false } : step)).map(step => step.id)).toEqual(['m1', 'm2', 'm3']);
  expect(completedIds).toEqual(['m1', 'm2']);
});

test('older saved steps remain active, and only booleans can mark a step paused', async () => {
  mockGet.mockResolvedValueOnce({ exists: () => true, data: () => ({ steps: STARTER_STEPS }) });
  const legacy = await RoutineService.get();
  expect(activeRoutineSteps(legacy)).toHaveLength(STARTER_STEPS.length);

  mockGet.mockResolvedValueOnce({ exists: () => true, data: () => ({ steps: [{ ...STARTER_STEPS[0], paused: 'yes' }] }) });
  await expect(RoutineService.get()).rejects.toThrow('Your saved routine could not be read.');
  await expect(RoutineService.save([{ ...STARTER_STEPS[0], paused: 'yes' } as never], 'qa-user'))
    .rejects.toThrow('A routine needs 1 to 20 valid, unique steps.');
  expect(mockSet).not.toHaveBeenCalled();
});

test('all paused steps leave no daily checklist and save without deleting routine steps', async () => {
  const paused = STARTER_STEPS.map(step => ({ ...step, paused: true }));
  expect(activeRoutineSteps(paused)).toEqual([]);
  expect(routineAvailability(paused)).toBe('all_paused');
  expect(routineAvailability([])).toBe('empty');
  expect(routineAvailability(STARTER_STEPS)).toBe('active');
  await RoutineService.save(paused, 'qa-user');
  expect(mockSet).toHaveBeenCalledWith({ steps: paused, updatedAt: expect.any(Number) });
});

test('a routine read cannot use another account’s starter preferences after an auth switch', async () => {
  let finishRead!: (value: { exists: () => boolean }) => void;
  mockGet.mockReturnValue(new Promise(resolve => { finishRead = resolve; }));

  const read = RoutineService.get();
  mockUid = 'second-user';
  finishRead({ exists: () => false });

  await expect(read).rejects.toThrow('Account changed while loading your routine.');
  expect(OnboardingService.getStarterPreferences).not.toHaveBeenCalled();
});

test('a routine save cannot write to a different signed-in account', async () => {
  mockUid = 'second-user';
  await expect(RoutineService.save(STARTER_STEPS, 'qa-user'))
    .rejects.toThrow('Account changed before saving your routine.');
  expect(mockSet).not.toHaveBeenCalled();
});

test('a missing daily log starts with no completions', async () => {
  mockGet.mockResolvedValue({ exists: () => false, data: () => undefined });
  await expect(RoutineLogService.get('2026-09-27')).resolves.toBeNull();
});

test('the day listener reports local pending writes and later server acknowledgement', () => {
  const unsubscribe = jest.fn();
  mockOnSnapshot.mockReturnValue(unsubscribe);
  const onChange = jest.fn();
  const onError = jest.fn();
  const stop = RoutineLogService.watch('2026-09-27', onChange, onError);

  expect(mockOnSnapshot).toHaveBeenCalledWith(
    { includeMetadataChanges: true },
    expect.any(Function),
    onError
  );
  const callback = mockOnSnapshot.mock.calls[0][1];
  const pendingSnapshot = {
    exists: () => true,
    data: () => ({ completedIds: ['morning_1'], updatedAt: 123 }),
    metadata: { hasPendingWrites: true }
  };
  callback(pendingSnapshot);
  callback({ ...pendingSnapshot, metadata: { hasPendingWrites: false } });
  expect(onChange).toHaveBeenNthCalledWith(1, {
    log: { day: '2026-09-27', completedIds: ['morning_1'], updatedAt: 123 },
    pendingWrites: true
  });
  expect(onChange).toHaveBeenNthCalledWith(2, {
    log: { day: '2026-09-27', completedIds: ['morning_1'], updatedAt: 123 },
    pendingWrites: false
  });
  stop();
  expect(unsubscribe).toHaveBeenCalledTimes(1);
});

test('completing steps uses independent atomic adds instead of replacing the day log', async () => {
  const currentIds = ['morning_1', 'evening_1'];
  await RoutineLogService.setStep('2026-09-27', 'morning_1', true, currentIds);
  await RoutineLogService.setStep('2026-09-27', 'evening_1', true, currentIds);

  expect(mockSet).toHaveBeenNthCalledWith(1, {
    day: '2026-09-27',
    completedIds: { operation: 'union', value: 'morning_1' },
    updatedAt: expect.any(Number)
  }, { merge: true });
  expect(mockSet).toHaveBeenNthCalledWith(2, {
    day: '2026-09-27',
    completedIds: { operation: 'union', value: 'evening_1' },
    updatedAt: expect.any(Number)
  }, { merge: true });
});

test('undoing a step removes only that step and rejects invalid IDs', async () => {
  await RoutineLogService.setStep('2026-09-27', 'morning_1', false, ['morning_1']);
  expect(mockSet).toHaveBeenCalledWith({
    day: '2026-09-27',
    completedIds: { operation: 'remove', value: 'morning_1' },
    updatedAt: expect.any(Number)
  }, { merge: true });
  await expect(RoutineLogService.setStep('2026-09-27', 'bad/id', true, ['bad/id'])).rejects.toThrow('Invalid routine step.');
  expect(mockSet).toHaveBeenCalledTimes(1);
});

test('a stale routine with more than 20 steps cannot write a day log', async () => {
  const ids = Array.from({ length: 21 }, (_, index) => `step_${index}`);
  await expect(RoutineLogService.setStep('2026-09-27', ids[0], true, ids))
    .rejects.toThrow('The current routine could not be verified.');
  expect(mockSet).not.toHaveBeenCalled();
});

test('a full day log can retire old step IDs without dropping current checkoffs', async () => {
  const originalDenial = Object.assign(new Error('permission denied'), { code: 'firestore/permission-denied' });
  mockSet.mockRejectedValueOnce(originalDenial);
  mockTransactionGet
    .mockResolvedValueOnce({ data: () => ({ completedIds: ['retired_1', 'remote_1', 'morning_1'] }) })
    .mockResolvedValueOnce({ exists: () => true, data: () => ({ steps: [
      { id: 'morning_1' }, { id: 'evening_1' }, { id: 'remote_1' }
    ] }) });

  await RoutineLogService.setStep('2026-09-27', 'evening_1', true, ['morning_1', 'evening_1']);

  expect(mockRunTransaction).toHaveBeenCalledTimes(1);
  expect(mockTransactionSet).toHaveBeenCalledWith(expect.anything(), {
    day: '2026-09-27',
    completedIds: ['remote_1', 'morning_1', 'evening_1'],
    updatedAt: expect.any(Number)
  }, { merge: true });
});

test('an undo during old-log compaction remains the final checkoff state', async () => {
  const originalDenial = Object.assign(new Error('too many old IDs'), { code: 'firestore/permission-denied' });
  mockSet.mockRejectedValueOnce(originalDenial);
  mockTransactionGet
    .mockResolvedValueOnce({ data: () => ({ completedIds: ['retired_1', 'morning_1'] }) })
    .mockResolvedValueOnce({ exists: () => true, data: () => ({ steps: [{ id: 'morning_1' }, { id: 'evening_1' }] }) });
  let finishTransaction!: () => void;
  let transactionStarted!: () => void;
  const started = new Promise<void>(resolve => { transactionStarted = resolve; });
  const holdCommit = new Promise<void>(resolve => { finishTransaction = resolve; });
  mockRunTransaction.mockImplementationOnce(async callback => {
    await callback({ get: mockTransactionGet, set: mockTransactionSet });
    transactionStarted();
    await holdCommit;
  });

  let latestCompleted = true;
  const ids = ['morning_1', 'evening_1'];
  const add = RoutineLogService.setStep('2026-09-27', 'evening_1', true, ids, () => latestCompleted);
  await started;
  latestCompleted = false;
  await RoutineLogService.setStep('2026-09-27', 'evening_1', false, ids, () => latestCompleted);
  finishTransaction();
  await add;

  expect(mockSet).toHaveBeenCalledTimes(3);
  expect(mockSet).toHaveBeenNthCalledWith(2, expect.objectContaining({
    completedIds: { operation: 'remove', value: 'evening_1' }
  }), { merge: true });
  expect(mockTransactionSet).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
    completedIds: ['morning_1', 'evening_1']
  }), { merge: true });
  expect(mockSet).toHaveBeenNthCalledWith(3, expect.objectContaining({
    completedIds: { operation: 'remove', value: 'evening_1' }
  }), { merge: true });
});

test('a failed final undo after compaction is surfaced as a correction error', async () => {
  const originalDenial = Object.assign(new Error('too many old IDs'), { code: 'firestore/permission-denied' });
  mockSet.mockRejectedValueOnce(originalDenial).mockRejectedValueOnce(new Error('network failed'));
  mockTransactionGet
    .mockResolvedValueOnce({ data: () => ({ completedIds: ['retired_1'] }) })
    .mockResolvedValueOnce({ exists: () => true, data: () => ({ steps: [{ id: 'evening_1' }] }) });

  await expect(RoutineLogService.setStep('2026-09-27', 'evening_1', true, ['evening_1'], () => false))
    .rejects.toBeInstanceOf(RoutineLogCorrectionError);
});

test('a denied write with no retired IDs remains denied', async () => {
  const originalDenial = Object.assign(new Error('membership denied'), { code: 'firestore/permission-denied' });
  mockSet.mockRejectedValueOnce(originalDenial);
  mockTransactionGet
    .mockResolvedValueOnce({ data: () => ({ completedIds: ['morning_1'] }) })
    .mockResolvedValueOnce({ exists: () => false, data: () => undefined });

  await expect(RoutineLogService.setStep('2026-09-27', 'evening_1', true, ['morning_1', 'evening_1']))
    .rejects.toBe(originalDenial);
  expect(mockTransactionSet).not.toHaveBeenCalled();
});

test('compaction cannot turn revoked membership into a successful checkoff', async () => {
  const originalDenial = Object.assign(new Error('membership denied'), { code: 'firestore/permission-denied' });
  mockSet.mockRejectedValueOnce(originalDenial);
  mockTransactionGet.mockRejectedValueOnce(originalDenial);

  await expect(RoutineLogService.setStep('2026-09-27', 'evening_1', true, ['morning_1', 'evening_1']))
    .rejects.toBe(originalDenial);
  expect(mockTransactionSet).not.toHaveBeenCalled();
});

test('a stale device cannot re-add a step removed from the latest saved routine', async () => {
  const originalDenial = Object.assign(new Error('permission denied'), { code: 'firestore/permission-denied' });
  mockSet.mockRejectedValueOnce(originalDenial);
  mockTransactionGet
    .mockResolvedValueOnce({ data: () => ({ completedIds: ['retired_1'] }) })
    .mockResolvedValueOnce({ exists: () => true, data: () => ({ steps: [{ id: 'other_1' }] }) });

  await expect(RoutineLogService.setStep('2026-09-27', 'morning_1', true, ['morning_1']))
    .rejects.toBe(originalDenial);
  expect(mockTransactionSet).not.toHaveBeenCalled();
});
