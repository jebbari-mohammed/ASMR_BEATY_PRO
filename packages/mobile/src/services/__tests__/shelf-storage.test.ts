import { ShelfService } from '../shelf-service';

let mockUid: string | null = 'qa-user';
const mockGet = jest.fn();
const mockSet = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockUserDoc = jest.fn();

jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: () => ({ currentUser: mockUid ? { uid: mockUid } : null })
}));

jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: () => ({
    collection: () => ({
      doc: mockUserDoc
    })
  })
}));

beforeEach(() => {
  mockUid = 'qa-user';
  mockGet.mockReset();
  mockSet.mockReset().mockResolvedValue(undefined);
  mockUpdate.mockReset().mockResolvedValue(undefined);
  mockDelete.mockReset().mockResolvedValue(undefined);
  mockUserDoc.mockReset().mockImplementation(() => ({
    collection: () => ({
      orderBy: () => ({ limit: () => ({ get: mockGet }) }),
      doc: () => ({ id: 'product123456789', set: mockSet, update: mockUpdate, delete: mockDelete })
    })
  }));
});

const item = { brand: 'Example', name: 'Gentle cleanser', category: 'Cleanser' as const, openedOn: null };

test('a shelf write cannot target an account other than the one that opened the form', async () => {
  mockUid = 'second-user';
  await expect(ShelfService.add(item, 'qa-user')).rejects.toThrow('Account changed while accessing your shelf.');
  await expect(ShelfService.update('product123456789', item, 'qa-user')).rejects.toThrow('Account changed while accessing your shelf.');
  await expect(ShelfService.remove('product123456789', 'qa-user')).rejects.toThrow('Account changed while accessing your shelf.');
  expect(mockUserDoc).not.toHaveBeenCalled();
  expect(mockSet).not.toHaveBeenCalled();
  expect(mockUpdate).not.toHaveBeenCalled();
  expect(mockDelete).not.toHaveBeenCalled();
});

test('a shelf read rejects results from an account that signed out mid-request', async () => {
  let finishRead!: (value: { docs: unknown[] }) => void;
  mockGet.mockReturnValue(new Promise(resolve => { finishRead = resolve; }));
  const read = ShelfService.list('qa-user');
  expect(mockUserDoc).toHaveBeenCalledWith('qa-user');
  mockUid = null;
  finishRead({ docs: [] });
  await expect(read).rejects.toThrow('Account changed while loading your shelf.');
});

test('a shelf write targets the expected user when the account is unchanged', async () => {
  await ShelfService.add(item, 'qa-user');
  expect(mockUserDoc).toHaveBeenCalledWith('qa-user');
  expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
    name: 'Gentle cleanser',
    category: 'Cleanser'
  }));
});
