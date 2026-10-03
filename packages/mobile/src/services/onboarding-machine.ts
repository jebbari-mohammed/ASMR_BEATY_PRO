/**
 * Onboarding State Machine & Persistence Service
 * Value-First Architecture with SecureStore persistence, resume capability, and schema validation.
 */

import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import type { StarterAnswers } from './personalized-starter';
import { UnsafeLocalCleanupError } from './access-signout';
import {
  OnboardingStep,
  OnboardingStateV1,
  OnboardingStateV1Schema,
  PrimaryGoalOption,
  PhotoStorageChoice,
  SkinFeelOption,
  SensitivityLevelOption,
  CurrentActiveOption,
  ExistingRoutineOption,
  ShelfScanChoice,
  DesiredComplexityOption,
  TimeCommitmentOption,
  SunscreenHabitOption,
  BudgetPreferenceOption,
  ProductAvoidanceOption,
  PrimaryMotivationOption
} from '@asmr/shared';

const STORAGE_KEY = 'asmr_onboarding_state_v1';
const COMPLETED_FLAG_KEY = 'asmr_onboarding_completed';
const COMPLETED_FLAG_FILE = `${FileSystem.documentDirectory}onboarding-completed.txt`;
const INSTALL_MARKER_FILE = `${FileSystem.documentDirectory}installation-boundary-v1.txt`;
const PURGE_PENDING_FILE = `${FileSystem.documentDirectory}personal-data-purge-pending.txt`;
const PENDING_ACCOUNT_KEY = 'asmr_onboarding_pending_account_uid';
const LEGACY_SCAN_KEY = 'asmr_latest_skin_scan_v1';
let stateWriteQueue: Promise<void> = Promise.resolve();
let installationBoundary: Promise<void> | null = null;
let purgeRequiredInMemory = false;
let activePersonalDataClear: Promise<void> | null = null;

function queueStateWrite(write: () => Promise<void>): Promise<void> {
  const pending = stateWriteQueue.then(write);
  // A failed write must still reject for its caller, but must not prevent a
  // later choice or reset from reaching storage.
  stateWriteQueue = pending.catch(() => undefined);
  return pending;
}

async function purgePersonalValues(includeLegacyCompletion: boolean): Promise<void> {
  await queueStateWrite(() => SecureStore.deleteItemAsync(STORAGE_KEY));
  await SecureStore.deleteItemAsync(PENDING_ACCOUNT_KEY);
  await SecureStore.deleteItemAsync(LEGACY_SCAN_KEY);
  if (includeLegacyCompletion) await SecureStore.deleteItemAsync(COMPLETED_FLAG_KEY);
}

async function ensureInstallationBoundary(): Promise<void> {
  if (activePersonalDataClear) return activePersonalDataClear;
  if (installationBoundary) return installationBoundary;
  const operation = (async () => {
    const marker = await FileSystem.getInfoAsync(INSTALL_MARKER_FILE);
    const pending = await FileSystem.getInfoAsync(PURGE_PENDING_FILE);
    if (marker.exists && !pending.exists && !purgeRequiredInMemory) return;
    // iOS Keychain entries can survive app removal while documentDirectory
    // does not. A pending sign-out cleanup also blocks reads until it succeeds.
    await purgePersonalValues(!marker.exists);
    if (!marker.exists) await FileSystem.writeAsStringAsync(INSTALL_MARKER_FILE, '1');
    if (pending.exists) await FileSystem.deleteAsync(PURGE_PENDING_FILE, { idempotent: true });
    purgeRequiredInMemory = false;
  })();
  installationBoundary = operation;
  try {
    await operation;
  } finally {
    if (installationBoundary === operation) installationBoundary = null;
  }
}

export const INITIAL_ONBOARDING_STATE: OnboardingStateV1 = {
  version: 1,
  currentStep: 'WELCOME',
  completedSteps: [],
  selectedGoals: [],
  currentActives: [],
  knownReactions: {
    hasKnownReactions: false,
    userReportedAllergies: [],
    userReportedSensitivities: []
  },
  productPreferencesToAvoid: []
};

export function logOnboardingAnalytics(eventName: string, params?: Record<string, any>) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.debug(`[Onboarding] ${eventName}`, params ?? {});
  }
}

