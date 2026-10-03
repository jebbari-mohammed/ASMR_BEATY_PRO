import { buildStarterPlan } from '../personalized-starter';

test('a short, dry and reactive-skin plan stays gentle and fits four steps', () => {
  const plan = buildStarterPlan({
    selectedGoals: ['more_hydration_less_dryness'],
    skinFeelByEndOfDay: 'tight_or_dry',
    sensitivityLevel: 'very_easily',
    timeCommitment: 'about_2_minutes',
    sunscreenHabit: 'never',
    existingRoutineTier: 'nothing_yet',
    primaryMotivation: 'see_visible_progress'
  });
  expect(plan.steps).toHaveLength(4);
  expect(plan.steps.filter(step => step.period === 'morning').map(step => step.category)).toEqual(['Hydrate', 'Protect']);
  expect(plan.steps.find(step => step.id === 'm2')?.detail).toContain('comfortable');
  expect(plan.caution).toContain('reacts easily');
  expect(plan.steps.every(step => step.category !== 'Treat')).toBe(true);
  expect(plan.whyItFits).toEqual(expect.arrayContaining([expect.stringContaining('Sun protection'), expect.stringContaining('Starting from zero')]));
  expect(plan.habitPrompt).toContain('calendar');
  expect(plan.ritualName).toBe('The Comfort Ritual');
  expect(plan.firstWeek[0].detail).toContain('do not need to buy');
  expect(plan.firstWeek[1].title).toContain('two minutes');
});

test('a longer oily-skin plan keeps sun protection and adds gentle morning cleansing', () => {
  const plan = buildStarterPlan({
    selectedGoals: ['less_shine_oiliness'],
    skinFeelByEndOfDay: 'oily_or_shiny',
    timeCommitment: 'about_5_minutes'
  });
  expect(plan.steps).toHaveLength(5);
  expect(plan.steps.find(step => step.id === 'm1')?.name).toBe('Gentle cleanse');
  expect(plan.steps.find(step => step.id === 'm2')?.detail).toContain('light');
  expect(plan.steps.find(step => step.id === 'm3')?.category).toBe('Protect');
  expect(plan.ritualName).toBe('The Balance Ritual');
  expect(plan.firstWeek[1].title).toBe('Find your own pace');
  expect(plan.personalInsight).toContain('shine');
});
