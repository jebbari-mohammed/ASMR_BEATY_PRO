import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing, typography, radii } from '../../src/theme/tokens.js';
import { Card } from '../../src/components/Card.js';
import { DisclaimerBar } from '../../src/components/DisclaimerBar.js';

export default function ProgressScreen() {
  const [selectedMilestone, setSelectedMilestone] = useState<number>(14);

  const milestones = [
    { day: 1, label: 'Day 1', date: 'Aug 21' },
    { day: 7, label: 'Day 7', date: 'Aug 28' },
    { day: 14, label: 'Day 14', date: 'Sep 04' },
    { day: 30, label: 'Day 30', date: 'Upcoming' },
    { day: 42, label: 'Day 42', date: 'Upcoming' }
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={typography.captionBold}>SKIN MEMORY & RETENTION</Text>
        <Text style={[typography.h1, styles.title]}>42-Day Consistency</Text>
        <Text style={typography.body}>
          Track how your skin appearance evolves alongside consistent daily skincare habits.
        </Text>
      </View>

      {/* Standardized Progress Milestones */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.milestoneScroll}>
        {milestones.map(m => {
          const isSelected = selectedMilestone === m.day;
          return (
            <TouchableOpacity
              key={m.day}
              onPress={() => setSelectedMilestone(m.day)}
              style={[styles.milestonePill, isSelected && styles.milestonePillActive]}
            >
              <Text style={[styles.milestoneDay, isSelected && styles.milestoneTextActive]}>{m.label}</Text>
              <Text style={[styles.milestoneDate, isSelected && styles.milestoneDateActive]}>{m.date}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* "What Changed?" Memory Card (Section 9) */}
      <Card variant="elevated" style={styles.memoryCard}>
        <Text style={[typography.captionBold, { color: colors.sage }]}>SKIN MEMORY: WHAT CHANGED?</Text>
        <Text style={[typography.h3, { marginTop: spacing.xs, marginBottom: spacing.sm }]}>
          Day 14 vs. Initial Baseline
        </Text>

        <View style={styles.observationRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.observationText}>
            Visible redness appears lower across the mid-cheeks compared to your Day 1 baseline.
          </Text>
        </View>

        <View style={styles.observationRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.observationText}>
            Your surface texture score has remained stable, reflecting consistent barrier moisturization.
          </Text>
        </View>

        <View style={styles.observationRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.observationText}>
            You introduced Centella Calming Serum 10 days ago without any reported irritation.
          </Text>
        </View>

        <View style={styles.observationRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.observationText}>
            Evening routine consistency reached 88% over the past 14 days.
          </Text>
        </View>
      </Card>

      {/* Before / After Standardized Visual Comparison */}
      <View style={styles.sectionHeader}>
        <Text style={typography.h2}>Standardized Comparison</Text>
        <Text style={typography.caption}>Framing and distance normalized across scans</Text>
      </View>

      <Card variant="subtle" style={styles.compareCard}>
        <View style={styles.compareContainer}>
          <View style={styles.compareHalf}>
            <View style={styles.photoPlaceholder}>
              <Text style={typography.captionBold}>Day 1 Baseline</Text>
              <Text style={styles.photoDate}>Aug 21</Text>
            </View>
          </View>
          <View style={styles.dividerLine} />
          <View style={styles.compareHalf}>
            <View style={styles.photoPlaceholder}>
              <Text style={typography.captionBold}>Day 14 (Current)</Text>
              <Text style={styles.photoDate}>Sep 04</Text>
            </View>
          </View>
        </View>
        <Text style={[typography.caption, styles.compareDisclaimer]}>
          Lighting and environmental conditions can influence photographic appearance. Use comparison as a guide for routine consistency rather than clinical measurement.
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
    marginBottom: spacing.md
  },
  title: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs
  },
  milestoneScroll: {
    flexDirection: 'row',
    marginBottom: spacing.xl
  },
  milestonePill: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center'
  },
  milestonePillActive: {
    backgroundColor: colors.sage,
    borderColor: colors.sage
  },
  milestoneDay: {
    ...typography.captionBold,
    color: colors.textPrimary
  },
  milestoneDate: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textTertiary
  },
  milestoneTextActive: {
    color: colors.textInverse
  },
  milestoneDateActive: {
    color: colors.surfaceSecondary
  },
  memoryCard: {
    marginBottom: spacing.xl
  },
  observationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.xs,
    marginBottom: spacing.xs
  },
  bullet: {
    fontSize: 18,
    color: colors.sage,
    marginRight: spacing.sm,
    lineHeight: 22
  },
  observationText: {
    ...typography.body,
    flex: 1,
    fontSize: 14
  },
  sectionHeader: {
    marginBottom: spacing.md
  },
  compareCard: {
    marginBottom: spacing.xl,
    padding: spacing.base
  },
  compareContainer: {
    flexDirection: 'row',
    height: 200,
    borderRadius: radii.md,
    overflow: 'hidden'
  },
  compareHalf: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  dividerLine: {
    width: 2,
    backgroundColor: colors.surface
  },
  photoPlaceholder: {
    alignItems: 'center'
  },
  photoDate: {
    ...typography.caption,
    fontSize: 12,
    marginTop: 2
  },
  compareDisclaimer: {
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 16
  }
});
