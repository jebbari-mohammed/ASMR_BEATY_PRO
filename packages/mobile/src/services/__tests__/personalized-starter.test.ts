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
  expect(plan.caution).toContain('skin can react');
  expect(plan.steps.every(step => step.category !== 'Treat')).toBe(true);
  expect(plan.whyItFits).toEqual(expect.arrayContaining([expect.stringContaining('Sun protection'), expect.stringContaining('Starting from zero')]));
  expect(plan.habitPrompt).toContain('calendar');
  expect(plan.ritualName).toBe('The Comfort Ritual');
  expect(plan.firstWeek[0].detail).toContain('skip it until you are ready');
  expect(plan.firstWeek[1].title).toBe('Keep a simple rhythm');
  expect(plan.steps.find(step => step.id === 'm3')?.detail).toContain('shade and wear protective clothing');
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

test('the selected goals affect usable steps without adding a treatment', () => {
  const plan = buildStarterPlan({
    selectedGoals: ['fine_line_appearance', 'fewer_visible_breakouts'],
    skinFeelByEndOfDay: 'comfortable_balanced',
    sunscreenHabit: 'every_day'
  });
  expect(plan.steps.find(step => step.id === 'm2')?.detail).toContain('non-comedogenic');
  expect(plan.steps.find(step => step.id === 'm3')?.detail).toContain('Prioritize broad-spectrum');
  expect(plan.steps.find(step => step.id === 'e1')?.detail).toContain('Avoid abrasive scrubs');
  expect(plan.steps.every(step => step.category !== 'Treat')).toBe(true);
  expect(plan.focus).toBe('a sun protection habit');
});

test('reactive skin and a redness goal keep cleansing and replacement advice gentle', () => {
  const plan = buildStarterPlan({
    selectedGoals: ['calmer_looking_redness'],
    skinFeelByEndOfDay: 'changes_a_lot',
    sensitivityLevel: 'often',
    timeCommitment: 'about_5_minutes'
  });
  expect(plan.steps.find(step => step.id === 'm1')?.detail).toContain('lukewarm water rinse');
  expect(plan.steps.find(step => step.id === 'e1')?.detail).toContain('Pat dry');
  expect(plan.steps.find(step => step.id === 'm2')?.detail).toContain('fragrance-free');
});

test('combination skin, an under-eye goal and sunscreen habits produce different guidance', () => {
  const combination = buildStarterPlan({
    selectedGoals: ['dark_circle_appearance'],
    skinFeelByEndOfDay: 'combination_dry_and_oily',
    sunscreenHabit: 'mostly_sunny_days'
  });
  const eye = buildStarterPlan({ selectedGoals: ['dark_circle_appearance'] });
  expect(combination.steps.find(step => step.id === 'm2')?.detail).toContain('dry areas first');
  expect(eye.steps.find(step => step.id === 'e2')?.detail).toContain('without tugging');
  expect(combination.steps.find(step => step.id === 'm3')?.detail).toContain('cloudy days');
  expect(eye.steps.find(step => step.id === 'm3')?.detail).not.toContain('cloudy days');
});

test('starter step IDs and details remain valid for saved routines', () => {
  const plan = buildStarterPlan({
    selectedGoals: ['smoother_looking_texture'],
    sensitivityLevel: 'very_easily',
    sunscreenHabit: 'never'
  });
  expect(plan.steps.map(step => step.id)).toEqual(['m1', 'm2', 'm3', 'e1', 'e2']);
  expect(plan.steps.every(step => step.name.length <= 60 && step.detail.length <= 180)).toBe(true);
});

test('missing legacy answers do not assume products or promise unavailable journaling', () => {
  const current = buildStarterPlan({ selectedGoals: ['unsure_help_me_decide'] });
  const legacy = buildStarterPlan({ selectedGoals: ['unsure_help_me_decide'], primaryMotivation: 'understand_my_skin' });
  expect(current.firstWeek[0].detail).toContain('skip it until you are ready');
  expect(legacy.habitPrompt).not.toMatch(/journal|note/i);
});

test('an occasional reaction gets the gentler plan and limits are clear', () => {
  const plan = buildStarterPlan({
    selectedGoals: ['fewer_visible_breakouts'],
    skinFeelByEndOfDay: 'oily_or_shiny',
    sensitivityLevel: 'sometimes',
    timeCommitment: 'about_5_minutes'
  });
  expect(plan.steps.find(step => step.id === 'm1')?.name).toBe('Refresh gently');
  expect(plan.steps.find(step => step.id === 'm2')?.detail).toContain('fragrance-free');
  expect(plan.caution).toContain('dermatologist');
  expect(plan.steps.every(step => step.category !== 'Treat')).toBe(true);
});

test('the Occasionally answer also uses the gentle path and permits skipping an unsafe product', () => {
  const plan = buildStarterPlan({
    selectedGoals: ['less_shine_oiliness'],
    skinFeelByEndOfDay: 'oily_or_shiny',
    sensitivityLevel: 'occasionally',
    timeCommitment: 'about_5_minutes',
    existingRoutineTier: 'nothing_yet'
  });
  expect(plan.steps.find(step => step.id === 'm1')?.name).toBe('Refresh gently');
  expect(plan.steps.find(step => step.id === 'm2')?.detail).toContain('fragrance-free');
  expect(plan.caution).toContain('skip a step');
  expect(plan.caution).toContain('dermatologist');
});

test('the four-question matrix always yields a bounded, editable starter routine', () => {
  const goals = ['more_hydration_less_dryness', 'fewer_visible_breakouts', 'calmer_looking_redness', 'smoother_looking_texture', 'less_shine_oiliness', 'unsure_help_me_decide'] as const;
  const feels = ['tight_or_dry', 'oily_or_shiny', 'combination_dry_and_oily', 'comfortable_balanced', 'changes_a_lot', 'unsure'] as const;
  const sensitivities = ['almost_never', 'occasionally', 'sometimes', 'often', 'very_easily', 'unsure'] as const;
  const times = ['about_2_minutes', 'about_5_minutes', 'ten_plus_minutes'] as const;
  for (const goal of goals) for (const feel of feels) for (const sensitivity of sensitivities) for (const time of times) {
    const plan = buildStarterPlan({ selectedGoals: [goal], skinFeelByEndOfDay: feel, sensitivityLevel: sensitivity, timeCommitment: time });
    const morning = plan.steps.filter(step => step.period === 'morning');
    const evening = plan.steps.filter(step => step.period === 'evening');
    expect(morning.map(step => step.category).slice(-2)).toEqual(['Hydrate', 'Protect']);
    expect(evening.map(step => step.category)).toEqual(['Cleanse', 'Hydrate']);
    expect(plan.steps).toHaveLength(time === 'about_2_minutes' ? 4 : 5);
    expect(new Set(plan.steps.map(step => step.id)).size).toBe(plan.steps.length);
    expect(plan.steps.every(step => step.name.length <= 60 && step.detail.length <= 180)).toBe(true);
    expect(plan.steps.every(step => step.category !== 'Treat')).toBe(true);
    expect(plan.caution).toMatch(/dermatologist/);
  }
});
