import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../../src/theme/tokens';
import { useAccess } from '../../src/services/access-context';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const { state, revalidating } = useAccess();
  const insets = useSafeAreaInsets();
  if (state === 'loading' || state === 'checking') return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /></View>;
  if (state === 'signedOut' || state === 'verifyEmail') return <Redirect href="/account" />;
  if (state === 'unavailable') return <Redirect href="/access-unavailable" />;
  if (state !== 'subscribed') return <Redirect href="/modal/paywall" />;
  return (
    <View style={styles.root}>
      <View
        style={styles.root}
        pointerEvents={revalidating ? 'none' : 'auto'}
        accessibilityElementsHidden={revalidating}
        importantForAccessibility={revalidating ? 'no-hide-descendants' : 'auto'}
      >
        <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: 'rgba(234, 229, 220, 0.7)',
          borderTopWidth: 1,
          height: 64,
          paddingTop: 8,
          paddingBottom: 10,
          ...shadows.subtle
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.3,
          marginTop: 2
        }
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'sparkles' : 'sparkles-outline'} size={22} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'analytics' : 'analytics-outline'} size={22} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="routine"
        options={{
          title: 'Routine',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'water' : 'water-outline'} size={22} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="shelf"
        options={{
          title: 'My Shelf',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'cube' : 'cube-outline'} size={22} color={color} />
          )
        }}
      />
        </Tabs>
      </View>
      {revalidating && (
        <View style={[StyleSheet.absoluteFill, styles.checkingLayer, { paddingTop: insets.top + 10 }]}>
          <View style={styles.checkingNotice} accessible accessibilityRole="progressbar" accessibilityLabel="Checking your membership">
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.checkingText}>Checking your membership</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  checkingLayer: { alignItems: 'center' },
  checkingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 15,
    minHeight: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle
  },
  checkingText: { color: colors.primary, fontSize: 12, fontWeight: '600' }
});
