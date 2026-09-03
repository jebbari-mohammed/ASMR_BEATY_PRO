# Affiliate Commerce Architecture & Trust Model

## 1. Product vs. Offer Separation

A skincare product is an independent physical formulation entity. Retail offers are separate merchant instances.

```
PRODUCT:
COSRX Advanced Snail 96 Mucin Power Essence (SKU: cosrx_snail_96)
  |
  +---> OFFER 1: iHerb ($18.50 USD, in stock, ships to US/CA/UK)
  +---> OFFER 2: YesStyle ($17.80 USD, in stock, ships to US/CA/AU)
  +---> OFFER 3: Sephora ($25.00 USD, out of stock)
```

## 2. Recommendation Ranking Principle: Fit > Commission

1. **Step 1 — Safety Filter:** Candidate must pass allergen, conflict, and sensitivity checks.
2. **Step 2 — Routine Compatibility:** Candidate must address a valid routine need without duplicating an existing owned step.
3. **Step 3 — User Preferences:** Country availability, budget tier, and fragrance preference.
4. **Step 4 — Best Retailer Resolution:** Best price + in-stock status + reliable shipping.
5. **Strict Constraint:** Affiliate commission percentage is NEVER used to outrank a safer or better-fitting product. Commission may only act as an internal tie-breaker between two identical products with the same price and in-stock status.

## 3. Affiliate Disclosure Policy

All recommendation screens, product cards, and checkout drawers display:
> *"We may earn a commission if you purchase through our links. This does not affect compatibility ranking."*

## 4. Privacy-Preserving Link Resolution

- **No Sensitive Data in URLs:** Affiliate tracking parameters contain only pseudonymous campaign tags (`subId=cmp_fb_001`). **Never** pass skin scores, photo IDs, user names, or health indicators to affiliate networks.
- **Server-Side Redirect Allowlist:** Clients call `POST /resolveAffiliateUrl { offerId }`. The server validates the merchant against an allowlist (`iherb.com`, `yesstyle.com`, `sephora.com`, `ulta.com`) before returning the signed redirect URL, preventing open redirect vulnerabilities.
