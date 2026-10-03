import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import type { PurchasesPackage } from 'react-native-purchases';
import auth from '@react-native-firebase/auth';
import functions from '@react-native-firebase/functions';

const ENTITLEMENT_KEY = 'asmr_user_subscription_entitlement_v1';

// Production RevenueCat API Keys (set via environment variables)
export const REVENUECAT_CONFIG = {
  appleApiKey: process.env.EXPO_PUBLIC_RC_APPLE_API_KEY || process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY || 'appl_placeholder_asmr',
  googleApiKey: process.env.EXPO_PUBLIC_RC_GOOGLE_API_KEY || process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY || 'goog_placeholder_asmr',
  entitlementId: 'asmr_beaty_pro_pro'
};

export class SubscriptionService {
  private static configured = false;
  private static identifiedUid: string | null = null;

  static isStoreConfigured(): boolean {
    const apiKey = Platform.OS === 'ios' ? REVENUECAT_CONFIG.appleApiKey : REVENUECAT_CONFIG.googleApiKey;
    return Boolean(apiKey && !apiKey.includes('placeholder'));
  }

  static isPurchaseReady(): boolean {
    return this.isStoreConfigured() && this.identifiedUid !== null &&
      auth().currentUser?.uid === this.identifiedUid && auth().currentUser?.emailVerified === true;
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
  static async hasActiveEntitlement(): Promise<boolean> {
    if (!this.isPurchaseReady()) {
      if (auth().currentUser?.emailVerified) {
        throw new Error('Membership verification is temporarily unavailable. Please try again.');
      }
      return false;
    }
    try {
      const result = await functions().httpsCallable('verifySubscriptionAccess')();
      return (result.data as { isPro?: boolean }).isPro === true;
    } catch (rcErr) {
      console.warn('[RevenueCat] CustomerInfo check warning:', rcErr);
      throw new Error('Membership verification is temporarily unavailable. Please try again.');
    }
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
      const isPro = await this.hasActiveEntitlement();
      if (!isPro) {
        throw new Error('The purchase completed, but Pro is not active yet. Please restore purchases.');
      }
      return { success: true, planId };
    } catch (rcErr: any) {
      if (rcErr.userCancelled) {
        throw new Error('Purchase was cancelled.');
      }
      console.warn('[RevenueCat] Purchase failed:', rcErr.message);
      throw rcErr;
    }
  }

  /**
   * Restores existing purchases from App Store / Google Play.
   */
  static async restorePurchases(): Promise<boolean> {
    if (!this.isPurchaseReady()) return false;
    await Purchases.restorePurchases();
    return this.hasActiveEntitlement();
  }

  static async getStorePackages(): Promise<PurchasesPackage[]> {
    if (!this.isPurchaseReady()) throw new Error('Sign in before viewing subscription options.');
    const offerings = await Purchases.getOfferings();
    return (offerings.current?.availablePackages ?? []).filter(
      (pkg) => pkg.packageType === 'ANNUAL' || pkg.packageType === 'MONTHLY'
    );
  }

  static async forgetIdentity(): Promise<void> {
    this.identifiedUid = null;
    if (this.configured) {
      await Purchases.logOut();
    }
  }

}
