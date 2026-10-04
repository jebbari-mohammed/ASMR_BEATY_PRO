const fs = require('node:fs');
const path = require('node:path');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, deleteDoc, writeBatch, Timestamp } = require('firebase/firestore');

async function main() {
  const testEnv = await initializeTestEnvironment({
    projectId: 'demo-asmr-paid-rules',
    firestore: {
      rules: fs.readFileSync(path.resolve(__dirname, '../../../firestore.rules'), 'utf8')
    }
  });
  try {
    const alice = testEnv.authenticatedContext('alice', { email_verified: true }).firestore();
    const bob = testEnv.authenticatedContext('bob', { email_verified: true }).firestore();
    const adminClient = testEnv.authenticatedContext('operator', { admin: true }).firestore();
    const unverifiedAlice = testEnv.authenticatedContext('alice', { email_verified: false }).firestore();
    const aliceLog = doc(alice, 'users/alice/routineLogs/2026-09-27');
    const aliceShelf = doc(alice, 'users/alice/shelf/abcdefgh1234');
    const aliceRoutine = doc(alice, 'users/alice/routines/current');
    const aliceProfile = doc(alice, 'users/alice');
    const entitlement = doc(alice, 'users/alice/entitlements/pro');

    await assertFails(getDoc(aliceLog));
    await assertFails(setDoc(aliceLog, { completed: true }));
    await assertFails(setDoc(aliceRoutine, { steps: [{ id: 'm1' }], updatedAt: Date.now() }));
    await assertFails(setDoc(entitlement, { isPro: true, expiresAt: null }));

    const serverOwnedProfileFields = [
      'isPro', 'tier', 'subscriptionTier', 'entitlementStatus', 'roles',
      'isAdmin', 'remainingScans', 'scanAllowanceMonthly', 'credits',
      'affiliateCommission', 'deletionStatus'
    ];
    for (const field of serverOwnedProfileFields) {
      // A first-write bypass used to be possible for fields blocked only on
      // update. All server-owned profile metadata must be protected on create.
      await assertFails(setDoc(aliceProfile, { createdAt: Date.now(), [field]: 'forged' }));
    }
    await assertSucceeds(setDoc(aliceProfile, { createdAt: Date.now() }));
    await assertSucceeds(setDoc(aliceProfile, { starterPreferences: { texture: 'dry' } }, { merge: true }));
    for (const field of serverOwnedProfileFields) {
      await assertFails(setDoc(aliceProfile, { [field]: 'forged' }, { merge: true }));
    }

    const seed = async (isPro, expiresAt) => testEnv.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'users/alice/entitlements/pro'), { isPro, expiresAt });
    });
    await seed(false, null);
    await assertFails(setDoc(aliceLog, { completed: true }));
    await seed(true, Timestamp.fromMillis(Date.now() - 60_000));
    await assertFails(setDoc(aliceLog, { completed: true }));
    await seed(true, Timestamp.fromMillis(Date.now() + 60_000));
    const validLog = { day: '2026-09-27', completedIds: ['m1'], updatedAt: Date.now() };
    const validShelf = { id: 'abcdefgh1234', brand: 'Example', name: 'Moisturizer', category: 'Moisturizer', openedOn: null, addedAt: Date.now() };
    await assertSucceeds(setDoc(aliceLog, validLog));
    await assertSucceeds(getDoc(aliceLog));
    await assertSucceeds(setDoc(aliceShelf, validShelf));
    await assertFails(setDoc(aliceLog, { ...validLog, completedIds: Array(21).fill('m1') }));
    await assertFails(setDoc(aliceLog, { ...validLog, privilege: 'admin' }));
    await assertFails(setDoc(aliceShelf, { ...validShelf, id: 'someone-else' }));
    await assertFails(setDoc(aliceShelf, { ...validShelf, name: 'x'.repeat(101) }));
    await assertSucceeds(setDoc(aliceRoutine, { steps: [{ id: 'm1' }], updatedAt: Date.now() }));
    // Deleting the parent document from a client would leave its subcollections
    // behind, bypassing the account-deletion function's recursive cleanup.
    await assertFails(deleteDoc(aliceProfile));
    await assertFails(deleteDoc(doc(adminClient, 'users/alice')));
    if (!(await getDoc(aliceProfile)).exists()) throw new Error('Profile was deleted directly by the client');
    await assertSucceeds(getDoc(aliceRoutine));
    await testEnv.withSecurityRulesDisabled(async context => {
      const trustedDb = context.firestore();
      const batch = writeBatch(trustedDb);
      const guard = doc(trustedDb, 'accountDeletionGuards/alice');
      batch.set(guard, { state: 'deleting', nextCheckAt: Timestamp.now() });
      batch.set(doc(trustedDb, 'users/alice'), { deletionStatus: 'deleting' }, { merge: true });
      batch.delete(doc(trustedDb, 'users/alice/entitlements/pro'));
      await batch.commit();
      if ('expireAt' in (await getDoc(guard)).data()) {
        throw new Error('Incomplete deletion guard must not have a TTL');
      }
    });
    // Recursive deletion is not atomic. Once it starts, an old client must
    // not add a new paid document after the backend has enumerated the tree.
    await assertFails(setDoc(aliceLog, validLog));
    await assertFails(getDoc(aliceRoutine));
    await assertFails(setDoc(aliceProfile, { createdAt: Date.now() }));
    await testEnv.withSecurityRulesDisabled(async context => {
      const trustedDb = context.firestore();
      await deleteDoc(doc(trustedDb, 'users/alice'));
    });
    // Firebase ID tokens can remain valid after Auth deletion; the temporary
    // guard prevents a stale client from recreating the deleted profile.
    await assertFails(setDoc(aliceProfile, { starterPreferences: {} }));
    await assertFails(setDoc(doc(alice, 'users/alice/skinScans/one'), { status: 'CREATED', userId: 'alice' }));
    await assertFails(setDoc(doc(alice, 'users/alice/conversations/one'), { title: 'Unsupported' }));
    await assertFails(setDoc(doc(alice, 'users/alice/spotJournals/one'), { title: 'Unsupported' }));
    await assertFails(setDoc(aliceRoutine, { steps: Array(21).fill({ id: 'm1' }), updatedAt: Date.now() }));
    await assertFails(getDoc(doc(unverifiedAlice, 'users/alice/routineLogs/2026-09-27')));
    await assertFails(getDoc(doc(bob, 'users/alice/routineLogs/2026-09-27')));
    await assertFails(setDoc(doc(bob, 'users/alice/shelf/two'), { name: 'Intrusion' }));
    await assertFails(setDoc(entitlement, { isPro: false, expiresAt: null }));
    console.log('Paid Firestore rules: all access checks passed.');
  } finally {
    await testEnv.cleanup();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
