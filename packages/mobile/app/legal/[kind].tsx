import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/tokens';

const privacy = [
  ['Contact', 'For privacy questions or requests, email jabbarimed2020@gmail.com.'],
  ['What we collect', 'We use your email and Firebase account ID for sign-in; your onboarding goals, skin feel, sensitivity, available time, routine experience, sunscreen habit, and motivation to shape your starting plan; and routine steps, checkoffs, and shelf entries to provide the service. Completed onboarding answers are copied to your new account profile. Store purchase identifiers and subscription status come from RevenueCat, Apple, or Google. We do not receive your full payment card number. Optional reminder preferences and onboarding completion are stored on your device. App Check uses device signals to help protect the service.'],
  ['Photos and scans', 'The current routine experience does not require or upload a face photo. Any future photo feature will ask before access, explain its use, and provide a deletion path.'],
  ['How we use information', 'We use account, onboarding, and routine data to personalize your starting plan, provide your membership, synchronize your record, support account recovery, and protect the service. We use purchase records to understand subscription performance. We do not sell your personal information or use it for third-party advertising.'],
  ['Service providers', 'Firebase stores account and routine information. RevenueCat verifies membership and provides purchase and subscription analytics. Apple or Google processes store payments. Their systems may process technical data needed to deliver these services.'],
  ['Your choices', 'You can edit your routine and shelf, turn off reminders, request access or correction by email, and delete your account and cloud data in Settings. If deletion fails, contact support. Cancel an active store subscription separately in App Store or Google Play settings.'],
  ['Retention and security', 'We keep account data while the account is active and remove developer-controlled cloud records through the in-app deletion flow. Providers may retain billing, security, or legal records under their own policies and may process data in other countries. We use Firebase authentication, per-user database rules, device attestation, and store-backed entitlement checks. The app is for adults 18 or older.']
];

const terms = [
  ['Who may use the app', 'You must be at least 18 years old. Keep your sign-in credentials secure and use the service lawfully.'],
  ['Membership', 'A paid subscription is required to use the routine app after onboarding. Your plan, localized price, billing period, and any introductory offer are shown by the app store before purchase.'],
  ['Renewal and cancellation', 'Subscriptions renew automatically unless you cancel through your App Store or Google Play account. Uninstalling the app or deleting your account does not cancel a store subscription. Access continues according to the store billing status.'],
  ['Restoring purchases', 'Sign in with the same app account and use Restore Purchases on the membership screen. Store purchases are verified before paid access is granted.'],
  ['Skincare information', 'The routine provides general cosmetic education and habit tracking. It is not medical advice, a diagnosis, or a promise of a skin result. Ask a qualified clinician about persistent or concerning symptoms.'],
  ['Account', 'Keep your login private. You may delete your account in Settings. We may suspend access for misuse or fraudulent payment activity, subject to applicable law.'],
  ['Store terms', 'Apple or Google handles payment, refunds, and subscription management under its applicable terms and local consumer law.'],
  ['Current features and support', 'Membership includes an editable routine, daily checkoffs, a consistency record, a product shelf, and optional reminders. Skin scans, AI coaching, product compatibility scoring, and photo journaling are not part of this release. For support, email jabbarimed2020@gmail.com.']
];

export default function LegalScreen() {
  const { kind } = useLocalSearchParams<{ kind: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isPrivacy = kind === 'privacy';
  const title = isPrivacy ? 'Privacy notice' : 'Membership terms';
  const items = isPrivacy ? privacy : terms;
  return <View style={[styles.screen, { paddingTop: insets.top }]}>
    <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" color={colors.primary} size={22} /><Text style={styles.backText}>Back</Text></Pressable>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>ASMR BEAUTY</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.date}>Last updated October 3, 2026</Text>
      {items.map(([heading, body]) => <View key={heading} style={styles.section}><Text style={styles.heading}>{heading}</Text><Text style={styles.body}>{body}</Text></View>)}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, back: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 9 }, backText: { color: colors.primary, fontWeight: '700' },
  content: { paddingHorizontal: 24, paddingBottom: 45 }, eyebrow: { color: colors.goldDark, fontSize: 10, fontWeight: '800', letterSpacing: 2 }, title: { color: colors.primary, fontSize: 30, fontWeight: '700', marginTop: 8 },
  date: { color: colors.textTertiary, fontSize: 12, marginTop: 7, marginBottom: 20 }, section: { borderTopWidth: 1, borderColor: colors.border, paddingVertical: 17 },
  heading: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' }, body: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 6 }
});
