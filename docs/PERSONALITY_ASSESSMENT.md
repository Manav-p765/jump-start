# Personality Assessment

This document covers how Jumpstride measures personality, what the four sub-frameworks reveal, and how the system produces the final MBTI type, archetype name, and work-style profile shown on the student's report.

---

## For Students and Clients

### What the personality section measures

Personality assessment helps match students to careers that suit **how they naturally think and work** — not just what they're good at. Two students with the same aptitude scores can thrive in very different careers depending on personality.

Jumpstride uses four personality frameworks together, because no single framework captures everything:

| Framework | What it reveals |
|---|---|
| **Big Five (OCEAN)** | The five fundamental personality dimensions psychologists agree on: curiosity (Openness), reliability (Conscientiousness), sociability (Extraversion), empathy (Agreeableness), and emotional steadiness (Neuroticism). The most well-validated personality model. |
| **HSPQ Personality Factors** | More granular traits useful for academic and early-career guidance — warmth, reasoning, dominance, sensitivity, and others. A higher-resolution view of personality than OCEAN alone. |
| **MBTI Type** | A 4-letter shorthand for how a student prefers to think, decide, and engage with the world (e.g. ENFJ, INTJ). Widely used in counselling because the type names are easy to remember and discuss. |
| **Work Style** | A snapshot of preferred day-to-day working conditions — independent vs collaborative, structured vs flexible, autonomous vs guided. Useful for choosing between two careers that are otherwise similar in interest and skill fit. |

### How to read your personality results

#### The 4-letter MBTI type

Each letter is a "preference axis" with two poles. Your type is the four poles you leaned toward:

| Letter | Pair | What it means |
|---|---|---|
| **E** / I | Extraversion vs Introversion | E: energised by people and outward engagement. I: recharges through quieter, focused time. |
| **N** / S | Intuition vs Sensing | N: drawn to ideas, patterns, possibilities. S: grounded in facts, details, and the concrete. |
| **F** / T | Feeling vs Thinking | F: decisions weighted by people and values. T: decisions weighted by logic and consequences. |
| **J** / P | Judging vs Perceiving | J: prefers structure, plans, closure. P: prefers flexibility, options, spontaneity. |

So **ENFJ** means: outwardly engaging, drawn to ideas, decides by what matters to people, prefers structure.

#### The Assertive (-A) vs Turbulent (-T) suffix

The "-A" or "-T" at the end of your type is a fifth dimension overlaid on the four-letter type:

- **Assertive (-A)** — calm, even-keeled, less prone to self-doubt or stress. Comes from low Neuroticism.
- **Turbulent (-T)** — more sensitive to setbacks, perfectionistic, self-critical. Comes from high Neuroticism.

ENFJ-A and ENFJ-T are the same core type but read very differently in how the person handles pressure. Same career fits in principle, but ENFJ-T may need stronger support systems before high-pressure paths like surgery or trial law.

#### Archetype names

To make types easier to discuss, each of the 16 has a shorthand archetype name. Examples:

| Type | Archetype |
|---|---|
| INTJ | Architect |
| INTP | Logician |
| ENTJ | Commander |
| ENFJ | Mentor |
| ENFP | Catalyst |
| ISTJ | Logistician |
| ISFJ | Protector |
| ESTJ | Executive |
| ESFJ | Coordinator |
| ISTP | Problem Solver |
| ISFP | Creator |
| ESTP | Builder |
| ESFP | Connector |
| INFJ | Advocate |
| INFP | Mediator |
| ENTP | Visionary |

Use the archetype as a memorable label — but the underlying type is what the algorithm uses for analysis.

#### How OCEAN connects to career suitability

Each Big Five trait points toward different career environments:

| Trait | What "High" suggests | What "Low" suggests |
|---|---|---|
| **Openness** | Research, design, innovation, exploration | Structured, well-defined, reliable work |
| **Conscientiousness** | Medicine, law, engineering, accounting | Creative, adaptive, fast-changing roles |
| **Extraversion** | Sales, teaching, management, public-facing | Research, writing, programming, technical |
| **Agreeableness** | Counselling, healthcare, social work, teaching | Law, finance, operations, competitive roles |
| **Neuroticism** | (high) benefits from supportive environments | (low) suited to high-stress careers like surgery, emergency, leadership |

#### What Work Style tells you

The work-style result describes your **ideal day-to-day work environment** as one of three patterns:

