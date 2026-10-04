import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  Modal,
  KeyboardAvoidingView,
  TextInput
} from 'react-native';
import Purchases from 'react-native-purchases';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, radii, shadows } from '../../src/theme/tokens';
import { Card } from '../../src/components/Card';
import { SubscriptionService } from '../../src/services/subscription-service';
import { OnboardingService } from '../../src/services/onboarding-machine';
import * as SecureStore from 'expo-secure-store';
import functions from '@react-native-firebase/functions';
import { useAccess } from '../../src/services/access-context';
import auth from '@react-native-firebase/auth';
import { UnsafeLocalCleanupError } from '../../src/services/access-signout';
import { ReminderService, ReminderPreferences, ReminderTime } from '../../src/services/reminder-service';
import { clearLegacyRoutineCheckoffs } from '../../src/services/legacy-routine-cleanup';

// The server may need several minutes to remove a large account. Keep this
// request alive beyond the callable's 300-second limit so the app can receive
// its confirmed result instead of reporting an uncertain timeout at 70 seconds.
const ACCOUNT_DELETION_TIMEOUT_MS = 330_000;

export default function SettingsModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, email, refresh, signOut } = useAccess();

  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [cloudAccountDeleted, setCloudAccountDeleted] = useState(false);
  const [reminders, setReminders] = useState<ReminderPreferences | null>(null);
  const [reminderOwnerUid, setReminderOwnerUid] = useState<string | null>(null);
  const [reminderBusy, setReminderBusy] = useState(false);
  const currentUid = auth().currentUser?.uid ?? null;
  const currentReminders = currentUid && reminderOwnerUid === currentUid ? reminders : null;

  useEffect(() => {
    let active = true;
    setReminders(null);
    setReminderOwnerUid(null);
    if (currentUid) ReminderService.get(currentUid).then(preferences => {
      if (active && auth().currentUser?.uid === currentUid) {
        setReminders(preferences);
        setReminderOwnerUid(currentUid);
      }
    }).catch(() => undefined);
    return () => { active = false; };
  }, [currentUid]);

  const updateReminders = async (enabled: boolean, morning?: ReminderTime, evening?: ReminderTime) => {
    const uid = currentUid;
    if (!uid) return;
    setReminderBusy(true);
    try {
      const next = await ReminderService.configure(uid, enabled, morning, evening);
      if (auth().currentUser?.uid === uid) {
        setReminders(next);
        setReminderOwnerUid(uid);
      }
    } catch (cause) {
      Alert.alert('Could not set reminders', cause instanceof Error ? cause.message : 'Please try again.');
    } finally {
      setReminderBusy(false);
    }
  };

  const chooseTime = (period: 'morning' | 'evening') => {
    if (!currentReminders) return;
    const hours = period === 'morning' ? [7, 8, 9, 10] : [19, 20, 21, 22];
    Alert.alert(`${period === 'morning' ? 'Morning' : 'Evening'} reminder`, 'Choose a time on this device.', [
      ...hours.map(hour => ({
        text: `${hour % 12 || 12}:00 ${hour < 12 ? 'AM' : 'PM'}`,
        onPress: () => updateReminders(currentReminders.enabled,
          period === 'morning' ? { hour, minute: 0 } : currentReminders.morning,
          period === 'evening' ? { hour, minute: 0 } : currentReminders.evening)
      })),
      { text: 'Cancel', style: 'cancel' as const }
    ]);
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const isEntitled = await SubscriptionService.restorePurchases();
      await refresh();
      setIsRestoring(false);
      if (isEntitled) {
        Alert.alert('Membership restored', 'Your active subscription has been verified.');
      } else {
        Alert.alert('Restore Purchases', 'No active subscription found for this Apple ID / Google Play account.');
      }
    } catch {
      setIsRestoring(false);
      Alert.alert('Restore unavailable', 'Check that this device has access to the App Store or Google Play and try again.');
    }
  };

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await signOut();
      router.replace('/account');
    } catch (cause) {
      Alert.alert('Could not sign out', cause instanceof UnsafeLocalCleanupError
        ? cause.message : 'Please try again.');
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleManageMembership = async () => {
    if (state !== 'subscribed') {
      router.push('/modal/paywall');
      return;
    }
    try {
      if (Platform.OS === 'ios') {
        await Purchases.showManageSubscriptions();
      } else {
        const customer = await Purchases.getCustomerInfo();
        if (!customer.managementURL) throw new Error('No store management link is available.');
        await Linking.openURL(customer.managementURL);
      }
    } catch {
      Alert.alert('Manage in your store', 'Open your App Store or Google Play subscription settings to change or cancel this membership.');
    }
  };

  const closeDeleteDialog = () => {
    if (isDeleting) return;
    setDeletePassword('');
    setDeleteError(null);
    setDeleteDialogOpen(false);
  };

  const finishDeletedAccountCleanup = async () => {
    let resetFailed = false;
    try { await OnboardingService.reset(); }
    catch { resetFailed = true; }
    try { await signOut(); }
    catch (cause) {
      if (cause instanceof UnsafeLocalCleanupError) throw cause;
      await auth().signOut();
    }
    if (resetFailed) {
      try { await OnboardingService.reset(); resetFailed = false; }
      catch { /* Personal answers were still quarantined by signOut. */ }
    }
    setCloudAccountDeleted(false);
    setDeleteDialogOpen(false);
    router.replace('/onboarding');
    if (resetFailed) {
      Alert.alert('Account deleted', 'Your cloud account was deleted and you are signed out. Some older data on this device could not be cleared. Contact support for help removing it.');
    }
    // Retired device-only checkoffs are not read by current screens. Erase them
    // after Firebase sign-out so a slow Keychain call cannot hold the session open.
    void clearLegacyRoutineCheckoffs().catch(() => {
      if (!resetFailed) Alert.alert('Account deleted', 'Your cloud account was deleted and you are signed out. Some older data on this device could not be cleared. Contact support for help removing it.');
    });
  };

  const submitAccountDeletion = async () => {
    if (isDeleting || (!cloudAccountDeleted && !deletePassword)) return;
    const enteredPassword = deletePassword;
    setDeletePassword('');
    setDeleteError(null);
    setIsDeleting(true);
    let deletedOnServer = cloudAccountDeleted;
    let cloudRequestStarted = false;
    try {
      if (!deletedOnServer) {
        const user = auth().currentUser;
        if (!user?.email) throw new Error('Sign in with your email and try again.');
        const confirmedUid = user.uid;
        await user.reauthenticateWithCredential(auth.EmailAuthProvider.credential(user.email, enteredPassword));
        await user.getIdToken(true);
        if (auth().currentUser?.uid !== confirmedUid) {
          throw new Error('Account changed while confirming deletion.');
        }
        cloudRequestStarted = true;
        const result = await functions().httpsCallable('deleteUserAccount', {
          timeout: ACCOUNT_DELETION_TIMEOUT_MS
        })();
        if ((result.data as { deleted?: boolean } | undefined)?.deleted !== true) {
          throw new Error('Account deletion could not be confirmed. Please try again.');
        }
        deletedOnServer = true;
        setCloudAccountDeleted(true);
        // Admin deletion can invalidate Firebase Auth before AccessProvider
        // reads the UID for its usual reminder cancellation.
        void ReminderService.disable(confirmedUid).catch(() => undefined);
      }
      await finishDeletedAccountCleanup();
    } catch (cause) {
      const code = typeof cause === 'object' && cause !== null && 'code' in cause
        ? String(cause.code) : '';
      if (deletedOnServer) {
        setDeleteError(cause instanceof UnsafeLocalCleanupError
          ? `Your cloud account was deleted. ${cause.message}`
          : 'Your cloud account was deleted, but device sign-out did not finish. Please retry device cleanup.');
      } else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setDeleteError('That password was not accepted. Check it and try again.');
      } else if (code === 'functions/failed-precondition') {
        setDeleteError('Security confirmation expired. Enter your password again to retry.');
      } else if (cloudRequestStarted) {
        setDeleteError('We could not confirm whether cloud deletion finished. Your account may already be deleted. Try again or contact support.');
      } else {
        setDeleteError(cause instanceof Error && cause.message === 'Sign in with your email and try again.'
          ? cause.message : 'Account deletion could not finish. Please try again or contact support.');
      }
    } finally {
      setDeletePassword('');
      setIsDeleting(false);
    }
  };

  const handleDeleteAccount = () => {
    if (cloudAccountDeleted) { setDeleteDialogOpen(true); return; }
    Alert.alert('Delete your account?', 'This permanently removes your app account and routine records. Cancel any active subscription separately in App Store or Google Play settings.', [
      { text: 'Keep account', style: 'cancel' },
      { text: 'Continue', style: 'destructive', onPress: () => {
        setDeleteError(null);
        setDeletePassword('');
        setDeleteDialogOpen(true);
      } }
    ]);
  };

  const handleClearLocalData = () => {
    Alert.alert('Clear data on this device?', 'This removes onboarding answers and legacy routine checkoffs saved on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear device data', style: 'destructive', onPress: async () => {
          setIsDeleting(true);
          try {
            await clearLegacyRoutineCheckoffs();
            await SecureStore.deleteItemAsync('asmr_latest_skin_scan_v1');
            await OnboardingService.reset();
            Alert.alert('Device data cleared', 'Local onboarding answers and legacy checkoffs were removed. Your cloud routine record remains.', [
              { text: 'Done', onPress: () => router.replace('/onboarding') }
            ]);
          } catch (error) {
            Alert.alert('Could not clear data', 'Please try again.');
          } finally {
            setIsDeleting(false);
          }
        }
      }
    ]);
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
              <Text style={styles.membershipTier}>{state === 'subscribed' ? 'Active membership' : 'Membership required'}</Text>
              <Text style={styles.membershipSub}>{email ?? 'Sign in to manage access'}</Text>
            </View>
            <TouchableOpacity
              style={styles.manageBtn}
              onPress={handleManageMembership}
            >
              <Text style={styles.manageBtnText}>{state === 'subscribed' ? 'Manage' : 'Join'}</Text>
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

        {/* Local daily reminders */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Daily routine reminders</Text>
        </View>

        <Card variant="elevated" style={styles.settingCard}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextWrap}>
              <Text style={styles.toggleTitle}>Morning and evening</Text>
              <Text style={styles.toggleDesc}>
                Two quiet reminders each day, scheduled only on this device.
              </Text>
            </View>
            <Switch
              value={currentReminders?.enabled === true}
              disabled={!currentReminders || reminderBusy}
              onValueChange={enabled => updateReminders(enabled)}
              trackColor={{ false: colors.borderSubtle, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.actionRow} disabled={!currentReminders || reminderBusy} onPress={() => chooseTime('morning')}>
            <Ionicons name="sunny-outline" size={18} color={colors.primary} />
            <Text style={styles.actionRowText}>Morning · {currentReminders ? `${currentReminders.morning.hour % 12 || 12}:00 AM` : '8:00 AM'}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.actionRow} disabled={!currentReminders || reminderBusy} onPress={() => chooseTime('evening')}>
            <Ionicons name="moon-outline" size={18} color={colors.primary} />
            <Text style={styles.actionRowText}>Evening · {currentReminders ? `${currentReminders.evening.hour % 12 || 12}:00 PM` : '9:00 PM'}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
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
            The current routine app does not include affiliate product links. If shopping links are added later, any commission will be disclosed beside them.
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
            onPress={() => router.push('/legal/privacy')}
          >
            <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
            <Text style={styles.actionRowText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => router.push('/legal/terms')}
          >
            <Ionicons name="document-text-outline" size={18} color={colors.primary} />
            <Text style={styles.actionRowText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.actionRow} onPress={() => {
            void Linking.openURL('mailto:jabbarimed2020@gmail.com').catch(() => {
              Alert.alert('Support email', 'Contact us at jabbarimed2020@gmail.com from any email app.');
            });
          }}>
            <Ionicons name="mail-outline" size={18} color={colors.primary} />
            <Text style={styles.actionRowText}>Contact support</Text>
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
            onPress={handleClearLocalData}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={colors.terracotta} style={{ marginRight: 8 }} />
            ) : (
              <Ionicons name="trash-outline" size={20} color={colors.terracotta} style={{ marginRight: 8 }} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.deleteTitle}>Clear data on this device</Text>
              <Text style={styles.deleteDesc}>
                Remove onboarding answers saved on this device. Your account and cloud routine record remain available.
              </Text>
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.deleteRow} onPress={handleDeleteAccount} disabled={isDeleting}>
            <Ionicons name="person-remove-outline" size={20} color={colors.terracotta} style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}><Text style={styles.deleteTitle}>Delete account and cloud data</Text><Text style={styles.deleteDesc}>Permanently erase this app account and its saved routine history.</Text></View>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.actionRow} disabled={isSigningOut} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={18} color={colors.primary} /><Text style={styles.actionRowText}>Sign out</Text>
          </TouchableOpacity>
        </Card>

        <View style={{ height: spacing.huge }} />
      </ScrollView>
      <Modal transparent visible={deleteDialogOpen} animationType="fade" onRequestClose={closeDeleteDialog}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.deleteModalBackdrop}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.deleteModalScrollContent}>
          <View style={styles.deleteModalCard} accessibilityViewIsModal>
            <Text style={styles.deleteModalEyebrow}>ACCOUNT PRIVACY</Text>
            <Text style={styles.deleteModalTitle}>{cloudAccountDeleted ? 'Finish device cleanup.' : 'Confirm it’s you.'}</Text>
            <Text style={styles.deleteModalCopy}>{cloudAccountDeleted
              ? 'Your cloud account has been deleted. Finish clearing this device and signing out.'
              : `Enter the password for ${email ?? 'your account'} before permanently deleting your account and cloud data.`}</Text>
            {!cloudAccountDeleted && <TextInput
              accessibilityLabel="Account password"
              autoCapitalize="none"
              autoComplete="current-password"
              secureTextEntry
              placeholder="Password"
              placeholderTextColor={colors.textTertiary}
              value={deletePassword}
              onChangeText={setDeletePassword}
              style={styles.deletePasswordInput}
            />}
            {deleteError && <Text accessibilityRole="alert" style={styles.deleteModalError}>{deleteError}</Text>}
            <TouchableOpacity
              style={[styles.deleteModalAction, (isDeleting || (!cloudAccountDeleted && !deletePassword)) && styles.deleteModalActionDisabled]}
              disabled={isDeleting || (!cloudAccountDeleted && !deletePassword)}
              onPress={submitAccountDeletion}
              accessibilityRole="button"
            >
              {isDeleting ? <ActivityIndicator color={colors.surface} /> :
                <Text style={styles.deleteModalActionText}>{cloudAccountDeleted ? 'Retry device cleanup' : 'Delete my account'}</Text>}
            </TouchableOpacity>
            {isDeleting && <Text accessibilityRole="alert" style={styles.deleteModalCopy}>
              {cloudAccountDeleted ? 'Clearing this device…' : 'Deleting your cloud account… This may take several minutes.'}
            </Text>}
            <TouchableOpacity style={styles.deleteModalCancel} disabled={isDeleting} onPress={closeDeleteDialog} accessibilityRole="button">
              <Text style={styles.deleteModalCancelText}>{cloudAccountDeleted ? 'Close for now' : 'Keep my account'}</Text>
            </TouchableOpacity>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
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
  },
  deleteModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(19, 36, 28, 0.68)'
  },
  deleteModalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.base
  },
  deleteModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg
  },
  deleteModalEyebrow: {
    ...typography.captionBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.terracotta,
    marginBottom: spacing.xs
  },
  deleteModalTitle: {
    ...typography.title2,
    fontSize: 23,
    color: colors.textPrimary,
    marginBottom: spacing.xs
  },
  deleteModalCopy: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    marginBottom: spacing.md
  },
  deletePasswordInput: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    color: colors.textPrimary,
    marginBottom: spacing.sm
  },
  deleteModalError: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 18,
    color: colors.terracotta,
    marginBottom: spacing.sm
  },
  deleteModalAction: {
    minHeight: 48,
    borderRadius: radii.sm,
    backgroundColor: colors.terracotta,
    alignItems: 'center',
    justifyContent: 'center'
  },
  deleteModalActionDisabled: { opacity: 0.45 },
  deleteModalActionText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.surface
  },
  deleteModalCancel: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xs
  },
  deleteModalCancelText: {
    ...typography.body,
    color: colors.textSecondary
  }
});