export class OnboardingService {
  /** Bind a completed preview to a newly created account, never to a returning sign-in. */
  static async bindNewAccount(uid: string): Promise<void> {
    const state = await this.loadState();
    if (state.currentStep !== 'COMPLETED' || !state.selectedGoals.length) return;
    await SecureStore.setItemAsync(PENDING_ACCOUNT_KEY, uid);
    await this.syncPendingAccount(uid);
  }

  /** Retry when account creation succeeded but the first Firestore write was offline. */
  static async syncPendingAccount(uid: string): Promise<void> {
    await ensureInstallationBoundary();
    if (auth().currentUser?.uid !== uid) return;
    if (await SecureStore.getItemAsync(PENDING_ACCOUNT_KEY) !== uid) return;
    const state = await this.loadState();
    if (state.currentStep !== 'COMPLETED' || !state.selectedGoals.length) {
      await SecureStore.deleteItemAsync(PENDING_ACCOUNT_KEY);
      return;
    }
    const starterPreferences = {
      selectedGoals: state.selectedGoals,
      skinFeelByEndOfDay: state.skinFeelByEndOfDay ?? null,
      sensitivityLevel: state.sensitivityLevel ?? null,
      timeCommitment: state.timeCommitment ?? null,
      desiredComplexity: state.desiredComplexity ?? null,
      existingRoutineTier: state.existingRoutineTier ?? null,
      sunscreenHabit: state.sunscreenHabit ?? null,
      primaryMotivation: state.primaryMotivation ?? null
    };
    await firestore().collection('users').doc(uid).set({ starterPreferences }, { merge: true });
    // The cloud profile now owns these answers. Leaving a device-global copy
    // would let a later account created on this phone inherit them.
    await this.clearDevicePersonalData();
  }

  /** Remove device-global personal values without resetting the onboarding completion flag. */
  static async clearDevicePersonalData(): Promise<void> {
    if (activePersonalDataClear) return activePersonalDataClear;
    const operation = (async () => {
      try { await ensureInstallationBoundary(); }
      catch { throw new UnsafeLocalCleanupError('Device data could not be secured. Please try signing out again.'); }
      purgeRequiredInMemory = true;
      // Record cleanup intent outside Keychain before any deletion. If a Keychain
      // operation fails, later reads retry and return no old answers meanwhile.
      let guardPersisted = false;
      let pendingMarkerWritten = false;
      try {
        await FileSystem.writeAsStringAsync(PURGE_PENDING_FILE, '1');
        guardPersisted = true;
        pendingMarkerWritten = true;
      } catch {
        // An absent installation marker is a second durable fail-closed signal.
        try {
          await FileSystem.deleteAsync(INSTALL_MARKER_FILE, { idempotent: true });
          guardPersisted = true;
        } catch { /* Continue trying to erase Keychain data. */ }
      }
      try {
        await purgePersonalValues(false);
      } catch (cause) {
        if (!guardPersisted) {
          throw new UnsafeLocalCleanupError('Device data could not be secured. Please try signing out again.');
        }
        throw cause;
      }
      if (pendingMarkerWritten) await FileSystem.deleteAsync(PURGE_PENDING_FILE, { idempotent: true });
      // If the fallback removed the install marker, recreate it only after purge.
      await FileSystem.writeAsStringAsync(INSTALL_MARKER_FILE, '1');
      purgeRequiredInMemory = false;
    })();
    activePersonalDataClear = operation;
    try {
      await operation;
    } finally {
      if (activePersonalDataClear === operation) activePersonalDataClear = null;
    }
  }

