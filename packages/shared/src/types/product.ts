/**
 * Product Graph & Affiliate Offer domain models.
 * Products are vendor-independent entities; retail offers are separate entities.
 */

export type ProductCategory =
  | 'cleanser'
  | 'toner'
  | 'essence'
  | 'serum'
  | 'ampoule'
  | 'moisturizer'
  | 'sunscreen'
  | 'treatment'
  | 'oil'
  | 'mask'
  | 'eye_cream';

export type RoutineStepCategory =
  | 'cleanse'
  | 'tone'
  | 'treat'
  | 'hydrate_moisturize'
  | 'protect_spf';

export type ActiveCategory =
  | 'retinoid' // Retinol, Retinal, Adapalene, Granactive
  | 'aha' // Glycolic, Lactic, Mandelic
  | 'bha' // Salicylic acid, Betaine Salicylate
  | 'pha' // Gluconolactone, Lactobionic
  | 'vitamin_c_l_ascorbic' // Direct ascorbic acid
  | 'vitamin_c_derivative' // Sodium ascorbyl phosphate, THD ascorbate
  | 'niacinamide'
  | 'benzoyl_peroxide'
  | 'azelaic_acid'
  | 'centella_cica'
  | 'ceramides'
  | 'hyaluronic_acid'
  | 'snail_mucin'
  | 'peptides'
  | 'panthenol';

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
  barcode?: string; // GTIN / EAN / UPC
  
  // Ingredients (Verified INCI list)
  inciIngredients: string[];
  keyIngredients: string[];
  activeCategories: ActiveCategory[];
  fragranceStatus: FragranceStatus;
  
  // Directions & Guidance
  productDirections: string;
  manufacturerWarnings?: string;
  amPmCompatibility: AmPmCompatibility;
  
  // Regulatory & Safety Review
  safetyReviewStatus: 'approved' | 'pending' | 'rejected';
  catalogStatus: 'active' | 'disabled';
  ingredientSource: 'manufacturer' | 'licensed_catalog' | 'user_submitted_unverified';
  ingredientSourceConfidence: number; // 0.0 to 1.0
  
  countryAvailability: string[]; // ISO 3166-1 alpha-2 codes: ['US', 'CA', 'GB', ...]
  averagePriceUsd?: number;
  imageUrl?: string;
  createdAt: string;
  lastVerifiedAt: string;
}

export type MerchantName =
  | 'iherb'
  | 'yesstyle'
  | 'sephora'
  | 'ulta'
  | 'amazon'
  | 'brand_direct'
  | 'other';

export interface ProductOffer {
  offerId: string;
  productId: string;
  merchant: MerchantName;
  merchantDisplayName: string;
  region: string; // ISO country code
  price: number;
  currency: string; // e.g. 'USD'
  inStock: boolean;
  shippingAvailability: string[];
  
  // Affiliate Metadata
  affiliateUrl: string;
  affiliateProvider: 'sovrn' | 'impact' | 'partnerize' | 'direct' | 'awin';
  commissionRatePercent: number; // For internal tie-breaking ONLY after safety/fit
  lastVerifiedAt: string;
  deepLinkUrl?: string;
}

export interface ProductWithOffers {
  product: Product;
  offers: ProductOffer[];
  bestRetailOffer?: ProductOffer;
}
