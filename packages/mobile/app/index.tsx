import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingService } from '../src/services/onboarding-machine';
import { colors, spacing } from '../src/theme/tokens';
import { useAccess } from '../src/services/access-context';

export default function Index() {
  const router = useRouter();
  const { state } = useAccess();

  useEffect(() => {
    let isMounted = true;

    async function check() {
      try {
        const completed = await OnboardingService.isCompleted();
        if (!isMounted) return;
        if (completed) {
          if (state === 'loading' || state === 'checking') return;
          router.replace(state === 'signedOut' || state === 'verifyEmail' ? '/account' : state === 'subscribed' ? '/(tabs)/today' : state === 'unavailable' ? '/access-unavailable' : '/modal/paywall');
        } else {
          router.replace('/onboarding');
        }
      } catch (err) {
        console.warn('[Index] Error checking onboarding status:', err);
        if (isMounted) {
          router.replace('/onboarding');
        }
      }
    }

    const timer = setTimeout(check, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [router, state]);

  return (
    <View style={styles.loading}>
      <View style={styles.brandingBox}>
        <Text style={styles.brandTitle}>ASMR BEAUTY</Text>
        <Text style={styles.tagline}>A CALMER DAILY RITUAL</Text>
      </View>
      <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.base
  },
  brandingBox: {
    alignItems: 'center'
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2,
    color: colors.primary
  },
  tagline: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: colors.goldDark,
    marginTop: 6
  }
});
