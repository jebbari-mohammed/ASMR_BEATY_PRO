import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ImageBackground, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import { Header } from '../../src/components/Header';
import { localImages } from '../../src/theme/images';
import { colors } from '../../src/theme/tokens';
import { ShelfCategory, ShelfItem, ShelfService } from '../../src/services/shelf-service';
import { DiscoveryProduct, ProductDiscoveryService } from '../../src/services/product-discovery-service';

const categories: ShelfCategory[] = ['Cleanser', 'Moisturizer', 'Sunscreen', 'Treatment', 'Other'];
const icons: Record<ShelfCategory, keyof typeof Ionicons.glyphMap> = {
  Cleanser: 'water-outline', Moisturizer: 'leaf-outline', Sunscreen: 'sunny-outline', Treatment: 'flask-outline', Other: 'cube-outline'
};
const discoveryGroups = [
  { category: 'Cleanser', label: 'CLEANSE', icon: 'water-outline' },
  { category: 'Moisturizer', label: 'MOISTURIZE', icon: 'leaf-outline' },
  { category: 'Sunscreen', label: 'DAY SPF', icon: 'sunny-outline' }
] as const;

export default function ShelfScreen() {
  const [items, setItems] = useState<ShelfItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [brand, setBrand] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ShelfCategory>('Moisturizer');
  const [openedOn, setOpenedOn] = useState('');
  const [saving, setSaving] = useState(false);
  const [authUid, setAuthUid] = useState(auth().currentUser?.uid ?? null);
  const [loadedUid, setLoadedUid] = useState<string | null>(null);
  const [loadedEpoch, setLoadedEpoch] = useState<number | null>(null);
  const [discoveryOpen, setDiscoveryOpen] = useState(false);
  const [discoveryProducts, setDiscoveryProducts] = useState<DiscoveryProduct[]>([]);
  const [discoveryLoaded, setDiscoveryLoaded] = useState(false);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveryError, setDiscoveryError] = useState(false);
  const currentUid = useRef(auth().currentUser?.uid ?? null);
  const loadedUidRef = useRef<string | null>(null);
  const identityEpoch = useRef(0);
  const requestId = useRef(0);
  const discoveryRequestId = useRef(0);

  useEffect(() => auth().onAuthStateChanged(user => {
    const uid = user?.uid ?? null;
    if (currentUid.current !== uid) {
      currentUid.current = uid;
      ++identityEpoch.current;
      ++requestId.current;
      ++discoveryRequestId.current;
      setItems([]);
      setLoadedUid(null);
      setLoadedEpoch(null);
      loadedUidRef.current = null;
      setLoading(true);
      setRefreshing(false);
      setError(false);
      setShowForm(false);
      setEditingId(null);
      setBrand('');
      setName('');
      setOpenedOn('');
      setSaving(false);
      setDiscoveryOpen(false);
      setDiscoveryProducts([]);
      setDiscoveryLoaded(false);
      setDiscoveryLoading(false);
      setDiscoveryError(false);
    }
    setAuthUid(uid);
  }), []);

  const load = useCallback(async () => {
    const uid = authUid;
    if (!uid || auth().currentUser?.uid !== uid) return;
    const epoch = identityEpoch.current;
    const request = ++requestId.current;
    const stillCurrent = () => request === requestId.current && epoch === identityEpoch.current && auth().currentUser?.uid === uid;
    setShowForm(false);
    if (loadedUidRef.current === uid) setRefreshing(true);
    else setLoading(true);
    setError(false);
    try {
      const result = await ShelfService.list(uid);
      if (stillCurrent()) { setItems(result); setLoadedUid(uid); setLoadedEpoch(epoch); loadedUidRef.current = uid; setError(false); }
    } catch { if (stillCurrent()) setError(true); }
    finally { if (stillCurrent()) { setLoading(false); setRefreshing(false); } }
  }, [authUid]);

  const loadDiscovery = useCallback(async () => {
    const uid = authUid;
    if (!uid || auth().currentUser?.uid !== uid) return;
    const epoch = identityEpoch.current;
    const request = ++discoveryRequestId.current;
    const stillCurrent = () => request === discoveryRequestId.current && epoch === identityEpoch.current && auth().currentUser?.uid === uid;
    setDiscoveryLoading(true);
    setDiscoveryError(false);
    try {
      const products = await ProductDiscoveryService.list(uid);
      if (stillCurrent()) { setDiscoveryProducts(products); setDiscoveryLoaded(true); }
    } catch { if (stillCurrent()) setDiscoveryError(true); }
    finally { if (stillCurrent()) setDiscoveryLoading(false); }
  }, [authUid]);

  useFocusEffect(useCallback(() => {
    void load();
    return () => { ++requestId.current; };
  }, [load]));

  async function save() {
    const uid = auth().currentUser?.uid;
    if (!uid || authUid !== uid || loadedUid !== uid || loadedEpoch !== identityEpoch.current || loading || refreshing || error || saving) return;
    const epoch = identityEpoch.current;
    const stillCurrent = () => identityEpoch.current === epoch && auth().currentUser?.uid === uid;
    const targetId = editingId;
    setSaving(true);
    try {
      const input = { brand, name, category, openedOn: openedOn.trim() || null };
      if (targetId) {
        await ShelfService.update(targetId, input, uid);
        if (stillCurrent()) setItems(current => current.map(item => item.id === targetId ? { ...item, ...input, name: name.trim(), brand: brand.trim() } : item));
      } else {
        const item = await ShelfService.add(input, uid);
        if (stillCurrent()) setItems((current) => [item, ...current]);
      }
      if (stillCurrent()) { setShowForm(false); setEditingId(null); setBrand(''); setName(''); setOpenedOn(''); }
    } catch (cause) { if (stillCurrent()) Alert.alert('Could not save product', cause instanceof Error ? cause.message : 'Please try again.'); }
    finally { if (stillCurrent()) setSaving(false); }
  }

  function openEdit(item: ShelfItem) {
    setEditingId(item.id); setBrand(item.brand); setName(item.name); setCategory(item.category); setOpenedOn(item.openedOn ?? ''); setShowForm(true);
  }

  function openAdd() {
    setEditingId(null); setBrand(''); setName(''); setCategory('Moisturizer'); setOpenedOn(''); setShowForm(true);
  }

  function confirmRemove(item: ShelfItem) {
    const uid = auth().currentUser?.uid;
    if (!uid || authUid !== uid || loadedUid !== uid || loadedEpoch !== identityEpoch.current || loading || refreshing || error) return;
    const epoch = identityEpoch.current;
    const stillCurrent = () => identityEpoch.current === epoch && auth().currentUser?.uid === uid;
    Alert.alert('Remove from shelf?', `Remove ${item.name} from your account?`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        if (!stillCurrent()) return;
        try {
          await ShelfService.remove(item.id, uid);
          if (stillCurrent()) setItems((current) => current.filter((entry) => entry.id !== item.id));
        } catch { if (stillCurrent()) Alert.alert('Could not remove product', 'Please try again.'); }
      } }
    ]);
  }

  function toggleDiscovery() {
    if (!dataIsCurrent) return;
    if (!discoveryOpen && !discoveryLoaded && !discoveryLoading) void loadDiscovery();
    setDiscoveryOpen(open => !open);
  }

  async function openProduct(product: DiscoveryProduct) {
    if (!dataIsCurrent || auth().currentUser?.uid !== authUid) return;
    try { await Linking.openURL(product.url); }
    catch { Alert.alert('Could not open retailer', 'Please try again later.'); }
  }

  const liveUid = auth().currentUser?.uid ?? null;
  const sameAccount = !!liveUid && authUid === liveUid;
  const dataIsCurrent = sameAccount && loadedUid === liveUid && loadedEpoch === identityEpoch.current;

  return <View style={styles.screen}>
    <Header />
    <ScrollView contentContainerStyle={styles.content}>
      <ImageBackground source={localImages.editorialRoutine} style={styles.hero} imageStyle={{ borderRadius: 20 }}>
        <View style={styles.heroShade}><Text style={styles.heroEyebrow}>YOUR PERSONAL INVENTORY</Text><Text style={styles.heroTitle}>A place for what you use.</Text></View>
      </ImageBackground>
      <Text style={styles.subtitle}>Keep a simple record of the products you use. This shelf does not rate ingredients or decide what is right for your skin.</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: !dataIsCurrent || loading || refreshing || error }} disabled={!dataIsCurrent || loading || refreshing || error} onPress={openAdd} style={[styles.addButton, (!dataIsCurrent || loading || refreshing || error) && { opacity: 0.6 }]}><Ionicons name="add" size={21} color="white" /><Text style={styles.addText}>Add a product</Text></Pressable>
      <Text style={styles.section}>MY PRODUCTS  ·  {dataIsCurrent ? items.length : 0}</Text>
      {refreshing && dataIsCurrent && <Text style={styles.refreshText}>Refreshing your shelf…</Text>}
      {!sameAccount || loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 28 }} /> : error ? <View style={styles.empty}><Text style={styles.emptyTitle}>Could not load your shelf</Text><Pressable accessibilityRole="button" onPress={() => void load()}><Text style={styles.link}>Try again</Text></Pressable></View> : !dataIsCurrent ? <ActivityIndicator color={colors.primary} style={{ marginTop: 28 }} /> : items.length === 0 ? <View style={styles.empty}><Ionicons name="cube-outline" size={29} color={colors.goldDark} /><Text style={styles.emptyTitle}>Start with one product</Text><Text style={styles.emptyCopy}>Add a cleanser, moisturizer, sunscreen, or any product you already use.</Text></View> : items.map((item) => <View key={item.id} style={styles.card}>
        <View style={styles.productSummary}>
          <View style={styles.productIcon}><Ionicons name={icons[item.category]} size={23} color={colors.primary} /></View>
          <View style={styles.productDetails}><Text style={styles.category}>{item.category.toUpperCase()}</Text><Text style={styles.name}>{item.name}</Text>{!!item.brand && <Text style={styles.brand}>{item.brand}</Text>}{item.openedOn && <Text style={styles.opened}>Opened {item.openedOn}</Text>}</View>
        </View>
        <View style={styles.productActions}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${item.name}`} accessibilityState={{ disabled: refreshing || saving }} disabled={refreshing || saving} onPress={() => openEdit(item)} style={styles.productAction}><Ionicons name="create-outline" size={18} color={colors.primary} /><Text style={styles.productActionText}>Edit</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${item.name}`} accessibilityState={{ disabled: refreshing || saving }} disabled={refreshing || saving} onPress={() => confirmRemove(item)} style={styles.productAction}><Ionicons name="trash-outline" size={18} color={colors.textSecondary} /><Text style={styles.productActionText}>Remove</Text></Pressable>
        </View>
      </View>)}
      {dataIsCurrent && !error && <View style={styles.discoverySection}>
        <Pressable accessibilityRole="button" accessibilityLabel={discoveryOpen ? 'Hide optional product links' : 'Explore optional product links by step'} accessibilityState={{ expanded: discoveryOpen }} onPress={toggleDiscovery} style={styles.discoveryToggle}>
          <View style={styles.discoveryToggleCopy}>
            <Text style={styles.discoveryEyebrow}>ONLY IF YOU NEED SOMETHING</Text>
            <Text style={styles.discoveryTitle}>Explore a basic by step</Text>
            <Text style={styles.discoverySubtitle}>Your routine works with products you already own. Shopping is optional.</Text>
          </View>
          <Ionicons name={discoveryOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.primary} />
        </Pressable>
        {discoveryOpen && <View style={styles.discoveryBody}>
          <Text style={styles.discoveryNote}>These are examples to browse, not personalized matches or products you need to buy.</Text>
          {discoveryLoading ? <ActivityIndicator color={colors.primary} style={styles.discoveryLoader} /> : discoveryError ? <View style={styles.discoveryStatus}><Text style={styles.discoveryStatusText}>Product links could not load right now.</Text><Pressable accessibilityRole="button" onPress={() => void loadDiscovery()} style={styles.discoveryRetry}><Text style={styles.discoveryRetryText}>Try again</Text></Pressable></View> : discoveryProducts.length === 0 ? <Text style={styles.discoveryStatusText}>No product links are available right now.</Text> : discoveryGroups.map(group => {
            const matches = discoveryProducts.filter(product => product.category === group.category);
            return matches.length ? <View key={group.category} style={styles.discoveryGroup}>
              <View style={styles.discoveryGroupHeading}><Ionicons name={group.icon} size={16} color={colors.goldDark} /><Text style={styles.discoveryGroupLabel}>{group.label}</Text></View>
              {matches.map(product => <View key={product.id} style={styles.discoveryProduct}>
                <Text style={styles.discoveryBrand}>{product.brand}</Text>
                <Text style={styles.discoveryName}>{product.name}</Text>
                {product.isCommissioned && <Text style={styles.discoveryCommission}>We may earn a commission if you buy through this link. Your purchase is with {product.merchant}.</Text>}
                <Pressable accessibilityRole="link" accessibilityLabel={`View ${product.brand} ${product.name} at ${product.merchant}`} accessibilityHint={`Opens outside ASMR Beauty Pro.${product.isCommissioned ? ' We may earn a commission if you buy through this link.' : ''}`} onPress={() => void openProduct(product)} style={styles.discoveryLink}><Text style={styles.discoveryLinkText}>View at {product.merchant}</Text><Ionicons name="open-outline" size={16} color={colors.primary} /></Pressable>
              </View>)}
            </View> : null;
          })}
        </View>}
      </View>}
    </ScrollView>
    <Modal visible={showForm && dataIsCurrent && !loading && !refreshing && !error} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
      <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView accessibilityViewIsModal onAccessibilityEscape={() => setShowForm(false)} style={styles.sheet} contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
        <View style={styles.sheetTop}><Text style={styles.sheetTitle}>{editingId ? 'Edit product' : 'Add a product'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close product form" onPress={() => setShowForm(false)} style={styles.sheetClose}><Ionicons name="close" size={22} color={colors.primary} /></Pressable></View>
        <Text style={styles.fieldLabel}>PRODUCT NAME</Text><TextInput accessibilityLabel="Product name" style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Gentle cleanser" maxLength={100} />
        <Text style={styles.fieldLabel}>BRAND  ·  OPTIONAL</Text><TextInput accessibilityLabel="Brand, optional" style={styles.input} value={brand} onChangeText={setBrand} placeholder="Brand name" maxLength={80} />
        <Text style={styles.fieldLabel}>CATEGORY</Text><View style={styles.chips}>{categories.map((value) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: category === value }} accessibilityLabel={value} onPress={() => setCategory(value)} style={[styles.chip, category === value && styles.chipSelected]}><Text style={[styles.chipText, category === value && styles.chipTextSelected]}>{value}</Text></Pressable>)}</View>
        <Text style={styles.fieldLabel}>OPENED ON  ·  OPTIONAL</Text><TextInput accessibilityLabel="Opening date, optional" accessibilityHint="Enter a date in year, month, day format" style={styles.input} value={openedOn} onChangeText={setOpenedOn} placeholder="YYYY-MM-DD" autoCapitalize="none" />
        <Pressable accessibilityRole="button" accessibilityLabel={saving ? 'Saving product' : editingId ? 'Save changes' : 'Save to my shelf'} accessibilityState={{ disabled: saving, busy: saving }} disabled={saving} onPress={save} style={[styles.addButton, saving && { opacity: 0.6 }]}>{saving ? <ActivityIndicator color="white" /> : <Text style={styles.addText}>{editingId ? 'Save changes' : 'Save to my shelf'}</Text>}</Pressable>
      </ScrollView></KeyboardAvoidingView>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, paddingBottom: 40 },
  hero: { height: 190, justifyContent: 'flex-end' }, heroShade: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20, backgroundColor: 'rgba(20,40,30,0.66)', padding: 21 },
  heroEyebrow: { color: '#E6CAA0', fontSize: 10, fontWeight: '800', letterSpacing: 1.7 }, heroTitle: { color: 'white', fontSize: 25, fontWeight: '700', marginTop: 8 },
  subtitle: { color: colors.textSecondary, fontSize: 13, lineHeight: 20, marginTop: 17, marginBottom: 17 },
  addButton: { backgroundColor: colors.primary, minHeight: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 7 }, addText: { color: 'white', fontWeight: '700', fontSize: 15 },
  section: { color: colors.goldDark, fontWeight: '800', fontSize: 10, letterSpacing: 1.5, marginTop: 28, marginBottom: 13 },
  empty: { backgroundColor: 'white', borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 24, alignItems: 'center' }, emptyTitle: { color: colors.primary, fontSize: 17, fontWeight: '700', marginTop: 8 },
  emptyCopy: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: 7 }, link: { color: colors.primary, fontWeight: '700', marginTop: 12 }, refreshText: { color: colors.textSecondary, fontSize: 12, marginBottom: 9 },
  card: { backgroundColor: 'white', borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 14, paddingTop: 14, marginBottom: 10 },
  productSummary: { flexDirection: 'row', alignItems: 'flex-start', gap: 13 },
  productDetails: { flex: 1, minWidth: 0 },
  productActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.borderLight, marginTop: 14 },
  productAction: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  productActionText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  productIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, category: { color: colors.goldDark, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  name: { color: colors.textPrimary, fontSize: 15, fontWeight: '700', marginTop: 3 }, brand: { color: colors.textSecondary, fontSize: 12, marginTop: 3 }, opened: { color: colors.textTertiary, fontSize: 11, marginTop: 5 },
  discoverySection: { marginTop: 27, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 },
  discoveryToggle: { minHeight: 98, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7 },
  discoveryToggleCopy: { flex: 1 },
  discoveryEyebrow: { color: colors.goldDark, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  discoveryTitle: { color: colors.primary, fontSize: 20, fontWeight: '700', marginTop: 5 },
  discoverySubtitle: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 5 },
  discoveryBody: { backgroundColor: colors.primarySoft, borderRadius: 18, padding: 17, marginTop: 8 },
  discoveryNote: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginBottom: 6 },
  discoveryLoader: { paddingVertical: 28 },
  discoveryStatus: { paddingVertical: 16, alignItems: 'flex-start' },
  discoveryStatusText: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  discoveryRetry: { minHeight: 44, justifyContent: 'center', paddingRight: 16 },
  discoveryRetryText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  discoveryGroup: { marginTop: 20 },
  discoveryGroupHeading: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  discoveryGroupLabel: { color: colors.goldDark, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  discoveryProduct: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 13 },
  discoveryBrand: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
  discoveryName: { color: colors.textPrimary, fontSize: 15, lineHeight: 21, fontWeight: '700', marginTop: 3 },
  discoveryLink: { minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8 },
  discoveryLinkText: { color: colors.primary, fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
  discoveryCommission: { color: colors.textPrimary, fontSize: 12, lineHeight: 18, marginTop: 9 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,26,19,0.45)' }, sheet: { backgroundColor: colors.background, borderTopLeftRadius: 25, borderTopRightRadius: 25, maxHeight: '90%' }, sheetContent: { padding: 24, paddingBottom: 42 },
  sheetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }, sheetTitle: { color: colors.primary, fontSize: 21, fontWeight: '700' }, sheetClose: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, fieldLabel: { color: colors.goldDark, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: colors.border, minHeight: 48, paddingHorizontal: 13, color: colors.textPrimary, fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, chip: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 15, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: 'white' },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary }, chipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' }, chipTextSelected: { color: 'white' }
});
