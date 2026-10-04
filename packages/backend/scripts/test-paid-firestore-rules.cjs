const fs = require('node:fs');
const path = require('node:path');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, deleteDoc, writeBatch, Timestamp } = require('firebase/firestore');

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
    const aliceCheckin = doc(alice, 'users/alice/skinFeelCheckins/2026-09-27');
    const aliceShelf = doc(alice, 'users/alice/shelf/abcdefgh1234');
    const aliceRoutine = doc(alice, 'users/alice/routines/current');
    const aliceProfile = doc(alice, 'users/alice');
    const entitlement = doc(alice, 'users/alice/entitlements/pro');
    const reviewGrant = doc(alice, 'users/alice/entitlements/review');
    const trialGrant = doc(alice, 'users/alice/entitlements/trial');
    const validLog = { day: '2026-09-27', completedIds: ['m1'], updatedAt: Date.now() };
    const validCheckin = { day: '2026-09-27', feel: 'comfortable', updatedAt: Date.now(), expireAt: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000) };
    const issuedAtMs = Date.now() - 60_000;
    const validReviewGrant = {
      uid: 'alice',
      purpose: 'store_review',
      enabled: true,
      issuedAt: Timestamp.fromMillis(issuedAtMs),
      expiresAt: Timestamp.fromMillis(issuedAtMs + 24 * 60 * 60 * 1000)
    };
    const trialStartedAtMs = Date.now() - 60_000;
    const validTrialGrant = {
      uid: 'alice',
      purpose: 'app_trial',
      startedAt: Timestamp.fromMillis(trialStartedAtMs),
      endsAt: Timestamp.fromMillis(trialStartedAtMs + 10 * 24 * 60 * 60 * 1000)
    };

    await assertFails(getDoc(aliceLog));
    await assertFails(setDoc(aliceLog, validLog));
    await assertFails(getDoc(aliceCheckin));
    await assertFails(setDoc(aliceCheckin, validCheckin));
    await assertFails(setDoc(aliceRoutine, { steps: [{ id: 'm1' }], updatedAt: Date.now() }));
    await assertFails(setDoc(entitlement, { isPro: true, expiresAt: null }));
    await assertFails(setDoc(reviewGrant, validReviewGrant));
    await assertFails(setDoc(trialGrant, validTrialGrant));
    await assertFails(getDoc(trialGrant));
    await assertFails(setDoc(doc(adminClient, 'users/alice/entitlements/review'), validReviewGrant));
    await assertFails(setDoc(doc(adminClient, 'users/alice/entitlements/trial'), validTrialGrant));

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
    await seed(false, Timestamp.fromMillis(Date.now() + 60_000));
    await assertFails(setDoc(aliceLog, validLog));
    await assertFails(setDoc(aliceCheckin, validCheckin));
    await testEnv.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'users/alice/skinFeelCheckins/2026-09-27'), validCheckin);
    });
    await assertFails(getDoc(aliceCheckin));
    const seedReview = async data => testEnv.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'users/alice/entitlements/review'), data);
    });
    const invalidReviewGrants = [
      { ...validReviewGrant, uid: 'bob' },
      { ...validReviewGrant, purpose: 'qa' },
      { ...validReviewGrant, enabled: false },
      { ...validReviewGrant, issuedAt: null },
      { ...validReviewGrant, issuedAt: Timestamp.fromMillis(Date.now() + 60_000) },
      { ...validReviewGrant, expiresAt: null },
      { ...validReviewGrant, expiresAt: Timestamp.fromMillis(Date.now() - 1000) },
      { ...validReviewGrant, expiresAt: new Date(Date.now() + 60_000).toISOString() },
      { ...validReviewGrant, expiresAt: Timestamp.fromMillis(issuedAtMs + 30 * 24 * 60 * 60 * 1000 + 1000) }
    ];
    for (const invalidGrant of invalidReviewGrants) {
      await seedReview(invalidGrant);
      await assertFails(setDoc(aliceLog, validLog));
      await assertFails(getDoc(aliceCheckin));
    }
    await seedReview(validReviewGrant);
    await assertSucceeds(setDoc(aliceLog, validLog));
    await assertSucceeds(getDoc(aliceLog));
    await assertSucceeds(getDoc(aliceCheckin));
    await assertFails(setDoc(aliceCheckin, validCheckin));
    await assertFails(deleteDoc(aliceCheckin));
    await assertFails(getDoc(doc(bob, 'users/alice/skinFeelCheckins/2026-09-27')));
    await assertFails(getDoc(doc(unverifiedAlice, 'users/alice/skinFeelCheckins/2026-09-27')));
    await assertFails(getDoc(doc(unverifiedAlice, 'users/alice/routineLogs/2026-09-27')));
    await assertFails(getDoc(doc(bob, 'users/alice/routineLogs/2026-09-27')));
    await assertFails(setDoc(reviewGrant, { enabled: true }, { merge: true }));
    await assertFails(deleteDoc(reviewGrant));
    await testEnv.withSecurityRulesDisabled(async context => {
      await deleteDoc(doc(context.firestore(), 'users/alice/entitlements/review'));
    });
    await assertFails(getDoc(aliceLog));
    await assertFails(getDoc(aliceCheckin));
    const seedTrial = async data => testEnv.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'users/alice/entitlements/trial'), data);
    });
    const invalidTrialGrants = [
      { ...validTrialGrant, uid: 'bob' },
      { ...validTrialGrant, purpose: 'qa' },
      { ...validTrialGrant, startedAt: null },
      { ...validTrialGrant, startedAt: Timestamp.fromMillis(Date.now() + 60_000) },
      { ...validTrialGrant, endsAt: null },
      { ...validTrialGrant, endsAt: new Date(Date.now() + 60_000).toISOString() },
      { ...validTrialGrant, endsAt: Timestamp.fromMillis(Date.now() - 1) },
      { ...validTrialGrant, endsAt: Timestamp.fromMillis(trialStartedAtMs + 11 * 24 * 60 * 60 * 1000) }
    ];
    for (const invalidTrial of invalidTrialGrants) {
      await seedTrial(invalidTrial);
      await assertFails(setDoc(aliceLog, validLog));
      await assertFails(getDoc(aliceCheckin));
    }
    await seedTrial(validTrialGrant);
    await assertSucceeds(setDoc(aliceLog, validLog));
    await assertSucceeds(getDoc(aliceCheckin));
    await assertFails(getDoc(doc(bob, 'users/alice/routineLogs/2026-09-27')));
    await assertFails(getDoc(doc(unverifiedAlice, 'users/alice/routineLogs/2026-09-27')));
    await assertFails(setDoc(trialGrant, { endsAt: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000) }, { merge: true }));
    await assertFails(deleteDoc(trialGrant));
    await testEnv.withSecurityRulesDisabled(async context => {
      await deleteDoc(doc(context.firestore(), 'users/alice/entitlements/trial'));
    });
    await assertFails(getDoc(aliceLog));
    await assertFails(getDoc(aliceCheckin));
    // An older verifier could cache a Test Store lifetime entitlement with
    // isPro=true and no expiry. A paid client must not retain access to it.
    await seed(true, null);
    await assertFails(setDoc(aliceLog, validLog));
    await seed(true, new Date(Date.now() + 60_000).toISOString());
    await assertFails(setDoc(aliceLog, validLog));
    await testEnv.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'users/alice/entitlements/pro'), { isPro: true });
    });
    await assertFails(setDoc(aliceLog, validLog));
    await seed(true, Timestamp.fromMillis(Date.now() - 60_000));
    await assertFails(setDoc(aliceLog, validLog));
    await assertFails(getDoc(aliceCheckin));
    await seed(true, Timestamp.fromMillis(Date.now() + 60_000));
    const validShelf = { id: 'abcdefgh1234', brand: 'Example', name: 'Moisturizer', category: 'Moisturizer', openedOn: null, addedAt: Date.now() };
    await assertSucceeds(setDoc(aliceLog, validLog));
    await assertSucceeds(getDoc(aliceLog));
    await assertSucceeds(getDoc(aliceCheckin));
    await assertSucceeds(getDocs(query(collection(alice, 'users/alice/skinFeelCheckins'), orderBy('day', 'desc'), limit(14))));
    await assertFails(getDocs(query(collection(bob, 'users/alice/skinFeelCheckins'), orderBy('day', 'desc'), limit(14))));
    await assertFails(setDoc(aliceCheckin, { ...validCheckin, feel: 'dry_tight' }));
    await assertFails(setDoc(doc(bob, 'users/alice/skinFeelCheckins/2026-09-27'), validCheckin));
    await assertFails(deleteDoc(aliceCheckin));
    await seed(true, null);
    await assertFails(getDoc(aliceLog));
    await assertFails(setDoc(aliceLog, validLog));
    await assertFails(getDoc(aliceCheckin));
    await assertFails(deleteDoc(aliceCheckin));
    await seed(true, Timestamp.fromMillis(Date.now() + 60_000));
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
    await seedReview(validReviewGrant);
    await seedTrial(validTrialGrant);
    await testEnv.withSecurityRulesDisabled(async context => {
      const trustedDb = context.firestore();
      const batch = writeBatch(trustedDb);
      const guard = doc(trustedDb, 'accountDeletionGuards/alice');
      batch.set(guard, { state: 'deleting', nextCheckAt: Timestamp.now() });
      batch.set(doc(trustedDb, 'users/alice'), { deletionStatus: 'deleting' }, { merge: true });
      batch.delete(doc(trustedDb, 'users/alice/entitlements/pro'));
      // Leave the review grant behind to prove the deletion guard closes
      // access even if recursive cleanup has not removed that document yet.
      await batch.commit();
      if ('expireAt' in (await getDoc(guard)).data()) {
        throw new Error('Incomplete deletion guard must not have a TTL');
      }
    });
    // Recursive deletion is not atomic. Once it starts, an old client must
    // not add a new paid document after the backend has enumerated the tree.
    await assertFails(setDoc(aliceLog, validLog));
    await assertFails(setDoc(aliceCheckin, validCheckin));
    await assertFails(getDoc(aliceCheckin));
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
