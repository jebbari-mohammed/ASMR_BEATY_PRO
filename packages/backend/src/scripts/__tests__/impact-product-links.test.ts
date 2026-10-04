import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  generateImpactManifest, impactProgramUrl, impactRequest, validateDirectImport,
  verifyUltaProgram, writePrivateImpactManifest, type ImpactRequest
} from '../impact-product-links.js';
import { DEFAULT_US_DISCOVERY_PRODUCTS } from '../../services/product-discovery.js';

const products = DEFAULT_US_DISCOVERY_PRODUCTS.slice(0, 2);
const program = {
  CampaignId: '789', AdvertiserName: 'Ulta Beauty',
  AdvertiserUrl: 'https://www.ulta.com/', ContractStatus: 'Active',
  AllowsDeeplinking: 'true', DeeplinkDomains: ['www.ulta.com']
};

test('requires the exact active Ulta program with permission for product deep links', () => {
  expect(() => verifyUltaProgram(program, '789')).not.toThrow();
  for (const bad of [
    { CampaignId: 'other' }, { AdvertiserName: 'Other Brand' },
    { AdvertiserUrl: 'https://www.ulta.com.evil.example' },
    { AdvertiserUrl: 'ftp://www.ulta.com' },
    { ContractStatus: 'Expired' }, { AllowsDeeplinking: 'false' },
    { DeeplinkDomains: ['ulta.com.evil.example'] },
    { DeeplinkDomains: { DeeplinkDomain: 'ulta.com.evil.example' } }
  ]) {
    expect(() => verifyUltaProgram({ ...program, ...bad }, '789')).toThrow('not an active Ulta');
  }
  expect(() => impactProgramUrl('../secret', '789')).toThrow('Invalid Impact');
});

test('accepts the official Retrieve a program response shape without weakening product URL checks', () => {
  const officialShape = {
    ...program,
    CampaignId: 789,
    AdvertiserUrl: 'http://www.ulta.com',
    AllowsDeeplinking: true,
    DeeplinkDomains: { DeeplinkDomain: 'ulta.com' }
  };
  expect(() => verifyUltaProgram(officialShape, '789')).not.toThrow();
  expect(() => verifyUltaProgram({
    ...officialShape, DeeplinkDomains: { DeeplinkDomain: ['example.com', 'www.ulta.com'] }
  }, '789')).not.toThrow();
  expect(() => validateDirectImport([{ ...products[0], url: 'http://www.ulta.com/p/item' }])).toThrow();
});

test('rejects commissioned or off-merchant input before asking Impact for links', () => {
  expect(validateDirectImport(products)).toEqual(products);
  expect(() => validateDirectImport([])).toThrow('clean direct');
  expect(() => validateDirectImport([{ ...products[0], isCommissioned: true }])).toThrow();
  expect(() => validateDirectImport([{ ...products[0], url: 'https://evil.example/p/item' }])).toThrow();
});

test('generates a bulk manifest with exact deep links and no user tracking values', async () => {
  const calls: Array<{ method: string; url: URL }> = [];
  const request: ImpactRequest = async (url, method) => {
    calls.push({ url, method });
    if (method === 'GET') return program;
    return {
      TrackingURL: `https://tracking.examplepartner.com/c/1/2/789?u=${encodeURIComponent(url.searchParams.get('DeepLink') ?? '')}`
    };
  };
  const result = await generateImpactManifest(products, '789', 'IRaccount', request);
  expect(calls.map(call => call.method)).toEqual(['GET', 'POST', 'POST']);
  expect(calls[0].url.href).toBe('https://api.impact.com/Mediapartners/IRaccount/Campaigns/789');
  expect(calls.slice(1).map(call => call.url.searchParams.get('DeepLink')))
    .toEqual(products.map(item => item.url));
  expect(result.manifest.products.map(item => item.isCommissioned)).toEqual([true, true]);
  expect(result.manifest.expectedDestinations).toEqual(Object.fromEntries(products.map(item => [item.id, item.url])));
  expect(result.approvalPreview).toEqual([{
    host: 'tracking.examplepartner.com', approvalReference: 'impact-api-preview', allowedQueryKeys: ['u']
  }]);
});

test('never generates a link if the program is not an active Ulta contract', async () => {
  const request = jest.fn(async (_url: URL, _method: 'GET' | 'POST') => ({
    ...program, ContractStatus: 'Expired'
  }));
  await expect(generateImpactManifest(products, '789', 'IRaccount', request)).rejects.toThrow('not an active Ulta');
  expect(request).toHaveBeenCalledTimes(1);
});

test('rejects Impact links with visitor IDs or dynamic placeholders', async () => {
  for (const tracking of [
    'https://tracking.examplepartner.com/c/1/2/789?PartnerCustId=visitor',
    'https://tracking.examplepartner.com/c/1/2/789?subId1=%257B%257BMemberID%257D%257D'
  ]) {
    await expect(generateImpactManifest(products.slice(0, 1), '789', 'IRaccount',
      async (_url, method) => method === 'GET' ? program : { TrackingURL: tracking }
    )).rejects.toThrow();
  }
});

test('writes partner links only to a new owner-readable file', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'asmr-impact-test-'));
  const path = join(folder, 'manifest.json');
  try {
    const manifest = { products, expectedDestinations: {} };
    await writePrivateImpactManifest(path, manifest);
    expect((await stat(path)).mode & 0o777).toBe(0o600);
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual(manifest);
    await expect(writePrivateImpactManifest(path, manifest)).rejects.toMatchObject({ code: 'EEXIST' });
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});

test('Impact API transport pins host, version, JSON response, and credentials to HTTPS', async () => {
  const mocked = jest.spyOn(global, 'fetch').mockImplementation(async (_url, options) => {
    expect(options?.method).toBe('GET');
    expect(options?.redirect).toBe('error');
    expect(options?.headers).toEqual({
      authorization: `Basic ${Buffer.from('IRaccount:test-token').toString('base64')}`,
      accept: 'application/json', 'IR-Version': '16'
    });
    return {
      ok: true, headers: { get: () => 'application/json' },
      text: async () => JSON.stringify(program)
    } as Response;
  });
  try {
    const request = impactRequest({ sid: 'IRaccount', token: 'test-token' });
    await expect(request(impactProgramUrl('IRaccount', '789'), 'GET')).resolves.toEqual(program);
    await expect(request(new URL('https://evil.example'), 'GET')).rejects.toThrow('host');
  } finally { mocked.mockRestore(); }
});
