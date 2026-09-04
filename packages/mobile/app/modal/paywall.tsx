import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, radii, shadows, gradients } from '../../src/theme/tokens';
import { localImages } from '../../src/theme/images';
import { SubscriptionService } from '../../src/services/subscription-service';
import { SubscriptionOfferingPayload, SubscriptionPlanOffering } from '@asmr/shared';

export default function PaywallModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [offering, setOffering] = useState<SubscriptionOfferingPayload | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingOffering, setLoadingOffering] = useState(true);

  useEffect(() => {
    async function loadOffering() {
      try {
        const data = await SubscriptionService.getOffering();
        setOffering(data);
        setSelectedPlanId(data.defaultPlanId);
      } catch (err) {
        console.warn('Failed to load subscription offering:', err);
      } finally {
        setLoadingOffering(false);
      }
    }
    loadOffering();
  }, []);

  const selectedPlan: SubscriptionPlanOffering | undefined = offering?.plans.find(
    (p) => p.id === selectedPlanId
  ) || offering?.plans[0];

  const handleSubscribe = async () => {
    if (!selectedPlan) return;
    setIsProcessing(true);
    try {
      const res = await SubscriptionService.purchasePlan(selectedPlan.id);
      setIsProcessing(false);
      if (res.success) {
        Alert.alert(
          'Welcome to Pro',
          selectedPlan.hasFreeTrial
            ? 'Your 7-day free trial is now active! All Pro features are unlocked.'
            : 'Your subscription is now active! All Pro features are unlocked.',
          [
            {
              text: 'Let’s Go',
              onPress: () => router.back()
            }
          ]
        );
      }
    } catch (err: any) {
      setIsProcessing(false);
      Alert.alert('Purchase Error', err?.message || 'Unable to complete transaction. Please try again.');
    }
  };

  const handleRestore = async () => {
    setIsProcessing(true);
    try {
      const isEntitled = await SubscriptionService.verifyEntitlementServerSide('current_user');
      setIsProcessing(false);
      if (isEntitled) {
        Alert.alert('Purchases Restored', 'Your Pro subscription has been verified.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Restore Purchases', 'No active subscription found for this account.');
      }
    } catch (err: any) {
      setIsProcessing(false);
      Alert.alert('Restore Error', 'Could not restore purchases. Please check your network connection.');
    }
  };

  if (loadingOffering || !offering) {
    return (
      <View style={[styles.screen, styles.centerContent, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[typography.caption, { marginTop: spacing.md, color: colors.textSecondary }]}>
          Loading subscription options...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Top Navigation Bar with Dismiss */}
      <View style={styles.topNav}>
        <View style={styles.proTag}>
          <Ionicons name="sparkles" size={13} color={colors.goldDark} />
          <Text style={styles.proTagText}>PRO ACCESS</Text>
        </View>
        <TouchableOpacity
          style={styles.closeBtn}
          activeOpacity={0.7}
          onPress={() => router.back()}
          accessibilityLabel="Close Paywall"
        >
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={typography.eyebrow}>42-DAY SKIN CONSISTENCY</Text>
          <Text style={styles.heroTitle}>{offering.headline}</Text>
          <Text style={styles.heroSubtitle}>{offering.supportingCopy}</Text>
        </View>

        {/* Real Macro Visual Timeline Card */}
        <View style={styles.timelineCard}>
          <View style={styles.timelineHeaderRow}>
            <Text style={styles.timelineCardTitle}>Macro Skin Observation</Text>
            <View style={styles.calibPill}>
              <View style={styles.calibDot} />
              <Text style={styles.calibText}>CALIBRATED 5200K</Text>
            </View>
          </View>

          <View style={styles.comparisonGrid}>
            <View style={styles.comparePhotoCol}>
              <View style={styles.imageWrap}>
                <Image source={localImages.skinBefore} style={styles.compareThumb} resizeMode="cover" />
                <View style={styles.dayBadge}>
                  <Text style={styles.dayBadgeText}>DAY 1</Text>
                </View>
              </View>
              <Text style={styles.compareMeta}>Baseline redness & uneven pores</Text>
            </View>

            <View style={styles.compareArrow}>
              <Ionicons name="arrow-forward" size={18} color={colors.goldDark} />
            </View>

            <View style={styles.comparePhotoCol}>
              <View style={styles.imageWrap}>
                <Image source={localImages.skinAfter} style={styles.compareThumb} resizeMode="cover" />
                <View style={[styles.dayBadge, styles.dayBadgeGold]}>
                  <Text style={styles.dayBadgeTextGold}>DAY 42</Text>
                </View>
              </View>
              <Text style={styles.compareMeta}>Calmer tone & strengthened barrier</Text>
            </View>
          </View>

          <View style={styles.lightingNotice}>
            <Ionicons name="information-circle-outline" size={13} color={colors.textTertiary} />
            <Text style={styles.lightingNoticeText}>
              Real user observational record. Differences in lighting and camera distance are normalized. Individual results vary with consistency.
            </Text>
          </View>
        </View>

        {/* Feature Benefits List (Strict Approved Terminology) */}
        <View style={styles.benefitsSection}>
          <View style={styles.benefitRow}>
            <View style={styles.benefitIconWrap}>
              <Ionicons name="scan-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.benefitTextWrap}>
              <Text style={styles.benefitTitle}>Weekly Guided Skin Snapshots</Text>
              <Text style={styles.benefitDesc}>
                Structured visual tracking to monitor visible redness, texture, and hydration balance over time.
              </Text>
            </View>
          </View>

          <View style={styles.benefitRow}>
            <View style={styles.benefitIconWrap}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.benefitTextWrap}>
              <Text style={styles.benefitTitle}>Routine & Ingredient Compatibility Checks</Text>
              <Text style={styles.benefitDesc}>
                Deterministic screening for active conflicts, barrier overload, and your stated sensitivities before buying.
              </Text>
            </View>
          </View>

          <View style={styles.benefitRow}>
            <View style={styles.benefitIconWrap}>
              <Ionicons name="camera-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.benefitTextWrap}>
              <Text style={styles.benefitTitle}>Spot Journal & Photo Timeline</Text>
              <Text style={styles.benefitDesc}>
                Focused macro tracking for specific blemishes or areas of concern across Day 1, 3, 7, and 14.
              </Text>
            </View>
          </View>

          <View style={styles.benefitRow}>
            <View style={styles.benefitIconWrap}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.benefitTextWrap}>
              <Text style={styles.benefitTitle}>Full Access to Your AI Skin Coach</Text>
              <Text style={styles.benefitDesc}>
                Grounding daily guidance in your exact shelf products, routine logs, and skin changes with fair-use limits.
              </Text>
            </View>
          </View>
        </View>

        {/* Plan Selector */}
        <View style={styles.planSelector}>
          {offering.plans.map((plan) => {
            const isSelected = plan.id === selectedPlan?.id;
            return (
              <TouchableOpacity
                key={plan.id}
                style={[styles.planCard, isSelected && styles.planCardSelected]}
                activeOpacity={0.85}
                onPress={() => setSelectedPlanId(plan.id)}
              >
                {plan.badgeLabel ? (
                  <View style={styles.planBadgeRibbon}>
                    <Text style={styles.planBadgeRibbonText}>{plan.badgeLabel}</Text>
                  </View>
                ) : null}
                <View style={styles.planCardContent}>
                  <View style={styles.planRadioRow}>
                    <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <View style={styles.planTitles}>
                      <Text style={styles.planName}>{plan.title}</Text>
                      {plan.hasFreeTrial ? (
                        <Text style={styles.planTrialLabel}>Includes {plan.trialDays}-Day Free Trial</Text>
                      ) : (
                        <Text style={styles.planTrialLabel}>Instant activation</Text>
                      )}
                    </View>
                    <View style={styles.planPriceCol}>
                      <Text style={styles.planPriceMain}>${plan.priceUsd.toFixed(2)}</Text>
                      <Text style={styles.planPerMonth}>
                        {plan.billingPeriod === 'annual'
                          ? `$${plan.perMonthEquivalentUsd.toFixed(2)} / mo`
                          : 'per month'}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.subscribeBtn, isProcessing && styles.subscribeBtnDisabled]}
          activeOpacity={0.85}
          onPress={handleSubscribe}
          disabled={isProcessing}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.subscribeGradient}
          >
            <Text style={styles.subscribeBtnText}>
              {isProcessing
                ? 'Verifying...'
                : selectedPlan?.hasFreeTrial
                ? `Start My ${selectedPlan.trialDays}-Day Free Trial`
                : offering.primaryCtaText}
            </Text>
            <Ionicons name="arrow-forward" size={18} color={colors.textInverse} />
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.trialTerms}>
          {selectedPlan?.hasFreeTrial
            ? `Free for ${selectedPlan.trialDays} days, then $${selectedPlan.priceUsd}/year. Cancel anytime in App Store settings.`
            : selectedPlan?.billingPeriod === 'annual'
            ? `$${selectedPlan.priceUsd}/year billed annually. Cancel anytime in account settings.`
            : `Billed monthly at $${selectedPlan?.priceUsd}/month. Cancel anytime in account settings.`}
        </Text>

        {/* Dismiss Option */}
        <TouchableOpacity
          style={styles.freeEscapeHatch}
          activeOpacity={0.7}
          onPress={() => router.back()}
        >
          <Text style={styles.freeEscapeText}>Maybe Later</Text>
        </TouchableOpacity>

        {/* Legal & Compliance Footer */}
        <View style={styles.legalFooter}>
          <View style={styles.legalLinksRow}>
            <TouchableOpacity onPress={handleRestore}>
              <Text style={styles.legalLink}>Restore Purchases</Text>
            </TouchableOpacity>
            <Text style={styles.legalDot}>•</Text>
            <TouchableOpacity onPress={() => Alert.alert('Terms of Service', 'Terms of service content.')}>
              <Text style={styles.legalLink}>Terms</Text>
            </TouchableOpacity>
            <Text style={styles.legalDot}>•</Text>
            <TouchableOpacity onPress={() => Alert.alert('Privacy Policy', 'Privacy policy content.')}>
              <Text style={styles.legalLink}>Privacy</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.disclaimerText}>
            Payment will be charged to your Apple ID or Google Play account at confirmation of purchase. Subscription automatically renews unless cancelled at least 24 hours prior to the end of the current period.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm
  },
  proTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.goldLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.full
  },
  proTagText: {
    ...typography.captionBold,
    fontSize: 11,
    color: colors.goldDark,
    marginLeft: 4,
    letterSpacing: 1
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle
  },
  container: {
    flex: 1
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xxl
  },
  heroSection: {
    marginTop: spacing.sm,
    marginBottom: spacing.base
  },
  heroTitle: {
    ...typography.display,
    fontSize: 26,
    lineHeight: 32,
    marginTop: spacing.xs,
    marginBottom: spacing.xs
  },
  heroSubtitle: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary
  },
  timelineCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md
  },
  timelineCardTitle: {
    ...typography.title3,
    fontSize: 15,
    fontWeight: '700'
  },
  calibPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full
  },
  calibDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
    marginRight: 5
  },
  calibText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.primary
  },
  comparisonGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm
  },
  comparePhotoCol: {
    flex: 1,
    alignItems: 'center'
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radii.md,
    overflow: 'hidden',
    position: 'relative'
  },
  compareThumb: {
    width: '100%',
    height: '100%'
  },
  dayBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(23, 22, 21, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs
  },
  dayBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textInverse,
    letterSpacing: 0.5
  },
  dayBadgeGold: {
    backgroundColor: colors.goldDark
  },
  dayBadgeTextGold: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textInverse,
    letterSpacing: 0.5
  },
  compareMeta: {
    ...typography.caption,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
    color: colors.textSecondary
  },
  compareArrow: {
    width: 32,
    alignItems: 'center'
  },
  lightingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight
  },
  lightingNoticeText: {
    ...typography.caption,
    fontSize: 10,
    lineHeight: 14,
    color: colors.textTertiary,
    marginLeft: 6,
    flex: 1
  },
  benefitsSection: {
    marginBottom: spacing.lg
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md
  },
  benefitIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    marginTop: 2
  },
  benefitTextWrap: {
    flex: 1
  },
  benefitTitle: {
    ...typography.bodyBold,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 2
  },
  benefitDesc: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary
  },
  planSelector: {
    marginBottom: spacing.base
  },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.subtle
  },
  planCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface
  },
  planBadgeRibbon: {
    backgroundColor: colors.primary,
    paddingVertical: 4,
    paddingHorizontal: spacing.md,
    alignItems: 'center'
  },
  planBadgeRibbonText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textInverse,
    letterSpacing: 1
  },
  planCardContent: {
    padding: spacing.base
  },
  planRadioRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md
  },
  radioOuterSelected: {
    borderColor: colors.primary
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary
  },
  planTitles: {
    flex: 1
  },
  planName: {
    ...typography.bodyBold,
    fontSize: 15,
    color: colors.textPrimary
  },
  planTrialLabel: {
    ...typography.caption,
    fontSize: 12,
    color: colors.goldDark,
    marginTop: 2,
    fontWeight: '600'
  },
  planPriceCol: {
    alignItems: 'flex-end'
  },
  planPriceMain: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary
  },
  planPerMonth: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary
  },
  subscribeBtn: {
    borderRadius: radii.md,
    overflow: 'hidden',
    marginTop: spacing.xs,
    ...shadows.primary
  },
  subscribeBtnDisabled: {
    opacity: 0.6
  },
  subscribeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.xl
  },
  subscribeBtnText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
    marginRight: spacing.sm,
    letterSpacing: 0.3
  },
  trialTerms: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 16
  },
  freeEscapeHatch: {
    marginTop: spacing.base,
    paddingVertical: spacing.sm,
    alignItems: 'center'
  },
  freeEscapeText: {
    ...typography.captionBold,
    fontSize: 13,
    color: colors.textSecondary,
    textDecorationLine: 'underline'
  },
  legalFooter: {
    marginTop: spacing.xl,
    paddingTop: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    alignItems: 'center'
  },
  legalLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm
  },
  legalLink: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textTertiary
  },
  legalDot: {
    marginHorizontal: 8,
    color: colors.border
  },
  disclaimerText: {
    ...typography.caption,
    fontSize: 10,
    lineHeight: 14,
    color: colors.textTertiary,
    textAlign: 'center'
  }
});
