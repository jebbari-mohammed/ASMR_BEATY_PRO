import {
  validateApprovedTrackingHosts,
  validateDiscoveryProducts,
  type ApprovedTrackingHost,
  type DiscoveryProduct
} from '../services/product-discovery.js';
import { validatePublishManifest, type PublishManifest } from './product-link-audit.js';
import { writeFile } from 'node:fs/promises';

export interface ImpactCredentials { sid: string; token: string }
export type ImpactRequest = (url: URL, method: 'GET' | 'POST') => Promise<unknown>;

const IMPACT_API = 'https://api.impact.com';
const IDENTIFIER = /^[A-Za-z0-9_-]{2,64}$/;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Unexpected Impact API response');
  }
  return value as Record<string, unknown>;
}

export function impactProgramUrl(sid: string, programId: string): URL {
  if (!IDENTIFIER.test(sid) || !IDENTIFIER.test(programId)) {
    throw new Error('Invalid Impact account or program identifier');
  }
  return new URL(`/Mediapartners/${sid}/Campaigns/${programId}`, IMPACT_API);
}

function linkUrl(sid: string, programId: string, destination: string): URL {
  const url = impactProgramUrl(sid, programId);
  url.pathname = `${url.pathname.replace('/Campaigns/', '/Programs/')}/TrackingLinks`;
  url.searchParams.set('DeepLink', destination);
  return url;
}

/** Pin the documented v16 response shape without changing account-wide settings. */
export function impactRequest(credentials: ImpactCredentials): ImpactRequest {
  if (!IDENTIFIER.test(credentials.sid) || !credentials.token || credentials.token.length > 512) {
    throw new Error('Impact credentials are unavailable or invalid');
  }
  const authorization = `Basic ${Buffer.from(`${credentials.sid}:${credentials.token}`).toString('base64')}`;
  return async (url, method) => {
    if (url.origin !== IMPACT_API) throw new Error('Unapproved Impact API host');
    const response = await fetch(url, {
      method, redirect: 'error', signal: AbortSignal.timeout(10_000),
      headers: { authorization, accept: 'application/json', 'IR-Version': '16' }
    });
    if (!response.ok) throw new Error(`Impact API returned HTTP ${response.status}`);
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().includes('application/json')) {
      throw new Error('Impact API did not return JSON');
    }
    const body = await response.text();
    if (body.length > 65_536) throw new Error('Impact API response is too large');
    try { return JSON.parse(body) as unknown; }
    catch { throw new Error('Impact API returned invalid JSON'); }
  };
}

/** Require the exact joined, active Ulta program and product deep-link right. */
export function verifyUltaProgram(value: unknown, programId: string): void {
  const program = record(value);
  let advertiser: URL;
  try { advertiser = new URL(program.AdvertiserUrl as string); }
  catch { throw new Error('Impact program has no valid advertiser URL'); }
  // Impact's current schema shows a string array, while its Retrieve a program
  // example wraps one or many strings in { DeeplinkDomain: ... }.
  const suppliedDomains = program.DeeplinkDomains;
  const domains = Array.isArray(suppliedDomains) ? suppliedDomains :
    suppliedDomains && typeof suppliedDomains === 'object' && !Array.isArray(suppliedDomains) &&
    Object.keys(suppliedDomains).length === 1 && Object.hasOwn(suppliedDomains, 'DeeplinkDomain')
      ? (suppliedDomains as { DeeplinkDomain: unknown }).DeeplinkDomain : undefined;
  const domainList = Array.isArray(domains) ? domains : [domains];
  const campaignId = typeof program.CampaignId === 'string' ? program.CampaignId :
    typeof program.CampaignId === 'number' && Number.isSafeInteger(program.CampaignId)
      ? String(program.CampaignId) : '';
  if (campaignId !== programId ||
      typeof program.AdvertiserName !== 'string' ||
      !/^ulta beauty(?:,? inc\.?)?$/i.test(program.AdvertiserName.trim()) ||
      !['http:', 'https:'].includes(advertiser.protocol) ||
      !['ulta.com', 'www.ulta.com'].includes(advertiser.hostname) ||
      advertiser.username || advertiser.password || advertiser.port ||
      program.ContractStatus !== 'Active' ||
      (program.AllowsDeeplinking !== 'true' && program.AllowsDeeplinking !== true) ||
      !domainList.some(domain => typeof domain === 'string' &&
        ['ulta.com', 'www.ulta.com', '*.ulta.com'].includes(domain))) {
    throw new Error('Impact program is not an active Ulta product deep-link contract');
  }
}

export function validateDirectImport(value: unknown): DiscoveryProduct[] {
  const products = Array.isArray(value) ? value : record(value).products;
  const validated = validateDiscoveryProducts(products);
  if (validated.length === 0 || validated.some(item => item.isCommissioned)) {
    throw new Error('Impact generation requires clean direct Ulta products');
  }
  return validated;
}

function previewApprovals(products: readonly DiscoveryProduct[]): ApprovedTrackingHost[] {
  const byHost = new Map<string, Set<string>>();
  for (const product of products) {
    const url = new URL(product.url);
    const keys = byHost.get(url.hostname) ?? new Set<string>();
    for (const key of url.searchParams.keys()) keys.add(key);
    byHost.set(url.hostname, keys);
  }
  return validateApprovedTrackingHosts([...byHost].map(([host, keys]) => ({
    host, approvalReference: 'impact-api-preview', allowedQueryKeys: [...keys]
  })));
}

export async function generateImpactManifest(
  directProducts: readonly DiscoveryProduct[],
  programId: string,
  sid: string,
  request: ImpactRequest
): Promise<{ manifest: PublishManifest; approvalPreview: ApprovedTrackingHost[] }> {
  const products = validateDirectImport(directProducts);
  const program = await request(impactProgramUrl(sid, programId), 'GET');
  verifyUltaProgram(program, programId);
  const linked: DiscoveryProduct[] = [];
  const expectedDestinations: Record<string, string> = {};
  for (const product of products) {
    const result = record(await request(linkUrl(sid, programId, product.url), 'POST'));
    if (typeof result.TrackingURL !== 'string') {
      throw new Error('Impact did not return a generated tracking URL');
    }
    linked.push({ ...product, url: result.TrackingURL, isCommissioned: true });
    expectedDestinations[product.id] = product.url;
  }
  const approvalPreview = previewApprovals(linked);
  const manifest = validatePublishManifest({ products: linked, expectedDestinations }, approvalPreview);
  return { manifest, approvalPreview };
}

/** The local manifest contains partner links, never API credentials. */
export async function writePrivateImpactManifest(path: string, manifest: PublishManifest): Promise<void> {
  await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`, {
    encoding: 'utf8', flag: 'wx', mode: 0o600
  });
}
