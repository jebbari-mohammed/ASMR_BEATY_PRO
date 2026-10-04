import type { OnboardingStateV1 } from '@asmr/shared';
import type { RoutineStep } from './routine-service';

export type StarterAnswers = Pick<OnboardingStateV1, 'selectedGoals' | 'skinFeelByEndOfDay' | 'sensitivityLevel' | 'timeCommitment' | 'desiredComplexity' | 'existingRoutineTier' | 'sunscreenHabit' | 'primaryMotivation'>;

export type StarterPlan = {
  steps: RoutineStep[];
  headline: string;
  ritualName: string;
  personalInsight: string;
  explanation: string;
  focus: string;
  caution: string;
  whyItFits: string[];
  habitPrompt: string;
  firstWeek: { day: string; title: string; detail: string }[];
};

const goalNames: Record<string, string> = {
  fewer_visible_breakouts: 'a calmer-looking complexion',
  calmer_looking_redness: 'a calmer-looking complexion',
  smoother_looking_texture: 'a smoother-looking texture',
  less_noticeable_pores: 'a gentle, steady routine',
  more_even_looking_tone: 'a sun protection habit',
  more_hydration_less_dryness: 'a more comfortable feel',
  less_shine_oiliness: 'a comfortable balance',
  dark_circle_appearance: 'gentle care around your eyes',
  fine_line_appearance: 'a sun protection habit',
  unsure_help_me_decide: 'a simple daily habit'
};

