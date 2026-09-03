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

export interface RemoteConfigSettings {
  freeInitialScans: number;
  freeMonthlyScans: number;
  proMonthlyScans: number;
  scanCooldownHours: number;
  paywallVariant: 'soft_snapshot_after' | 'benefit_comparison' | 'trial_first';
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
