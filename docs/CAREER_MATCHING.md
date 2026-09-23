# Career Matching

This document covers the 129-career database, the four dimensions used to match a student to careers, and the weighted formula that produces each match score.

---

## For Clients: How career matching works

### The 129-career database

Jumpstride maintains a curated list of **129 careers** spanning 12 categories. Each career has a "fingerprint" describing the kind of person who tends to do well in it — primary interests, dominant intelligence types, key aptitudes, and the EQ traits the role rewards.

The 12 categories:

1. Science & Research
2. Technology & Engineering
3. Healthcare & Medicine
4. Creative & Arts
5. Writing & Communication
6. Education & Social Services
7. Business & Entrepreneurship
8. Law, Policy & Public Service
9. Finance & Accounting
10. Nature & Environment
11. Skilled Trades & Applied Work
12. Sports, Fitness & Performing Arts

Careers were sourced from the `career_aptitude_mapping` reference (a vetted mapping of careers to psychometric dimensions used in Indian career counselling practice). Each entry was manually mapped to Holland Codes, Multiple Intelligence types, aptitude sections, and EQ competencies based on the work the career actually involves.

### The four dimensions explained

Match scores combine four signals, each carrying a specific weight in the final compatibility number.

#### 1. Holland Codes (35% weight) — what interests you

The Holland system describes vocational interests in six themes. Most careers lean on one or two of these.

| Code | Theme | Everyday example |
|---|---|---|
| **R** | Realistic | "If you score high on Realistic, careers like engineering, agriculture, and skilled trades match — anything where you build, fix, or work with your hands." |
| **I** | Investigative | "If you score high on Investigative, careers like research, medicine, and data science match — anything that asks 'why' and 'how does this work?'" |
| **A** | Artistic | "If you score high on Artistic, careers like design, writing, performance, and architecture match — anything that calls for expression and originality." |
| **S** | Social | "If you score high on Social, careers like counselling, teaching, and healthcare match — anything where you help, support, or develop other people." |
| **E** | Enterprising | "If you score high on Enterprising, careers like business, sales, law, and politics match — anything that involves influence, persuasion, and leadership." |
| **C** | Conventional | "If you score high on Conventional, careers like accounting, banking, and administration match — anything that rewards structure, precision, and reliable systems." |

#### 1b. Acquiescence correction — why a "yes to everything" student still gets a focused result

The six Holland interest scores have one failure mode worth calling out. The interest questions are all positively worded ("I enjoy leading a team", "I like solving puzzles"), so a high-energy student who answers *everything* enthusiastically scores high on all six themes at once — and the most outgoing themes (Enterprising, Social) inflate the most. Left uncorrected, that collapses the interest signal: every enthusiastic student looks Enterprising/Social and is pushed toward the same cluster of business and sales careers regardless of what they actually prefer.

To prevent this, each student's six interest scores are **re-centered on their own average** before matching. A student whose scores are all high becomes flat (no false Enterprising lean); a student who genuinely prefers Investigative work over everything else keeps — and sharpens — that lean. Career direction is decided by the *shape* of your interests, not by how agreeable you were with the questions.

#### 2. Multiple Intelligences (25% weight) — how your mind works best

Drawn from Howard Gardner's framework. Most people are strong in two or three of these and weaker in the others.

| Intelligence | Everyday example |
|---|---|
| **Logical-Math** | "High Logical-Math points to engineering, finance, programming — careers where reasoning with numbers and abstract structures is the main work." |
| **Linguistic** | "High Linguistic points to writing, journalism, law, teaching — careers where language is the tool of the trade." |
| **Spatial** | "High Spatial points to architecture, design, surgery — careers where you have to see in 3D, mentally rotate objects, or work from diagrams." |
| **Musical** | "High Musical points to performance, composition, sound engineering, music therapy." |
| **Bodily-Kinesthetic** | "High Bodily-Kinesthetic points to surgery, athletics, dance, skilled trades — careers where precise physical control matters." |
| **Interpersonal** | "High Interpersonal points to counselling, sales, management, teaching — careers built on reading and influencing people." |
| **Intrapersonal** | "High Intrapersonal points to writing, psychology, entrepreneurship — careers that need strong self-reflection and self-direction." |
| **Naturalistic** | "High Naturalistic points to environmental science, biology, veterinary medicine — careers tied to natural systems and living things." |

