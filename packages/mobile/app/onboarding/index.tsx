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
  PrimaryMotivationOption
} from '@asmr/shared';
import { colors, spacing, typography, radii, shadows, gradients } from '../../src/theme/tokens';
import { localImages } from '../../src/theme/images';
import { useOnboarding } from '../../src/hooks/useOnboarding';

export default function OnboardingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ step?: string }>();
  const insets = useSafeAreaInsets();
  const { state, loading, next, back, complete, updateState } = useOnboarding();

  useEffect(() => {
    if (!loading && params.step) {
      updateState({ currentStep: params.step as OnboardingStep });
    }
  }, [params.step, loading]);

  // Scan simulation state
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatusText, setScanStatusText] = useState('Position your face');
  const [isScanning, setIsScanning] = useState(false);

  // Soft age gate modal state
  const [showUnderageNotice, setShowUnderageNotice] = useState(false);

  // Plan generation simulation state
  const [genStep, setGenStep] = useState(0);

  // Multi-select temporary states
  const [selectedGoals, setSelectedGoals] = useState<PrimaryGoalOption[]>(state.selectedGoals || []);
  const [selectedActives, setSelectedActives] = useState<CurrentActiveOption[]>(state.currentActives || []);
  const [selectedAvoids, setSelectedAvoids] = useState<ProductAvoidanceOption[]>(state.productPreferencesToAvoid || []);

  useEffect(() => {
    if (state.selectedGoals) setSelectedGoals(state.selectedGoals);
    if (state.currentActives) setSelectedActives(state.currentActives);
    if (state.productPreferencesToAvoid) setSelectedAvoids(state.productPreferencesToAvoid);
  }, [state]);

  const activeStep: OnboardingStep = (params.step as OnboardingStep) || state.currentStep;

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

  // Handle guided scan simulation
  const handleStartScan = () => {
    setIsScanning(true);
    setScanProgress(0);
    setScanStatusText('Checking photo quality & lighting...');

    setTimeout(() => {
      setScanProgress(0.3);
      setScanStatusText('Mapping visible skin features...');
    }, 900);

    setTimeout(() => {
      setScanProgress(0.7);
      setScanStatusText('Analyzing hydration & pore balance...');
    }, 1800);

    setTimeout(() => {
      setScanProgress(1.0);
      setScanStatusText('Snapshot complete!');
      setTimeout(() => {
        setIsScanning(false);
        next('WOW_SNAPSHOT');
      }, 600);
    }, 2600);
  };

  // Handle plan generation simulation
  const handleStartPlanGen = () => {
    setGenStep(1);
    setTimeout(() => setGenStep(2), 800);
    setTimeout(() => setGenStep(3), 1600);
    setTimeout(() => setGenStep(4), 2400);
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
      {/* Top Header Navigation (for questions after welcome) */}
      {activeStep !== 'WELCOME' && activeStep !== 'PLAN_GENERATION' && (
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

      {/* STEP: WELCOME */}
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

      {/* STEP: AGE GATE */}
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
                <Text style={styles.optionDesc}>Continue to establish your baseline skin snapshot.</Text>
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

      {/* STEP: GOALS */}
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
              onPress={() => next('PHOTO_PRIVACY', { selectedGoals })}
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

      {/* STEP: PHOTO PRIVACY */}
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
                Store photos encrypted in your private account so you can visually compare Day 1 vs Day 14, 30, and 42 changes.
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

      {/* STEP: GUIDED SCAN */}
      {activeStep === 'GUIDED_SCAN' && (
        <View style={styles.scanScreenContainer}>
          <View style={styles.scanReticleContainer}>
            <Image
              source={localImages.scanPortrait}
              style={styles.scanBackdropImage}
              resizeMode="cover"
            />
            {/* Dark glass overlay */}
            <View style={styles.scanOverlay} />

            {/* Reticle Oval */}
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

            {/* Guidance status chip */}
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
                onPress={handleStartScan}
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

      {/* STEP: WOW SNAPSHOT */}
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

          {/* Qualitative Focus Areas (NOT 0-100 anxious score) */}
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

          {/* Coach Baseline Message */}
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

          {/* Emotional Bridge to Personalization */}
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

      {/* STEP: SKIN FEEL */}
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

      {/* STEP: SENSITIVITY */}
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

      {/* STEP: CURRENT ACTIVES */}
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

      {/* STEP: KNOWN REACTIONS */}
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
              onPress={() => next('EXISTING_ROUTINE', {
                knownReactions: {
                  hasKnownReactions: selectedAvoids.length > 0 && !selectedAvoids.includes('nothing_specific'),
                  userReportedAllergies: [],
                  userReportedSensitivities: selectedAvoids
                },
                productPreferencesToAvoid: selectedAvoids
              })}
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

      {/* STEP: EXISTING ROUTINE */}
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

      {/* STEP: SHELF CAPTURE PROMPT */}
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

      {/* STEP: DESIRED COMPLEXITY */}
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

      {/* STEP: TIME COMMITMENT */}
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

      {/* STEP: SUNSCREEN HABIT */}
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

      {/* STEP: BUDGET PREFERENCE */}
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

      {/* STEP: PRODUCT PREFERENCES */}
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

      {/* STEP: COUNTRY SELECT */}
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

      {/* STEP: PRIMARY MOTIVATION & COMMITMENT */}
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
                handleStartPlanGen();
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

      {/* STEP: PLAN GENERATION & READY */}
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
