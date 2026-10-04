# Historical product recommendation proposal

> **Historical proposal.** This recommendation engine, ingredient scoring,
> generated affiliate links, and sample catalog are not active. Current
> optional My Shelf product discovery is an unpersonalized admin-managed list;
> see [product-discovery-operations.md](product-discovery-operations.md).

## 1. Safety-First Architecture

The AI Skin Coach prioritizes **user trust and dermatological safety over affiliate conversions**. The conversational LLM never selects or invents products out of thin air.

```
[User Context: Skin Snapshot + Routine + Allergies + Goals + Symptoms]
                                |
                                v
                +-------------------------------+
                |   Deterministic SafetyEngine  |
                +---------------+---------------+
                                |
        +-----------------------+-----------------------+
        |                                               |
  [High-Risk Symptoms?]                           [Safe Candidates]
        |                                               |
        v                                               v
[Medical Escalation Notice]                    [Gemini Coach Service]
(Refer to Board-Certified                      (Generates "Why this product?"
       Dermatologist)                           and routine fit explanation)
                                                        |
                                                        v
                                              [Affiliate Offer Resolver]
                                              (Allowed Merchant Domains,
                                               Subid tracking, FTC Discl.)
```

---

## 2. Deterministic Filtering Rules (`SafetyEngine`)

Before candidate products reach Gemini, they must pass 5 deterministic gates in pure TypeScript:

1. **Medical Symptom Escalation Gate:**
   - If user reports symptoms such as severe pain, spontaneous bleeding, rapid swelling, or eye involvement, all product recommendations are suspended.
   - The user is provided a calm recommendation to consult a board-certified dermatologist.

2. **Allergen & Sensitivity Filter:**
   - Products containing ingredients listed in `user.reportedAllergies` or `user.reportedSensitivities` are strictly excluded.
   - Fragrance-free preferences are strictly enforced for sensitive profiles.

3. **Active Ingredient Conflict Matrix:**
   - Retinoids/Retinols cannot be paired simultaneously with strong exfoliating acids (AHA/BHA/PHA) or high-strength Vitamin C in the same routine step.
   - Prevents moisture barrier compromise and chemical irritation.

4. **Duplicate Step Prevention:**
   - If the user already owns an effective verified cleanser or sunscreen in their shelf, the system will not push duplicate items.

5. **No-Recommendation as a Valid State:**
   - When the user's routine is already optimal, or their skin barrier needs rest, the system responds:
     > *"You don't need another product right now. Your routine already covers all essential steps."*
   - Building long-term trust is prioritized over a single affiliate kickback.

---

## 3. Product Catalog Schema

Products are stored in Firestore under `/products/{productId}` with immutable verified ingredient lists:

```typescript
interface Product {
  id: string;
  brand: string;
  name: string;
  category: "cleanser" | "moisturizer" | "sunscreen" | "treatment" | "serum" | "oil";
  ingredientList: string[];
  keyIngredients: string[];
  usageDirections: string;
  contraindications?: string[];
  fragranceFree: boolean;
  routineStep: "CLEANSE" | "TREAT" | "HYDRATE" | "PROTECT";
  amPm: "AM" | "PM" | "BOTH";
  priceRange: "BUDGET" | "MID" | "PREMIUM";
  verified: boolean;
}
```

The curated starter catalog includes widely accessible skincare essentials:
- **Cleansers:** CeraVe Hydrating Facial Cleanser, Vanicream Gentle Facial Cleanser, La Roche-Posay Toleriane
- **Moisturizers:** CeraVe PM Facial Moisturizing Lotion, SoonJung 2x Barrier Intensive Cream, Illiyoon Ceramide Ato
- **Sunscreen:** Beauty of Joseon Relief Sun (SPF50+ PA++++), Skin1004 Hyalu-Cica Water-Fit Sun Serum, EltaMD UV Clear
- **Barrier Treatments:** La Roche-Posay Cicaplast Baume B5+

---

## 4. Affiliate Monetization & Security

### Merchant Allowlist & Phishing Protection
To prevent open redirects or phishing, all affiliate links are generated server-side via `AffiliateResolver` against an approved merchant host allowlist:
- `iherb.com` (Subdomain: `www.iherb.com`)
- `yesstyle.com` (Subdomain: `www.yesstyle.com`)
- `sephora.com`
- `ulta.com`
- `amazon.com` (Subdomains: `www.amazon.com`, `amzn.to`)

### Ranking Integrity Guarantee
- **Rule:** Best product fit FIRST, best retailer option SECOND.
- Product rankings are strictly determined by skin compatibility, safety scores, and user budget.
- Affiliate commission percentage has **zero** weight in product ranking.

### FTC & Legal Disclosures
Every recommendation card and checkout modal prominently renders:
> *"We may earn a commission if you purchase through our links. Commission does not affect compatibility ranking."*
