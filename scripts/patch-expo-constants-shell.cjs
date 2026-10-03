const fs = require('node:fs');
const path = require('node:path');

// Expo Constants 57.0.19's iOS app-config script treats a project path with
// spaces as several basename arguments, then silently skips manifest creation.
// Keep the narrow fix reproducible after npm ci and on EAS builders.
const packageRoot = path.dirname(require.resolve('expo-constants/package.json'));
const scriptPath = path.join(packageRoot, 'scripts', 'get-app-config-ios.sh');
const original = fs.readFileSync(scriptPath, 'utf8');
const before = 'PROJECT_DIR_BASENAME=$(basename $PROJECT_DIR)';
const after = 'PROJECT_DIR_BASENAME=$(basename "$PROJECT_DIR")';

if (original.includes(after)) {
  process.exit(0);
}
if (!original.includes(before)) {
  throw new Error(`Expo Constants iOS script changed; inspect ${scriptPath} before building.`);
}
fs.writeFileSync(scriptPath, original.replace(before, after));
console.log('Patched Expo Constants iOS manifest generation for paths with spaces.');
