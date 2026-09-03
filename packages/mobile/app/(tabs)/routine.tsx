import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing, typography, radii } from '../../src/theme/tokens';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { DisclaimerBar } from '../../src/components/DisclaimerBar';

type RoutineComplexity = 'MINIMAL' | 'ESSENTIAL' | 'ADVANCED';

export default function RoutineScreen() {
  const [complexity, setComplexity] = useState<RoutineComplexity>('ESSENTIAL');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={typography.captionBold}>ROUTINE ARCHITECTURE</Text>
        <Text style={[typography.h1, styles.title]}>Your Routine</Text>
        <Text style={typography.body}>
          Curated to be as simple as possible. We prioritize essential skin barrier needs before introducing any active ingredients.
        </Text>
      </View>

      {/* Complexity Selector */}
      <View style={styles.complexityContainer}>
        {(['MINIMAL', 'ESSENTIAL', 'ADVANCED'] as RoutineComplexity[]).map(lvl => {
          const isSelected = complexity === lvl;
          return (
            <TouchableOpacity
              key={lvl}
              onPress={() => setComplexity(lvl)}
              style={[styles.complexityButton, isSelected && styles.complexityButtonActive]}
            >
              <Text style={[styles.complexityText, isSelected && styles.complexityTextActive]}>
                {lvl}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Routine Philosophy Card */}
      <Card variant="subtle" style={styles.philosophyCard}>
        <Text style={typography.captionBold}>
          {complexity === 'MINIMAL' && 'Minimal: Cleanse + Moisturize + Sunscreen'}
          {complexity === 'ESSENTIAL' && 'Essential: Core Barrier Support + 1 Targeted Calming Step'}
          {complexity === 'ADVANCED' && 'Advanced: Structured Weekly Rotation with Monitored Actives'}
        </Text>
        <Text style={[typography.caption, { marginTop: spacing.xs }]}>
          {complexity === 'MINIMAL' && 'Best for sensitive skin recovery or when rebuilding your skin barrier.'}
          {complexity === 'ESSENTIAL' && 'Balanced daily care targeting your primary focus areas without overloading.'}
          {complexity === 'ADVANCED' && 'Carefully spaced treatments to prevent barrier disruption.'}
        </Text>
      </Card>

      {/* Morning Routine Steps */}
      <View style={styles.sectionHeader}>
        <Text style={typography.h2}>Morning Routine (AM)</Text>
      </View>

      <Card variant="elevated" style={styles.routineCard}>
        <View style={styles.stepRow}>
          <Text style={styles.stepNum}>1</Text>
          <View style={styles.stepContent}>
            <Text style={typography.bodyBold}>Gentle Cleanser</Text>
            <Text style={typography.caption}>Removes overnight buildup without stripping natural lipids.</Text>
          </View>
        </View>

        <View style={[styles.stepRow, styles.stepDivider]}>
          <Text style={styles.stepNum}>2</Text>
          <View style={styles.stepContent}>
            <Text style={typography.bodyBold}>Barrier Moisturizer</Text>
            <Text style={typography.caption}>Lightweight hydration containing ceramides and glycerin.</Text>
          </View>
        </View>

        <View style={[styles.stepRow, styles.stepDivider]}>
          <Text style={styles.stepNum}>3</Text>
          <View style={styles.stepContent}>
            <Text style={typography.bodyBold}>Mineral Sunscreen SPF 50</Text>
            <Text style={typography.caption}>Broad-spectrum UV protection to preserve cosmetic clarity.</Text>
          </View>
        </View>
      </Card>

      {/* Evening Routine Steps */}
      <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
        <Text style={typography.h2}>Evening Routine (PM)</Text>
      </View>

      <Card variant="elevated" style={styles.routineCard}>
        <View style={styles.stepRow}>
          <Text style={styles.stepNum}>1</Text>
          <View style={styles.stepContent}>
            <Text style={typography.bodyBold}>Gentle Cleanser</Text>
            <Text style={typography.caption}>Wash with lukewarm water to dissolve SPF and daily impurities.</Text>
          </View>
        </View>

        {complexity !== 'MINIMAL' && (
          <View style={[styles.stepRow, styles.stepDivider]}>
            <Text style={styles.stepNum}>2</Text>
            <View style={styles.stepContent}>
              <Text style={typography.bodyBold}>Calming Centella Serum</Text>
              <Text style={typography.caption}>Targets visible redness appearance. Apply 3 drops to damp skin.</Text>
            </View>
          </View>
        )}

        <View style={[styles.stepRow, styles.stepDivider]}>
          <Text style={styles.stepNum}>{complexity === 'MINIMAL' ? 2 : 3}</Text>
          <View style={styles.stepContent}>
            <Text style={typography.bodyBold}>Barrier Recovery Moisturizer</Text>
            <Text style={typography.caption}>Locks in moisture overnight while your skin barrier recovers.</Text>
          </View>
        </View>
      </Card>

      <Button
        title="Customize Step Instructions"
        variant="outline"
        onPress={() => alert('Custom routine step editor')}
        style={{ marginTop: spacing.xl }}
      />

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
  complexityContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radii.full,
    padding: 3,
    marginBottom: spacing.md
  },
  complexityButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radii.full
  },
  complexityButtonActive: {
    backgroundColor: colors.surface
  },
  complexityText: {
    ...typography.captionBold,
    color: colors.textTertiary,
    fontSize: 12
  },
  complexityTextActive: {
    color: colors.textPrimary
  },
  philosophyCard: {
    marginBottom: spacing.xl
  },
  sectionHeader: {
    marginBottom: spacing.sm
  },
  routineCard: {
    padding: spacing.base
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.sageLight,
    color: colors.sage,
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '700',
    marginRight: spacing.md
  },
  stepContent: {
    flex: 1
  },
  stepDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
    marginTop: spacing.md
  }
});
