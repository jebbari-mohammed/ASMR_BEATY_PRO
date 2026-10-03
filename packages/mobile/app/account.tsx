import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ImageBackground, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import auth from '@react-native-firebase/auth';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { localImages } from '../src/theme/images';
import { colors } from '../src/theme/tokens';
import { useAccess } from '../src/services/access-context';
import { EditorialStatusBackdrop } from '../src/components/EditorialStatusBackdrop';
import { OnboardingService } from '../src/services/onboarding-machine';

export default function AccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, refresh, signOut } = useAccess();
  const [mode, setMode] = useState<'signIn' | 'create'>('create');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  function revealForm() {
    // The editorial hero otherwise leaves the inputs behind the Android keyboard.
    setTimeout(() => scrollRef.current?.scrollTo({ y: 320, animated: true }), 180);
  }

  useEffect(() => {
    if (state === 'subscribed') router.replace('/(tabs)/today');
    else if (state === 'paywall') router.replace('/modal/paywall');
    else if (state === 'unavailable') router.replace('/access-unavailable');
  }, [state, router]);

  useEffect(() => {
    if (state !== 'signedOut' && state !== 'loading' && state !== 'checking') setPassword('');
  }, [state]);

  async function submit() {
    const address = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(address)) { setMessage('Enter a valid email address.'); return; }
    if (password.length < 8) { setMessage('Use a password with at least 8 characters.'); return; }
    setBusy(true);
    setMessage(null);
    try {
      if (mode === 'create') {
        const created = await auth().createUserWithEmailAndPassword(address, password);
        // Account creation must remain usable offline; a pending plan sync retries
        // when the user verifies their email or opens the paid routine.
        await OnboardingService.bindNewAccount(created.user.uid).catch(() => undefined);
        await created.user.sendEmailVerification().catch(() => setMessage('Account created. Use Resend verification if no email arrives.'));
      } else await auth().signInWithEmailAndPassword(address, password);
      await refresh();
    } catch (cause: any) {
      const code = String(cause?.code ?? '');
      setMessage(code.includes('email-already-in-use') ? 'This email already has an account. Sign in instead.' :
        code.includes('invalid-credential') || code.includes('wrong-password') ? 'Email or password was incorrect.' :
        code.includes('weak-password') ? 'Choose a stronger password.' : 'Account access is unavailable. Please try again.');
    } finally { setBusy(false); }
  }

  async function resetPassword() {
    const address = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(address)) { setMessage('Enter your email first, then tap reset password.'); return; }
    try {
      await auth().sendPasswordResetEmail(address);
      Alert.alert('Check your inbox', 'If this email has an account, a reset link is on its way.');
    } catch {
      Alert.alert('Reset unavailable', 'Please try again in a moment.');
    }
  }

  async function checkVerification() {
    setBusy(true);
    setMessage(null);
    try {
      const user = auth().currentUser;
      if (!user) { await refresh(); return; }
      await user.reload();
      if (auth().currentUser?.emailVerified) {
        await auth().currentUser?.getIdToken(true);
        await OnboardingService.syncPendingAccount(user.uid).catch(() => undefined);
        await refresh();
      } else setMessage('Your email is not verified yet. Open the link in your inbox, then try again.');
    } catch { setMessage('Could not check verification. Please try again.'); }
    finally { setBusy(false); }
  }

  async function resendVerification() {
    try {
      await auth().currentUser?.sendEmailVerification();
      Alert.alert('Email sent', 'Check your inbox and spam folder for the verification link.');
    } catch { Alert.alert('Could not send email', 'Please wait a moment and try again.'); }
  }

  async function switchAccount() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try { await signOut(); setEmail(''); setPassword(''); }
    catch { setMessage('Could not switch accounts. Please try again.'); }
    finally { setBusy(false); }
  }

  if (state === 'verifyEmail') return <View style={[styles.screen, { paddingTop: insets.top }]}>
    <ScrollView contentContainerStyle={[styles.verifyContent, { paddingBottom: insets.bottom + 30 }]}>
      <View style={styles.verifyIcon}><Text style={styles.verifyIconText}>✉</Text></View>
      <Text style={styles.eyebrow}>ONE MORE STEP</Text>
      <Text style={styles.verifyTitle}>Verify your email.</Text>
      <Text style={styles.verifyCopy}>We sent a link to {auth().currentUser?.email}. Confirm your address before choosing a membership so your account and purchases stay together.</Text>
      {message && <Text style={styles.error}>{message}</Text>}
      <Pressable disabled={busy} onPress={checkVerification} style={styles.cta}>{busy ? <ActivityIndicator color="white" /> : <Text style={styles.ctaText}>I verified my email</Text>}</Pressable>
      <Pressable onPress={resendVerification} style={styles.linkButton}><Text style={styles.link}>Resend verification email</Text></Pressable>
      <Pressable disabled={busy} onPress={switchAccount} style={styles.linkButton}><Text style={styles.secondaryLink}>Use another account</Text></Pressable>
    </ScrollView>
  </View>;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
        <ImageBackground source={localImages.editorialHero} resizeMode="cover" style={styles.hero}>
          <View style={styles.heroOverlay}>
            <Text style={styles.brand}>ASMR BEAUTY</Text>
            <Text style={styles.heroTitle}>A calmer ritual starts here.</Text>
          </View>
        </ImageBackground>
        <View style={styles.form}>
          <Text style={styles.eyebrow}>YOUR PRIVATE SPACE</Text>
          <Text style={styles.title}>{mode === 'create' ? 'Create your account' : 'Welcome back'}</Text>
          <Text style={styles.subtitle}>Save your routine and membership securely across devices.</Text>
          <TextInput accessibilityLabel="Email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="Email address" placeholderTextColor={colors.textTertiary} value={email} onChangeText={setEmail} onFocus={revealForm} style={styles.input} />
          <TextInput accessibilityLabel="Password" autoCapitalize="none" autoComplete={mode === 'create' ? 'new-password' : 'current-password'} secureTextEntry placeholder="Password" placeholderTextColor={colors.textTertiary} value={password} onChangeText={setPassword} onFocus={revealForm} style={styles.input} />
          {message && <Text style={styles.error}>{message}</Text>}
          <Pressable disabled={busy} onPress={submit} style={[styles.cta, busy && { opacity: 0.6 }]}>
            {busy ? <ActivityIndicator color="white" /> : <Text style={styles.ctaText}>{mode === 'create' ? 'Continue' : 'Sign in'}</Text>}
          </Pressable>
          <Pressable onPress={() => { setMode(mode === 'create' ? 'signIn' : 'create'); setMessage(null); }} style={styles.linkButton}>
            <Text style={styles.link}>{mode === 'create' ? 'Already have an account? Sign in' : 'New here? Create an account'}</Text>
          </Pressable>
          {mode === 'signIn' && <Pressable onPress={resetPassword} style={styles.linkButton}><Text style={styles.secondaryLink}>Reset password</Text></Pressable>}
          <Text style={styles.privacy}>Your photos are never required to create an account. We use your account to keep purchases and routine records together.</Text>
          <View style={styles.legalLinks}><Pressable onPress={() => router.push('/legal/privacy')}><Text style={styles.secondaryLink}>Privacy</Text></Pressable><Text style={styles.secondaryLink}>·</Text><Pressable onPress={() => router.push('/legal/terms')}><Text style={styles.secondaryLink}>Terms</Text></Pressable></View>
        </View>
      </ScrollView>
      <EditorialStatusBackdrop />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  hero: { height: 320, justifyContent: 'flex-end' },
  heroOverlay: { padding: 26, paddingBottom: 34, backgroundColor: 'rgba(19,30,24,0.46)' },
  brand: { color: '#F0D3A9', fontSize: 11, fontWeight: '800', letterSpacing: 2.5, marginBottom: 14 },
  heroTitle: { color: 'white', fontSize: 32, lineHeight: 37, fontWeight: '700', maxWidth: 280 },
  form: { paddingHorizontal: 25, paddingTop: 30 },
  eyebrow: { color: colors.goldDark, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  title: { color: colors.primary, fontSize: 27, fontWeight: '700', marginTop: 7 },
  subtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 6, marginBottom: 23 },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: colors.border, borderRadius: 14, minHeight: 54, marginBottom: 12, paddingHorizontal: 16, fontSize: 16, color: colors.textPrimary },
  error: { color: '#A64032', marginBottom: 10, lineHeight: 19 },
  cta: { backgroundColor: colors.primary, borderRadius: 15, minHeight: 55, justifyContent: 'center', alignItems: 'center', marginTop: 5 },
  ctaText: { color: 'white', fontSize: 16, fontWeight: '700' },
  linkButton: { padding: 11, alignItems: 'center' },
  link: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  secondaryLink: { color: colors.textSecondary, fontSize: 13 },
  privacy: { fontSize: 12, color: colors.textTertiary, lineHeight: 18, textAlign: 'center', marginTop: 15 },
  legalLinks: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 15 },
  verifyContent: { paddingHorizontal: 27, paddingTop: 80 }, verifyIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.primarySoft, justifyContent: 'center', alignItems: 'center', marginBottom: 25 }, verifyIconText: { color: colors.primary, fontSize: 31 },
  verifyTitle: { color: colors.primary, fontSize: 34, lineHeight: 39, fontWeight: '700', marginTop: 10 }, verifyCopy: { color: colors.textSecondary, fontSize: 15, lineHeight: 23, marginTop: 13, marginBottom: 22 }
});
