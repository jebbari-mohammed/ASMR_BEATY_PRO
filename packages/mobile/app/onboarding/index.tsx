import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { OnboardingStateV1, OnboardingStep, OwnedBasicOption, PrimaryGoalOption } from '@asmr/shared';
import { INITIAL_ONBOARDING_STATE, OnboardingService } from '../../src/services/onboarding-machine';
import { buildStarterPlan, previewStarterStep } from '../../src/services/personalized-starter';
import { localImages } from '../../src/theme/images';
import { colors } from '../../src/theme/tokens';
import { EditorialStatusBackdrop } from '../../src/components/EditorialStatusBackdrop';

type Choice = { value: string; label: string; detail?: string; icon: keyof typeof Ionicons.glyphMap };
type Question = { eyebrow: string; title: string; copy: string; field: keyof OnboardingStateV1; choices: Choice[] };
// Each answer changes the ritual or its safety guidance; the reveal is the reward.
const flow: OnboardingStep[] = ['WELCOME', 'GOALS', 'SKIN_FEEL', 'SENSITIVITY', 'TIME_COMMITMENT', 'OWNED_BASICS', 'PLAN_GENERATION'];
const questionCount = 5;

const questions: Partial<Record<OnboardingStep, Question>> = {
  GOALS: { eyebrow: 'YOUR INTENTION', title: 'What matters to you?', copy: 'Choose up to two. A good ritual starts with what you care about, not a camera score.', field: 'selectedGoals', choices: [
    { value: 'more_hydration_less_dryness', label: 'Feel more comfortable', detail: 'A gentler approach to dryness', icon: 'water-outline' },
    { value: 'fewer_visible_breakouts', label: 'Care for breakouts', detail: 'Keep daily steps steady', icon: 'sparkles-outline' },
    { value: 'calmer_looking_redness', label: 'Look less flushed', detail: 'Put comfort first', icon: 'flower-outline' },
    { value: 'smoother_looking_texture', label: 'Smoother-looking texture', detail: 'Build a consistent foundation', icon: 'layers-outline' },
    { value: 'less_shine_oiliness', label: 'Feel less shiny', detail: 'Care without overdoing it', icon: 'sunny-outline' },
    { value: 'unsure_help_me_decide', label: 'Just get started', detail: 'Make the basics feel easy', icon: 'compass-outline' }
  ] },
  SKIN_FEEL: { eyebrow: 'YOUR SKIN TODAY', title: 'How does it feel by evening?', copy: 'Your own experience is more useful here than a guessed skin type.', field: 'skinFeelByEndOfDay', choices: [
    { value: 'tight_or_dry', label: 'Tight or dry', icon: 'leaf-outline' }, { value: 'oily_or_shiny', label: 'Oily or shiny', icon: 'water-outline' },
    { value: 'combination_dry_and_oily', label: 'A little of both', icon: 'contrast-outline' }, { value: 'comfortable_balanced', label: 'Mostly comfortable', icon: 'happy-outline' },
    { value: 'changes_a_lot', label: 'It changes often', icon: 'refresh-outline' }, { value: 'unsure', label: 'I’m not sure', icon: 'help-circle-outline' }
  ] },
  SENSITIVITY: { eyebrow: 'KEEP IT COMFORTABLE', title: 'How easily does your skin react?', copy: 'We’ll keep unfamiliar products out of your starter plan.', field: 'sensitivityLevel', choices: [
    { value: 'almost_never', label: 'Almost never', icon: 'shield-checkmark-outline' }, { value: 'occasionally', label: 'Occasionally', icon: 'leaf-outline' },
    { value: 'sometimes', label: 'Sometimes', icon: 'water-outline' }, { value: 'often', label: 'Often', icon: 'alert-circle-outline' },
    { value: 'very_easily', label: 'Very easily', icon: 'heart-outline' }, { value: 'unsure', label: 'I’m not sure', icon: 'help-circle-outline' }
  ] },
  TIME_COMMITMENT: { eyebrow: 'MAKE IT DOABLE', title: 'How much time feels realistic?', copy: 'We’ll start with a ritual you can actually repeat.', field: 'timeCommitment', choices: [
    { value: 'about_2_minutes', label: 'About 2 minutes', detail: 'The essential steps', icon: 'flash-outline' },
    { value: 'about_5_minutes', label: 'About 5 minutes', detail: 'A little room to breathe', icon: 'time-outline' },
    { value: 'ten_plus_minutes', label: '10 minutes or more', detail: 'A slower moment of care', icon: 'hourglass-outline' }
  ] },
  OWNED_BASICS: { eyebrow: 'WORK WITH WHAT YOU HAVE', title: 'Which basics are already yours?', copy: 'Choose everything you have. Your ritual will mark missing product steps as optional until you are ready.', field: 'ownedBasics', choices: [
    { value: 'cleanser', label: 'Gentle cleanser', icon: 'water-outline' },
    { value: 'moisturizer', label: 'Moisturizer', icon: 'leaf-outline' },
    { value: 'sunscreen', label: 'Sunscreen', icon: 'sunny-outline' },
    { value: 'none_yet', label: 'None yet', detail: 'Begin without a shopping list', icon: 'hand-left-outline' },
    { value: 'not_sure', label: 'I’m not sure', detail: 'Keep the plan flexible', icon: 'help-circle-outline' }
  ] }
};

