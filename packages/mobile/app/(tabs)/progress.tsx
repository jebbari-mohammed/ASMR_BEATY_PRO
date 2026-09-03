import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, radii, shadows, gradients } from '../../src/theme/tokens';
import { localImages } from '../../src/theme/images';
import { Header } from '../../src/components/Header';
import { Card } from '../../src/components/Card';
import { DisclaimerBar } from '../../src/components/DisclaimerBar';

interface Milestone {
  day: number;
  label: string;
  date: string;
  status: 'completed' | 'active' | 'upcoming';
}

export default function ProgressScreen() {
  const [selectedMilestone, setSelectedMilestone] = useState<number>(14);

  const milestones: Milestone[] = [
    { day: 1, label: 'Day 1', date: 'Aug 21', status: 'completed' },
    { day: 7, label: 'Day 7', date: 'Aug 28', status: 'completed' },
    { day: 14, label: 'Day 14', date: 'Sep 04', status: 'active' },
    { day: 30, label: 'Day 30', date: 'Sep 20', status: 'upcoming' },
    { day: 42, label: 'Day 42', date: 'Oct 02', status: 'upcoming' }
  ];

  return (
    <View style={styles.screen}>
      <Header />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={typography.eyebrow}>LONGITUDINAL APPEARANCE MEMORY</Text>
          <Text style={styles.title}>42-Day Consistency</Text>
          <Text style={styles.subtitle}>
            Observational appearance evolution paired with your daily morning and evening skincare habits.
          </Text>
        </View>

        {/* Milestone Timeline Carousel */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timelineScroll}>
          {milestones.map((m) => {
            const isSelected = selectedMilestone === m.day;
            const isCurrent = m.status === 'active';
            return (
              <TouchableOpacity
                key={m.day}
                activeOpacity={0.8}
                onPress={() => setSelectedMilestone(m.day)}
                style={[
                  styles.milestoneNode,
                  isSelected && styles.milestoneNodeSelected,
                  isCurrent && styles.milestoneNodeCurrent
                ]}
              >
                <View style={[styles.nodeIconWrap, isCurrent && styles.nodeIconWrapCurrent]}>
                  <Ionicons
                    name={m.status === 'completed' ? 'checkmark-circle' : isCurrent ? 'sparkles' : 'lock-closed-outline'}
                    size={16}
                    color={isCurrent ? colors.textInverse : m.status === 'completed' ? colors.primary : colors.textTertiary}
                  />
                </View>
                <Text style={[styles.nodeLabel, isSelected && styles.nodeLabelSelected]}>{m.label}</Text>
                <Text style={[styles.nodeDate, isSelected && styles.nodeDateSelected]}>{m.date}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Standardized Real Macro Skin Comparison */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Macro Skin Evolution</Text>
          <View style={styles.calibPill}>
            <View style={styles.calibDot} />
            <Text style={styles.calibText}>5200K MATCH</Text>
          </View>
        </View>

        <Card variant="elevated" style={styles.compareCard}>
          <View style={styles.compareRow}>
            {/* Day 1 Baseline Photo */}
            <View style={styles.compareSide}>
              <View style={styles.photoContainer}>
                <Image source={localImages.skinBefore} style={styles.compareImage} />
                <View style={styles.photoBadgeBaseline}>
                  <Text style={styles.photoBadgeText}>DAY 1 BASELINE</Text>
                </View>
              </View>
              <View style={styles.photoInfo}>
                <Text style={styles.photoDate}>Aug 21 • Initial</Text>
                <Text style={styles.photoMetric}>Redness: 74 • Visible Pores</Text>
              </View>
            </View>

            <View style={styles.compareDividerCol}>
              <View style={styles.dividerLine} />
              <View style={styles.versusBadge}>
                <Text style={styles.versusText}>VS</Text>
              </View>
              <View style={styles.dividerLine} />
            </View>

            {/* Day 14 Current Photo */}
            <View style={styles.compareSide}>
              <View style={styles.photoContainer}>
                <Image source={localImages.skinAfter} style={styles.compareImage} />
                <View style={styles.photoBadgeCurrent}>
                  <Ionicons name="sparkles" size={9} color={colors.textInverse} style={{ marginRight: 3 }} />
                  <Text style={[styles.photoBadgeText, { color: colors.textInverse }]}>DAY 14 ACTIVE</Text>
                </View>
              </View>
              <View style={styles.photoInfo}>
                <Text style={styles.photoDate}>Sep 04 • Today</Text>
                <Text style={[styles.photoMetric, { color: colors.routineDone, fontWeight: '600' }]}>
                  Redness: 58 • Calmed Glow
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.lightingNotice}>
            <Ionicons name="information-circle-outline" size={14} color={colors.textTertiary} />
            <Text style={styles.lightingNoticeText}>
              Standardized angle, focal distance & daylight spectrum ensure scientific appearance observation.
            </Text>
          </View>
        </Card>

        {/* Skin Memory: "What Changed?" Card */}
        <Card variant="elevated" style={styles.memoryCard}>
          <LinearGradient
            colors={gradients.champagneGlow}
            style={styles.memoryCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.memoryTopRow}>
              <View style={styles.memoryBadge}>
                <Ionicons name="sparkles" size={13} color={colors.goldDark} />
                <Text style={styles.memoryBadgeText}>SKIN MEMORY INSIGHTS</Text>
              </View>
              <Text style={styles.memoryMeta}>Day 14 vs. Initial Baseline</Text>
            </View>

            <View style={styles.insightItem}>
              <View style={styles.insightIconWrap}>
                <Ionicons name="trending-down" size={14} color={colors.routineDone} />
              </View>
              <Text style={styles.insightText}>
                <Text style={styles.boldSpan}>Visible Redness:</Text> Reduced by 16 points across the mid-cheeks compared to Day 1 baseline.
              </Text>
            </View>

            <View style={styles.insightItem}>
              <View style={styles.insightIconWrap}>
                <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} />
              </View>
              <Text style={styles.insightText}>
                <Text style={styles.boldSpan}>Barrier Stability:</Text> Surface hydration score held steady at 86/100 without active irritation.
              </Text>
            </View>

            <View style={styles.insightItem}>
              <View style={styles.insightIconWrap}>
                <Ionicons name="leaf-outline" size={14} color={colors.goldDark} />
              </View>
              <Text style={styles.insightText}>
                <Text style={styles.boldSpan}>Product Introduction:</Text> Introduced Centella Calming Serum 10 days ago with zero reported sensitivity.
              </Text>
            </View>

            <View style={styles.insightItem}>
              <View style={styles.insightIconWrap}>
                <Ionicons name="flame" size={14} color={colors.terracotta} />
              </View>
              <Text style={styles.insightText}>
                <Text style={styles.boldSpan}>Adherence:</Text> Completed 88% of scheduled evening routines over the 14-day observation window.
              </Text>
            </View>
          </LinearGradient>
        </Card>

        {/* Non-Causality Scientific Disclaimer */}
        <DisclaimerBar />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  container: {
    flex: 1
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.huge
  },
  headerSection: {
    marginTop: spacing.xs,
    marginBottom: spacing.md
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
  timelineScroll: {
    marginBottom: spacing.lg
  },
  milestoneNode: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(26, 56, 43, 0.08)',
    marginRight: spacing.sm,
    alignItems: 'center',
    minWidth: 78,
    ...shadows.subtle
  },
  milestoneNodeSelected: {
    borderColor: colors.goldDark,
    backgroundColor: colors.surfaceSubtle
  },
  milestoneNodeCurrent: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(26, 56, 43, 0.04)'
  },
  nodeIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(26, 56, 43, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4
  },
  nodeIconWrapCurrent: {
    backgroundColor: colors.primary
  },
  nodeLabel: {
    ...typography.captionBold,
    fontSize: 12,
    color: colors.textPrimary
  },
  nodeLabelSelected: {
    color: colors.primary
  },
  nodeDate: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textTertiary
  },
  nodeDateSelected: {
    color: colors.textSecondary
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm
  },
  sectionTitle: {
    ...typography.title2,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary
  },
  calibPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 56, 43, 0.06)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full
  },
  calibDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.routineDone,
    marginRight: 4
  },
  calibText: {
    ...typography.captionBold,
    fontSize: 9,
    color: colors.primary,
    letterSpacing: 0.6
  },
  compareCard: {
    padding: spacing.base,
    marginBottom: spacing.lg
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  compareSide: {
    flex: 1
  },
  photoContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radii.md,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.subtle
  },
  compareImage: {
    width: '100%',
    height: '100%'
  },
  photoBadgeBaseline: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(19, 30, 24, 0.82)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radii.sm
  },
  photoBadgeCurrent: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radii.sm
  },
  photoBadgeText: {
    ...typography.captionBold,
    fontSize: 8.5,
    color: colors.goldLight,
    letterSpacing: 0.6
  },
  photoInfo: {
    marginTop: spacing.xs
  },
  photoDate: {
    ...typography.captionBold,
    fontSize: 12,
    color: colors.textPrimary
  },
  photoMetric: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1
  },
  compareDividerCol: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm
  },
  dividerLine: {
    width: 1,
    height: 35,
    backgroundColor: 'rgba(26, 56, 43, 0.12)'
  },
  versusBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(26, 56, 43, 0.1)'
  },
  versusText: {
    ...typography.captionBold,
    fontSize: 10,
    color: colors.primary
  },
  lightingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(26, 56, 43, 0.06)'
  },
  lightingNoticeText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textTertiary,
    marginLeft: 6,
    flex: 1,
    lineHeight: 15
  },
  memoryCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(197, 154, 111, 0.3)'
  },
  memoryCardGradient: {
    padding: spacing.base
  },
  memoryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md
  },
  memoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
    ...shadows.subtle
  },
  memoryBadgeText: {
    ...typography.captionBold,
    fontSize: 10,
    color: colors.goldDark,
    marginLeft: 4,
    letterSpacing: 0.8
  },
  memoryMeta: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm + 2
  },
  insightIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    marginTop: 1,
    ...shadows.subtle
  },
  insightText: {
    ...typography.body,
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 18
  },
  boldSpan: {
    fontWeight: '700',
    color: colors.primary
  }
});
