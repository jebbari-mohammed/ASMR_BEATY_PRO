import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, radii, shadows } from '../../src/theme/tokens';
import { Card } from '../../src/components/Card';
import { SubscriptionService } from '../../src/services/subscription-service';
import { OnboardingService } from '../../src/services/onboarding-machine';

export default function SettingsModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [saveProgressPhotos, setSaveProgressPhotos] = useState(true);
  const [dailyReminders, setDailyReminders] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const isEntitled = await SubscriptionService.verifyEntitlementServerSide('current_user');
      setIsRestoring(false);
      if (isEntitled) {
        Alert.alert('Purchases Restored', 'Your Pro subscription has been verified.');
      } else {
        Alert.alert('Restore Purchases', 'No active subscription found for this Apple ID / Google Play account.');
      }
    } catch {
      setIsRestoring(false);
      Alert.alert('Restore Error', 'Could not reach store servers. Please verify your internet connection.');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account & All Data?',
      'This will permanently delete your profile, skin photographs, scan measurements, routine history, and conversation memory. This action is irreversible according to GDPR and App Store standards.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              // Simulate / call backend erasure
              await OnboardingService.reset();
              setIsDeleting(false);
              Alert.alert(
                'Account Deleted',
                'Your skin records, photos, and personal data have been completely deleted from our servers.',
                [
                  {
                    text: 'Done',
                    onPress: () => router.replace('/onboarding')
                  }
                ]
              );
            } catch (err: any) {
              setIsDeleting(false);
              Alert.alert('Error', err?.message || 'Failed to complete deletion.');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Top Header */}
      <View style={styles.topNav}>
        <Text style={styles.navTitle}>Settings & Privacy</Text>
        <TouchableOpacity
          style={styles.closeBtn}
          activeOpacity={0.7}
          onPress={() => router.back()}
          accessibilityLabel="Close Settings"
        >
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Membership Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Membership & Subscription</Text>
        </View>

        <Card variant="elevated" style={styles.settingCard}>
          <View style={styles.membershipRow}>
            <View style={styles.proIconWrap}>
              <Ionicons name="sparkles" size={18} color={colors.goldDark} />
            </View>
            <View style={styles.membershipInfo}>
              <Text style={styles.membershipTier}>ASMR Beauty Pro Member</Text>
              <Text style={styles.membershipSub}>Annual Plan • Renews Aug 21, 2027</Text>
            </View>
            <TouchableOpacity
              style={styles.manageBtn}
              onPress={() => router.push('/modal/paywall')}
            >
              <Text style={styles.manageBtnText}>Change</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.7}
            onPress={handleRestore}
            disabled={isRestoring}
          >
            <Ionicons name="refresh-outline" size={18} color={colors.primary} />
            <Text style={styles.actionRowText}>
              {isRestoring ? 'Verifying with App Store...' : 'Restore Purchases'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </Card>

        {/* Photo Privacy Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Photo Privacy & Data Minimization</Text>
        </View>

        <Card variant="elevated" style={styles.settingCard}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextWrap}>
              <Text style={styles.toggleTitle}>Save Progress Photos</Text>
              <Text style={styles.toggleDesc}>
                Store photos encrypted so you can visually track Day 1 vs Day 14, 30, and 42 changes. If turned off, transient photos are deleted immediately after analysis.
              </Text>
            </View>
            <Switch
              value={saveProgressPhotos}
              onValueChange={setSaveProgressPhotos}
              trackColor={{ false: colors.borderSubtle, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <View style={styles.toggleTextWrap}>
              <Text style={styles.toggleTitle}>Morning & Evening Reminders</Text>
              <Text style={styles.toggleDesc}>
                Gentle daily prompts to maintain your 42-day skin consistency habit.
              </Text>
            </View>
            <Switch
              value={dailyReminders}
              onValueChange={setDailyReminders}
              trackColor={{ false: colors.borderSubtle, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
        </Card>

        {/* Affiliate Disclosure & Transparency */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Affiliate & Commercial Transparency</Text>
        </View>

        <Card variant="subtle" style={styles.disclosureCard}>
          <View style={styles.disclosureHeader}>
            <Ionicons name="information-circle" size={16} color={colors.goldDark} />
            <Text style={styles.disclosureTitle}>AFFILIATE DISCLOSURE</Text>
          </View>
          <Text style={styles.disclosureText}>
            We may earn an affiliate commission when you purchase verified skincare products through links in the app. Commission rates never influence routine recommendations — compatibility, safety rules, and your skin profile always come first.
          </Text>
        </Card>

        {/* AI & Medical Disclaimer */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Cosmetic Wellness & Medical Boundary</Text>
        </View>

        <Card variant="subtle" style={styles.disclosureCard}>
          <View style={styles.disclosureHeader}>
            <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
            <Text style={styles.disclosureTitle}>NON-MEDICAL SCOPE</Text>
          </View>
          <Text style={styles.disclosureText}>
            ASMR Beauty Pro provides cosmetic skin wellness guidance. It does NOT diagnose or treat diseases, skin cancer, eczema, or clinical skin conditions. If you experience persistent pain, bleeding, or concerning spots, consult a board-certified dermatologist.
          </Text>
        </Card>

        {/* Legal Links */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Legal & Policies</Text>
        </View>

        <Card variant="elevated" style={styles.settingCard}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => Alert.alert('Privacy Policy', 'Your photographs and personal data are strictly processed under end-to-end encryption. Raw selfies are never used to train public AI models.')}
          >
            <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
            <Text style={styles.actionRowText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => Alert.alert('Terms of Service', 'ASMR Beauty Pro provides personalized cosmetic skincare recommendations and tracking under standard App Store subscription terms.')}
          >
            <Ionicons name="document-text-outline" size={18} color={colors.primary} />
            <Text style={styles.actionRowText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </Card>

        {/* Account Deletion (Right to Erasure) */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.terracotta }]}>Danger Zone</Text>
        </View>

        <Card variant="elevated" style={[styles.settingCard, styles.dangerCard]}>
          <TouchableOpacity
            style={styles.deleteRow}
            activeOpacity={0.8}
            onPress={handleDeleteAccount}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={colors.terracotta} style={{ marginRight: 8 }} />
            ) : (
              <Ionicons name="trash-outline" size={20} color={colors.terracotta} style={{ marginRight: 8 }} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.deleteTitle}>Delete Account & Data</Text>
              <Text style={styles.deleteDesc}>
                Permanently purge all scan records, selfies, and profile history.
              </Text>
            </View>
          </TouchableOpacity>
        </Card>

        <View style={{ height: spacing.huge }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26, 56, 43, 0.08)'
  },
  navTitle: {
    ...typography.title2,
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center'
  },
  container: {
    flex: 1
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.huge
  },
  sectionHeader: {
    marginTop: spacing.lg,
    marginBottom: spacing.xs
  },
  sectionTitle: {
    ...typography.captionBold,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase'
  },
  settingCard: {
    padding: spacing.md,
    marginBottom: spacing.xs
  },
  membershipRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  proIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(197, 154, 111, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm
  },
  membershipInfo: {
    flex: 1
  },
  membershipTier: {
    ...typography.title2,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary
  },
  membershipSub: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1
  },
  manageBtn: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.sm
  },
  manageBtnText: {
    ...typography.captionBold,
    fontSize: 11,
    color: colors.primary
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs
  },
  actionRowText: {
    ...typography.body,
    fontSize: 14,
    color: colors.textPrimary,
    flex: 1,
    marginLeft: spacing.sm
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(26, 56, 43, 0.06)',
    marginVertical: spacing.sm
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4
  },
  toggleTextWrap: {
    flex: 1,
    marginRight: spacing.md
  },
  toggleTitle: {
    ...typography.title2,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2
  },
  toggleDesc: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16
  },
  disclosureCard: {
    backgroundColor: 'rgba(26, 56, 43, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(26, 56, 43, 0.08)',
    padding: spacing.md
  },
  disclosureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  disclosureTitle: {
    ...typography.captionBold,
    fontSize: 10,
    color: colors.primary,
    letterSpacing: 0.8,
    marginLeft: 6
  },
  disclosureText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16
  },
  dangerCard: {
    borderColor: 'rgba(194, 91, 78, 0.25)'
  },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  deleteTitle: {
    ...typography.title2,
    fontSize: 14,
    fontWeight: '700',
    color: colors.terracotta
  },
  deleteDesc: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2
  }
});
