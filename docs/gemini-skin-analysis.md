# Gemini 3.8 Flash Skin Analysis Pipeline

## 1. Executive Summary

The ASMR Beauty Pro skin visual-analysis pipeline uses Google's **Gemini 3.8 Flash** model exclusively. It analyzes standardized facial photographs and landmark crops according to fixed scoring rubrics (`SKIN_SCORING_RUBRIC_V1`), outputting strict structured JSON.

This system is strictly a **personal cosmetic skin coach**, not a medical diagnostic service or dermatologist substitute. It does not diagnose diseases, label cysts, or prescribe treatments.

---

## 2. Gemini Model Configuration

```text
Model:                   gemini-3.8-flash (pinned GA identifier)
Thinking Level:          MEDIUM (thinkingBudget: 1024)
Media Resolution:        HIGH (preserves fine pore & micro-texture detail without Ultra High token bloat)
Temperature:             0.7 (Follows Google recommended Gemini 3 defaults; not forced to 0)
Structured Output:       YES (responseMimeType: "application/json" with strict responseSchema)
Interaction Storage:     DISABLED (store: false). Gemini interaction storage disabled (`store:false`). Additional Google/Vertex logging and abuse-monitoring controls are governed by the production project configuration and applicable Google terms.
Search Grounding:        OFF
Maps Grounding:          OFF
External Web Tools:      OFF
Product Info in Scan:    NONE (zero commercial bias in visual analysis)
User Goals in Scan:      NONE (objective appearance observation only)
```

---

## 3. Capture & Region Crop Protocol

### Standardized Full Captures:
1. **FULL_FRONT**: Neutral resting expression, centered, eye-level daylight (5200K equivalent).
2. **FULL_LEFT**: Slight controlled head rotation (~15–20° turn).
3. **FULL_RIGHT**: Slight controlled head rotation (~15–20° turn).

### Deterministic Region Crops (Derived via Face Landmarks):
- **FOREHEAD**: Supraorbital to hairline central band.
- **LEFT_CHEEK**: Malar eminence to jawline.
- **RIGHT_CHEEK**: Malar eminence to jawline.
- **NOSE_T_ZONE**: Nasal bridge, tip, and immediate perinasal area.
- **CHIN**: Mentalis region below lower lip.
- **LEFT_UNDER_EYE**: Infraorbital contour and tear-trough.
- **RIGHT_UNDER_EYE**: Infraorbital contour and tear-trough.

---

## 4. Versioning Protocol

Every completed skin analysis persists immutable version metadata in Firestore (`users/{userId}/skinSnapshots/{snapshotId}`):

```json
{
  "provider": "gemini",
  "modelId": "gemini-3.8-flash",
  "scannerPromptVersion": "SKIN_SCANNER_PROMPT_V1",
  "scoringRubricVersion": "SKIN_SCORING_RUBRIC_V1",
  "captureProtocolVersion": "CAPTURE_PROTOCOL_V1",
  "cropProtocolVersion": "CROP_PROTOCOL_V1",
  "normalizationVersion": "NORMALIZATION_V1",
  "createdAt": "2026-09-04T12:00:00Z"
}
```

Auto-changing aliases such as `latest` are strictly forbidden to ensure historical measurements remain reproducible over months and years.

---

## 5. System Instruction (`SKIN_SCANNER_PROMPT_V1`)

```text
You are a cosmetic facial skin visual-analysis system.
Analyze only characteristics directly visible in the supplied standardized facial photographs.
The app is a cosmetic skincare coach, not a medical diagnostic service.
Never diagnose disease.
Never infer a medical condition.
Never infer internal skin biology that cannot be reliably observed visually.
Use the complete face photographs for context and the labeled facial-region crops for fine detail.
Apply the supplied scoring rubrics consistently.
Evaluate only the requested metrics.
If image quality prevents reliable evaluation of a metric, mark it unavailable or low reliability.
Never invent observations.
Return only the required structured output.
```

---

## 6. Metrics & Rubrics (`SKIN_SCORING_RUBRIC_V1`)

