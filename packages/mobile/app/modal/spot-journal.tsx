import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing, typography, radii } from '../../src/theme/tokens.js';
import { Card } from '../../src/components/Card.js';
import { Button } from '../../src/components/Button.js';
import { DisclaimerBar } from '../../src/components/DisclaimerBar.js';

export default function SpotJournalModal() {
  const [selectedRegion, setSelectedRegion] = useState<string>('Left Cheek');
  const [tenderness, setTenderness] = useState<'none' | 'mild' | 'severe'>('none');

  const regions = ['Forehead', 'Left Cheek', 'Right Cheek', 'Nose', 'Chin', 'Jawline'];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={typography.captionBold}>VISUAL TRACKING</Text>
        <Text style={[typography.h1, styles.title]}>Spot Journal</Text>
        <Text style={typography.body}>
          Track how a localized area changes over time (Day 1, 3, 7, 14). Observational tracking only.
        </Text>
      </View>

      {/* Facial Region Selector */}
      <View style={styles.sectionHeader}>
        <Text style={typography.h3}>Area Location</Text>
      </View>
      <View style={styles.regionGrid}>
        {regions.map(r => (
          <TouchableOpacity
            key={r}
            onPress={() => setSelectedRegion(r)}
            style={[styles.regionChip, selectedRegion === r && styles.regionChipActive]}
          >
            <Text style={[styles.regionText, selectedRegion === r && styles.regionTextActive]}>
              {r}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Photo Capture Card */}
      <Card variant="elevated" style={styles.photoCard}>
        <View style={styles.cameraPlaceholder}>
          <Text style={styles.cameraIcon}>📷</Text>
          <Text style={typography.bodyBold}>Capture Close-Up Photo</Text>
          <Text style={typography.caption}>Align the area in good lighting without flash</Text>
        </View>
        <Button
          title="Take Focused Photo"
          onPress={() => alert('Focused close-up camera launched')}
          style={{ marginTop: spacing.md }}
        />
      </Card>

      {/* Sensation / Tenderness Check */}
      <View style={styles.sectionHeader}>
        <Text style={typography.h3}>Sensation Check</Text>
        <Text style={typography.caption}>Does this area feel uncomfortable?</Text>
      </View>

      <View style={styles.tendernessRow}>
        {(['none', 'mild', 'severe'] as const).map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setTenderness(t)}
            style={[styles.tendernessBtn, tenderness === t && styles.tendernessBtnActive]}
          >
            <Text style={[styles.tendernessText, tenderness === t && styles.tendernessTextActive]}>
              {t === 'none' ? 'No Discomfort' : t === 'mild' ? 'Mild Sensation' : 'Severe Pain'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Safety Escalation Alert if Severe Pain */}
      {tenderness === 'severe' && (
        <Card variant="subtle" style={styles.escalationCard}>
          <Text style={[typography.captionBold, { color: colors.terracotta }]}>
            MEDICAL ATTENTION ADVISABLE
          </Text>
          <Text style={[typography.caption, { marginTop: spacing.xs, color: colors.textPrimary }]}>
            If this spot is causing severe pain, rapid swelling, heat, or spreading redness, please do not squeeze or pick at it. Consult a physician or board-certified dermatologist for safe in-person evaluation.
          </Text>
        </Card>
      )}

      {/* Visual Timeline Preview */}
      <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
        <Text style={typography.h3}>Tracking Schedule</Text>
      </View>

      <Card variant="subtle" style={{ marginBottom: spacing.xl }}>
        <Text style={styles.timelineItem}>• Day 1: Initial baseline photo</Text>
        <Text style={styles.timelineItem}>• Day 3: First progression check-in</Text>
        <Text style={styles.timelineItem}>• Day 7: One-week milestone</Text>
        <Text style={styles.timelineItem}>• Day 14: Two-week comparison</Text>
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
  sectionHeader: {
    marginVertical: spacing.sm
  },
  regionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md
  },
  regionChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    marginRight: spacing.xs,
    marginBottom: spacing.xs
  },
  regionChipActive: {
    backgroundColor: colors.sage,
    borderColor: colors.sage
  },
  regionText: {
    ...typography.captionBold,
    color: colors.textSecondary
  },
  regionTextActive: {
    color: colors.textInverse
  },
  photoCard: {
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md
  },
  cameraPlaceholder: {
    alignItems: 'center',
    paddingVertical: spacing.lg
  },
  cameraIcon: {
    fontSize: 36,
    marginBottom: spacing.sm
  },
  tendernessRow: {
    flexDirection: 'row',
    marginBottom: spacing.md
  },
  tendernessBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    alignItems: 'center',
    marginRight: spacing.xs
  },
  tendernessBtnActive: {
    backgroundColor: colors.calmFocus,
    borderColor: colors.calmFocus
  },
  tendernessText: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 12
  },
  tendernessTextActive: {
    color: colors.textInverse
  },
  escalationCard: {
    backgroundColor: colors.terracottaLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.terracotta,
    marginBottom: spacing.md
  },
  timelineItem: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 4
  }
});
