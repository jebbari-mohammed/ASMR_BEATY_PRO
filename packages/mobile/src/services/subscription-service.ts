import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import type { PurchasesPackage } from 'react-native-purchases';
import auth from '@react-native-firebase/auth';
import functions from '@react-native-firebase/functions';
import { trialPeriod, trialPeriodLabel } from './store-trial-offer';

const ENTITLEMENT_KEY = 'asmr_user_subscription_entitlement_v1';

export type FreeTrialStatus = {
  eligible: boolean;
  active: boolean;
  endsAt: string | null;
};

export type VerifiedAccess = { active: boolean; expiresAtMs: number | null; source: string | null };

export class PurchaseVerificationPendingError extends Error {
  constructor(confirmedByStore: boolean) {
    super(confirmedByStore
      ? 'Your store purchase completed, but membership is not active yet. Do not buy again. Use Restore purchases after reconnecting.'
      : 'Your store purchase may have completed, but we could not verify it yet. Do not buy again. Use Restore purchases after reconnecting.');
  }
}

function isFreeTrialStatus(value: unknown): value is FreeTrialStatus {
  if (!value || typeof value !== 'object') return false;
  const status = value as Partial<FreeTrialStatus>;
  if (typeof status.eligible !== 'boolean' || typeof status.active !== 'boolean' ||
      !(status.endsAt === null || (typeof status.endsAt === 'string' &&
        Number.isFinite(Date.parse(status.endsAt))))) return false;
  if (status.eligible && (status.active || status.endsAt !== null)) return false;
  if (status.active && status.endsAt === null) return false;
  return true;
}

// Production RevenueCat API Keys (set via environment variables)
export const REVENUECAT_CONFIG = {
  appleApiKey: process.env.EXPO_PUBLIC_RC_APPLE_API_KEY || process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY || 'appl_placeholder_asmr',
  googleApiKey: process.env.EXPO_PUBLIC_RC_GOOGLE_API_KEY || process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY || 'goog_placeholder_asmr',
  entitlementId: 'asmr_beaty_pro_pro'
};

export class SubscriptionService {
  private static configured = false;
  private static identifiedUid: string | null = null;
  private static pendingLogout: Promise<void> | null = null;

  static isStoreConfigured(): boolean {
    const apiKey = Platform.OS === 'ios' ? REVENUECAT_CONFIG.appleApiKey : REVENUECAT_CONFIG.googleApiKey;
    return Boolean(apiKey && !apiKey.includes('placeholder'));
  }

  static isPurchaseReady(): boolean {
    return this.isStoreConfigured() && this.identifiedUid !== null &&
      auth().currentUser?.uid === this.identifiedUid && auth().currentUser?.emailVerified === true;
  }

  private static isVerifiedAccount(): boolean {
    return !!auth().currentUser?.uid && auth().currentUser?.emailVerified === true;
  }

  /**
   * Initializes RevenueCat with platform-specific credentials if available.
   */
  static async initialize(uid?: string): Promise<void> {
    try {
      // Old prototype builds wrote a self-granted entitlement. It must never authorize Pro.
      await SecureStore.deleteItemAsync(ENTITLEMENT_KEY);

      const apiKey = Platform.OS === 'ios' ? REVENUECAT_CONFIG.appleApiKey : REVENUECAT_CONFIG.googleApiKey;
      if (!this.isStoreConfigured()) {
        console.warn('[RevenueCat] Store subscriptions are not configured. Purchases are unavailable.');
        return;
      }
      if (!uid || auth().currentUser?.uid !== uid) return;
      // Do not identify another account while a prior SDK logout is pending.
      // The caller will show unavailable and can retry after it settles.
      if (this.pendingLogout) return;
      if (!this.configured) {
        Purchases.configure({ apiKey, appUserID: uid });
        this.configured = true;
      } else if (this.identifiedUid !== uid) {
        await Purchases.logIn(uid);
      }
      this.identifiedUid = uid;
    } catch (err) {
      console.warn('[RevenueCat] Initialization warning:', err);
    }
  }

  /**
   * Reads the active store entitlement for display. The backend must independently
   * verify entitlement before any paid server operation.
   */
  static async verifyAccess(purchaseOnly = false): Promise<VerifiedAccess> {
    if (!this.isVerifiedAccount() || (purchaseOnly && !this.isPurchaseReady())) {
      if (auth().currentUser?.emailVerified) {
        throw new Error('Membership verification is temporarily unavailable. Please try again.');
      }
      return { active: false, expiresAtMs: null, source: null };
    }
    try {
      const result = await functions().httpsCallable('verifySubscriptionAccess')(
        purchaseOnly ? { purchaseOnly: true } : {}
      );
      const access = result.data as { isPro?: boolean; source?: string; expiresAtMs?: number | null };
      const verifiedSource = access.source === 'revenuecat_server' || access.source === 'revenuecat_cache' ||
        access.source === 'app_trial' || access.source === 'store_review' ? access.source : null;
      const verifiedExpiry = typeof access.expiresAtMs === 'number' &&
        Number.isFinite(access.expiresAtMs) ? access.expiresAtMs : null;
      const active = access.isPro === true && verifiedSource !== null && verifiedExpiry !== null &&
        (!purchaseOnly || verifiedSource === 'revenuecat_server');
      const source = active ? verifiedSource : null;
      return {
        active,
        expiresAtMs: active ? verifiedExpiry : null,
        source
      };
    } catch (rcErr) {
      console.warn('[RevenueCat] CustomerInfo check warning:', rcErr);
      if ((rcErr as { code?: string })?.code === 'functions/resource-exhausted') {
        throw new Error('Too many membership checks. Wait a minute, then try again.');
      }
      throw new Error('Membership verification is temporarily unavailable. Please try again.');
    }
  }

