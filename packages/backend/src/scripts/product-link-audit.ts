import { lookup } from 'node:dns';
import { request as httpsRequest } from 'node:https';
import type { LookupAddress } from 'node:dns';
import {
  validateDiscoveryProducts,
  type ApprovedTrackingHost,
  type DiscoveryProduct
} from '../services/product-discovery.js';

export interface PublishManifest {
  products: DiscoveryProduct[];
  expectedDestinations: Record<string, string>;
}

type Probe = (url: URL) => Promise<{ status: number; location?: string }>;

function directProductUrl(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Expected Ulta product URL is missing');
  const candidate: DiscoveryProduct = {
    id: 'destination-check', brand: 'Destination', name: 'Destination product',
    category: 'Cleanser', merchant: 'Ulta Beauty', url: value, isCommissioned: false
  };
  return validateDiscoveryProducts([candidate])[0].url;
}

/** The destination is operator supplied, not inferred from a tracking query string. */
export function validatePublishManifest(
  value: unknown,
  approvals: readonly ApprovedTrackingHost[]
): PublishManifest {
  const envelope = Array.isArray(value) ? { products: value } : value;
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
    throw new Error('Invalid product import file');
  }
  const record = envelope as Record<string, unknown>;
  if (Object.keys(record).some(key => !['products', 'expectedDestinations'].includes(key))) {
    throw new Error('Unexpected product import field');
  }
  const products = validateDiscoveryProducts(record.products, approvals);
  const commissioned = products.filter(product => product.isCommissioned);
  const raw = record.expectedDestinations;
  if (raw === undefined && commissioned.length === 0) {
    return { products, expectedDestinations: {} };
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Commissioned products require expectedDestinations');
  }
  const destinations = raw as Record<string, unknown>;
  const expectedIds = new Set(commissioned.map(product => product.id));
  const suppliedIds = Object.keys(destinations);
  if (suppliedIds.length !== expectedIds.size ||
      suppliedIds.some(id => !expectedIds.has(id))) {
    throw new Error('Expected destinations must match commissioned product IDs exactly');
  }
  const expectedDestinations: Record<string, string> = {};
  for (const id of suppliedIds) expectedDestinations[id] = directProductUrl(destinations[id]);
  return { products, expectedDestinations };
}

export function isPublicIpv4Address(address: string): boolean {
  const p = address.split('.').map(Number);
  if (p.length !== 4 || p.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b, c] = p;
  return a !== 0 && a !== 10 && a !== 127 && a < 224 &&
    !(a === 100 && b >= 64 && b <= 127) &&
    !(a === 169 && b === 254) &&
    !(a === 172 && b >= 16 && b <= 31) &&
    !(a === 192 && (b === 0 || b === 168)) &&
    !(a === 198 && (b === 18 || b === 19)) &&
    !(a === 203 && b === 0 && c === 113) &&
    !(a === 198 && b === 51 && c === 100) &&
    !(a === 192 && b === 0 && c === 2);
}

/** Resolve once and connect to that address, so a DNS change cannot redirect the probe to a private IP. */
export function probeProductLink(url: URL): Promise<{ status: number; location?: string }> {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(url, {
      method: 'GET', timeout: 10_000, maxHeaderSize: 16_384,
      headers: { accept: 'text/html', 'user-agent': 'ASMRBeautyPro-LinkAudit/1.0' },
      lookup: (hostname, options, callback) => {
        lookup(hostname, { family: 4, all: true }, (error, addresses: LookupAddress[]) => {
          if (error) return callback(error, '', 4);
          if (!addresses.length || addresses.some(item => !isPublicIpv4Address(item.address))) {
            return callback(new Error('Link audit DNS did not resolve only to public IPv4 addresses'), '', 4);
          }
          if (typeof options === 'object' && options.all) {
            (callback as (error: null, addresses: LookupAddress[]) => void)(null, addresses);
          } else {
            callback(null, addresses[0].address, 4);
          }
        });
      }
    }, response => {
      const status = response.statusCode ?? 0;
      const location = response.headers.location;
      response.destroy();
      resolve({ status, location: Array.isArray(location) ? location[0] : location });
    });
    req.on('timeout', () => req.destroy(new Error('Link audit timed out')));
    req.on('error', reject);
    req.end();
  });
}

function safeHop(url: URL, allowedHosts: ReadonlySet<string>): boolean {
  return url.protocol === 'https:' && !url.username && !url.password &&
    !url.port && !url.hash && allowedHosts.has(url.hostname);
}

/** Fail closed on HTTP, unknown redirect hosts, loops, error pages, or a different product. */
export async function auditPartnerDestination(
  trackingUrl: string,
  expectedDestination: string,
  approvedHosts: readonly ApprovedTrackingHost[],
  probe: Probe = probeProductLink
): Promise<void> {
  const expected = new URL(directProductUrl(expectedDestination));
  const allowedHosts = new Set([...approvedHosts.map(item => item.host), 'ulta.com', 'www.ulta.com']);
  const seen = new Set<string>();
  let current = new URL(trackingUrl);
  for (let hop = 0; hop < 7; hop += 1) {
    if (!safeHop(current, allowedHosts) || seen.has(current.href)) {
      throw new Error('Partner link redirects to an unsafe or repeated URL');
    }
    seen.add(current.href);
    const response = await probe(current);
    if (response.status >= 300 && response.status < 400) {
      if (!response.location) throw new Error('Partner link redirects without a destination');
      current = new URL(response.location, current);
      continue;
    }
    if (response.status !== 200) {
      throw new Error(`Partner link returned HTTP ${response.status}`);
    }
    if (current.hostname !== expected.hostname || current.pathname !== expected.pathname) {
      throw new Error('Partner link does not reach the expected Ulta product');
    }
    return;
  }
  throw new Error('Partner link has too many redirects');
}

export async function auditPublishManifest(
  manifest: PublishManifest,
  approvals: readonly ApprovedTrackingHost[],
  probe: Probe = probeProductLink
): Promise<void> {
  for (const product of manifest.products.filter(item => item.isCommissioned)) {
    await auditPartnerDestination(
      product.url, manifest.expectedDestinations[product.id], approvals, probe
    );
  }
}
