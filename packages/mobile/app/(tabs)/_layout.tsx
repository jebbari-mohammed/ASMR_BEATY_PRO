import React from 'react';
import { Tabs } from 'expo-router';
import { colors, typography } from '../../src/theme/tokens.js';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.background,
          elevation: 0,
          shadowOpacity: 0
        },
        headerTitleStyle: typography.h3,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderLight,
          elevation: 4
        },
        tabBarActiveTintColor: colors.sage,
        tabBarInactiveTintColor: colors.textTertiary
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: 'Today',
          headerTitle: 'Daily Routine'
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          headerTitle: 'Skin Snapshot'
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          headerTitle: 'Consistency & Memory'
        }}
      />
      <Tabs.Screen
        name="routine"
        options={{
          title: 'Routine',
          headerTitle: 'Your Routine'
        }}
      />
      <Tabs.Screen
        name="shelf"
        options={{
          title: 'My Shelf',
          headerTitle: 'Product Shelf'
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: 'Coach',
          headerTitle: 'AI Skin Coach'
        }}
      />
    </Tabs>
  );
}
