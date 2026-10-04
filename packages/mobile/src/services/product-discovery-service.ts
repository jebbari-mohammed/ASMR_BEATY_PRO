import auth from '@react-native-firebase/auth';
import functions from '@react-native-firebase/functions';

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

const categories: DiscoveryCategory[] = ['Cleanser', 'Moisturizer', 'Sunscreen'];

function isDiscoveryProduct(value: unknown, approvedTrackingHosts: readonly string[]): value is DiscoveryProduct {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  if (typeof item.id !== 'string' || !/^[a-z0-9-]{3,80}$/.test(item.id) ||
      typeof item.brand !== 'string' || !item.brand.trim() || item.brand.length > 80 ||
      typeof item.name !== 'string' || !item.name.trim() || item.name.length > 120 ||
      !categories.includes(item.category as DiscoveryCategory) ||
      item.merchant !== 'Ulta Beauty' || typeof item.isCommissioned !== 'boolean' ||
      typeof item.url !== 'string' || item.url.length > 700) return false;
  try {
    const url = new URL(item.url);
    if (url.protocol !== 'https:' || url.hash || url.username || url.password || url.port) return false;
    return item.isCommissioned
      ? approvedTrackingHosts.includes(url.hostname) && url.pathname !== '/' &&
          !item.url.includes('{') && !item.url.includes('}')
      : url.hostname === 'www.ulta.com' && !url.search && /^\/p\/[A-Za-z0-9-]+$/.test(url.pathname);
  } catch { return false; }
}

export function parseProductDiscovery(data: unknown): DiscoveryProduct[] {
  if (!data || typeof data !== 'object' || !('products' in data) || !('approvedTrackingHosts' in data)) {
    throw new Error('Product links are unavailable.');
  }
  const response = data as { products: unknown; approvedTrackingHosts: unknown };
  const { products, approvedTrackingHosts } = response;
  if (!Array.isArray(approvedTrackingHosts) || approvedTrackingHosts.length > 12 ||
      approvedTrackingHosts.some(host => typeof host !== 'string' ||
        !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(host) ||
        !/^[a-z]{2,}$/.test(host.split('.').at(-1) ?? '') ||
        host === 'www.ulta.com' || host.endsWith('.ulta.com')) ||
      new Set(approvedTrackingHosts).size !== approvedTrackingHosts.length ||
      !Array.isArray(products) || products.length > 20 ||
      !products.every(product => isDiscoveryProduct(product, approvedTrackingHosts))) {
    throw new Error('Product links are unavailable.');
  }
  const ids = new Set(products.map(product => product.id));
  if (ids.size !== products.length) throw new Error('Product links are unavailable.');
  return products;
}

export class ProductDiscoveryService {
  static async list(expectedUid: string): Promise<DiscoveryProduct[]> {
    if (!expectedUid || auth().currentUser?.uid !== expectedUid) throw new Error('Account changed while loading product links.');
    const result = await functions().httpsCallable('getProductDiscovery')({});
    if (auth().currentUser?.uid !== expectedUid) throw new Error('Account changed while loading product links.');
    return parseProductDiscovery(result.data);
  }
}
