/** Compare regular store prices only. Never infer a discount from a hard-coded price. */
export function annualSavingsPercent(
  annual: { price: number; currencyCode: string; hasIntroOffer?: boolean } | null,
  monthly: { price: number; currencyCode: string; hasIntroOffer?: boolean } | null
): number | null {
  if (!annual || !monthly || annual.hasIntroOffer || monthly.hasIntroOffer) return null;
  if (annual.currencyCode !== monthly.currencyCode) return null;
  if (!Number.isFinite(annual.price) || !Number.isFinite(monthly.price) || annual.price <= 0 || monthly.price <= 0) return null;
  const twelveMonthlyPayments = monthly.price * 12;
  if (annual.price >= twelveMonthlyPayments) return null;
  const percent = Math.floor((1 - annual.price / twelveMonthlyPayments) * 100);
  return percent >= 5 && percent < 100 ? percent : null;
}
