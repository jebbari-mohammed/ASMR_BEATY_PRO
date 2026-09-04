import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { OnboardingService } from '../src/services/onboarding-machine';
import { colors } from '../src/theme/tokens';

export default function Index() {
  const [isDone, setIsDone] = useState<boolean | null>(null);

  useEffect(() => {
    async function check() {
      const completed = await OnboardingService.isCompleted();
      setIsDone(completed);
    }
    check();
  }, []);

  if (isDone === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isDone) {
    return <Redirect href="/(tabs)/today" />;
  }

  return <Redirect href="/onboarding" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
