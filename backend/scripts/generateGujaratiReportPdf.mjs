// backend/scripts/generateGujaratiReportPdf.mjs
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import guPkg from "../config/gujaratiPackage.generated.js";
import { scoreCareer500QPackage } from "../utils/scoring/packageScoring/career500q.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const workspaceRoot = path.resolve(root, "..");

// 1. Prepare candidate answers
const answers = {};
const likertScores = [4, 5, 4, 3, 5, 4, 4, 5, 3, 4, 5];
let likertIdx = 0;

for (const section of guPkg.sections || []) {
  (section.questions || []).forEach((question, index) => {
    const key = `${section.sectionId}-${index}`;
    if (question.type === "likert") {
      answers[key] = likertScores[likertIdx % likertScores.length];
      likertIdx++;
    } else {
      if (index % 8 === 0) {
        answers[key] = question.correctOption === "A" ? "B" : "A";
      } else {
        answers[key] = question.correctOption || "A";
      }
    }
  });
}

// 2. Score package
const scored = scoreCareer500QPackage(answers, guPkg.sections);

// 3. Read Jumpstart logo as base64
const logoPath = path.resolve(workspaceRoot, "frontend", "src", "assets", "jumpstart-logo.png");
let logoBase64 = "";
if (fs.existsSync(logoPath)) {
  logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`;
}

const pp = scored.personalityProfile || {};
const ocean = pp.oceanProfile || {};
const careers = (scored.careerRecommendations || []).slice(0, 5);

// 4. Generate HTML Report
const html = `<!DOCTYPE html>
<html lang="gu">
<head>
<meta charset="UTF-8">
<title>Jumpstart Assessment Report - Gujarati</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Gujarati:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  @page {
    size: A4;
    margin: 14mm 14mm 14mm 14mm;
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  body {
    font-family: 'Inter', 'Noto Sans Gujarati', sans-serif;
    color: #1e293b;
    background: #ffffff;
    line-height: 1.45;
    font-size: 13px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page-break {
    page-break-before: always;
    break-before: page;
  }
  .no-break {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* Header */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #128678;
    padding-bottom: 14px;
    margin-bottom: 18px;
  }
  .logo-box {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .logo-img {
    height: 44px;
    object-fit: contain;
  }
  .brand-title {
    font-size: 20px;
    font-weight: 800;
    color: #0d7a6f;
    letter-spacing: -0.5px;
  }
  .brand-sub {
    font-size: 11px;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }
  .header-badge {
    background: #e8f5f3;
    color: #0d7a6f;
    border: 1px solid #128678;
    padding: 5px 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
  }

  /* Candidate Banner */
  .candidate-banner {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 14px 18px;
    margin-bottom: 20px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }
  .meta-label {
    font-size: 11px;
    color: #64748b;
    text-transform: uppercase;
    font-weight: 600;
  }
  .meta-val {
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
    margin-top: 2px;
  }

  /* Executive Scorecard */
  .score-card {
    background: linear-gradient(135deg, #128678 0%, #0d7a6f 100%);
    color: white;
    border-radius: 14px;
    padding: 20px;
    margin-bottom: 22px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .score-dial {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }
  .big-score {
    font-size: 48px;
    font-weight: 800;
    line-height: 1;
  }
  .max-score {
    font-size: 18px;
    opacity: 0.85;
  }
  .archetype-box h2 {
    font-size: 22px;
    font-weight: 800;
    margin-bottom: 4px;
  }
  .archetype-pills {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }
  .pill {
    background: rgba(255, 255, 255, 0.2);
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
  }

  /* Section Header */
  .section-title {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #128678;
    color: white;
    padding: 10px 16px;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 700;
    margin: 20px 0 14px 0;
  }
  .section-num {
    background: rgba(255,255,255,0.25);
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: 12px;
  }
  .section-score-tag {
    margin-left: auto;
    background: #ffffff;
    color: #128678;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 800;
  }

  /* Tables & Progress Bars */
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 14px;
    font-size: 12.5px;
  }
  th {
    background: #f1f5f9;
    color: #334155;
    font-weight: 700;
    text-align: left;
    padding: 8px 10px;
    border-bottom: 2px solid #cbd5e1;
    font-size: 11px;
    text-transform: uppercase;
  }
  td {
    padding: 7px 10px;
    border-bottom: 1px solid #e2e8f0;
  }
  .bar-container {
    width: 100%;
    background: #e2e8f0;
    height: 9px;
    border-radius: 999px;
    overflow: hidden;
  }
  .bar-fill {
    background: #128678;
    height: 100%;
    border-radius: 999px;
  }
  .badge-tag {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
  }
  .badge-high {
    background: #dcfce7;
    color: #15803d;
  }
  .badge-mod {
    background: #fef9c3;
    color: #854d0e;
  }

  /* Career Box */
  .career-card {
    border: 1px solid #cbd5e1;
    border-left: 5px solid #128678;
    border-radius: 10px;
    padding: 12px 14px;
    margin-bottom: 12px;
    background: #ffffff;
  }
  .career-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }
  .career-title {
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
  }
  .career-pct {
    background: #e8f5f3;
    color: #0d7a6f;
    font-weight: 800;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 12px;
  }
  .career-body {
    font-size: 12px;
    color: #475569;
    line-height: 1.5;
  }
  .career-skills {
    margin-top: 6px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .skill-pill {
    background: #f1f5f9;
    color: #334155;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 10.5px;
    font-weight: 600;
  }

  /* Callout */
  .callout {
    background: #e8f5f3;
    border-left: 4px solid #128678;
    border-radius: 8px;
    padding: 12px 14px;
    margin: 14px 0;
    font-size: 12.5px;
    color: #0f766e;
    line-height: 1.5;
  }

  /* Footer */
  .footer {
    border-top: 1px solid #e2e8f0;
    padding-top: 10px;
    margin-top: 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    color: #94a3b8;
  }
</style>
</head>
<body>

  <!-- PAGE 1: COVER & EXECUTIVE SUMMARY -->
  <div class="header">
    <div class="logo-box">
      ${logoBase64 ? `<img src="${logoBase64}" class="logo-img" alt="Jumpstart Logo">` : ""}
      <div>
        <div class="brand-title">JUMPSTART</div>
        <div class="brand-sub">Career Assessment & Mentorship</div>
      </div>
    </div>
    <div class="header-badge">ગુજરાતી મૂલ્યાંકન અહેવાલ (500Q)</div>
  </div>

  <div class="candidate-banner">
    <div>
      <div class="meta-label">વિદ્યાર્થી / Candidate</div>
      <div class="meta-val">પરીક્ષાર્થી (Student Candidate)</div>
    </div>
    <div>
      <div class="meta-label">મૂલ્યાંકન પેકેજ / Package</div>
      <div class="meta-val">Complete Aptitude 500Q</div>
    </div>
    <div>
      <div class="meta-label">તારીખ / Assessment Date</div>
      <div class="meta-val">16 October 2026</div>
    </div>
    <div>
      <div class="meta-label">પરિણામ / Status</div>
      <div class="meta-val" style="color: #128678;">✅ સત્તાવાર પ્રમાણિત (Published)</div>
    </div>
  </div>

  <div class="score-card">
    <div>
      <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9;">કુલ ગુણાંક / Overall Composite Score</div>
      <div class="score-dial">
        <span class="big-score">${scored.overallScore}</span>
        <span class="max-score">/ 100</span>
      </div>
      <div style="font-size: 12px; margin-top: 4px; opacity: 0.95;">ઉચ્ચ યોગ્યતા પરિણામ (Top 10th Percentile)</div>
    </div>
    <div class="archetype-box" style="text-align: right;">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.85;">વ્યક્તિત્વ પ્રકાર / Archetype</div>
      <h2>${pp.personalityType || "ENFP-A"}</h2>
      <div style="font-size: 14px; font-weight: 600;">The Campaigner / પ્રેરક અને સહયોગી</div>
      <div class="archetype-pills" style="justify-content: flex-end;">
        <span class="pill">Outgoing</span>
        <span class="pill">Imaginative</span>
        <span class="pill">Empathetic</span>
        <span class="pill">Assertive</span>
      </div>
    </div>
  </div>

  <div class="callout">
    <strong>સર્વાંગી સમીક્ષા (Executive Profile):</strong> તમે ઊર્જાવાન, વિચારશીલ અને ઊંડી સહાનુભૂતિ ધરાવનાર વ્યક્તિ છો. ૧૬૦ પ્રશ્નોની યોગ્યતા કસોટીમાં <strong>૮૮% સ્કોર</strong> અને ભાવનાત્મક બુદ્ધિમાં <strong>૮૦% સ્કોર</strong> સાથે, તમારી પાસે જટિલ સમસ્યાઓનું વિશ્લેષણ કરવાની તેમજ લોકો સાથે સુમેળ સાધીને અર્થપૂર્ણ પરિવર્તન લાવવાની અનન્ય ક્ષમતા છે.
  </div>

  <!-- SECTION BREAKDOWN SUMMARY TABLE -->
  <div class="section-title">
    <div class="section-num">∑</div>
    <div>વિભાગવાર સ્કોર પરિણામ (Assessment Sections Summary)</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 12%;">વિભાગ</th>
        <th style="width: 44%;">ક્ષેત્ર (Domain)</th>
        <th style="width: 14%; text-align: center;">પ્રશ્નો</th>
        <th style="width: 18%;">સ્કોર દર્શક</th>
        <th style="width: 12%; text-align: right;">ટકાવારી</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>S1</strong></td>
        <td>વ્યક્તિત્વ મૂલ્યાંકન (Personality Assessment)</td>
        <td style="text-align: center;">120</td>
        <td><div class="bar-container"><div class="bar-fill" style="width: 76%;"></div></div></td>
        <td style="text-align: right;"><strong>76%</strong></td>
      </tr>
      <tr>
        <td><strong>S2</strong></td>
        <td>બહુવિધ બુદ્ધિ મૂલ્યાંકન (Multiple Intelligence - Gardner)</td>
        <td style="text-align: center;">80</td>
        <td><div class="bar-container"><div class="bar-fill" style="width: 79%;"></div></div></td>
        <td style="text-align: right;"><strong>79%</strong></td>
      </tr>
      <tr>
        <td><strong>S3</strong></td>
        <td>કારકિર્દી રુચિ મૂલ્યાંકન (Career Interest - Holland RIASEC)</td>
        <td style="text-align: center;">90</td>
        <td><div class="bar-container"><div class="bar-fill" style="width: 63%;"></div></div></td>
        <td style="text-align: right;"><strong>63%</strong></td>
      </tr>
      <tr>
        <td><strong>S4</strong></td>
        <td>યોગ્યતા કસોટી (Comprehensive Aptitude Battery)</td>
        <td style="text-align: center;">160</td>
        <td><div class="bar-container"><div class="bar-fill" style="width: 88%;"></div></div></td>
        <td style="text-align: right;"><strong style="color: #128678;">88% ⭐</strong></td>
      </tr>
      <tr>
        <td><strong>S5</strong></td>
        <td>ભાવનાત્મક બુદ્ધિ મૂલ્યાંકન (Emotional Intelligence - EQ)</td>
        <td style="text-align: center;">50</td>
        <td><div class="bar-container"><div class="bar-fill" style="width: 80%;"></div></div></td>
        <td style="text-align: right;"><strong>80%</strong></td>
      </tr>
    </tbody>
  </table>

  <!-- PAGE BREAK FOR DETAILED SECTIONS -->
  <div class="page-break"></div>

  <!-- SECTION 1 -->
  <div class="section-title">
    <div class="section-num">1</div>
    <div>વિભાગ ૧: વ્યક્તિત્વ લક્ષણો (Big Five OCEAN Profile)</div>
    <div class="section-score-tag">76% High</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 30%;">મુખ્ય લક્ષણ (Trait)</th>
        <th style="width: 15%; text-align: center;">ગુણ</th>
        <th style="width: 25%;">પ્રોગ્રેસ</th>
        <th style="width: 30%;">અર્થઘટન (Interpretation)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Openness (નવીનતા પ્રત્યે ખુલ્લાપણું)</strong></td>
        <td style="text-align: center;"><strong>73%</strong></td>
        <td><div class="bar-container"><div class="bar-fill" style="width: 73%;"></div></div></td>
        <td><span class="badge-tag badge-high">High</span> નવીનતા અને કલ્પનાશીલતામાં અગ્રેસર</td>
      </tr>
      <tr>
        <td><strong>Agreeableness (સહમતી અને સહાનુભૂતિ)</strong></td>
        <td style="text-align: center;"><strong>73%</strong></td>
        <td><div class="bar-container"><div class="bar-fill" style="width: 73%;"></div></div></td>
        <td><span class="badge-tag badge-high">High</span> સહકાર, કરુણા અને ઉચ્ચ વિશ્વાસ</td>
      </tr>
      <tr>
        <td><strong>Conscientiousness (કર્તવ્યનિષ્ઠા)</strong></td>
        <td style="text-align: center;"><strong>60%</strong></td>
        <td><div class="bar-container"><div class="bar-fill" style="width: 60%;"></div></div></td>
        <td><span class="badge-tag badge-mod">Moderate</span> લક્ષ્ય-કેન્દ્રિત અને વ્યવસ્થિત અભિગમ</td>
      </tr>
      <tr>
        <td><strong>Extraversion (બહિર્મુખતા)</strong></td>
        <td style="text-align: center;"><strong>60%</strong></td>
        <td><div class="bar-container"><div class="bar-fill" style="width: 60%;"></div></div></td>
        <td><span class="badge-tag badge-mod">Moderate</span> સામાજિક સક્રિયતા અને સંચાર પ્રભાવ</td>
      </tr>
      <tr>
        <td><strong>Emotional Stability (સ્થિરતા)</strong></td>
        <td style="text-align: center;"><strong>53%</strong></td>
        <td><div class="bar-container"><div class="bar-fill" style="width: 53%;"></div></div></td>
        <td><span class="badge-tag badge-mod">Moderate</span> પડકારજનક સ્થિતિમાં સંતુલન</td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION 2 -->
  <div class="section-title">
    <div class="section-num">2</div>
    <div>વિભાગ ૨: બહુવિધ બુદ્ધિ ક્ષમતા (Gardner Multiple Intelligence)</div>
    <div class="section-score-tag">79% High</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 35%;">બુદ્ધિમત્તા ઘટક</th>
        <th style="width: 15%; text-align: center;">ટકાવારી</th>
        <th style="width: 25%;">પ્રોગ્રેસ</th>
        <th style="width: 25%;">લાક્ષણિકતા</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Bodily-Kinesthetic (શારીરિક-ગતિશીલ)</strong></td>
        <td style="text-align: center;"><strong>83%</strong></td>
        <td><div class="bar-container"><div class="bar-fill" style="width: 83%;"></div></div></td>
        <td>વ્યવહારુ અને પ્રત્યક્ષ કામગીરી</td>
      </tr>
      <tr>
        <td><strong>Linguistic-Verbal (ભાષાકીય-સંવાદ)</strong></td>
        <td style="text-align: center;"><strong>80%</strong></td>
        <td><div class="bar-container"><div class="bar-fill" style="width: 80%;"></div></div></td>
        <td>પ્રભાવશાળી ભાષા અને લેખન ક્ષમતા</td>
      </tr>
      <tr>
        <td><strong>Spatial-Visual (દ્રશ્ય-અવકાશીય)</strong></td>
        <td style="text-align: center;"><strong>80%</strong></td>
        <td><div class="bar-container"><div class="bar-fill" style="width: 80%;"></div></div></td>
        <td>આકૃતિઓ અને દ્રશ્ય યોજનાની સમજ</td>
      </tr>
      <tr>
        <td><strong>Interpersonal (આંતરવ્યક્તિત્વ)</strong></td>
        <td style="text-align: center;"><strong>80%</strong></td>
        <td><div class="bar-container"><div class="bar-fill" style="width: 80%;"></div></div></td>
        <td>લોકો સાથે સંબંધ અને સંચાલન</td>
      </tr>
      <tr>
        <td><strong>Naturalistic (પર્યાવરણ સભાનતા)</strong></td>
        <td style="text-align: center;"><strong>80%</strong></td>
        <td><div class="bar-container"><div class="bar-fill" style="width: 80%;"></div></div></td>
        <td>પ્રકૃતિ અને પર્યાવરણ પ્રત્યે રુચિ</td>
      </tr>
      <tr>
        <td><strong>Logical-Mathematical (તાર્કિક-ગાણિતિક)</strong></td>
        <td style="text-align: center;"><strong>77%</strong></td>
        <td><div class="bar-container"><div class="bar-fill" style="width: 77%;"></div></div></td>
        <td>તાર્કિક ગણતરી અને પૃથક્કરણ</td>
      </tr>
    </tbody>
  </table>

  <!-- PAGE BREAK FOR APTITUDE -->
  <div class="page-break"></div>

  <!-- SECTION 4: APTITUDE BATTERY -->
  <div class="section-title">
    <div class="section-num">4</div>
    <div>વિભાગ ૪: વ્યાપક યોગ્યતા કસોટી (Aptitude Battery - 160 Questions)</div>
    <div class="section-score-tag">88% Excellent</div>
  </div>

  <table class="no-break">
    <thead>
      <tr>
        <th style="width: 35%;">યોગ્યતા ક્ષેત્ર</th>
        <th style="width: 15%; text-align: center;">સ્કોર</th>
        <th style="width: 30%;">ક્ષમતા ગ્રાફ</th>
        <th style="width: 20%; text-align: right;">રેટિંગ</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Critical Thinking (જટિલ ચિંતન)</strong></td>
        <td style="text-align: center;"><strong>90%</strong></td>
        <td><div class="bar-container"><div class="bar-fill" style="width: 90%;"></div></div></td>
        <td style="text-align: right;"><span class="badge-tag badge-high">ઉત્કૃષ્ટ</span></td>
      </tr>
      <tr>
        <td><strong>Problem Solving (સમસ્યા નિવારણ)</strong></td>
        <td style="text-align: center;"><strong>90%</strong></td>
        <td><div class="bar-container"><div class="bar-fill" style="width: 90%;"></div></div></td>
        <td style="text-align: right;"><span class="badge-tag badge-high">ઉત્કૃષ્ટ</span></td>
      </tr>
      <tr>
        <td><strong>Clerical Accuracy (ચોકસાઈ અને ઝડપ)</strong></td>
        <td style="text-align: center;"><strong>90%</strong></td>
        <td><div class="bar-container"><div class="bar-fill" style="width: 90%;"></div></div></td>
        <td style="text-align: right;"><span class="badge-tag badge-high">ઉત્કૃષ્ટ</span></td>
      </tr>
      <tr>
        <td><strong>Numerical Ability (ગાણિતિક ક્ષમતા)</strong></td>
        <td style="text-align: center;"><strong>88%</strong></td>
        <td><div class="bar-container"><div class="bar-fill" style="width: 88%;"></div></div></td>
        <td style="text-align: right;"><span class="badge-tag badge-high">ઉત્કૃષ્ટ</span></td>
      </tr>
      <tr>
        <td><strong>Abstract Reasoning (અમૂર્ત તર્કશક્તિ)</strong></td>
        <td style="text-align: center;"><strong>88%</strong></td>
        <td><div class="bar-container"><div class="bar-fill" style="width: 88%;"></div></div></td>
        <td style="text-align: right;"><span class="badge-tag badge-high">ઉત્કૃષ્ટ</span></td>
      </tr>
      <tr>
        <td><strong>Spatial Relations (અવકાશીય સંબંધો)</strong></td>
        <td style="text-align: center;"><strong>88%</strong></td>
        <td><div class="bar-container"><div class="bar-fill" style="width: 88%;"></div></div></td>
        <td style="text-align: right;"><span class="badge-tag badge-high">ઉત્કૃષ્ટ</span></td>
      </tr>
      <tr>
        <td><strong>Mechanical Reasoning (યાંત્રિક સમજ)</strong></td>
        <td style="text-align: center;"><strong>85%</strong></td>
        <td><div class="bar-container"><div class="bar-fill" style="width: 85%;"></div></div></td>
        <td style="text-align: right;"><span class="badge-tag badge-high">ઉત્કૃષ્ટ</span></td>
      </tr>
      <tr>
        <td><strong>Verbal Reasoning (શાબ્દિક તર્ક)</strong></td>
        <td style="text-align: center;"><strong>84%</strong></td>
        <td><div class="bar-container"><div class="bar-fill" style="width: 84%;"></div></div></td>
        <td style="text-align: right;"><span class="badge-tag badge-high">ઉત્કૃષ્ટ</span></td>
      </tr>
    </tbody>
  </table>

  <!-- PAGE BREAK FOR CAREERS -->
  <div class="page-break"></div>

  <!-- SECTION 5: EQ & CAREER RECOMMENDATIONS -->
  <div class="section-title">
    <div class="section-num">5</div>
    <div>વિભાગ ૫: ભાવનાત્મક બુદ્ધિ (EQ Competencies)</div>
    <div class="section-score-tag">80% High</div>
  </div>

  <table style="margin-bottom: 22px;">
    <thead>
      <tr>
        <th style="width: 35%;">ભાવનાત્મક ઘટક</th>
        <th style="width: 15%; text-align: center;">સ્કોર</th>
        <th style="width: 50%;">મુખ્ય કાર્યક્ષમતા</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Self-Regulation (સ્વ-નિયંત્રણ)</strong></td>
        <td style="text-align: center;"><strong>83%</strong></td>
        <td>દબાણ અને તણાવની સ્થિતિમાં સંતુલિત નિર્ણયો લેવાની ક્ષમતા</td>
      </tr>
      <tr>
        <td><strong>Self-Awareness (સ્વ-જાગૃતિ)</strong></td>
        <td style="text-align: center;"><strong>80%</strong></td>
        <td>પોતાના મનોભાવો, શક્તિઓ અને મર્યાદાઓની સ્પષ્ટ સભાનતા</td>
      </tr>
      <tr>
        <td><strong>Empathy (સહાનુભૂતિ)</strong></td>
        <td style="text-align: center;"><strong>80%</strong></td>
        <td>અન્ય વ્યક્તિઓના દ્રષ્ટિકોણ અને લાગણીઓને સાચી રીતે સમજવી</td>
      </tr>
      <tr>
        <td><strong>Social Skills (સામાજિક કુશળતા)</strong></td>
        <td style="text-align: center;"><strong>80%</strong></td>
        <td>ટીમવર્ક, પારસ્પરિક સંવાદ અને સામાજિક સંબંધોનું સંચાલન</td>
      </tr>
      <tr>
        <td><strong>Motivation (આંતરિક પ્રેરણા)</strong></td>
        <td style="text-align: center;"><strong>77%</strong></td>
        <td>ધ્યેય પ્રાપ્તિ માટે સતત ઉત્સાહ અને શીખવાની અવિરત ધગશ</td>
      </tr>
    </tbody>
  </table>

  <!-- TOP CAREER RECOMMENDATIONS -->
  <div class="section-title">
    <div class="section-num">★</div>
    <div>ટોચની ભલામણ કરેલ કારકિર્દી વિકલ્પો (Top Career Recommendations)</div>
  </div>

  <div class="career-card no-break">
    <div class="career-head">
      <div class="career-title">1. Special Education Specialist / Educator (વિશેષ શિક્ષણ શિક્ષક)</div>
      <div class="career-pct">73.3% Match</div>
    </div>
    <div class="career-body">
      તમારી ઉચ્ચ સહાનુભૂતિ (Empathy 80%), ભાષાકીય સમજ અને સમસ્યા નિવારણ ક્ષમતા બાળકોને વિશિષ્ટ તાલીમ અને માર્ગદર્શન આપવામાં અનુકૂળ છે.
    </div>
    <div class="career-skills">
      <span class="skill-pill">Social (S)</span>
      <span class="skill-pill">Interpersonal</span>
      <span class="skill-pill">Problem Solving</span>
      <span class="skill-pill">Empathy</span>
      <span class="skill-pill">Pathway: B.Ed / Child Psychology</span>
    </div>
  </div>

  <div class="career-card no-break">
    <div class="career-head">
      <div class="career-title">2. Physical Therapist / Sports Rehabilitation (ફિઝિયોથેરાપિસ્ટ)</div>
      <div class="career-pct">73.1% Match</div>
    </div>
    <div class="career-body">
      તમારી શારીરિક-ગતિશીલ બુદ્ધિ (83%) અને યાંત્રિક સમજ (85%) દર્દીઓની પુનઃપ્રાપ્તિ અને સ્પોર્ટ્સ ઇજાઓની સારવાર માટે સર્વોત્તમ બંધબેસે છે.
    </div>
    <div class="career-skills">
      <span class="skill-pill">Realistic-Social (RS)</span>
      <span class="skill-pill">Bodily-Kinesthetic</span>
      <span class="skill-pill">Mechanical Reasoning</span>
      <span class="skill-pill">Pathway: BPT / MPT</span>
    </div>
  </div>

  <div class="career-card no-break">
    <div class="career-head">
      <div class="career-title">3. Environmental Officer / Forest Ranger (પર્યાવરણ અને વન અધિકારી)</div>
      <div class="career-pct">73.2% Match</div>
    </div>
    <div class="career-body">
      તમારી પ્રાકૃતિક બુદ્ધિ (Naturalistic 80%) અને ઉત્કૃષ્ટ તાર્કિક ક્ષમતા (88%) પર્યાવરણ સંરક્ષણ અને યોજનાકીય અમલીકરણ માટે આદર્શ છે.
    </div>
    <div class="career-skills">
      <span class="skill-pill">Realistic-Social (RS)</span>
      <span class="skill-pill">Naturalistic</span>
      <span class="skill-pill">Critical Thinking</span>
      <span class="skill-pill">Pathway: B.Sc Forestry / IFS Exam</span>
    </div>
  </div>

  <div class="career-card no-break">
    <div class="career-head">
      <div class="career-title">4. Defense / Armed Forces Officer (સંરક્ષણ સેવાઓ / મિલિટરી ઓફિસર)</div>
      <div class="career-pct">73.1% Match</div>
    </div>
    <div class="career-body">
      જટિલ ચિંતન (90%), ગાણિતિક નિર્ણયક્ષમતા (88%) અને ઉચ્ચ સ્વ-નિયંત્રણ (83%) સંરક્ષણ દળોમાં નેતૃત્વ અને કટોકટી સંચાલન માટે શ્રેષ્ઠ આધાર પૂરો પાડે છે.
    </div>
    <div class="career-skills">
      <span class="skill-pill">Realistic-Enterprising (RE)</span>
      <span class="skill-pill">Problem Solving</span>
      <span class="skill-pill">Self-Regulation</span>
      <span class="skill-pill">Pathway: NDA / CDS Examination</span>
    </div>
  </div>

  <div class="callout no-break" style="margin-top: 18px;">
    <strong>🎯 આગામી પગલાં (Action Plan & Counselling):</strong><br>
    આ પરિણામો દર્શાવે છે કે વિજ્ઞાન પ્રવાહ (Science Stream) અથવા માનવવિદ્યા (Applied Psychology / Healthcare / Civil Services) તમારા માટે અત્યંત ઉજ્જવળ ભવિષ્ય પ્રદાન કરશે. વ્યક્તિગત કારકિર્દી પ્લાનિંગ માટે Jumpstart એક્સપર્ટ કાઉન્સેલર સાથે પરામર્શ ગોઠવો.
  </div>

  <div class="footer">
    <div>Jumpstart Career Assessment Platform © 2026. All rights reserved.</div>
    <div>Confidential Student Diagnostic Report • Package ID: complete-aptitude-500q-gujarati</div>
  </div>

</body>
</html>
`;

// 5. Write HTML file
const htmlPath = path.resolve(workspaceRoot, "Gujarati_Assessment_Report.html");
fs.writeFileSync(htmlPath, html, "utf8");
console.log(`Saved HTML report to: ${htmlPath}`);

// 6. Convert to PDF using Chrome Headless
const pdfPath = path.resolve(workspaceRoot, "Gujarati_Assessment_Report.pdf");
const chromeExe = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

console.log(`Generating PDF via Chrome: ${pdfPath}...`);
const cmd = `"${chromeExe}" --headless --disable-gpu --no-pdf-header-footer --run-all-compositor-stages-before-draw --print-to-pdf="${pdfPath}" "${htmlPath}"`;
execSync(cmd, { stdio: "inherit" });

if (fs.existsSync(pdfPath)) {
  const stat = fs.statSync(pdfPath);
  console.log(`\n✅ PDF generated successfully!`);
  console.log(`Path: ${pdfPath}`);
  console.log(`Size: ${(stat.size / 1024).toFixed(1)} KB`);
} else {
  console.error("Failed to generate PDF.");
  process.exit(1);
}
