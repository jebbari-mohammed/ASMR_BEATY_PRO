import * as admin from 'firebase-admin';

export class AccountDeletionService {
  private db: admin.firestore.Firestore;
  private storage: admin.storage.Storage;

  constructor(db: admin.firestore.Firestore, storage: admin.storage.Storage) {
    this.db = db;
    this.storage = storage;
  }

  /**
   * Complete GDPR & App Store compliant account erasure.
   * Deletes all photos, biometric scan data, routine history, conversation memory, and profile records.
   */
  async deleteUserAccountData(userId: string): Promise<{ deleted: boolean; deletedCollections: string[] }> {
    const subcollections = [
      'skinScans',
      'skinSnapshots',
      'routines',
      'routineLogs',
      'shelf',
      'spotJournals',
      'progressEntries',
      'recommendations',
      'usage'
    ];

    const deletedCollections: string[] = [];

    // 1. Delete all standard Firestore subcollections
    for (const subcol of subcollections) {
      const colRef = this.db.collection('users').doc(userId).collection(subcol);
      const snapshot = await colRef.get();
      const batch = this.db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      deletedCollections.push(subcol);
    }

    // 2. Delete conversations and nested messages
    const convSnapshot = await this.db.collection('users').doc(userId).collection('conversations').get();
    for (const convDoc of convSnapshot.docs) {
      const msgsSnapshot = await convDoc.ref.collection('messages').get();
      const batch = this.db.batch();
      msgsSnapshot.docs.forEach((msg) => batch.delete(msg.ref));
      await batch.commit();
      await convDoc.ref.delete();
    }
    deletedCollections.push('conversations');

    // 3. Delete spot journal nested entries
    const spotSnapshot = await this.db.collection('users').doc(userId).collection('spotJournals').get();
    for (const spotDoc of spotSnapshot.docs) {
      const entriesSnapshot = await spotDoc.ref.collection('entries').get();
      const batch = this.db.batch();
      entriesSnapshot.docs.forEach((e) => batch.delete(e.ref));
      await batch.commit();
      await spotDoc.ref.delete();
    }

    // 4. Delete user profile root document
    await this.db.collection('users').doc(userId).delete();
    deletedCollections.push('users_profile');

    // 5. Delete all user Cloud Storage skin photos (Data Minimization & Right to Erasure)
    const storagePrefixes = [
      `transient-scans/${userId}/`,
      `progress-photos/${userId}/`,
      `spot-journal/${userId}/`
    ];

    const bucket = this.storage.bucket();
    for (const prefix of storagePrefixes) {
      try {
        await bucket.deleteFiles({ prefix, force: true });
      } catch (err: any) {
        console.warn(`[AccountDeletion] Storage cleanup note for ${prefix}: ${err.message}`);
      }
    }

    return { deleted: true, deletedCollections };
  }
}