| Style | What it means |
|---|---|
| **Structured / Independent** | You prefer well-defined procedures, clear systems, and solo ownership of tasks. Fits research, accounting, law, project planning, quality-focused work. |
| **Balanced / Collaborative** | You're comfortable in team settings, with shared decision-making and flexible structures. Fits consulting, design, education, healthcare, professional services. |
| **Dynamic / Autonomous** | You prefer fast-moving, self-directed, novelty-rich environments. Fits entrepreneurship, journalism, consulting, startups. |

A **consistency score** (0–100) accompanies the result. Higher consistency means your answers leaned clearly in one direction; lower consistency means your preferences are more situational and you can adapt across styles.

### Important note for students

**Personality is one input — not a verdict.** Plenty of successful surgeons score "low" on conscientiousness and plenty of successful engineers are extraverts. The personality result describes **tendencies**, not fixed traits. Tendencies shape day-to-day comfort and energy levels, not career ceiling.

**Results reflect this moment, not a permanent label.** Personality has natural patterns through adolescence and early adulthood. The MBTI type you receive at 16 is unlikely to be identical at 26 — both the test and the person change over time.

**Use it as a starting point for conversation.** The most useful thing personality results give you is a vocabulary — a way to discuss with parents, counsellors, and mentors which kinds of roles will likely feel natural and which will feel like swimming upstream. The career recommendation algorithm has already factored personality in. Your job is to think about the *why* behind the recommendations, not just the *what*.

---

## For Developers

### Question ranges per framework

| Subsection (config key) | Q range | Sub-dimensions | Scoring method |
|---|---|---|---|
| `big_five_ocean` (1.1) | Q1-Q30 | 5 factors: extraversion, openness, conscientiousness, agreeableness, neuroticism | `factor_profile` — per-factor Likert avg |
| `hspq_factors` (1.2) | Q31-Q72 | 8 factors: warmth, reasoning, emotional_stability, dominance, liveliness, rule_consciousness, social_boldness, sensitivity | `factor_profile` — per-factor Likert avg |
| `work_style_preferences` (1.3) | Q73-Q96 | Three profiles (A=Structured/Independent, B=Balanced/Collaborative, C=Dynamic/Autonomous) | `work_style_profile` — categorical, with Likert fallback (see below) |
| `leadership_social_interaction` (1.4) | Q97-Q120 | 5 factors: taking_charge, organizing_teaching, communication, conflict_resolution, team_building | `factor_profile` — per-factor Likert avg |

Note that **there is no dedicated MBTI questionnaire** in the package. MBTI is derived from OCEAN + EQ outputs (see "MBTI Derivation" below).

### Reverse-scored items per framework

Each factor declares its own `reverseQuestions` array. The scorer applies `invertedValue = 6 - rawValue` to those items before averaging. Items not listed are scored as-is.

| Framework | Factor | Question IDs | Reverse IDs |
|---|---|---|---|
| OCEAN | extraversion | 1, 6, 11, 16, 21, 26 | 6, 16 |
| OCEAN | openness | 2, 4, 9, 14, 19, 24, 29 | 29 |
| OCEAN | conscientiousness | 7, 12, 17, 22, 27 | 12, 22 |
| OCEAN | agreeableness | 5, 10, 15, 20, 25, 30 | 10, 20 |
| OCEAN | neuroticism | 3, 8, 13, 18, 23, 28 | 8, 18, 28 |
| HSPQ | warmth | 31, 35, 46, 56, 64, 72 | (none) |
| HSPQ | reasoning | 32, 36, 43, 48, 53, 61, 69 | (none) |
| HSPQ | emotional_stability | 33, 44, 54, 62, 70 | (none) |
| HSPQ | dominance | 34, 41, 49, 58, 66 | (none) |
| HSPQ | liveliness | 39, 51, 63, 71 | (none) |
| HSPQ | rule_consciousness | 38, 45, 55 | (none) |
| HSPQ | social_boldness | 42, 50, 52, 60, 68 | 42, 50, 52, 60, 68 (all) |
| HSPQ | sensitivity | 40, 47, 57, 59, 65, 67 | 47, 57, 59, 65 |

Cross-check the reverse IDs against the source PDF answer key whenever the question text changes — getting reverse flags wrong silently inverts a factor's signal and the only way to catch it is to spot a "wrong-direction" personality output.

### Likert average + normalisation

For every Likert subsection (`scoreBandedLikertAverage` and `scoreFactorProfile` in [career500q.js](../backend/utils/scoring/packageScoring/career500q.js)):

