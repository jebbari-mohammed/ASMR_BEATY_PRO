import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import { Header } from '../../src/components/Header';
import { RoutineLog, RoutineLogService } from '../../src/services/routine-log-service';
import { SkinFeelCheckin, SkinFeelCheckinService, SkinFeel } from '../../src/services/skin-feel-checkin-service';
import { colors } from '../../src/theme/tokens';

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function shortDay(day: string) {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const CALENDAR_DAYS = 14;
const FEEL_LABELS: { value: SkinFeel; label: string }[] = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'dry_tight', label: 'Dry or tight' },
  { value: 'oily', label: 'Oily' },
  { value: 'sensitive', label: 'Sensitive' },
  { value: 'mixed', label: 'A mix' }
];

export default function ProgressScreen() {
  const [logs, setLogs] = useState<RoutineLog[]>([]);
  const [checkins, setCheckins] = useState<SkinFeelCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkinLoading, setCheckinLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [checkinError, setCheckinError] = useState(false);
  const [authUid, setAuthUid] = useState(auth().currentUser?.uid ?? null);
  const [loadedUid, setLoadedUid] = useState<string | null>(null);
  const [loadedEpoch, setLoadedEpoch] = useState<number | null>(null);
  const [checkinLoadedUid, setCheckinLoadedUid] = useState<string | null>(null);
  const [checkinLoadedEpoch, setCheckinLoadedEpoch] = useState<number | null>(null);
  const [reloadRevision, setReloadRevision] = useState(0);
  const [calendarDay, setCalendarDay] = useState(localDateKey(new Date()));
  const currentUid = useRef(auth().currentUser?.uid ?? null);
  const loadedUidRef = useRef<string | null>(null);
  const identityEpoch = useRef(0);
  const requestId = useRef(0);

  useEffect(() => auth().onAuthStateChanged(user => {
    const uid = user?.uid ?? null;
    if (currentUid.current !== uid) {
      currentUid.current = uid;
      ++identityEpoch.current;
      ++requestId.current;
      setLogs([]);
      setCheckins([]);
      setLoadedUid(null);
      setLoadedEpoch(null);
      setCheckinLoadedUid(null);
      setCheckinLoadedEpoch(null);
      loadedUidRef.current = null;
      setLoading(true);
      setRefreshing(false);
      setError(false);
      setCheckinError(false);
      setCheckinLoading(true);
    }
    setAuthUid(uid);
  }), []);

  useEffect(() => {
    const refreshDay = () => setCalendarDay(current => {
      const next = localDateKey(new Date());
      return next === current ? current : next;
    });
    const now = new Date();
    const nextDay = new Date(now);
    nextDay.setHours(24, 0, 0, 50);
    const midnight = setTimeout(refreshDay, nextDay.getTime() - now.getTime());
    const appState = AppState.addEventListener('change', status => {
      if (status === 'active') refreshDay();
    });
    return () => { clearTimeout(midnight); appState.remove(); };
  }, [calendarDay]);

  useFocusEffect(useCallback(() => {
    const uid = authUid;
    if (!uid || auth().currentUser?.uid !== uid) return;
    const epoch = identityEpoch.current;
    const request = ++requestId.current;
    const stillCurrent = () => request === requestId.current && epoch === identityEpoch.current && auth().currentUser?.uid === uid;
    if (loadedUidRef.current === uid) setRefreshing(true);
    else setLoading(true);
    setError(false);
    setCheckinLoading(true);
    setCheckinError(false);
    // At most one log exists per day, so the 14-day calendar never needs more
    // than 14 documents. Keep paid reads and the first render bounded.
    RoutineLogService.recent(CALENDAR_DAYS).then((items) => {
      if (stillCurrent()) { setLogs(items); setLoadedUid(uid); setLoadedEpoch(epoch); loadedUidRef.current = uid; setLoading(false); setRefreshing(false); }
    }).catch(() => { if (stillCurrent()) { setError(true); setLoading(false); setRefreshing(false); } });
    SkinFeelCheckinService.recent(uid).then(items => {
      if (stillCurrent()) { setCheckins(items); setCheckinLoadedUid(uid); setCheckinLoadedEpoch(epoch); setCheckinLoading(false); }
    }).catch(() => { if (stillCurrent()) { setCheckinError(true); setCheckinLoading(false); } });
    return () => { ++requestId.current; };
  }, [authUid, calendarDay, reloadRevision]));

  const liveUid = auth().currentUser?.uid ?? null;
  const sameAccount = !!liveUid && authUid === liveUid;
  const dataIsCurrent = sameAccount && loadedUid === liveUid && loadedEpoch === identityEpoch.current;
  const checkinsAreCurrent = sameAccount && checkinLoadedUid === liveUid && checkinLoadedEpoch === identityEpoch.current;
  const byDay = new Map((dataIsCurrent ? logs : []).map((log) => [log.day, log]));
  const days = Array.from({ length: CALENDAR_DAYS }, (_, index) => {
    const [year, month, dateOfMonth] = calendarDay.split('-').map(Number);
    const date = new Date(year, month - 1, dateOfMonth);
    date.setDate(date.getDate() - (CALENDAR_DAYS - 1) + index);
    const day = localDateKey(date);
    const completed = byDay.get(day)?.completedIds.length ?? 0;
    return { day, label: date.toLocaleDateString(undefined, { weekday: 'short' }), date: date.getDate(), completed };
  });
  const activeDays = days.filter((day) => day.completed > 0).length;
  const totalSteps = days.reduce((sum, day) => sum + day.completed, 0);
  const today = days[days.length - 1];
  const visibleDays = new Set(days.map(day => day.day));
  const visibleCheckins = checkinsAreCurrent
    ? checkins.filter(item => visibleDays.has(item.day)).sort((a, b) => b.day.localeCompare(a.day))
    : [];

  return <View style={styles.screen}>
    <Header />
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>YOUR REAL RECORD</Text>
      <Text style={styles.title}>Progress, at your pace.</Text>
      <Text style={styles.subtitle}>A record of the ritual steps you marked complete. Pausing a step later does not erase its past check-ins. Your skin can change for many reasons; this view tracks consistency only.</Text>
      {!sameAccount || loading ? <ActivityIndicator style={{ marginTop: 50 }} color={colors.primary} /> : error ? <View style={styles.empty}><Text style={styles.emptyTitle}>Could not load your record</Text><Text style={styles.emptyCopy}>Check your connection and try again.</Text><Pressable style={styles.retryButton} accessibilityRole="button" onPress={() => setReloadRevision(value => value + 1)}><Text style={styles.retryText}>Try again</Text></Pressable></View> : dataIsCurrent ? <>
        {refreshing && <Text style={styles.refreshText}>Refreshing your record…</Text>}
        <View style={styles.summary}>
          <View><Text style={styles.bigNumber}>{activeDays}</Text><Text style={styles.metricLabel}>active days</Text></View>
          <View style={styles.divider} />
          <View><Text style={styles.bigNumber}>{totalSteps}</Text><Text style={styles.metricLabel}>steps completed</Text></View>
        </View>
        <Text style={styles.sectionTitle}>Last 14 days</Text>
        <View style={styles.calendar}>
          {days.map((day) => <View key={day.day} accessible accessibilityLabel={`${day.day}: ${day.completed} ${day.completed === 1 ? 'step' : 'steps'} completed`} style={[styles.day, day.completed > 0 && styles.activeDay, day.day === today.day && styles.today]}>
            <Text style={[styles.dayName, day.completed > 0 && styles.activeDayText]}>{day.label}</Text>
            <Text style={[styles.dayDate, day.completed > 0 && styles.activeDayText]}>{day.date}</Text>
            <View style={[styles.dayDot, day.completed > 0 && styles.activeDot]} />
          </View>)}
        </View>
        <View style={styles.feelSection}>
          <Text style={styles.feelEyebrow}>YOUR OWN OBSERVATIONS</Text>
          <Text style={styles.feelTitle}>How your skin felt</Text>
          <Text style={styles.feelIntro}>Your optional check-ins from the last 14 days. These are your observations, not a skin score or a measure of results.</Text>
          {checkinLoading ? <ActivityIndicator color={colors.primary} style={styles.feelLoader} /> : checkinError ? <View><Text style={styles.feelEmpty}>Could not load your check-ins.</Text><Pressable style={styles.retryButton} accessibilityRole="button" onPress={() => setReloadRevision(value => value + 1)}><Text style={styles.retryText}>Try again</Text></Pressable></View> : checkinsAreCurrent && visibleCheckins.length > 0 ? <>
            <View style={styles.feelCountRow}><Text style={styles.feelNumber}>{visibleCheckins.length}</Text><Text style={styles.feelCountCopy}>of 14 days checked in</Text></View>
            <View style={styles.feelRows}>
              {FEEL_LABELS.map(choice => {
                const count = visibleCheckins.filter(item => item.feel === choice.value).length;
                return count > 0 ? <View key={choice.value} style={styles.feelRow}><Text style={styles.feelRowLabel}>{choice.label}</Text><Text style={styles.feelRowCount}>{count} {count === 1 ? 'day' : 'days'}</Text></View> : null;
              })}
            </View>
            <Text style={styles.feelRecentTitle}>MOST RECENT CHECK-INS</Text>
            <View style={styles.feelRecentRow}>
              {visibleCheckins.slice(0, 3).map(item => <View key={item.day} style={styles.feelRecentItem}><Text style={styles.feelRecentDay}>{shortDay(item.day)}</Text><Text style={styles.feelRecentValue}>{FEEL_LABELS.find(choice => choice.value === item.feel)?.label}</Text></View>)}
            </View>
          </> : <Text style={styles.feelEmpty}>No skin-feel check-ins in this window. If you want, choose one on Today.</Text>}
        </View>
        <View style={styles.note}>
          <Ionicons name="leaf-outline" size={24} color={colors.primary} />
          <View style={{ flex: 1 }}><Text style={styles.noteTitle}>Small steps count</Text><Text style={styles.noteCopy}>There is no penalty for missing a day. Return to your routine whenever it serves you.</Text></View>
        </View>
        {activeDays === 0 && <View style={styles.empty}><Text style={styles.emptyTitle}>Your record starts today</Text><Text style={styles.emptyCopy}>Check off any step on Today and it will appear here.</Text></View>}
      </> : <ActivityIndicator style={{ marginTop: 50 }} color={colors.primary} />}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, content: { padding: 22, paddingBottom: 45 },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.8, color: colors.goldDark, marginBottom: 8 },
  title: { fontSize: 30, lineHeight: 35, fontWeight: '700', color: colors.primary },
  subtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 11, marginBottom: 24 },
  summary: { flexDirection: 'row', backgroundColor: colors.primary, borderRadius: 20, padding: 24, justifyContent: 'space-around', alignItems: 'center' },
  bigNumber: { fontSize: 34, color: 'white', fontWeight: '700', textAlign: 'center' }, metricLabel: { color: '#DCE8DF', fontSize: 12, textAlign: 'center', marginTop: 2 },
  divider: { backgroundColor: 'rgba(255,255,255,0.25)', height: 48, width: 1 },
  sectionTitle: { fontSize: 19, fontWeight: '700', color: colors.textPrimary, marginTop: 29, marginBottom: 14 },
  calendar: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 4, rowGap: 8 },
  day: { width: '12.5%', height: 70, borderRadius: 13, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  activeDay: { backgroundColor: colors.primarySoft, borderColor: colors.primaryLight }, today: { borderWidth: 2, borderColor: colors.gold },
  dayName: { fontSize: 9, color: colors.textTertiary, textTransform: 'uppercase' }, dayDate: { color: colors.textPrimary, fontSize: 15, fontWeight: '700', marginTop: 4 }, activeDayText: { color: colors.primary },
  dayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.border, marginTop: 5 }, activeDot: { backgroundColor: colors.primary },
  feelSection: { backgroundColor: '#FBFAF6', borderWidth: 1, borderColor: '#E4E4D9', borderRadius: 20, padding: 20, marginTop: 27 },
  feelEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, color: colors.primaryLight },
  feelTitle: { fontSize: 20, fontWeight: '700', color: colors.primary, marginTop: 5 },
  feelIntro: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 7 },
  feelLoader: { marginTop: 16 },
  feelCountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 15, marginBottom: 6 },
  feelNumber: { fontSize: 29, fontWeight: '700', color: colors.primary },
  feelCountCopy: { fontSize: 12, color: colors.textSecondary },
  feelRows: { borderTopWidth: 1, borderTopColor: colors.border },
  feelRow: { minHeight: 39, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border },
  feelRowLabel: { color: colors.textPrimary, fontSize: 13 },
  feelRowCount: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  feelRecentTitle: { color: colors.primaryLight, fontSize: 10, fontWeight: '800', letterSpacing: 1.1, marginTop: 18, marginBottom: 9 },
  feelRecentRow: { flexDirection: 'row', gap: 7 },
  feelRecentItem: { flex: 1, minWidth: 0, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 11, padding: 9 },
  feelRecentDay: { color: colors.textSecondary, fontSize: 10 },
  feelRecentValue: { color: colors.primary, fontSize: 11, fontWeight: '700', marginTop: 3 },
  feelEmpty: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 14 },
  note: { flexDirection: 'row', gap: 13, padding: 18, borderRadius: 16, backgroundColor: colors.primarySoft, marginTop: 25 },
  noteTitle: { color: colors.primary, fontWeight: '700', fontSize: 14 }, noteCopy: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 4 },
  empty: { borderWidth: 1, borderColor: colors.border, borderRadius: 17, backgroundColor: 'white', padding: 22, marginTop: 25 },
  emptyTitle: { fontSize: 17, color: colors.primary, fontWeight: '700' }, emptyCopy: { fontSize: 13, lineHeight: 19, color: colors.textSecondary, marginTop: 6 },
  retryButton: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44, marginTop: 4 },
  retryText: { color: colors.primary, fontWeight: '700' }, refreshText: { color: colors.textSecondary, fontSize: 12, marginBottom: 12 }
});
