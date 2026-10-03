import { UserSubscriptionEntitlement } from './scan-state-machine.js';

interface RevenueCatEntitlement {
  expires_date?: string | null;
  grace_period_expires_date?: string | null;
  product_identifier?: string;
  purchase_date?: string;
}

interface RevenueCatCustomer {
  subscriber?: {
    entitlements?: Record<string, RevenueCatEntitlement>;
  };
}

export interface VerifiedEntitlement extends UserSubscriptionEntitlement {
  expiresAtMs: number | null;
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
    if (!entitlement || !entitlement.purchase_date || !entitlement.product_identifier) {
      return { isPro: false, status: 'expired', tier: 'FREE', expiresAtMs: null };
    }

    const expiresAtMs = entitlement.expires_date ? Date.parse(entitlement.expires_date) : null;
    const graceAtMs = entitlement.grace_period_expires_date
      ? Date.parse(entitlement.grace_period_expires_date)
      : null;
    if (expiresAtMs !== null && !Number.isFinite(expiresAtMs)) {
      throw new Error('RevenueCat returned an invalid entitlement expiration');
    }
    if (graceAtMs !== null && !Number.isFinite(graceAtMs)) {
      throw new Error('RevenueCat returned an invalid grace period expiration');
    }

    const currentTime = this.now();
    const isActive = expiresAtMs === null || expiresAtMs > currentTime;
    const inGrace = !isActive && graceAtMs !== null && graceAtMs > currentTime;
    const status = isActive ? 'active' : inGrace ? 'grace_period' : 'expired';
    const product = entitlement.product_identifier.toLowerCase();
    return {
      isPro: isActive || inGrace,
      status,
      tier: isActive || inGrace ? (product.includes('annual') || product.includes('1y') ? 'PRO_ANNUAL' : 'PRO_MONTHLY') : 'FREE',
      expiresAtMs: inGrace ? graceAtMs : expiresAtMs
    };
  }
}
