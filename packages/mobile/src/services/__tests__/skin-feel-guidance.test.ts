import type { SkinFeel } from '../skin-feel-checkin-service';
import { skinFeelGuidance } from '../skin-feel-guidance';

test('every saved skin-feel choice offers a brief, non-diagnostic action', () => {
  const choices: SkinFeel[] = ['comfortable', 'dry_tight', 'oily', 'sensitive', 'mixed'];
  for (const feel of choices) {
    const copy = skinFeelGuidance(feel);
    expect(copy.length).toBeGreaterThan(35);
    expect(copy.length).toBeLessThan(175);
    expect(copy).not.toMatch(/cure|treat|diagnos|guarantee|buy|purchase/i);
  }
  expect(skinFeelGuidance('sensitive')).toMatch(/stop using a product|dermatologist/i);
  expect(skinFeelGuidance('comfortable')).toMatch(/no need to add more products/i);
});
