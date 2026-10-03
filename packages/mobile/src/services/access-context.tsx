import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import auth from '@react-native-firebase/auth';
import appCheck from '@react-native-firebase/app-check';
import { SubscriptionService } from './subscription-service';
import { ReminderService } from './reminder-service';
import { OnboardingService } from './onboarding-machine';

type AccessState = 'loading' | 'signedOut' | 'verifyEmail' | 'checking' | 'subscribed' | 'paywall' | 'unavailable';
type AccessContextValue = {
  state: AccessState;
  revalidating: boolean;
  email: string | null;
  error: string | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AccessContext = createContext<AccessContextValue | null>(null);

export function AccessProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AccessState>('loading');
  const [revalidating, setRevalidating] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refreshId = useRef(0);
  const verifiedUid = useRef<string | null>(null);
  const pendingAutomaticRefresh = useRef<{ uid: string | null; promise: Promise<void> } | null>(null);
  const lastForegroundRefresh = useRef(0);

  const runRefresh = useCallback((automatic: boolean): Promise<void> => {
    const uid = auth().currentUser?.uid ?? null;
    if (automatic && pendingAutomaticRefresh.current?.uid === uid) {
      return pendingAutomaticRefresh.current.promise;
    }
    if (!automatic) pendingAutomaticRefresh.current = null;
    const thisRefresh = ++refreshId.current;
    const task = (async () => {
      const user = auth().currentUser;
      if (!user) {
        verifiedUid.current = null;
        setRevalidating(false);
        setEmail(null);
        setError(null);
        setState('signedOut');
        return;
      }
      setEmail(user.email);
      if (!user.emailVerified) {
        verifiedUid.current = null;
        setRevalidating(false);
        setError(null);
        setState('verifyEmail');
        return;
      }

      // Keep already mounted screens in place during a foreground check, but
      // the tab layout blocks their controls until this server check finishes.
      if (verifiedUid.current === user.uid) setRevalidating(true);
      else {
        setRevalidating(false);
        setState('checking');
      }
      try {
        await SubscriptionService.initialize(user.uid);
        const active = await SubscriptionService.hasActiveEntitlement();
        if (thisRefresh !== refreshId.current || auth().currentUser?.uid !== user.uid) return;
        verifiedUid.current = active ? user.uid : null;
        setError(null);
        setState(active ? 'subscribed' : 'paywall');
      } catch (cause) {
        if (thisRefresh !== refreshId.current || auth().currentUser?.uid !== user.uid) return;
        verifiedUid.current = null;
        setError(cause instanceof Error ? cause.message : 'Could not verify membership.');
        setState('unavailable');
      } finally {
        if (thisRefresh === refreshId.current) setRevalidating(false);
      }
    })();

    if (automatic) {
      pendingAutomaticRefresh.current = { uid, promise: task };
      void task.finally(() => {
        if (pendingAutomaticRefresh.current?.promise === task) pendingAutomaticRefresh.current = null;
      });
    }
    return task;
  }, []);

  // Explicit refreshes after purchase, restore, or email verification must not
  // reuse a verification that started before those actions finished.
  const refresh = useCallback(() => runRefresh(false), [runRefresh]);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: () => void = () => {};
    let appCheckReady = false;
    let returnedFromBackground = AppState.currentState === 'background';
    async function bootstrap() {
      try {
        const provider = appCheck().newReactNativeFirebaseAppCheckProvider();
        provider.configure({
          apple: { provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback' },
          android: { provider: __DEV__ ? 'debug' : 'playIntegrity' },
          isTokenAutoRefreshEnabled: true
        });
        await appCheck().initializeAppCheck({ provider, isTokenAutoRefreshEnabled: true });
      } catch (cause) {
        if (mounted) setError('Device verification could not start. Check your connection and try again.');
      }
      if (!mounted) return;
      appCheckReady = true;
      unsubscribe = auth().onAuthStateChanged(() => {
        if (mounted) void runRefresh(true);
      });
      lastForegroundRefresh.current = Date.now();
      void runRefresh(true);
    }
    const foreground = AppState.addEventListener('change', status => {
      if (status === 'background') {
        returnedFromBackground = true;
        return;
      }
      if (status !== 'active') return;
      const resumed = returnedFromBackground;
      returnedFromBackground = false;
      if (!mounted || !appCheckReady) return;
      const now = Date.now();
      // Always recheck after a real background return. A cooldown only filters
      // duplicate active/inactive events that did not put the app in background.
      if (!resumed && now - lastForegroundRefresh.current < 10_000) return;
      lastForegroundRefresh.current = now;
      // A check started before the app was backgrounded cannot prove access
      // when it returns. Supersede it after a real background transition.
      void runRefresh(!resumed);
    });
    void bootstrap();
    return () => {
      mounted = false;
      unsubscribe();
      foreground.remove();
    };
  }, [runRefresh]);

  const signOut = useCallback(async () => {
    ++refreshId.current;
    verifiedUid.current = null;
    pendingAutomaticRefresh.current = null;
    setRevalidating(false);
    setState('loading');
    const uid = auth().currentUser?.uid;
    if (uid) await ReminderService.disable(uid).catch(() => undefined);
    try {
      // Account previews use a device-global key until binding. Clear it before
      // another person can enter a new account on this device.
      await OnboardingService.clearDevicePersonalData();
      // Store logout can fail without a connection; Firebase sign-out is the
      // security boundary and must still complete.
      await SubscriptionService.forgetIdentity().catch(() => undefined);
      await auth().signOut();
    } catch (cause) {
      // A failed Firebase sign-out must not leave a permanent loading screen.
      await runRefresh(false);
      throw cause;
    }
    setError(null);
    setEmail(null);
    setState('signedOut');
  }, [runRefresh]);

  return (
    <AccessContext.Provider value={{ state, revalidating, email, error, refresh, signOut }}>
      {children}
    </AccessContext.Provider>
  );
}

export function useAccess(): AccessContextValue {
  const context = useContext(AccessContext);
  if (!context) throw new Error('AccessProvider is missing');
  return context;
}
