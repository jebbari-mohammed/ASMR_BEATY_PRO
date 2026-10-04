import type { SkinFeel } from './skin-feel-checkin-service';

// General comfort cues, not a diagnosis or an automatic change to a person's routine.
// AAD advises stopping a product that causes a reaction and seeking a
// dermatologist for persistent or severe symptoms. Prescribed products need
// advice from the prescriber before the person changes use.
// https://www.aad.org/public/everyday-care/skin-care-secrets/prevent-skin-problems/test-skin-care-products/
// https://www.aad.org/public/everyday-care/skin-care-secrets/anti-aging/maximize-anti-aging-products/
const guidance: Record<SkinFeel, string> = {
  comfortable: 'If your familiar steps feel comfortable, keep them simple. There is no need to add more products today.',
  dry_tight: 'A familiar moisturizer on slightly damp skin may feel more comfortable. If a product stings or burns, stop using it; ask your prescriber before changing a prescribed product.',
  oily: 'Keep cleansing gentle. Extra washing or scrubbing because of today’s shine can irritate your skin.',
  sensitive: 'If a product stings or burns, stop using it. Ask your prescriber before changing a prescribed product, and see a dermatologist for persistent or severe symptoms.',
  mixed: 'Use a familiar moisturizer on areas that feel tight, and a lighter amount where you feel shiny.'
};

export function skinFeelGuidance(feel: SkinFeel): string {
  return guidance[feel];
}