#### 3. Aptitudes (30% weight) — the skills the algorithm could measure objectively

These come from your Section 4 aptitude battery — actual right-or-wrong test items, not self-assessment.

| Aptitude | Everyday example |
|---|---|
| **Verbal** | "Strong verbal reasoning → law, journalism, teaching, public relations." |
| **Numerical** | "Strong numerical ability → engineering, finance, science." |
| **Abstract** | "Strong abstract reasoning → research, programming, mathematics." |
| **Spatial Relations** | "Strong spatial reasoning → architecture, surgery, mechanical engineering." |
| **Mechanical** | "Strong mechanical reasoning → engineering, trades, technical fields." |
| **Clerical** | "Strong clerical accuracy → administration, data entry, quality control." |
| **Critical Thinking** | "Strong critical thinking → law, research, leadership, analysis." |
| **Problem Solving** | "Strong problem solving → engineering, consulting, entrepreneurship." |

#### 4. Emotional Intelligence (10% weight) — the human-side skills

EQ matters for long-term success in most fields, so it earns a place in the formula — but it's deliberately the lightest of the four. Social Skills and Motivation run high for almost every sociable student and are listed as a requirement on a large share of careers, so a heavier EQ weight added a flat lift that floated every business/people career (Sales Manager especially) to the top regardless of a student's real interests. Keeping EQ light lets the interest, intelligence, and aptitude signals decide direction.

| Competency | Everyday example |
|---|---|
| **Empathy** | "High Empathy → counselling, healthcare, social work, teaching — fields where understanding what another person is feeling is the whole job." |
| **Motivation** | "High Motivation → entrepreneurship, research, athletics — fields with long timelines and no one telling you what to do next." |
| **Self-Regulation** | "High Self-Regulation → leadership, surgery, finance — fields where staying calm and methodical under pressure matters." |
| **Social Skills** | "High Social Skills → sales, management, public relations, diplomacy." |
| **Self-Awareness** | "High Self-Awareness → counselling, writing, psychology — fields that need accurate self-reflection." |

### How to read a career card

Each recommendation in your results appears as a card. Anatomy:

- **Title** (e.g., "Software Engineer") — the career name
- **Match badge** (e.g., "87% Match") — your overall compatibility score for this career
- **Category badge** (e.g., "Technology & Engineering") — which of the 12 groups it belongs to
- **Match bar** — visual representation of the percentage
- **Skills tags** — the dominant intelligences and aptitudes this career draws on
- **"Why this matched you"** — an expandable section with four lines (Interests, Intelligence, Aptitude, EQ) explaining the specific signals from your profile that lifted this career to your top recommendations
- **Salary range / View Details** — supplementary content for context

### What a match percentage means

| Range | Reading |
|---|---|
| **80-100%** | Strong fit. Your profile aligns with this career on at least three of the four dimensions. Worth serious exploration. |
| **60-79%** | Solid alignment. The career suits your profile but not as strongly as your top recommendations. Worth a look. |
| **40-59%** | Mixed signal. Some dimensions align, others don't. Possible but you'd be working against your grain on at least one front. |
| **Below 40%** | Weak fit. Career-wise this isn't where your strengths point. Doesn't mean impossible — many people succeed in fields that don't match their initial profile — but it would require deliberate effort to develop the missing dimensions. |

### What to do with your career recommendations

Career recommendations are a **starting point**, not a verdict. Use them this way:

