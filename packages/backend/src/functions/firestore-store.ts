import * as admin from 'firebase-admin';
import { ScanSession, NormalizedSkinAnalysis } from '@asmr/shared';
import { ScanStore, UserSubscriptionEntitlement, UserScanQuota } from '../services/scan-state-machine.js';

export class FirestoreScanStore implements ScanStore {
  private db: admin.firestore.Firestore;
  private storage: admin.storage.Storage;

  constructor(db: admin.firestore.Firestore, storage: admin.storage.Storage) {
    this.db = db;
    this.storage = storage;
  }

  async getSession(scanId: string): Promise<ScanSession | null> {
    const doc = await this.db.collectionGroup('skinScans').where('scanId', '==', scanId).limit(1).get();
    if (doc.empty) return null;
    return doc.docs[0].data() as ScanSession;
  }

  async saveSession(session: ScanSession): Promise<void> {
    await this.db
      .collection('users')
      .doc(session.userId)
      .collection('skinScans')
      .doc(session.scanId)
      .set(session, { merge: true });
  }

  async getSnapshot(userId: string, snapshotId: string): Promise<NormalizedSkinAnalysis | null> {
    const doc = await this.db
      .collection('users')
      .doc(userId)
      .collection('skinSnapshots')
      .doc(snapshotId)
      .get();
    if (!doc.exists) return null;
    return doc.data() as NormalizedSkinAnalysis;
  }

  async saveSnapshot(userId: string, snapshot: NormalizedSkinAnalysis): Promise<void> {
    await this.db
      .collection('users')
      .doc(userId)
      .collection('skinSnapshots')
      .doc(snapshot.scanId)
      .set(snapshot);
  }

  async getEntitlement(userId: string): Promise<UserSubscriptionEntitlement> {
    const doc = await this.db.collection('users').doc(userId).collection('entitlements').doc('pro').get();
    if (!doc.exists) {
      return { isPro: false, status: 'expired', tier: 'FREE' };
    }
    const data = doc.data() || {};
    return {
      isPro: Boolean(data.isPro && (data.status === 'active' || data.status === 'grace_period')),
      status: data.status || 'expired',
      tier: data.tier || 'PRO'
    };
  }

  async getQuota(userId: string): Promise<UserScanQuota> {
    const doc = await this.db.collection('users').doc(userId).collection('usage').doc('scans').get();
    if (!doc.exists) {
      return { remainingScans: 4, cooldownHoursRemaining: 0 };
    }
    const data = doc.data() || {};
    return {
      remainingScans: data.remainingScans ?? 4,
      cooldownHoursRemaining: data.cooldownHoursRemaining ?? 0
    };
  }

  async decrementQuota(userId: string): Promise<void> {
    const ref = this.db.collection('users').doc(userId).collection('usage').doc('scans');
    await ref.set(
      {
        remainingScans: admin.firestore.FieldValue.increment(-1),
        lastScanAt: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  }

  async deleteTransientPhoto(storagePath: string): Promise<void> {
    try {
      const bucket = this.storage.bucket();
      const file = bucket.file(storagePath);
      await file.delete({ ignoreNotFound: true });
    } catch (err) {
      console.warn(`[FirestoreScanStore] Transient photo delete error (${storagePath}):`, err);
    }
  }
}
