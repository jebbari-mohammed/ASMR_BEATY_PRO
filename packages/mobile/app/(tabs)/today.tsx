import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ImageBackground, ActivityIndicator, AppState, Modal, Pressable, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import auth from '@react-native-firebase/auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, radii, shadows, gradients } from '../../src/theme/tokens';
import { localImages } from '../../src/theme/images';
import { Header } from '../../src/components/Header';
import { Card } from '../../src/components/Card';
import { DisclaimerBar } from '../../src/components/DisclaimerBar';
import { RoutineLogCorrectionError, RoutineLogService } from '../../src/services/routine-log-service';
import { RoutineService, RoutineStep, STARTER_STEPS } from '../../src/services/routine-service';
import { OnboardingService } from '../../src/services/onboarding-machine';
import { buildStarterPlan, StarterPlan } from '../../src/services/personalized-starter';

const localDayKey = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

type DisplayStep = RoutineStep & { completed: boolean };
type PendingStep = { day: string; completed: boolean; operation: number; settled: boolean };
type DataIdentity = { uid: string; day: string };

function iconFor(category: RoutineStep['category']): keyof typeof Ionicons.glyphMap {
  return ({ Cleanse: 'water-outline', Hydrate: 'sparkles-outline', Treat: 'leaf-outline', Protect: 'shield-checkmark-outline', Other: 'ellipse-outline' } as const)[category];
}

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [steps, setSteps] = useState<DisplayStep[]>(STARTER_STEPS.map(step => ({ ...step, completed: false })));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncPending, setSyncPending] = useState(false);
  const [showSyncNotice, setShowSyncNotice] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [dayRevision, setDayRevision] = useState(0);
  const [reloadRevision, setReloadRevision] = useState(0);
  const [playerPeriod, setPlayerPeriod] = useState<'morning' | 'evening' | null>(null);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [starterPlan, setStarterPlan] = useState<StarterPlan | null>(null);
  const [authUid, setAuthUid] = useState(auth().currentUser?.uid ?? null);
  const [requestIdentity, setRequestIdentity] = useState<DataIdentity | null>(null);
  const [loadedIdentity, setLoadedIdentity] = useState<DataIdentity | null>(null);
  const currentDay = useRef(localDayKey());
  const readyIdentity = useRef<DataIdentity | null>(null);
  const cachedUid = useRef<string | null>(auth().currentUser?.uid ?? null);
  const identityEpoch = useRef(0);
  const routineSteps = useRef<RoutineStep[]>(STARTER_STEPS);
  const latestCompleted = useRef(new Set<string>());
  const pendingSteps = useRef(new Map<string, PendingStep>());
  const latestIntent = useRef(new Map<string, boolean>());
  const operationId = useRef(0);
  const snapshotHasPendingWrites = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => auth().onAuthStateChanged(user => {
    const uid = user?.uid ?? null;
    if (cachedUid.current !== uid) {
      ++identityEpoch.current;
      cachedUid.current = uid;
      readyIdentity.current = null;
      routineSteps.current = STARTER_STEPS;
      latestCompleted.current = new Set();
      pendingSteps.current.clear();
      latestIntent.current.clear();
      snapshotHasPendingWrites.current = false;
      setSteps(STARTER_STEPS.map(step => ({ ...step, completed: false })));
      setRequestIdentity(null);
      setLoadedIdentity(null);
      setStarterPlan(null);
      setLoading(true);
      setRefreshing(false);
      setLoadError(null);
      setSyncPending(false);
      setSyncError(null);
      setPlayerPeriod(null);
      setPlayerIndex(0);
    }
    setAuthUid(uid);
  }), []);

  useEffect(() => {
    if (!syncPending) {
      setShowSyncNotice(false);
      return;
    }
    const notice = setTimeout(() => setShowSyncNotice(true), 1200);
    return () => clearTimeout(notice);
  }, [syncPending]);

  const applyCurrentLog = useCallback(() => {
    const completed = new Set(latestCompleted.current);
    for (const [id, pending] of pendingSteps.current) {
      if (pending.day !== currentDay.current) continue;
      if (pending.settled && completed.has(id) === pending.completed) {
        pendingSteps.current.delete(id);
      } else if (pending.completed) completed.add(id);
      else completed.delete(id);
    }
    setSteps(routineSteps.current.map(step => ({ ...step, completed: completed.has(step.id) })));
    setSyncPending(snapshotHasPendingWrites.current ||
      [...pendingSteps.current.values()].some(pending => pending.day === currentDay.current));
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    let unsubscribe = () => {};
    let routineLoaded = false;
    let logLoaded = false;
    let failed = false;
    let initialReady = false;
    const day = localDayKey();
    const uid = authUid;
    if (!uid || auth().currentUser?.uid !== uid) {
      setRequestIdentity(null);
      setLoading(true);
      setRefreshing(false);
      return () => { active = false; };
    }
    const sessionEpoch = identityEpoch.current;
    currentDay.current = day;
    setRequestIdentity({ uid, day });
    if (readyIdentity.current?.uid === uid && readyIdentity.current.day === day) setRefreshing(true);
    else setLoading(true);
    setLoadError(null);
    setSyncError(null);
    const stillCurrent = () => active && identityEpoch.current === sessionEpoch && auth().currentUser?.uid === uid;
    const fail = (cause: unknown) => {
      if (!stillCurrent() || failed) return;
      failed = true;
      unsubscribe();
      console.warn('[Today] load failed', cause);
      setLoadError(cause instanceof Error ? cause.message : String(cause));
      setLoading(false);
      setRefreshing(false);
    };
    const applyWhenReady = () => {
      if (!stillCurrent() || failed || !routineLoaded || !logLoaded) return;
      applyCurrentLog();
      if (!initialReady) {
        initialReady = true;
        readyIdentity.current = { uid, day };
        setLoadedIdentity({ uid, day });
        setLoading(false);
        setRefreshing(false);
      }
    };
    // Start both reads together. The listener usually has a local snapshot
    // ready before the routine fetch completes, even on a slow connection.
    void RoutineService.get().then(routine => {
      if (!stillCurrent() || failed) return;
      routineSteps.current = routine;
      routineLoaded = true;
      applyWhenReady();
    }).catch(fail);
    try {
      unsubscribe = RoutineLogService.watch(day, ({ log, pendingWrites }) => {
        if (!stillCurrent() || failed) return;
        latestCompleted.current = new Set(log?.completedIds ?? []);
        snapshotHasPendingWrites.current = pendingWrites;
        logLoaded = true;
        applyWhenReady();
      }, fail);
      if (failed) unsubscribe();
    } catch (cause) { fail(cause); }
    OnboardingService.getStarterPreferences(uid).then(answers => {
      if (stillCurrent()) setStarterPlan(answers ? buildStarterPlan(answers) : null);
    }).catch(() => { if (stillCurrent()) setStarterPlan(null); });
    return () => { active = false; unsubscribe(); };
  }, [applyCurrentLog, authUid, dayRevision, reloadRevision]));

  useEffect(() => {
    const checkDay = () => {
      if (localDayKey() !== currentDay.current) {
        setPlayerPeriod(null);
        setDayRevision(revision => revision + 1);
      }
    };
    const now = new Date();
    const nextDay = new Date(now);
    nextDay.setHours(24, 0, 0, 50);
    const midnight = setTimeout(checkDay, nextDay.getTime() - now.getTime());
    const appState = AppState.addEventListener('change', status => {
      if (status === 'active') checkDay();
    });
    return () => { clearTimeout(midnight); appState.remove(); };
  }, [dayRevision]);

  function toggleStep(id: string): boolean {
    const day = localDayKey();
    if (day !== currentDay.current) {
      setPlayerPeriod(null);
      setDayRevision(revision => revision + 1);
      return false;
    }
    const uid = auth().currentUser?.uid;
    if (!uid || readyIdentity.current?.uid !== uid || readyIdentity.current.day !== day) return false;
    const sessionEpoch = identityEpoch.current;
    const step = steps.find(item => item.id === id);
    if (!step || loading || refreshing || loadError) return false;
    const previous = pendingSteps.current.get(id);
    const completed = !(previous?.day === day ? previous.completed : step.completed);
    const operation = ++operationId.current;
    const intentKey = `${day}:${id}`;
    latestIntent.current.set(intentKey, completed);
    pendingSteps.current.set(id, { day, completed, operation, settled: false });
    setSyncError(null);
    applyCurrentLog();
    void RoutineLogService.setStep(day, id, completed, routineSteps.current.map(item => item.id),
      () => identityEpoch.current === sessionEpoch && auth().currentUser?.uid === uid ? latestIntent.current.get(intentKey) : undefined)
      .then(() => {
        if (identityEpoch.current !== sessionEpoch || auth().currentUser?.uid !== uid) return;
        const pending = pendingSteps.current.get(id);
        if (pending?.operation === operation) {
          pendingSteps.current.set(id, { ...pending, settled: true });
          if (mounted.current && currentDay.current === day) applyCurrentLog();
        }
      })
      .catch(cause => {
        if (identityEpoch.current !== sessionEpoch || auth().currentUser?.uid !== uid) return;
        if (pendingSteps.current.get(id)?.operation !== operation) {
          if (cause instanceof RoutineLogCorrectionError && mounted.current && currentDay.current === day) {
            setSyncError('Your last step change could not sync. Check your connection or membership, then try again.');
          }
          return;
        }
        pendingSteps.current.delete(id);
        if (mounted.current && currentDay.current === day) {
          setSyncError('A step could not sync. Check your connection or membership, then try again.');
          applyCurrentLog();
        }
      });
    return true;
  }

  function openPlayer(period: 'morning' | 'evening') {
    if (readyIdentity.current?.uid !== auth().currentUser?.uid || readyIdentity.current?.day !== localDayKey()) return;
    if (loading || refreshing || loadError) return;
    const periodSteps = steps.filter(step => step.period === period);
    if (!periodSteps.length) return;
    const firstIncomplete = periodSteps.findIndex(step => !step.completed);
    setPlayerIndex(firstIncomplete < 0 ? 0 : firstIncomplete);
    setPlayerPeriod(period);
  }

  function nextPlayerStep() {
    const count = steps.filter(step => step.period === playerPeriod).length;
    if (playerIndex + 1 >= count) setPlayerPeriod(null);
    else setPlayerIndex(index => index + 1);
  }

  function completePlayerStep() {
    if (readyIdentity.current?.uid !== auth().currentUser?.uid || readyIdentity.current?.day !== localDayKey()) return;
    if (refreshing) return;
    const current = steps.filter(step => step.period === playerPeriod)[playerIndex];
    if (!current) return;
    if (current.completed || toggleStep(current.id)) nextPlayerStep();
  }

  const morningSteps = steps.filter(step => step.period === 'morning');
  const eveningSteps = steps.filter(step => step.period === 'evening');
  const completedCount = steps.filter(step => step.completed).length;
  const totalCount = steps.length;
  const progressPercent = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
  const playerSteps = steps.filter(step => step.period === playerPeriod);
  const playerStep = playerSteps[playerIndex];
  const liveUid = auth().currentUser?.uid ?? null;
  const liveDay = localDayKey();
  // Navigation may preserve this tab across sign-out, so gate every cached
  // view against Firebase's live identity before the auth listener rerenders.
  const sameAuthSession = !!liveUid && authUid === liveUid;
  const requestIsCurrent = sameAuthSession && requestIdentity?.uid === liveUid && requestIdentity.day === liveDay;
  const dataIsCurrent = sameAuthSession && loadedIdentity?.uid === liveUid && loadedIdentity.day === liveDay;
  const showLoading = !requestIsCurrent || loading || (!dataIsCurrent && !loadError);

  return (
    <View style={styles.screen}>
      <Header />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Editorial Real Photography Hero Banner */}
        <View style={styles.editorialBanner}>
          <ImageBackground
            source={localImages.editorialHero}
            style={styles.editorialImage}
            imageStyle={{ borderRadius: radii.lg }}
          >
            <LinearGradient
              colors={['rgba(26,56,43,0.1)', 'rgba(19,30,24,0.88)']}
              style={styles.editorialGradient}
            >
              <View style={styles.editorialPill}>
                <Ionicons name="sparkles" size={11} color={colors.goldDark} style={{ marginRight: 5 }} />
                <Text style={styles.editorialPillText}>YOUR DAILY RITUAL</Text>
              </View>
              <Text style={styles.editorialTitle}>Care for your skin, one step at a time</Text>
              <Text style={styles.editorialSubtitle}>
                Your own routine, one step at a time.
              </Text>
            </LinearGradient>
          </ImageBackground>
        </View>

        {dataIsCurrent && starterPlan && <View style={styles.startingPath}>
          <Text style={styles.startingEyebrow}>MADE FROM YOUR ANSWERS</Text>
          <Text style={styles.startingTitle}>{starterPlan.ritualName}</Text>
          <Text style={styles.startingIntro}>Your first-week path</Text>
          {starterPlan.firstWeek.map((moment, index) => <View key={moment.day} style={[styles.startingMoment, index > 0 && styles.startingMomentBorder]}>
            <View style={styles.startingDay}><Text style={styles.startingDayText}>{moment.day}</Text></View>
            <View style={styles.startingMomentCopy}><Text style={styles.startingMomentTitle}>{moment.title}</Text><Text style={styles.startingMomentDetail}>{moment.detail}</Text></View>
          </View>)}
        </View>}

        {showLoading ? <ActivityIndicator style={{ marginTop: 34 }} color={colors.primary} /> : loadError ? <Card variant="elevated" style={styles.streakCard}><Text style={styles.sectionTitle}>Could not load your routine</Text><Text style={styles.stepDetail}>{__DEV__ ? loadError : 'Check your connection and try again.'}</Text><Pressable accessibilityRole="button" onPress={() => setReloadRevision(revision => revision + 1)} style={styles.retryButton}><Text style={styles.retryText}>Try again</Text></Pressable></Card> : <>
        {refreshing && <View style={styles.refreshNotice} accessibilityRole="progressbar" accessibilityLabel="Updating your ritual"><ActivityIndicator size="small" color={colors.primary} /><Text style={styles.refreshText}>Updating your ritual</Text></View>}
        {showSyncNotice && <Text accessibilityLiveRegion="polite" style={styles.syncNotice}>Changes on this device are waiting to sync.</Text>}
        {syncError && <Text accessibilityRole="alert" style={styles.syncError}>{syncError}</Text>}
        {/* Daily completion card */}
        <Card variant="elevated" style={styles.streakCard}>
          <LinearGradient
            colors={gradients.botanicalMist}
            style={styles.streakGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.streakTopRow}>
              <View style={styles.streakBadge}>
                <Ionicons name="checkmark-circle-outline" size={16} color={colors.terracotta} />
                <Text style={styles.streakBadgeText}>TODAY'S PROGRESS</Text>
              </View>
              <View style={styles.progressCounter}>
                <Text style={styles.counterText}>{completedCount}/{totalCount} Completed</Text>
              </View>
            </View>

            <View style={styles.progressTrackContainer}>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
              </View>
              <Text style={styles.percentText}>{progressPercent}%</Text>
            </View>

            <View style={styles.milestoneRow}>
              <Text style={styles.milestoneLabel}>Morning</Text>
              <View style={styles.milestoneDivider} />
              <Text style={[styles.milestoneLabel, styles.milestoneActive]}>Today</Text>
              <View style={styles.milestoneDivider} />
              <Text style={styles.milestoneLabel}>Evening</Text>
            </View>
          </LinearGradient>
        </Card>

        {/* Morning Ritual Section */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleGroup}>
            <Ionicons name="sunny-outline" size={18} color={colors.goldDark} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Morning Ritual</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Start guided morning ritual" onPress={() => openPlayer('morning')} disabled={!morningSteps.length || refreshing} style={styles.startPlayer}><Ionicons name="play" size={12} color={colors.primary} /><Text style={styles.startPlayerText}>Guide me</Text></Pressable>
        </View>

        {morningSteps.map((step, idx) => (
          <TouchableOpacity
            key={step.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: step.completed, disabled: refreshing }}
            accessibilityLabel={`${step.name}, morning routine`}
            activeOpacity={0.78}
            disabled={refreshing}
            onPress={() => toggleStep(step.id)}
            style={[styles.stepCard, step.completed && styles.stepCardCompleted]}
          >
            <View style={[styles.stepIconWrap, step.completed && styles.stepIconWrapDone]}>
              <Ionicons
                name={step.completed ? 'checkmark' : iconFor(step.category)}
                size={18}
                color={step.completed ? colors.textInverse : colors.primary}
              />
            </View>

            <View style={styles.stepInfo}>
              <View style={styles.stepHeaderRow}>
                <Text style={styles.stepCategory}>
                  STEP {idx + 1} • {step.category.toUpperCase()}
                </Text>
                <Text style={styles.stepDuration}>{step.completed ? 'Done' : 'Tap to complete'}</Text>
              </View>
              <Text style={[styles.stepName, step.completed && styles.stepNameCompleted]}>
                {step.name}
              </Text>
              <Text style={styles.stepDetail}>{step.detail}</Text>
            </View>

            <View style={[styles.checkbox, step.completed && styles.checkboxDone]}>
              {step.completed && <Ionicons name="checkmark-sharp" size={14} color={colors.textInverse} />}
            </View>
          </TouchableOpacity>
        ))}

        {/* Evening Ritual Section */}
        <View style={[styles.sectionHeaderRow, styles.eveningSectionHeader]}>
          <View style={styles.sectionTitleGroup}>
            <Ionicons name="moon-outline" size={18} color={colors.primaryLight} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Evening Ritual</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Start guided evening ritual" onPress={() => openPlayer('evening')} disabled={!eveningSteps.length || refreshing} style={styles.startPlayer}><Ionicons name="play" size={12} color={colors.primary} /><Text style={styles.startPlayerText}>Guide me</Text></Pressable>
        </View>

        {eveningSteps.map((step, idx) => (
          <TouchableOpacity
            key={step.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: step.completed, disabled: refreshing }}
            accessibilityLabel={`${step.name}, evening routine`}
            activeOpacity={0.78}
            disabled={refreshing}
            onPress={() => toggleStep(step.id)}
            style={[styles.stepCard, step.completed && styles.stepCardCompleted]}
          >
            <View style={[styles.stepIconWrap, step.completed && styles.stepIconWrapDone]}>
              <Ionicons
                name={step.completed ? 'checkmark' : iconFor(step.category)}
                size={18}
                color={step.completed ? colors.textInverse : colors.primary}
              />
            </View>

            <View style={styles.stepInfo}>
              <View style={styles.stepHeaderRow}>
                <Text style={styles.stepCategory}>
                  STEP {idx + 1} • {step.category.toUpperCase()}
                </Text>
                <Text style={styles.stepDuration}>{step.completed ? 'Done' : 'Tap to complete'}</Text>
              </View>
              <Text style={[styles.stepName, step.completed && styles.stepNameCompleted]}>
                {step.name}
              </Text>
              <Text style={styles.stepDetail}>{step.detail}</Text>
            </View>

            <View style={[styles.checkbox, step.completed && styles.checkboxDone]}>
              {step.completed && <Ionicons name="checkmark-sharp" size={14} color={colors.textInverse} />}
            </View>
          </TouchableOpacity>
        ))}

        </>}
        <DisclaimerBar showAffiliate={false} />
      </ScrollView>
      <Modal visible={dataIsCurrent && playerPeriod !== null} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setPlayerPeriod(null)}>
        <View style={styles.playerScreen}>
          <ScrollView style={styles.playerScroll} contentContainerStyle={{ paddingBottom: 18 }}>
            <ImageBackground source={playerPeriod === 'morning' ? localImages.editorialHero : localImages.editorialRoutine} style={[styles.playerHero, { height: Math.min(300, Math.max(225, windowHeight * 0.34)), paddingTop: insets.top + 16 }]} resizeMode="cover">
              <LinearGradient colors={['rgba(18,38,28,0.65)', 'rgba(18,38,28,0.08)', 'rgba(18,38,28,0.78)']} style={styles.playerShade}>
                <Pressable accessibilityRole="button" accessibilityLabel="Close guided ritual" onPress={() => setPlayerPeriod(null)} style={styles.playerClose}><Ionicons name="close" size={23} color="white" /></Pressable>
                <View><Text style={styles.playerEyebrow}>{playerPeriod === 'morning' ? 'MORNING' : 'EVENING'} RITUAL</Text><Text style={styles.playerHeroTitle}>One step at a time.</Text></View>
              </LinearGradient>
            </ImageBackground>
            {playerStep && <View style={styles.playerBody}>
              <View style={styles.playerProgress}><Text style={styles.playerCount}>STEP {playerIndex + 1} OF {playerSteps.length}</Text><Text style={styles.playerCategory}>{playerStep.category.toUpperCase()}</Text></View>
              <View style={styles.playerTrack}><View style={[styles.playerFill, { width: `${Math.round((playerIndex + 1) / playerSteps.length * 100)}%` }]} /></View>
              <Text style={styles.playerTitle}>{playerStep.name}</Text>
              <Text style={styles.playerDetail}>{playerStep.detail || 'Follow the instructions on the product you use.'}</Text>
              <View style={styles.playerNote}><Ionicons name="heart-outline" size={20} color={colors.goldDark} /><Text style={styles.playerNoteText}>Use products you already tolerate. Pause anything that irritates your skin.</Text></View>
              {playerStep.completed && <Text style={styles.playerDone}>Already completed today</Text>}
              {showSyncNotice && <Text style={styles.playerDone}>Changes are waiting to sync.</Text>}
              {syncError && <Text style={styles.syncError}>{syncError}</Text>}
            </View>}
          </ScrollView>
          {playerStep && <View style={[styles.playerActions, { paddingBottom: Math.max(insets.bottom, 14) }]}>
            <Pressable accessibilityRole="button" disabled={refreshing} onPress={completePlayerStep} style={styles.playerPrimary}><Text style={styles.playerPrimaryText}>{playerStep.completed ? playerIndex + 1 === playerSteps.length ? 'Finish ritual' : 'Next step' : 'Mark done and continue'}</Text></Pressable>
            <View style={styles.playerSecondaryRow}>
              <Pressable accessibilityRole="button" disabled={playerIndex === 0} onPress={() => setPlayerIndex(index => index - 1)} style={styles.playerSecondary}><Text style={[styles.playerSecondaryText, playerIndex === 0 && styles.playerDisabled]}>Previous</Text></Pressable>
              <Pressable accessibilityRole="button" onPress={nextPlayerStep} style={styles.playerSecondary}><Text style={styles.playerSecondaryText}>{playerIndex + 1 === playerSteps.length ? 'Finish for now' : 'Skip for now'}</Text></Pressable>
            </View>
          </View>}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  container: {
    flex: 1
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.huge
  },
  syncNotice: { color: colors.primary, backgroundColor: colors.primarySoft, borderRadius: 12, padding: 12, marginBottom: 12, fontSize: 12, lineHeight: 18 },
  refreshNotice: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  refreshText: { color: colors.textSecondary, fontSize: 12 },
  retryButton: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingRight: 16 },
  retryText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  syncError: { color: '#A64032', backgroundColor: colors.terracottaLight, borderRadius: 12, padding: 12, marginBottom: 12, fontSize: 12, lineHeight: 18 },
  startingPath: { backgroundColor: '#FBFAF6', borderColor: '#E4E4D9', borderWidth: 1, borderRadius: 20, padding: 18, marginBottom: spacing.md },
  startingEyebrow: { color: colors.goldDark, fontSize: 10, letterSpacing: 1.5, fontWeight: '800' },
  startingTitle: { color: colors.primary, fontSize: 23, fontWeight: '700', marginTop: 6 },
  startingIntro: { color: colors.textSecondary, fontSize: 13, marginTop: 5, marginBottom: 12 },
  startingMoment: { flexDirection: 'row', gap: 11, paddingVertical: 11 },
  startingMomentBorder: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  startingDay: { width: 69, paddingTop: 3 }, startingDayText: { color: colors.goldDark, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  startingMomentCopy: { flex: 1 }, startingMomentTitle: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  startingMomentDetail: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 3 },
  editorialBanner: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    borderRadius: radii.lg,
    overflow: 'hidden',
    ...shadows.medium
  },
  editorialImage: {
    width: '100%',
    height: 190,
    justifyContent: 'flex-end'
  },
  editorialGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.base
  },
  editorialPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(26, 56, 43, 0.85)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(197, 154, 111, 0.4)',
    marginBottom: spacing.xs
  },
  editorialPillText: {
    ...typography.captionBold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.goldLight
  },
  editorialTitle: {
    ...typography.title1,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.3
  },
  editorialSubtitle: {
    ...typography.body,
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    lineHeight: 18
  },
  streakCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(234, 229, 220, 0.7)'
  },
  streakGradient: {
    padding: spacing.base
  },
  streakTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.full,
    ...shadows.subtle
  },
  streakBadgeText: {
    ...typography.captionBold,
    fontSize: 11,
    color: colors.terracotta,
    marginLeft: spacing.xxs,
    letterSpacing: 0.5
  },
  progressCounter: {
    backgroundColor: 'rgba(26, 56, 43, 0.06)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm
  },
  counterText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 12
  },
  progressTrackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md
  },
  progressBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(26, 56, 43, 0.1)',
    borderRadius: radii.full,
    overflow: 'hidden',
    marginRight: spacing.sm
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radii.full
  },
  percentText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 12,
    minWidth: 34
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  milestoneLabel: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary
  },
  milestoneActive: {
    fontWeight: '700',
    color: colors.primary
  },
  milestoneDivider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(26, 56, 43, 0.12)',
    marginHorizontal: spacing.sm
  },
  nextScanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(26, 56, 43, 0.08)',
    marginBottom: spacing.lg,
    ...shadows.subtle
  },
  scanThumbWrap: {
    position: 'relative'
  },
  scanThumb: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSubtle
  },
  scanThumbDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.routineDone,
    borderWidth: 2,
    borderColor: colors.surface
  },
  scanTextWrap: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm
  },
  scanEyebrow: {
    ...typography.eyebrow,
    fontSize: 9,
    marginBottom: 2
  },
  scanTitle: {
    ...typography.title2,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2
  },
  scanSub: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.xs
  },
  eveningSectionHeader: {
    marginTop: spacing.lg
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  sectionIcon: {
    marginRight: spacing.xs
  },
  sectionTitle: {
    ...typography.title2,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary
  },
  startPlayer: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primarySoft, paddingHorizontal: 12, minHeight: 35, borderRadius: 18 },
  startPlayerText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  sectionMeta: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: 12
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(26, 56, 43, 0.06)',
    marginBottom: spacing.sm,
    ...shadows.subtle
  },
  stepCardCompleted: {
    backgroundColor: 'rgba(244, 241, 235, 0.6)',
    borderColor: 'rgba(26, 56, 43, 0.04)'
  },
  stepIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: 'rgba(26, 56, 43, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md
  },
  stepIconWrapDone: {
    backgroundColor: colors.primary
  },
  stepInfo: {
    flex: 1
  },
  stepHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2
  },
  stepCategory: {
    ...typography.captionBold,
    fontSize: 10,
    color: colors.goldDark,
    letterSpacing: 0.8
  },
  stepDuration: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textTertiary
  },
  stepName: {
    ...typography.title2,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2
  },
  stepNameCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary
  },
  stepDetail: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: 'rgba(26, 56, 43, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm
  },
  checkboxDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  coachCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 154, 111, 0.3)',
    ...shadows.subtle
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  coachAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.goldDark,
    marginRight: spacing.md
  },
  coachTextWrap: {
    flex: 1,
    marginRight: spacing.sm
  },
  coachHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2
  },
  coachTitle: {
    ...typography.title2,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginRight: spacing.xs
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 124, 89, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full
  },
  onlineDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.routineDone,
    marginRight: 4
  },
  onlineText: {
    ...typography.captionBold,
    fontSize: 9,
    color: colors.routineDone
  },
  coachPrompt: {
    ...typography.caption,
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.textSecondary,
    lineHeight: 16
  },
  playerScreen: { flex: 1, backgroundColor: colors.background },
  playerScroll: { flex: 1 },
  playerHero: { height: 300 },
  playerShade: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 25 },
  playerClose: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.28)', alignItems: 'center', justifyContent: 'center' },
  playerEyebrow: { color: '#F4DDAD', fontSize: 11, letterSpacing: 2, fontWeight: '800' },
  playerHeroTitle: { color: 'white', fontSize: 33, lineHeight: 39, fontWeight: '700', marginTop: 8 },
  playerBody: { paddingHorizontal: 26, paddingTop: 18 },
  playerProgress: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  playerCount: { color: colors.goldDark, fontSize: 11, fontWeight: '800', letterSpacing: 1.3 },
  playerCategory: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  playerTrack: { height: 5, backgroundColor: colors.primarySoft, borderRadius: 3, overflow: 'hidden', marginTop: 13 },
  playerFill: { height: 5, backgroundColor: colors.primary, borderRadius: 3 },
  playerTitle: { color: colors.primary, fontSize: 30, lineHeight: 36, fontWeight: '700', marginTop: 18 },
  playerDetail: { color: colors.textSecondary, fontSize: 16, lineHeight: 25, marginTop: 10 },
  playerNote: { flexDirection: 'row', gap: 11, alignItems: 'flex-start', backgroundColor: '#F3EFE6', borderRadius: 16, padding: 17, marginTop: 16 },
  playerNoteText: { flex: 1, color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  playerDone: { color: colors.primary, fontSize: 12, fontWeight: '700', marginTop: 20 },
  playerActions: { borderTopWidth: 1, borderColor: colors.border, backgroundColor: '#FCFBF8', paddingHorizontal: 22, paddingTop: 12 },
  playerPrimary: { backgroundColor: colors.primary, minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  playerPrimaryText: { color: 'white', fontSize: 15, fontWeight: '700' },
  playerSecondaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  playerSecondary: { minHeight: 37, justifyContent: 'center', paddingHorizontal: 8 },
  playerSecondaryText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  playerDisabled: { opacity: 0.35 }
});
