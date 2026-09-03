import { z } from 'zod';

export const ProductCategorySchema = z.enum([
  'cleanser',
  'toner',
  'essence',
  'serum',
  'ampoule',
  'moisturizer',
  'sunscreen',
  'treatment',
  'oil',
  'mask',
  'eye_cream'
]);

export const RoutineStepCategorySchema = z.enum([
  'cleanse',
  'tone',
  'treat',
  'hydrate_moisturize',
  'protect_spf'
]);

export const ActiveCategorySchema = z.enum([
  'retinoid',
  'aha',
  'bha',
  'pha',
  'vitamin_c_l_ascorbic',
  'vitamin_c_derivative',
  'niacinamide',
  'benzoyl_peroxide',
  'azelaic_acid',
  'centella_cica',
  'ceramides',
  'hyaluronic_acid',
  'snail_mucin',
  'peptides',
  'panthenol'
]);

export const FragranceStatusSchema = z.enum(['fragrance_free', 'contains_fragrance', 'unknown']);

export const AmPmCompatibilitySchema = z.enum(['AM_ONLY', 'PM_ONLY', 'AM_AND_PM']);

export const ProductSchema = z.object({
  productId: z.string().min(1),
  brand: z.string().min(1),
  name: z.string().min(1),
  category: ProductCategorySchema,
  routineStep: RoutineStepCategorySchema,
  variant: z.string().optional(),
  size: z.string().optional(),
  barcode: z.string().optional(),
  inciIngredients: z.array(z.string().min(1)).min(1),
  keyIngredients: z.array(z.string().min(1)),
  activeCategories: z.array(ActiveCategorySchema),
  fragranceStatus: FragranceStatusSchema,
  productDirections: z.string().min(1),
  manufacturerWarnings: z.string().optional(),
  amPmCompatibility: AmPmCompatibilitySchema,
  safetyReviewStatus: z.enum(['approved', 'pending', 'rejected']),
  catalogStatus: z.enum(['active', 'disabled']),
  ingredientSource: z.enum(['manufacturer', 'licensed_catalog', 'user_submitted_unverified']),
  ingredientSourceConfidence: z.number().min(0).max(1),
  countryAvailability: z.array(z.string().length(2)),
  averagePriceUsd: z.number().nonnegative().optional(),
  imageUrl: z.string().url().optional(),
  createdAt: z.string().datetime(),
  lastVerifiedAt: z.string().datetime()
});

export const MerchantNameSchema = z.enum([
  'iherb',
  'yesstyle',
  'sephora',
  'ulta',
  'amazon',
  'brand_direct',
  'other'
]);

export const ProductOfferSchema = z.object({
  offerId: z.string().min(1),
  productId: z.string().min(1),
  merchant: MerchantNameSchema,
  merchantDisplayName: z.string().min(1),
  region: z.string().length(2),
  price: z.number().positive(),
  currency: z.string().min(3).max(3),
  inStock: z.boolean(),
  shippingAvailability: z.array(z.string()),
  affiliateUrl: z.string().url(),
  affiliateProvider: z.enum(['sovrn', 'impact', 'partnerize', 'direct', 'awin']),
  commissionRatePercent: z.number().min(0).max(100),
  lastVerifiedAt: z.string().datetime(),
  deepLinkUrl: z.string().url().optional()
});
