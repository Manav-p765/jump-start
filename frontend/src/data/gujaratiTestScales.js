// Answer-scale labels for the Gujarati test package.
//
// The Gujarati package renders its scales in Gujarati regardless of the
// site UI language, using the wording the client reviewed (each section has
// its own scale, unlike the English package which shares one Likert scale
// across Sections 1, 2 and 5). Values stay 1..5, so scoring is unaffected.

const AGREEMENT = ["સંપૂર્ણ અસંમત", "થોડો અસંમત", "અનિર્ણિત", "થોડો સંમત", "સંપૂર્ણ સંમત"];
const FREQUENCY = ["ક્યારેય નહીં", "ક્યારેક", "નક્કી નહીં", "મોટા ભાગે", "હંમેશા"];
const PREFERENCE = [
  "1: જરાય પસંદ નથી",
  "2: ઓછું પસંદ છે",
  "3: અનિર્ણિત",
  "4: પસંદ છે",
  "5: અત્યંત પસંદ છે",
];

const toOptions = (labels) => labels.map((label, i) => ({ label, value: i + 1 }));

export const GUJARATI_SCALE_OPTIONS = Object.freeze({
  1: toOptions(AGREEMENT),
  2: toOptions(FREQUENCY),
  3: toOptions(PREFERENCE),
  5: toOptions(AGREEMENT),
});

export const GUJARATI_INTEREST_INSTRUCTIONS = Object.freeze({
  heading: "રૂચિ મૂલ્યાંકન સૂચના",
  rate: "સૂચના: દરેક પ્રવૃત્તિ માટે તમારી પસંદગીને 1 (જરાય પસંદ નથી) થી 5 (અત્યંત પસંદ છે) સુધી રેટ કરો",
  group: "સૂચના: દરેક જૂથમાંથી તમને સૌથી વધુ પસંદ હોય તે પ્રવૃત્તિ પસંદ કરો",
});