  static async hasActiveEntitlement(purchaseOnly = false): Promise<boolean> {
    return (await this.verifyAccess(purchaseOnly)).active;
  }

  /** Free app access is issued by the backend and never starts a store purchase. */
  static async getFreeTrialStatus(): Promise<FreeTrialStatus> {
    if (!this.isVerifiedAccount()) throw new Error('Verify your email before starting free access.');
    const result = await functions().httpsCallable('getFreeTrialStatus')({});
    if (!isFreeTrialStatus(result.data)) throw new Error('Free access is temporarily unavailable.');
    return result.data;
  }

  static async startFreeTrial(): Promise<FreeTrialStatus> {
    if (!this.isVerifiedAccount()) throw new Error('Verify your email before starting free access.');
    const result = await functions().httpsCallable('startFreeTrial')({});
    if (!isFreeTrialStatus(result.data) || !result.data.active) {
      throw new Error('Could not start free access. Please try again.');
    }
    return result.data;
  }

  /**
   * Executes purchase and activates entitlement via genuine app store.
   */
  static async purchasePlan(planId: string): Promise<{ success: boolean; planId: string }> {
    if (!this.isPurchaseReady()) {
      throw new Error('Pro enrollment is not available yet.');
    }
    if (!this.isStoreConfigured()) {
      throw new Error('Store subscriptions are not available yet. Please try again later.');
    }

    try {
      const offerings = await Purchases.getOfferings();
      const currentPackage = offerings.current?.availablePackages.find(
        (pkg) => pkg.identifier === planId
      );
      if (!currentPackage) {
        throw new Error('This subscription is not available in the store. Please try again later.');
      }

      await Purchases.purchasePackage(currentPackage);
      let isPro: boolean;
      try {
        isPro = await this.hasActiveEntitlement(true);
      } catch {
        throw new PurchaseVerificationPendingError(false);
      }
      if (!isPro) {
        throw new PurchaseVerificationPendingError(true);
      }
      return { success: true, planId };
    } catch (rcErr: any) {
      if (rcErr.userCancelled) {
        throw new Error('Purchase was cancelled.');
      }
      if (rcErr instanceof PurchaseVerificationPendingError) {
        console.warn('[RevenueCat] Store checkout returned; server verification is pending.');
        throw rcErr;
      }
      console.warn('[RevenueCat] Purchase failed:', rcErr.message);
      throw rcErr;
    }
  }

  /**
   * Restores existing purchases from App Store / Google Play.
   */
  static async restorePurchases(): Promise<boolean> {
    if (!this.isPurchaseReady()) {
      throw new Error('The store is not ready to restore purchases. Reload access and plans, then try again.');
    }
    await Purchases.restorePurchases();
    return this.hasActiveEntitlement(true);
  }

  static async getStorePackages(): Promise<PurchasesPackage[]> {
    if (!this.isPurchaseReady()) throw new Error('Sign in before viewing subscription options.');
    const offerings = await Purchases.getOfferings();
    return (offerings.current?.availablePackages ?? []).filter(
      (pkg) => pkg.packageType === 'ANNUAL' || pkg.packageType === 'MONTHLY'
    );
  }

  /** Returns only free periods this store account can actually redeem. */
  static async getFreeTrialPeriods(packages: PurchasesPackage[]): Promise<Record<string, string>> {
    if (!this.isPurchaseReady()) return {};
    const freePeriods: Record<string, string> = {};
    if (Platform.OS === 'ios') {
      const products = packages.filter(pkg => pkg.product.introPrice?.price === 0);
      if (!products.length) return freePeriods;
      try {
        const eligibility = await Purchases.checkTrialOrIntroductoryPriceEligibility(
          products.map(pkg => pkg.product.identifier)
        );
        for (const pkg of products) {
          const eligible = eligibility[pkg.product.identifier]?.status ===
            Purchases.INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE;
          const period = trialPeriod(pkg.product, 'ios', eligible);
          if (trialPeriodLabel(period)) freePeriods[pkg.identifier] = period!;
        }
      } catch {
        // Unknown eligibility must never turn into a trial promise.
      }
    } else if (Platform.OS === 'android') {
      for (const pkg of packages) {
        const period = trialPeriod(pkg.product, 'android');
        if (trialPeriodLabel(period)) freePeriods[pkg.identifier] = period!;
      }
    }
    return freePeriods;
  }

  static async forgetIdentity(): Promise<void> {
    this.identifiedUid = null;
    if (this.configured) {
      if (this.pendingLogout) return this.pendingLogout;
      const logout = Purchases.logOut().then(() => undefined);
      this.pendingLogout = logout;
      try { await logout; }
      finally {
        if (this.pendingLogout === logout) this.pendingLogout = null;
      }
    }
  }

}
