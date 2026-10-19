// Gujarati vocabulary for everything the 500Q scorer and career matcher can
// write into a report (labels, bands, interpretations, career implications,
// match reasons). Keys are the exact English strings the backend emits.
//
// Coverage is enforced by scripts in the e2e harness: every string harvested
// from thousands of scored answer sets must resolve through this file plus
// the templates below. Translations are a first draft for review by a
// fluent Gujarati speaker before wide release.

// Single terms: used on their own AND inside "<Band> <Term>" phrases and
// lists, so each appears once here.
export const terms = {
  // Big Five (OCEAN)
  Openness: "ખુલ્લાપણું",
  Conscientiousness: "કર્તવ્યનિષ્ઠા",
  Extraversion: "બહિર્મુખતા",
  Agreeableness: "સહમતિશીલતા",
  Neuroticism: "ભાવનાત્મક અસ્થિરતા",
  // MBTI poles
  Introversion: "અંતર્મુખતા",
  Sensing: "સંવેદન",
  Intuition: "અંતઃસ્ફુરણા",
  Thinking: "તાર્કિક વિચાર",
  Feeling: "લાગણી",
  Judging: "નિર્ણયાત્મકતા",
  Perceiving: "ગ્રહણશીલતા",
  // HSPQ
  Warmth: "હૂંફ",
  Reasoning: "તર્કશક્તિ",
  "Emotional Stability": "ભાવનાત્મક સ્થિરતા",
  Dominance: "પ્રભુત્વ",
  Liveliness: "જીવંતતા",
  "Rule-Consciousness": "નિયમ-પાલન",
  "Social Boldness": "સામાજિક હિંમત",
  Sensitivity: "સંવેદનશીલતા",
  // Leadership & social interaction
  Communication: "સંવાદ કૌશલ્ય",
  "Conflict Resolution": "સંઘર્ષ નિવારણ",
  "Organizing / Teaching": "આયોજન / શિક્ષણ",
  "Taking Charge": "જવાબદારી સંભાળવી",
  "Team Building": "ટીમ નિર્માણ",
  // Multiple intelligences (report names + career-matcher short names)
  "Logical-Mathematical": "તાર્કિક-ગાણિતિક",
  "Linguistic-Verbal": "ભાષાકીય-મૌખિક",
  "Spatial-Visual": "અવકાશી-દૃશ્ય",
  "Musical-Rhythmic": "સંગીત-લયબદ્ધ",
  "Bodily-Kinesthetic": "શારીરિક-ગતિશીલ",
  Interpersonal: "આંતરવ્યક્તિક",
  Intrapersonal: "અંતઃવ્યક્તિક",
  Naturalistic: "પ્રકૃતિલક્ષી",
  "Logical-Math": "તાર્કિક-ગાણિતિક",
  Spatial: "અવકાશી",
  Linguistic: "ભાષાકીય",
  Musical: "સંગીત",
  // RIASEC
  Realistic: "વાસ્તવવાદી",
  Investigative: "સંશોધનાત્મક",
  Artistic: "કલાત્મક",
  Social: "સામાજિક",
  Enterprising: "સાહસિક",
  Conventional: "પરંપરાગત",
  // Aptitudes (report names + career-matcher short names)
  "Verbal Reasoning": "શાબ્દિક તર્ક",
  "Numerical Ability": "સંખ્યાત્મક ક્ષમતા",
  "Abstract Reasoning": "અમૂર્ત તર્ક",
  "Spatial Relations": "અવકાશી સંબંધો",
  "Mechanical Reasoning": "યાંત્રિક તર્ક",
  "Clerical Speed & Accuracy": "કારકુની ઝડપ અને ચોકસાઈ",
  "Critical Thinking": "વિવેચનાત્મક વિચારસરણી",
  "Problem Solving": "સમસ્યા ઉકેલ",
  Numerical: "સંખ્યાત્મક",
  Abstract: "અમૂર્ત",
  Mechanical: "યાંત્રિક",
  Clerical: "કારકુની",
  Verbal: "શાબ્દિક",
  // Emotional intelligence
  "Self-Awareness": "આત્મ-જાગૃતિ",
  "Self-Regulation": "આત્મ-નિયંત્રણ",
  Motivation: "પ્રેરણા",
  Empathy: "સહાનુભૂતિ",
  "Social Skills": "સામાજિક કૌશલ્યો",
  // Strength summary bars
  "Analytical Thinking": "વિશ્લેષણાત્મક વિચારસરણી",
  "Creative Problem Solving": "સર્જનાત્મક સમસ્યા ઉકેલ",
  "Empathy & Collaboration": "સહાનુભૂતિ અને સહયોગ",
  "Leadership Potential": "નેતૃત્વ ક્ષમતા",
  "Research Orientation": "સંશોધન વલણ",
  "Self-Management": "સ્વ-વ્યવસ્થાપન",
  // Subject clusters
  "Arts Subjects": "કલા વિષયો",
  "Humanities Subjects": "માનવવિદ્યા વિષયો",
  "STEM Subjects": "STEM વિષયો",
  "Social Sciences": "સામાજિક વિજ્ઞાન",
};

// Score bands as adjectives. Invariant forms so they never need gender
// agreement with the noun that follows.
export const bands = {
  High: "ઉચ્ચ",
  Moderate: "મધ્યમ",
  Low: "નિમ્ન",
  Average: "સરેરાશ",
  Good: "સારી",
  Excellent: "ઉત્તમ",
};

export const suffixes = {
  Intelligence: "બુદ્ધિ",
  Interest: "રુચિ",
};

