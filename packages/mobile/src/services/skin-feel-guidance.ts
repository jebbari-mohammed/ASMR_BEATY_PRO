import type { SkinFeel } from './skin-feel-checkin-service';

// General comfort cues, not a diagnosis or an automatic change to a person's routine.
const guidance: Record<SkinFeel, string> = {
  comfortable: 'If your familiar steps feel comfortable, keep them simple. There is no need to add more products today.',
  dry_tight: 'A familiar moisturizer on slightly damp skin may feel more comfortable. Stop using anything that stings.',
  oily: 'Keep cleansing gentle. Extra washing or scrubbing because of today’s shine can irritate your skin.',
  sensitive: 'Stop using a product that stings or burns. Keep to familiar, gentle steps; ask a dermatologist about persistent or severe symptoms.',
  mixed: 'Use a familiar moisturizer on areas that feel tight, and a lighter amount where you feel shiny.'
};

export function skinFeelGuidance(feel: SkinFeel): string {
  return guidance[feel];
}
