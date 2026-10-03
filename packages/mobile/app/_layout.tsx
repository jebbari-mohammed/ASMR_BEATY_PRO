import React from 'react';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LogBox } from 'react-native';
import { colors } from '../src/theme/tokens';
import { AccessProvider, useAccess } from '../src/services/access-context';

if (__DEV__) {
  // Store-free emulators emit these expected native billing errors. Keep the
  // paywall's own error state visible without a LogBox covering its controls.
  LogBox.ignoreLogs([
    'Billing is not available in this device',
    'There was a problem with the App Store'
  ]);
}

function AppNavigator() {
  const pathname = usePathname();
  const { state } = useAccess();
  const editorialHeader = pathname.startsWith('/onboarding') ||
    pathname.startsWith('/modal/paywall') ||
    (pathname === '/account' && state !== 'verifyEmail');

  return (
    <>
      <StatusBar style={editorialHeader ? 'light' : 'dark'} />
      <Stack
        initialRouteName="index"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background }
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />
        <Stack.Screen name="account" options={{ headerShown: false }} />
        <Stack.Screen name="access-unavailable" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal/paywall"
          options={{
            presentation: 'modal',
            headerShown: false
          }}
        />
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
        <Stack.Screen
          name="modal/settings"
          options={{
            presentation: 'modal',
            headerShown: false
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AccessProvider>
        <AppNavigator />
      </AccessProvider>
    </SafeAreaProvider>
  );
}