  static async getStarterPreferences(uid: string): Promise<StarterAnswers | null> {
    const profile = await firestore().collection('users').doc(uid).get();
    const saved = profile.data()?.starterPreferences as Partial<StarterAnswers> | undefined;
    if (!saved || !Array.isArray(saved.selectedGoals) || saved.selectedGoals.length < 1 || saved.selectedGoals.length > 2 || !saved.selectedGoals.every(value => typeof value === 'string')) return null;
    return {
      selectedGoals: saved.selectedGoals,
      skinFeelByEndOfDay: saved.skinFeelByEndOfDay ?? undefined,
      sensitivityLevel: saved.sensitivityLevel ?? undefined,
      timeCommitment: saved.timeCommitment ?? undefined,
      desiredComplexity: saved.desiredComplexity ?? undefined,
      existingRoutineTier: saved.existingRoutineTier ?? undefined,
      sunscreenHabit: saved.sunscreenHabit ?? undefined,
      primaryMotivation: saved.primaryMotivation ?? undefined
    };
  }
  /**
   * Load saved onboarding state or return fresh initial state
   */
  static async loadState(): Promise<OnboardingStateV1> {
    try {
      if (activePersonalDataClear) return INITIAL_ONBOARDING_STATE;
      await ensureInstallationBoundary();
      await stateWriteQueue;
      if (activePersonalDataClear) return INITIAL_ONBOARDING_STATE;
      const raw = await SecureStore.getItemAsync(STORAGE_KEY);
      if (!raw) return INITIAL_ONBOARDING_STATE;
      const parsed = JSON.parse(raw);
      const validated = OnboardingStateV1Schema.safeParse(parsed);
      if (validated.success) {
        const saved = validated.data as unknown as OnboardingStateV1;
        if (saved.currentStep === 'SHELF_CAPTURE_PROMPT') {
          const migrated = { ...saved, currentStep: 'DESIRED_COMPLEXITY' as OnboardingStep };
          await this.saveState(migrated);
          return migrated;
        }
        const unavailableSteps: OnboardingStep[] = [
          'SNAPSHOT_EXPLAINER', 'PHOTO_PRIVACY', 'GUIDED_SCAN',
          'PRE_PAYWALL_READY', 'HARD_PAYWALL', 'PROCESSING_SCAN', 'WOW_SNAPSHOT'
        ];
        if (unavailableSteps.includes(saved.currentStep)) {
          const migrated = {
            ...saved,
            currentStep: 'SKIN_FEEL' as OnboardingStep,
            completedSteps: saved.completedSteps.filter(step => !unavailableSteps.includes(step))
          };
          await this.saveState(migrated);
          return migrated;
        }
        return saved;
      }
      return INITIAL_ONBOARDING_STATE;
    } catch (e) {
      console.warn('[OnboardingService] Failed to load state:', e);
      return INITIAL_ONBOARDING_STATE;
    }
  }

  /**
   * Persist onboarding state to SecureStore
   */
  static async saveState(state: OnboardingStateV1): Promise<void> {
    try {
      if (activePersonalDataClear) throw new Error('Device cleanup is in progress.');
      await ensureInstallationBoundary();
      if (activePersonalDataClear) throw new Error('Device cleanup is in progress.');
      const serialized = JSON.stringify(state);
      await queueStateWrite(() => SecureStore.setItemAsync(STORAGE_KEY, serialized));
    } catch (e) {
      console.warn('[OnboardingService] Failed to save state:', e);
      throw e;
    }
  }

  /**
   * Check if onboarding has been completed
   */
  static async isCompleted(): Promise<boolean> {
    try {
      await ensureInstallationBoundary();
      const file = await FileSystem.getInfoAsync(COMPLETED_FLAG_FILE);
      if (file.exists) return (await FileSystem.readAsStringAsync(COMPLETED_FLAG_FILE)) === 'true';
      // Keep existing installs that stored the flag in Keychain working.
      const val = await SecureStore.getItemAsync(COMPLETED_FLAG_KEY);
      return val === 'true';
    } catch (e) {
      return false;
    }
  }

  /**
   * Mark onboarding as completed
   */
  static async markCompleted(): Promise<void> {
    await ensureInstallationBoundary();
    // This flag contains no sensitive information and should not depend on
    // Keychain availability to let a user finish onboarding.
    await FileSystem.writeAsStringAsync(COMPLETED_FLAG_FILE, 'true');
    logOnboardingAnalytics('onboarding_finished');
  }

  /**
   * Reset onboarding for testing
   */
  static async reset(): Promise<void> {
    await ensureInstallationBoundary();
    await queueStateWrite(() => SecureStore.deleteItemAsync(STORAGE_KEY));
    await SecureStore.deleteItemAsync(COMPLETED_FLAG_KEY);
    await SecureStore.deleteItemAsync(PENDING_ACCOUNT_KEY);
    await FileSystem.deleteAsync(COMPLETED_FLAG_FILE, { idempotent: true });
    logOnboardingAnalytics('onboarding_reset');
  }
}