// Whole phrases (anything not expressible as band + term).
export const phrases = {
  // Bare band labels
  High: "ઉચ્ચ",
  Moderate: "મધ્યમ",
  Low: "નિમ્ન",
  Average: "સરેરાશ",
  Good: "સારું",
  Excellent: "ઉત્તમ",
  Developing: "વિકાસશીલ",
  "Not Measured": "માપેલ નથી",
  "Score band": "સ્કોર શ્રેણી",
  Assertive: "આત્મવિશ્વાસુ",
  Turbulent: "અસ્થિર",

  // Personality archetypes (title) and descriptions
  Advocate: "હિમાયતી",
  Architect: "રચનાકાર",
  Builder: "નિર્માતા",
  Catalyst: "ઉત્પ્રેરક",
  Commander: "સેનાપતિ",
  Connector: "જોડનાર",
  Coordinator: "સંકલનકાર",
  Creator: "સર્જક",
  Executive: "વહીવટકર્તા",
  Logician: "તર્કશાસ્ત્રી",
  Logistician: "વ્યવસ્થાપક",
  Mediator: "મધ્યસ્થી",
  Mentor: "માર્ગદર્શક",
  "Problem Solver": "સમસ્યા ઉકેલનાર",
  Protector: "રક્ષક",
  Visionary: "દૂરદર્શી",
  "Action-oriented, bold, and effective in fast-moving environments with visible results.":
    "કાર્યલક્ષી, હિંમતવાન અને ઝડપથી બદલાતા, દેખીતા પરિણામોવાળા વાતાવરણમાં અસરકારક.",
  "Calm, adaptable, and skilled at practical troubleshooting and hands-on analysis.":
    "શાંત, અનુકૂલનશીલ અને વ્યવહારુ સમસ્યા-નિવારણ તથા હાથવગા વિશ્લેષણમાં કુશળ.",
  "Curious, analytical, and energized by ideas, systems, and unconventional solutions.":
    "જિજ્ઞાસુ, વિશ્લેષણાત્મક અને વિચારો, પ્રણાલીઓ તથા અસામાન્ય ઉકેલોથી ઉત્સાહિત.",
  "Decisive, ambitious, and naturally drawn to leadership, planning, and long-range execution.":
    "નિર્ણાયક, મહત્ત્વાકાંક્ષી અને સ્વાભાવિક રીતે નેતૃત્વ, આયોજન અને લાંબા ગાળાના અમલ તરફ આકર્ષિત.",
  "Decisive, organized, and oriented toward planning and long-range execution.":
    "નિર્ણાયક, વ્યવસ્થિત અને આયોજન તથા લાંબા ગાળાના અમલ તરફ કેન્દ્રિત.",
  "Engaging, energetic, and naturally tuned to people, experience, and momentum.":
    "આકર્ષક, ઊર્જાવાન અને સ્વાભાવિક રીતે લોકો, અનુભવ અને ગતિ સાથે તાલમેલ ધરાવનાર.",
  "Expressive, imaginative, and excited by people, ideas, and new experiences.":
    "અભિવ્યક્તિશીલ, કલ્પનાશીલ અને લોકો, વિચારો તથા નવા અનુભવોથી ઉત્સાહિત.",
  "Insightful, values-driven, and motivated by helping people grow in meaningful ways.":
    "સૂઝબૂઝવાળા, મૂલ્ય-આધારિત અને લોકોને અર્થપૂર્ણ રીતે વિકસવામાં મદદ કરવાથી પ્રેરિત.",
  "Inventive, energetic, and quick to spot opportunities, patterns, and new possibilities.":
    "સંશોધક વૃત્તિવાળા, ઊર્જાવાન અને તકો, પેટર્ન તથા નવી શક્યતાઓ ઝડપથી ઓળખનાર.",
  "Observant, grounded, and expressive through craft, design, and values-led choices.":
    "નિરીક્ષણશીલ, જમીન સાથે જોડાયેલા અને કારીગરી, ડિઝાઇન તથા મૂલ્ય-આધારિત પસંદગીઓ દ્વારા અભિવ્યક્ત.",
  "Organized, pragmatic, and effective at driving teams, systems, and operational discipline.":
    "વ્યવસ્થિત, વ્યવહારુ અને ટીમો, પ્રણાલીઓ તથા કાર્યકારી શિસ્ત આગળ ધપાવવામાં અસરકારક.",
  "Organized, pragmatic, and effective with systems and operational discipline.":
    "વ્યવસ્થિત, વ્યવહારુ અને પ્રણાલીઓ તથા કાર્યકારી શિસ્ત સાથે અસરકારક.",
  "Reflective, idealistic, and guided by values, creativity, and personal authenticity.":
    "ચિંતનશીલ, આદર્શવાદી અને મૂલ્યો, સર્જનાત્મકતા તથા વ્યક્તિગત પ્રામાણિકતાથી માર્ગદર્શિત.",
  "Reliable, methodical, and strongest in roles that value structure, accuracy, and accountability.":
    "વિશ્વસનીય, પદ્ધતિસર અને માળખું, ચોકસાઈ તથા જવાબદારીને મહત્ત્વ આપતી ભૂમિકાઓમાં સૌથી મજબૂત.",
  "Steady, compassionate, and attentive to people, details, and dependable follow-through.":
    "સ્થિર, કરુણાશીલ અને લોકો, વિગતો તથા ભરોસાપાત્ર અનુસરણ પ્રત્યે સજાગ.",
  "Strategic, future-focused, and motivated by solving complex problems with independent thinking.":
    "વ્યૂહાત્મક, ભવિષ્યલક્ષી અને સ્વતંત્ર વિચારથી જટિલ સમસ્યાઓ ઉકેલવાથી પ્રેરિત.",
  "Supportive, persuasive, and motivated by working toward shared goals.":
    "સહાયક, પ્રભાવશાળી અને સહિયારા લક્ષ્યો તરફ કામ કરવાથી પ્રેરિત.",
  "Supportive, persuasive, and skilled at motivating people around shared goals.":
    "સહાયક, પ્રભાવશાળી અને સહિયારા લક્ષ્યો માટે લોકોને પ્રેરિત કરવામાં કુશળ.",
  "Warm, responsible, and dependable at keeping work organized and on track.":
    "હૂંફાળા, જવાબદાર અને કામને વ્યવસ્થિત તથા સમયસર રાખવામાં ભરોસાપાત્ર.",
  "Warm, responsible, and strong at keeping teams aligned, supported, and productive.":
    "હૂંફાળા, જવાબદાર અને ટીમોને એકસૂત્ર, સહાયિત તથા ઉત્પાદક રાખવામાં મજબૂત.",

  // Work-style dominant styles, environment bands, activity bands
  "Balanced / Collaborative": "સંતુલિત / સહયોગી",
  "Structured / Independent": "માળખાગત / સ્વતંત્ર",
  "Dynamic / Autonomous": "ગતિશીલ / સ્વાયત્ત",
  "Collaborative / People / Service": "સહયોગી / લોકો / સેવા",
  "Creative / Flexible / Innovative": "સર્જનાત્મક / લવચીક / નવીન",
  "Dynamic / Leadership / Business": "ગતિશીલ / નેતૃત્વ / વ્યવસાય",
  "Research / Quiet / Independent": "સંશોધન / શાંત / સ્વતંત્ર",

  // HSPQ / leadership / work-style interpretation items
  "Dominance + Emotional Stability": "પ્રભુત્વ + ભાવનાત્મક સ્થિરતા",
  "Reasoning + Low Social Needs": "તર્કશક્તિ + ઓછી સામાજિક જરૂરિયાત",
  "Stable, assertive responses suggest leadership under pressure":
    "સ્થિર, દૃઢ જવાબો દબાણ હેઠળ નેતૃત્વ સૂચવે છે",
  "Strong reasoning with lower social pull points toward focused analytical work":
    "ઓછા સામાજિક ખેંચાણ સાથે મજબૂત તર્કશક્તિ એકાગ્ર વિશ્લેષણાત્મક કાર્ય તરફ સંકેત આપે છે",
  "Executive Leadership Pattern": "કાર્યકારી નેતૃત્વ પેટર્ન",
  "High scores across all leadership factors point to broad leadership readiness":
    "નેતૃત્વના બધા પરિબળોમાં ઉચ્ચ સ્કોર વ્યાપક નેતૃત્વ તૈયારી દર્શાવે છે",
  "Mixed preference pattern": "મિશ્ર પસંદગી પેટર્ન",
  "Prefers flexible, fast-moving environments": "લવચીક, ઝડપી વાતાવરણ પસંદ કરે છે",
  "Prefers structured, predictable work": "માળખાગત, અનુમાનિત કાર્ય પસંદ કરે છે",
  "Prefers flexible and fast-moving environments": "લવચીક અને ઝડપી વાતાવરણ પસંદ કરે છે",
  "Prefers structured and predictable work": "માળખાગત અને અનુમાનિત કાર્ય પસંદ કરે છે",
  "Prefers flexible and innovative work settings": "લવચીક અને નવીન કાર્ય વાતાવરણ પસંદ કરે છે",
  "Prefers collaborative and people-centered environments": "સહયોગી અને લોકો-કેન્દ્રિત વાતાવરણ પસંદ કરે છે",
  "Prefers fast-paced, high-energy environments": "ઝડપી, ઉચ્ચ-ઊર્જાવાળું વાતાવરણ પસંદ કરે છે",
  "Prefers quiet, research-focused, or independent settings": "શાંત, સંશોધન-કેન્દ્રિત અથવા સ્વતંત્ર વાતાવરણ પસંદ કરે છે",
  "Shows comfort with collaborative environments": "સહયોગી વાતાવરણમાં સહજતા દર્શાવે છે",
  "Shows comfort with independent ownership": "સ્વતંત્ર જવાબદારીમાં સહજતા દર્શાવે છે",
  "Shows comfort with leadership and movement": "નેતૃત્વ અને ગતિશીલતામાં સહજતા દર્શાવે છે",
  "Shows a stronger autonomous-work tendency": "સ્વાયત્ત કાર્ય તરફ વધુ મજબૂત વલણ દર્શાવે છે",
  "Balances flexibility with team coordination": "લવચીકતા અને ટીમ સંકલન વચ્ચે સંતુલન રાખે છે",
  "Works best with clear procedures and organized systems": "સ્પષ્ટ પ્રક્રિયાઓ અને વ્યવસ્થિત પ્રણાલીઓ સાથે શ્રેષ્ઠ કામ કરે છે",
  "Works comfortably with focused solitary tasks": "એકાગ્ર, એકલા કરવાના કાર્યો સહજતાથી કરે છે",
  "Works well in shared decision-making settings": "સહિયારી નિર્ણય-પ્રક્રિયાવાળા વાતાવરણમાં સારું કામ કરે છે",
  "Works well in team and service contexts": "ટીમ અને સેવા સંદર્ભોમાં સારું કામ કરે છે",
  "Feels comfortable in interactive group settings": "સંવાદાત્મક જૂથ વાતાવરણમાં સહજ અનુભવે છે",
  "Thrives on novelty, intensity, and self-direction": "નવીનતા, તીવ્રતા અને સ્વ-દિશાથી ખીલે છે",
  "Responses balance teamwork, flexibility, and shared decision-making":
    "જવાબો ટીમવર્ક, લવચીકતા અને સહિયારા નિર્ણય વચ્ચે સંતુલન દર્શાવે છે",
  "Responses lean toward structured systems, solo ownership, and procedure-led execution":
    "જવાબો માળખાગત પ્રણાલીઓ, વ્યક્તિગત જવાબદારી અને પ્રક્રિયા-આધારિત અમલ તરફ ઝૂકે છે",
  "Responses prefer autonomy, novelty, intensity, and self-directed movement":
    "જવાબો સ્વાયત્તતા, નવીનતા, તીવ્રતા અને સ્વ-નિર્દેશિત ગતિ પસંદ કરે છે",

  // Work environment interpretations / items
  "Environment choices favor collaboration, service, and direct human interaction":
    "વાતાવરણની પસંદગીઓ સહયોગ, સેવા અને સીધા માનવ સંપર્કને પ્રાધાન્ય આપે છે",
  "Environment choices favor movement, leadership, and high-energy execution":
    "વાતાવરણની પસંદગીઓ ગતિશીલતા, નેતૃત્વ અને ઉચ્ચ-ઊર્જાવાળા અમલને પ્રાધાન્ય આપે છે",
  "Environment choices prefer flexibility, creative tooling, and novel setups":
    "વાતાવરણની પસંદગીઓ લવચીકતા, સર્જનાત્મક સાધનો અને નવી વ્યવસ્થાઓ પસંદ કરે છે",
  "Environment choices prefer research-focused, quieter, and independent settings":
    "વાતાવરણની પસંદગીઓ સંશોધન-કેન્દ્રિત, શાંત અને સ્વતંત્ર વાતાવરણ પસંદ કરે છે",
  "Enjoys open-ended, creative, or experimental environments": "મુક્ત, સર્જનાત્મક અથવા પ્રાયોગિક વાતાવરણનો આનંદ માણે છે",
  "Enjoys service, teamwork, and shared activity": "સેવા, ટીમવર્ક અને સહિયારી પ્રવૃત્તિનો આનંદ માણે છે",
  "Leans toward business, execution, and decision-heavy settings": "વ્યવસાય, અમલ અને નિર્ણય-પ્રધાન વાતાવરણ તરફ ઝૂકે છે",
  "Leans toward design, media, or startup-like spaces": "ડિઝાઇન, મીડિયા અથવા સ્ટાર્ટઅપ જેવા વાતાવરણ તરફ ઝૂકે છે",
  "Leans toward specialized or low-distraction environments": "વિશિષ્ટ અથવા ઓછા વિક્ષેપવાળા વાતાવરણ તરફ ઝૂકે છે",

  // Multiple-intelligence interpretations
  "Strong quantitative and analytical thinking": "મજબૂત સંખ્યાત્મક અને વિશ્લેષણાત્મક વિચારસરણી",
  "Good analytical skills": "સારી વિશ્લેષણ ક્ષમતા",
  "Lower preference for sustained quantitative work in this inventory":
    "આ મૂલ્યાંકનમાં સતત સંખ્યાત્મક કાર્ય માટે ઓછી પસંદગી",
  "Strong language, explanation, and verbal expression": "મજબૂત ભાષા, સમજાવટ અને મૌખિક અભિવ્યક્તિ",
  "Balanced communication capability for general roles": "સામાન્ય ભૂમિકાઓ માટે સંતુલિત સંવાદ ક્ષમતા",
  "Lower language pull relative to other skill areas in this test":
    "આ ટેસ્ટમાં અન્ય કૌશલ્ય ક્ષેત્રોની સરખામણીએ ભાષા તરફ ઓછું ખેંચાણ",
  "Strong visualization and spatial imagination": "મજબૂત દૃશ્યકલ્પના અને અવકાશી કલ્પનાશક્તિ",
  "Practical spatial sense with usable technical visual skill": "વ્યવહારુ અવકાશી સમજ સાથે ઉપયોગી તકનીકી દૃશ્ય કૌશલ્ય",
  "Lower spatial pull relative to other strengths in this profile":
    "આ પ્રોફાઇલમાં અન્ય શક્તિઓની સરખામણીએ અવકાશી ક્ષેત્ર તરફ ઓછું ખેંચાણ",
  "Strong sensitivity to rhythm, melody, and sound patterns": "લય, સૂર અને ધ્વનિ પેટર્ન પ્રત્યે મજબૂત સંવેદનશીલતા",
  "Functional musical appreciation and applied creativity": "વ્યવહારુ સંગીત-રસ અને પ્રયુક્ત સર્જનાત્મકતા",
  "Music is not a leading intelligence signal here": "અહીં સંગીત મુખ્ય બુદ્ધિ સંકેત નથી",
  "Strong physical coordination and action-based learning": "મજબૂત શારીરિક સંકલન અને ક્રિયા-આધારિત શીખવું",
  "Comfortable with movement and hands-on tasks": "હલનચલન અને હાથવગા કાર્યોમાં સહજ",
  "Less preference for physical execution as a core strength": "મુખ્ય શક્તિ તરીકે શારીરિક અમલ માટે ઓછી પસંદગી",
  "Strong people-awareness and relationship skill": "લોકો પ્રત્યે મજબૂત સમજ અને સંબંધ કૌશલ્ય",
  "Good interpersonal abilities": "સારી આંતરવ્યક્તિક ક્ષમતાઓ",
  "Lower social pull relative to independent work styles": "સ્વતંત્ર કાર્યશૈલીની સરખામણીએ ઓછું સામાજિક ખેંચાણ",
  "Strong self-reflection and self-directed awareness": "મજબૂત આત્મ-ચિંતન અને સ્વ-નિર્દેશિત જાગૃતિ",
  "Usable self-direction across many professional settings": "ઘણા વ્યાવસાયિક સંદર્ભોમાં ઉપયોગી સ્વ-દિશા",
  "External structure may currently support performance better":
    "હાલમાં બાહ્ય માળખું કામગીરીમાં વધુ સારી મદદ કરી શકે છે",
  "Strong orientation toward natural systems and environments": "કુદરતી પ્રણાલીઓ અને પર્યાવરણ તરફ મજબૂત વલણ",
  "Usable affinity for nature and outdoor contexts": "પ્રકૃતિ અને બહારના વાતાવરણ પ્રત્યે ઉપયોગી લગાવ",
  "Nature-oriented work is not a dominant pull in this profile":
    "આ પ્રોફાઇલમાં પ્રકૃતિલક્ષી કાર્ય મુખ્ય આકર્ષણ નથી",

  // Aptitude interpretations
  "Excellent verbal reasoning": "ઉત્તમ શાબ્દિક તર્ક",
  "Good verbal skills": "સારાં શાબ્દિક કૌશલ્યો",
  "Average verbal ability": "સરેરાશ શાબ્દિક ક્ષમતા",
  "Verbal reasoning is not yet the strongest measured aptitude": "શાબ્દિક તર્ક હજુ સૌથી મજબૂત માપેલી યોગ્યતા નથી",
  "Strong mathematical ability": "મજબૂત ગાણિતિક ક્ષમતા",
  "Good numerical skills": "સારાં સંખ્યાત્મક કૌશલ્યો",
  "Average mathematical ability": "સરેરાશ ગાણિતિક ક્ષમતા",
  "Quantitative work may need more structured support": "સંખ્યાત્મક કાર્ય માટે વધુ માળખાગત સહાયની જરૂર પડી શકે",
  "Excellent pattern recognition": "ઉત્તમ પેટર્ન ઓળખ",
  "Good abstract thinking": "સારી અમૂર્ત વિચારસરણી",
  "Average abstract ability": "સરેરાશ અમૂર્ત ક્ષમતા",
  "Abstract reasoning is still developing": "અમૂર્ત તર્ક હજુ વિકસી રહ્યો છે",
  "Good spatial skills": "સારાં અવકાશી કૌશલ્યો",
  "Average spatial ability": "સરેરાશ અવકાશી ક્ષમતા",
  "Spatial reasoning appears less established in the current evidence":
    "હાલના પુરાવામાં અવકાશી તર્ક ઓછો સ્થાપિત જણાય છે",
  "Good mechanical understanding": "સારી યાંત્રિક સમજ",
  "Average mechanical sense": "સરેરાશ યાંત્રિક સમજ",
  "Usable technical reasoning with room to specialize": "વિશેષજ્ઞતાની તક સાથે ઉપયોગી તકનીકી તર્ક",
  "Mechanical systems are not yet the strongest aptitude area": "યાંત્રિક પ્રણાલીઓ હજુ સૌથી મજબૂત યોગ્યતા ક્ષેત્ર નથી",
  "Excellent attention to detail in clerical checks": "કારકુની ચકાસણીમાં વિગતો પર ઉત્તમ ધ્યાન",
  "Good clerical accuracy": "સારી કારકુની ચોકસાઈ",
  "Average clerical ability": "સરેરાશ કારકુની ક્ષમતા",
  "High-precision clerical checking may need more support": "ઉચ્ચ-ચોકસાઈવાળી કારકુની ચકાસણી માટે વધુ સહાયની જરૂર પડી શકે",
  "Excellent critical thinking": "ઉત્તમ વિવેચનાત્મક વિચારસરણી",
  "Average critical thinking": "સરેરાશ વિવેચનાત્મક વિચારસરણી",
  "More structured reasoning support may help decision quality": "વધુ માળખાગત તર્ક સહાય નિર્ણયની ગુણવત્તા સુધારી શકે",
  "Excellent problem-solving": "ઉત્તમ સમસ્યા-ઉકેલ ક્ષમતા",
  "Good problem-solving": "સારી સમસ્યા-ઉકેલ ક્ષમતા",
  "Average problem-solving": "સરેરાશ સમસ્યા-ઉકેલ ક્ષમતા",
  "Problem solving may be more effective in structured contexts": "માળખાગત સંદર્ભોમાં સમસ્યા ઉકેલ વધુ અસરકારક હોઈ શકે",
  "Excellent band for this aptitude block": "આ યોગ્યતા વિભાગ માટે ઉત્તમ શ્રેણી",

  // Emotional-intelligence interpretations
  "High self-awareness": "ઉચ્ચ આત્મ-જાગૃતિ",
  "Moderate self-awareness": "મધ્યમ આત્મ-જાગૃતિ",
  "Self-awareness needs more development": "આત્મ-જાગૃતિનો વધુ વિકાસ જરૂરી છે",
  "Excellent emotional control": "ઉત્તમ ભાવનાત્મક નિયંત્રણ",
  "Good self-regulation": "સારું આત્મ-નિયંત્રણ",
  "Support systems are likely important early on": "શરૂઆતમાં સહાય પ્રણાલીઓ મહત્ત્વપૂર્ણ હોવાની સંભાવના છે",
  "High intrinsic motivation": "ઉચ્ચ આંતરિક પ્રેરણા",
  "Good motivation": "સારી પ્રેરણા",
  "External structure may currently help sustain momentum": "હાલમાં બાહ્ય માળખું ગતિ જાળવવામાં મદદ કરી શકે છે",
  "High empathy": "ઉચ્ચ સહાનુભૂતિ",
  "Good social sensitivity": "સારી સામાજિક સંવેદનશીલતા",
  "Task-oriented work may feel easier than empathic load-bearing roles":
    "સહાનુભૂતિનો ભાર ઉઠાવતી ભૂમિકાઓ કરતાં કાર્યલક્ષી કામ વધુ સરળ લાગી શકે",
  "Strong social skills": "મજબૂત સામાજિક કૌશલ્યો",
  "Independent work may currently fit better than high-social-load roles":
    "હાલમાં વધુ સામાજિક ભારવાળી ભૂમિકાઓ કરતાં સ્વતંત્ર કાર્ય વધુ અનુકૂળ હોઈ શકે",

  // Career implications (atoms; scorer joins several with " | ")
  "Accounting, banking, administration, data management": "હિસાબ, બેંકિંગ, વહીવટ, ડેટા વ્યવસ્થાપન",
  "Active professions, hands-on work": "સક્રિય વ્યવસાયો, હાથવગું કાર્ય",
  "Administration, service, support": "વહીવટ, સેવા, સહાય",
  "Analysis, quality control, technical consulting": "વિશ્લેષણ, ગુણવત્તા નિયંત્રણ, તકનીકી સલાહ",
  "Any field requiring self-direction": "સ્વ-દિશાની જરૂર હોય તેવું કોઈપણ ક્ષેત્ર",
  "Applied sciences, maintenance, operations": "પ્રયુક્ત વિજ્ઞાન, જાળવણી, સંચાલન",
  "Applied technology, maintenance": "પ્રયુક્ત ટેકનોલોજી, જાળવણી",
  "Architecture, engineering, design, art, geography, surgery": "સ્થાપત્ય, ઇજનેરી, ડિઝાઇન, કલા, ભૂગોળ, શસ્ત્રક્રિયા",
  "Arts integration, entertainment industry": "કલા સંકલન, મનોરંજન ઉદ્યોગ",
  "Arts, design, media, startups": "કલા, ડિઝાઇન, મીડિયા, સ્ટાર્ટઅપ",
  "Avoid high-stress environments initially": "શરૂઆતમાં ઉચ્ચ-તણાવવાળા વાતાવરણ ટાળો",
  "Business analysis, quality control, technical roles": "વ્યવસાય વિશ્લેષણ, ગુણવત્તા નિયંત્રણ, તકનીકી ભૂમિકાઓ",
  "Business management, human resources, organizational development": "વ્યવસાય વ્યવસ્થાપન, માનવ સંસાધન, સંસ્થાકીય વિકાસ",
  "Business, sales, management, law, politics, entrepreneurship": "વ્યવસાય, વેચાણ, વ્યવસ્થાપન, કાયદો, રાજકારણ, ઉદ્યોગસાહસિકતા",
  "Business, technical fields": "વ્યવસાય, તકનીકી ક્ષેત્રો",
  "Career growth potential across many fields": "ઘણા ક્ષેત્રોમાં કરિયર વિકાસની સંભાવના",
  "Collaborative work environments": "સહયોગી કાર્ય વાતાવરણ",
  "Consulting, design, education, healthcare, professional services": "સલાહ, ડિઝાઇન, શિક્ષણ, આરોગ્યસંભાળ, વ્યાવસાયિક સેવાઓ",
  "Counseling, teaching, social work, sales, management, healthcare": "કાઉન્સેલિંગ, શિક્ષણ, સમાજ સેવા, વેચાણ, વ્યવસ્થાપન, આરોગ્યસંભાળ",
  "Creative, social, or leadership roles rather than detail-heavy clerical work":
    "વિગત-પ્રધાન કારકુની કાર્યને બદલે સર્જનાત્મક, સામાજિક અથવા નેતૃત્વ ભૂમિકાઓ",
  "Creative, unstructured, or innovative work": "સર્જનાત્મક, મુક્ત અથવા નવીન કાર્ય",
  "Customer service, basic administrative tasks": "ગ્રાહક સેવા, મૂળભૂત વહીવટી કાર્યો",
  "Customer service, team roles": "ગ્રાહક સેવા, ટીમ ભૂમિકાઓ",
  "Customer service, team-based work": "ગ્રાહક સેવા, ટીમ-આધારિત કાર્ય",
  "Customer service, training, human resources": "ગ્રાહક સેવા, તાલીમ, માનવ સંસાધન",
  "Data entry, quality control, administration": "ડેટા એન્ટ્રી, ગુણવત્તા નિયંત્રણ, વહીવટ",
  "Desk-based, intellectual work": "ડેસ્ક-આધારિત, બૌદ્ધિક કાર્ય",
  "Education, healthcare, social services": "શિક્ષણ, આરોગ્યસંભાળ, સામાજિક સેવાઓ",
  "Education, training, human resources": "શિક્ષણ, તાલીમ, માનવ સંસાધન",
  "Engineering, agriculture, construction, military, technical trades": "ઇજનેરી, ખેતી, બાંધકામ, લશ્કર, તકનીકી વ્યવસાયો",
  "Engineering, analysis, problem-solving roles": "ઇજનેરી, વિશ્લેષણ, સમસ્યા-ઉકેલ ભૂમિકાઓ",
  "Engineering, computer science, mathematics, research, finance": "ઇજનેરી, કમ્પ્યુટર વિજ્ઞાન, ગણિત, સંશોધન, નાણાં",
  "Engineering, computer science, technical analysis": "ઇજનેરી, કમ્પ્યુટર વિજ્ઞાન, તકનીકી વિશ્લેષણ",
  "Engineering, finance, science": "ઇજનેરી, નાણાં, વિજ્ઞાન",
  "Engineering, research, consulting, entrepreneurship": "ઇજનેરી, સંશોધન, સલાહ, ઉદ્યોગસાહસિકતા",
  "Entrepreneurship, journalism, consulting, startups, fast-moving environments":
    "ઉદ્યોગસાહસિકતા, પત્રકારત્વ, સલાહ, સ્ટાર્ટઅપ, ઝડપી વાતાવરણ",
  "Entrepreneurship, research, challenging roles": "ઉદ્યોગસાહસિકતા, સંશોધન, પડકારરૂપ ભૂમિકાઓ",
  "Environmental science, biology, veterinary medicine, agriculture, geology":
    "પર્યાવરણ વિજ્ઞાન, જીવવિજ્ઞાન, પશુચિકિત્સા, ખેતી, ભૂસ્તરશાસ્ત્ર",
  "Executive leadership, politics, organizational development": "કાર્યકારી નેતૃત્વ, રાજકારણ, સંસ્થાકીય વિકાસ",
  "Focus on concrete, practical applications or hands-on service roles":
    "નક્કર, વ્યવહારુ ઉપયોગો અથવા હાથવગી સેવા ભૂમિકાઓ પર ધ્યાન આપો",
  "Focus on non-musical fields": "સંગીત સિવાયના ક્ષેત્રો પર ધ્યાન આપો",
  "Focus on non-quantitative fields such as arts, social services, or humanities":
    "કલા, સામાજિક સેવાઓ અથવા માનવવિદ્યા જેવા બિન-સંખ્યાત્મક ક્ષેત્રો પર ધ્યાન આપો",
  "Focus on non-verbal strengths, including technical, hands-on, or visual fields":
    "તકનીકી, હાથવગા અથવા દૃશ્ય ક્ષેત્રો સહિત બિન-શાબ્દિક શક્તિઓ પર ધ્યાન આપો",
  "Focus on verbal or numerical strengths in humanities, business, or service work":
    "માનવવિદ્યા, વ્યવસાય અથવા સેવા કાર્યમાં શાબ્દિક અથવા સંખ્યાત્મક શક્તિઓ પર ધ્યાન આપો",
  "General communication roles, customer service": "સામાન્ય સંવાદ ભૂમિકાઓ, ગ્રાહક સેવા",
  "General office work, support roles": "સામાન્ય ઓફિસ કાર્ય, સહાયક ભૂમિકાઓ",
  "General professional roles": "સામાન્ય વ્યાવસાયિક ભૂમિકાઓ",
  "General professional work": "સામાન્ય વ્યાવસાયિક કાર્ય",
  "General technical work": "સામાન્ય તકનીકી કાર્ય",
  "General technical work, crafts": "સામાન્ય તકનીકી કાર્ય, હસ્તકલા",
  "Good for accounting, medicine, engineering": "હિસાબ, તબીબી, ઇજનેરી માટે સારું",
  "Good for counseling, social work, healthcare": "કાઉન્સેલિંગ, સમાજ સેવા, આરોગ્યસંભાળ માટે સારું",
  "Good for high-stress careers like surgery and emergency services":
    "શસ્ત્રક્રિયા અને કટોકટી સેવાઓ જેવી ઉચ્ચ-તણાવવાળી કરિયર માટે સારું",
  "Good for research, arts, innovation": "સંશોધન, કલા, નવીનતા માટે સારું",
  "Good for sales, teaching, management": "વેચાણ, શિક્ષણ, વ્યવસ્થાપન માટે સારું",
  "Graphic design, architecture, creative consulting": "ગ્રાફિક ડિઝાઇન, સ્થાપત્ય, સર્જનાત્મક સલાહ",
  "Healthcare, counseling, teaching, social work": "આરોગ્યસંભાળ, કાઉન્સેલિંગ, શિક્ષણ, સમાજ સેવા",
  "High-stress careers, leadership, healthcare": "ઉચ્ચ-તણાવવાળી કરિયર, નેતૃત્વ, આરોગ્યસંભાળ",
  "Highly structured, externally-directed roles": "અત્યંત માળખાગત, બાહ્ય-નિર્દેશિત ભૂમિકાઓ",
  "Independent, technical work": "સ્વતંત્ર, તકનીકી કાર્ય",
  "Independent, technical, or data-focused work": "સ્વતંત્ર, તકનીકી અથવા ડેટા-કેન્દ્રિત કાર્ય",
  "Law, journalism, literature": "કાયદો, પત્રકારત્વ, સાહિત્ય",
  "Law, mediation, counseling": "કાયદો, મધ્યસ્થી, કાઉન્સેલિંગ",
  "Leadership, counseling, entrepreneurship": "નેતૃત્વ, કાઉન્સેલિંગ, ઉદ્યોગસાહસિકતા",
  "Leadership, management, entrepreneurship": "નેતૃત્વ, વ્યવસ્થાપન, ઉદ્યોગસાહસિકતા",
  "Management, consulting, education": "વ્યવસ્થાપન, સલાહ, શિક્ષણ",
  "Management, sales, entrepreneurship": "વ્યવસ્થાપન, વેચાણ, ઉદ્યોગસાહસિકતા",
  "Marketing, advertising, communications": "માર્કેટિંગ, જાહેરાત, સંદેશાવ્યવહાર",
  "Marketing, finance, administration": "માર્કેટિંગ, નાણાં, વહીવટ",
  "May struggle with quantitative subjects; focus on qualitative fields":
    "સંખ્યાત્મક વિષયોમાં મુશ્કેલી પડી શકે; ગુણાત્મક ક્ષેત્રો પર ધ્યાન આપો",
  "Most professional roles": "મોટાભાગની વ્યાવસાયિક ભૂમિકાઓ",
  "Music performance, composition, sound engineering, music therapy": "સંગીત પ્રદર્શન, રચના, સાઉન્ડ એન્જિનિયરિંગ, સંગીત ઉપચાર",
  "Needs stronger support systems before high-pressure career paths.":
    "ઉચ્ચ-દબાણવાળા કરિયર માર્ગો પહેલાં મજબૂત સહાય પ્રણાલીઓની જરૂર છે.",
  "Office management, operations, support services": "ઓફિસ વ્યવસ્થાપન, સંચાલન, સહાયક સેવાઓ",
  "Office-based, social, or artistic careers": "ઓફિસ-આધારિત, સામાજિક અથવા કલાત્મક કરિયર",
  "Outdoor recreation, conservation": "આઉટડોર મનોરંજન, સંરક્ષણ",
  "People-focused or routine work": "લોકો-કેન્દ્રિત અથવા નિયમિત કાર્ય",
  "Project management, team leadership": "પ્રોજેક્ટ વ્યવસ્થાપન, ટીમ નેતૃત્વ",
  "Psychology, creative therapy, research with social impact": "મનોવિજ્ઞાન, સર્જનાત્મક ઉપચાર, સામાજિક અસરવાળું સંશોધન",
  "Psychology, philosophy, writing, research, entrepreneurship": "મનોવિજ્ઞાન, તત્ત્વજ્ઞાન, લેખન, સંશોધન, ઉદ્યોગસાહસિકતા",
  "Research, accounting, law, operations, project planning, quality-focused work":
    "સંશોધન, હિસાબ, કાયદો, સંચાલન, પ્રોજેક્ટ આયોજન, ગુણવત્તા-કેન્દ્રિત કાર્ય",
  "Research, law, analysis, leadership": "સંશોધન, કાયદો, વિશ્લેષણ, નેતૃત્વ",
  "Research, medicine, science, mathematics, computer science": "સંશોધન, તબીબી, વિજ્ઞાન, ગણિત, કમ્પ્યુટર વિજ્ઞાન",
  "Research, programming, analysis": "સંશોધન, પ્રોગ્રામિંગ, વિશ્લેષણ",
  "Research, routine, or solitary work": "સંશોધન, નિયમિત અથવા એકલા કરવાનું કાર્ય",
  "Research, science, programming": "સંશોધન, વિજ્ઞાન, પ્રોગ્રામિંગ",
  "Research, technical, creative roles": "સંશોધન, તકનીકી, સર્જનાત્મક ભૂમિકાઓ",
  "Sales, management, public relations, education": "વેચાણ, વ્યવસ્થાપન, જનસંપર્ક, શિક્ષણ",
  "Sales, marketing, public relations": "વેચાણ, માર્કેટિંગ, જનસંપર્ક",
  "Science, research, technical careers": "વિજ્ઞાન, સંશોધન, તકનીકી કરિયર",
  "Service, arts, business, and non-mechanical fields": "સેવા, કલા, વ્યવસાય અને બિન-યાંત્રિક ક્ષેત્રો",
  "Sports, dance, physical therapy, surgery, crafts, trades": "રમતગમત, નૃત્ય, ફિઝિયોથેરાપી, શસ્ત્રક્રિયા, હસ્તકલા, વ્યવસાયો",
  "Structured roles with clear procedures in technical, service, or support work":
    "તકનીકી, સેવા અથવા સહાયક કાર્યમાં સ્પષ્ટ પ્રક્રિયાઓવાળી માળખાગત ભૂમિકાઓ",
  "Structured support roles initially": "શરૂઆતમાં માળખાગત સહાયક ભૂમિકાઓ",
  "Supportive, team-based environments": "સહાયક, ટીમ-આધારિત વાતાવરણ",
  "Supports compliance, operations, and formal environments": "અનુપાલન, સંચાલન અને ઔપચારિક વાતાવરણ માટે અનુકૂળ",
  "Supports dynamic, visible, or high-energy roles": "ગતિશીલ, દેખીતી અથવા ઉચ્ચ-ઊર્જાવાળી ભૂમિકાઓ માટે અનુકૂળ",
  "Supports healthcare, social work, and arts-oriented roles": "આરોગ્યસંભાળ, સમાજ સેવા અને કલાલક્ષી ભૂમિકાઓ માટે અનુકૂળ",
  "Supports leadership, healthcare, and demanding environments": "નેતૃત્વ, આરોગ્યસંભાળ અને માગણીવાળા વાતાવરણ માટે અનુકૂળ",
  "Supports management and entrepreneurship": "વ્યવસ્થાપન અને ઉદ્યોગસાહસિકતા માટે અનુકૂળ",
  "Supports research, programming, and analytical careers": "સંશોધન, પ્રોગ્રામિંગ અને વિશ્લેષણાત્મક કરિયર માટે અનુકૂળ",
  "Supports sales, counseling, and public-facing work": "વેચાણ, કાઉન્સેલિંગ અને જનસંપર્કવાળા કાર્ય માટે અનુકૂળ",
  "Supports teaching, counseling, and relationship-heavy roles": "શિક્ષણ, કાઉન્સેલિંગ અને સંબંધ-પ્રધાન ભૂમિકાઓ માટે અનુકૂળ",
  "Teaching, communications, business": "શિક્ષણ, સંદેશાવ્યવહાર, વ્યવસાય",
  "Teaching, counseling, healthcare, social work, ministry": "શિક્ષણ, કાઉન્સેલિંગ, આરોગ્યસંભાળ, સમાજ સેવા, ધાર્મિક સેવા",
  "Teaching, training, educational leadership": "શિક્ષણ, તાલીમ, શૈક્ષણિક નેતૃત્વ",
  "Technical fields, management, analysis": "તકનીકી ક્ષેત્રો, વ્યવસ્થાપન, વિશ્લેષણ",
  "Technical fields, trades, visual arts": "તકનીકી ક્ષેત્રો, વ્યવસાયો, દૃશ્ય કલા",
  "Technical, analytical work": "તકનીકી, વિશ્લેષણાત્મક કાર્ય",
  "Technical, hands-on, or visual-based careers": "તકનીકી, હાથવગી અથવા દૃશ્ય-આધારિત કરિયર",
  "Technical, routine, or highly structured work": "તકનીકી, નિયમિત અથવા અત્યંત માળખાગત કાર્ય",
  "Urban, indoor-focused careers": "શહેરી, ઇન્ડોર-કેન્દ્રિત કરિયર",
  "Verbal or numerical focused careers": "શાબ્દિક અથવા સંખ્યાત્મક કેન્દ્રિત કરિયર",
  "Visual arts, performing arts, creative writing, design, media": "દૃશ્ય કલા, પ્રદર્શન કલા, સર્જનાત્મક લેખન, ડિઝાઇન, મીડિયા",
  "Writing, journalism, law, teaching, translation, public relations": "લેખન, પત્રકારત્વ, કાયદો, શિક્ષણ, અનુવાદ, જનસંપર્ક",

  // RIASEC pattern sentences
  "Artistic-Investigative-Enterprising pattern blends creativity with analytical initiative":
    "કલાત્મક-સંશોધનાત્મક-સાહસિક પેટર્ન સર્જનાત્મકતાને વિશ્લેષણાત્મક પહેલ સાથે જોડે છે",
  "Enterprising-Conventional-Social pattern points to organized influence and people coordination":
    "સાહસિક-પરંપરાગત-સામાજિક પેટર્ન વ્યવસ્થિત પ્રભાવ અને લોકોના સંકલન તરફ સંકેત આપે છે",
  "Investigative-Artistic-Social pattern blends analysis with human-centered creativity":
    "સંશોધનાત્મક-કલાત્મક-સામાજિક પેટર્ન વિશ્લેષણને માનવ-કેન્દ્રિત સર્જનાત્મકતા સાથે જોડે છે",
  "Realistic-Investigative-Conventional pattern favors technical precision and systems work":
    "વાસ્તવવાદી-સંશોધનાત્મક-પરંપરાગત પેટર્ન તકનીકી ચોકસાઈ અને પ્રણાલી-આધારિત કાર્યને પ્રાધાન્ય આપે છે",
  "Social-Enterprising-Artistic pattern favors people influence with expressive communication":
    "સામાજિક-સાહસિક-કલાત્મક પેટર્ન અભિવ્યક્તિશીલ સંવાદ સાથે લોકો પર પ્રભાવને પ્રાધાન્ય આપે છે",

  // Career-match reason edge cases
  "Career does not specify Holland codes.": "આ કરિયર માટે Holland કોડ નિર્ધારિત નથી.",
};

