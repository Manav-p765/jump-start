// Gujarati career vocabulary: titles, categories and the curated detail
// text (overview, work environment, skills, education) from
// frontend/src/data/careerDetails.js. Kept apart from the scorer phrases
// because some English words mean different things in each ("Architect" is
// both a personality archetype and a career title).
import part1 from "./careers/part1.js";
import part2 from "./careers/part2.js";
import part3 from "./careers/part3.js";
import part4 from "./careers/part4.js";
import part5 from "./careers/part5.js";

export const careerPhrases = { ...part1, ...part2, ...part3, ...part4, ...part5 };

// Fallback sentences careerDetails.js / StudentReport.jsx build for careers
// without a curated entry.
export const careerTemplates = [
  {
    re: /^This pathway blends the strengths and interests commonly associated with (.+)\.$/,
    render: (m, api) => `આ માર્ગ સામાન્ય રીતે ${api.tr(m[1])} સાથે સંકળાયેલી શક્તિઓ અને રુચિઓનો સમન્વય કરે છે.`,
  },
  {
    re: /^Explore what it takes to grow in (.+) and how it aligns with your profile\.$/,
    render: (m, api) => `${api.tr(m[1])} ક્ષેત્રે આગળ વધવા શું જોઈએ અને તે તમારી પ્રોફાઇલ સાથે કેવી રીતે સુસંગત છે તે જાણો.`,
  },
  {
    re: /^Common employers include (.+)\.$/,
    render: (m) => `મુખ્ય નોકરીદાતાઓમાં ${m[1]}નો સમાવેશ થાય છે.`,
  },
];
