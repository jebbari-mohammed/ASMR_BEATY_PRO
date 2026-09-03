"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductOfferSchema = exports.MerchantNameSchema = exports.ProductSchema = exports.AmPmCompatibilitySchema = exports.FragranceStatusSchema = exports.ActiveCategorySchema = exports.RoutineStepCategorySchema = exports.ProductCategorySchema = void 0;
const zod_1 = require("zod");
exports.ProductCategorySchema = zod_1.z.enum([
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
exports.RoutineStepCategorySchema = zod_1.z.enum([
    'cleanse',
    'tone',
    'treat',
    'hydrate_moisturize',
    'protect_spf'
]);
exports.ActiveCategorySchema = zod_1.z.enum([
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
exports.FragranceStatusSchema = zod_1.z.enum(['fragrance_free', 'contains_fragrance', 'unknown']);
exports.AmPmCompatibilitySchema = zod_1.z.enum(['AM_ONLY', 'PM_ONLY', 'AM_AND_PM']);
exports.ProductSchema = zod_1.z.object({
    productId: zod_1.z.string().min(1),
    brand: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    category: exports.ProductCategorySchema,
    routineStep: exports.RoutineStepCategorySchema,
    variant: zod_1.z.string().optional(),
    size: zod_1.z.string().optional(),
    barcode: zod_1.z.string().optional(),
    inciIngredients: zod_1.z.array(zod_1.z.string().min(1)).min(1),
    keyIngredients: zod_1.z.array(zod_1.z.string().min(1)),
    activeCategories: zod_1.z.array(exports.ActiveCategorySchema),
    fragranceStatus: exports.FragranceStatusSchema,
    productDirections: zod_1.z.string().min(1),
    manufacturerWarnings: zod_1.z.string().optional(),
    amPmCompatibility: exports.AmPmCompatibilitySchema,
    safetyReviewStatus: zod_1.z.enum(['approved', 'pending', 'rejected']),
    catalogStatus: zod_1.z.enum(['active', 'disabled']),
    ingredientSource: zod_1.z.enum(['manufacturer', 'licensed_catalog', 'user_submitted_unverified']),
    ingredientSourceConfidence: zod_1.z.number().min(0).max(1),
    countryAvailability: zod_1.z.array(zod_1.z.string().length(2)),
    averagePriceUsd: zod_1.z.number().nonnegative().optional(),
    imageUrl: zod_1.z.string().url().optional(),
    createdAt: zod_1.z.string().datetime(),
    lastVerifiedAt: zod_1.z.string().datetime()
});
exports.MerchantNameSchema = zod_1.z.enum([
    'iherb',
    'yesstyle',
    'sephora',
    'ulta',
    'amazon',
    'brand_direct',
    'other'
]);
exports.ProductOfferSchema = zod_1.z.object({
    offerId: zod_1.z.string().min(1),
    productId: zod_1.z.string().min(1),
    merchant: exports.MerchantNameSchema,
    merchantDisplayName: zod_1.z.string().min(1),
    region: zod_1.z.string().length(2),
    price: zod_1.z.number().positive(),
    currency: zod_1.z.string().min(3).max(3),
    inStock: zod_1.z.boolean(),
    shippingAvailability: zod_1.z.array(zod_1.z.string()),
    affiliateUrl: zod_1.z.string().url(),
    affiliateProvider: zod_1.z.enum(['sovrn', 'impact', 'partnerize', 'direct', 'awin']),
    commissionRatePercent: zod_1.z.number().min(0).max(100),
    lastVerifiedAt: zod_1.z.string().datetime(),
    deepLinkUrl: zod_1.z.string().url().optional()
});
