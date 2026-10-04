#!/usr/bin/env node
import process from 'node:process';
import admin from 'firebase-admin';

const [mode, projectFlag, projectId, applyFlag] = process.argv.slice(2);
if (!['on', 'off', 'status'].includes(mode) || projectFlag !== '--project' ||
    !/^[a-z][a-z0-9-]{4,62}$/.test(projectId ?? '') ||
    (applyFlag !== undefined && applyFlag !== '--apply')) {
  console.error('Usage: node scripts/set-store-trial.mjs <on|off|status> --project <firebase-project-id> [--apply]');
  process.exitCode = 2;
} else {
  admin.initializeApp({ projectId });
  const ref = admin.firestore().collection('billingPolicy').doc('current');
  const before = await ref.get();
  const current = before.get('trialEnabled') === true;
  console.log(JSON.stringify({ projectId, currentTrialEnabled: current, requested: mode }, null, 2));
  if (mode !== 'status') {
    if (applyFlag !== '--apply') {
      console.log('Dry run. Add --apply to save the switch. Turn it on only after both store trial products and RevenueCat offering are verified.');
    } else {
      await ref.set({ trialEnabled: mode === 'on', updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: 'operator-cli' }, { merge: true });
      const after = await ref.get();
      if (after.get('trialEnabled') !== (mode === 'on')) throw new Error('Trial switch verification failed');
      console.log(`Verified: trial ${mode === 'on' ? 'enabled' : 'disabled'} for new checkout paths.`);
    }
  }
}
