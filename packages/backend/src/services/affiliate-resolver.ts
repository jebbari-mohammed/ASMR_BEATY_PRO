import * as admin from 'firebase-admin';
import { ProductOffer } from '@asmr/shared';

/**
 * Merchant Domain Allowlist.
 * STRICT SECURITY: Prevents open redirect attacks, phishing, and untrusted links.
 */
export const TRUSTED_MERCHANT_DOMAINS: Record<string, string[]> = {
  iherb: ['iherb.com', 'www.iherb.com'],
  yesstyle: ['yesstyle.com', 'www.yesstyle.com'],
  sephora: ['sephora.com', 'www.sephora.com'],
  ulta: ['ulta.com', 'www.ulta.com'],
  amazon: ['amazon.com', 'www.amazon.com', 'amzn.to'],
  brand_direct: ['aurabotanicals.com', 'korbarrier.com']
};

export const AFFILIATE_DISCLOSURE_TEXT =
  'We may earn a commission if you purchase through our links. Commission does not affect compatibility ranking.';

export class AffiliateResolverService {
  private db: admin.firestore.Firestore;

  constructor(db: admin.firestore.Firestore) {
    this.db = db;
  }

  /**
   * Resolves an internal offerId to a validated, trusted merchant redirect destination.
   * Enforces domain allowlist and appends privacy-safe partner attribution parameters.
   */
  async resolveOfferUrl(
    offerId: string,
    userId: string
  ): Promise<{ resolvedUrl: string; merchantDisplayName: string; disclosure: string; isAffiliateMonetized: boolean }> {
    // 1. Fetch verified offer from Firestore
    const offerDoc = await this.db.collectionGroup('offers').where('offerId', '==', offerId).limit(1).get();

    let offer: ProductOffer | null = null;
    if (!offerDoc.empty) {
      offer = offerDoc.docs[0].data() as ProductOffer;
    } else {
      // Direct catalog lookup
      const directDoc = await this.db.doc(`offers/${offerId}`).get();
      if (directDoc.exists) {
        offer = directDoc.data() as ProductOffer;
      }
    }

    if (!offer) {
      // Fallback to curated default offers if database not yet populated
      offer = this.getCuratedFallbackOffer(offerId);
    }

    if (!offer) {
      throw new Error(`OFFER_NOT_FOUND: Offer ${offerId} does not exist in catalog.`);
    }

    // 2. Validate destination URL against merchant allowlist
    const parsedUrl = new URL(offer.affiliateUrl);
    const hostname = parsedUrl.hostname.toLowerCase();
    const allowedHostnames = TRUSTED_MERCHANT_DOMAINS[offer.merchant] || [];

    const isDomainAllowed = allowedHostnames.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );

    if (!isDomainAllowed) {
      throw new Error(
        `UNTRUSTED_MERCHANT_DOMAIN: Hostname ${hostname} is not on the approved merchant allowlist.`
      );
    }

    // 3. Attribution logic: only append affiliate parameters if real partner program is configured
    const affiliateIdEnvVar = `${offer.merchant.toUpperCase()}_AFFILIATE_ID`;
    const configuredAffiliateId = process.env[affiliateIdEnvVar];
    const isAffiliateMonetized = Boolean(configuredAffiliateId && configuredAffiliateId.trim().length > 0);

    if (isAffiliateMonetized) {
      parsedUrl.searchParams.set('rcode', configuredAffiliateId!);
      parsedUrl.searchParams.set('subid', `asmr_${userId.substring(0, 10)}`);
    }

    // Direct clean navigation parameters (no fake tracking IDs)
    parsedUrl.searchParams.set('utm_source', 'asmr_skin_coach');
    parsedUrl.searchParams.set('utm_medium', 'app_recommendation');

    return {
      resolvedUrl: parsedUrl.toString(),
      merchantDisplayName: offer.merchantDisplayName,
      disclosure: AFFILIATE_DISCLOSURE_TEXT,
      isAffiliateMonetized
    };
  }

  private getCuratedFallbackOffer(offerId: string): ProductOffer | null {
    const fallbackCatalog: Record<string, ProductOffer> = {
      'offer_iherb_honey_serum': {
        offerId: 'offer_iherb_honey_serum',
        productId: 'prod_aura_honey_serum',
        merchant: 'iherb',
        merchantDisplayName: 'iHerb',
        region: 'US',
        price: 18.0,
        currency: 'USD',
        inStock: true,
        shippingAvailability: ['US', 'CA', 'GB', 'AU', 'EU'],
        affiliateUrl: 'https://www.iherb.com/pr/aura-botanicals-honey-calming-serum/98124',
        affiliateProvider: 'impact',
        commissionRatePercent: 8.0,
        lastVerifiedAt: new Date().toISOString()
      },
      'offer_iherb_barrier_cream': {
        offerId: 'offer_iherb_barrier_cream',
        productId: 'prod_kor_barrier_cream',
        merchant: 'iherb',
        merchantDisplayName: 'iHerb',
        region: 'US',
        price: 22.0,
        currency: 'USD',
        inStock: true,
        shippingAvailability: ['US', 'CA', 'GB', 'AU', 'EU'],
        affiliateUrl: 'https://www.iherb.com/pr/kor-barrier-recovery-cream/98125',
        affiliateProvider: 'impact',
        commissionRatePercent: 8.0,
        lastVerifiedAt: new Date().toISOString()
      },
      'offer_yesstyle_centella_serum': {
        offerId: 'offer_yesstyle_centella_serum',
        productId: 'prod_skin1004_centella_ampoule',
        merchant: 'yesstyle',
        merchantDisplayName: 'YesStyle',
        region: 'US',
        price: 15.5,
        currency: 'USD',
        inStock: true,
        shippingAvailability: ['US', 'CA', 'GB', 'AU', 'EU'],
        affiliateUrl: 'https://www.yesstyle.com/en/skin1004-madagascar-centella-ampoule/info.html/pid.1077123',
        affiliateProvider: 'direct',
        commissionRatePercent: 10.0,
        lastVerifiedAt: new Date().toISOString()
      }
    };

    return fallbackCatalog[offerId] || null;
  }
}