const HOLLAND_LETTERS = { R: "Realistic", I: "Investigative", A: "Artistic", S: "Social", E: "Enterprising", C: "Conventional" };

// Sentence templates. `api.tr` / `api.trAnyList` translate captured parts.
export const templates = [
  {
    // Career implications joined by " | " (each part is its own phrase).
    re: /^.+ \| .+$/,
    render: (m, api) => {
      const parts = m[0].split(" | ").map((part) => api.atom(part.trim()));
      return parts.some((part) => part == null) ? null : parts.join(" | ");
    },
  },
  {
    re: /^Key findings: (.+?)\.?$/,
    render: (m, api) => {
      const items = api.trAnyList(m[1]);
      return items == null ? null : `મુખ્ય તારણો: ${items}.`;
    },
  },
  {
    re: /^Top Holland Pattern: ([RIASEC]{1,3})$/,
    render: (m) => `મુખ્ય Holland પેટર્ન: ${m[1]}`,
  },
  {
    // The subject never contains ", "; an " and " followed by a translatable
    // phrase means the match ran into the next list item, so reject it and
    // let the list splitter cut there instead.
    re: /^(Notable interest in|Strong preference for) ([^,]+)$/,
    render: (m, api) => {
      const tail = m[2].split(" and ").slice(1).join(" and ");
      if (tail && api.atom(tail) != null) return null;
      const subject = api.tr(m[2]);
      return m[1] === "Notable interest in"
        ? `${subject}માં નોંધપાત્ર રુચિ`
        : `${subject} માટે મજબૂત પસંદગી`;
    },
  },
  {
    re: /^Top subject pull: (.+?)\.?$/,
    render: (m, api) => `સૌથી વધુ આકર્ષતા વિષયો: ${api.trList(splitJoinList(m[1]))}.`,
  },
  {
    re: /^Leading subject preference: (.+)$/,
    render: (m, api) => `મુખ્ય વિષય પસંદગી: ${api.tr(m[1])}`,
  },
  {
    // "Top Holland themes: Social 5/5 and Conventional 4.83/5"
    re: /^Top Holland themes: (.+?)\.?$/,
    render: (m, api) => {
      const items = themeItems(m[1], api);
      return items == null ? null : `મુખ્ય Holland થીમ્સ: ${items}.`;
    },
  },
  {
    // "<pattern sentence>. Top themes: Artistic 3.5/5 and Investigative 2.83/5"
    re: /^(.+?)\. Top themes: (.+?)\.?$/,
    render: (m, api) => {
      const head = api.atom(m[1]);
      const items = themeItems(m[2], api);
      return head == null || items == null ? null : `${head}. મુખ્ય થીમ્સ: ${items}.`;
    },
  },
  {
    re: /^Activity choices map to a (\S+) Holland interest pattern, led by (.+?)\. These feed the RIASEC interest scores\.?$/,
    render: (m, api) => {
      const code = /^[RIASEC]{1,3}$/.test(m[1]) ? m[1] : api.tr(m[1]);
      const led = splitJoinList(m[2]).map((item) => {
        const x = /^(\w+) \((\d+)\)$/.exec(item);
        return x ? `${api.tr(x[1])} (${x[2]})` : api.tr(item);
      });
      return `પ્રવૃત્તિની પસંદગીઓ ${code} Holland રુચિ પેટર્ન દર્શાવે છે, જેમાં મુખ્ય છે ${guJoin(led)}. આ RIASEC રુચિ સ્કોરમાં ઉમેરાય છે.`;
    },
  },
  {
    re: /^No activity preferences were answered, so no Holland interest pattern could be derived\.?$/,
    render: () => "પ્રવૃત્તિ પસંદગીના જવાબો ન હોવાથી Holland રુચિ પેટર્ન નક્કી થઈ શકી નથી.",
  },
  {
    re: /^Top (\d+)% profile strength$/,
    render: (m) => `પ્રોફાઇલ ક્ષમતામાં ટોચના ${m[1]}%`,
  },
  // Career match reasons (backend/utils/scoring/careerMatcher.js)
  {
    re: /^Your dominant interest codes? (.+) aligns? with this path\.$/,
    render: (m) => {
      const codes = splitJoinList(m[1]).map((item) => {
        const x = /^([RIASEC]) \((\w+)\)$/.exec(item);
        return x ? `${x[1]} (${phrasesOrTerm(x[2])})` : item;
      });
      return `તમારા મુખ્ય રુચિ કોડ ${guJoin(codes)} આ માર્ગ સાથે સુસંગત છે.`;
    },
  },
  {
    re: /^Career leans on ([RIASEC]) \((\w+)\) interests — partial match on your current profile\.$/,
    render: (m) => `આ કરિયર ${m[1]} (${phrasesOrTerm(m[2] || HOLLAND_LETTERS[m[1]])}) રુચિઓ પર આધારિત છે — તમારી હાલની પ્રોફાઇલ સાથે આંશિક મેળ.`,
  },
  {
    re: /^(Strong intelligence signals in|Strong aptitude scores in|High EQ in) (.+)\.$/,
    render: (m, api) => {
      const items = api.trList(splitJoinList(m[2]));
      if (m[1] === "Strong intelligence signals in") return `${items}માં મજબૂત બુદ્ધિ સંકેતો.`;
      if (m[1] === "Strong aptitude scores in") return `${items}માં મજબૂત યોગ્યતા સ્કોર.`;
      return `${items}માં ઉચ્ચ EQ.`;
    },
  },
  {
    re: /^(This career draws on|Key aptitude areas|Career leans on EQ areas) (.+) — partial signal on your profile\.$/,
    render: (m, api) => {
      const items = api.trList(splitJoinList(m[2]));
      if (m[1] === "This career draws on") return `આ કરિયર ${items} પર આધારિત છે — તમારી પ્રોફાઇલમાં આંશિક સંકેત.`;
      if (m[1] === "Key aptitude areas") return `મુખ્ય યોગ્યતા ક્ષેત્રો ${items} — તમારી પ્રોફાઇલમાં આંશિક સંકેત.`;
      return `આ કરિયર EQ ક્ષેત્રો ${items} પર આધારિત છે — તમારી પ્રોફાઇલમાં આંશિક સંકેત.`;
    },
  },
  {
    re: /^(This career draws on|Key aptitude areas|Career leans on EQ areas) not specified for this career\.$/,
    render: (m) =>
      m[1] === "Key aptitude areas"
        ? "આ કરિયર માટે મુખ્ય યોગ્યતા ક્ષેત્રો નિર્ધારિત નથી."
        : m[1] === "Career leans on EQ areas"
          ? "આ કરિયર માટે EQ ક્ષેત્રો નિર્ધારિત નથી."
          : "આ કરિયર માટે બુદ્ધિ ક્ષેત્રો નિર્ધારિત નથી.",
  },
];

// Gujarati list join: "A, B અને C".
export const guJoin = (items = []) => {
  const list = items.filter((x) => x != null && String(x).trim() !== "");
  if (list.length <= 1) return list.join("");
  return `${list.slice(0, -1).join(", ")} અને ${list[list.length - 1]}`;
};

// Split the scorer's joinList output when items are known to be simple
// (no internal commas): "A, B, and C" / "A and B".
function splitJoinList(s) {
  return String(s)
    .replace(/, and /g, ", ")
    .split(/, | and /)
    .map((x) => x.trim())
    .filter(Boolean);
}

function phrasesOrTerm(word) {
  return terms[word] || phrases[word] || word;
}

function themeItems(s, api) {
  const out = [];
  for (const item of splitJoinList(s)) {
    const x = /^(.+?) ([\d.]+\/5)$/.exec(item);
    if (!x) return null;
    const name = api.atom(x[1]);
    if (name == null) return null;
    out.push(`${name} ${x[2]}`);
  }
  return guJoin(out);
}
