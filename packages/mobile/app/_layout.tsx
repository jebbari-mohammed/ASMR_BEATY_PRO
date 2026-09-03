import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal/spot-journal"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Spot Journal'
          }}
        />
      </Stack>
    </>
  );
}
