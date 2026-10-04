#!/usr/bin/env node
/** Read-only owner diagnostics. Emits aggregate JSON, never account identifiers. */
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import admin from 'firebase-admin';
import {
  activeStoreCache, classifySubscriber, summarizeOwnerFunnel,
  validAppTrial, validReviewGrant, validateRevenueMetric
} from './owner-funnel-metrics.mjs';

function options(argv) {
  const out = { days: 35, project: null, qaUidsFile: null, useGcloudV1Secret: false, revenueCatProject: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--use-gcloud-v1-secret') { out.useGcloudV1Secret = true; continue; }
    const value = argv[++index];
    if (!value) throw new Error('Missing option value');
    if (arg === '--project') out.project = value;
    else if (arg === '--days') out.days = Number(value);
    else if (arg === '--qa-uids-file') out.qaUidsFile = value;
    else if (arg === '--revenuecat-project') out.revenueCatProject = value;
    else throw new Error('Unknown option');
  }
  if (!/^[a-z][a-z0-9-]{4,62}$/.test(out.project ?? '') ||
      !Number.isInteger(out.days) || out.days < 7 || out.days > 365 ||
      (out.revenueCatProject && !/^[A-Za-z0-9_-]{1,255}$/.test(out.revenueCatProject))) {
    throw new Error('Usage: node scripts/owner-funnel-report.mjs --project PROJECT [--days 7..365] [--qa-uids-file PATH] [--use-gcloud-v1-secret] [--revenuecat-project ID]');
  }
  return out;
}

function gcloudV1Secret(project) {
  const result = spawnSync('gcloud', [
    'secrets', 'versions', 'access', 'latest', '--secret=REVENUECAT_SECRET_API_KEY',
    `--project=${project}`
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 16 * 1024 });
  if (result.status !== 0 || !result.stdout?.trim()) {
    throw new Error('Could not access existing GCP RevenueCat v1 secret');
  }
  return result.stdout.trim();
}

async function readQaUids(path) {
  if (!path) return new Set();
  const lines = (await readFile(path, 'utf8')).split(/\r?\n/).map(line => line.trim());
  const values = lines.filter(line => line && !line.startsWith('#'));
  if (values.some(value => !/^[A-Za-z0-9:_-]{1,128}$/.test(value))) {
    throw new Error('QA manifest contains an invalid UID');
  }
  return new Set(values);
}

async function authCohort(auth, cutoffMs, nowMs) {
  const users = [];
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const user of page.users) {
      const createdAtMs = Date.parse(user.metadata.creationTime);
      if (Number.isFinite(createdAtMs) && createdAtMs >= cutoffMs && createdAtMs <= nowMs) {
        users.push({ uid: user.uid, createdAtMs, emailVerified: user.emailVerified, disabled: user.disabled });
      }
    }
    pageToken = page.pageToken;
  } while (pageToken);
  return users;
}

function firstSevenUtcCalendarDays(createdAtMs) {
  const first = new Date(createdAtMs).toISOString().slice(0, 10);
  const exclusiveLast = new Date(createdAtMs + 7 * 86400000).toISOString().slice(0, 10);
  return [first, exclusiveLast];
}

async function readAccount(db, user, nowMs, knownQa) {
  const profile = db.collection('users').doc(user.uid);
  const entitlement = profile.collection('entitlements');
  const [trial, review, store] = await Promise.all([
    entitlement.doc('trial').get(), entitlement.doc('review').get(), entitlement.doc('pro').get()
  ]);
  const [first, exclusiveLast] = firstSevenUtcCalendarDays(user.createdAtMs);
  const logs = await profile.collection('routineLogs')
    .where('day', '>=', first).where('day', '<', exclusiveLast).get();
  const firstWeekRoutineDays = new Set(logs.docs.filter(doc =>
    Array.isArray(doc.data().completedIds) && doc.data().completedIds.length > 0
  ).map(doc => doc.id)).size;
  return {
    ...user,
    knownQa: knownQa.has(user.uid),
    appTrial: validAppTrial(trial.data(), user.uid, nowMs),
    reviewGrant: validReviewGrant(review.data(), user.uid, nowMs),
    storeCacheActive: activeStoreCache(store.data(), nowMs),
    firstWeekRoutineDays
  };
}

