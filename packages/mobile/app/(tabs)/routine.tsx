import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ImageBackground, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import { Header } from '../../src/components/Header';
import { DisclaimerBar } from '../../src/components/DisclaimerBar';
import { localImages } from '../../src/theme/images';
import { colors } from '../../src/theme/tokens';
import { RoutineCategory, RoutinePeriod, RoutineService, RoutineStep } from '../../src/services/routine-service';

const categories: RoutineCategory[] = ['Cleanse', 'Hydrate', 'Treat', 'Protect', 'Other'];

export default function RoutineScreen() {
  const [steps, setSteps] = useState<RoutineStep[]>([]);
  const [draft, setDraft] = useState<RoutineStep | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
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
      setSteps([]);
      setDraft(null);
      setLoadedUid(null);
      setLoadedEpoch(null);
      loadedUidRef.current = null;
      setLoading(true);
      setRefreshing(false);
      setSaving(false);
      setLoadError(null);
    }
    setAuthUid(uid);
  }), []);

  useFocusEffect(useCallback(() => {
    const uid = authUid;
    if (!uid || auth().currentUser?.uid !== uid) return;
    const epoch = identityEpoch.current;
    const request = ++requestId.current;
    const stillCurrent = () => request === requestId.current && epoch === identityEpoch.current && auth().currentUser?.uid === uid;
    setDraft(null);
    if (loadedUidRef.current === uid) setRefreshing(true);
    else setLoading(true);
    setLoadError(null);
    RoutineService.get().then(items => {
      if (stillCurrent()) { setSteps(items); setLoadedUid(uid); setLoadedEpoch(epoch); loadedUidRef.current = uid; setLoading(false); setRefreshing(false); }
    }).catch((cause) => { if (stillCurrent()) { console.warn('[Routine] load failed', cause); setLoading(false); setRefreshing(false); setLoadError(cause instanceof Error ? cause.message : String(cause)); } });
    return () => { ++requestId.current; };
  }, [authUid, reloadRevision]));

  async function persist(next: RoutineStep[]) {
    const uid = auth().currentUser?.uid;
    if (!uid || authUid !== uid || loadedUid !== uid || loadedEpoch !== identityEpoch.current || loading || refreshing || loadError || saving) return;
    const epoch = identityEpoch.current;
    const stillCurrent = () => identityEpoch.current === epoch && auth().currentUser?.uid === uid;
    setSaving(true);
    try {
      await RoutineService.save(next, uid);
      if (stillCurrent()) { setSteps(next); setDraft(null); }
    } catch (cause) {
      if (stillCurrent()) Alert.alert('Could not save routine', cause instanceof Error ? cause.message : 'Please try again.');
    } finally { if (stillCurrent()) setSaving(false); }
  }

  function saveDraft() {
    if (!draft || saving) return;
    const cleaned = { ...draft, name: draft.name.trim(), detail: draft.detail.trim() };
    if (!cleaned.name) { Alert.alert('Name this step', 'Enter a short name before saving.'); return; }
    const exists = steps.some(step => step.id === cleaned.id);
    persist(exists ? steps.map(step => step.id === cleaned.id ? cleaned : step) : [...steps, cleaned]);
  }

  function removeStep(step: RoutineStep) {
    if (steps.length <= 1) { Alert.alert('Keep one step', 'Your routine needs at least one step.'); return; }
    const uid = auth().currentUser?.uid;
    const epoch = identityEpoch.current;
    Alert.alert('Remove step?', `${step.name} will no longer appear in your routine. Past daily records remain.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        if (uid && auth().currentUser?.uid === uid && identityEpoch.current === epoch) void persist(steps.filter(item => item.id !== step.id));
      } }
    ]);
  }

  function section(period: RoutinePeriod) {
    const items = steps.filter(step => step.period === period);
    const morning = period === 'morning';
    return <View style={styles.section} key={period}>
      <View style={styles.sectionHeading}>
        <View style={styles.sectionTitleRow}><Ionicons name={morning ? 'sunny-outline' : 'moon-outline'} size={21} color={morning ? colors.goldDark : colors.primary} /><Text style={styles.sectionTitle}>{morning ? 'Morning' : 'Evening'}</Text></View>
        <Text style={styles.count}>{items.length} {items.length === 1 ? 'step' : 'steps'}</Text>
      </View>
      {items.map((step, index) => <View key={step.id} style={styles.step}>
        <View style={styles.number}><Text style={styles.numberText}>{index + 1}</Text></View>
        <View style={styles.stepBody}>
          <Text style={styles.category}>{step.category.toUpperCase()}</Text>
          <Text style={styles.stepName}>{step.name}</Text>
          {!!step.detail && <Text style={styles.stepDetail}>{step.detail}</Text>}
        </View>
        <Pressable accessibilityLabel={`Edit ${step.name}`} disabled={refreshing || saving} onPress={() => setDraft({ ...step })} style={styles.editButton}><Ionicons name="create-outline" size={21} color={colors.primary} /></Pressable>
      </View>)}
      <Pressable disabled={refreshing || saving || steps.length >= 20} onPress={() => setDraft(RoutineService.newStep(period))} style={styles.addButton}>
        <Ionicons name="add-circle-outline" size={21} color={colors.primary} /><Text style={styles.addText}>Add {morning ? 'a morning' : 'an evening'} step</Text>
      </Pressable>
    </View>;
  }

  const liveUid = auth().currentUser?.uid ?? null;
  const sameAccount = !!liveUid && authUid === liveUid;
  const dataIsCurrent = sameAccount && loadedUid === liveUid && loadedEpoch === identityEpoch.current;

  return <View style={styles.screen}>
    <Header />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ImageBackground source={localImages.editorialRoutine} style={styles.hero} imageStyle={styles.heroImage}>
        <View style={styles.heroShade}><Text style={styles.heroEyebrow}>YOUR DAILY PLAN</Text><Text style={styles.heroTitle}>A ritual that fits you.</Text></View>
      </ImageBackground>
      <Text style={styles.intro}>Begin with gentle steps, then add or edit what you actually use. Follow product labels and pause anything that irritates your skin.</Text>
      {!sameAccount || loading ? <ActivityIndicator style={{ marginTop: 38 }} color={colors.primary} /> : loadError ? <View style={styles.error}><Text style={styles.errorTitle}>Could not load your routine</Text><Text style={styles.errorCopy}>{__DEV__ ? loadError : 'Check your connection and try again.'}</Text><Pressable accessibilityRole="button" onPress={() => setReloadRevision(value => value + 1)}><Text style={styles.retryText}>Try again</Text></Pressable></View> : dataIsCurrent ? <>
        {refreshing && <Text style={styles.refreshText}>Refreshing your routine…</Text>}
        {section('morning')}
        {section('evening')}
      </> : <ActivityIndicator style={{ marginTop: 38 }} color={colors.primary} />}
      <DisclaimerBar showAffiliate={false} />
    </ScrollView>
    <Modal visible={draft !== null && dataIsCurrent && !loading && !loadError} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDraft(null)}>
      <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
        {draft && <View style={styles.editor}>
          <Text style={styles.editorTitle}>{steps.some(step => step.id === draft.id) ? 'Edit step' : 'Add step'}</Text>
          <Text style={styles.fieldLabel}>WHEN</Text>
          <View style={styles.chips}>{(['morning', 'evening'] as const).map(period => <Pressable key={period} onPress={() => setDraft({ ...draft, period })} style={[styles.chip, draft.period === period && styles.chipSelected]}><Text style={[styles.chipText, draft.period === period && styles.chipTextSelected]}>{period === 'morning' ? 'Morning' : 'Evening'}</Text></Pressable>)}</View>
          <Text style={styles.fieldLabel}>STEP NAME</Text>
          <TextInput value={draft.name} onChangeText={name => setDraft({ ...draft, name })} maxLength={60} placeholder="For example, apply moisturizer" placeholderTextColor={colors.textTertiary} style={styles.input} />
          <Text style={styles.fieldLabel}>CATEGORY</Text>
          <View style={styles.chips}>{categories.map(category => <Pressable key={category} onPress={() => setDraft({ ...draft, category })} style={[styles.chip, draft.category === category && styles.chipSelected]}><Text style={[styles.chipText, draft.category === category && styles.chipTextSelected]}>{category}</Text></Pressable>)}</View>
          <Text style={styles.fieldLabel}>NOTE · OPTIONAL</Text>
          <TextInput value={draft.detail} onChangeText={detail => setDraft({ ...draft, detail })} maxLength={180} multiline placeholder="A short note about how you use it" placeholderTextColor={colors.textTertiary} style={[styles.input, styles.notesInput]} />
          <View style={styles.actions}>
            <Pressable onPress={() => setDraft(null)} style={styles.cancelButton}><Text style={styles.cancelText}>Cancel</Text></Pressable>
            <Pressable disabled={saving || refreshing} onPress={saveDraft} style={styles.saveButton}>{saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveText}>Save step</Text>}</Pressable>
          </View>
          {steps.some(step => step.id === draft.id) && <Pressable disabled={saving || refreshing} onPress={() => removeStep(draft)} style={styles.removeButton}><Text style={styles.removeText}>Remove this step</Text></Pressable>}
        </View>}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, content: { paddingHorizontal: 20, paddingBottom: 50 },
  hero: { height: 190, marginTop: 12, borderRadius: 20, overflow: 'hidden', justifyContent: 'flex-end' }, heroImage: { borderRadius: 20 }, heroShade: { backgroundColor: 'rgba(19,38,28,0.72)', padding: 21 },
  heroEyebrow: { color: '#EAD3A6', fontSize: 10, letterSpacing: 1.7, fontWeight: '800' }, heroTitle: { color: 'white', fontSize: 27, fontWeight: '700', marginTop: 6 },
  intro: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 18, marginBottom: 10 },
  section: { marginTop: 25 }, sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { color: colors.primary, fontSize: 19, fontWeight: '700' }, count: { color: colors.textTertiary, fontSize: 12 },
  step: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'white', borderRadius: 16, borderColor: colors.border, borderWidth: 1, padding: 15, marginBottom: 8 },
  number: { width: 27, height: 27, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 }, numberText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  stepBody: { flex: 1 }, category: { color: colors.goldDark, fontWeight: '800', fontSize: 9, letterSpacing: 1 }, stepName: { color: colors.textPrimary, fontSize: 15, fontWeight: '700', marginTop: 4 }, stepDetail: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 4 },
  editButton: { padding: 7 }, addButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11 }, addText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  editor: { backgroundColor: '#F1F5F0', borderColor: '#D9E4D9', borderWidth: 1, borderRadius: 20, padding: 18, marginTop: 20 }, editorTitle: { color: colors.primary, fontSize: 20, fontWeight: '700', marginBottom: 13 },
  modalRoot: { flex: 1, backgroundColor: colors.background }, modalContent: { padding: 20, paddingBottom: 44 },
  fieldLabel: { color: colors.goldDark, fontSize: 10, letterSpacing: 1.2, fontWeight: '800', marginBottom: 8, marginTop: 13 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: 'white', borderWidth: 1, borderColor: colors.border }, chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary }, chipText: { color: colors.primary, fontSize: 12, fontWeight: '600' }, chipTextSelected: { color: 'white' },
  input: { backgroundColor: 'white', borderColor: colors.border, borderWidth: 1, borderRadius: 12, minHeight: 47, paddingHorizontal: 12, color: colors.textPrimary, fontSize: 14 }, notesInput: { minHeight: 74, paddingTop: 12, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: 9, marginTop: 20 }, cancelButton: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center' }, cancelText: { color: colors.primary, fontWeight: '700' }, saveButton: { flex: 2, backgroundColor: colors.primary, minHeight: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, saveText: { color: 'white', fontWeight: '700' },
  removeButton: { padding: 15, alignItems: 'center' }, removeText: { color: '#A64032', fontSize: 13, fontWeight: '700' }, error: { backgroundColor: 'white', borderRadius: 16, padding: 20, marginTop: 20 }, errorTitle: { color: colors.primary, fontWeight: '700' }, errorCopy: { color: colors.textSecondary, marginTop: 5 }, retryText: { color: colors.primary, fontWeight: '700', marginTop: 12 }, refreshText: { color: colors.textSecondary, fontSize: 12, marginTop: 14 }
});
