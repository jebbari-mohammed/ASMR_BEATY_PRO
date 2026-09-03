/**
 * Product Graph & Affiliate Offer domain models.
 * Products are vendor-independent entities; retail offers are separate entities.
 */
export type ProductCategory = 'cleanser' | 'toner' | 'essence' | 'serum' | 'ampoule' | 'moisturizer' | 'sunscreen' | 'treatment' | 'oil' | 'mask' | 'eye_cream';
export type RoutineStepCategory = 'cleanse' | 'tone' | 'treat' | 'hydrate_moisturize' | 'protect_spf';
export type ActiveCategory = 'retinoid' | 'aha' | 'bha' | 'pha' | 'vitamin_c_l_ascorbic' | 'vitamin_c_derivative' | 'niacinamide' | 'benzoyl_peroxide' | 'azelaic_acid' | 'centella_cica' | 'ceramides' | 'hyaluronic_acid' | 'snail_mucin' | 'peptides' | 'panthenol';
export type FragranceStatus = 'fragrance_free' | 'contains_fragrance' | 'unknown';
export type AmPmCompatibility = 'AM_ONLY' | 'PM_ONLY' | 'AM_AND_PM';
export interface Product {
    productId: string;
    brand: string;
    name: string;
    category: ProductCategory;
    routineStep: RoutineStepCategory;
    variant?: string;
    size?: string;
    barcode?: string;
    inciIngredients: string[];
    keyIngredients: string[];
    activeCategories: ActiveCategory[];
    fragranceStatus: FragranceStatus;
    productDirections: string;
    manufacturerWarnings?: string;
    amPmCompatibility: AmPmCompatibility;
    safetyReviewStatus: 'approved' | 'pending' | 'rejected';
    catalogStatus: 'active' | 'disabled';
    ingredientSource: 'manufacturer' | 'licensed_catalog' | 'user_submitted_unverified';
    ingredientSourceConfidence: number;
    countryAvailability: string[];
    averagePriceUsd?: number;
    imageUrl?: string;
    createdAt: string;
    lastVerifiedAt: string;
}
export type MerchantName = 'iherb' | 'yesstyle' | 'sephora' | 'ulta' | 'amazon' | 'brand_direct' | 'other';
export interface ProductOffer {
    offerId: string;
    productId: string;
    merchant: MerchantName;
    merchantDisplayName: string;
    region: string;
    price: number;
    currency: string;
    inStock: boolean;
    shippingAvailability: string[];
    affiliateUrl: string;
    affiliateProvider: 'sovrn' | 'impact' | 'partnerize' | 'direct' | 'awin';
    commissionRatePercent: number;
    lastVerifiedAt: string;
    deepLinkUrl?: string;
}
export interface ProductWithOffers {
    product: Product;
    offers: ProductOffer[];
    bestRetailOffer?: ProductOffer;
}
//# sourceMappingURL=product.d.ts.map