/**
 * Entitlements, usage quotas, and subscription state.
 * Server-controlled; clients cannot grant themselves Pro access.
 */

export type SubscriptionTier = 'FREE' | 'PRO_MONTHLY' | 'PRO_ANNUAL';

export type EntitlementStatus =
  | 'active'
  | 'grace_period'
  | 'billing_retry'
  | 'expired'
  | 'canceled';

export interface UserEntitlements {
  userId: string;
  tier: SubscriptionTier;
  isPro: boolean;
  status: EntitlementStatus;
  originalPurchaseDate?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  renewsAt?: string;
  store: 'apple_app_store' | 'google_play' | 'stripe' | 'promo';
  revenueCatSubscriberId?: string;
  updatedAt: string;
}

export interface UserUsageQuota {
  userId: string;
  monthYear: string; // YYYY-MM
  freeScansRemaining: number;
  proScansUsedThisMonth: number;
  maxScansAllowedThisMonth: number;
  lastScanTimestamp?: string;
  coachMessagesUsedToday: number;
  coachMessagesAllowanceDaily: number;
  updatedAt: string;
}

export type PaywallExperimentVariant =
  | 'hard_paywall_no_trial'     // Variant A: Immediate payment, no trial
  | 'hard_paywall_trial_annual'  // Variant B: Annual plan with short trial
  | 'soft_snapshot_after';

export interface SubscriptionPlanOffering {
  id: string;
  tier: SubscriptionTier;
  title: string;
  badgeLabel?: string;
  priceUsd: number;
  billingPeriod: 'annual' | 'monthly';
  perMonthEquivalentUsd: number;
  hasFreeTrial: boolean;
  trialDays: number;
  savingsPercent?: number;
}

export interface SubscriptionOfferingPayload {
  experimentVariant: PaywallExperimentVariant;
  headline: string;
  supportingCopy: string;
  primaryCtaText: string;
  defaultPlanId: string;
  plans: SubscriptionPlanOffering[];
  benefits: string[];
}

export interface ContributionMarginMetrics {
  cohortId: string;
  userCount: number;
  subscriptionRevenueUsd: number;
  affiliateRevenueUsd: number;
  skinAnalysisCostUsd: number;
  llmReasoningCostUsd: number;
  storePlatformFeeUsd: number;
  backendComputeCostUsd: number;
  refundsAndCancellationsUsd: number;
  netContributionMarginUsd: number;
  marginPer1000AcquiredUsers: number;
}

export interface RemoteConfigSettings {
  freeInitialScans: number; // Set to 0 in hard paywall model
  freeMonthlyScans: number;
  proMonthlyScans: number;
  scanCooldownHours: number;
  paywallVariant: PaywallExperimentVariant;
  monthlyPricePresentationUsd: number;
  annualPricePresentationUsd: number;
  showOverallScore: boolean;
  showSpotJournal: boolean;
  maxRecommendationCandidates: number;
  activeSkinProvider: 'perfect_corp' | 'haut_ai' | 'mock';
  activeAiModel: string;
  
  // Emergency Kill Switches (Section 65)
  killSwitches: {
    skinScanEnabled: boolean;
    aiCoachEnabled: boolean;
    productRecommendationsEnabled: boolean;
    affiliateCheckoutLinksEnabled: boolean;
    spotJournalAIEnabled: boolean;
    providerPerfectCorpEnabled: boolean;
    providerHautEnabled: boolean;
  };
}
