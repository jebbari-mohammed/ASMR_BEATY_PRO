import { readFile } from 'node:fs/promises';
import {
  generateImpactManifest, impactProgramUrl, impactRequest, validateDirectImport,
  verifyUltaProgram, writePrivateImpactManifest
} from './impact-product-links.js';

function options(args: string[]): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i += 1) {
    const key = args[i];
    if (key === '--apply') {
      if (result[key]) throw new Error('Duplicate --apply');
      result[key] = true;
      continue;
    }
    if (!['--program', '--file', '--output'].includes(key) ||
        result[key] !== undefined || !args[i + 1] || args[i + 1].startsWith('--')) {
      throw new Error('Unexpected or incomplete option');
    }
    result[key] = args[++i];
  }
  return result;
}

function required(values: Record<string, string | boolean>, key: string): string {
  const value = values[key];
  if (typeof value !== 'string' || !value) throw new Error(`Required option: ${key}`);
  return value;
}

async function main(): Promise<void> {
  const values = options(process.argv.slice(2));
  const programId = required(values, '--program');
  const inputPath = required(values, '--file');
  const outputPath = required(values, '--output');
  if (inputPath === outputPath) throw new Error('Input and output paths must differ');
  const products = validateDirectImport(JSON.parse(await readFile(inputPath, 'utf8')) as unknown);
  const sid = process.env.IMPACT_SID ?? '';
  const token = process.env.IMPACT_TOKEN ?? '';
  const request = impactRequest({ sid, token });
  if (!values['--apply']) {
    // No link-creation POST or output file during this read-only preflight.
    verifyUltaProgram(await request(impactProgramUrl(sid, programId), 'GET'), programId);
    process.stdout.write(`Ready to request ${products.length} Ulta product links from an active, deep-link-enabled program. No links generated or published.\n`);
    return;
  }
  const { manifest, approvalPreview } = await generateImpactManifest(products, programId, sid, request);
  await writePrivateImpactManifest(outputPath, manifest);
  process.stdout.write(`Saved ${manifest.products.length} generated product links to an owner-only file. No catalog published.\n`);
  process.stdout.write(`Review and approve exact tracking host/query keys: ${approvalPreview.map(item => `${item.host} (${item.allowedQueryKeys.join(',') || 'no query keys'})`).join('; ')}\n`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Impact manifest generation failed');
  process.exitCode = 1;
});
