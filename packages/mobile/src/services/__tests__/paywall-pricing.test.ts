import { annualSavingsPercent } from '../paywall-pricing';

test('calculates conservative savings from same-currency store prices', () => {
  expect(annualSavingsPercent({ price: 39.99, currencyCode: 'USD' }, { price: 6.99, currencyCode: 'USD' })).toBe(52);
});

test('hides savings when prices cannot be compared honestly', () => {
  expect(annualSavingsPercent({ price: 60, currencyCode: 'USD' }, { price: 5, currencyCode: 'USD' })).toBeNull();
  expect(annualSavingsPercent({ price: 39.99, currencyCode: 'USD' }, { price: 6.99, currencyCode: 'EUR' })).toBeNull();
  expect(annualSavingsPercent({ price: 39.99, currencyCode: 'USD', hasIntroOffer: true }, { price: 6.99, currencyCode: 'USD' })).toBeNull();
});
