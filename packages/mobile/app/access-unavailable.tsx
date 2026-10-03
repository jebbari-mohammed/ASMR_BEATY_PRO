import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAccess } from '../src/services/access-context';
import { localImages } from '../src/theme/images';
import { colors } from '../src/theme/tokens';
import { UnsafeLocalCleanupError } from '../src/services/access-signout';

export default function AccessUnavailableScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, error, refresh, signOut } = useAccess();
  const [busy, setBusy] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  useEffect(() => {
    if (state === 'subscribed') router.replace('/(tabs)/today');
    else if (state === 'paywall') router.replace('/modal/paywall');
    else if (state === 'signedOut' || state === 'verifyEmail') router.replace('/account');
  }, [state, router]);

  async function retry() {
    if (busy || state === 'checking') return;
    setBusy(true);
    try { await refresh(); }
    finally { setBusy(false); }
  }

  async function switchAccount() {
    if (busy) return;
    setBusy(true);
    setSignOutError(null);
    try { await signOut(); }
    catch (cause) { setSignOutError(cause instanceof UnsafeLocalCleanupError
      ? cause.message : 'Could not switch accounts. Please try again.'); }
    finally { setBusy(false); }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
      <ImageBackground source={localImages.editorialHero} style={[styles.hero, { paddingTop: insets.top }]} resizeMode="cover">
        <View style={styles.heroShade}>
          <Text style={styles.brand}>ASMR BEAUTY  /  MEMBERSHIP</Text>
          <Text style={styles.heroTitle}>Your ritual can wait a moment.</Text>
        </View>
      </ImageBackground>
      <View style={styles.content}>
        <View style={styles.icon}><Ionicons name="cloud-offline-outline" size={25} color={colors.primary} /></View>
        <Text style={styles.eyebrow}>CONNECTION PAUSED</Text>
        <Text style={styles.title}>We couldn't check your membership.</Text>
        <Text style={styles.body}>Your subscription may still be active. Check your connection and try again. You will not be asked to buy another plan while verification is unavailable.</Text>
        {error && <Text style={styles.detail}>{error}</Text>}
        {signOutError && <Text accessibilityRole="alert" style={styles.detail}>{signOutError}</Text>}
        <Pressable accessibilityRole="button" disabled={busy || state === 'checking'} onPress={retry} style={[styles.cta, (busy || state === 'checking') && styles.disabled]}>
          {busy || state === 'checking' ? <ActivityIndicator color="white" /> : <Text style={styles.ctaText}>Try again</Text>}
        </Pressable>
        <Pressable accessibilityRole="button" disabled={busy} onPress={switchAccount} style={styles.secondary}><Text style={styles.secondaryText}>Switch account</Text></Pressable>
        <View style={styles.links}>
          <Pressable onPress={() => router.push('/legal/privacy')}><Text style={styles.link}>Privacy</Text></Pressable>
          <Text style={styles.dot}>·</Text>
          <Pressable onPress={() => router.push('/legal/terms')}><Text style={styles.link}>Terms</Text></Pressable>
        </View>
        <Text style={styles.support}>Need help? jabbarimed2020@gmail.com</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  hero: { height: 355, justifyContent: 'flex-end' },
  heroShade: { backgroundColor: 'rgba(18,35,26,0.67)', padding: 27, paddingBottom: 32 },
  brand: { color: '#E7C79C', fontSize: 10, letterSpacing: 2.4, fontWeight: '800', marginBottom: 14 },
  heroTitle: { color: 'white', fontSize: 34, lineHeight: 39, fontWeight: '700', maxWidth: 300 },
  content: { paddingHorizontal: 27, paddingTop: 32 },
  icon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  eyebrow: { color: colors.goldDark, fontSize: 10, fontWeight: '800', letterSpacing: 1.8 },
  title: { color: colors.primary, fontSize: 27, lineHeight: 32, fontWeight: '700', marginTop: 8 },
  body: { color: colors.textSecondary, fontSize: 15, lineHeight: 22, marginTop: 14 },
  detail: { color: '#A64032', fontSize: 12, lineHeight: 18, marginTop: 16 },
  cta: { minHeight: 55, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, marginTop: 28 },
  disabled: { opacity: 0.6 },
  ctaText: { color: 'white', fontSize: 16, fontWeight: '700' },
  secondary: { alignItems: 'center', padding: 17 },
  secondaryText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 8 },
  link: { color: colors.textSecondary, fontSize: 12, textDecorationLine: 'underline' },
  dot: { color: colors.textTertiary },
  support: { color: colors.textTertiary, fontSize: 12, textAlign: 'center', marginTop: 18 }
});
