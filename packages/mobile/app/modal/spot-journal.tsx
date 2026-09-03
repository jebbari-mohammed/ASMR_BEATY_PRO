import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, radii, shadows, gradients } from '../../src/theme/tokens';
import { localImages } from '../../src/theme/images';
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

      {/* Macro Photo Capture Card with Real Image & Reticle Overlays */}
      <Card variant="elevated" style={styles.photoCard}>
        <View style={styles.macroImgWrap}>
          <Image source={localImages.spotMacro} style={styles.macroImg} />
          
          {/* Calibrated Reticle Overlay */}
          <View style={styles.reticleCrosshair}>
            <View style={styles.reticleCircle} />
            <View style={styles.reticleLabelBox}>
              <Text style={styles.reticleLabelText}>0.35 cm • Observational Target</Text>
            </View>
          </View>

          {/* Baseline Tag */}
          <View style={styles.macroBadge}>
            <Text style={styles.macroBadgeText}>DAY 1 BASELINE MACRO</Text>
          </View>
        </View>

        <View style={styles.photoActions}>
          <Button
            title="Retake Focused Macro"
            variant="secondary"
            icon={<Ionicons name="camera-reverse-outline" size={16} color={colors.primary} />}
            onPress={() => alert('Launching focused macro camera...')}
            style={{ flex: 1 }}
          />
        </View>
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

      <Card variant="subtle" style={styles.milestonesCard}>
        <View style={styles.milestoneItem}>
          <View style={[styles.milestoneDot, styles.milestoneDotDone]} />
          <View style={styles.milestoneContent}>
            <Text style={styles.milestoneTitle}>Day 1: Initial baseline photo</Text>
            <Text style={styles.milestoneSub}>Captured Aug 21 • Left Cheek (0.35cm)</Text>
          </View>
        </View>

        <View style={styles.milestoneDivider} />

        <View style={styles.milestoneItem}>
          <View style={[styles.milestoneDot, styles.milestoneDotActive]} />
          <View style={styles.milestoneContent}>
            <Text style={styles.milestoneTitle}>Day 3: Progression check-in</Text>
            <Text style={styles.milestoneSub}>Scheduled in 18 hours</Text>
          </View>
        </View>

        <View style={styles.milestoneDivider} />

        <View style={styles.milestoneItem}>
          <View style={styles.milestoneDot} />
          <View style={styles.milestoneContent}>
            <Text style={styles.milestoneTitle}>Day 7: Midpoint review</Text>
            <Text style={styles.milestoneSub}>Assessing appearance stabilization</Text>
          </View>
        </View>

        <View style={styles.milestoneDivider} />

        <View style={styles.milestoneItem}>
          <View style={styles.milestoneDot} />
          <View style={styles.milestoneContent}>
            <Text style={styles.milestoneTitle}>Day 14: Final consistency comparison</Text>
            <Text style={styles.milestoneSub}>Full side-by-side retrospective</Text>
          </View>
        </View>
      </Card>

      <DisclaimerBar />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.huge
  },
  headerSection: {
    marginTop: spacing.md,
    marginBottom: spacing.md
  },
  title: {
    ...typography.display,
    fontSize: 26,
    lineHeight: 32,
    marginTop: spacing.xxs,
    marginBottom: spacing.xs
  },
  subtitle: {
    ...typography.body,
    fontSize: 13,
    lineHeight: 18
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm
  },
  sectionTitle: {
    ...typography.title2,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary
  },
  sectionMeta: {
    ...typography.caption,
    fontSize: 12,
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
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.full,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(26, 56, 43, 0.1)',
    ...shadows.subtle
  },
  regionChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  regionText: {
    ...typography.captionBold,
    fontSize: 12,
    color: colors.textPrimary
  },
  regionTextActive: {
    color: colors.textInverse
  },
  photoCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: spacing.md
  },
  macroImgWrap: {
    width: '100%',
    height: 240,
    position: 'relative'
  },
  macroImg: {
    width: '100%',
    height: '100%'
  },
  reticleCrosshair: {
    position: 'absolute',
    top: '56%',
    left: '49%',
    transform: [{ translateX: -80 }, { translateY: -22 }],
    alignItems: 'center'
  },
  reticleCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.goldLight,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(197, 154, 111, 0.15)'
  },
  reticleLabelBox: {
    backgroundColor: 'rgba(19, 30, 24, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(197, 154, 111, 0.4)'
  },
  reticleLabelText: {
    ...typography.captionBold,
    fontSize: 9,
    color: colors.goldLight,
    letterSpacing: 0.5
  },
  macroBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(19, 30, 24, 0.82)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(197, 154, 111, 0.3)'
  },
  macroBadgeText: {
    ...typography.captionBold,
    fontSize: 9,
    color: colors.goldLight,
    letterSpacing: 0.8
  },
  photoActions: {
    padding: spacing.sm + 2
  },
  tendernessRow: {
    flexDirection: 'row',
    marginBottom: spacing.md
  },
  tendernessBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: 10,
    borderRadius: radii.md,
    alignItems: 'center',
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(26, 56, 43, 0.1)',
    ...shadows.subtle
  },
  tendernessBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  tendernessBtnSevere: {
    backgroundColor: colors.terracotta,
    borderColor: colors.terracotta
  },
  tendernessText: {
    ...typography.captionBold,
    fontSize: 12,
    color: colors.textPrimary
  },
  tendernessTextActive: {
    color: colors.textInverse
  },
  tendernessTextSevere: {
    color: colors.textInverse
  },
  escalationCard: {
    backgroundColor: 'rgba(194, 91, 78, 0.08)',
    borderColor: 'rgba(194, 91, 78, 0.25)',
    borderWidth: 1,
    marginBottom: spacing.md
  },
  escalationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xxs
  },
  escalationTitle: {
    ...typography.eyebrow,
    color: colors.terracotta,
    marginLeft: 6
  },
  escalationBody: {
    ...typography.body,
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 17
  },
  milestonesCard: {
    padding: spacing.md
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  milestoneDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.borderSubtle,
    marginRight: spacing.md
  },
  milestoneDotDone: {
    backgroundColor: colors.primary
  },
  milestoneDotActive: {
    backgroundColor: colors.goldDark
  },
  milestoneContent: {
    flex: 1
  },
  milestoneTitle: {
    ...typography.title2,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary
  },
  milestoneSub: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 1
  },
  milestoneDivider: {
    height: 1,
    backgroundColor: 'rgba(26, 56, 43, 0.06)',
    marginVertical: spacing.sm
  }
});
