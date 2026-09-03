import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing, typography, radii } from '../../src/theme/tokens.js';
import { Card } from '../../src/components/Card.js';
import { DisclaimerBar } from '../../src/components/DisclaimerBar.js';

interface RoutineCheckItem {
  id: string;
  name: string;
  category: string;
  detail: string;
  completed: boolean;
}

export default function TodayScreen() {
  const [morningSteps, setMorningSteps] = useState<RoutineCheckItem[]>([
    { id: 'm1', name: 'Gentle Hydrating Cleanser', category: 'Cleanse', detail: 'Lukewarm water, pat dry gently', completed: true },
    { id: 'm2', name: 'Barrier Recovery Moisturizer', category: 'Hydrate', detail: 'Pea-sized amount over damp skin', completed: true },
    { id: 'm3', name: 'Broad Spectrum Mineral SPF 50', category: 'Protect', detail: 'Two finger lengths, reapply if outdoors', completed: false }
  ]);

  const [eveningSteps, setEveningSteps] = useState<RoutineCheckItem[]>([
    { id: 'e1', name: 'Gentle Hydrating Cleanser', category: 'Cleanse', detail: 'Massage for 45 seconds to dissolve SPF', completed: false },
    { id: 'e2', name: 'Centella Calming Serum', category: 'Treat', detail: '3-4 drops for visible cheek redness', completed: false },
    { id: 'e3', name: 'Barrier Recovery Moisturizer', category: 'Moisturize', detail: 'Lock in evening hydration', completed: false }
  ]);

  const toggleMorning = (id: string) => {
    setMorningSteps(prev => prev.map(s => s.id === id ? { ...s, completed: !s.completed } : s));
  };

  const toggleEvening = (id: string) => {
    setEveningSteps(prev => prev.map(s => s.id === id ? { ...s, completed: !s.completed } : s));
  };

  const completedCount = [...morningSteps, ...eveningSteps].filter(s => s.completed).length;
  const totalCount = morningSteps.length + eveningSteps.length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Greeting & Consistency Banner */}
      <View style={styles.header}>
        <Text style={typography.captionBold}>SUNDAY, DAY 12 OF 42</Text>
        <Text style={[typography.h1, styles.title]}>Good Morning</Text>
        <Text style={typography.body}>Keep your routine steady today to help calm visible redness.</Text>
      </View>

      {/* Streak & Consistency Bar */}
      <Card variant="subtle" style={styles.streakCard}>
        <View style={styles.streakRow}>
          <View>
            <Text style={styles.streakNumber}>6 Days</Text>
            <Text style={typography.caption}>Current Evening Streak</Text>
          </View>
          <View style={styles.progressCounter}>
            <Text style={styles.counterText}>{completedCount}/{totalCount} Done</Text>
          </View>
        </View>
      </Card>

      {/* Morning Section */}
      <View style={styles.sectionHeader}>
        <Text style={typography.h2}>Morning Routine</Text>
        <Text style={typography.caption}>AM • 3 Simple Steps</Text>
      </View>

      {morningSteps.map((step, idx) => (
        <TouchableOpacity
          key={step.id}
          activeOpacity={0.7}
          onPress={() => toggleMorning(step.id)}
          style={styles.stepCard}
        >
          <View style={[styles.checkbox, step.completed && styles.checkboxDone]}>
            {step.completed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <View style={styles.stepInfo}>
            <View style={styles.stepMeta}>
              <Text style={styles.stepOrder}>Step {idx + 1} • {step.category}</Text>
            </View>
            <Text style={[typography.bodyBold, step.completed && styles.completedText]}>
              {step.name}
            </Text>
            <Text style={typography.caption}>{step.detail}</Text>
          </View>
        </TouchableOpacity>
      ))}

      {/* Evening Section */}
      <View style={[styles.sectionHeader, styles.eveningHeader]}>
        <Text style={typography.h2}>Tonight's Routine</Text>
        <Text style={typography.caption}>PM • Scheduled after 8 PM</Text>
      </View>

      {eveningSteps.map((step, idx) => (
        <TouchableOpacity
          key={step.id}
          activeOpacity={0.7}
          onPress={() => toggleEvening(step.id)}
          style={styles.stepCard}
        >
          <View style={[styles.checkbox, step.completed && styles.checkboxDone]}>
            {step.completed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <View style={styles.stepInfo}>
            <View style={styles.stepMeta}>
              <Text style={styles.stepOrder}>Step {idx + 1} • {step.category}</Text>
            </View>
            <Text style={[typography.bodyBold, step.completed && styles.completedText]}>
              {step.name}
            </Text>
            <Text style={typography.caption}>{step.detail}</Text>
          </View>
        </TouchableOpacity>
      ))}

      {/* Routine Principle Note */}
      <Card variant="subtle" style={styles.trustNote}>
        <Text style={typography.captionBold}>Skin Coach Reminder</Text>
        <Text style={[typography.caption, { marginTop: spacing.xs }]}>
          You don't need a 10-step routine. A simple, consistent routine outperforms complex layering.
        </Text>
      </Card>

      <DisclaimerBar showAffiliate={false} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    padding: spacing.base,
    paddingBottom: spacing.huge
  },
  header: {
    marginBottom: spacing.base
  },
  title: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs
  },
  streakCard: {
    marginBottom: spacing.xl,
    padding: spacing.base
  },
  streakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  streakNumber: {
    ...typography.h2,
    color: colors.sage
  },
  progressCounter: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full
  },
  counterText: {
    ...typography.captionBold,
    color: colors.textPrimary
  },
  sectionHeader: {
    marginBottom: spacing.md
  },
  eveningHeader: {
    marginTop: spacing.xl
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: radii.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md
  },
  checkboxDone: {
    backgroundColor: colors.sage,
    borderColor: colors.sage
  },
  checkmark: {
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: 14
  },
  stepInfo: {
    flex: 1
  },
  stepMeta: {
    marginBottom: 2
  },
  stepOrder: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  completedText: {
    color: colors.textTertiary,
    textDecorationLine: 'line-through'
  },
  trustNote: {
    marginTop: spacing.xl,
    backgroundColor: colors.surfaceSecondary,
    borderLeftWidth: 3,
    borderLeftColor: colors.sage
  }
});
