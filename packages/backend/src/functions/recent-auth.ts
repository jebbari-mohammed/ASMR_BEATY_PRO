import { HttpsError } from 'firebase-functions/v2/https';

const MAX_AUTH_AGE_SECONDS = 5 * 60;

/** Admin account deletion must preserve the client SDK's recent-login boundary. */
export function requireRecentAuthentication(authTime: unknown, nowMs = Date.now()): void {
  const nowSeconds = Math.floor(nowMs / 1000);
  if (typeof authTime !== 'number' || !Number.isSafeInteger(authTime) ||
      authTime <= 0 || authTime > nowSeconds || nowSeconds - authTime > MAX_AUTH_AGE_SECONDS) {
    throw new HttpsError('failed-precondition', 'Sign in again before deleting your account.');
  }
}