async function fetchSubscriber(uid, apiKey, nowMs) {
  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(uid)}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`RevenueCat v1 HTTP ${response.status}`);
  return classifySubscriber(await response.json(), nowMs);
}

async function fetchRevenueMetric(apiKey, projectId, startDate, endDate, revenueType) {
  const query = new URLSearchParams({ start_date: startDate, end_date: endDate, currency: 'USD', revenue_type: revenueType });
  const url = `https://api.revenuecat.com/v2/projects/${encodeURIComponent(projectId)}/metrics/revenue?${query}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`RevenueCat v2 HTTP ${response.status}`);
  return validateRevenueMetric(await response.json(), { startDate, endDate, revenueType });
}

async function mapLimited(items, limit, callback) {
  let cursor = 0;
  const result = new Array(items.length);
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      result[index] = await callback(items[index]);
    }
  }));
  return result;
}

export async function createReport(argv = process.argv.slice(2)) {
  const opts = options(argv);
  const nowMs = Date.now();
  const cutoffMs = nowMs - opts.days * 86400000;
  const qaUids = await readQaUids(opts.qaUidsFile);
  const v1Key = opts.useGcloudV1Secret ? gcloudV1Secret(opts.project) : process.env.REVENUECAT_SECRET_API_KEY;
  const v2Key = process.env.REVENUECAT_V2_READ_KEY;
  admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: opts.project });
  const [auth, db] = [admin.auth(), admin.firestore()];
  const users = await authCohort(auth, cutoffMs, nowMs);
  const rows = await mapLimited(users, 6, user => readAccount(db, user, nowMs, qaUids));
  if (v1Key) {
    await mapLimited(rows, 4, async row => {
      try { row.subscriber = await fetchSubscriber(row.uid, v1Key, nowMs); }
      catch { row.subscriberError = true; }
    });
  }
  const report = summarizeOwnerFunnel(rows, {
    nowMs, days: opts.days, subscriberRequested: Boolean(v1Key), qaManifestProvided: Boolean(opts.qaUidsFile)
  });
  const startDate = new Date(cutoffMs).toISOString().slice(0, 10);
  const endDate = new Date(nowMs).toISOString().slice(0, 10);
  let revenue = {
    status: 'unavailable',
    reason: 'RevenueCat v2 read-only key and project ID are required. A v1 subscriber key cannot prove cash revenue.',
    gross: null, proceeds: null
  };
  if (v2Key && opts.revenueCatProject) {
    try {
      const [gross, proceeds] = await Promise.all([
        fetchRevenueMetric(v2Key, opts.revenueCatProject, startDate, endDate, 'revenue'),
        fetchRevenueMetric(v2Key, opts.revenueCatProject, startDate, endDate, 'proceeds')
      ]);
      revenue = {
        status: 'revenuecat_project_metric',
        period: { startDate, endDate, inclusive: true },
        gross, proceeds,
        scope: 'Entire RevenueCat project across all apps; production chart data, not app profit or store payout.'
      };
    } catch {
      revenue = {
        status: 'unavailable',
        reason: 'RevenueCat v2 revenue endpoint failed or returned malformed data; check key permission charts_metrics:overview:read and project ID.',
        gross: null, proceeds: null
      };
    }
  }
  return {
    projectId: opts.project,
    ...report,
    revenue,
    limitations: [
      'Deleted Auth accounts are absent; this is a current-account cohort, not a complete historical install funnel.',
      'Routine use counts local day labels against the first seven UTC calendar days and is approximate near time-zone boundaries.',
      'RevenueCat v1 subscriber snapshots do not enumerate transactions, prices, net payouts, or reliable renewals.',
      'A later purchase date can indicate another period; it is not a verified renewal rate.',
      'A positive RevenueCat project proceeds metric does not prove app profit; acquisition, operations, and support costs remain.'
    ]
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createReport().then(report => console.log(JSON.stringify(report, null, 2))).catch(() => {
    console.error('Owner report failed. Check ADC, project, Firestore access, and command options. No account data was printed.');
    process.exitCode = 1;
  });
}