```
average    = sum(values) / values.length         // 1-5 scale, unanswered skipped
percentage = ((average - 1) / 4) * 100           // maps 1-5 to 0-100
band       = resolveByThreshold(average)
```

Band thresholds applied to the 1-5 average (mathematically equivalent to applying to the 0-100 percentage):

| Band | Average | Percentage |
|---|---|---|
| High | 4.0-5.0 | 75-100% |
| Moderate | 3.0-3.99 | 50-74% |
| Low | 1.0-2.99 | 0-49% |

### MBTI Derivation — relative comparison (current formula)

`buildPersonalityType({ bigFiveSection, emotionalSection })` in [career500q.js](../backend/utils/scoring/packageScoring/career500q.js).

Each dimension now scores **both poles from genuinely opposing signals** and picks whichever pole is relatively stronger for the student — instead of asking "do the F-blend signals clear a fixed 50% midpoint?" The pre-go-live audit confirmed the old fixed-50 threshold pushed almost every student to ENFJ-A (5 of 8 stored full-test reports clustered there). The new formula spreads outputs across the 16 types based on which signals genuinely dominate for each individual.

| Dimension | Source signals | Winner logic |
|---|---|---|
| **E vs I** | OCEAN extraversion % | `eScore = extraversion%`, `iScore = 100 − extraversion%`. Higher wins. |
| **N vs S** | OCEAN openness % | `nScore = openness%`, `sScore = 100 − openness%`. Higher wins. |
| **F vs T** | Two opposing blends | `fScore = agreeableness × 0.6 + EQ empathy × 0.4`. `tScore = conscientiousness × 0.6 + EQ self_regulation × 0.4`. Higher wins. |
| **J vs P** | Two opposing blends | `jScore = conscientiousness × 0.7 + EQ self_regulation × 0.3`. `pScore = openness × 0.7 + EQ motivation × 0.3`. Higher wins. |
| **A vs T (suffix)** | Emotional-stability blend | `assertive = emotionalStability × 0.6 + EQ self_regulation × 0.25 + EQ motivation × 0.15`. **≥ 60 → A, < 60 → T.** Threshold raised from 50 to 60 because neuroticism skews low in self-report — the old midpoint was too easy to clear and most students landed Assertive by default. |

Where `emotionalStability = likertToPercent(6 − oceanNeuroticismAverage)` — the Neuroticism inversion converts "high neuroticism" into "low emotional stability" before the weighted blend.

**Why F/T and J/P use opposing blends.** Big Five Agreeableness alone is a noisy proxy for F/T — empathy reinforces it. The opposing T-pole pulls from conscientiousness + self-regulation (the analytical / structured signals). Same shape for J/P: J pulls from structure-loving traits, P from openness + motivation (exploration). A student whose conscientiousness-and-self-reg genuinely outweighs their agreeableness-and-empathy now gets T — under the old single-blend formula they'd have gotten F regardless because the blend was almost always > 50.

**Tiebreaker.** On exact ties (e.g. `fScore === tScore`), the dimension defaults to the first letter of the pair (E / N / F / J / A) via `>=`. Rare in practice — most scores resolve to integer percentages and one side usually edges ahead.

**Counsellor note — borderline scores.** Two students can share the same MBTI type with very different underlying scores. A student with E=88 and a student with E=54 both get **E** because both score higher on Extraversion than Introversion signals. **Students within 10 points of any dimension midpoint should be treated as borderline on that dimension** — the four-letter type captures the lean but not its strength. The `metrics` field on the returned personalityType carries both poles per dimension (`eScore / iScore / nScore / sScore / fScore / tScore / jScore / pScore`) for exactly this kind of inspection — admin tooling can surface "close call on J/P (J=51, P=49)" alongside the headline type.

### 16-archetype table

Defined in `PERSONALITY_ARCHETYPES` in [backend/utils/resultProfiling.js](../backend/utils/resultProfiling.js).

