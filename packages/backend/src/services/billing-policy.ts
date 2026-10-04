import * as admin from 'firebase-admin';

export interface BillingPolicy {
  trialEnabled: boolean;
  offeringId: 'default' | 'trial_14d';
}

/** Server-owned switch for offers shown to new purchasers. Missing or malformed
 * configuration fails closed to the standard, no-trial offering. */
export class BillingPolicyStore {
  constructor(private readonly db: admin.firestore.Firestore) {}

  async current(): Promise<BillingPolicy> {
    const snapshot = await this.db.collection('billingPolicy').doc('current').get();
    const trialEnabled = snapshot.get('trialEnabled') === true;
    return { trialEnabled, offeringId: trialEnabled ? 'trial_14d' : 'default' };
  }
}
