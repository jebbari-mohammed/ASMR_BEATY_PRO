import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, radii, shadows, gradients } from '../../src/theme/tokens';
import { localImages } from '../../src/theme/images';
import { Header } from '../../src/components/Header';
import { Card } from '../../src/components/Card';
import { DisclaimerBar } from '../../src/components/DisclaimerBar';

interface RoutineStep {
  id: string;
  name: string;
  category: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  duration: string;
  completed: boolean;
}

export default function TodayScreen() {
  const router = useRouter();

  const [morningSteps, setMorningSteps] = useState<RoutineStep[]>([
    { id: 'm1', name: 'Gentle Hydrating Cleanser', category: 'Cleanse', detail: 'Lukewarm water, pat dry gently', icon: 'water-outline', duration: '45s', completed: true },
    { id: 'm2', name: 'Barrier Recovery Moisturizer', category: 'Hydrate', detail: 'Pea-sized amount over damp skin', icon: 'sparkles-outline', duration: '30s', completed: true },
    { id: 'm3', name: 'Broad Spectrum Mineral SPF 50', category: 'Protect', detail: 'Two finger lengths, reapply if outdoors', icon: 'shield-checkmark-outline', duration: '1m', completed: false }
  ]);

  const [eveningSteps, setEveningSteps] = useState<RoutineStep[]>([
    { id: 'e1', name: 'Gentle Hydrating Cleanser', category: 'Cleanse', detail: 'Massage for 45s to dissolve sunscreen', icon: 'water-outline', duration: '45s', completed: false },
    { id: 'e2', name: 'Centella Calming Serum', category: 'Target', detail: '3-4 drops for visible cheek redness', icon: 'leaf-outline', duration: '30s', completed: false },
    { id: 'e3', name: 'Barrier Recovery Moisturizer', category: 'Nourish', detail: 'Lock in night hydration', icon: 'moon-outline', duration: '30s', completed: false }
  ]);

  const toggleMorning = (id: string) => {
    setMorningSteps(prev => prev.map(s => s.id === id ? { ...s, completed: !s.completed } : s));
  };

  const toggleEvening = (id: string) => {
    setEveningSteps(prev => prev.map(s => s.id === id ? { ...s, completed: !s.completed } : s));
  };

  const completedCount = [...morningSteps, ...eveningSteps].filter(s => s.completed).length;
  const totalCount = morningSteps.length + eveningSteps.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <View style={styles.screen}>
      <Header />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Editorial Real Photography Hero Banner */}
        <View style={styles.editorialBanner}>
          <ImageBackground
            source={localImages.morningGlow}
            style={styles.editorialImage}
            imageStyle={{ borderRadius: radii.lg }}
          >
            <LinearGradient
              colors={['rgba(26,56,43,0.1)', 'rgba(19,30,24,0.88)']}
              style={styles.editorialGradient}
            >
              <View style={styles.editorialPill}>
                <Ionicons name="sparkles" size={11} color={colors.goldDark} style={{ marginRight: 5 }} />
                <Text style={styles.editorialPillText}>DAY 12 • MORNING GLOW RITUAL</Text>
              </View>
              <Text style={styles.editorialTitle}>Nourish & Protect Your Barrier</Text>
              <Text style={styles.editorialSubtitle}>
                Surface hydration steady. Complete your AM routine to sustain progress.
              </Text>
            </LinearGradient>
          </ImageBackground>
        </View>

        {/* Hero Consistency & Streak Card */}
        <Card variant="elevated" style={styles.streakCard}>
          <LinearGradient
            colors={gradients.botanicalMist}
            style={styles.streakGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.streakTopRow}>
              <View style={styles.streakBadge}>
                <Ionicons name="flame" size={16} color={colors.terracotta} />
                <Text style={styles.streakBadgeText}>6-DAY STREAK</Text>
              </View>
              <View style={styles.progressCounter}>
                <Text style={styles.counterText}>{completedCount}/{totalCount} Completed</Text>
              </View>
            </View>

            <View style={styles.progressTrackContainer}>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
              </View>
              <Text style={styles.percentText}>{progressPercent}%</Text>
            </View>

            <View style={styles.milestoneRow}>
              <Text style={styles.milestoneLabel}>Day 1</Text>
              <View style={styles.milestoneDivider} />
              <Text style={[styles.milestoneLabel, styles.milestoneActive]}>Day 12 Active</Text>
              <View style={styles.milestoneDivider} />
              <Text style={styles.milestoneLabel}>Day 42 Goal</Text>
            </View>
          </LinearGradient>
        </Card>

        {/* Next Scheduled Scan Banner with Real Photo Preview */}
        <TouchableOpacity
          style={styles.nextScanCard}
          activeOpacity={0.85}
          onPress={() => router.push('/(tabs)/scan')}
        >
          <View style={styles.scanThumbWrap}>
            <Image source={localImages.scanPortrait} style={styles.scanThumb} />
            <View style={styles.scanThumbDot} />
          </View>
          <View style={styles.scanTextWrap}>
            <Text style={styles.scanEyebrow}>UPCOMING BIOMETRIC SCAN</Text>
            <Text style={styles.scanTitle}>Day 14 Skin Snapshot</Text>
            <Text style={styles.scanSub}>Scheduled in 2 days • Track cheek redness & texture</Text>
          </View>
          <Ionicons name="scan-outline" size={24} color={colors.primary} />
        </TouchableOpacity>

        {/* Morning Ritual Section */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleGroup}>
            <Ionicons name="sunny-outline" size={18} color={colors.goldDark} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Morning Ritual</Text>
          </View>
          <Text style={styles.sectionMeta}>3 Simple Steps • 2 Min</Text>
        </View>

        {morningSteps.map((step, idx) => (
          <TouchableOpacity
            key={step.id}
            activeOpacity={0.78}
            onPress={() => toggleMorning(step.id)}
            style={[styles.stepCard, step.completed && styles.stepCardCompleted]}
          >
            <View style={[styles.stepIconWrap, step.completed && styles.stepIconWrapDone]}>
              <Ionicons
                name={step.completed ? 'checkmark' : step.icon}
                size={18}
                color={step.completed ? colors.textInverse : colors.primary}
              />
            </View>

            <View style={styles.stepInfo}>
              <View style={styles.stepHeaderRow}>
                <Text style={styles.stepCategory}>
                  STEP {idx + 1} • {step.category.toUpperCase()}
                </Text>
                <Text style={styles.stepDuration}>{step.duration}</Text>
              </View>
              <Text style={[styles.stepName, step.completed && styles.stepNameCompleted]}>
                {step.name}
              </Text>
              <Text style={styles.stepDetail}>{step.detail}</Text>
            </View>

            <View style={[styles.checkbox, step.completed && styles.checkboxDone]}>
              {step.completed && <Ionicons name="checkmark-sharp" size={14} color={colors.textInverse} />}
            </View>
          </TouchableOpacity>
        ))}

        {/* Evening Ritual Section */}
        <View style={[styles.sectionHeaderRow, styles.eveningSectionHeader]}>
          <View style={styles.sectionTitleGroup}>
            <Ionicons name="moon-outline" size={18} color={colors.primaryLight} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Evening Ritual</Text>
          </View>
          <Text style={styles.sectionMeta}>Scheduled after 8:00 PM</Text>
        </View>

        {eveningSteps.map((step, idx) => (
          <TouchableOpacity
            key={step.id}
            activeOpacity={0.78}
            onPress={() => toggleEvening(step.id)}
            style={[styles.stepCard, step.completed && styles.stepCardCompleted]}
          >
            <View style={[styles.stepIconWrap, step.completed && styles.stepIconWrapDone]}>
              <Ionicons
                name={step.completed ? 'checkmark' : step.icon}
                size={18}
                color={step.completed ? colors.textInverse : colors.primary}
              />
            </View>

            <View style={styles.stepInfo}>
              <View style={styles.stepHeaderRow}>
                <Text style={styles.stepCategory}>
                  STEP {idx + 1} • {step.category.toUpperCase()}
                </Text>
                <Text style={styles.stepDuration}>{step.duration}</Text>
              </View>
              <Text style={[styles.stepName, step.completed && styles.stepNameCompleted]}>
                {step.name}
              </Text>
              <Text style={styles.stepDetail}>{step.detail}</Text>
            </View>

            <View style={[styles.checkbox, step.completed && styles.checkboxDone]}>
              {step.completed && <Ionicons name="checkmark-sharp" size={14} color={colors.textInverse} />}
            </View>
          </TouchableOpacity>
        ))}

        {/* Concierge Coach Touchpoint with Real Aesthetician Avatar */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/(tabs)/coach')}
          style={styles.coachCard}
        >
          <View style={styles.coachRow}>
            <Image source={localImages.coachPortrait} style={styles.coachAvatarImg} />
            <View style={styles.coachTextWrap}>
              <View style={styles.coachHeaderRow}>
                <Text style={styles.coachTitle}>Ask your AI Skin Coach</Text>
                <View style={styles.onlineBadge}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.onlineText}>Active</Text>
                </View>
              </View>
              <Text style={styles.coachPrompt}>
                "Can I use my soothing serum alongside tonight's routine?"
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={colors.primary} />
          </View>
        </TouchableOpacity>

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
  editorialBanner: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    borderRadius: radii.lg,
    overflow: 'hidden',
    ...shadows.medium
  },
  editorialImage: {
    width: '100%',
    height: 190,
    justifyContent: 'flex-end'
  },
  editorialGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.base
  },
  editorialPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(26, 56, 43, 0.85)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(197, 154, 111, 0.4)',
    marginBottom: spacing.xs
  },
  editorialPillText: {
    ...typography.captionBold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.goldLight
  },
  editorialTitle: {
    ...typography.title1,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.3
  },
  editorialSubtitle: {
    ...typography.body,
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    lineHeight: 18
  },
  streakCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(234, 229, 220, 0.7)'
  },
  streakGradient: {
    padding: spacing.base
  },
  streakTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.full,
    ...shadows.subtle
  },
  streakBadgeText: {
    ...typography.captionBold,
    fontSize: 11,
    color: colors.terracotta,
    marginLeft: spacing.xxs,
    letterSpacing: 0.5
  },
  progressCounter: {
    backgroundColor: 'rgba(26, 56, 43, 0.06)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm
  },
  counterText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 12
  },
  progressTrackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md
  },
  progressBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(26, 56, 43, 0.1)',
    borderRadius: radii.full,
    overflow: 'hidden',
    marginRight: spacing.sm
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radii.full
  },
  percentText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 12,
    minWidth: 34
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  milestoneLabel: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary
  },
  milestoneActive: {
    fontWeight: '700',
    color: colors.primary
  },
  milestoneDivider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(26, 56, 43, 0.12)',
    marginHorizontal: spacing.sm
  },
  nextScanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(26, 56, 43, 0.08)',
    marginBottom: spacing.lg,
    ...shadows.subtle
  },
  scanThumbWrap: {
    position: 'relative'
  },
  scanThumb: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSubtle
  },
  scanThumbDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.routineDone,
    borderWidth: 2,
    borderColor: colors.surface
  },
  scanTextWrap: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm
  },
  scanEyebrow: {
    ...typography.eyebrow,
    fontSize: 9,
    marginBottom: 2
  },
  scanTitle: {
    ...typography.title2,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2
  },
  scanSub: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.xs
  },
  eveningSectionHeader: {
    marginTop: spacing.lg
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  sectionIcon: {
    marginRight: spacing.xs
  },
  sectionTitle: {
    ...typography.title2,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary
  },
  sectionMeta: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: 12
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(26, 56, 43, 0.06)',
    marginBottom: spacing.sm,
    ...shadows.subtle
  },
  stepCardCompleted: {
    backgroundColor: 'rgba(244, 241, 235, 0.6)',
    borderColor: 'rgba(26, 56, 43, 0.04)'
  },
  stepIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: 'rgba(26, 56, 43, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md
  },
  stepIconWrapDone: {
    backgroundColor: colors.primary
  },
  stepInfo: {
    flex: 1
  },
  stepHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2
  },
  stepCategory: {
    ...typography.captionBold,
    fontSize: 10,
    color: colors.goldDark,
    letterSpacing: 0.8
  },
  stepDuration: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textTertiary
  },
  stepName: {
    ...typography.title2,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2
  },
  stepNameCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary
  },
  stepDetail: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: 'rgba(26, 56, 43, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm
  },
  checkboxDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  coachCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 154, 111, 0.3)',
    ...shadows.subtle
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  coachAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.goldDark,
    marginRight: spacing.md
  },
  coachTextWrap: {
    flex: 1,
    marginRight: spacing.sm
  },
  coachHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2
  },
  coachTitle: {
    ...typography.title2,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginRight: spacing.xs
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 124, 89, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full
  },
  onlineDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.routineDone,
    marginRight: 4
  },
  onlineText: {
    ...typography.captionBold,
    fontSize: 9,
    color: colors.routineDone
  },
  coachPrompt: {
    ...typography.caption,
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.textSecondary,
    lineHeight: 16
  }
});
