import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  OnboardingStep,
  PrimaryGoalOption,
  PhotoStorageChoice,
  SkinFeelOption,
  SensitivityLevelOption,
  CurrentActiveOption,
  ExistingRoutineOption,
  ShelfScanChoice,
  DesiredComplexityOption,
  TimeCommitmentOption,
  SunscreenHabitOption,
  BudgetPreferenceOption,
  ProductAvoidanceOption,
  PrimaryMotivationOption,
  SubscriptionOfferingPayload,
  SubscriptionPlanOffering
} from '@asmr/shared';
import { colors, spacing, typography, radii, shadows, gradients } from '../../src/theme/tokens';
import { localImages } from '../../src/theme/images';
import { useOnboarding } from '../../src/hooks/useOnboarding';
import { SubscriptionService } from '../../src/services/subscription-service';

export default function OnboardingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ step?: string; variant?: string }>();
  const insets = useSafeAreaInsets();
  const { state, loading, next, back, complete, updateState } = useOnboarding();

  // Dynamic Subscription Offering
  const [offering, setOffering] = useState<SubscriptionOfferingPayload | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('pro_annual_3999_7dt');
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Scan & On-Device QA simulation state
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatusText, setScanStatusText] = useState('Position your face');
  const [isScanning, setIsScanning] = useState(false);

  // Soft age gate modal state
  const [showUnderageNotice, setShowUnderageNotice] = useState(false);

  // Processing cloud scan simulation state (post-payment)
  const [cloudProcessStep, setCloudProcessStep] = useState(0);

  // Plan generation simulation state
  const [genStep, setGenStep] = useState(0);

  // Multi-select temporary states
  const [selectedGoals, setSelectedGoals] = useState<PrimaryGoalOption[]>(state.selectedGoals || []);
  const [selectedActives, setSelectedActives] = useState<CurrentActiveOption[]>(state.currentActives || []);
  const [selectedAvoids, setSelectedAvoids] = useState<ProductAvoidanceOption[]>(state.productPreferencesToAvoid || []);

  useEffect(() => {
    async function loadOffering() {
      const off = await SubscriptionService.getOffering(params.variant as any);
      setOffering(off);
      setSelectedPlanId(off.defaultPlanId);
    }
    loadOffering();
  }, [params.variant]);

  useEffect(() => {
    if (state.selectedGoals) setSelectedGoals(state.selectedGoals);
    if (state.currentActives) setSelectedActives(state.currentActives);
    if (state.productPreferencesToAvoid) setSelectedAvoids(state.productPreferencesToAvoid);
  }, [state]);

  const activeStep: OnboardingStep = (params.step as OnboardingStep) || state.currentStep;

  // Auto-run cloud scan processing when reaching PROCESSING_SCAN
  useEffect(() => {
    if (activeStep === 'PROCESSING_SCAN') {
      setCloudProcessStep(1);
      const t1 = setTimeout(() => setCloudProcessStep(2), 700);
      const t2 = setTimeout(() => setCloudProcessStep(3), 1500);
      const t3 = setTimeout(() => {
        setCloudProcessStep(4);
        setTimeout(() => next('WOW_SNAPSHOT'), 500);
      }, 2300);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [activeStep]);

  // Auto-run plan gen when reaching PLAN_GENERATION
  useEffect(() => {
    if (activeStep === 'PLAN_GENERATION' && genStep === 0) {
      handleStartPlanGen();
    }
  }, [activeStep, genStep]);

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Handle guided on-device scan simulation (FREE / LOCAL QA ONLY)
  const handleStartOnDeviceScan = () => {
    setIsScanning(true);
    setScanProgress(0);
    setScanStatusText('Verifying face centering & lighting...');

    setTimeout(() => {
      setScanProgress(0.4);
      setScanStatusText('Analyzing focal distance & 5200K daylight...');
    }, 800);

    setTimeout(() => {
      setScanProgress(0.85);
      setScanStatusText('Local optical verification complete!');
    }, 1600);

    setTimeout(() => {
      setScanProgress(1.0);
      setIsScanning(false);
      next('PRE_PAYWALL_READY');
    }, 2200);
  };

  // Handle Paywall Purchase -> Verify server entitlement -> Advance to PROCESSING_SCAN
  const handlePaywallPurchase = async () => {
    setIsPurchasing(true);
    try {
      // 1. Client completes purchase
      await SubscriptionService.purchasePlan(selectedPlanId);

      // 2. Server entitlement verification check
      const isEntitled = await SubscriptionService.verifyEntitlementServerSide('usr_current');
      setIsPurchasing(false);

      if (isEntitled) {
        next('PROCESSING_SCAN', {
          hasSubscribedAtPaywall: true,
          subscribedPlanId: selectedPlanId
        });
      } else {
        Alert.alert('Subscription Pending', 'Verifying your membership with the App Store. Please try again in a moment.');
      }
    } catch (err: any) {
      setIsPurchasing(false);
      Alert.alert('Purchase Error', err.message || 'Unable to complete purchase.');
    }
  };

  // Handle plan generation simulation
  const handleStartPlanGen = () => {
    setGenStep(1);
    setTimeout(() => setGenStep(2), 700);
    setTimeout(() => setGenStep(3), 1400);
    setTimeout(() => setGenStep(4), 2100);
  };

  // Toggle helpers for multi-select
  const toggleGoal = (goal: PrimaryGoalOption) => {
    if (selectedGoals.includes(goal)) {
      setSelectedGoals(selectedGoals.filter(g => g !== goal));
    } else {
      if (selectedGoals.length >= 2) {
        Alert.alert('Maximum 2 Goals', 'Please select up to 2 primary focus areas for your baseline.');
        return;
      }
      setSelectedGoals([...selectedGoals, goal]);
    }
  };

  const toggleActive = (active: CurrentActiveOption) => {
    if (active === 'none') {
      setSelectedActives(['none']);
      return;
    }
    const filtered = selectedActives.filter(a => a !== 'none');
    if (filtered.includes(active)) {
      setSelectedActives(filtered.filter(a => a !== active));
    } else {
      setSelectedActives([...filtered, active]);
    }
  };

  const toggleAvoid = (avoid: ProductAvoidanceOption) => {
    if (avoid === 'nothing_specific') {
      setSelectedAvoids(['nothing_specific']);
      return;
    }
    const filtered = selectedAvoids.filter(a => a !== 'nothing_specific');
    if (filtered.includes(avoid)) {
      setSelectedAvoids(filtered.filter(a => a !== avoid));
    } else {
      setSelectedAvoids([...filtered, avoid]);
    }
  };

  // Step Progress Counter
  const stepNumberMap: Partial<Record<OnboardingStep, number>> = {
    SKIN_FEEL: 1,
    SENSITIVITY: 2,
    CURRENT_ACTIVES: 3,
    KNOWN_REACTIONS: 4,
    EXISTING_ROUTINE: 5,
    SHELF_CAPTURE_PROMPT: 6,
    DESIRED_COMPLEXITY: 7,
    TIME_COMMITMENT: 8,
    SUNSCREEN_HABIT: 9,
    BUDGET_PREFERENCE: 10,
    PRODUCT_PREFERENCES: 11,
    COUNTRY_SELECT: 12,
    PRIMARY_MOTIVATION: 13
  };

  const currentStepNum = stepNumberMap[activeStep];

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Top Header Navigation */}
      {activeStep !== 'WELCOME' &&
        activeStep !== 'HARD_PAYWALL' &&
        activeStep !== 'PROCESSING_SCAN' &&
        activeStep !== 'PLAN_GENERATION' && (
          <View style={styles.navHeader}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={back}
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>

            {currentStepNum && (
              <View style={styles.stepProgressPill}>
                <Text style={styles.stepProgressText}>STEP {currentStepNum} OF 13</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.skipBtn}
              onPress={() => {
                if (currentStepNum) {
                  next('PLAN_GENERATION');
                }
              }}
            >
              {currentStepNum ? <Text style={styles.skipBtnText}>Skip</Text> : <View style={{ width: 40 }} />}
            </TouchableOpacity>
          </View>
        )}

      {/* STEP 1: WELCOME */}
      {activeStep === 'WELCOME' && (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.welcomeContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.welcomeHeroImageWrap}>
            <Image
              source={localImages.morningGlow}
              style={styles.welcomeHeroImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', colors.background]}
              style={styles.imageGradientOverlay}
            />
            <View style={styles.welcomeBadgeRow}>
              <View style={styles.welcomePill}>
                <Ionicons name="sparkles" size={12} color={colors.primary} />
                <Text style={styles.welcomePillText}>AI SKIN COACH</Text>
              </View>
            </View>
          </View>

          <View style={styles.welcomeBody}>
            <Text style={typography.eyebrow}>CALM • ACCURATE • CONSISTENT</Text>
            <Text style={styles.welcomeTitle}>Meet your personal{'\n'}Skin Coach</Text>
            <Text style={styles.welcomeSubtitle}>
              Understand your skin, build a simple routine, and track how it changes over time.
            </Text>

            <View style={styles.featurePillRow}>
              <View style={styles.welcomeFeatureItem}>
                <Ionicons name="scan" size={16} color={colors.primary} />
                <Text style={styles.welcomeFeatureText}>Guided Macro Scan</Text>
              </View>
              <View style={styles.welcomeFeatureItem}>
                <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
                <Text style={styles.welcomeFeatureText}>Ingredient Safety</Text>
              </View>
              <View style={styles.welcomeFeatureItem}>
                <Ionicons name="calendar" size={16} color={colors.primary} />
                <Text style={styles.welcomeFeatureText}>42-Day Tracking</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              onPress={() => next('AGE_GATE')}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryLight]}
                style={styles.primaryBtnGradient}
              >
                <Text style={styles.primaryBtnText}>Check my skin</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.textInverse} />
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.medicalDisclaimerText}>
              Cosmetic skincare guidance only. Not a medical diagnosis.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* STEP 2: AGE GATE */}
      {activeStep === 'AGE_GATE' && (
        <View style={styles.stepContainer}>
          <View style={styles.questionHeader}>
            <Text style={typography.eyebrow}>SAFETY GATE</Text>
            <Text style={styles.questionTitle}>Are you 18 or older?</Text>
            <Text style={styles.questionSubtitle}>
              Personalized cosmetic routines and active ingredient recommendations are formulated specifically for adult skin biology.
            </Text>
          </View>

          <View style={styles.optionsList}>
            <TouchableOpacity
              style={styles.optionCard}
              activeOpacity={0.8}
              onPress={() => next('GOALS', { isAdult18Plus: true })}
            >
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Yes, I'm 18 or older</Text>
                <Text style={styles.optionDesc}>Continue to select your cosmetic goals.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionCard}
              activeOpacity={0.8}
              onPress={() => setShowUnderageNotice(true)}
            >
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>No, I'm under 18</Text>
                <Text style={styles.optionDesc}>Adolescent skin guidance notice.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {showUnderageNotice && (
            <View style={styles.noticeModalCard}>
              <Ionicons name="information-circle" size={24} color={colors.terracotta} />
              <Text style={styles.noticeModalTitle}>Adult Skincare Guidance Only</Text>
              <Text style={styles.noticeModalDesc}>
                ASMR Beauty Pro is currently designed for adults 18 and older. For teen skincare advice, we encourage consulting a board-certified dermatologist or healthcare provider.
              </Text>
              <TouchableOpacity
                style={styles.noticeModalBtn}
                onPress={() => setShowUnderageNotice(false)}
              >
                <Text style={styles.noticeModalBtnText}>Understood</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* STEP 3: GOALS */}
      {activeStep === 'GOALS' && (
        <View style={styles.stepContainer}>
          <View style={styles.questionHeader}>
            <Text style={typography.eyebrow}>FOCUS PRIORITIES</Text>
            <Text style={styles.questionTitle}>What would you like to focus on right now?</Text>
            <Text style={styles.questionSubtitle}>
              Select up to 2 areas. Your Skin Coach will calibrate your baseline around these.
            </Text>
          </View>

          <ScrollView style={styles.optionsScroll} showsVerticalScrollIndicator={false}>
            {[
              { id: 'fewer_visible_breakouts', label: 'Fewer visible breakouts' },
              { id: 'calmer_looking_redness', label: 'Calmer-looking redness' },
              { id: 'smoother_looking_texture', label: 'Smoother-looking texture' },
              { id: 'less_noticeable_pores', label: 'Less noticeable pores' },
              { id: 'more_even_looking_tone', label: 'More even-looking tone' },
              { id: 'more_hydration_less_dryness', label: 'More hydration & less dryness' },
              { id: 'less_shine_oiliness', label: 'Less shine & surface oiliness' },
              { id: 'dark_circle_appearance', label: 'Dark-circle appearance' },
              { id: 'fine_line_appearance', label: 'Fine-line appearance' },
              { id: 'unsure_help_me_decide', label: 'Unsure — help me decide' }
            ].map(item => {
              const isSelected = selectedGoals.includes(item.id as PrimaryGoalOption);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.multiOptionCard, isSelected && styles.multiOptionCardSelected]}
                  activeOpacity={0.8}
                  onPress={() => toggleGoal(item.id as PrimaryGoalOption)}
                >
                  <Text style={[styles.multiOptionTitle, isSelected && styles.multiOptionTitleSelected]}>
                    {item.label}
                  </Text>
                  <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                    {isSelected && <Ionicons name="checkmark" size={14} color={colors.textInverse} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={[styles.primaryBtn, selectedGoals.length === 0 && styles.primaryBtnDisabled]}
              disabled={selectedGoals.length === 0}
              activeOpacity={0.85}
              onPress={() => next('SNAPSHOT_EXPLAINER', { selectedGoals })}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryLight]}
                style={styles.primaryBtnGradient}
              >
                <Text style={styles.primaryBtnText}>
                  Continue ({selectedGoals.length}/2 selected)
                </Text>
                <Ionicons name="arrow-forward" size={18} color={colors.textInverse} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* STEP 4: SNAPSHOT EXPLAINER */}
      {activeStep === 'SNAPSHOT_EXPLAINER' && (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.explainerContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.questionHeader}>
            <Text style={typography.eyebrow}>CALIBRATED ANALYSIS</Text>
            <Text style={styles.questionTitle}>What your Skin Snapshot will analyze</Text>
            <Text style={styles.questionSubtitle}>
              Before you look into the camera, here is how our computer vision maps your cosmetic baseline:
            </Text>
          </View>

          <View style={styles.explainerCardList}>
            <View style={styles.explainerItem}>
              <View style={styles.explainerIconWrap}>
                <Ionicons name="water-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.explainerTextWrap}>
                <Text style={styles.explainerItemTitle}>Surface Hydration Balance</Text>
                <Text style={styles.explainerItemDesc}>
                  Measures moisture retention across your cheeks and forehead to prevent barrier dehydration.
                </Text>
              </View>
            </View>

            <View style={styles.explainerItem}>
              <View style={styles.explainerIconWrap}>
                <Ionicons name="leaf-outline" size={20} color={colors.terracotta} />
              </View>
              <View style={styles.explainerTextWrap}>
                <Text style={styles.explainerItemTitle}>Visible Surface Redness</Text>
                <Text style={styles.explainerItemDesc}>
                  Observes capillary flush and surface reactivity to pinpoint soothing active needs.
                </Text>
              </View>
            </View>

            <View style={styles.explainerItem}>
              <View style={styles.explainerIconWrap}>
                <Ionicons name="sparkles-outline" size={20} color={colors.goldDark} />
              </View>
              <View style={styles.explainerTextWrap}>
                <Text style={styles.explainerItemTitle}>Pore Appearance & Texture</Text>
                <Text style={styles.explainerItemDesc}>
                  Analyzes micro-texture smoothness, shine balance, and T-zone oil distribution.
                </Text>
              </View>
            </View>

            <View style={styles.explainerItem}>
              <View style={styles.explainerIconWrap}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.routineDone} />
              </View>
              <View style={styles.explainerTextWrap}>
                <Text style={styles.explainerItemTitle}>Ingredient Compatibility</Text>
                <Text style={styles.explainerItemDesc}>
                  Screens products before you use them to prevent conflicting actives and skin irritation.
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            onPress={() => next('PHOTO_PRIVACY')}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryLight]}
              style={styles.primaryBtnGradient}
            >
              <Text style={styles.primaryBtnText}>Open Camera Preview</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.textInverse} />
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* STEP 5: PHOTO PRIVACY */}
      {activeStep === 'PHOTO_PRIVACY' && (
        <View style={styles.stepContainer}>
          <View style={styles.questionHeader}>
            <Text style={typography.eyebrow}>DATA PRIVACY</Text>
            <Text style={styles.questionTitle}>How should we handle your photos?</Text>
            <Text style={styles.questionSubtitle}>
              You are in complete control of how your visual progress is stored.
            </Text>
          </View>

          <View style={styles.optionsList}>
            <TouchableOpacity
              style={styles.privacyCard}
              activeOpacity={0.85}
              onPress={() => next('GUIDED_SCAN', { photoStoragePreference: 'save_progress_photos' })}
            >
              <View style={styles.privacyCardTop}>
                <View style={styles.privacyIconWrap}>
                  <Ionicons name="images-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.badgeRecommend}>
                  <Text style={styles.badgeRecommendText}>RECOMMENDED</Text>
                </View>
              </View>
              <Text style={styles.privacyTitle}>Save progress photos</Text>
              <Text style={styles.privacyDesc}>
                Store photos securely encrypted so you can visually compare Day 1 vs Day 14, 30, and 42 changes.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.privacyCard}
              activeOpacity={0.85}
              onPress={() => next('GUIDED_SCAN', { photoStoragePreference: 'delete_after_analysis' })}
            >
              <View style={styles.privacyCardTop}>
                <View style={styles.privacyIconWrap}>
                  <Ionicons name="trash-outline" size={20} color={colors.terracotta} />
                </View>
                <View style={styles.badgePrivacy}>
                  <Text style={styles.badgePrivacyText}>EPHEMERAL</Text>
                </View>
              </View>
              <Text style={styles.privacyTitle}>Delete scan photos after analysis</Text>
              <Text style={styles.privacyDesc}>
                We calculate your cosmetic skin metrics and immediately discard the raw photo from our servers. Only numbers are retained.
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.privacyTrustPill}>
            <Ionicons name="lock-closed" size={14} color={colors.goldDark} />
            <Text style={styles.privacyTrustText}>
              We never sell your photos or use them to train public models.
            </Text>
          </View>
        </View>
      )}

      {/* STEP 6: GUIDED SCAN (FREE / ON-DEVICE QA ONLY) */}
      {activeStep === 'GUIDED_SCAN' && (
        <View style={styles.scanScreenContainer}>
          <View style={styles.scanReticleContainer}>
            <Image
              source={localImages.scanPortrait}
              style={styles.scanBackdropImage}
              resizeMode="cover"
            />
            <View style={styles.scanOverlay} />

            <View style={styles.faceOvalReticle}>
              <View style={styles.reticleCornerTL} />
              <View style={styles.reticleCornerTR} />
              <View style={styles.reticleCornerBL} />
              <View style={styles.reticleCornerBR} />
              {isScanning && (
                <LinearGradient
                  colors={['transparent', 'rgba(197, 154, 111, 0.4)', 'transparent']}
                  style={styles.laserScanBar}
                />
              )}
            </View>

            <View style={styles.guidanceChip}>
              <View style={[styles.guidanceDot, isScanning && styles.guidanceDotActive]} />
              <Text style={styles.guidanceChipText}>{scanStatusText}</Text>
            </View>
          </View>

          <View style={styles.scanControlsSection}>
            <Text style={styles.scanInstruction}>
              Hold steady in good natural lighting. Keep a neutral, relaxed expression.
            </Text>

            {!isScanning ? (
              <TouchableOpacity
                style={styles.shutterBtnOuter}
                activeOpacity={0.8}
                onPress={handleStartOnDeviceScan}
              >
                <View style={styles.shutterBtnInner} />
              </TouchableOpacity>
            ) : (
              <View style={styles.scanProgressWrap}>
                <ActivityIndicator size="small" color={colors.primary} style={{ marginBottom: 8 }} />
                <Text style={styles.scanProgressPercent}>
                  {Math.round(scanProgress * 100)}%
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* STEP 7: PRE_PAYWALL_READY (CURIOSITY BRIDGE) */}
      {activeStep === 'PRE_PAYWALL_READY' && (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.prePaywallContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.readyBadgePill}>
            <Ionicons name="checkmark-circle" size={14} color={colors.routineDone} />
            <Text style={styles.readyBadgeText}>OPTICAL QA PASSED</Text>
          </View>

          <Text style={styles.readyHeroTitle}>You're ready for your{'\n'}Skin Snapshot</Text>
          <Text style={styles.readyHeroSubtitle}>
            Your camera capture passed all on-device quality checks. Your photo is framed with clean daylight clarity.
          </Text>

          {/* Locked Preview Card */}
          <View style={styles.lockedPreviewCard}>
            <View style={styles.previewThumbRow}>
              <Image source={localImages.skinBefore} style={styles.previewThumb} />
              <View style={styles.previewThumbInfo}>
                <Text style={styles.previewThumbTitle}>Baseline Capture #1</Text>
                <Text style={styles.previewThumbMeta}>5200K Daylight Match • Frontal Angle</Text>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>READY FOR ANALYSIS</Text>
                </View>
              </View>
            </View>

            <View style={styles.lockedItemsList}>
              <View style={styles.lockedItemRow}>
                <Ionicons name="lock-closed" size={14} color={colors.goldDark} />
                <Text style={styles.lockedItemText}>Surface Hydration & Moisture Barrier Index</Text>
              </View>
              <View style={styles.lockedItemRow}>
                <Ionicons name="lock-closed" size={14} color={colors.goldDark} />
                <Text style={styles.lockedItemText}>Visible Redness & Calmness Mapping</Text>
              </View>
              <View style={styles.lockedItemRow}>
                <Ionicons name="lock-closed" size={14} color={colors.goldDark} />
                <Text style={styles.lockedItemText}>Pore Appearance & Texture Metrics</Text>
              </View>
              <View style={styles.lockedItemRow}>
                <Ionicons name="lock-closed" size={14} color={colors.goldDark} />
                <Text style={styles.lockedItemText}>Personalized 42-Day Consistency Routine</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            onPress={() => next('HARD_PAYWALL')}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryLight]}
              style={styles.primaryBtnGradient}
            >
              <Text style={styles.primaryBtnText}>Continue to My Snapshot</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.textInverse} />
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.noRiskSubtext}>
            Curated skincare intelligence. Zero advertisements.
          </Text>
        </ScrollView>
      )}

      {/* STEP 8: HARD PAYWALL */}
      {activeStep === 'HARD_PAYWALL' && offering && (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.paywallContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.paywallHeader}>
            <View style={styles.proPill}>
              <Ionicons name="sparkles" size={12} color={colors.goldDark} />
              <Text style={styles.proPillText}>MEMBERSHIP REQUIRED</Text>
            </View>
            <Text style={styles.paywallMainTitle}>{offering.headline}</Text>
            <Text style={styles.paywallMainSubtitle}>{offering.supportingCopy}</Text>
          </View>

          {/* Macro Visual Proof Card */}
          <View style={styles.macroProofCard}>
            <View style={styles.macroHeaderRow}>
              <Text style={styles.macroTitle}>Macro Skin Observation</Text>
              <View style={styles.calibPill}>
                <View style={styles.calibDot} />
                <Text style={styles.calibText}>CALIBRATED 5200K</Text>
              </View>
            </View>

            <View style={styles.macroGrid}>
              <View style={styles.macroCol}>
                <View style={styles.macroImgWrap}>
                  <Image source={localImages.skinBefore} style={styles.macroImg} resizeMode="cover" />
                </View>
                <Text style={styles.macroLabel}>Day 1 Baseline</Text>
              </View>
              <View style={styles.macroArrow}>
                <Ionicons name="arrow-forward" size={16} color={colors.goldDark} />
              </View>
              <View style={styles.macroCol}>
                <View style={styles.macroImgWrap}>
                  <Image source={localImages.skinAfter} style={styles.macroImg} resizeMode="cover" />
                </View>
                <Text style={[styles.macroLabel, { color: colors.goldDark, fontWeight: '700' }]}>
                  Day 42 Calmer Tone
                </Text>
              </View>
            </View>
          </View>

          {/* 8 Core Benefits */}
          <View style={styles.paywallBenefitsList}>
            {offering.benefits.map((benefit, idx) => (
              <View key={idx} style={styles.paywallBenefitItem}>
                <View style={styles.paywallBenefitIcon}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                </View>
                <Text style={styles.paywallBenefitText}>{benefit}</Text>
              </View>
            ))}
          </View>

          {/* Dynamic Plan Selector */}
          <View style={styles.planSelectorBox}>
            {offering.plans.map((plan: SubscriptionPlanOffering) => {
              const isSelected = selectedPlanId === plan.id;
              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[styles.planOptionCard, isSelected && styles.planOptionCardSelected]}
                  activeOpacity={0.85}
                  onPress={() => setSelectedPlanId(plan.id)}
                >
                  {plan.badgeLabel && (
                    <View style={styles.planBadgeBanner}>
                      <Text style={styles.planBadgeBannerText}>{plan.badgeLabel}</Text>
                    </View>
                  )}
                  <View style={styles.planCardBody}>
                    <View style={styles.planRadioCol}>
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                    </View>
                    <View style={styles.planInfoCol}>
                      <Text style={styles.planTitleText}>{plan.title}</Text>
                      <Text style={styles.planPeriodText}>
                        {plan.hasFreeTrial
                          ? `Includes ${plan.trialDays}-day free trial`
                          : plan.billingPeriod === 'annual'
                          ? 'Billed annually'
                          : 'Billed monthly, cancel anytime'}
                      </Text>
                    </View>
                    <View style={styles.planPriceCol}>
                      <Text style={styles.planPriceValue}>${plan.priceUsd}</Text>
                      <Text style={styles.planEquivalent}>
                        {plan.billingPeriod === 'annual' ? `$${plan.perMonthEquivalentUsd}/mo` : '/month'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Primary Result-Driven CTA */}
          <TouchableOpacity
            style={[styles.primaryBtn, isPurchasing && styles.primaryBtnDisabled]}
            disabled={isPurchasing}
            activeOpacity={0.85}
            onPress={handlePaywallPurchase}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryLight]}
              style={styles.primaryBtnGradient}
            >
              {isPurchasing ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>{offering.primaryCtaText}</Text>
                  <Ionicons name="sparkles" size={18} color={colors.textInverse} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.paywallTrialTerms}>
            {selectedPlanId.includes('7dt')
              ? 'Free for 7 days, then $39.99/year. Cancel anytime in App Store settings.'
              : '$39.99/year or $6.99/month. Direct access to your Skin Snapshot.'}
          </Text>

          <View style={styles.securityExplanationCard}>
            <Ionicons name="shield-checkmark" size={14} color={colors.goldDark} />
            <Text style={styles.securityExplanationText}>
              Every snapshot is computed with dermatological-grade optical precision. We do not sell your photos or display ads.
            </Text>
          </View>

          {/* Legal Footer */}
          <View style={styles.paywallLegalRow}>
            <TouchableOpacity onPress={() => Alert.alert('Restore', 'Checking active subscriptions...')}>
              <Text style={styles.legalLinkText}>Restore Purchases</Text>
            </TouchableOpacity>
            <Text style={styles.legalDot}>•</Text>
            <TouchableOpacity onPress={() => Alert.alert('Terms', 'Terms of Service')}>
              <Text style={styles.legalLinkText}>Terms</Text>
            </TouchableOpacity>
            <Text style={styles.legalDot}>•</Text>
            <TouchableOpacity onPress={() => Alert.alert('Privacy', 'Privacy Policy')}>
              <Text style={styles.legalLinkText}>Privacy</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* STEP 9: PROCESSING SCAN (POST-PURCHASE ENTITLED CLOUD EXECUTION) */}
      {activeStep === 'PROCESSING_SCAN' && (
        <View style={[styles.screen, styles.center, { paddingHorizontal: spacing.xl }]}>
          <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: spacing.lg }} />
          <Text style={styles.processingTitle}>Calculating Skin Snapshot</Text>
          <Text style={styles.processingSubtitle}>
            {cloudProcessStep === 1 && 'Verifying Pro entitlement server-side...'}
            {cloudProcessStep === 2 && 'Mapping visible skin features with specialized optical engine...'}
            {cloudProcessStep === 3 && 'Calibrating surface hydration & redness baseline...'}
            {cloudProcessStep === 4 && 'Your snapshot is ready!'}
          </Text>
        </View>
      )}

      {/* STEP 10: WOW SNAPSHOT (REVEAL) */}
      {activeStep === 'WOW_SNAPSHOT' && (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.wowContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.wowHeader}>
            <View style={styles.wowBadgePill}>
              <Ionicons name="sparkles" size={12} color={colors.primary} />
              <Text style={styles.wowBadgeText}>BASELINE ESTABLISHED</Text>
            </View>
            <Text style={styles.wowTitle}>Your Skin Snapshot</Text>
            <Text style={styles.wowSubtitle}>
              Observational metrics calculated from your neutral baseline scan.
            </Text>
          </View>

          <View style={styles.focusCardsList}>
            <View style={styles.focusCard}>
              <View style={styles.focusIconWrap}>
                <Ionicons name="water-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.focusDetails}>
                <Text style={styles.focusAreaName}>Surface Hydration</Text>
                <Text style={styles.focusStatusGood}>Balanced & Receptive</Text>
                <Text style={styles.focusNote}>Cheek barrier shows healthy moisture retention.</Text>
              </View>
            </View>

            <View style={styles.focusCard}>
              <View style={styles.focusIconWrap}>
                <Ionicons name="leaf-outline" size={20} color={colors.caution} />
              </View>
              <View style={styles.focusDetails}>
                <Text style={styles.focusAreaName}>Visible Surface Redness</Text>
                <Text style={styles.focusStatusCaution}>Mild Cheek Flush</Text>
                <Text style={styles.focusNote}>Suggests soothing ingredients like centella or panthenol.</Text>
              </View>
            </View>

            <View style={styles.focusCard}>
              <View style={styles.focusIconWrap}>
                <Ionicons name="sparkles-outline" size={20} color={colors.goldDark} />
              </View>
              <View style={styles.focusDetails}>
                <Text style={styles.focusAreaName}>Pore Appearance & Texture</Text>
                <Text style={styles.focusStatusGood}>Smooth Baseline</Text>
                <Text style={styles.focusNote}>Mild shine in T-zone without heavy congestion.</Text>
              </View>
            </View>
          </View>

          <View style={styles.coachSnapshotCallout}>
            <View style={styles.coachAvatarRow}>
              <Image source={localImages.coachPortrait} style={styles.coachSmallAvatar} />
              <View>
                <Text style={styles.coachName}>AI Skin Coach</Text>
                <Text style={styles.coachTitle}>Initial Assessment</Text>
              </View>
            </View>
            <Text style={styles.coachQuoteText}>
              "Your skin looks calm and receptive. A simple 3-step routine will help protect your moisture barrier and reduce visible redness."
            </Text>
          </View>

          <View style={styles.bridgeSection}>
            <Text style={styles.bridgePrompt}>
              To formulate a routine compatible with your exact sensitivities, budget, and daily schedule:
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              onPress={() => next('SKIN_FEEL')}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryLight]}
                style={styles.primaryBtnGradient}
              >
                <Text style={styles.primaryBtnText}>Personalize My Routine</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.textInverse} />
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.bridgeEstimate}>Takes ~60 seconds • 1-tap questions</Text>
          </View>
        </ScrollView>
      )}

      {/* STEP 11: SKIN FEEL */}
      {activeStep === 'SKIN_FEEL' && (
        <View style={styles.stepContainer}>
          <View style={styles.questionHeader}>
            <Text style={typography.eyebrow}>STEP 1 OF 13</Text>
            <Text style={styles.questionTitle}>How does your skin feel by midday?</Text>
            <Text style={styles.questionSubtitle}>Helps select the ideal moisturizer texture and weight.</Text>
          </View>

          <ScrollView style={styles.optionsScroll} showsVerticalScrollIndicator={false}>
            {[
              { id: 'tight_or_dry', label: 'Tight, dry, or flaky' },
              { id: 'oily_or_shiny', label: 'Oily or shiny across forehead and cheeks' },
              { id: 'combination_dry_and_oily', label: 'Combination (oily T-zone, dry cheeks)' },
              { id: 'comfortable_balanced', label: 'Comfortable & balanced' },
              { id: 'changes_a_lot', label: 'Changes a lot depending on weather' },
              { id: 'unsure', label: 'Not sure' }
            ].map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.optionCard}
                activeOpacity={0.8}
                onPress={() => next('SENSITIVITY', { skinFeelByEndOfDay: item.id as SkinFeelOption })}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* STEP 12: SENSITIVITY */}
      {activeStep === 'SENSITIVITY' && (
        <View style={styles.stepContainer}>
          <View style={styles.questionHeader}>
            <Text style={typography.eyebrow}>STEP 2 OF 13</Text>
            <Text style={styles.questionTitle}>How sensitive is your skin?</Text>
            <Text style={styles.questionSubtitle}>Determines safe thresholds for active ingredient concentrations.</Text>
          </View>

          <ScrollView style={styles.optionsScroll} showsVerticalScrollIndicator={false}>
            {[
              { id: 'almost_never', label: 'Almost never reacts to new products' },
              { id: 'occasionally', label: 'Occasionally tingles or gets pink' },
              { id: 'sometimes', label: 'Easily irritated by fragrances or harsh cleansers' },
              { id: 'very_easily', label: 'Very reactive (burns or stings frequently)' },
              { id: 'unsure', label: 'Not sure' }
            ].map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.optionCard}
                activeOpacity={0.8}
                onPress={() => next('CURRENT_ACTIVES', { sensitivityLevel: item.id as SensitivityLevelOption })}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* STEP 13: CURRENT ACTIVES */}
      {activeStep === 'CURRENT_ACTIVES' && (
        <View style={styles.stepContainer}>
          <View style={styles.questionHeader}>
            <Text style={typography.eyebrow}>STEP 3 OF 13</Text>
            <Text style={styles.questionTitle}>Are you using any of these actives?</Text>
            <Text style={styles.questionSubtitle}>Prevents recommending conflicting ingredients or barrier overload.</Text>
          </View>

          <ScrollView style={styles.optionsScroll} showsVerticalScrollIndicator={false}>
            {[
              { id: 'retinoid', label: 'Retinol / Retinoids (Adapalene, Tretinoin)' },
              { id: 'exfoliating_acids', label: 'Exfoliating Acids (AHA, BHA, Glycolic, Salicylic)' },
              { id: 'vitamin_c', label: 'Vitamin C (Ascorbic Acid)' },
              { id: 'benzoyl_peroxide', label: 'Benzoyl Peroxide' },
              { id: 'none', label: 'None / Not sure of ingredients' }
            ].map(item => {
              const isSelected = selectedActives.includes(item.id as CurrentActiveOption);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.multiOptionCard, isSelected && styles.multiOptionCardSelected]}
                  activeOpacity={0.8}
                  onPress={() => toggleActive(item.id as CurrentActiveOption)}
                >
                  <Text style={[styles.multiOptionTitle, isSelected && styles.multiOptionTitleSelected]}>
                    {item.label}
                  </Text>
                  <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                    {isSelected && <Ionicons name="checkmark" size={14} color={colors.textInverse} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              onPress={() => next('KNOWN_REACTIONS', { currentActives: selectedActives })}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryLight]}
                style={styles.primaryBtnGradient}
              >
                <Text style={styles.primaryBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.textInverse} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* STEP 14: KNOWN REACTIONS */}
      {activeStep === 'KNOWN_REACTIONS' && (
        <View style={styles.stepContainer}>
          <View style={styles.questionHeader}>
            <Text style={typography.eyebrow}>STEP 4 OF 13</Text>
            <Text style={styles.questionTitle}>Any known ingredients to avoid?</Text>
            <Text style={styles.questionSubtitle}>We will strictly filter out products containing these substances.</Text>
          </View>

          <ScrollView style={styles.optionsScroll} showsVerticalScrollIndicator={false}>
            {[
              { id: 'fragrance', label: 'Synthetic fragrance / Parfum' },
              { id: 'essential_oils', label: 'Essential oils (lavender, citrus, tea tree)' },
              { id: 'heavy_feeling', label: 'Heavy mineral oil or thick petroleum' },
              { id: 'nothing_specific', label: 'None / No specific sensitivities known' }
            ].map(item => {
              const isSelected = selectedAvoids.includes(item.id as ProductAvoidanceOption);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.multiOptionCard, isSelected && styles.multiOptionCardSelected]}
                  activeOpacity={0.8}
                  onPress={() => toggleAvoid(item.id as ProductAvoidanceOption)}
                >
                  <Text style={[styles.multiOptionTitle, isSelected && styles.multiOptionTitleSelected]}>
                    {item.label}
                  </Text>
                  <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                    {isSelected && <Ionicons name="checkmark" size={14} color={colors.textInverse} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              onPress={() =>
                next('EXISTING_ROUTINE', {
                  knownReactions: {
                    hasKnownReactions: selectedAvoids.length > 0 && !selectedAvoids.includes('nothing_specific'),
                    userReportedAllergies: [],
                    userReportedSensitivities: selectedAvoids
                  },
                  productPreferencesToAvoid: selectedAvoids
                })
              }
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryLight]}
                style={styles.primaryBtnGradient}
              >
                <Text style={styles.primaryBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.textInverse} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* STEP 15: EXISTING ROUTINE */}
      {activeStep === 'EXISTING_ROUTINE' && (
        <View style={styles.stepContainer}>
          <View style={styles.questionHeader}>
            <Text style={typography.eyebrow}>STEP 5 OF 13</Text>
            <Text style={styles.questionTitle}>What does your routine look like today?</Text>
            <Text style={styles.questionSubtitle}>We build upon your existing habits rather than overwhelming you.</Text>
          </View>

          <ScrollView style={styles.optionsScroll} showsVerticalScrollIndicator={false}>
            {[
              { id: 'nothing_yet', label: 'Nothing yet / Just wash with water' },
              { id: 'simple', label: 'Simple (Cleanser + Moisturizer)' },
              { id: 'regular', label: 'Regular (Cleanser, Serum, Moisturizer, SPF)' },
              { id: 'advanced', label: 'Advanced (4+ steps, weekly masks, actives)' }
            ].map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.optionCard}
                activeOpacity={0.8}
                onPress={() => next('SHELF_CAPTURE_PROMPT', { existingRoutineTier: item.id as ExistingRoutineOption })}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* STEP 16: SHELF CAPTURE PROMPT */}
      {activeStep === 'SHELF_CAPTURE_PROMPT' && (
        <View style={styles.stepContainer}>
          <View style={styles.questionHeader}>
            <Text style={typography.eyebrow}>STEP 6 OF 13</Text>
            <Text style={styles.questionTitle}>Do you have products you want to keep using?</Text>
            <Text style={styles.questionSubtitle}>We can review what's currently on your bathroom shelf.</Text>
          </View>

          <View style={styles.optionsList}>
            <TouchableOpacity
              style={styles.optionCard}
              activeOpacity={0.8}
              onPress={() => next('DESIRED_COMPLEXITY', { shelfScanChoice: 'scan_products' })}
            >
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Yes, I'll scan or add my shelf</Text>
                <Text style={styles.optionDesc}>Evaluate products you already own for compatibility.</Text>
              </View>
              <Ionicons name="barcode-outline" size={22} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionCard}
              activeOpacity={0.8}
              onPress={() => next('DESIRED_COMPLEXITY', { shelfScanChoice: 'later' })}
            >
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Start fresh / I'll add them later</Text>
                <Text style={styles.optionDesc}>Build a simple starter routine from scratch.</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* STEP 17: DESIRED COMPLEXITY */}
      {activeStep === 'DESIRED_COMPLEXITY' && (
        <View style={styles.stepContainer}>
          <View style={styles.questionHeader}>
            <Text style={typography.eyebrow}>STEP 7 OF 13</Text>
            <Text style={styles.questionTitle}>What routine complexity fits your lifestyle?</Text>
            <Text style={styles.questionSubtitle}>A routine you stick to every day works best.</Text>
          </View>

          <ScrollView style={styles.optionsScroll} showsVerticalScrollIndicator={false}>
            {[
              { id: 'minimal', label: 'Minimal (Cleanser, Moisturizer, SPF)' },
              { id: 'balanced', label: 'Balanced (3-4 steps morning & night)' },
              { id: 'more_steps', label: 'Comprehensive (Targeted treatments & boosters)' },
              { id: 'coach_decides', label: 'Let my Skin Coach decide based on my snapshot' }
            ].map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.optionCard}
                activeOpacity={0.8}
                onPress={() => next('TIME_COMMITMENT', { desiredComplexity: item.id as DesiredComplexityOption })}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* STEP 18: TIME COMMITMENT */}
      {activeStep === 'TIME_COMMITMENT' && (
        <View style={styles.stepContainer}>
          <View style={styles.questionHeader}>
            <Text style={typography.eyebrow}>STEP 8 OF 13</Text>
            <Text style={styles.questionTitle}>How much time do you want to spend?</Text>
            <Text style={styles.questionSubtitle}>Ensures recommendations match your morning and evening schedule.</Text>
          </View>

          <ScrollView style={styles.optionsScroll} showsVerticalScrollIndicator={false}>
            {[
              { id: 'about_2_minutes', label: 'Under 2 minutes (Quick & effortless)' },
              { id: 'about_5_minutes', label: 'About 5 minutes (Comfortable ritual)' },
              { id: 'ten_plus_minutes', label: '10+ minutes (I enjoy taking my time)' }
            ].map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.optionCard}
                activeOpacity={0.8}
                onPress={() => next('SUNSCREEN_HABIT', { timeCommitment: item.id as TimeCommitmentOption })}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* STEP 19: SUNSCREEN HABIT */}
      {activeStep === 'SUNSCREEN_HABIT' && (
        <View style={styles.stepContainer}>
          <View style={styles.questionHeader}>
            <Text style={typography.eyebrow}>STEP 9 OF 13</Text>
            <Text style={styles.questionTitle}>How often do you apply sunscreen?</Text>
            <Text style={styles.questionSubtitle}>Daily UV defense protects your skin barrier and tone consistency.</Text>
          </View>

          <ScrollView style={styles.optionsScroll} showsVerticalScrollIndicator={false}>
            {[
              { id: 'every_day', label: 'Every day without fail' },
              { id: 'most_days', label: 'Most days' },
              { id: 'mostly_sunny_days', label: 'Only when outdoors or in summer' },
              { id: 'rarely', label: 'Rarely or never' }
            ].map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.optionCard}
                activeOpacity={0.8}
                onPress={() => next('BUDGET_PREFERENCE', { sunscreenHabit: item.id as SunscreenHabitOption })}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* STEP 20: BUDGET PREFERENCE */}
      {activeStep === 'BUDGET_PREFERENCE' && (
        <View style={styles.stepContainer}>
          <View style={styles.questionHeader}>
            <Text style={typography.eyebrow}>STEP 10 OF 13</Text>
            <Text style={styles.questionTitle}>What is your product budget preference?</Text>
            <Text style={styles.questionSubtitle}>We recommend products with proven efficacy at your price range.</Text>
          </View>

          <ScrollView style={styles.optionsScroll} showsVerticalScrollIndicator={false}>
            {[
              { id: 'budget_under_15', label: 'Budget-friendly (Under $15 / item)' },
              { id: 'mid_range_15_30', label: 'Mid-range ($15 - $30 / item)' },
              { id: 'premium_30_60', label: 'Premium ($30 - $60 / item)' },
              { id: 'best_value', label: 'Best value regardless of price' }
            ].map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.optionCard}
                activeOpacity={0.8}
                onPress={() => next('PRODUCT_PREFERENCES', { budgetPreference: item.id as BudgetPreferenceOption })}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* STEP 21: PRODUCT PREFERENCES */}
      {activeStep === 'PRODUCT_PREFERENCES' && (
        <View style={styles.stepContainer}>
          <View style={styles.questionHeader}>
            <Text style={typography.eyebrow}>STEP 11 OF 13</Text>
            <Text style={styles.questionTitle}>Any formulation preferences?</Text>
            <Text style={styles.questionSubtitle}>Tailors product suggestions to match your preferences.</Text>
          </View>

          <ScrollView style={styles.optionsScroll} showsVerticalScrollIndicator={false}>
            {[
              { id: 'fragrance', label: 'Fragrance-free only' },
              { id: 'essential_oils', label: 'No essential oils' },
              { id: 'heavy_feeling', label: 'Non-comedogenic & lightweight' },
              { id: 'nothing_specific', label: 'No specific restrictions' }
            ].map(item => {
              const isSelected = selectedAvoids.includes(item.id as ProductAvoidanceOption);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.multiOptionCard, isSelected && styles.multiOptionCardSelected]}
                  activeOpacity={0.8}
                  onPress={() => toggleAvoid(item.id as ProductAvoidanceOption)}
                >
                  <Text style={[styles.multiOptionTitle, isSelected && styles.multiOptionTitleSelected]}>
                    {item.label}
                  </Text>
                  <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                    {isSelected && <Ionicons name="checkmark" size={14} color={colors.textInverse} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              onPress={() => next('COUNTRY_SELECT', { productPreferencesToAvoid: selectedAvoids })}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryLight]}
                style={styles.primaryBtnGradient}
              >
                <Text style={styles.primaryBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.textInverse} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* STEP 22: COUNTRY SELECT */}
      {activeStep === 'COUNTRY_SELECT' && (
        <View style={styles.stepContainer}>
          <View style={styles.questionHeader}>
            <Text style={typography.eyebrow}>STEP 12 OF 13</Text>
            <Text style={styles.questionTitle}>Where are you located?</Text>
            <Text style={styles.questionSubtitle}>Ensures recommended products are in-stock and available locally.</Text>
          </View>

          <ScrollView style={styles.optionsScroll} showsVerticalScrollIndicator={false}>
            {[
              { id: 'US', label: 'United States (US)' },
              { id: 'CA', label: 'Canada (CA)' },
              { id: 'UK', label: 'United Kingdom (UK)' },
              { id: 'EU', label: 'European Union (EU)' },
              { id: 'AU', label: 'Australia (AU)' },
              { id: 'GLOBAL', label: 'International / Other' }
            ].map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.optionCard}
                activeOpacity={0.8}
                onPress={() => next('PRIMARY_MOTIVATION', { countryCode: item.id })}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* STEP 23: PRIMARY MOTIVATION & COMMITMENT */}
      {activeStep === 'PRIMARY_MOTIVATION' && (
        <View style={styles.stepContainer}>
          <View style={styles.questionHeader}>
            <Text style={typography.eyebrow}>FINAL COMMITMENT</Text>
            <Text style={styles.questionTitle}>The 42-Day Consistency Promise</Text>
            <Text style={styles.questionSubtitle}>
              Skin cell turnover takes 28 to 42 days. Real visible improvements come from gentle daily consistency.
            </Text>
          </View>

          <View style={styles.optionsList}>
            <TouchableOpacity
              style={styles.commitmentCard}
              activeOpacity={0.85}
              onPress={() => {
                next('PLAN_GENERATION', { primaryMotivation: 'all_of_the_above' });
              }}
            >
              <View style={styles.commitmentIconRow}>
                <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
              </View>
              <Text style={styles.commitmentTitle}>I'm ready to stay consistent</Text>
              <Text style={styles.commitmentDesc}>
                Build my personalized routine and track my 42-day baseline.
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* STEP 24: PLAN GENERATION & READY */}
      {activeStep === 'PLAN_GENERATION' && (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.planGenContent}
          showsVerticalScrollIndicator={false}
        >
          {genStep < 4 ? (
            <View style={styles.planGenLoadingBox}>
              <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: spacing.lg }} />
              <Text style={styles.planGenStatusTitle}>Formulating Your Routine</Text>
              <Text style={styles.planGenStatusSubtitle}>
                {genStep === 1 && 'Analyzing snapshot & skin baseline...'}
                {genStep === 2 && 'Filtering against your stated sensitivities...'}
                {genStep === 3 && 'Checking ingredient compatibility...'}
              </Text>
            </View>
          ) : (
            <View style={styles.routineReadyContainer}>
              <View style={styles.readyBadgePill}>
                <Ionicons name="checkmark-circle" size={14} color={colors.routineDone} />
                <Text style={styles.readyBadgeText}>FORMULATION READY</Text>
              </View>

              <Text style={styles.readyTitle}>Your first routine is ready</Text>
              <Text style={styles.readySubtitle}>
                Calibrated to strengthen your barrier, soothe surface redness, and establish your Day 1 baseline.
              </Text>

              {/* Starter Routine Card */}
              <View style={styles.starterRoutineCard}>
                <View style={styles.routineHeaderRow}>
                  <Ionicons name="sunny-outline" size={18} color={colors.goldDark} />
                  <Text style={styles.routineHeaderTitle}>Morning Routine (3 steps)</Text>
                </View>
                <View style={styles.routineStepRow}>
                  <Text style={styles.routineStepNum}>1</Text>
                  <Text style={styles.routineStepText}>Gentle Hydrating Cleanser</Text>
                </View>
                <View style={styles.routineStepRow}>
                  <Text style={styles.routineStepNum}>2</Text>
                  <Text style={styles.routineStepText}>Barrier Support Emulsion</Text>
                </View>
                <View style={styles.routineStepRow}>
                  <Text style={styles.routineStepNum}>3</Text>
                  <Text style={styles.routineStepText}>Broad Spectrum Mineral SPF 50</Text>
                </View>

                <View style={[styles.routineHeaderRow, { marginTop: spacing.md }]}>
                  <Ionicons name="moon-outline" size={18} color={colors.primaryLight} />
                  <Text style={styles.routineHeaderTitle}>Evening Routine (2 steps)</Text>
                </View>
                <View style={styles.routineStepRow}>
                  <Text style={styles.routineStepNum}>1</Text>
                  <Text style={styles.routineStepText}>Gentle Hydrating Cleanser</Text>
                </View>
                <View style={styles.routineStepRow}>
                  <Text style={styles.routineStepNum}>2</Text>
                  <Text style={styles.routineStepText}>Soothing Night Recovery Cream</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
                activeOpacity={0.85}
                onPress={async () => {
                  await complete();
                  router.replace('/(tabs)/today');
                }}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryLight]}
                  style={styles.primaryBtnGradient}
                >
                  <Text style={styles.primaryBtnText}>Enter Today Dashboard</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.textInverse} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  container: {
    flex: 1
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  backBtn: {
    padding: spacing.xs
  },
  stepProgressPill: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.full
  },
  stepProgressText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.primary
  },
  skipBtn: {
    padding: spacing.xs
  },
  skipBtnText: {
    ...typography.captionBold,
    color: colors.textTertiary
  },
  // Welcome Styles
  welcomeContent: {
    paddingBottom: spacing.xxl
  },
  welcomeHeroImageWrap: {
    width: '100%',
    height: 380,
    position: 'relative'
  },
  welcomeHeroImage: {
    width: '100%',
    height: '100%'
  },
  imageGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120
  },
  welcomeBadgeRow: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.base
  },
  welcomePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
    ...shadows.subtle
  },
  welcomePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    marginLeft: 6,
    letterSpacing: 1
  },
  welcomeBody: {
    paddingHorizontal: spacing.lg,
    marginTop: -spacing.md
  },
  welcomeTitle: {
    ...typography.display,
    fontSize: 32,
    lineHeight: 38,
    marginTop: spacing.xs,
    marginBottom: spacing.xs
  },
  welcomeSubtitle: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: spacing.lg
  },
  featurePillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl
  },
  welcomeFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.subtle
  },
  welcomeFeatureText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: 6
  },
  medicalDisclaimerText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 16
  },
  // Question container styles
  stepContainer: {
    flex: 1,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md
  },
  questionHeader: {
    marginBottom: spacing.lg
  },
  questionTitle: {
    ...typography.title2,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    marginTop: spacing.xs,
    marginBottom: spacing.xs
  },
  questionSubtitle: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary
  },
  optionsList: {
    marginTop: spacing.xs
  },
  optionsScroll: {
    flex: 1
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadows.subtle
  },
  optionContent: {
    flex: 1,
    marginRight: spacing.sm
  },
  optionTitle: {
    ...typography.bodyBold,
    fontSize: 15,
    color: colors.textPrimary
  },
  optionDesc: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2
  },
  multiOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    ...shadows.subtle
  },
  multiOptionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  multiOptionTitle: {
    ...typography.body,
    fontSize: 14,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm
  },
  multiOptionTitleSelected: {
    fontWeight: '700',
    color: colors.primary
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkCircleSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  bottomBar: {
    paddingVertical: spacing.md
  },
  primaryBtn: {
    borderRadius: radii.md,
    overflow: 'hidden',
    ...shadows.primary
  },
  primaryBtnDisabled: {
    opacity: 0.5
  },
  primaryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.xl
  },
  primaryBtnText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
    marginRight: spacing.sm
  },
  // Explainer Step
  explainerContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl
  },
  explainerCardList: {
    marginBottom: spacing.xl
  },
  explainerItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.subtle
  },
  explainerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    marginTop: 2
  },
  explainerTextWrap: {
    flex: 1
  },
  explainerItemTitle: {
    ...typography.bodyBold,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 2
  },
  explainerItemDesc: {
    ...typography.caption,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary
  },
  // Underage notice
  noticeModalCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.terracotta,
    marginTop: spacing.lg,
    alignItems: 'center',
    ...shadows.card
  },
  noticeModalTitle: {
    ...typography.title3,
    fontSize: 16,
    color: colors.terracotta,
    marginTop: spacing.sm,
    marginBottom: spacing.xs
  },
  noticeModalDesc: {
    ...typography.caption,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.base
  },
  noticeModalBtn: {
    backgroundColor: colors.terracottaLight,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radii.full
  },
  noticeModalBtnText: {
    ...typography.captionBold,
    color: colors.terracotta
  },
  // Photo privacy step
  privacyCard: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: spacing.base,
    ...shadows.subtle
  },
  privacyCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm
  },
  privacyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center'
  },
  badgeRecommend: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full
  },
  badgeRecommendText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.6
  },
  badgePrivacy: {
    backgroundColor: colors.terracottaLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full
  },
  badgePrivacyText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.terracotta,
    letterSpacing: 0.6
  },
  privacyTitle: {
    ...typography.bodyBold,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 4
  },
  privacyDesc: {
    ...typography.caption,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary
  },
  privacyTrustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.goldLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: radii.full,
    marginTop: spacing.md
  },
  privacyTrustText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: colors.goldDark,
    marginLeft: 6
  },
  // Guided scan screen
  scanScreenContainer: {
    flex: 1,
    backgroundColor: '#0F1713'
  },
  scanReticleContainer: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center'
  },
  scanBackdropImage: {
    width: '100%',
    height: '100%',
    position: 'absolute'
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 19, 0.45)'
  },
  faceOvalReticle: {
    width: 240,
    height: 320,
    borderRadius: 120,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderStyle: 'dashed',
    position: 'relative',
    overflow: 'hidden'
  },
  reticleCornerTL: {
    position: 'absolute',
    top: 0,
    left: 40,
    width: 20,
    height: 4,
    backgroundColor: colors.gold
  },
  reticleCornerTR: {
    position: 'absolute',
    top: 0,
    right: 40,
    width: 20,
    height: 4,
    backgroundColor: colors.gold
  },
  reticleCornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 40,
    width: 20,
    height: 4,
    backgroundColor: colors.gold
  },
  reticleCornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 40,
    width: 20,
    height: 4,
    backgroundColor: colors.gold
  },
  laserScanBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '45%',
    height: 30
  },
  guidanceChip: {
    position: 'absolute',
    top: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 19, 0.85)',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)'
  },
  guidanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gold,
    marginRight: 8
  },
  guidanceDotActive: {
    backgroundColor: '#3EAF76'
  },
  guidanceChipText: {
    ...typography.captionBold,
    color: colors.textInverse,
    fontSize: 12
  },
  scanControlsSection: {
    backgroundColor: colors.surfaceTwilight,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center'
  },
  scanInstruction: {
    ...typography.caption,
    color: colors.textInverseMuted,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: spacing.base
  },
  shutterBtnOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: colors.textInverse,
    alignItems: 'center',
    justifyContent: 'center'
  },
  shutterBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.textInverse
  },
  scanProgressWrap: {
    height: 72,
    alignItems: 'center',
    justifyContent: 'center'
  },
  scanProgressPercent: {
    ...typography.title3,
    color: colors.gold
  },
  // PRE_PAYWALL_READY Styles
  prePaywallContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl
  },
  readyHeroTitle: {
    ...typography.display,
    fontSize: 28,
    lineHeight: 34,
    marginTop: spacing.xs,
    marginBottom: spacing.xs
  },
  readyHeroSubtitle: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: spacing.lg
  },
  lockedPreviewCard: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.xl,
    ...shadows.card
  },
  previewThumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.base,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  previewThumb: {
    width: 64,
    height: 64,
    borderRadius: radii.md,
    marginRight: spacing.md
  },
  previewThumbInfo: {
    flex: 1
  },
  previewThumbTitle: {
    ...typography.bodyBold,
    fontSize: 15,
    color: colors.textPrimary
  },
  previewThumbMeta: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 6
  },
  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.6
  },
  lockedItemsList: {
    marginTop: spacing.xs
  },
  lockedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  lockedItemText: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
    fontWeight: '600'
  },
  noRiskSubtext: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.md
  },
  // HARD PAYWALL STYLES
  paywallContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl
  },
  paywallHeader: {
    marginBottom: spacing.base
  },
  proPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.goldLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.full,
    marginBottom: spacing.xs
  },
  proPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.goldDark,
    marginLeft: 4,
    letterSpacing: 1
  },
  paywallMainTitle: {
    ...typography.display,
    fontSize: 26,
    lineHeight: 32,
    marginTop: spacing.xs,
    marginBottom: spacing.xs
  },
  paywallMainSubtitle: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary
  },
  macroProofCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card
  },
  macroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md
  },
  macroTitle: {
    ...typography.title3,
    fontSize: 14,
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
  macroGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  macroCol: {
    flex: 1,
    alignItems: 'center'
  },
  macroImgWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radii.md,
    overflow: 'hidden'
  },
  macroImg: {
    width: '100%',
    height: '100%'
  },
  macroLabel: {
    ...typography.caption,
    fontSize: 11,
    marginTop: 6,
    color: colors.textSecondary,
    textAlign: 'center'
  },
  macroArrow: {
    width: 32,
    alignItems: 'center'
  },
  paywallBenefitsList: {
    marginBottom: spacing.lg
  },
  paywallBenefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm + 2
  },
  paywallBenefitIcon: {
    marginRight: spacing.sm
  },
  paywallBenefitText: {
    ...typography.bodyBold,
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1
  },
  planSelectorBox: {
    marginBottom: spacing.base
  },
  planOptionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.subtle
  },
  planOptionCardSelected: {
    borderColor: colors.primary
  },
  planBadgeBanner: {
    backgroundColor: colors.primary,
    paddingVertical: 3,
    alignItems: 'center'
  },
  planBadgeBannerText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textInverse,
    letterSpacing: 1
  },
  planCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base
  },
  planRadioCol: {
    marginRight: spacing.md
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  radioCircleSelected: {
    borderColor: colors.primary
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary
  },
  planInfoCol: {
    flex: 1
  },
  planTitleText: {
    ...typography.bodyBold,
    fontSize: 15,
    color: colors.textPrimary
  },
  planPeriodText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.goldDark,
    fontWeight: '600',
    marginTop: 2
  },
  planPriceCol: {
    alignItems: 'flex-end'
  },
  planPriceValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary
  },
  planEquivalent: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary
  },
  paywallTrialTerms: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 16
  },
  securityExplanationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.md,
    borderRadius: radii.md,
    marginTop: spacing.base,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  securityExplanationText: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    flex: 1
  },
  paywallLegalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    paddingTop: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight
  },
  legalLinkText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textTertiary
  },
  legalDot: {
    marginHorizontal: 8,
    color: colors.border
  },
  // Processing Scan Styles
  processingTitle: {
    ...typography.title2,
    fontSize: 22,
    marginBottom: spacing.xs
  },
  processingSubtitle: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center'
  },
  // WOW Screen Styles
  wowContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xxl
  },
  wowHeader: {
    marginTop: spacing.sm,
    marginBottom: spacing.base
  },
  wowBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.full,
    marginBottom: spacing.xs
  },
  wowBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    marginLeft: 5,
    letterSpacing: 1
  },
  wowTitle: {
    ...typography.display,
    fontSize: 28,
    lineHeight: 34
  },
  wowSubtitle: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2
  },
  focusCardsList: {
    marginBottom: spacing.base
  },
  focusCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card
  },
  focusIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md
  },
  focusDetails: {
    flex: 1
  },
  focusAreaName: {
    ...typography.captionBold,
    fontSize: 11,
    color: colors.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase'
  },
  focusStatusGood: {
    ...typography.bodyBold,
    fontSize: 15,
    color: colors.primary,
    marginTop: 1
  },
  focusStatusCaution: {
    ...typography.bodyBold,
    fontSize: 15,
    color: colors.caution,
    marginTop: 1
  },
  focusNote: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3
  },
  coachSnapshotCallout: {
    backgroundColor: colors.goldLight,
    padding: spacing.base,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(197, 154, 111, 0.3)'
  },
  coachAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm
  },
  coachSmallAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: spacing.sm
  },
  coachName: {
    ...typography.bodyBold,
    fontSize: 13,
    color: colors.textPrimary
  },
  coachTitle: {
    ...typography.caption,
    fontSize: 11,
    color: colors.goldDark
  },
  coachQuoteText: {
    ...typography.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textPrimary,
    fontStyle: 'italic'
  },
  bridgeSection: {
    alignItems: 'center'
  },
  bridgePrompt: {
    ...typography.caption,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.base
  },
  bridgeEstimate: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: spacing.sm
  },
  commitmentCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    ...shadows.card
  },
  commitmentIconRow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md
  },
  commitmentTitle: {
    ...typography.title3,
    fontSize: 18,
    color: colors.primary,
    marginBottom: spacing.xs
  },
  commitmentDesc: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center'
  },
  // Plan Gen styles
  planGenContent: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xl,
    flexGrow: 1,
    justifyContent: 'center'
  },
  planGenLoadingBox: {
    alignItems: 'center',
    paddingVertical: spacing.xxl
  },
  planGenStatusTitle: {
    ...typography.title2,
    fontSize: 22,
    marginBottom: spacing.xs
  },
  planGenStatusSubtitle: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center'
  },
  routineReadyContainer: {
    alignItems: 'center'
  },
  readyBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.routineDoneBg,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.full,
    marginBottom: spacing.sm
  },
  readyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.routineDone,
    marginLeft: 6,
    letterSpacing: 1
  },
  readyTitle: {
    ...typography.display,
    fontSize: 26,
    textAlign: 'center',
    marginBottom: spacing.xs
  },
  readySubtitle: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg
  },
  starterRoutineCard: {
    width: '100%',
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.xl,
    ...shadows.card
  },
  routineHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm
  },
  routineHeaderTitle: {
    ...typography.bodyBold,
    fontSize: 14,
    color: colors.textPrimary,
    marginLeft: 6
  },
  routineStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  routineStepNum: {
    width: 20,
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary
  },
  routineStepText: {
    ...typography.body,
    fontSize: 13,
    color: colors.textSecondary
  }
});
