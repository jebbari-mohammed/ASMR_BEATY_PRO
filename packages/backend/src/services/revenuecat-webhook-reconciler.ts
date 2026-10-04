import type * as admin from 'firebase-admin';
import type { StoreVerifiedEntitlement } from './revenuecat-verifier.js';

const MAX_APP_USERS_PER_EVENT = 32;
const RECONCILIATION_CONCURRENCY = 8;
const ANONYMOUS_ID_PREFIX = '$RCAnonymousID:';

export class InvalidRevenueCatWebhookError extends Error {
  constructor() {
    super('Invalid RevenueCat webhook identities.');
  }
}

/**
 * RevenueCat sends TRANSFER for the destination only, without app_user_id.
 * Other events can name an anonymous ID while the Firebase UID is an alias.
 * Reconcile every affected app account from current store state, never from
 * the event's claimed entitlement or expiration.
 */
export function revenueCatWebhookUserIds(value: unknown): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new InvalidRevenueCatWebhookError();
  }
  const event = value as Record<string, unknown>;
  if (typeof event.type !== 'string' || !event.type) {
    throw new InvalidRevenueCatWebhookError();
  }

  const candidates: unknown[] = [];
  const addOptional = (field: string) => {
    const candidate = event[field];
    if (candidate !== undefined && candidate !== null) candidates.push(candidate);
  };
  const addArray = (field: string, required: boolean) => {
    const candidate = event[field];
    if (candidate === undefined || candidate === null) {
      if (required) throw new InvalidRevenueCatWebhookError();
      return;
    }
    if (!Array.isArray(candidate) || (required && candidate.length === 0)) {
      throw new InvalidRevenueCatWebhookError();
    }
    for (const id of candidate) candidates.push(id);
  };

  if (event.type === 'TRANSFER') {
    addArray('transferred_from', true);
    addArray('transferred_to', true);
  } else {
    addOptional('app_user_id');
    addOptional('original_app_user_id');
    addArray('aliases', false);
    if (event.type === 'PURCHASE_REDEEMED') {
      addArray('redeemed_from', false);
      addArray('redeemed_by', false);
    }
  }
  if (candidates.length === 0) throw new InvalidRevenueCatWebhookError();

  const ids = new Set<string>();
  for (const candidate of candidates) {
    // RevenueCat subscriber IDs can be anonymous or custom identifiers that
    // are not Firebase UIDs. Only an existing Auth user is reconciled below.
    if (typeof candidate !== 'string') throw new InvalidRevenueCatWebhookError();
    if (!candidate || candidate.length > 128 ||
        candidate.includes('/') || candidate === '.' || candidate === '..' ||
        candidate.startsWith(ANONYMOUS_ID_PREFIX)) continue;
    ids.add(candidate);
    if (ids.size > MAX_APP_USERS_PER_EVENT) {
      throw new InvalidRevenueCatWebhookError();
    }
  }
  return [...ids];
}

export class RevenueCatWebhookReconciler {
  constructor(
    private readonly auth: admin.auth.Auth,
    private readonly verify: (userId: string) => Promise<StoreVerifiedEntitlement>,
    private readonly cache: (userId: string, verified: StoreVerifiedEntitlement, eventType: string) => Promise<boolean>
  ) {}

  async reconcile(event: unknown): Promise<number> {
    const ids = revenueCatWebhookUserIds(event);
    const eventType = (event as { type: string }).type;
    let reconciled = 0;
    let firstFailure: unknown;
    for (let offset = 0; offset < ids.length; offset += RECONCILIATION_CONCURRENCY) {
      // Limit vendor and Auth requests per webhook. Wait for every request in
      // this batch before returning an error, so a retry cannot race an
      // unfinished write from the previous delivery.
      const results = await Promise.allSettled(ids.slice(offset, offset + RECONCILIATION_CONCURRENCY)
        .map(async userId => {
          try {
            await this.auth.getUser(userId);
          } catch (error) {
            if ((error as { code?: string })?.code === 'auth/user-not-found') return false;
            throw error;
          }
          const verified = await this.verify(userId);
          return this.cache(userId, verified, eventType);
        }));
      for (const result of results) {
        if (result.status === 'rejected') {
          firstFailure ??= result.reason;
        } else if (result.value) {
          reconciled += 1;
        }
      }
    }
    // A failed identity does not starve later aliases. RevenueCat will retry
    // the whole event; ordered cache writes make the repeated work safe.
    if (firstFailure !== undefined) throw firstFailure;
    return reconciled;
  }
}
