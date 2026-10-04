import type { PurchasesStoreProduct } from 'react-native-purchases';
import { trialPeriod, trialPeriodLabel } from '../store-trial-offer';

const product = (introPrice: unknown, defaultOption: unknown) => ({
  introPrice, defaultOption
}) as PurchasesStoreProduct;

test('iOS trial copy requires both a free introductory offer and confirmed eligibility', () => {
  const offered = product({ price: 0, period: 'P2W' }, null);
  expect(trialPeriod(offered, 'ios', true)).toBe('P2W');
  expect(trialPeriod(offered, 'ios', false)).toBeNull();
  expect(trialPeriod(product({ price: 1.99, period: 'P2W' }, null), 'ios', true)).toBeNull();
});

test('Android uses only the eligible default option returned by Play', () => {
  expect(trialPeriod(product(null, { freePhase: {
    price: { amountMicros: 0 }, billingPeriod: { iso8601: 'P10D' }
  } }), 'android')).toBe('P10D');
  expect(trialPeriod(product(null, { freePhase: null }), 'android')).toBeNull();
});

test('trial duration labels follow the store period and reject unknown formats', () => {
  expect(trialPeriodLabel('P10D')).toBe('10 days');
  expect(trialPeriodLabel('P2W')).toBe('2 weeks');
  expect(trialPeriodLabel('P1M')).toBe('1 month');
  expect(trialPeriodLabel('garbage')).toBeNull();
});
