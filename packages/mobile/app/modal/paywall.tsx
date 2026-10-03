import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PurchasesPackage } from 'react-native-purchases';
import auth from '@react-native-firebase/auth';
import { localImages } from '../../src/theme/images';
import { colors } from '../../src/theme/tokens';
import { SubscriptionService } from '../../src/services/subscription-service';
import { useAccess } from '../../src/services/access-context';
import { EditorialStatusBackdrop } from '../../src/components/EditorialStatusBackdrop';
import { OnboardingService } from '../../src/services/onboarding-machine';
import { buildStarterPlan, StarterPlan } from '../../src/services/personalized-starter';
import { annualSavingsPercent } from '../../src/services/paywall-pricing';

function periodLabel(pkg: PurchasesPackage): string {
  const period = pkg.product.subscriptionPeriod;
  if (period === 'P1Y') return 'year';
  if (period === 'P1M') return 'month';
  if (period === 'P1W') return 'week';
  return period ? 'billing period' : 'purchase';
}

function planTitle(pkg: PurchasesPackage): string {
  if (pkg.packageType === 'ANNUAL') return 'Annual membership';
  if (pkg.packageType === 'MONTHLY') return 'Monthly membership';
  return pkg.product.title;
}

export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, email, error: accessError, refresh, signOut } = useAccess();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [switchAccountError, setSwitchAccountError] = useState<string | null>(null);
  const [starterPlanState, setStarterPlanState] = useState<{ uid: string; plan: StarterPlan } | null>(null);
  const currentUid = auth().currentUser?.uid ?? null;
  const starterPlan = starterPlanState?.uid === currentUid ? starterPlanState.plan : null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const available = await SubscriptionService.getStorePackages();
      setPackages(available);
      const annual = available.find((pkg) => pkg.packageType === 'ANNUAL');
      setSelected((current) => current && available.some((pkg) => pkg.identifier === current) ? current : (annual ?? available[0])?.identifier ?? null);
      if (!available.length) setError('Subscription plans are unavailable in the store right now. Please try again later.');
    } catch {
      setError('Store plans are unavailable on this device right now. Check your store account or connection, then reload.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (state === 'signedOut' || state === 'verifyEmail') router.replace('/account');
    if (state === 'subscribed') router.replace('/(tabs)/today');
    if (state === 'unavailable') router.replace('/access-unavailable');
    if (state === 'paywall') load();
  }, [state, router, load]);

  useEffect(() => {
    if (state !== 'paywall') return;
    const uid = currentUid;
    if (!uid) return;
    let active = true;
    OnboardingService.getStarterPreferences(uid).then(answers => {
      if (active && auth().currentUser?.uid === uid) {
        setStarterPlanState(answers ? { uid, plan: buildStarterPlan(answers) } : null);
      }
    }).catch(() => { if (active) setStarterPlanState(null); });
    return () => { active = false; };
  }, [state, currentUid]);

  const plan = packages.find((item) => item.identifier === selected);
  const annual = packages.find((item) => item.packageType === 'ANNUAL');
  const monthly = packages.find((item) => item.packageType === 'MONTHLY');
  const savings = annualSavingsPercent(
    annual ? { price: annual.product.price, currencyCode: annual.product.currencyCode, hasIntroOffer: !!annual.product.introPrice } : null,
    monthly ? { price: monthly.product.price, currencyCode: monthly.product.currencyCode, hasIntroOffer: !!monthly.product.introPrice } : null
  );

  async function purchase() {
    if (!plan || busy) return;
    setBusy(true);
    setError(null);
    try {
      await SubscriptionService.purchasePlan(plan.identifier);
      await refresh();
    } catch (cause: any) {
      if (cause?.userCancelled || String(cause?.message).toLowerCase().includes('cancelled')) return;
      if (String(cause?.message).includes('Membership verification is temporarily unavailable')) {
        await refresh();
        return;
      }
      setError(cause instanceof Error ? cause.message : 'Could not complete purchase.');
    } finally { setBusy(false); }
  }

  async function restore() {
    if (busy) return;
    setBusy(true);
    try {
      const active = await SubscriptionService.restorePurchases();
      await refresh();
      if (!active) Alert.alert('No active membership', 'No active subscription was found for this store account.');
    } catch {
      await refresh();
      Alert.alert('Restore unavailable', 'Check that this device has access to the App Store or Google Play and try again.');
    }
    finally { setBusy(false); }
  }

  async function switchAccount() {
    if (busy) return;
    setBusy(true);
    setSwitchAccountError(null);
    try { await signOut(); }
    catch { setSwitchAccountError('Could not switch accounts. Please try again.'); }
    finally { setBusy(false); }
  }

  if (state === 'loading' || state === 'checking') return <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ImageBackground source={localImages.paywallStillLife} style={[styles.hero, { paddingTop: insets.top + 12 }]} resizeMode="cover">
          <LinearGradient colors={['rgba(17,34,25,0.89)', 'rgba(17,34,25,0.34)', 'rgba(17,34,25,0.05)']} style={styles.heroShade}>
            <Text style={styles.brand}>ASMR BEAUTY  /  YOUR PRIVATE RITUAL</Text>
            <Text style={styles.headline}>A small ritual. A place to return.</Text>
            <Text style={styles.heroCopy}>Your plan is ready. Make it part of your actual day.</Text>
          </LinearGradient>
        </ImageBackground>
        <View style={styles.body}>
          {starterPlan && <View style={styles.yourPlan}>
            <Text style={styles.yourPlanEyebrow}>THIS IS WHAT YOU MADE</Text>
            <Text style={styles.yourPlanTitle}>{starterPlan.ritualName}</Text>
            <Text style={styles.yourPlanCopy}>{starterPlan.personalInsight}</Text>
            <View style={styles.planPreviewRow}>
              <View style={styles.planPreview}><Ionicons name="sunny-outline" size={18} color={colors.goldDark} /><Text style={styles.planPreviewLabel}>MORNING</Text><Text style={styles.planPreviewText}>{starterPlan.steps.filter(step => step.period === 'morning').map(step => step.name).join(' · ')}</Text></View>
              <View style={styles.planPreview}><Ionicons name="moon-outline" size={18} color={colors.goldDark} /><Text style={styles.planPreviewLabel}>EVENING</Text><Text style={styles.planPreviewText}>{starterPlan.steps.filter(step => step.period === 'evening').map(step => step.name).join(' · ')}</Text></View>
            </View>
            <View style={styles.weekPromise}><Ionicons name="calendar-outline" size={17} color={colors.primary} /><Text style={styles.weekPromiseText}>Your first-week path is ready to follow inside.</Text></View>
          </View>}
          <Text style={styles.valueLine}>Everything you need to keep showing up for your skin, in one quiet place.</Text>
          <Text style={styles.sectionLabel}>CHOOSE YOUR MEMBERSHIP</Text>
          {loading ? <ActivityIndicator style={{ margin: 25 }} color={colors.primary} /> : packages.map((pkg) => (
            <Pressable key={pkg.identifier} accessibilityRole="radio" accessibilityState={{ selected: selected === pkg.identifier }} accessibilityLabel={`${planTitle(pkg)}, ${pkg.product.priceString} per ${periodLabel(pkg)}${pkg.packageType === 'ANNUAL' && savings !== null ? `, save ${savings} percent compared with monthly` : ''}`} onPress={() => setSelected(pkg.identifier)} style={[styles.plan, selected === pkg.identifier && styles.planSelected]}>
              <View style={[styles.radio, selected === pkg.identifier && styles.radioSelected]}>{selected === pkg.identifier && <View style={styles.radioCenter} />}</View>
              <View style={{ flex: 1 }}><View style={styles.planHeading}><Text style={styles.planTitle}>{planTitle(pkg)}</Text>{pkg.packageType === 'ANNUAL' && savings !== null && <Text style={styles.savings}>SAVE {savings}% VS MONTHLY</Text>}</View><Text style={styles.planCaption}>Billed {pkg.product.priceString} per {periodLabel(pkg)}</Text></View>
              <Text style={styles.price}>{pkg.product.priceString}</Text>
            </Pressable>
          ))}
          {(error || accessError) && <Text style={styles.error}>{error || accessError}</Text>}
          {switchAccountError && <Text accessibilityRole="alert" style={styles.error}>{switchAccountError}</Text>}
          {error && <Pressable onPress={load} style={styles.retry}><Text style={styles.retryText}>Reload plans</Text></Pressable>}
          <Text style={styles.sectionLabel}>WHAT OPENS WHEN YOU JOIN</Text>
          {([
            ['sunny-outline', 'A guide for every step', 'Open your morning or evening ritual and mark each step done.'],
            ['calendar-outline', 'A record you can trust', 'See completed days in your calendar without invented skin scores.'],
            ['cube-outline', 'Your products, your routine', 'Edit steps around what you own and keep products in a private shelf.'],
            ['notifications-outline', 'A gentle nudge', 'Choose local reminders only if they help.']
          ] as const).map(([icon, title, copy]) => (
            <View key={title} style={styles.benefit}>
              <View style={styles.icon}><Ionicons name={icon} size={20} color={colors.primary} /></View>
              <View style={{ flex: 1 }}><Text style={styles.benefitTitle}>{title}</Text><Text style={styles.benefitCopy}>{copy}</Text></View>
            </View>
          ))}
          <Text style={styles.honestNote}>Your plan is cosmetic self-care guidance, based on your answers. It does not diagnose skin or promise a result.</Text>
          <View style={styles.footer}>
            <Pressable onPress={() => router.push('/legal/privacy')}><Text style={styles.footerLink}>Privacy</Text></Pressable>
            <Text style={styles.dot}>·</Text>
            <Pressable onPress={() => router.push('/legal/terms')}><Text style={styles.footerLink}>Terms</Text></Pressable>
            <Text style={styles.dot}>·</Text>
            <Pressable disabled={busy} onPress={switchAccount}><Text style={styles.footerLink}>Switch account</Text></Pressable>
            <Text style={styles.dot}>·</Text>
            <Pressable onPress={() => router.push('/modal/settings')}><Text style={styles.footerLink}>Settings</Text></Pressable>
          </View>
          {email && <Text style={styles.account}>Signed in as {email}</Text>}
        </View>
      </ScrollView>
      <View style={[styles.purchaseDock, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <Pressable disabled={!plan || busy || loading} onPress={purchase} accessibilityRole="button" style={[styles.cta, (!plan || busy || loading) && { opacity: 0.55 }]}>
          {busy ? <ActivityIndicator color="white" /> : <Text style={styles.ctaText}>{plan ? `Join for ${plan.product.priceString} / ${periodLabel(plan)}` : 'Choose a membership'}</Text>}
        </Pressable>
        {plan && <Text style={styles.terms}>Renews at {plan.product.priceString} per {periodLabel(plan)} unless cancelled. The store confirms the final charge before purchase. Cancel in store settings.</Text>}
        <Pressable onPress={restore} disabled={busy} accessibilityRole="button" style={styles.restore}><Text style={styles.restoreText}>Restore purchases</Text></Pressable>
      </View>
      <EditorialStatusBackdrop />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, loading: { flex: 1, justifyContent: 'center', backgroundColor: colors.background }, content: { paddingBottom: 20 },
  hero: { height: 325 }, heroShade: { flex: 1, paddingHorizontal: 24, paddingTop: 30, paddingBottom: 20 },
  brand: { color: '#E7C79C', fontSize: 10, letterSpacing: 2.4, fontWeight: '800', marginBottom: 13 }, headline: { color: 'white', fontSize: 32, lineHeight: 38, fontWeight: '700', maxWidth: 300 },
  heroCopy: { color: '#F3EFE6', fontSize: 14, lineHeight: 20, maxWidth: 275, marginTop: 10 }, body: { paddingHorizontal: 21, paddingTop: 0 },
  valueLine: { color: colors.primary, fontSize: 15, lineHeight: 22, fontWeight: '600', marginTop: 21, marginBottom: 24 },
  sectionLabel: { color: colors.goldDark, fontSize: 10, letterSpacing: 1.7, fontWeight: '800', marginBottom: 12 }, benefit: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 13 },
  icon: { height: 38, width: 38, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 13 }, benefitTitle: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  benefitCopy: { color: colors.textSecondary, lineHeight: 19, fontSize: 12, marginTop: 3 }, plan: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: colors.border, borderRadius: 15, padding: 15, marginBottom: 10 },
  planSelected: { borderColor: colors.primary, borderWidth: 2, backgroundColor: '#F4F7F3' }, radio: { width: 21, height: 21, borderRadius: 11, borderWidth: 1.5, borderColor: colors.textTertiary, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: colors.primary }, radioCenter: { height: 11, width: 11, borderRadius: 6, backgroundColor: colors.primary }, planTitle: { color: colors.textPrimary, fontWeight: '700', fontSize: 14 },
  planHeading: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }, savings: { color: 'white', backgroundColor: colors.primary, fontSize: 9, fontWeight: '800', overflow: 'hidden', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  planCaption: { color: colors.textSecondary, fontSize: 11, marginTop: 3 }, price: { color: colors.primary, fontWeight: '800', fontSize: 17 }, purchaseDock: { backgroundColor: '#FCFBF8', borderTopWidth: 1, borderColor: colors.border, paddingHorizontal: 20, paddingTop: 10 }, cta: { backgroundColor: colors.primary, borderRadius: 16, minHeight: 54, justifyContent: 'center', alignItems: 'center' },
  ctaText: { color: 'white', fontSize: 15, fontWeight: '700' }, terms: { color: colors.textSecondary, fontSize: 10, lineHeight: 14, textAlign: 'center', marginTop: 8 }, restore: { alignItems: 'center', paddingTop: 8, paddingBottom: 2 },
  restoreText: { color: colors.primary, fontSize: 13, fontWeight: '700' }, error: { color: '#A64032', fontSize: 12, lineHeight: 18, marginTop: 8, textAlign: 'center' }, retry: { alignItems: 'center', padding: 9 },
  retryText: { color: colors.primary, fontWeight: '700' }, footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9, marginTop: 4 }, footerLink: { color: colors.textSecondary, fontSize: 12, textDecorationLine: 'underline' },
  dot: { color: colors.textTertiary }, account: { textAlign: 'center', fontSize: 11, color: colors.textTertiary, marginTop: 12 },
  yourPlan: { borderRadius: 20, backgroundColor: '#FBFAF6', borderColor: '#E5E4D9', borderWidth: 1, padding: 19, marginTop: -27 },
  yourPlanEyebrow: { color: colors.goldDark, fontWeight: '800', fontSize: 10, letterSpacing: 1.5 },
  yourPlanTitle: { color: colors.primary, fontSize: 23, lineHeight: 28, fontWeight: '700', marginTop: 7 },
  yourPlanCopy: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 7 }, honestNote: { color: colors.textSecondary, fontSize: 11, lineHeight: 17, marginTop: 8 },
  planPreviewRow: { flexDirection: 'row', gap: 9, marginTop: 17 }, planPreview: { flex: 1, minHeight: 100, borderRadius: 13, backgroundColor: '#EFF2EC', padding: 12 }, planPreviewLabel: { color: colors.goldDark, fontSize: 10, letterSpacing: 1.2, fontWeight: '800', marginTop: 7 }, planPreviewText: { color: colors.primary, fontSize: 12, lineHeight: 17, marginTop: 5 }, weekPromise: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 15 }, weekPromiseText: { flex: 1, color: colors.primary, fontSize: 12, fontWeight: '700', lineHeight: 17 },
  yourPlanHabit: { color: colors.primary, fontSize: 12, lineHeight: 18, marginTop: 10 },
  yourPlanTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 15 },
  yourPlanTag: { color: colors.primary, fontWeight: '800', fontSize: 9, letterSpacing: 0.8, backgroundColor: 'white', overflow: 'hidden', borderRadius: 8, padding: 8 }
});
