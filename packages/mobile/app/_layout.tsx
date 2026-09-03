import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../src/theme/tokens';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor={colors.background} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal/spot-journal"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Spot Journal',
            headerStyle: {
              backgroundColor: colors.background
            },
            headerTintColor: colors.primary,
            headerTitleStyle: {
              fontWeight: '700',
              fontSize: 17
            }
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
