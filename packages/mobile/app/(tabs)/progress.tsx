import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, radii, shadows, gradients } from '../../src/theme/tokens';
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
          {milestones.map((m, idx) => {
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
                <Text style={styles.boldSpan}>Visible Redness:</Text> Noticeable reduction across the mid-cheeks compared to Day 1 baseline.
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

        {/* Standardized Visual Comparison */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Standardized Comparison</Text>
          <Text style={styles.sectionMeta}>Normalized 5500K Lighting</Text>
        </View>

        <Card variant="elevated" style={styles.compareCard}>
          <View style={styles.compareRow}>
            {/* Day 1 */}
            <View style={styles.compareSide}>
              <View style={styles.photoContainer}>
                <Ionicons name="person-outline" size={40} color={colors.textTertiary} />
                <View style={styles.photoPill}>
                  <Text style={styles.photoPillText}>DAY 1 • AUG 21</Text>
                </View>
              </View>
              <Text style={styles.photoCaption}>Initial Baseline</Text>
              <Text style={styles.photoSubCaption}>Slight visible flushing</Text>
            </View>

            <View style={styles.compareDivider}>
              <View style={styles.vsBadge}>
                <Text style={styles.vsText}>VS</Text>
              </View>
            </View>

            {/* Day 14 */}
            <View style={styles.compareSide}>
              <View style={[styles.photoContainer, styles.photoContainerActive]}>
                <Ionicons name="person" size={40} color={colors.primary} />
                <View style={[styles.photoPill, styles.photoPillActive]}>
                  <Text style={[styles.photoPillText, styles.photoPillTextActive]}>DAY 14 • CURRENT</Text>
                </View>
              </View>
              <Text style={styles.photoCaption}>Current Milestone</Text>
              <Text style={styles.photoSubCaption}>Calmer appearance</Text>
            </View>
          </View>
        </Card>

        {/* Adherence & Retention Stats */}
        <View style={styles.statsGrid}>
          <Card variant="subtle" style={styles.statCard}>
            <Text style={styles.statNumber}>88%</Text>
            <Text style={styles.statLabel}>Routine Adherence</Text>
          </Card>
          <Card variant="subtle" style={styles.statCard}>
            <Text style={styles.statNumber}>12 / 42</Text>
            <Text style={styles.statLabel}>Program Days</Text>
          </Card>
          <Card variant="subtle" style={styles.statCard}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Reported Irritations</Text>
          </Card>
        </View>

        <DisclaimerBar showAffiliate={false} />
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
    marginVertical: spacing.md
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
    marginBottom: spacing.xl,
    paddingVertical: spacing.xs
  },
  milestoneNode: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderRadius: radii.lg,
    alignItems: 'center',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    minWidth: 88,
    ...shadows.subtle
  },
  milestoneNodeSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface
  },
  milestoneNodeCurrent: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryLight
  },
  nodeIconWrap: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs
  },
  nodeIconWrapCurrent: {
    backgroundColor: colors.primary
  },
  nodeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2
  },
  nodeLabelSelected: {
    color: colors.primary
  },
  nodeDate: {
    fontSize: 10,
    color: colors.textTertiary
  },
  nodeDateSelected: {
    color: colors.primaryLight,
    fontWeight: '600'
  },
  memoryCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(197, 154, 111, 0.25)'
  },
  memoryCardGradient: {
    padding: spacing.base + 2
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
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(197, 154, 111, 0.3)'
  },
  memoryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.goldDark,
    marginLeft: 4,
    letterSpacing: 0.8
  },
  memoryMeta: {
    fontSize: 11,
    fontWeight: '600',
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
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    marginTop: 1,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  insightText: {
    ...typography.body,
    flex: 1,
    fontSize: 13,
    lineHeight: 19
  },
  boldSpan: {
    fontWeight: '700',
    color: colors.textPrimary
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md
  },
  sectionTitle: {
    ...typography.h2,
    fontSize: 18
  },
  sectionMeta: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textTertiary
  },
  compareCard: {
    padding: spacing.base,
    marginBottom: spacing.xl
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  compareSide: {
    flex: 1,
    alignItems: 'center'
  },
  photoContainer: {
    width: '100%',
    height: 140,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    position: 'relative'
  },
  photoContainerActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryLight
  },
  photoPill: {
    position: 'absolute',
    bottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full
  },
  photoPillActive: {
    backgroundColor: colors.primary
  },
  photoPillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: colors.textSecondary
  },
  photoPillTextActive: {
    color: colors.textInverse
  },
  photoCaption: {
    ...typography.bodyBold,
    fontSize: 13
  },
  photoSubCaption: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textTertiary
  },
  compareDivider: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center'
  },
  vsBadge: {
    width: 24,
    height: 24,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border
  },
  vsText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textTertiary
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.base
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 3,
    paddingVertical: spacing.md
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 2
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textTertiary,
    textAlign: 'center'
  }
});