| Metric Key | Evaluated Cosmetic Feature | Visual Anchors (0–100 Scale) | Excluded Medical Claims |
| :--- | :--- | :--- | :--- |
| `visibleBlemishes` | Surface cosmetic spots, localized redness bumps, visible comedones | 0-10: Virtually none<br>31-50: Moderate in 2+ zones<br>71-90: Widespread | Cysts, boils, cystic disease, fungal acne diagnosis |
| `visibleRedness` | Surface cutaneous flushing, warmth, superficial erythema | 0-10: Calm even tone<br>31-50: Moderate mid-cheek flush<br>71-90: Strong persistent flush | Rosacea diagnosis, lupus, eczema, contact dermatitis |
| `visiblePores` | Visible follicular openings and pore definition | 0-10: Fine & indistinct<br>31-50: Moderate in central T-zone<br>71-90: Pronounced across cheeks | Ice pick scars, pathological scarring |
| `textureIrregularity`| Micro-surface roughness, dryness flakes, uneven grain | 0-10: Smooth glass-like<br>31-50: Moderate micro-roughness<br>71-90: Noticeable roughness | Keratosis pilaris, psoriasis pathology |
| `visibleSpotsOrUnevenTone` | Superficial post-blemish discoloration and pigment contrast | 0-10: Uniform cosmetic tone<br>31-50: Scattered faint spots<br>71-90: Dense discoloration | Melanoma, malignancy, dysplastic nevi, melasma disease |
| `surfaceShine` | Specular light reflection from superficial sebum sheen | 0-10: Matte finish<br>31-50: Moderate T-zone shine<br>71-90: Intense specular oiliness | Seborrhea disease diagnosis |
| `darkCircleAppearance`| Infraorbital shadow and cosmetic fatigue appearance | 0-10: Bright uniform tone<br>31-50: Moderate tear-trough shadow<br>71-90: Deep persistent darkness | Periorbital edema, allergic shiners |
| `fineLineAppearance`| Superficial micro-creasing and expression lines at rest | 0-10: Smooth at rest<br>31-50: Moderate shallow lines<br>71-90: Pronounced creasing | Atrophic disease, elastosis pathology |

---

## 7. Structured Output Schema

Gemini returns pure JSON conforming to this structure:

```json
{
  "usable": true,
  "metrics": {
    "visibleBlemishes": {
      "score": 28,
      "reliability": "high",
      "regions": ["CHIN"]
    },
    "visibleRedness": {
      "score": 34,
      "reliability": "high",
      "regions": ["LEFT_CHEEK", "RIGHT_CHEEK"]
    },
    "visiblePores": {
      "score": 42,
      "reliability": "high",
      "regions": ["NOSE_T_ZONE"]
    },
    "textureIrregularity": {
      "score": 22,
      "reliability": "medium",
      "regions": ["FOREHEAD"]
    },
    "visibleSpotsOrUnevenTone": {
      "score": 18,
      "reliability": "high",
      "regions": ["RIGHT_CHEEK"]
    },
    "surfaceShine": {
      "score": 35,
      "reliability": "high",
      "regions": ["NOSE_T_ZONE"]
    },
    "darkCircleAppearance": {
      "score": 30,
      "reliability": "medium",
      "regions": ["LEFT_UNDER_EYE", "RIGHT_UNDER_EYE"]
    },
    "fineLineAppearance": {
      "score": 15,
      "reliability": "medium",
      "regions": ["LEFT_UNDER_EYE"]
    }
  }
}
```

---

## 8. Server Validation & Safety Defense

Even though Gemini uses structured JSON generation, outputs are treated as untrusted input. The backend enforces:
1. **Zod Runtime Schema Validation** (`GeminiSkinScanOutputSchema.safeParse`).
2. **Numeric Boundary Guards**: Scores must be between 0 and 100 or explicitly `null`.
3. **Region Allowlist**: Only permitted facial region tokens are accepted.
4. **Zero Medical Content**: Free-form diagnostic fields are rejected.
5. **Controlled Single Retry**: If output is malformed or times out, one recovery call is attempted.
6. **Graceful Degradation**: If retry fails, the session is marked `FAILED_RETRYABLE` with user quota preserved.

---

## 9. Telemetry & Cost Economics

Every scan logs privacy-safe operational telemetry to Cloud Logging / Firestore:
- `inputTokens`: ~11,500–12,000 tokens (9 HIGH-resolution images @ ~1,120 tokens each = 10,080 visual tokens + ~1,850 prompt tokens)
- `outputTokens`: ~500–800 tokens (structured JSON schema output)
- `thinkingTokens`: ~512–1,024 tokens (MEDIUM thinking budget)
- `totalTokens`: ~12,500–13,000 tokens
- `estimatedCostUsd`: **~$0.010–$0.015 USD (~1 to 1.5 cents)** per full skin scan based on introductory rates ($0.75/1M input, $3.75/1M output)
- `latencyMs`: ~2,000–3,800 ms
- `pricingVersion`: `gemini-3.8-flash-intro-2026`

At approximately 1.2 cents per full scan, a subscriber running 4 weekly scans per month consumes approximately **~$0.05 USD/month** in AI visual inference, maintaining over **99% gross contribution margin** on the $6.99/month and $39.99/year subscription plans. Actual telemetry dynamically computes real costs from Gemini's returned token usage counts.
