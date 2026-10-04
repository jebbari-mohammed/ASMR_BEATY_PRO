import { parseProductDiscovery, ProductDiscoveryService } from '../product-discovery-service';

let mockUid: string | null = 'alice';
const mockCallable = jest.fn();
const mockHttpsCallable = jest.fn(() => mockCallable);

jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: () => ({ currentUser: mockUid ? { uid: mockUid } : null })
}));

jest.mock('@react-native-firebase/functions', () => ({
  __esModule: true,
  default: () => ({ httpsCallable: mockHttpsCallable })
}));

const product = {
  id: 'vanicream-gentle-cleanser',
  brand: 'Vanicream',
  name: 'Gentle Facial Cleanser for Sensitive Skin',
  category: 'Cleanser',
  merchant: 'Ulta Beauty',
  url: 'https://www.ulta.com/p/gentle-facial-cleanser-sensitive-skin-pimprod2042401',
  isCommissioned: false
};

beforeEach(() => {
  mockUid = 'alice';
  mockCallable.mockReset().mockResolvedValue({ data: { products: [product], approvedTrackingHosts: [] } });
  mockHttpsCallable.mockClear();
});

test('loads only the admin catalog for the current account and preserves the exact commission flag', async () => {
  await expect(ProductDiscoveryService.list('alice')).resolves.toEqual([product]);
  expect(mockHttpsCallable).toHaveBeenCalledWith('getProductDiscovery');
  expect(mockCallable).toHaveBeenCalledWith({});
  const commissioned = { ...product, url: 'https://track.example-partner.com/click?item=cleanser', isCommissioned: true };
  expect(parseProductDiscovery({ products: [commissioned], approvedTrackingHosts: ['track.example-partner.com'] })[0].isCommissioned).toBe(true);
});

test('rejects malformed retailer destinations and missing commission flags', () => {
  for (const url of [
    'http://www.ulta.com/p/gentle-facial-cleanser-sensitive-skin-pimprod2042401',
    'https://www.ulta.com.evil.example/p/gentle-facial-cleanser-sensitive-skin-pimprod2042401',
    'https://www.ulta.com/account/sign-in',
    'javascript:alert(1)'
  ]) {
    expect(() => parseProductDiscovery({ products: [{ ...product, url }], approvedTrackingHosts: [] })).toThrow('unavailable');
  }
  const { isCommissioned: _removed, ...withoutDisclosure } = product;
  expect(() => parseProductDiscovery({ products: [withoutDisclosure], approvedTrackingHosts: [] })).toThrow('unavailable');
  expect(() => parseProductDiscovery({ products: [product, product], approvedTrackingHosts: [] })).toThrow('unavailable');
  const commissioned = { ...product, url: 'https://track.example-partner.com/click?item=cleanser', isCommissioned: true };
  expect(() => parseProductDiscovery({ products: [commissioned], approvedTrackingHosts: [] })).toThrow('unavailable');
  expect(() => parseProductDiscovery({ products: [commissioned], approvedTrackingHosts: ['track.example-partner.com.evil.example'] })).toThrow('unavailable');
  expect(() => parseProductDiscovery({ products: [product], approvedTrackingHosts: ['127.0.0.1'] })).toThrow('unavailable');
});

test('does not request or display a catalog for another signed-in account', async () => {
  mockUid = 'bob';
  await expect(ProductDiscoveryService.list('alice')).rejects.toThrow('Account changed');
  expect(mockCallable).not.toHaveBeenCalled();
  mockUid = 'alice';
  let finish!: (result: { data: { products: typeof product[]; approvedTrackingHosts: string[] } }) => void;
  mockCallable.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const pending = ProductDiscoveryService.list('alice');
  mockUid = 'bob';
  finish({ data: { products: [product], approvedTrackingHosts: [] } });
  await expect(pending).rejects.toThrow('Account changed');
});
