import {
  auditPartnerDestination, auditPublishManifest, isPublicIpv4Address,
  validatePublishManifest
} from '../product-link-audit.js';
import { DEFAULT_US_DISCOVERY_PRODUCTS } from '../../services/product-discovery.js';

const direct = DEFAULT_US_DISCOVERY_PRODUCTS[0];
const approval = {
  host: 'tracking.examplepartner.com',
  approvalReference: 'contract-2026',
  allowedQueryKeys: ['u']
};
const partner = {
  ...direct, isCommissioned: true,
  url: `https://${approval.host}/click?u=${encodeURIComponent(direct.url)}`
};
const envelope = {
  products: [partner], expectedDestinations: { [partner.id]: direct.url }
};

test('commissioned imports require an explicit clean destination for every commissioned ID', () => {
  expect(validatePublishManifest(envelope, [approval])).toEqual(envelope);
  expect(() => validatePublishManifest([partner], [approval])).toThrow('expectedDestinations');
  expect(() => validatePublishManifest({ products: [partner] }, [approval])).toThrow('expectedDestinations');
  expect(() => validatePublishManifest({
    ...envelope, expectedDestinations: { wrong: direct.url }
  }, [approval])).toThrow('exactly');
  expect(() => validatePublishManifest({
    ...envelope, expectedDestinations: { [partner.id]: 'https://evil.example/p/other' }
  }, [approval])).toThrow();
  expect(() => validatePublishManifest({
    ...envelope, unexpected: 'ignored field'
  }, [approval])).toThrow('Unexpected');
  expect(validatePublishManifest([direct], [])).toEqual({
    products: [direct], expectedDestinations: {}
  });
});

test('redirect audit verifies the exact product path before catalog publication', async () => {
  const visited: string[] = [];
  const probe = async (url: URL) => {
    visited.push(url.href);
    return url.hostname === approval.host
      ? { status: 302, location: direct.url }
      : { status: 200 };
  };
  await auditPublishManifest(validatePublishManifest(envelope, [approval]), [approval], probe);
  expect(visited).toEqual([partner.url, direct.url]);
});

test('one bulk manifest audits every commissioned link and leaves direct links alone', async () => {
  const second = DEFAULT_US_DISCOVERY_PRODUCTS[1];
  const secondPartner = {
    ...second, isCommissioned: true,
    url: `https://${approval.host}/click?u=${encodeURIComponent(second.url)}`
  };
  const manifest = validatePublishManifest({
    products: [partner, secondPartner, DEFAULT_US_DISCOVERY_PRODUCTS[2]],
    expectedDestinations: { [partner.id]: direct.url, [second.id]: second.url }
  }, [approval]);
  const visited: string[] = [];
  await auditPublishManifest(manifest, [approval], async url => {
    visited.push(url.href);
    const destination = url.searchParams.get('u');
    return destination ? { status: 302, location: destination } : { status: 200 };
  });
  expect(visited).toEqual([partner.url, direct.url, secondPartner.url, second.url]);
});

test.each([
  ['unknown host', { status: 302, location: 'https://evil.example/p/other' }],
  ['insecure redirect', { status: 302, location: 'http://www.ulta.com/p/other' }],
  ['missing redirect', { status: 302 }],
  ['not found', { status: 404 }],
  ['empty response', { status: 204 }],
  ['tracking page', { status: 200 }]
])('redirect audit refuses %s', async (_name, first) => {
  await expect(auditPartnerDestination(partner.url, direct.url, [approval],
    async () => first)).rejects.toThrow();
});

test('redirect audit refuses a different product, even on Ulta', async () => {
  await expect(auditPartnerDestination(partner.url, direct.url, [approval], async url =>
    url.hostname === approval.host
      ? { status: 302, location: DEFAULT_US_DISCOVERY_PRODUCTS[1].url }
      : { status: 200 }
  )).rejects.toThrow('expected Ulta product');
});

test('redirect audit permits a merchant canonicalization hop but still requires the exact final product', async () => {
  const visited: string[] = [];
  await auditPartnerDestination(partner.url, direct.url, [approval], async url => {
    visited.push(url.href);
    if (url.hostname === approval.host) return { status: 302, location: `https://ulta.com${new URL(direct.url).pathname}` };
    if (url.hostname === 'ulta.com') return { status: 301, location: direct.url };
    return { status: 200 };
  });
  expect(visited).toEqual([partner.url, `https://ulta.com${new URL(direct.url).pathname}`, direct.url]);
});

test('redirect audit refuses loops', async () => {
  await expect(auditPartnerDestination(partner.url, direct.url, [approval], async () =>
    ({ status: 302, location: partner.url })
  )).rejects.toThrow('repeated');
});

test.each([
  ['8.8.8.8', true], ['127.0.0.1', false], ['10.4.3.2', false],
  ['100.64.4.2', false], ['169.254.169.254', false], ['172.20.1.1', false],
  ['192.168.1.1', false], ['198.18.0.1', false], ['203.0.113.4', false],
  ['224.0.0.1', false], ['::1', false]
])('DNS probe only permits public IPv4: %s', (address, allowed) => {
  expect(isPublicIpv4Address(address)).toBe(allowed);
});
