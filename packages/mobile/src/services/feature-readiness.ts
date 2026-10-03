/**
 * A feature is enabled only after its real data path and release checks exist.
 * These values are intentionally not controlled by a public environment flag.
 */
const ready: Record<'scan' | 'progress' | 'coach' | 'shelf', boolean> = {
  scan: false,
  progress: true,
  coach: false,
  shelf: true
};

export function isFeatureReady(feature: keyof typeof ready): boolean {
  return ready[feature];
}