| Type | Archetype | One-line description |
|---|---|---|
| INTJ | Architect | Strategic, future-focused, motivated by complex problems |
| INTP | Logician | Curious, analytical, energised by ideas and systems |
| ENTJ | Commander | Decisive, ambitious, drawn to leadership |
| ENTP | Visionary | Inventive, energetic, opportunity-spotter |
| INFJ | Advocate | Insightful, values-driven, oriented to growth |
| INFP | Mediator | Reflective, idealistic, values-led |
| ENFJ | Mentor | Supportive, persuasive, motivates teams |
| ENFP | Catalyst | Expressive, imaginative, people-and-ideas-driven |
| ISTJ | Logistician | Reliable, methodical, structure-loving |
| ISFJ | Protector | Steady, compassionate, dependable |
| ESTJ | Executive | Organised, pragmatic, drives teams |
| ESFJ | Coordinator | Warm, responsible, aligns teams |
| ISTP | Problem Solver | Calm, adaptable, hands-on analyst |
| ISFP | Creator | Observant, grounded, expressive |
| ESTP | Builder | Action-oriented, bold, results-focused |
| ESFP | Connector | Engaging, energetic, people-tuned |

All 16 keys are present. The smoke probe asserts this on every run.

### Work Style — categorical tally, NOT a Likert average

Q73–Q96 (24 items, 3 options each) are scored by **counting how often each letter was chosen** across the section, not by averaging numeric responses. The three options carry these meanings:

| Option | Profile key | Dominant style label |
|---|---|---|
| **A** | `structured_independent` | Structured / Independent |
| **B** | `balanced_collaborative` | Balanced / Collaborative |
| **C** | `dynamic_autonomous` | Dynamic / Autonomous |

Scoring:

```
counts        = { A: nA, B: nB, C: nC }       // tally across answered Q73–Q96
dominantStyle = key with the highest count
consistency   = (counts[dominantStyle] / totalAnswered) × 100
```

Example: across 24 answers, **A × 12, B × 7, C × 5** → dominant = "Structured / Independent", consistency = 50%.

The 1–5 Likert averaging formula **does not apply** to this subsection — averaging letter labels as numbers is meaningless. The categorical path is implemented in `scoreCategoricalProfile` in [career500q.js](../backend/utils/scoring/packageScoring/career500q.js): line ~528 reads each answer as an A/B/C letter, increments the matching profile counter, then computes `dominantCount / answeredCount` for `consistency`.

### Work Style — known data quirk + Likert fallback

The package data currently stores Q73-Q96 as `type: "likert"` with empty options arrays, even though the spec declares them as A/B/C single-choice ("I prefer to work: A) … B) … C) …"). This is a recorded gap in the package's `ambiguityNotes`:

> "The current generated package still stores section 1.2 and 1.3 booklet prompts without the full A/B/C option metadata from the PDF, so those blocks need a seed/package refresh for fully exact live capture."

Before Prompt #8 this caused **work-style consistency to read 0% for every student** — the categorical scorer's `profileCounts["4"]` (the numeric Likert answer) never matched a known profile key, dominant count stayed at 0, consistency divided by zero.

**The fix:** when `scoreCategoricalProfile` finds dominantCount === 0 AND the answered values look Likert (numeric 1-5), it falls back to a Likert-derived scoring path:

```js
// Mapping positional: low avg → first option, mid → second, high → third
const idx = likertAvg <= 2.5 ? 0 : likertAvg >= 3.5 ? 2 : 1;
const positionalProfile = profileDictionary[profileKeys[idx]];

const extremeCount = answers.filter(v => v >= 4 || v <= 2).length;
const consistency  = roundPercent((extremeCount / answeredCount) * 100);
```

`consistency` measures how decisive the student's answers were — what fraction leaned strongly in one direction rather than parking at neutral 3.

**Future fix.** When the package is re-generated with proper A/B/C option metadata, the categorical path will succeed naturally and the Likert fallback will never trigger. The fallback path is forward-compatible: it only fires when the categorical path produces no dominant signal.

### Final `personalityProfile` output shape

The scorer emits a top-level `personalityProfile` field on every result. Schema (Mongoose `Mixed` for the nested fields):

```ts
personalityProfile: {
  mbtiType:             "ENFJ",                  // 4 letters, no suffix
  assertiveness:        "Assertive",             // "Assertive" | "Turbulent"
  personalityType:      "ENFJ-A",                // full 5-char form
  archetypeName:        "Mentor",
  archetypeDescription: "Supportive, persuasive, and skilled at motivating people…",
  oceanProfile: {
    openness: {
      score:          82,                        // 0-100, or null if Not Measured
      band:           "High",                    // "Low" | "Moderate" | "High" | "Not Measured"
      interpretation: "Strong curiosity and appetite for new ideas. Suits research…",
      average:        4.29                       // raw 1-5 average
    },
    conscientiousness:  { … same shape … },
    extraversion:       { … },
    agreeableness:      { … },
    neuroticism:        { … },                   // note: "Low" is the strong/positive band here
    dominantTraits:     ["Openness", "Extraversion"]   // top 2 non-neuroticism measured traits
  },
  hspqSignature: [                                // top 3 HSPQ factors by percentage
    "High Emotionally Stable",
    "High Warm",
    "High Dominant"
  ],
  workStyle: {
    dominantStyle: "Dynamic / Autonomous",
    description:   "Mixed work style preferences pattern",
    consistency:   100                            // 0-100, fraction of decisive answers
  }
}
```

