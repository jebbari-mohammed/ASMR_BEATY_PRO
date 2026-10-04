import {
  APPROVED_TRACKING_HOSTS_DOCUMENT,
  DEFAULT_US_DISCOVERY_PRODUCTS,
  PRODUCT_DISCOVERY_DOCUMENT,
  ProductDiscoveryCatalog,
  validateApprovedTrackingHosts,
  validateDiscoveryProducts
} from '../product-discovery.js';

const direct = DEFAULT_US_DISCOVERY_PRODUCTS[0];
const approval = {
  host: 'ulta.examplepartner.com',
  approvalReference: 'partner-contract-2026',
  allowedQueryKeys: ['u', 'campaign']
};
const commissioned = {
  ...direct,
  id: 'approved-partner-cleanser',
  url: `https://${approval.host}/c/123/456?u=${encodeURIComponent(direct.url)}&campaign=asmrbeautypro`,
  isCommissioned: true
};

function fixture({
  catalog = null,
  hosts = null,
  readFails = false
}: {
  catalog?: Record<string, unknown> | null;
  hosts?: Record<string, unknown> | null;
  readFails?: boolean;
} = {}) {
  const get = jest.fn(async (path: string) => {
    if (readFails) throw new Error('Firestore unavailable');
    const value = path === PRODUCT_DISCOVERY_DOCUMENT ? catalog :
      path === APPROVED_TRACKING_HOSTS_DOCUMENT ? hosts : null;
    return { exists: value !== null, data: () => value };
  });
  const db: any = { doc: (path: string) => ({ get: () => get(path) }) };
  return { catalog: new ProductDiscoveryCatalog(db), get };
}

test('bundled links are real direct Ulta pages with no commission or user data', () => {
  expect(DEFAULT_US_DISCOVERY_PRODUCTS).toHaveLength(5);
  for (const item of DEFAULT_US_DISCOVERY_PRODUCTS) {
    expect(item.isCommissioned).toBe(false);
    expect(item.url).toMatch(/^https:\/\/www\.ulta\.com\/p\//);
    expect(new URL(item.url).search).toBe('');
  }
  expect(new Set(DEFAULT_US_DISCOVERY_PRODUCTS.map(item => item.category)))
    .toEqual(new Set(['Cleanser', 'Moisturizer', 'Sunscreen']));
});

test('missing or unavailable Firestore config falls back to vetted direct links', async () => {
  const absent = fixture();
  await expect(absent.catalog.list()).resolves.toEqual({
    products: DEFAULT_US_DISCOVERY_PRODUCTS, approvedTrackingHosts: []
  });
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  try {
    const outage = fixture({ readFails: true });
    await expect(outage.catalog.list()).resolves.toEqual({
      products: DEFAULT_US_DISCOVERY_PRODUCTS, approvedTrackingHosts: []
    });
  } finally {
    warn.mockRestore();
  }
});

test('admin catalog override and intentional empty catalog are respected', async () => {
  await expect(fixture({ catalog: { version: 1, products: [direct] } }).catalog.list())
    .resolves.toEqual({ products: [direct], approvedTrackingHosts: [] });
  await expect(fixture({ catalog: { version: 1, products: [] } }).catalog.list())
    .resolves.toEqual({ products: [], approvedTrackingHosts: [] });
});

test('a commissioned URL needs separately approved host and exact query keys', async () => {
  const { catalog, get } = fixture({
    catalog: { version: 1, products: [commissioned] },
    hosts: { version: 1, hosts: [approval] }
  });
  await expect(catalog.list()).resolves.toEqual({
    products: [commissioned], approvedTrackingHosts: [approval.host]
  });
  expect(get).toHaveBeenCalledWith(APPROVED_TRACKING_HOSTS_DOCUMENT);
});

test('a missing host approval or malformed remote catalog never exposes the partner URL', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  try {
    for (const setup of [
      { catalog: { version: 1, products: [commissioned] } },
      { catalog: { version: 2, products: [direct] } },
      { catalog: { version: 1, products: [{ ...direct, url: 'https://evil.example/p/item' }] } }
    ]) {
      await expect(fixture(setup).catalog.list()).resolves.toEqual({
        products: DEFAULT_US_DISCOVERY_PRODUCTS, approvedTrackingHosts: []
      });
    }
  } finally {
    warn.mockRestore();
  }
});

test.each([
  'http://www.ulta.com/p/cleanser',
  'https://www.ulta.com.evil.example/p/cleanser',
  'https://ulta.com/p/cleanser',
  'https://www.ulta.com/p/cleanser?uid=private-user',
  'https://www.ulta.com/p/cleanser#tracker',
  'https://user:pass@www.ulta.com/p/cleanser',
  'https://www.ulta.com/not-a-product'
])('rejects unsafe direct URL %s', url => {
  expect(() => validateDiscoveryProducts([{ ...direct, url }])).toThrow();
});

test('rejects invented price/stock claims, duplicate IDs, and false commission flags', () => {
  expect(() => validateDiscoveryProducts([{ ...direct, price: 12.99 }])).toThrow();
  expect(() => validateDiscoveryProducts([direct, direct])).toThrow();
  expect(() => validateDiscoveryProducts([{ ...direct, isCommissioned: true }])).toThrow();
});

test.each([
  '127.0.0.1', 'localhost', 'redirect.local', 'www.ulta.com', 'evil.ulta.com',
  '*.examplepartner.com', 'examplepartner.123'
])('rejects unsafe tracking host approval %s', host => {
  expect(() => validateApprovedTrackingHosts([{ ...approval, host }])).toThrow();
});

test.each(['uid', 'customerId', 'PartnerCustomerId', 'PartnerCustId', 'PCID', 'deviceId', 'email', 'phone', 'ipAddress'])
('host approval cannot allow personal query key %s', key => {
  expect(() => validateApprovedTrackingHosts([{ ...approval, allowedQueryKeys: [key] }])).toThrow();
});

test('rejects unapproved tracking parameters, dynamic UID placeholders, and hostile destinations', () => {
  expect(() => validateDiscoveryProducts([commissioned], [])).toThrow();
  expect(() => validateDiscoveryProducts([{
    ...commissioned, url: `${commissioned.url}&uid=private-user`
  }], [approval])).toThrow();
  expect(() => validateDiscoveryProducts([{
    ...commissioned, url: `https://${approval.host}/c/{uid}/456?campaign=asmrbeautypro`
  }], [approval])).toThrow();
  expect(() => validateDiscoveryProducts([{
    ...commissioned, url: `https://${approval.host}/c/123/456?campaign=%257B%257BMemberID%257D%257D`
  }], [approval])).toThrow();
  expect(() => validateDiscoveryProducts([{
    ...commissioned,
    url: `https://${approval.host}/c/123/456?u=${encodeURIComponent('https://evil.example/p/cleanser')}`
  }], [approval])).toThrow();
});