1. **Read the top 3-5 careers carefully.** Don't fixate on the #1 — careers #2 through #5 often suit your profile almost as well and may be a better fit for your context (location, family expectations, financial reality).
2. **Open each "Why this matched you" section.** Understanding *why* a career matched is more useful than the score itself. If the algorithm says "Strong intelligence signals in Logical-Math and Spatial" and that resonates with how you actually think, the match is real signal.
3. **Look across categories.** If three of your top five careers are in Technology & Engineering and the other two are in Science & Research, that's a clear theme. If they're scattered across five different categories, your interests may be more general — and you may want to discuss it with a counsellor before narrowing down.
4. **Use it in counselling.** The recommendations work best as a structured starting point for a conversation with a career counsellor, parent, or mentor. The algorithm shows your aptitude and interest patterns; a human can layer in the local job market, family constraints, and your individual situation.

---

## For Developers: Career Matching Implementation

### Data source: `careerMappingData.js`

[backend/data/careerMappingData.js](../backend/data/careerMappingData.js)

Exports `CAREER_MAPPINGS` — an array of 129 career objects, plus the supporting constants used by the matcher:

```js
export const CAREER_MAPPINGS = [
  {
    title:             "Software Developer / Engineer",
    category:          "Technology & Engineering",
    hollandCodes:      ["I", "R"],                              // primary first
    intelligenceTypes: ["Logical-Math"],
    aptitudeStrengths: ["Abstract", "Numerical", "Problem Solving"],
    eqCompetencies:    ["Self-Regulation"]
  },
  // ... 124 more
];

export const HOLLAND_CODES        = ["R", "I", "A", "S", "E", "C"];
export const INTELLIGENCE_TYPES   = ["Logical-Math", "Linguistic", "Spatial", ...];  // 8 names
export const APTITUDE_SECTIONS    = ["Verbal", "Numerical", "Abstract", ...];        // 8 names
export const EQ_COMPETENCIES      = ["Empathy", "Motivation", ...];                  // 5 names
```

### Required fields for a new career entry

To add a career, append an object to `CAREER_MAPPINGS` with these fields:

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | yes | Display name. Used as the key in `careerDetails.js` — must match if you want detail-page content too. |
| `category` | string | yes | Must match one of the 12 entries in `CAREER_CATEGORIES`. |
| `hollandCodes` | string[] | yes | 1-3 codes, ordered primary first. Valid values: R/I/A/S/E/C. |
| `intelligenceTypes` | string[] | yes | 1+ names from `INTELLIGENCE_TYPES`. Case-sensitive — match the constant exactly. |
| `aptitudeStrengths` | string[] | yes | 1+ names from `APTITUDE_SECTIONS`. Case-sensitive. |
| `eqCompetencies` | string[] | yes | 1+ names from `EQ_COMPETENCIES`. Case-sensitive. |

After adding a career, no other code changes are required — the matcher reads `CAREER_MAPPINGS` directly. To add a `careerDetails` entry for the detail page, update [frontend/src/data/careerDetails.js](../frontend/src/data/careerDetails.js) too.

### Question-to-career-dimension mapping

The four buckets the matcher consumes (`hollandProfile`, `multipleIntelligences`, `aptitudeScores`, `eqProfile`) are populated upstream by the section scorers from these question ranges:

**Holland Codes (weight 0.35)** — from Section 3 Interest Assessment (Q201–Q236, 6 questions per code, Likert 1–5 averaged then converted to 0–100).

| Code | Questions | Theme |
|---|---|---|
| R — Realistic | Q201–Q206 | Hands-on, build/fix/operate |
| I — Investigative | Q207–Q212 | Research, analyse, "why does this work?" |
| A — Artistic | Q213–Q218 | Express, create, design |
| S — Social | Q219–Q224 | Help, support, develop people |
| E — Enterprising | Q225–Q230 | Influence, persuade, lead |
| C — Conventional | Q231–Q236 | Structure, precision, systems |

