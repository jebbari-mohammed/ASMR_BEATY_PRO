import type { PurchasesStoreProduct } from 'react-native-purchases';

type TrialProduct = Pick<PurchasesStoreProduct, 'introPrice' | 'defaultOption'>;

/** Keep trial wording tied to an offer the store actually returned. */
export function trialPeriod(product: TrialProduct, platform: 'ios' | 'android', iosEligible = false): string | null {
  if (platform === 'ios') {
    return iosEligible && product.introPrice?.price === 0
      ? product.introPrice.period : null;
  }
  const phase = product.defaultOption?.freePhase;
  return phase?.price.amountMicros === 0 ? phase.billingPeriod.iso8601 : null;
}

export function trialPeriodLabel(period: string | null): string | null {
  const match = /^P([1-9]\d*)([DWMY])$/.exec(period ?? '');
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isSafeInteger(amount) || amount > 365) return null;
  const unit = { D: 'day', W: 'week', M: 'month', Y: 'year' }[match[2] as 'D' | 'W' | 'M' | 'Y'];
  return `${amount} ${unit}${amount === 1 ? '' : 's'}`;
}
