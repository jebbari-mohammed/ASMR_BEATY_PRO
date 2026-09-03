import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, radii, shadows, gradients } from '../../src/theme/tokens';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { DisclaimerBar } from '../../src/components/DisclaimerBar';

export default function SpotJournalModal() {
  const [selectedRegion, setSelectedRegion] = useState<string>('Left Cheek');
  const [tenderness, setTenderness] = useState<'none' | 'mild' | 'severe'>('none');

  const regions = ['Forehead', 'Left Cheek', 'Right Cheek', 'Nose', 'Chin', 'Jawline'];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerSection}>
        <Text style={typography.eyebrow}>TARGETED APPEARANCE TRACKING</Text>
        <Text style={styles.title}>Spot Journal</Text>
        <Text style={styles.subtitle}>
          Document how a localized cosmetic spot changes over time (Day 1, 3, 7, 14). Pure observational tracking to support calm skin consistency.
        </Text>
      </View>

      {/* Facial Region Selector */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Area Location</Text>
        <Text style={styles.sectionMeta}>Select Region</Text>
      </View>
      <View style={styles.regionGrid}>
        {regions.map(r => (
          <TouchableOpacity
            key={r}
            activeOpacity={0.8}
            onPress={() => setSelectedRegion(r)}
            style={[styles.regionChip, selectedRegion === r && styles.regionChipActive]}
          >
            {selectedRegion === r && (
              <Ionicons name="checkmark-circle" size={13} color={colors.textInverse} style={{ marginRight: 4 }} />
            )}
            <Text style={[styles.regionText, selectedRegion === r && styles.regionTextActive]}>
              {r}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Photo Capture Card */}
      <Card variant="elevated" style={styles.photoCard}>
        <View style={styles.cameraPlaceholder}>
          <View style={styles.cameraCircle}>
            <Ionicons name="camera-outline" size={32} color={colors.primary} />
          </View>
          <Text style={styles.cameraTitle}>Capture Close-Up Macro</Text>
          <Text style={styles.cameraSubtitle}>
            Position the area in steady, shadow-free natural lighting.
          </Text>
        </View>

        <Button
          title="Take Focused Photo"
          variant="primary"
          icon={<Ionicons name="aperture-outline" size={18} color={colors.textInverse} />}
          onPress={() => alert('Launching focused macro camera...')}
          style={{ marginTop: spacing.md }}
        />
      </Card>

      {/* Sensation / Tenderness Check */}
      <View style={[styles.sectionHeaderRow, { marginTop: spacing.lg }]}>
        <Text style={styles.sectionTitle}>Sensation Check</Text>
        <Text style={styles.sectionMeta}>Self-Reported</Text>
      </View>

      <View style={styles.tendernessRow}>
        {(['none', 'mild', 'severe'] as const).map(t => (
          <TouchableOpacity
            key={t}
            activeOpacity={0.8}
            onPress={() => setTenderness(t)}
            style={[
              styles.tendernessBtn,
              tenderness === t && (t === 'severe' ? styles.tendernessBtnSevere : styles.tendernessBtnActive)
            ]}
          >
            <Text
              style={[
                styles.tendernessText,
                tenderness === t && (t === 'severe' ? styles.tendernessTextSevere : styles.tendernessTextActive)
              ]}
            >
              {t === 'none' ? 'No Discomfort' : t === 'mild' ? 'Mild Sensation' : 'Severe Pain'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Safety Escalation Alert if Severe */}
      {tenderness === 'severe' && (
        <Card variant="subtle" style={styles.escalationCard}>
          <View style={styles.escalationHeader}>
            <Ionicons name="alert-circle" size={18} color={colors.terracotta} />
            <Text style={styles.escalationTitle}>PROFESSIONAL CARE RECOMMENDED</Text>
          </View>
          <Text style={styles.escalationBody}>
            If this spot is causing sharp pain, rapid swelling, or spreading warmth, please avoid touching or picking it. Have it evaluated by a board-certified dermatologist or qualified healthcare practitioner.
          </Text>
        </Card>
      )}

      {/* Tracking Schedule */}
      <View style={[styles.sectionHeaderRow, { marginTop: spacing.xl }]}>
        <Text style={styles.sectionTitle}>Progression Milestones</Text>
      </View>

      <Card variant="subtle" style={styles.scheduleCard}>
        <View style={styles.milestoneRow}>
          <Text style={styles.milestoneDot}>•</Text>
          <Text style={styles.milestoneItem}><Text style={styles.boldSpan}>Day 1:</Text> Initial baseline photo</Text>
        </View>
        <View style={styles.milestoneRow}>
          <Text style={styles.milestoneDot}>•</Text>
          <Text style={styles.milestoneItem}><Text style={styles.boldSpan}>Day 3:</Text> First progression check-in</Text>
        </View>
        <View style={styles.milestoneRow}>
          <Text style={styles.milestoneDot}>•</Text>
          <Text style={styles.milestoneItem}><Text style={styles.boldSpan}>Day 7:</Text> One-week milestone comparison</Text>
        </View>
        <View style={styles.milestoneRow}>
          <Text style={styles.milestoneDot}>•</Text>
          <Text style={styles.milestoneItem}><Text style={styles.boldSpan}>Day 14:</Text> Two-week recovery review</Text>
        </View>
      </Card>

      <DisclaimerBar showAffiliate={false} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    padding: spacing.base,
    paddingBottom: spacing.huge
  },
  headerSection: {
    marginBottom: spacing.base
  },
  title: {
    ...typography.display,
    fontSize: 28,
    lineHeight: 34,
    marginTop: spacing.xxs,
    marginBottom: spacing.xs
  },
  subtitle: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm
  },
  sectionTitle: {
    ...typography.h3,
    fontSize: 16
  },
  sectionMeta: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textTertiary
  },
  regionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.lg
  },
  regionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: spacing.xs + 3,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
    ...shadows.subtle
  },
  regionChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  regionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary
  },
  regionTextActive: {
    color: colors.textInverse
  },
  photoCard: {
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.base
  },
  cameraPlaceholder: {
    alignItems: 'center',
    marginBottom: spacing.sm
  },
  cameraCircle: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md
  },
  cameraTitle: {
    ...typography.h3,
    fontSize: 17,
    marginBottom: 2
  },
  cameraSubtitle: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center'
  },
  tendernessRow: {
    flexDirection: 'row',
    marginBottom: spacing.md
  },
  tendernessBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderRadius: radii.lg,
    marginHorizontal: 3,
    ...shadows.subtle
  },
  tendernessBtnActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryLight
  },
  tendernessBtnSevere: {
    backgroundColor: colors.terracottaLight,
    borderColor: colors.terracotta
  },
  tendernessText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary
  },
  tendernessTextActive: {
    color: colors.primary,
    fontWeight: '700'
  },
  tendernessTextSevere: {
    color: colors.terracotta,
    fontWeight: '700'
  },
  escalationCard: {
    backgroundColor: colors.terracottaLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.terracotta,
    padding: spacing.base,
    marginBottom: spacing.base
  },
  escalationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs
  },
  escalationTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.terracotta,
    marginLeft: 6
  },
  escalationBody: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textPrimary
  },
  scheduleCard: {
    padding: spacing.base,
    marginBottom: spacing.xl
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs + 2
  },
  milestoneDot: {
    fontSize: 16,
    color: colors.goldDark,
    marginRight: spacing.sm
  },
  milestoneItem: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textSecondary
  },
  boldSpan: {
    fontWeight: '700',
    color: colors.textPrimary
  }
});
