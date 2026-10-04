import type * as admin from 'firebase-admin';

export const PRODUCT_DISCOVERY_DOCUMENT = 'curatedProductDiscovery/us';
export const APPROVED_TRACKING_HOSTS_DOCUMENT = 'curatedProductDiscovery/approvedTrackingHosts';

export type DiscoveryCategory = 'Cleanser' | 'Moisturizer' | 'Sunscreen';

export interface DiscoveryProduct {
  id: string;
  brand: string;
  name: string;
  category: DiscoveryCategory;
  merchant: 'Ulta Beauty';
  url: string;
  isCommissioned: boolean;
}

export interface ApprovedTrackingHost {
  host: string;
  approvalReference: string;
  allowedQueryKeys: string[];
}

const PRODUCT_FIELDS = ['id', 'brand', 'name', 'category', 'merchant', 'url', 'isCommissioned'];
const CATEGORIES = new Set<DiscoveryCategory>(['Cleanser', 'Moisturizer', 'Sunscreen']);
const PERSONAL_QUERY_KEY = /^(?:uid|user_?id|(?:partner_?)?(?:customer|cust)_?id|pcid|email|phone|ip(?:_?address)?|device_?id|advertising_?id|idfa|gaid|session_?id|skin|photo|scan)$/i;

function isDirectUltaProductUrl(url: URL): boolean {
  return url.hostname === 'www.ulta.com' &&
    !url.search && !url.hash && /^\/p\/[A-Za-z0-9-]+$/.test(url.pathname);
}

/** A separate admin approval is required before any partner redirect is used. */
export function validateApprovedTrackingHosts(value: unknown): ApprovedTrackingHost[] {
  if (!Array.isArray(value) || value.length > 12) throw new Error('Invalid tracking host list');
  const seen = new Set<string>();
  return value.map(candidate => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      throw new Error('Invalid tracking host approval');
    }
    const approval = candidate as Record<string, unknown>;
    if (Object.keys(approval).length !== 3 ||
        !Object.hasOwn(approval, 'host') || !Object.hasOwn(approval, 'approvalReference') ||
        !Object.hasOwn(approval, 'allowedQueryKeys') ||
        typeof approval.host !== 'string' ||
        !/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(approval.host) ||
        approval.host === 'www.ulta.com' || approval.host === 'ulta.com' ||
        approval.host.endsWith('.ulta.com') ||
        approval.host.endsWith('.local') || approval.host.endsWith('.internal') ||
        approval.host.endsWith('.test') || approval.host.endsWith('.invalid') ||
        seen.has(approval.host) ||
        typeof approval.approvalReference !== 'string' ||
        !/^[A-Za-z0-9][A-Za-z0-9._:-]{3,99}$/.test(approval.approvalReference) ||
        !Array.isArray(approval.allowedQueryKeys) || approval.allowedQueryKeys.length > 20 ||
        approval.allowedQueryKeys.some(key => typeof key !== 'string' ||
          !/^[A-Za-z][A-Za-z0-9_-]{0,39}$/.test(key) || PERSONAL_QUERY_KEY.test(key))) {
      throw new Error('Invalid tracking host approval');
    }
    seen.add(approval.host);
    return {
      host: approval.host,
      approvalReference: approval.approvalReference,
      allowedQueryKeys: [...new Set(approval.allowedQueryKeys)]
    };
  });
}

/** Validate each explicit URL; never synthesize URLs or append user data. */
export function validateDiscoveryProducts(
  value: unknown,
  approvedTrackingHosts: readonly ApprovedTrackingHost[] = []
): DiscoveryProduct[] {
  if (!Array.isArray(value) || value.length > 12) throw new Error('Invalid curated product list');
  const ids = new Set<string>();
  return value.map((candidate: unknown) => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      throw new Error('Invalid curated product');
    }
    const record = candidate as Record<string, unknown>;
    if (Object.keys(record).length !== PRODUCT_FIELDS.length ||
        Object.keys(record).some(key => !PRODUCT_FIELDS.includes(key))) {
      throw new Error('Unexpected curated product field');
    }
    if (typeof record.id !== 'string' || !/^[a-z0-9][a-z0-9-]{2,63}$/.test(record.id) ||
        ids.has(record.id)) {
      throw new Error('Invalid or duplicate curated product ID');
    }
    ids.add(record.id);
    if (typeof record.brand !== 'string' || record.brand.trim() !== record.brand ||
        record.brand.length < 2 || record.brand.length > 60 ||
        typeof record.name !== 'string' || record.name.trim() !== record.name ||
        record.name.length < 4 || record.name.length > 120 ||
        !CATEGORIES.has(record.category as DiscoveryCategory) ||
        record.merchant !== 'Ulta Beauty') {
      throw new Error('Invalid curated product description');
    }
    if (typeof record.isCommissioned !== 'boolean') {
      throw new Error('Invalid commission disclosure flag');
    }
    if (typeof record.url !== 'string' || record.url.length > 700) {
      throw new Error('Invalid curated product URL');
    }
    let url: URL;
    try {
      url = new URL(record.url);
    } catch {
      throw new Error('Invalid curated product URL');
    }
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash) {
      throw new Error('Unapproved curated product URL');
    }
    if (record.isCommissioned) {
      const approval = approvedTrackingHosts.find(item => item.host === url.hostname);
      let decodedUrl = record.url;
      try {
        // Impact can double-encode dynamic placeholders (for example,
        // %257B%257BMemberID%257D%257D). Never ship a variable URL.
        for (let pass = 0; pass < 4; pass += 1) {
          const next = decodeURIComponent(decodedUrl);
          if (next === decodedUrl) break;
          decodedUrl = next;
        }
      } catch {
        throw new Error('Invalid partner tracking URL encoding');
      }
      if (!approval || url.pathname === '/' || /[{}<>\[\]]/.test(decodedUrl) ||
          [...url.searchParams.keys()].some(key =>
            !approval.allowedQueryKeys.includes(key) || PERSONAL_QUERY_KEY.test(key))) {
        throw new Error('Unapproved partner tracking URL');
      }
      for (const key of ['u', 'url', 'redirect', 'destination']) {
        const destination = url.searchParams.get(key);
        if (destination !== null) {
          try {
            const target = new URL(destination);
            if (target.protocol !== 'https:' || target.username || target.password ||
                target.port || !isDirectUltaProductUrl(target)) {
              throw new Error('Unapproved partner destination');
            }
          } catch {
            throw new Error('Unapproved partner destination');
          }
        }
      }
    } else if (!isDirectUltaProductUrl(url)) {
      throw new Error('Unapproved direct merchant URL');
    }
    return {
      id: record.id,
      brand: record.brand,
      name: record.name,
      category: record.category as DiscoveryCategory,
      merchant: 'Ulta Beauty',
      url: url.toString(),
      isCommissioned: record.isCommissioned
    };
  });
}

