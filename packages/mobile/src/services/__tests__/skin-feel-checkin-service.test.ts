import { localDayKey, SkinFeelCheckinService } from '../skin-feel-checkin-service';

let mockUid: string | null = 'alice';
const mockSet = jest.fn();
const mockDelete = jest.fn();
const mockCallable = jest.fn();
const mockGet = jest.fn();
const mockLimit = jest.fn();
const mockOrderBy = jest.fn();
const mockOnSnapshot = jest.fn();
const mockDayDoc = jest.fn();
const mockUserDoc = jest.fn();

jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: () => ({ currentUser: mockUid ? { uid: mockUid } : null })
}));

jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: () => ({ collection: () => ({ doc: mockUserDoc }) })
}));

jest.mock('@react-native-firebase/functions', () => ({
  __esModule: true,
  default: () => ({ httpsCallable: () => mockCallable })
}));

beforeEach(() => {
  mockUid = 'alice';
  mockSet.mockReset().mockResolvedValue(undefined);
  mockDelete.mockReset().mockResolvedValue(undefined);
  mockCallable.mockReset().mockResolvedValue({ data: { saved: true } });
  mockGet.mockReset().mockResolvedValue({ docs: [] });
  mockLimit.mockReset().mockReturnValue({ get: mockGet });
  mockOrderBy.mockReset().mockReturnValue({ limit: mockLimit });
  mockOnSnapshot.mockReset().mockReturnValue(() => {});
  mockDayDoc.mockReset().mockImplementation(() => ({ set: mockSet, delete: mockDelete, onSnapshot: mockOnSnapshot }));
  mockUserDoc.mockReset().mockImplementation(() => ({
    collection: () => ({ doc: mockDayDoc, orderBy: mockOrderBy })
  }));
});

test('saves and removes only the current day for the expected account', async () => {
  const day = localDayKey();
  await SkinFeelCheckinService.setToday(day, 'alice', 'dry_tight');
  expect(mockCallable).toHaveBeenCalledWith({ day, feel: 'dry_tight' });
  await SkinFeelCheckinService.removeToday(day, 'alice');
  expect(mockCallable).toHaveBeenCalledWith({ day, feel: null });
  expect(mockSet).not.toHaveBeenCalled();
  expect(mockDelete).not.toHaveBeenCalled();
  await expect(SkinFeelCheckinService.setToday('2026-02-30', 'alice', 'oily')).rejects.toThrow('today only');
  await expect(SkinFeelCheckinService.setToday('2020-01-01', 'alice', 'oily')).rejects.toThrow('today only');
  await expect(SkinFeelCheckinService.setToday(day, 'alice', 'diagnosed' as never)).rejects.toThrow('listed skin feel');
});

test('never redirects a stale check-in to a newly signed-in account', async () => {
  const day = localDayKey();
  mockUid = 'bob';
  await expect(SkinFeelCheckinService.setToday(day, 'alice', 'comfortable')).rejects.toThrow('Sign in');
  await expect(SkinFeelCheckinService.removeToday(day, 'alice')).rejects.toThrow('Sign in');
  expect(mockUserDoc).not.toHaveBeenCalled();
  expect(mockCallable).not.toHaveBeenCalled();
});

test('a callable response after account switch is not accepted as this account’s save', async () => {
  const day = localDayKey();
  let finish!: (value: { data: { saved: boolean } }) => void;
  mockCallable.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const write = SkinFeelCheckinService.setToday(day, 'alice', 'comfortable');
  mockUid = 'bob';
  finish({ data: { saved: true } });
  await expect(write).rejects.toThrow('Sign in');
});

test('the live view accepts only the fixed stored choices and ignores a switched account', () => {
  const day = localDayKey();
  const changed = jest.fn();
  const failed = jest.fn();
  SkinFeelCheckinService.watchToday(day, 'alice', changed, failed);
  const callback = mockOnSnapshot.mock.calls[0][1];
  callback({ exists: () => true, data: () => ({ day, feel: 'comfortable', updatedAt: 100 }), metadata: { hasPendingWrites: true } });
  expect(changed).toHaveBeenLastCalledWith({ checkin: { day, feel: 'comfortable', updatedAt: 100 }, pendingWrites: true });
  callback({ exists: () => true, data: () => ({ day, feel: 'clinical_improvement', updatedAt: 101 }), metadata: { hasPendingWrites: false } });
  expect(changed).toHaveBeenLastCalledWith({ checkin: null, pendingWrites: false });
  mockUid = 'bob';
  callback({ exists: () => true, data: () => ({ day, feel: 'oily', updatedAt: 102 }), metadata: { hasPendingWrites: false } });
  expect(changed).toHaveBeenCalledTimes(2);
  expect(failed).not.toHaveBeenCalled();
});

test('recent reads are capped at 14 and discard malformed documents', async () => {
  mockGet.mockResolvedValue({ docs: [
    { id: '2026-09-29', data: () => ({ day: '2026-09-29', feel: 'sensitive', updatedAt: 100 }) },
    { id: '2026-09-28', data: () => ({ day: 'other', feel: 'oily', updatedAt: 100 }) },
    { id: '2026-09-27', data: () => ({ day: '2026-09-27', feel: 'unknown', updatedAt: 100 }) }
  ] });
  await expect(SkinFeelCheckinService.recent('alice')).resolves.toEqual([{ day: '2026-09-29', feel: 'sensitive', updatedAt: 100 }]);
  expect(mockOrderBy).toHaveBeenCalledWith('day', 'desc');
  expect(mockLimit).toHaveBeenCalledWith(14);
});

test('a read that finishes after account change is rejected', async () => {
  let resolveRead!: (result: { docs: unknown[] }) => void;
  mockGet.mockReturnValue(new Promise(resolve => { resolveRead = resolve; }));
  const read = SkinFeelCheckinService.recent('alice');
  mockUid = null;
  resolveRead({ docs: [] });
  await expect(read).rejects.toThrow('Sign in');
});
