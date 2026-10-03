import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ImageBackground, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../src/components/Header';
import { localImages } from '../../src/theme/images';
import { colors } from '../../src/theme/tokens';
import { ShelfCategory, ShelfItem, ShelfService } from '../../src/services/shelf-service';

const categories: ShelfCategory[] = ['Cleanser', 'Moisturizer', 'Sunscreen', 'Treatment', 'Other'];
const icons: Record<ShelfCategory, keyof typeof Ionicons.glyphMap> = {
  Cleanser: 'water-outline', Moisturizer: 'leaf-outline', Sunscreen: 'sunny-outline', Treatment: 'flask-outline', Other: 'cube-outline'
};

export default function ShelfScreen() {
  const [items, setItems] = useState<ShelfItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [brand, setBrand] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ShelfCategory>('Moisturizer');
  const [openedOn, setOpenedOn] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { setItems(await ShelfService.list()); setError(false); }
    catch { setError(true); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function save() {
    setSaving(true);
    try {
      const input = { brand, name, category, openedOn: openedOn.trim() || null };
      if (editingId) {
        await ShelfService.update(editingId, input);
        setItems(current => current.map(item => item.id === editingId ? { ...item, ...input, name: name.trim(), brand: brand.trim() } : item));
      } else {
        const item = await ShelfService.add(input);
        setItems((current) => [item, ...current]);
      }
      setShowForm(false); setEditingId(null); setBrand(''); setName(''); setOpenedOn('');
    } catch (cause) { Alert.alert('Could not save product', cause instanceof Error ? cause.message : 'Please try again.'); }
    finally { setSaving(false); }
  }

  function openEdit(item: ShelfItem) {
    setEditingId(item.id); setBrand(item.brand); setName(item.name); setCategory(item.category); setOpenedOn(item.openedOn ?? ''); setShowForm(true);
  }

  function openAdd() {
    setEditingId(null); setBrand(''); setName(''); setCategory('Moisturizer'); setOpenedOn(''); setShowForm(true);
  }

  function confirmRemove(item: ShelfItem) {
    Alert.alert('Remove from shelf?', `Remove ${item.name} from your account?`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try { await ShelfService.remove(item.id); setItems((current) => current.filter((entry) => entry.id !== item.id)); }
        catch { Alert.alert('Could not remove product', 'Please try again.'); }
      } }
    ]);
  }

  return <View style={styles.screen}>
    <Header />
    <ScrollView contentContainerStyle={styles.content}>
      <ImageBackground source={localImages.editorialRoutine} style={styles.hero} imageStyle={{ borderRadius: 20 }}>
        <View style={styles.heroShade}><Text style={styles.heroEyebrow}>YOUR PERSONAL INVENTORY</Text><Text style={styles.heroTitle}>A place for what you use.</Text></View>
      </ImageBackground>
      <Text style={styles.subtitle}>Keep a simple record of your own products. Details here are entered by you; this shelf does not rate ingredients or recommend products.</Text>
      <Pressable onPress={openAdd} style={styles.addButton}><Ionicons name="add" size={21} color="white" /><Text style={styles.addText}>Add a product</Text></Pressable>
      <Text style={styles.section}>MY PRODUCTS  ·  {items.length}</Text>
      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 28 }} /> : error ? <View style={styles.empty}><Text style={styles.emptyTitle}>Could not load your shelf</Text><Pressable onPress={load}><Text style={styles.link}>Try again</Text></Pressable></View> : items.length === 0 ? <View style={styles.empty}><Ionicons name="cube-outline" size={29} color={colors.goldDark} /><Text style={styles.emptyTitle}>Start with one product</Text><Text style={styles.emptyCopy}>Add a cleanser, moisturizer, sunscreen, or any product you already use.</Text></View> : items.map((item) => <View key={item.id} style={styles.card}>
        <View style={styles.productIcon}><Ionicons name={icons[item.category] as any} size={23} color={colors.primary} /></View>
        <View style={{ flex: 1 }}><Text style={styles.category}>{item.category.toUpperCase()}</Text><Text style={styles.name}>{item.name}</Text>{!!item.brand && <Text style={styles.brand}>{item.brand}</Text>}{item.openedOn && <Text style={styles.opened}>Opened {item.openedOn}</Text>}</View>
        <Pressable accessibilityLabel={`Edit ${item.name}`} onPress={() => openEdit(item)} style={styles.delete}><Ionicons name="create-outline" size={19} color={colors.primary} /></Pressable>
        <Pressable accessibilityLabel={`Remove ${item.name}`} onPress={() => confirmRemove(item)} style={styles.delete}><Ionicons name="trash-outline" size={18} color={colors.textTertiary} /></Pressable>
      </View>)}
    </ScrollView>
    <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
      <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
        <View style={styles.sheetTop}><Text style={styles.sheetTitle}>{editingId ? 'Edit product' : 'Add a product'}</Text><Pressable onPress={() => setShowForm(false)}><Ionicons name="close" size={22} color={colors.primary} /></Pressable></View>
        <Text style={styles.fieldLabel}>PRODUCT NAME</Text><TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Gentle cleanser" maxLength={100} />
        <Text style={styles.fieldLabel}>BRAND  ·  OPTIONAL</Text><TextInput style={styles.input} value={brand} onChangeText={setBrand} placeholder="Brand name" maxLength={80} />
        <Text style={styles.fieldLabel}>CATEGORY</Text><View style={styles.chips}>{categories.map((value) => <Pressable key={value} onPress={() => setCategory(value)} style={[styles.chip, category === value && styles.chipSelected]}><Text style={[styles.chipText, category === value && styles.chipTextSelected]}>{value}</Text></Pressable>)}</View>
        <Text style={styles.fieldLabel}>OPENED ON  ·  OPTIONAL</Text><TextInput style={styles.input} value={openedOn} onChangeText={setOpenedOn} placeholder="YYYY-MM-DD" autoCapitalize="none" />
        <Pressable disabled={saving} onPress={save} style={[styles.addButton, saving && { opacity: 0.6 }]}>{saving ? <ActivityIndicator color="white" /> : <Text style={styles.addText}>{editingId ? 'Save changes' : 'Save to my shelf'}</Text>}</Pressable>
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
  emptyCopy: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: 7 }, link: { color: colors.primary, fontWeight: '700', marginTop: 12 },
  card: { flexDirection: 'row', backgroundColor: 'white', borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14, marginBottom: 10, gap: 13 },
  productIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, category: { color: colors.goldDark, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  name: { color: colors.textPrimary, fontSize: 15, fontWeight: '700', marginTop: 3 }, brand: { color: colors.textSecondary, fontSize: 12, marginTop: 3 }, opened: { color: colors.textTertiary, fontSize: 11, marginTop: 5 }, delete: { padding: 5 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,26,19,0.45)' }, sheet: { backgroundColor: colors.background, borderTopLeftRadius: 25, borderTopRightRadius: 25, maxHeight: '90%' }, sheetContent: { padding: 24, paddingBottom: 42 },
  sheetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }, sheetTitle: { color: colors.primary, fontSize: 21, fontWeight: '700' }, fieldLabel: { color: colors.goldDark, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: colors.border, minHeight: 48, paddingHorizontal: 13, color: colors.textPrimary, fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 15, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: 'white' },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary }, chipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' }, chipTextSelected: { color: 'white' }
});
