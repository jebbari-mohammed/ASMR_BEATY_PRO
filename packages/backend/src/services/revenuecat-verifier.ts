import { UserSubscriptionEntitlement } from './scan-state-machine.js';

interface RevenueCatPurchase {
  expires_date?: string | null;
  grace_period_expires_date?: string | null;
  purchase_date?: string;
  refunded_at?: string | null;
}

interface RevenueCatEntitlement extends RevenueCatPurchase {
  product_identifier?: string;
}

interface RevenueCatCustomer {
  subscriber?: {
    entitlements?: Record<string, RevenueCatEntitlement>;
    subscriptions?: Record<string, RevenueCatPurchase>;
  };
}

export interface VerifiedEntitlement extends UserSubscriptionEntitlement {
  expiresAtMs: number | null;
}

// These are the App Store and Play subscription identifiers in the current
// offering. A Test Store lifetime package also exists, but is not sold by the
// app and must not become a non-expiring production entitlement.
const SUBSCRIPTION_TIERS = new Map<string, 'PRO_ANNUAL' | 'PRO_MONTHLY'>([
  ['skincoach_3999_1y', 'PRO_ANNUAL'],
  ['skincoach_3999_1y:annual', 'PRO_ANNUAL'],
  ['skincoach_699_1m', 'PRO_MONTHLY'],
  ['skincoach_699_1m:monthly', 'PRO_MONTHLY']
]);

const noAccess = (): VerifiedEntitlement => ({
  isPro: false,
  status: 'expired',
  tier: 'FREE',
  expiresAtMs: null
});

function subscriptionAccess(
  productId: string,
  purchase: RevenueCatPurchase,
  nowMs: number
): VerifiedEntitlement | null {
  const tier = SUBSCRIPTION_TIERS.get(productId);
  if (!tier || typeof purchase.purchase_date !== 'string' ||
      typeof purchase.expires_date !== 'string' || purchase.refunded_at) {
    return null;
  }
  const expiresAtMs = Date.parse(purchase.expires_date);
  const graceAtMs = purchase.grace_period_expires_date == null
    ? null
    : typeof purchase.grace_period_expires_date === 'string'
      ? Date.parse(purchase.grace_period_expires_date)
      : NaN;
  if (!Number.isFinite(expiresAtMs) || (graceAtMs !== null && !Number.isFinite(graceAtMs))) {
    return null;
  }
  const isActive = expiresAtMs > nowMs;
  const inGrace = !isActive && graceAtMs !== null && graceAtMs > nowMs;
  return {
    isPro: isActive || inGrace,
    status: isActive ? 'active' : inGrace ? 'grace_period' : 'expired',
    tier: isActive || inGrace ? tier : 'FREE',
    expiresAtMs: inGrace ? graceAtMs : expiresAtMs
  };
}

/** The RevenueCat server API is the authority for access to paid backend work. */
export class RevenueCatVerifier {
  constructor(
    private readonly secretApiKey: string | undefined,
    private readonly request: typeof fetch = fetch,
    private readonly now: () => number = Date.now
  ) {}

  async verify(userId: string): Promise<VerifiedEntitlement> {
    if (!this.secretApiKey) {
      throw new Error('REVENUECAT_SECRET_API_KEY is not configured');
    }
    if (!userId || userId.length > 128 || userId.includes('/')) {
      throw new Error('Invalid authenticated user ID');
    }

    const response = await this.request(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
      {
        headers: { Authorization: `Bearer ${this.secretApiKey}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(8000)
      }
    );
    if (!response.ok) {
      throw new Error(`RevenueCat verification unavailable (${response.status})`);
    }

    const body = (await response.json()) as RevenueCatCustomer;
    const entitlement = body.subscriber?.entitlements?.asmr_beaty_pro_pro;
    if (!entitlement || typeof entitlement.purchase_date !== 'string' ||
        typeof entitlement.product_identifier !== 'string') {
      return noAccess();
    }

    const nowMs = this.now();
    const candidates: VerifiedEntitlement[] = [];
    const subscriptions = body.subscriber?.subscriptions ?? {};
    // If V1 includes the underlying purchase, use its fuller record (including
    // refunded_at) instead of a potentially stale entitlement projection.
    const projected = Object.prototype.hasOwnProperty.call(subscriptions, entitlement.product_identifier)
      ? null
      : subscriptionAccess(entitlement.product_identifier, entitlement, nowMs);
    if (projected) candidates.push(projected);

    // RevenueCat V1 projects a single product into the entitlement. A Test
    // Store lifetime product can occupy that slot while an approved annual or
    // monthly subscription is also active. The approved SKUs are known to be
    // attached to this Pro entitlement; require the entitlement to exist, then
    // evaluate each matching subscription's own expiration and grace period.
    for (const [productId, purchase] of Object.entries(subscriptions)) {
      const candidate = subscriptionAccess(productId, purchase, nowMs);
      if (candidate) candidates.push(candidate);
    }

    const valid = candidates.filter(candidate => candidate.isPro);
    if (valid.length === 0) return noAccess();
    const active = valid.filter(candidate => candidate.status === 'active');
    const ranked = active.length > 0 ? active : valid;
    return ranked.reduce((best, candidate) =>
      (candidate.expiresAtMs ?? 0) > (best.expiresAtMs ?? 0) ? candidate : best
    );
  }
}
