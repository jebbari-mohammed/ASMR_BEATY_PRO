import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, radii, shadows, gradients } from '../../src/theme/tokens';
import { Header } from '../../src/components/Header';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { DisclaimerBar } from '../../src/components/DisclaimerBar';

type RoutineComplexity = 'MINIMAL' | 'ESSENTIAL' | 'ADVANCED';

export default function RoutineScreen() {
  const [complexity, setComplexity] = useState<RoutineComplexity>('ESSENTIAL');

  return (
    <View style={styles.screen}>
      <Header />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={typography.eyebrow}>BARRIER-FIRST ARCHITECTURE</Text>
          <Text style={styles.title}>Your Routine</Text>
          <Text style={styles.subtitle}>
            Thoughtfully pared down. We prioritize core skin barrier integrity before introducing any active cosmetic steps.
          </Text>
        </View>

        {/* Complexity Segmented Control */}
        <View style={styles.segmentedContainer}>
          {(['MINIMAL', 'ESSENTIAL', 'ADVANCED'] as RoutineComplexity[]).map(lvl => {
            const isSelected = complexity === lvl;
            return (
              <TouchableOpacity
                key={lvl}
                activeOpacity={0.8}
                onPress={() => setComplexity(lvl)}
                style={[styles.segmentButton, isSelected && styles.segmentButtonActive]}
              >
                <Text style={[styles.segmentText, isSelected && styles.segmentTextActive]}>
                  {lvl}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Routine Philosophy Banner */}
        <Card variant="elevated" style={styles.philosophyCard}>
          <LinearGradient
            colors={gradients.botanicalMist}
            style={styles.philosophyGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.philosophyRow}>
              <View style={styles.philosophyIconWrap}>
                <Ionicons
                  name={complexity === 'MINIMAL' ? 'shield-outline' : complexity === 'ESSENTIAL' ? 'sparkles-outline' : 'layers-outline'}
                  size={18}
                  color={colors.primary}
                />
              </View>
              <View style={styles.philosophyTextWrap}>
                <Text style={styles.philosophyTitle}>
                  {complexity === 'MINIMAL' && 'Minimal: Cleanse + Moisturize + SPF'}
                  {complexity === 'ESSENTIAL' && 'Essential: Core Barrier + 1 Targeted Calming Step'}
                  {complexity === 'ADVANCED' && 'Advanced: Monitored Rotation with Spaced Actives'}
                </Text>
                <Text style={styles.philosophyDesc}>
                  {complexity === 'MINIMAL' && 'Ideal when resetting an irritated skin barrier or during active travel.'}
                  {complexity === 'ESSENTIAL' && 'Balanced daily protocol addressing visible redness without barrier fatigue.'}
                  {complexity === 'ADVANCED' && 'Treatment evenings spaced deliberately to avoid active ingredient conflict.'}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Card>

        {/* Morning Ritual Steps */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleGroup}>
            <Ionicons name="sunny-outline" size={18} color={colors.goldDark} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Morning Ritual (AM)</Text>
          </View>
          <Text style={styles.sectionMeta}>3 Steps • Daily</Text>
        </View>

        <Card variant="elevated" style={styles.stepsCard}>
          {/* Step 1 */}
          <View style={styles.stepItem}>
            <View style={styles.stepNumBadge}>
              <Text style={styles.stepNumText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepCategory}>CLEANSE • WATER SOLUBLE</Text>
                <Text style={styles.stepDuration}>45s</Text>
              </View>
              <Text style={styles.stepTitle}>Gentle Hydrating Cleanser</Text>
              <Text style={styles.stepDesc}>Removes overnight sebum without stripping natural ceramides.</Text>
              <View style={styles.ingredientRow}>
                <Text style={styles.ingredientTag}>Glycerin</Text>
                <Text style={styles.ingredientTag}>Hyaluronic Acid</Text>
              </View>
            </View>
          </View>

          <View style={styles.stepDivider} />

          {/* Step 2 */}
          <View style={styles.stepItem}>
            <View style={styles.stepNumBadge}>
              <Text style={styles.stepNumText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepCategory}>HYDRATE • LIPID RESTORATION</Text>
                <Text style={styles.stepDuration}>30s</Text>
              </View>
              <Text style={styles.stepTitle}>Barrier Recovery Moisturizer</Text>
              <Text style={styles.stepDesc}>Lightweight emulsion locking in hydration over damp skin.</Text>
              <View style={styles.ingredientRow}>
                <Text style={styles.ingredientTag}>Ceramide NP</Text>
                <Text style={styles.ingredientTag}>Niacinamide 2%</Text>
              </View>
            </View>
          </View>

          <View style={styles.stepDivider} />

          {/* Step 3 */}
          <View style={styles.stepItem}>
            <View style={styles.stepNumBadge}>
              <Text style={styles.stepNumText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepCategory}>SHIELD • UV PROTECTION</Text>
                <Text style={styles.stepDuration}>1m</Text>
              </View>
              <Text style={styles.stepTitle}>Mineral Sunscreen SPF 50</Text>
              <Text style={styles.stepDesc}>Non-nano Zinc Oxide shield preventing photo-induced redness.</Text>
              <View style={styles.ingredientRow}>
                <Text style={styles.ingredientTag}>Zinc Oxide 12%</Text>
                <Text style={styles.ingredientTag}>Antioxidants</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Evening Ritual Steps */}
        <View style={[styles.sectionHeaderRow, { marginTop: spacing.xl }]}>
          <View style={styles.sectionTitleGroup}>
            <Ionicons name="moon-outline" size={18} color={colors.primaryLight} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Evening Ritual (PM)</Text>
          </View>
          <Text style={styles.sectionMeta}>3 Steps • Nightly</Text>
        </View>

        <Card variant="elevated" style={styles.stepsCard}>
          {/* Step 1 */}
          <View style={styles.stepItem}>
            <View style={styles.stepNumBadge}>
              <Text style={styles.stepNumText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepCategory}>DOUBLE CLEANSE</Text>
                <Text style={styles.stepDuration}>1m</Text>
              </View>
              <Text style={styles.stepTitle}>Gentle Hydrating Cleanser</Text>
              <Text style={styles.stepDesc}>Dissolves SPF and environmental dust with lukewarm rinse.</Text>
            </View>
          </View>

          <View style={styles.stepDivider} />

          {/* Step 2 */}
          <View style={styles.stepItem}>
            <View style={styles.stepNumBadge}>
              <Text style={styles.stepNumText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepCategory}>CALMING SERUM • TARGETED</Text>
                <Text style={styles.stepDuration}>30s</Text>
              </View>
              <Text style={styles.stepTitle}>Centella Calming Serum</Text>
              <Text style={styles.stepDesc}>3-4 drops pressed into flushed mid-cheek area.</Text>
              <View style={styles.ingredientRow}>
                <Text style={styles.ingredientTag}>Centella Asiatica</Text>
                <Text style={styles.ingredientTag}>Madecassoside</Text>
              </View>
            </View>
          </View>

          <View style={styles.stepDivider} />

          {/* Step 3 */}
          <View style={styles.stepItem}>
            <View style={styles.stepNumBadge}>
              <Text style={styles.stepNumText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepCategory}>NOCTURNAL RECOVERY</Text>
                <Text style={styles.stepDuration}>30s</Text>
              </View>
              <Text style={styles.stepTitle}>Barrier Recovery Moisturizer</Text>
              <Text style={styles.stepDesc}>Overnight lipid replenishment while transepidermal water loss peaks.</Text>
            </View>
          </View>
        </Card>

        {/* Safety Engine Guarantee Badge */}
        <View style={styles.safetyGuaranteeCard}>
          <Ionicons name="shield-checkmark" size={16} color={colors.primary} style={styles.safetyIcon} />
          <Text style={styles.safetyText}>
            <Text style={styles.boldSpan}>Safety Engine Active:</Text> Retinoids and strong exfoliating acids are strictly quarantined from simultaneous application to safeguard your skin barrier.
          </Text>
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
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radii.full,
    padding: 3,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(234, 229, 220, 0.7)'
  },
  segmentButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center'
  },
  segmentButtonActive: {
    backgroundColor: colors.surface,
    ...shadows.subtle
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.textTertiary
  },
  segmentTextActive: {
    color: colors.primary
  },
  philosophyCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(45, 86, 67, 0.15)'
  },
  philosophyGradient: {
    padding: spacing.base
  },
  philosophyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  philosophyIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    ...shadows.subtle
  },
  philosophyTextWrap: {
    flex: 1
  },
  philosophyTitle: {
    ...typography.bodyBold,
    fontSize: 13,
    color: colors.primary,
    marginBottom: 2
  },
  philosophyDesc: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md
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
  stepsCard: {
    padding: spacing.base,
    marginBottom: spacing.base
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  stepNumBadge: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    marginTop: 2
  },
  stepNumText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary
  },
  stepContent: {
    flex: 1
  },
  stepHeader: {
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
  stepTitle: {
    ...typography.bodyBold,
    fontSize: 15,
    marginBottom: 2
  },
  stepDesc: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
    marginBottom: spacing.xs
  },
  ingredientRow: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  ingredientTag: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primaryLight,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    marginRight: spacing.xs,
    marginTop: 2
  },
  stepDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.md
  },
  safetyGuaranteeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radii.lg,
    marginTop: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(234, 229, 220, 0.6)'
  },
  safetyIcon: {
    marginRight: spacing.sm,
    marginTop: 1
  },
  safetyText: {
    ...typography.caption,
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary
  },
  boldSpan: {
    fontWeight: '700',
    color: colors.primary
  }
});
