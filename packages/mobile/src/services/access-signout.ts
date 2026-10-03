/** No durable cleanup guard exists, so changing accounts could expose old data. */
export class UnsafeLocalCleanupError extends Error {}

/** Complete Firebase sign-out when failed local cleanup is safely quarantined. */
export async function signOutServices(
  clearLocalData: () => Promise<void>,
  forgetStoreIdentity: () => Promise<void>,
  signOutFirebase: () => Promise<void>
): Promise<{ localCleanupFailed: boolean }> {
  let localCleanupFailed = false;
  try { await clearLocalData(); }
  catch (cause) {
    if (cause instanceof UnsafeLocalCleanupError) throw cause;
    localCleanupFailed = true;
  }
  await signOutFirebase();
  // The authenticated session is already closed. Native store logout can stall
  // offline, so let the UI leave loading while the SDK finishes in background.
  try { void forgetStoreIdentity().catch(() => undefined); }
  catch { /* Firebase Auth is the sign-out boundary. */ }
  return { localCleanupFailed };
}
