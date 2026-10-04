import * as admin from 'firebase-admin';
import { readFile } from 'node:fs/promises';
import {
  APPROVED_TRACKING_HOSTS_DOCUMENT,
  DEFAULT_US_DISCOVERY_PRODUCTS,
  PRODUCT_DISCOVERY_DOCUMENT,
  validateApprovedTrackingHosts,
  validateDiscoveryProducts,
  type ApprovedTrackingHost
} from '../services/product-discovery.js';

type Options = Record<string, string | boolean>;

function parseOptions(args: string[]): Options {
  const options: Options = {};
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === '--apply') {
      options[flag] = true;
      continue;
    }
    if (!['--project', '--file', '--host', '--reference', '--query-keys'].includes(flag) ||
        typeof args[index + 1] !== 'string' || args[index + 1].startsWith('--')) {
      throw new Error(`Unexpected or incomplete option: ${flag}`);
    }
    if (options[flag] !== undefined) throw new Error(`Duplicate option: ${flag}`);
    options[flag] = args[++index];
  }
  return options;
}

function required(options: Options, flag: string): string {
  const value = options[flag];
  if (typeof value !== 'string' || !value) throw new Error(`Required option: ${flag}`);
  return value;
}

async function approvedHosts(db: admin.firestore.Firestore): Promise<ApprovedTrackingHost[]> {
  const snapshot = await db.doc(APPROVED_TRACKING_HOSTS_DOCUMENT).get();
  if (!snapshot.exists) return [];
  const data = snapshot.data();
  if (!data || data.version !== 1) throw new Error('Existing tracking-host approvals are invalid');
  return validateApprovedTrackingHosts(data.hosts);
}

async function run(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'template') {
    if (args.length > 0) throw new Error('template accepts no options');
    process.stdout.write(`${JSON.stringify({ products: DEFAULT_US_DISCOVERY_PRODUCTS }, null, 2)}\n`);
    return;
  }
  if (!['publish', 'disable', 'reset', 'approve-host', 'revoke-host'].includes(command)) {
    throw new Error('Use template, publish, disable, reset, approve-host, or revoke-host');
  }
  const options = parseOptions(args);
  const projectId = required(options, '--project');
  if (!/^[a-z][a-z0-9-]{4,40}$/.test(projectId)) throw new Error('Invalid project ID');
  const apply = options['--apply'] === true;
  if (apply && process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('Unset FIRESTORE_EMULATOR_HOST before applying a catalog update');
  }
  admin.initializeApp({ projectId });
  try {
    const db = admin.firestore();
    if (command === 'approve-host' || command === 'revoke-host') {
      const host = required(options, '--host');
      const existing = await approvedHosts(db);
      let next: ApprovedTrackingHost[];
      if (command === 'approve-host') {
        const approval = validateApprovedTrackingHosts([{
          host,
          approvalReference: required(options, '--reference'),
          allowedQueryKeys: typeof options['--query-keys'] === 'string' && options['--query-keys']
            ? options['--query-keys'].split(',') : []
        }])[0];
        next = validateApprovedTrackingHosts([...existing.filter(item => item.host !== host), approval]);
      } else {
        next = existing.filter(item => item.host !== host);
      }
      if (JSON.stringify(next) === JSON.stringify(existing)) {
        process.stdout.write('Tracking-host approvals already match; no write needed.\n');
        return;
      }
      process.stdout.write(`${apply ? 'Updating' : 'Validated'} tracking-host approvals in ${projectId}: ${next.map(item => item.host).join(', ') || '(none)'}\n`);
      if (apply) {
        await db.doc(APPROVED_TRACKING_HOSTS_DOCUMENT).set({
          version: 1, hosts: next, updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      return;
    }

    const catalogRef = db.doc(PRODUCT_DISCOVERY_DOCUMENT);
    if (command === 'reset') {
      process.stdout.write(`${apply ? 'Resetting' : 'Would reset'} ${PRODUCT_DISCOVERY_DOCUMENT} in ${projectId} to the bundled direct-link list.\n`);
      if (apply) await catalogRef.delete();
      return;
    }

    let input: unknown = [];
    if (command === 'publish') {
      const parsed = JSON.parse(await readFile(required(options, '--file'), 'utf8')) as unknown;
      input = Array.isArray(parsed) ? parsed :
        parsed && typeof parsed === 'object' ? (parsed as { products?: unknown }).products : undefined;
    }
    const containsCommissioned = Array.isArray(input) && input.some(item =>
      typeof item === 'object' && item !== null && (item as { isCommissioned?: unknown }).isCommissioned === true);
    const products = validateDiscoveryProducts(input, containsCommissioned ? await approvedHosts(db) : []);
    const existing = await catalogRef.get();
    if (existing.exists && existing.get('version') === 1 &&
        JSON.stringify(existing.get('products')) === JSON.stringify(products)) {
      process.stdout.write('Curated catalog already matches; no write needed.\n');
      return;
    }
    process.stdout.write(`${apply ? 'Publishing' : 'Validated'} ${products.length} curated products to ${projectId}; ${products.filter(item => item.isCommissioned).length} commissioned.\n`);
    if (apply) {
      await catalogRef.set({
        version: 1, products, updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  } finally {
    await admin.app().delete();
  }
}

if (require.main === module) {
  run().catch(error => {
    console.error(error instanceof Error ? error.message : 'Catalog update failed');
    process.exitCode = 1;
  });
}