export function buildStarterPlan(state: StarterAnswers): StarterPlan {
  const goals = new Set(state.selectedGoals);
  const dry = state.skinFeelByEndOfDay === 'tight_or_dry';
  const oily = state.skinFeelByEndOfDay === 'oily_or_shiny';
  const combination = state.skinFeelByEndOfDay === 'combination_dry_and_oily';
  // An occasional reaction is enough to favor the gentler starter wording.
  // These answers cannot rule out allergies or an underlying skin condition.
  const sensitive = state.sensitivityLevel === 'sometimes' || state.sensitivityLevel === 'often' || state.sensitivityLevel === 'very_easily';
  const short = state.timeCommitment === 'about_2_minutes' || state.desiredComplexity === 'minimal';
  const hydrationGoal = goals.has('more_hydration_less_dryness');
  const shineGoal = goals.has('less_shine_oiliness');
  const breakoutGoal = goals.has('fewer_visible_breakouts');
  const rednessGoal = goals.has('calmer_looking_redness');
  const textureGoal = goals.has('smoother_looking_texture') || goals.has('less_noticeable_pores');
  const eyeGoal = goals.has('dark_circle_appearance');
  const sunGoal = goals.has('more_even_looking_tone') || goals.has('fine_line_appearance');
  const focus = goalNames[state.selectedGoals[0] ?? ''] ?? 'a simple daily habit';
  const primaryGoal = state.selectedGoals[0];
  const ritualName = primaryGoal === 'more_hydration_less_dryness' ? 'The Comfort Ritual'
    : primaryGoal === 'less_shine_oiliness' ? 'The Balance Ritual'
    : primaryGoal === 'calmer_looking_redness' ? 'The Gentle Ritual'
    : primaryGoal === 'fewer_visible_breakouts' ? 'The Steady Ritual'
    : primaryGoal === 'smoother_looking_texture' ? 'The Simple Ritual'
    : 'Your Everyday Ritual';
  const base: RoutineStep[] = [];

  if (!short) base.push({
    id: 'm1', period: 'morning', category: 'Cleanse', name: dry || sensitive ? 'Refresh gently' : 'Gentle cleanse',
    detail: dry || sensitive || rednessGoal
      ? 'A lukewarm water rinse may be enough. If you cleanse, use a familiar gentle cleanser and avoid scrubbing.'
      : breakoutGoal || textureGoal
        ? 'Use a familiar gentle cleanser with your fingertips, or rinse with water. Avoid scrubbing.'
        : 'Use a gentle cleanser you already tolerate, or rinse with water.'
  });
  base.push({
    id: 'm2', period: 'morning', category: 'Hydrate', name: 'Moisturize',
    detail: dry || hydrationGoal
      ? 'Apply a familiar moisturizer while skin is slightly damp after rinsing, if that feels comfortable.'
      : sensitive || rednessGoal
        ? 'Use a familiar moisturizer. If you replace it, look for fragrance-free and introduce it slowly.'
        : combination
          ? 'Use a familiar moisturizer on dry areas first; apply a lighter amount where your skin feels shiny.'
        : oily || shineGoal || breakoutGoal
          ? 'Use a light moisturizer you tolerate; if replacing it, look for one labeled non-comedogenic.'
          : eyeGoal
            ? 'Apply a familiar moisturizer gently, without rubbing or tugging around your eyes.'
            : 'Apply a moisturizer you already know and tolerate.'
  });
  base.push({
    id: 'm3', period: 'morning', category: 'Protect', name: 'Sun protection',
    detail: state.sunscreenHabit === 'never' || state.sunscreenHabit === 'rarely'
      ? 'Before going outdoors, use broad-spectrum, water-resistant SPF 30+ sunscreen if you have it. Meanwhile, seek shade and wear protective clothing.'
      : state.sunscreenHabit === 'mostly_sunny_days'
        ? 'Before outdoor time, use broad-spectrum, water-resistant SPF 30+ sunscreen even on cloudy days; reapply as the label directs.'
        : sunGoal
          ? 'Prioritize broad-spectrum, water-resistant SPF 30+ sunscreen before outdoor daylight; reapply as the label directs.'
          : 'Before outdoor daylight, use broad-spectrum, water-resistant SPF 30+ sunscreen; reapply as the label directs.'
  });
  base.push({
    id: 'e1', period: 'evening', category: 'Cleanse', name: 'Gentle cleanse',
    detail: sensitive || rednessGoal
      ? 'Wash with a familiar gentle cleanser and lukewarm water. Pat dry; do not scrub or rub.'
      : breakoutGoal || textureGoal
        ? 'Wash off sunscreen with a familiar gentle cleanser and your fingertips. Avoid abrasive scrubs.'
        : 'Wash off sunscreen and the day with a gentle cleanser you already tolerate.'
  });
  base.push({
    id: 'e2', period: 'evening', category: 'Hydrate', name: 'Moisturize',
    detail: dry || hydrationGoal
      ? 'Finish with a familiar moisturizer while skin is still slightly damp, if that feels comfortable.'
      : sensitive || rednessGoal
        ? 'Finish with a familiar moisturizer; skip anything that stings or irritates your skin.'
        : eyeGoal
          ? 'Finish with a familiar moisturizer, applying gently without tugging around your eyes.'
          : 'Finish with a moisturizer you already tolerate.'
  });

  const headline = short ? 'Your quick ritual is ready.' : 'Your daily ritual is ready.';
  const explanation = short
    ? 'Two morning steps and two evening steps make this easy to return to. You can edit every step after joining.'
    : 'A gentle foundation for morning and evening. You can edit every step after joining.';
  const caution = sensitive
    ? 'You said your skin sometimes reacts. Use products you already tolerate; stop anything that stings or burns. Ask a dermatologist about persistent or severe symptoms.'
    : 'Use products you already tolerate and skip any step that needs a product you do not own. Stop anything that irritates you; ask a dermatologist about persistent or severe symptoms.';

  const whyItFits = [
    short ? 'You chose a short ritual, so morning starts with moisturizer and sun protection.' : 'Your morning cleanse can be a quick water rinse when that feels better.',
    dry ? 'You described tightness, so the moisturizer step suggests applying it to slightly damp skin.' : oily ? 'You described shine, so the moisturizer note favors a light, non-comedogenic feel.' : combination ? 'You described dry and shiny areas, so you can use a lighter amount of moisturizer where your skin feels shiny.' : 'It begins with products you already tolerate.',
    sensitive ? 'You said products can bother your skin, so the steps avoid scrubbing and add no new treatment.' : 'You can decide later whether any other products belong in your routine.'
  ];
  if (breakoutGoal) whyItFits.push('For visible breakouts, cleanse gently and avoid abrasive scrubs; this is a care routine, not an acne treatment.');
  else if (textureGoal) whyItFits.push('For texture or pores, the cleanse step stays gentle instead of adding an abrasive scrub.');
  else if (rednessGoal) whyItFits.push('For redness, the cleanse step uses lukewarm water and avoids rubbing.');
  else if (eyeGoal) whyItFits.push('For the under-eye area, apply familiar products gently without tugging.');
  else if (sunGoal) whyItFits.push('For your appearance goal, the plan prioritizes sun protection without promising a visible change.');
  if (state.sunscreenHabit === 'never' || state.sunscreenHabit === 'rarely') whyItFits.push('Sun protection has its own morning step because you said it is not yet a regular habit.');
  if (state.existingRoutineTier === 'nothing_yet') whyItFits.push('Starting from zero is enough; this plan does not require buying products.');
  if (state.existingRoutineTier === 'advanced') whyItFits.push('Already have products? You can replace these starter steps with your own familiar routine.');
  const habitPrompt = state.primaryMotivation === 'see_visible_progress' ? 'Use the calendar to see the days you showed up, without judging missed days.'
    : state.primaryMotivation === 'understand_my_skin' ? 'Notice which familiar steps feel comfortable, and skip a product that irritates you.'
    : state.primaryMotivation === 'find_right_products' ? 'Keep the products you already own together on your private shelf.'
    : 'Return to your small ritual when you can; consistency grows one day at a time.';

  const personalInsight = `${short ? 'You asked for something quick' : 'You made room for a slower moment'}${dry ? ' and said your skin feels tight by evening' : oily ? ' and notice shine by evening' : ''}. ${sensitive ? 'So your start stays with familiar, gentle products.' : 'So your first week begins with simple steps you can adjust.'}`;
  const firstWeek = [
    {
      day: 'DAY 01', title: 'Make it familiar',
      detail: state.existingRoutineTier === 'nothing_yet' || !state.existingRoutineTier
        ? 'Begin with any basics you already own. If a step needs a product you do not have, skip it until you are ready.'
        : 'Match each step to a product you already use and feel comfortable with.'
    },
    {
      day: 'DAYS 02–06', title: short ? 'Keep a simple rhythm' : 'Find your own pace',
      detail: state.sunscreenHabit === 'never' || state.sunscreenHabit === 'rarely'
        ? 'Before going outdoors, check for sun protection. A missed day does not erase your progress.'
        : short
          ? 'Return to your two morning and two evening steps. A missed day does not erase your progress.'
          : 'Follow your morning and evening steps when they fit. Adjust anything that feels like too much.'
    },
    {
      day: 'DAY 07', title: state.primaryMotivation === 'see_visible_progress' ? 'Look back, gently' : 'Make it yours',
      detail: habitPrompt
    }
  ];

  return { steps: base, headline, ritualName, personalInsight, explanation, focus, caution, whyItFits, habitPrompt, firstWeek };
}
