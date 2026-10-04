import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import { Header } from '../../src/components/Header';
import { RoutineLog, RoutineLogService } from '../../src/services/routine-log-service';
import { colors } from '../../src/theme/tokens';

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function ProgressScreen() {
  const [logs, setLogs] = useState<RoutineLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [authUid, setAuthUid] = useState(auth().currentUser?.uid ?? null);
  const [loadedUid, setLoadedUid] = useState<string | null>(null);
  const [loadedEpoch, setLoadedEpoch] = useState<number | null>(null);
  const [reloadRevision, setReloadRevision] = useState(0);
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
      setLoadedUid(null);
      setLoadedEpoch(null);
      loadedUidRef.current = null;
      setLoading(true);
      setRefreshing(false);
      setError(false);
    }
    setAuthUid(uid);
  }), []);

  useFocusEffect(useCallback(() => {
    const uid = authUid;
    if (!uid || auth().currentUser?.uid !== uid) return;
    const epoch = identityEpoch.current;
    const request = ++requestId.current;
    const stillCurrent = () => request === requestId.current && epoch === identityEpoch.current && auth().currentUser?.uid === uid;
    if (loadedUidRef.current === uid) setRefreshing(true);
    else setLoading(true);
    setError(false);
    RoutineLogService.recent(90).then((items) => {
      if (stillCurrent()) { setLogs(items); setLoadedUid(uid); setLoadedEpoch(epoch); loadedUidRef.current = uid; setLoading(false); setRefreshing(false); }
    }).catch(() => { if (stillCurrent()) { setError(true); setLoading(false); setRefreshing(false); } });
    return () => { ++requestId.current; };
  }, [authUid, reloadRevision]));

  const liveUid = auth().currentUser?.uid ?? null;
  const sameAccount = !!liveUid && authUid === liveUid;
  const dataIsCurrent = sameAccount && loadedUid === liveUid && loadedEpoch === identityEpoch.current;
  const byDay = new Map((dataIsCurrent ? logs : []).map((log) => [log.day, log]));
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - 13 + index);
    const day = localDateKey(date);
    const completed = byDay.get(day)?.completedIds.length ?? 0;
    return { day, label: date.toLocaleDateString(undefined, { weekday: 'short' }), date: date.getDate(), completed };
  });
  const activeDays = days.filter((day) => day.completed > 0).length;
  const totalSteps = days.reduce((sum, day) => sum + day.completed, 0);
  const today = days[days.length - 1];

  return <View style={styles.screen}>
    <Header />
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>YOUR REAL RECORD</Text>
      <Text style={styles.title}>Progress, at your pace.</Text>
      <Text style={styles.subtitle}>A record of the ritual steps you marked complete. Your skin can change for many reasons; this view tracks consistency only.</Text>
      {!sameAccount || loading ? <ActivityIndicator style={{ marginTop: 50 }} color={colors.primary} /> : error ? <View style={styles.empty}><Text style={styles.emptyTitle}>Could not load your record</Text><Text style={styles.emptyCopy}>Check your connection and try again.</Text><Pressable accessibilityRole="button" onPress={() => setReloadRevision(value => value + 1)}><Text style={styles.retryText}>Try again</Text></Pressable></View> : dataIsCurrent ? <>
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
  note: { flexDirection: 'row', gap: 13, padding: 18, borderRadius: 16, backgroundColor: colors.primarySoft, marginTop: 25 },
  noteTitle: { color: colors.primary, fontWeight: '700', fontSize: 14 }, noteCopy: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 4 },
  empty: { borderWidth: 1, borderColor: colors.border, borderRadius: 17, backgroundColor: 'white', padding: 22, marginTop: 25 },
  emptyTitle: { fontSize: 17, color: colors.primary, fontWeight: '700' }, emptyCopy: { fontSize: 13, lineHeight: 19, color: colors.textSecondary, marginTop: 6 }, retryText: { color: colors.primary, fontWeight: '700', marginTop: 12 }, refreshText: { color: colors.textSecondary, fontSize: 12, marginBottom: 12 }
});