The Q201–Q236 items above are Likert (1–5, **averaged** per code), then **acquiescence-corrected** (ipsatized) before matching — see the "Acquiescence correction" client note above and `ipsatizeInterestScores` in [career500q.js](../backend/utils/scoring/packageScoring/career500q.js). In addition, the **Activity Preferences block (Q255–Q272) also feeds the Holland scores** — but by **point-accumulation, not averaging**: each A/B/C choice maps to a Holland type, and each pick adds one point to that type. The accumulated tallies are blended into the six RIASEC interest scores (see [ALGORITHM.md — Preference scoring](ALGORITHM.md#preference-scoring-point-accumulation)). The 18 questions cycle through six recurring dimensions. These rows were **rebalanced** so all six Holland codes are reachable — the earlier mapping left Conventional unreachable (0 slots) and Enterprising barely reachable (6); each code now gets equal coverage (9 of 54 slots):

| Dimension (questions) | Option A → | Option B → | Option C → |
|---|---|---|---|
| Stream Indicators (Q255, 261, 267) | Realistic | Social | Investigative |
| Holland Type (Q256, 262, 268) | Investigative | Enterprising | Artistic |
| Work Style (Q257, 263, 269) | Artistic | Conventional | Realistic |
| Career Focus (Q258, 264, 270) | Social | Realistic | Enterprising |
| Activity Type (Q259, 265, 271) | Enterprising | Investigative | Conventional |
| Environment (Q260, 266, 272) | Conventional | Artistic | Social |

Two further Section 3 preference blocks shape the interest profile but are **not** Holland buckets fed to the matcher: **Subject Preferences (Q237–Q254)** are interest-rated 1–5 and **averaged** into four subject clusters (STEM, Humanities, Arts, Social Sciences); **Work Environment (Q273–Q290)** options each map (via an explicit per-question `optionProfileMap`) to one of four work-environment preference profiles (Research / Collaborative / Dynamic / Creative) by point-accumulation — every option maps to exactly one profile. The per-option mapping for every Section 3 preference question is printed in [`backend/exports/section3-interest-assessment.md`](../backend/exports/section3-interest-assessment.md).

**Multiple Intelligences (weight 0.25)** — from Section 2 (Q121–Q200, 10 questions per intelligence, Likert averaged and normalised to 0–100).

| Intelligence | Questions |
|---|---|
| Logical-Mathematical | Q121–Q130 |
| Linguistic-Verbal | Q131–Q140 |
| Spatial-Visual | Q141–Q150 |
| Musical-Rhythmic | Q151–Q160 |
| Bodily-Kinesthetic | Q161–Q170 |
| Interpersonal | Q171–Q180 |
| Intrapersonal | Q181–Q190 |
| Naturalistic | Q191–Q200 |

**Aptitude Scores (weight 0.30)** — from Section 4 (Q291–Q450). Each subsection is graded objectively: `score = (correctCount / scorableCount) × 100`. Subsection ranges:

| Aptitude | Questions |
|---|---|
| Verbal Reasoning | Q291–Q315 |
| Numerical Ability | Q316–Q340 |
| Abstract Reasoning | Q341–Q365 |
| Spatial Relations | Q366–Q390 |
| Mechanical Reasoning | Q391–Q410 |
| Clerical Speed & Accuracy | Q411–Q430 |
| Critical Thinking | Q431–Q440 |
| Problem Solving | Q441–Q450 |

**EQ Competencies (weight 0.10)** — from Section 5 Emotional Intelligence Assessment (Q451–Q500, 10 questions per competency, Likert averaged and normalised to 0–100).

| Competency | Questions |
|---|---|
| Self-Awareness | Q451–Q460 |
| Self-Regulation | Q461–Q470 |
| Motivation | Q471–Q480 |
| Empathy | Q481–Q490 |
| Social Skills | Q491–Q500 |

Section 1 (Personality) does **not** feed the career matcher directly — its OCEAN + EQ-derived MBTI type is presented in the report as self-understanding context. The matcher works off the four objective + behavioural buckets above. See [PERSONALITY_ASSESSMENT.md — Personality × career matching](PERSONALITY_ASSESSMENT.md#personality--career-matching--current-state) for the design rationale.

### `matchCareers(profile, topN = 10)` — input/output contract

[backend/utils/scoring/careerMatcher.js](../backend/utils/scoring/careerMatcher.js)

**Input — `profile`** (any missing field defaults to neutral score 50):

```js
{
  hollandProfile: {
    R: 65, I: 92, A: 35, S: 40, E: 55, C: 70   // 0-100 each
  },
  multipleIntelligences: {
    "Logical-Math": 90, "Linguistic": 55, "Spatial": 70, "Musical": 30,
    "Bodily-Kinesthetic": 35, "Interpersonal": 50,
    "Intrapersonal": 65, "Naturalistic": 60      // 0-100 each
  },
  aptitudeScores: {
    "Verbal": 60, "Numerical": 95, "Abstract": 90, "Spatial Relations": 75,
    "Mechanical": 55, "Clerical": 45,
    "Critical Thinking": 85, "Problem Solving": 80   // 0-100 each
  },
  eqProfile: {
    "Self-Awareness": 65, "Self-Regulation": 85, "Motivation": 80,
    "Empathy": 50, "Social Skills": 55                // 0-100 each
  }
}
```

**Input — `topN`**: integer 1-129, clamped automatically. Defaults to 10 for the full test; the demo wrapper passes 6.

**Output**: array of `topN` careers sorted by `score` descending (ties broken alphabetically by title):

```js
[
  {
    title:             "Pharmacologist",
    category:          "Science & Research",
    score:             89.2,                          // 0-100, one decimal
    matchPercent:      89,                            // legacy alias = Math.round(score)
    hollandCodes:      ["I"],
    intelligenceTypes: ["Logical-Math"],
    aptitudeStrengths: ["Numerical", "Critical Thinking"],
    eqCompetencies:    ["Motivation"],
    breakdown: {
      hollandMatch:        92,
      intelligenceMatch:   90,
      aptitudeMatch:       90,
      eqMatch:             80
    },
    matchReasons: {
      holland:      "Your dominant interest code I (Investigative) aligns with this path.",
      intelligence: "Strong intelligence signals in Logical-Math.",
      aptitude:     "Strong aptitude scores in Numerical and Critical Thinking.",
      eq:           "High EQ in Motivation."
    },
    description:  "",       // reserved for future per-career copy
    skills:       [...],    // de-duped union of intelligenceTypes + aptitudeStrengths (max 6)
    salaryRange:  "",       // reserved
    link:         ""        // reserved
  },
  // ... topN - 1 more
]
```

### Scoring formula

```
careerScore = hollandMatch       × 0.35
            + intelligenceMatch  × 0.25      // peak-rewarded (see below)
            + aptitudeMatch      × 0.30      // peak-rewarded (see below)
            + eqMatch            × 0.10
```

Weights are frozen in `CAREER_MATCH_WEIGHTS`:

```js
export const CAREER_MATCH_WEIGHTS = Object.freeze({
  holland:      0.35,
  intelligence: 0.25,
  aptitude:     0.30,   // nudged up: objective + most discriminating signal
  eq:           0.10    // cut down: high-baseline, was a flat people-skills lift
});
```

Sum = 1.0. If you change a weight, change `careerScore`'s expected range too (currently the implementation clamps to 0-100 after combining).

### Worked example — Software Engineer

Given a student profile:

```
hollandProfile:        I = 85,  R = 72,  A = 38,  S = 45,  E = 55,  C = 60
multipleIntelligences: Logical-Math = 90,  Spatial-Visual = 75,  ...
aptitudeScores:        Numerical = 88,  Abstract = 80,  Problem Solving = 78
eqProfile:             Self-Regulation = 70,  Motivation = 75,  ...
```

And the career fingerprint for **Software Engineer**:

```
hollandCodes:      ["I", "R"]                          // I = primary, R = secondary
intelligenceTypes: ["Logical-Math", "Spatial-Visual"]
aptitudeStrengths: ["Numerical", "Abstract"]
eqCompetencies:    ["Self-Regulation", "Motivation"]
```

**Holland match** — primary-dominant (primary × 0.75 + secondary-avg × 0.25):

```
hollandMatch = 85 × 0.75 + 72 × 0.25  =  81.75
```

**Intelligence / Aptitude matches** — peak-rewarded blend (`0.6 × avg + 0.4 × max`); **EQ match** — plain average:

```
intelligenceMatch = 0.6 × avg(90,75) + 0.4 × max(90,75)  =  85.5
aptitudeMatch     = 0.6 × avg(88,80) + 0.4 × max(88,80)  =  85.6
eqMatch           = (70 + 75) / 2                        =  72.5
```

**Final compatibility:**

```
careerScore = 81.75 × 0.35 + 85.5 × 0.25 + 85.6 × 0.30 + 72.5 × 0.10
            = 28.6125 + 21.375 + 25.680 + 7.250
            = 82.9 %      // clamped 0–100, rounded to one decimal
```

The displayed match badge shows **83% Match** (`matchPercent = Math.round(score)`). The student's expandable "Why this matched you" lines surface the source signals: dominant interest code I, strong Logical-Math + Spatial intelligences, strong Numerical + Abstract aptitudes, high Self-Regulation + Motivation.

### Display rules

The matcher's full top-N is clamped at output time by these rules, applied in [career500q.js](../backend/utils/scoring/packageScoring/career500q.js) and [career500qDemo.js](../backend/utils/scoring/packageScoring/career500qDemo.js):

| Rule | Value | Notes |
|---|---|---|
| **Minimum match threshold** | 60 | Careers below 60% drop off the recommendations list — except in the floor case below. |
| **Minimum careers shown** | 3 | Even if every career scores < 60, the top 3 by score are always included so a low-signal profile still gets an actionable result. |
| **Maximum careers shown — full test** | 15 | `matchCareers(profile, 15)` cap. |
| **Maximum careers shown — demo** | 10 | Demo wrapper passes `topN = 6` to the matcher but displays up to 10 on the result page. |
| **Sort order** | Highest match % first | Ties broken alphabetically by `title`. |

Threshold and floor are captured in `MATCH_THRESHOLD` and `MIN_RESULTS` in [careerMatcher.js](../backend/utils/scoring/careerMatcher.js); the caps are passed through the `topN` argument from each scorer.

### Holland-match: primary vs secondary

Holland is the one dimension where the order of codes matters in the career fingerprint. A career listed as `["A", "I", "R"]` is principally Artistic with Investigative and Realistic as secondary qualifiers. The matcher is **primary-dominant** — the primary code carries 75% of the Holland score, the secondary codes split the remaining 25%:

```js
const PRIMARY_HOLLAND_WEIGHT = 0.75;
const codes = career.hollandCodes;                       // primary first
const primary = profile.hollandProfile[codes[0]] ?? 50;
if (codes.length === 1) return clamp(primary);
const secondaryAvg = average(codes.slice(1).map((c) => profile.hollandProfile[c] ?? 50));
return clamp(primary * PRIMARY_HOLLAND_WEIGHT + secondaryAvg * (1 - PRIMARY_HOLLAND_WEIGHT));
```

This replaced an earlier formula that averaged primary (1.0×) with each secondary (0.6×). The averaging had a subtle bias: a **single-code** career (e.g. Sales Manager `["E"]`) took the student's full primary score with no dilution, while a **multi-code** career whose primary matched the student's peak (e.g. Banking `["C","E"]` for a C-dominant student) was averaged *below* its primary — so single-code business/people careers systematically out-ranked better-fitting multi-code ones. Anchoring on the primary (and treating secondaries as a bonus that can only add) removes that bias. Adjust `PRIMARY_HOLLAND_WEIGHT` to retune; the rest of the matcher follows automatically.

### Intelligence / Aptitude match: peak-rewarded blend · EQ match: straight average

For these dimensions the career fingerprint is unordered. **Intelligence and aptitude** use a peak-rewarded blend — a fraction (`PEAK_BLEND = 0.4`) of the bucket score is driven by the student's *single strongest* aligned dimension, so a genuine spike (e.g. high Musical intelligence, high Spatial Relations aptitude) pulls the careers that need it instead of being averaged away:

```js
const PEAK_BLEND = 0.4;
const values = career.intelligenceTypes.map(
  (name) => profile.multipleIntelligences[name] ?? 50
);
const avg = average(values), peak = Math.max(...values);
return clamp(avg * (1 - PEAK_BLEND) + peak * PEAK_BLEND);
```

**EQ** stays a plain mean at low weight — peak-rewarding it would re-introduce the flat people-skills lift that pushed every sociable student toward business/sales careers:

```js
const values = career.eqCompetencies.map(
  (name) => profile.eqProfile[name] ?? 50
);
return clamp(average(values));
```

The fallback `?? 50` means a career that references a dimension the student didn't score on (because the section wasn't completed) is treated as neutral on that signal — neither penalised nor rewarded.

### `matchReasons` generation

For each dimension, the matcher checks which of the career's required signals scored ≥ `HIGH_SIGNAL_THRESHOLD` (60) on the student's profile. If at least one cleared the threshold, the reason reads as "Strong/High … in X and Y". Otherwise it reads as "This career leans on X, Y — partial match on your current profile."

```js
const HIGH_SIGNAL_THRESHOLD = 60;

const filterHighSignals = (names, bucket) =>
  names.filter((name) => Number(bucket[name] ?? 0) >= HIGH_SIGNAL_THRESHOLD);
```

The four reason strings are stitched together by `buildMatchReasons` and returned per career.

### Re-running after manual review

When an admin completes a manual review (only possible if a question's answer key was missing), `recomputeReportWithManualDecisions` in [backend/controllers/adminController.js](../backend/controllers/adminController.js) calls `matchCareers` again with the updated `aptitudeScores` bucket — so the recommendations reflect the admin's grading decisions, not the pre-review state. The other three named buckets (Holland, intelligences, EQ) don't change because manual review only affects Section 4 aptitude items.

### Smoke contract

[backend/scripts/smokeCareer500qScoring.mjs](../backend/scripts/smokeCareer500qScoring.mjs) — the three-scenario probe asserts:

- Every recommendation has the full output shape (title, category, score, matchReasons.{holland,intelligence,aptitude,eq})
- No duplicate titles
- All-correct profile produces score ≥ some threshold (varies per scenario)
- Top career has differentiated picks between an "all-investigative" and "all-social" profile (i.e., the matcher actually discriminates)

Run `npm run smoke:career-500q` after touching the matcher or the career data.

### Key files

| File | Purpose |
|---|---|
| [backend/data/careerMappingData.js](../backend/data/careerMappingData.js) | 129-career source-of-truth |
| [backend/utils/scoring/careerMatcher.js](../backend/utils/scoring/careerMatcher.js) | `matchCareers` weighted engine |
| [backend/utils/scoring/packageScoring/career500q.js](../backend/utils/scoring/packageScoring/career500q.js) | Calls `matchCareers(namedProfile, 10)` for the full test |
| [backend/utils/scoring/packageScoring/career500qDemo.js](../backend/utils/scoring/packageScoring/career500qDemo.js) | Calls `matchCareers(namedProfile, 6)` for the demo |
| [backend/controllers/adminController.js](../backend/controllers/adminController.js) — `finalizeManualReview` | Re-runs the matcher with updated aptitude scores after admin review |
| [frontend/src/data/careerDetails.js](../frontend/src/data/careerDetails.js) | Per-career static copy (overview, salary bands, responsibilities) used on the career detail page |
| [frontend/src/pages/Careerdetail.jsx](../frontend/src/pages/Careerdetail.jsx) | Per-career detail page — reads `detail.score`, `detail.category`, `detail.matchReasons` |
| [frontend/src/pages/Result.jsx](../frontend/src/pages/Result.jsx) — career cards | Match badge, category, percentage bar, expandable reasons |
| [frontend/src/pages/StudentReport.jsx](../frontend/src/pages/StudentReport.jsx) — career section | Inline match reasons (visible in print/PDF) |
