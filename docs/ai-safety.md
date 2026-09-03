# AI Safety, Grounding & Medical Boundary Policies

## 1. Product Positioning & Medical Boundaries

1. **Not a Medical Device:** The application is strictly positioned as **YOUR PERSONAL AI SKIN COACH**. It does NOT diagnose skin diseases, cure infections, or prescribe pharmaceuticals.
2. **Cosmetic Framing:** All user-facing vocabulary uses appearance-oriented language:
   - "Visible redness appearance" (never "erythema" or "rosacea")
   - "Visible blemishes" (never "cystic acne" or "papules")
   - "Texture appearance" and "visible pore appearance"
   - "Uneven tone appearance" (never "melasma" or "hyperpigmentation disease")
3. **Regulatory Disclaimers:** Every screen with recommendations or scans features the mandatory disclosure:
   > *"This app is not a medical device and does not diagnose, treat, cure, or prevent any medical condition. Recommendations are for cosmetic and skincare routine organization purposes only."*

## 2. Recommendation Safety Pipeline

```
+---------------------+     +----------------------+     +----------------------+
|    User Profile     |  +  | Current Routine &    |  +  |  Reported Allergies  |
| (Skin Type, Goals)  |     |  Owned Shelf Items   |     |    & Sensitivities   |
+----------+----------+     +----------+-----------+     +----------+-----------+
           |                           |                            |
           +---------------------------+----------------------------+
                                       |
                                       v
                     +----------------------------------+
                     |  Deterministic Safety Engine     |
                     |  - High-risk symptom detector    |
                     |  - Allergen filter (INCI match)  |
                     |  - Active conflict matrix        |
                     |  - Step redundancy filter        |
                     +-----------------+----------------+
                                       |
                                       v
                     +----------------------------------+
                     | Approved Candidate Product IDs   |
                     | (0, 1, or maximum 3 vetted SKUs) |
                     +-----------------+----------------+
                                       |
                                       v
                     +----------------------------------+
                     |   AI Reasoning / Explanation     |
                     |  (GPT-4o-mini with Strict JSON)  |
                     |  - Explains WHY it fits routine  |
                     |  - Cannot introduce new SKU IDs  |
                     +-----------------+----------------+
                                       |
                                       v
                     +----------------------------------+
                     | Server-Side Schema Validation    |
                     | (Discard if SKU not in approved) |
                     +----------------------------------+
```

## 3. High-Risk / Emergency Escalation Protocol

If user-entered text or check-ins report:
- Severe or throbbing pain
- Sudden or significant swelling
- Bleeding, oozing, or pus
- Signs of acute infection or fever
- Rapidly changing, asymmetrical, or dark lesions
- Severe allergic swelling around eyes or throat

**The system immediately short-circuits:**
1. Zero products are recommended.
2. The UI renders a calm, supportive medical referral card directing the user to a board-certified dermatologist or emergency medical professional.
3. An audit record is created noting `requiresHumanCareSuggestion = true`.

## 4. Non-Causality & Memory Rules

When comparing scans or logging progress over time:
- The app uses probabilistic, non-definitive wording:
  - *Correct:* "Your visible redness appears slightly lower than your previous baseline."
  - *Forbidden:* "Your skin is healed."
- When routine changes correlate with appearance changes:
  - *Correct:* "You started Product X around the same period you began reporting more irritation. Timing alone doesn't prove causation. Consider simplifying your routine."
  - *Forbidden:* "Product X caused your redness."
