import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, radii, shadows, gradients } from '../../src/theme/tokens';
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
        {/* Daily Greeting Banner */}
        <View style={styles.heroSection}>
          <Text style={typography.eyebrow}>SUNDAY, DAY 12 • 42-DAY PLAN</Text>
          <Text style={styles.greetingTitle}>Good Morning, Sarah</Text>
          <Text style={styles.greetingBody}>
            Keep your routine steady today to help calm visible cheek redness.
          </Text>
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

        {/* Concierge Coach Touchpoint */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/(tabs)/coach')}
          style={styles.coachCard}
        >
          <View style={styles.coachRow}>
            <View style={styles.coachAvatar}>
              <Ionicons name="sparkles" size={18} color={colors.goldDark} />
            </View>
            <View style={styles.coachTextWrap}>
              <Text style={styles.coachTitle}>Ask your AI Skin Coach</Text>
              <Text style={styles.coachPrompt}>
                "Can I use retinol alongside tonight's soothing serum?"
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
  heroSection: {
    marginVertical: spacing.md
  },
  greetingTitle: {
    ...typography.display,
    fontSize: 28,
    lineHeight: 34,
    marginTop: spacing.xxs,
    marginBottom: spacing.xs
  },
  greetingBody: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20
  },
  streakCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(234, 229, 220, 0.7)'
  },
  streakGradient: {
    padding: spacing.base + 2
  },
  streakTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(186, 109, 84, 0.2)'
  },
  streakBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.terracotta,
    marginLeft: 4,
    letterSpacing: 0.8
  },
  progressCounter: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  counterText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary
  },
  progressTrackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md
  },
  progressBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: radii.full,
    overflow: 'hidden',
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(45, 86, 67, 0.1)'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radii.full
  },
  percentText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  milestoneLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: '500'
  },
  milestoneActive: {
    color: colors.primary,
    fontWeight: '700'
  },
  milestoneDivider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(45, 86, 67, 0.15)',
    marginHorizontal: spacing.sm
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md
  },
  eveningSectionHeader: {
    marginTop: spacing.xl
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  sectionIcon: {
    marginRight: spacing.xs + 2
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
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: radii.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.subtle
  },
  stepCardCompleted: {
    backgroundColor: '#FAF9F6',
    borderColor: 'rgba(234, 229, 220, 0.5)',
    shadowOpacity: 0.01
  },
  stepIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md
  },
  stepIconWrapDone: {
    backgroundColor: colors.routineDone
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
    fontSize: 10,
    fontWeight: '700',
    color: colors.goldDark,
    letterSpacing: 0.8
  },
  stepDuration: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textTertiary
  },
  stepName: {
    ...typography.bodyBold,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 2
  },
  stepNameCompleted: {
    color: colors.textTertiary,
    textDecorationLine: 'line-through'
  },
  stepDetail: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm
  },
  checkboxDone: {
    backgroundColor: colors.routineDone,
    borderColor: colors.routineDone
  },
  coachCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.subtle
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  coachAvatar: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 154, 111, 0.3)'
  },
  coachTextWrap: {
    flex: 1,
    marginRight: spacing.sm
  },
  coachTitle: {
    ...typography.bodyBold,
    fontSize: 13,
    color: colors.textPrimary
  },
  coachPrompt: {
    ...typography.caption,
    fontSize: 12,
    color: colors.goldDark,
    fontStyle: 'italic',
    marginTop: 1
  }
});