function hasAnswer(state: OnboardingStateV1, step: OnboardingStep): boolean {
  if (step === 'GOALS') return state.selectedGoals.length > 0;
  if (step === 'OWNED_BASICS') return (state.ownedBasics?.length ?? 0) > 0;
  const field = questions[step]?.field;
  return !!(field && state[field]);
}

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [answers, setAnswers] = useState<OnboardingStateV1>(INITIAL_ONBOARDING_STATE);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const step = flow.includes(answers.currentStep) ? answers.currentStep : 'WELCOME';
  const index = flow.indexOf(step);
  const question = questions[step];
  const plan = useMemo(() => buildStarterPlan(answers), [answers]);
  const previewStep = useMemo(() => previewStarterStep(plan), [plan]);

  useEffect(() => {
    let active = true;
    OnboardingService.loadState().then(saved => {
      if (active) {
        // Resume people partway through the former onboarding flow at the
        // last answer that still changes the plan.
        const currentStep = flow.includes(saved.currentStep) ? saved.currentStep
          : saved.currentStep === 'AGE_GATE' ? 'PLAN_GENERATION'
            : ['EXISTING_ROUTINE', 'SUNSCREEN_HABIT', 'PRIMARY_MOTIVATION'].includes(saved.currentStep) ? 'TIME_COMMITMENT'
            : 'WELCOME';
        setAnswers({ ...saved, currentStep });
        setReady(true);
      }
    });
    return () => { active = false; };
  }, []);

  async function update(next: OnboardingStateV1) {
    setAnswers(next);
    await OnboardingService.saveState(next);
  }

  function saveChoice(next: OnboardingStateV1) {
    void update(next).catch(() => Alert.alert('Could not save your choice', 'Please try again.'));
  }

  function choose(value: string) {
    if (step === 'GOALS') {
      const goals = answers.selectedGoals;
      if (!goals.includes(value as PrimaryGoalOption) && goals.length >= 2 && value !== 'unsure_help_me_decide') {
        Alert.alert('Choose up to two', 'Deselect one goal before choosing another.');
        return;
      }
      const selectedGoals = goals.includes(value as PrimaryGoalOption)
        ? goals.filter(item => item !== value)
        : [...goals.filter(item => item !== 'unsure_help_me_decide'), value as PrimaryGoalOption];
      saveChoice({ ...answers, selectedGoals: value === 'unsure_help_me_decide' ? ['unsure_help_me_decide'] : selectedGoals });
      return;
    }
    if (step === 'OWNED_BASICS') {
      const current = answers.ownedBasics ?? [];
      const exclusive = value === 'none_yet' || value === 'not_sure';
      const ownedBasics = exclusive
        ? [value as OwnedBasicOption]
        : current.includes(value as OwnedBasicOption)
          ? current.filter(item => item !== value)
          : [...current.filter(item => item !== 'none_yet' && item !== 'not_sure'), value as OwnedBasicOption];
      saveChoice({ ...answers, ownedBasics });
      return;
    }
    if (question) saveChoice({ ...answers, [question.field]: value });
  }

  async function go(direction: 1 | -1) {
    if (busy || (direction > 0 && question && !hasAnswer(answers, step))) return;
    const nextStep = flow[index + direction];
    if (!nextStep) return;
    setBusy(true);
    try {
      await update({ ...answers, currentStep: nextStep, completedSteps: direction > 0 ? [...new Set([...answers.completedSteps, step])] : answers.completedSteps });
    } catch { Alert.alert('Could not save your progress', 'Please try again.'); }
    finally { setBusy(false); }
  }

  async function finish() {
    if (busy) return;
    setBusy(true);
    try {
      await OnboardingService.saveState({ ...answers, currentStep: 'COMPLETED', completedAt: new Date().toISOString() });
      await OnboardingService.markCompleted();
      router.replace('/account');
    } catch { Alert.alert('Could not save your choices', 'Please try again.'); }
    finally { setBusy(false); }
  }

  async function existingAccount() {
    setBusy(true);
    try { await OnboardingService.markCompleted(); router.replace('/account'); }
    catch { Alert.alert('Could not continue', 'Please try again.'); }
    finally { setBusy(false); }
  }

  if (!ready) return <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>;

  return <View style={[styles.screen, { paddingBottom: question || step === 'PLAN_GENERATION' ? 0 : insets.bottom }]}>
    <ScrollView key={step} contentContainerStyle={styles.content} showsVerticalScrollIndicator={!!question}>
      {step === 'WELCOME' ? <>
        <ImageBackground source={localImages.onboardingBotanical} style={[styles.welcomeHero, { height: Math.max(300, Math.min(410, windowHeight * 0.47)), paddingTop: insets.top }]} resizeMode="cover">
          <LinearGradient colors={['rgba(19,38,28,0.78)', 'rgba(19,38,28,0.05)', 'rgba(19,38,28,0.05)']} style={styles.welcomeShade}>
            <Text style={styles.heroBrand}>ASMR BEAUTY</Text><Text style={styles.heroTitle}>A ritual that feels like yours.</Text>
            <Text style={styles.heroSubtitle}>Shape a gentle morning and evening plan around your real life.</Text>
          </LinearGradient>
        </ImageBackground>
        <View style={styles.body}>
          <Text style={styles.eyebrow}>YOUR SPACE TO BEGIN</Text>
          <Text style={styles.intro}>Five choices. A gentle starting ritual shaped by your skin feel, your time, and what you already own.</Text>
          <View style={styles.promiseRow}><Ionicons name="sparkles-outline" size={20} color={colors.goldDark} /><Text style={styles.promiseText}>See your ritual portrait and try one real step before deciding to join.</Text></View>
          <Pressable accessibilityRole="button" onPress={() => void go(1)} style={styles.cta}><Text style={styles.ctaText}>Build my ritual</Text><Ionicons name="arrow-forward" size={19} color="white" /></Pressable>
          <Pressable accessibilityRole="button" onPress={() => void existingAccount()} style={styles.secondary}><Text style={styles.secondaryText}>Already have an account? Sign in</Text></Pressable>
          <Text style={styles.finePrint}>The complete morning and evening guide opens with membership. Store prices and terms appear before purchase.</Text>
        </View>
      </> : <>
        <View style={[styles.top, { height: insets.top + 60, paddingTop: insets.top }]}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => void go(-1)} style={styles.back}><Ionicons name="arrow-back" size={21} color={colors.primary} /></Pressable><Text style={styles.progressLabel}>{question ? `${index} OF ${questionCount}` : 'YOUR PLAN'}</Text><Text style={styles.topBrand}>ASMR BEAUTY</Text></View>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.round(Math.min(index, questionCount) / questionCount * 100)}%` }]} /></View>
        {step === 'PLAN_GENERATION' ? <>
          <ImageBackground source={localImages.ritualReveal} style={styles.planHero} resizeMode="cover">
            <LinearGradient colors={['rgba(13,30,22,0.86)', 'rgba(13,30,22,0.26)', 'rgba(13,30,22,0.02)']} style={styles.planShade}>
              <Text style={styles.planHeroLabel}>YOUR RITUAL PORTRAIT</Text>
              <Text style={styles.planHeroTitle}>{plan.ritualName}</Text>
              <Text style={styles.planHeroNote}>Made from what you told us.</Text>
            </LinearGradient>
          </ImageBackground>
          <View style={styles.body}>
            <Text style={styles.planIntro}>A starting point that sounds like you.</Text>
            <Text style={styles.personalInsight}>{plan.personalInsight}</Text>
            <View style={styles.portraitLedger} accessibilityLabel={`Your ritual portrait. Focus: ${plan.portrait.focus}. Pace: ${plan.portrait.pace}. Approach: ${plan.portrait.approach}. ${plan.portrait.onHand}.`}>
              {([
                ['01', 'YOUR FOCUS', plan.portrait.focus],
                ['02', 'YOUR PACE', plan.portrait.pace],
                ['03', 'YOUR APPROACH', plan.portrait.approach]
              ] as const).map(([number, label, value]) => <View key={number} style={styles.portraitRow}>
                <Text style={styles.portraitNumber}>{number}</Text><Text style={styles.portraitLabel}>{label}</Text><Text style={styles.portraitValue}>{value}</Text>
              </View>)}
              <Text style={styles.portraitOnHand}>{plan.portrait.onHand}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={() => setPreviewOpen(true)} style={styles.previewInvite}>
              <View style={styles.previewInviteIcon}><Ionicons name="play" size={20} color="white" /></View>
              <View style={styles.previewInviteCopy}><Text style={styles.previewInviteTitle}>Try one real step</Text><Text style={styles.previewInviteDetail}>A moment from your morning ritual, free to explore</Text></View>
              <Ionicons name="arrow-forward" size={20} color={colors.primary} />
            </Pressable>
            <Text style={styles.revealSectionLabel}>WHY THIS IS YOURS</Text>
            {plan.whyItFits.slice(0, 3).map(line => <View key={line} style={styles.revealReason}>
              <Ionicons name="checkmark-circle-outline" size={18} color={colors.goldDark} /><Text style={styles.revealReasonText}>{line}</Text>
            </View>)}
            <View style={styles.unlockIntro}><Text style={styles.unlockEyebrow}>READY WHEN YOU ARE</Text><Text style={styles.unlockTitle}>The complete ritual is waiting.</Text><Text style={styles.unlockCopy}>Membership opens your full morning and evening guide, an editable routine, and a gentle first-week path.</Text></View>
            {([
              ['sunny-outline', 'Morning guide', `${plan.steps.filter(item => item.period === 'morning').length} steps`],
              ['moon-outline', 'Evening guide', `${plan.steps.filter(item => item.period === 'evening').length} steps`],
              ['calendar-outline', 'Your first week', 'A day-by-day start']
            ] as const).map(([icon, title, detail]) => <View key={title} style={styles.lockedRow}>
              <Ionicons name={icon} size={20} color={colors.goldDark} /><View style={styles.lockedText}><Text style={styles.lockedTitle}>{title}</Text><Text style={styles.lockedDetail}>{detail}</Text></View><Ionicons name="lock-closed-outline" size={17} color={colors.textSecondary} />
            </View>)}
            <View style={styles.caution}><Ionicons name="heart-outline" size={20} color={colors.primary} /><Text style={styles.cautionText}>{plan.caution}</Text></View>
            <Text style={styles.planFoot}>Based on five answers, not a photo or medical assessment. Your ritual cannot account for every allergy or medical condition. It is cosmetic self-care guidance, not a diagnosis or a promise of skin results.</Text>
          </View>
        </> : question ? <View style={styles.body}>
          {step !== 'GOALS' && <ImageBackground source={index % 2 ? localImages.editorialRoutine : localImages.onboardingBotanical} style={styles.smallHero} imageStyle={styles.smallHeroImage} />}
          <Text style={styles.eyebrow}>{question.eyebrow}</Text><Text style={styles.title}>{question.title}</Text><Text style={styles.copy}>{question.copy}</Text>
          <View style={styles.options}>{question.choices.map(choice => {
            const multi = step === 'GOALS' || step === 'OWNED_BASICS';
            const selected = step === 'GOALS' ? answers.selectedGoals.includes(choice.value as PrimaryGoalOption) : step === 'OWNED_BASICS' ? answers.ownedBasics?.includes(choice.value as OwnedBasicOption) === true : answers[question.field] === choice.value;
            return <Pressable key={choice.value} accessibilityRole={multi ? 'checkbox' : 'radio'} accessibilityState={multi ? { checked: selected } : { selected }} onPress={() => choose(choice.value)} style={[styles.option, selected && styles.optionSelected]}>
              <View style={[styles.optionIcon, selected && styles.optionIconSelected]}><Ionicons name={choice.icon} size={21} color={selected ? colors.primary : colors.goldDark} /></View><View style={styles.optionText}><Text style={styles.optionLabel}>{choice.label}</Text>{choice.detail && <Text style={styles.optionDetail}>{choice.detail}</Text>}</View><Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={23} color={selected ? colors.primary : colors.border} />
            </Pressable>;
          })}</View>
        </View> : null}
      </>}
    </ScrollView>
    {question && <View style={[styles.planDock, { paddingBottom: Math.max(insets.bottom, 12) }]}><Pressable accessibilityRole="button" disabled={!hasAnswer(answers, step) || busy} onPress={() => void go(1)} style={[styles.planDockButton, (!hasAnswer(answers, step) || busy) && styles.disabled]}>{busy ? <ActivityIndicator color="white" /> : <><Text style={styles.ctaText}>{index === questionCount ? 'See my plan' : 'Continue'}</Text><Ionicons name="arrow-forward" size={19} color="white" /></>}</Pressable></View>}
    {step === 'PLAN_GENERATION' && <View style={[styles.planDock, { paddingBottom: Math.max(insets.bottom, 12) }]}><Pressable accessibilityRole="button" disabled={busy} onPress={() => void finish()} style={[styles.planDockButton, busy && styles.disabled]}>{busy ? <ActivityIndicator color="white" /> : <><Text style={styles.ctaText}>Continue to account</Text><Ionicons name="arrow-forward" size={19} color="white" /></>}</Pressable></View>}
    <EditorialStatusBackdrop />
    <Modal visible={previewOpen} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setPreviewOpen(false)}>
      <View style={[styles.previewScreen, { paddingBottom: insets.bottom }]}>
        <ImageBackground source={localImages.editorialRoutine} style={styles.previewHero} resizeMode="cover">
          <LinearGradient colors={['rgba(18,40,28,0.16)', 'rgba(18,40,28,0.82)']} style={styles.previewShade}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close guided preview" onPress={() => setPreviewOpen(false)} style={[styles.previewClose, { marginTop: insets.top + 8 }]}><Ionicons name="close" size={24} color="white" /></Pressable>
            <View><Text style={styles.previewHeroEyebrow}>ONE REAL STEP</Text><Text style={styles.previewHeroTitle}>See how a small ritual feels.</Text></View>
          </LinearGradient>
        </ImageBackground>
        <ScrollView style={styles.previewBodyScroll} contentContainerStyle={styles.previewBody} showsVerticalScrollIndicator={false}>
          <View style={styles.previewMeta}><Text style={styles.previewStepCount}>A MOMENT FROM YOUR MORNING</Text><Text style={styles.previewCategory}>{previewStep.category.toUpperCase()}</Text></View>
          <Text style={styles.previewStepTitle}>{previewStep.name}</Text>
          <Text style={styles.previewStepDetail}>{previewStep.detail}</Text>
          <View style={styles.previewNote}><Ionicons name="heart-outline" size={22} color={colors.goldDark} /><Text style={styles.previewNoteText}>This is one step from your plan. Membership opens the complete editable guide; you can skip any product you do not own.</Text></View>
        </ScrollView>
        <View style={styles.previewFooter}>
          <Pressable accessibilityRole="button" onPress={() => setPreviewOpen(false)} style={styles.previewSecondary}><Text style={styles.previewSecondaryText}>Back to portrait</Text></Pressable>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setPreviewOpen(false); void finish(); }} style={styles.previewNext}><Text style={styles.previewNextText}>Continue to account</Text><Ionicons name="arrow-forward" size={18} color="white" /></Pressable>
        </View>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }, content: { paddingBottom: 36 },
  welcomeHero: { height: 410 }, welcomeShade: { flex: 1, padding: 28, paddingTop: 60 }, heroBrand: { color: '#F9E8D0', fontSize: 11, letterSpacing: 2.4, fontWeight: '800' }, heroTitle: { color: 'white', fontSize: 39, lineHeight: 43, fontWeight: '700', marginTop: 26, maxWidth: 310 }, heroSubtitle: { color: '#FAF5EA', fontSize: 15, lineHeight: 23, marginTop: 11, maxWidth: 280 },
  body: { paddingHorizontal: 24, paddingTop: 23 }, eyebrow: { color: colors.goldDark, fontSize: 10, fontWeight: '800', letterSpacing: 1.8, marginTop: 6 }, intro: { fontSize: 19, lineHeight: 28, color: colors.primary, fontWeight: '600', marginTop: 13 }, promiseRow: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 24, padding: 17, backgroundColor: '#F1EFE9', borderRadius: 15 }, promiseText: { flex: 1, color: colors.primary, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  top: { height: 72, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft }, progressLabel: { color: colors.goldDark, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }, topBrand: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.4 }, progressTrack: { height: 3, backgroundColor: '#E7E3DA', marginHorizontal: 24, marginTop: 8, borderRadius: 2 }, progressFill: { height: 3, borderRadius: 2, backgroundColor: colors.goldDark },
  smallHero: { height: 145, borderRadius: 20, overflow: 'hidden', marginBottom: 27 }, smallHeroImage: { borderRadius: 20 }, title: { color: colors.primary, fontSize: 33, lineHeight: 38, fontWeight: '700', marginTop: 9, maxWidth: 340 }, copy: { color: colors.textSecondary, fontSize: 15, lineHeight: 23, marginTop: 13 }, options: { marginTop: 25, gap: 9 }, option: { minHeight: 64, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: 'white', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }, optionSelected: { borderColor: colors.primary, backgroundColor: '#F3F7F3', borderWidth: 1.5 }, optionIcon: { width: 39, height: 39, borderRadius: 13, backgroundColor: '#FAF2E8', alignItems: 'center', justifyContent: 'center' }, optionIconSelected: { backgroundColor: '#E1ECE3' }, optionText: { flex: 1 }, optionLabel: { color: colors.primary, fontSize: 15, fontWeight: '700' }, optionDetail: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 3 },
  cta: { marginTop: 25, minHeight: 58, borderRadius: 17, backgroundColor: colors.primary, flexDirection: 'row', gap: 11, justifyContent: 'center', alignItems: 'center' }, ctaText: { color: 'white', fontSize: 15, fontWeight: '700' }, disabled: { opacity: 0.45 }, secondary: { alignItems: 'center', padding: 16 }, secondaryText: { color: colors.primary, fontSize: 13, fontWeight: '700' }, finePrint: { textAlign: 'center', color: colors.textSecondary, fontSize: 11, lineHeight: 17, marginTop: 16 },
  planDock: { backgroundColor: '#FCFBF8', borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 24, paddingTop: 10 }, planDockButton: { minHeight: 56, borderRadius: 17, backgroundColor: colors.primary, flexDirection: 'row', gap: 11, justifyContent: 'center', alignItems: 'center' },
  planHero: { height: 280, marginTop: 18, overflow: 'hidden' },
  planShade: { flex: 1, paddingHorizontal: 27, paddingTop: 32 },
  planHeroLabel: { color: '#F7E3C5', fontWeight: '800', fontSize: 10, letterSpacing: 2.1 },
  planHeroTitle: { color: 'white', fontSize: 37, lineHeight: 42, fontWeight: '700', marginTop: 16, maxWidth: 300 },
  planHeroNote: { color: '#F1EEE6', fontSize: 13, lineHeight: 19, marginTop: 13 },
  planIntro: { color: colors.primary, fontSize: 25, lineHeight: 31, fontWeight: '700' },
  personalInsight: { color: colors.textSecondary, fontSize: 14, lineHeight: 22, marginTop: 10 },
  portraitLedger: { backgroundColor: '#F1F3EC', borderRadius: 18, paddingHorizontal: 17, paddingTop: 8, paddingBottom: 15, marginTop: 23 },
  portraitRow: { minHeight: 66, borderBottomWidth: 1, borderBottomColor: '#D8E0D6', flexDirection: 'row', alignItems: 'center', gap: 10 },
  portraitNumber: { width: 22, color: colors.goldDark, fontSize: 11, fontWeight: '800' },
  portraitLabel: { width: 83, color: colors.goldDark, fontSize: 9, letterSpacing: 0.8, fontWeight: '800' },
  portraitValue: { flex: 1, color: colors.primary, fontSize: 15, lineHeight: 19, fontWeight: '700', textAlign: 'right' },
  portraitOnHand: { color: colors.textSecondary, fontSize: 11, fontWeight: '600', textAlign: 'right', marginTop: 12 },
  revealSectionLabel: { color: colors.goldDark, fontSize: 10, letterSpacing: 1.6, fontWeight: '800', marginTop: 29, marginBottom: 6 },
  revealReason: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingTop: 12 },
  revealReasonText: { flex: 1, color: colors.primary, fontSize: 13, lineHeight: 20 },
  unlockIntro: { marginTop: 34, marginBottom: 20 },
  unlockEyebrow: { color: colors.goldDark, fontSize: 10, letterSpacing: 1.7, fontWeight: '800' },
  unlockTitle: { color: colors.primary, fontSize: 25, lineHeight: 30, fontWeight: '700', marginTop: 8 },
  unlockCopy: { color: colors.textSecondary, fontSize: 13, lineHeight: 20, marginTop: 9 },
  lockedRow: { flexDirection: 'row', alignItems: 'center', gap: 13, minHeight: 65, borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 12 },
  lockedText: { flex: 1 },
  lockedTitle: { color: colors.primary, fontSize: 15, fontWeight: '700' },
  lockedDetail: { color: colors.textSecondary, fontSize: 12, marginTop: 3 },
  caution: { flexDirection: 'row', gap: 10, backgroundColor: colors.primarySoft, borderRadius: 15, padding: 16, marginTop: 25 },
  cautionText: { flex: 1, color: colors.primary, fontSize: 12, lineHeight: 18 },
  planFoot: { color: colors.textSecondary, fontSize: 11, lineHeight: 17, marginTop: 17 },
  previewInvite: { marginTop: 14, padding: 17, borderRadius: 18, backgroundColor: '#E9F0E8', flexDirection: 'row', alignItems: 'center', gap: 13 }, previewInviteIcon: { width: 45, height: 45, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, previewInviteCopy: { flex: 1 }, previewInviteTitle: { color: colors.primary, fontSize: 15, fontWeight: '800' }, previewInviteDetail: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 3 },
  previewScreen: { flex: 1, backgroundColor: colors.background }, previewHero: { height: 280 }, previewShade: { flex: 1, paddingHorizontal: 25, paddingBottom: 28, justifyContent: 'space-between' }, previewClose: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }, previewHeroEyebrow: { color: '#F8DFC2', fontSize: 11, fontWeight: '800', letterSpacing: 2 }, previewHeroTitle: { color: 'white', fontSize: 34, lineHeight: 39, fontWeight: '700', marginTop: 9, maxWidth: 300 }, previewBodyScroll: { flex: 1 }, previewBody: { flexGrow: 1, paddingHorizontal: 26, paddingTop: 28, paddingBottom: 28 }, previewMeta: { flexDirection: 'row', justifyContent: 'space-between' }, previewStepCount: { color: colors.goldDark, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }, previewCategory: { color: colors.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }, previewStepTitle: { color: colors.primary, fontSize: 33, lineHeight: 39, fontWeight: '700', marginTop: 28 }, previewStepDetail: { color: colors.textSecondary, fontSize: 17, lineHeight: 26, marginTop: 16 }, previewNote: { flexDirection: 'row', gap: 13, alignItems: 'center', backgroundColor: '#F3EEE5', padding: 16, borderRadius: 16, marginTop: 28 }, previewNoteText: { flex: 1, color: colors.textSecondary, fontSize: 13, lineHeight: 20 }, previewFooter: { borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 24, paddingTop: 17, flexDirection: 'row', gap: 11 }, previewSecondary: { flex: 1, minHeight: 54, alignItems: 'center', justifyContent: 'center' }, previewSecondaryText: { color: colors.primary, fontSize: 13, fontWeight: '700' }, previewNext: { flex: 1.2, minHeight: 54, borderRadius: 15, backgroundColor: colors.primary, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' }, previewNextText: { color: 'white', fontSize: 14, fontWeight: '700' }
});