Demo runs may have `"Not Measured"` bands on agreeableness and neuroticism because the 50-question curation only probes 3 OCEAN traits (extraversion, openness, conscientiousness). The smoke probe accepts this as valid.

### Personality × career matching — current state

The career matcher (`matchCareers` in [careerMatcher.js](../backend/utils/scoring/careerMatcher.js)) uses four dimensions: Holland Codes, Multiple Intelligences, Aptitudes, EQ. **Personality (MBTI / OCEAN) is NOT currently a fifth matching dimension.** Two reasons:

1. **The 125-career database doesn't carry MBTI type or OCEAN traits per career** ([careerMappingData.js](../backend/data/careerMappingData.js)). Each entry has `hollandCodes`, `intelligenceTypes`, `aptitudeStrengths`, `eqCompetencies` — no personality field.
2. **Personality already flows in indirectly through EQ.** The F/T and J/P dimensions of MBTI are derived using EQ competencies, which the matcher uses. Adding MBTI directly would double-count those signals.

**Future option.** If a counsellor-validated career → MBTI mapping is added to `careerMappingData.js` (e.g. `compatibleTypes: ["ENFJ", "ESFJ"]`), the matcher can be extended to a 5th dimension. Suggested weight allocation: redistribute to `holland: 0.30, intelligence: 0.20, aptitude: 0.25, eq: 0.15, mbti: 0.10`. This is documented as a possible extension; not implemented today because the data doesn't yet support it.

Personality informs the student's **self-understanding** (what kind of work will feel natural, what archetype they identify with) — career matching is currently driven by the four objective + behavioural dimensions.

### Key files

| File | Purpose |
|---|---|
| [backend/utils/scoring/configs/career500q.config.js](../backend/utils/scoring/configs/career500q.config.js) | Section 1 subsection definitions: OCEAN factors (lines 49-110), HSPQ factors (lines 111-227), Work Style (lines 228-277), Leadership (lines 278-349) |
| [backend/utils/scoring/packageScoring/career500q.js](../backend/utils/scoring/packageScoring/career500q.js) | `scoreFactorProfile` (Likert factor avg), `scoreCategoricalProfile` (work-style + Likert fallback), `buildPersonalityType` (MBTI derivation), `buildRichPersonalityProfile` (aggregator), `OCEAN_INTERPRETATIONS` (career-facing per-trait copy) |
| [backend/utils/resultProfiling.js](../backend/utils/resultProfiling.js) — `PERSONALITY_ARCHETYPES` | All 16 archetype names + descriptions |
| [backend/models/User.js](../backend/models/User.js) — `resultProfileSchema.personalityProfile` | Schema field for persistence |
| [backend/utils/assessmentReports.js](../backend/utils/assessmentReports.js) — `cloneResultProfile` | Sanitise hook preserves `personalityProfile` through saves |
| [backend/scripts/smokeCareer500qScoring.mjs](../backend/scripts/smokeCareer500qScoring.mjs) — `checkPersonalityProfile` | Contract probe that runs against all 6 scenarios |

### Smoke contract

`npm run smoke:career-500q` asserts on every run:

- `personalityProfile` is non-null on every scenario
- `mbtiType` is one of the 16 valid archetypes
- `assertiveness` is exactly `"Assertive"` or `"Turbulent"`
- `personalityType` matches the `XXXX-A/T` format
- `archetypeName` and `archetypeDescription` are non-empty
- Every OCEAN trait has a valid band (`"Low" / "Moderate" / "High" / "Not Measured"`), an interpretation, and a numeric score when measured
- `dominantTraits` has at least 1 entry
- `hspqSignature` has exactly 3 entries
- `workStyle.consistency > 0` for a fully-answered submission (the zero-pin bug)

If any assertion fails, the smoke prints `[FAIL]` lines and exits non-zero before stamping `[OK] All scoring contracts pass.`