// Retailer pages were opened and checked on 2026-10-03. These are direct
// product URLs, not paid placements or claims of suitability for an individual.
export const DEFAULT_US_DISCOVERY_PRODUCTS: DiscoveryProduct[] = validateDiscoveryProducts([
  {
    id: 'vanicream-gentle-cleanser', brand: 'Vanicream',
    name: 'Gentle Facial Cleanser for Sensitive Skin', category: 'Cleanser',
    merchant: 'Ulta Beauty',
    url: 'https://www.ulta.com/p/gentle-facial-cleanser-sensitive-skin-pimprod2042401',
    isCommissioned: false
  },
  {
    id: 'cerave-hydrating-cleanser', brand: 'CeraVe',
    name: 'Hydrating Facial Cleanser', category: 'Cleanser',
    merchant: 'Ulta Beauty',
    url: 'https://www.ulta.com/p/hydrating-facial-cleanser-xlsImpprod4190255',
    isCommissioned: false
  },
  {
    id: 'vanicream-daily-moisturizer', brand: 'Vanicream',
    name: 'Daily Facial Moisturizer with Hyaluronic Acid and Ceramides', category: 'Moisturizer',
    merchant: 'Ulta Beauty',
    url: 'https://www.ulta.com/p/daily-facial-moisturizer-with-hyaluronic-acid-ceramides-pimprod2042403',
    isCommissioned: false
  },
  {
    id: 'laroche-anthelios-fluid-spf60', brand: 'La Roche-Posay',
    name: 'Anthelios Ultra Light Fluid Face Sunscreen SPF 60', category: 'Sunscreen',
    merchant: 'Ulta Beauty',
    url: 'https://www.ulta.com/p/anthelios-ultra-light-fluid-face-sunscreen-spf-60-xlsImpprod3840055',
    isCommissioned: false
  },
  {
    id: 'vanicream-mineral-spf30', brand: 'Vanicream',
    name: 'Facial Moisturizer Broad Spectrum Mineral SPF 30', category: 'Sunscreen',
    merchant: 'Ulta Beauty',
    url: 'https://www.ulta.com/p/facial-moisturizer-broad-spectrum-mineral-spf-30-pimprod2042402',
    isCommissioned: false
  }
]);

/** Admin SDK writes the optional override; clients cannot write this path. */
export class ProductDiscoveryCatalog {
  constructor(private readonly db: admin.firestore.Firestore) {}

  async list(): Promise<{ products: DiscoveryProduct[]; approvedTrackingHosts: string[] }> {
    try {
      const snapshot = await this.db.doc(PRODUCT_DISCOVERY_DOCUMENT).get();
      if (!snapshot.exists) return { products: [...DEFAULT_US_DISCOVERY_PRODUCTS], approvedTrackingHosts: [] };
      const config = snapshot.data();
      if (!config || config.version !== 1) throw new Error('Invalid catalog version');
      let approvals: ApprovedTrackingHost[] = [];
      if (Array.isArray(config.products) &&
          config.products.some((item: unknown) => typeof item === 'object' && item !== null &&
            (item as Record<string, unknown>).isCommissioned === true)) {
        const hosts = await this.db.doc(APPROVED_TRACKING_HOSTS_DOCUMENT).get();
        const data = hosts.data();
        if (!hosts.exists || !data || data.version !== 1) {
          throw new Error('Missing tracking host approvals');
        }
        approvals = validateApprovedTrackingHosts(data.hosts);
      }
      const products = validateDiscoveryProducts(config.products, approvals);
      const approvedTrackingHosts = [...new Set(products
        .filter(product => product.isCommissioned)
        .map(product => new URL(product.url).hostname))];
      return { products, approvedTrackingHosts };
    } catch (error) {
      console.warn('[ProductDiscovery] Curated override unavailable; using vetted defaults.', {
        errorName: error instanceof Error ? error.name : 'UnknownError'
      });
      return { products: [...DEFAULT_US_DISCOVERY_PRODUCTS], approvedTrackingHosts: [] };
    }
  }
}
