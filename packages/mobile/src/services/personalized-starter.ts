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
  more_hydration_less_dryness: 'a more comfortable feel',
  less_shine_oiliness: 'a comfortable balance',
  fine_line_appearance: 'a steady care habit',
  unsure_help_me_decide: 'a simple daily habit'
};

export function buildStarterPlan(state: StarterAnswers): StarterPlan {
  const dry = state.skinFeelByEndOfDay === 'tight_or_dry';
  const oily = state.skinFeelByEndOfDay === 'oily_or_shiny';
  const sensitive = state.sensitivityLevel === 'often' || state.sensitivityLevel === 'very_easily';
  const short = state.timeCommitment === 'about_2_minutes' || state.desiredComplexity === 'minimal';
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
    id: 'm1', period: 'morning', category: 'Cleanse', name: dry ? 'Refresh gently' : 'Gentle cleanse',
    detail: dry ? 'A water rinse may be enough in the morning. Use a cleanser only if it feels comfortable.' : 'Use a gentle cleanser you already tolerate, or rinse with water.'
  });
  base.push({
    id: 'm2', period: 'morning', category: 'Hydrate', name: 'Moisturize',
    detail: dry ? 'Use a moisturizer that helps your skin feel comfortable.' : oily ? 'Choose a moisturizer that feels comfortable and light on your skin.' : 'Apply a moisturizer you already know and tolerate.'
  });
  base.push({
    id: 'm3', period: 'morning', category: 'Protect', name: 'Sun protection',
    detail: 'Apply broad-spectrum sunscreen as directed on its label; reapply as the label advises.'
  });
  base.push({
    id: 'e1', period: 'evening', category: 'Cleanse', name: 'Gentle cleanse',
    detail: 'Wash off sunscreen and the day with a cleanser you already tolerate.'
  });
  base.push({
    id: 'e2', period: 'evening', category: 'Hydrate', name: 'Moisturize',
    detail: dry ? 'Finish with your usual moisturizer while skin is still slightly damp, if that feels good.' : 'Finish with a moisturizer you already tolerate.'
  });

  const headline = short ? 'Your two-minute ritual is ready.' : 'Your daily ritual is ready.';
  const explanation = short
    ? 'A small routine is easier to return to. You can add products and steps after joining.'
    : 'A gentle foundation for morning and evening. You can edit every step after joining.';
  const caution = sensitive
    ? 'You told us your skin reacts easily. Keep familiar products, introduce anything new slowly, and stop a product that irritates you.'
    : 'Start with products you already tolerate. Introduce anything new slowly and stop a product that irritates you.';

  const whyItFits = [
    short ? 'You chose a short ritual, so morning starts with just moisturizer and sun protection.' : 'You have room for a gentle morning cleanse.',
    dry ? 'You described tightness, so the plan favors comfort and never insists on a morning cleanse.' : oily ? 'You described shine, so the moisturizer note favors a light feel.' : 'It begins with products you already tolerate.',
    sensitive ? 'You said products can bother your skin, so no new treatment is added.' : 'You can decide later whether any other products belong in your routine.'
  ];
  if (state.sunscreenHabit === 'never' || state.sunscreenHabit === 'rarely') whyItFits.push('Sun protection has its own morning step because you said it is not yet a regular habit.');
  if (state.existingRoutineTier === 'nothing_yet') whyItFits.push('Starting from zero is enough; this plan does not require buying products.');
  if (state.existingRoutineTier === 'advanced') whyItFits.push('Already have products? You can replace these starter steps with your own familiar routine.');
  const habitPrompt = state.primaryMotivation === 'see_visible_progress' ? 'Use the calendar to see the days you showed up, without judging missed days.'
    : state.primaryMotivation === 'understand_my_skin' ? 'Use a short journal note to remember what you actually noticed.'
    : state.primaryMotivation === 'find_right_products' ? 'Keep the products you already own together on your private shelf.'
    : 'Return to your small ritual when you can; consistency grows one day at a time.';

  const personalInsight = `${short ? 'You asked for something quick' : 'You made room for a slower moment'}${dry ? ' and said your skin feels tight by evening' : oily ? ' and notice shine by evening' : ''}. ${sensitive ? 'So your start stays with familiar, gentle products.' : 'So your first week begins with the basics you already know.'}`;
  const firstWeek = [
    {
      day: 'DAY 01', title: 'Make it familiar',
      detail: state.existingRoutineTier === 'nothing_yet'
        ? 'Start with the products you already own. You do not need to buy a new routine.'
        : 'Match each step to a product you already use and feel comfortable with.'
    },
    {
      day: 'DAYS 02–06', title: short ? 'Keep it under two minutes' : 'Find your own pace',
      detail: short
        ? 'Return to your short morning and evening steps. A missed day does not erase your progress.'
        : 'Follow your morning and evening steps when they fit. Adjust anything that feels like too much.'
    },
    {
      day: 'DAY 07', title: state.primaryMotivation === 'see_visible_progress' ? 'Look back, gently' : 'Make it yours',
      detail: habitPrompt
    }
  ];

  return { steps: base, headline, ritualName, personalInsight, explanation, focus, caution, whyItFits, habitPrompt, firstWeek };
}
