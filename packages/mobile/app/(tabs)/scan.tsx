import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, radii, shadows, gradients } from '../../src/theme/tokens';
import { localImages } from '../../src/theme/images';
import { Header } from '../../src/components/Header';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { FocusBadge } from '../../src/components/FocusBadge';
import { MetricGauge } from '../../src/components/MetricGauge';
import { DisclaimerBar } from '../../src/components/DisclaimerBar';

type ScanFlowState = 'GUIDANCE' | 'PROCESSING' | 'SNAPSHOT_RESULT';

export default function ScanScreen() {
  const [flowState, setFlowState] = useState<ScanFlowState>('SNAPSHOT_RESULT');
  const [processingStage, setProcessingStage] = useState<string>('Validating image quality & framing...');

  const simulateScan = () => {
    setFlowState('PROCESSING');
    setProcessingStage('Analyzing facial lighting & symmetry...');
    setTimeout(() => {
      setProcessingStage('Mapping cosmetic surface characteristics...');
    }, 1200);
    setTimeout(() => {
      setProcessingStage('Generating your personalized Skin Snapshot...');
    }, 2400);
    setTimeout(() => {
      setFlowState('SNAPSHOT_RESULT');
    }, 3600);
  };

  return (
    <View style={styles.screen}>
      <Header />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {flowState === 'GUIDANCE' && (
          <View style={styles.guidanceSection}>
            <Text style={typography.eyebrow}>PRECISION SCAN PIPELINE</Text>
            <Text style={styles.guidanceTitle}>Guided Skin Scan</Text>
            <Text style={styles.guidanceBody}>
              Position your face in soft, diffused lighting with a relaxed expression. Remove eyewear for optimal calibration.
            </Text>

            {/* High-Tech Luxury Viewfinder with Real Camera Preview */}
            <View style={styles.viewfinderCard}>
              <View style={styles.viewfinderOval}>
                <Image source={localImages.scanPortrait} style={styles.viewfinderImg} />
                
                {/* Corner brackets */}
                <View style={[styles.cornerBracket, styles.cornerTopLeft]} />
                <View style={[styles.cornerBracket, styles.cornerTopRight]} />
                <View style={[styles.cornerBracket, styles.cornerBottomLeft]} />
                <View style={[styles.cornerBracket, styles.cornerBottomRight]} />

                {/* Reticle Overlay */}
                <View style={styles.reticleOverlay}>
                  <View style={styles.laserLine} />
                  <View style={styles.alignmentBadge}>
                    <Ionicons name="checkmark-circle" size={13} color={colors.routineDone} />
                    <Text style={styles.alignmentBadgeText}>98% FRAMING MATCH • OPTIMAL</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Quality Checklist */}
            <Card variant="elevated" style={styles.checklistCard}>
              <Text style={styles.checklistTitle}>PRE-SCAN QUALITY ASSURANCE</Text>
              
              <View style={styles.checkRow}>
                <View style={styles.checkBadgeDone}>
                  <Ionicons name="checkmark" size={14} color={colors.textInverse} />
                </View>
                <Text style={styles.checkText}>Even lighting • No strong direct shadows</Text>
              </View>

              <View style={styles.checkRow}>
                <View style={styles.checkBadgeDone}>
                  <Ionicons name="checkmark" size={14} color={colors.textInverse} />
                </View>
                <Text style={styles.checkText}>Neutral resting expression • No smile distortion</Text>
              </View>

              <View style={styles.checkRow}>
                <View style={styles.checkBadgeDone}>
                  <Ionicons name="checkmark" size={14} color={colors.textInverse} />
                </View>
                <Text style={styles.checkText}>Frontal camera aligned at eye level</Text>
              </View>

              <View style={styles.checkRow}>
                <View style={styles.checkBadgeDone}>
                  <Ionicons name="checkmark" size={14} color={colors.textInverse} />
                </View>
                <Text style={styles.checkText}>Hair tucked back • Forehead & jawline clear</Text>
              </View>
            </Card>

            <Button
              title="Capture Scan Photo"
              onPress={simulateScan}
              variant="primary"
              icon={<Ionicons name="camera-outline" size={18} color={colors.textInverse} />}
              style={{ marginTop: spacing.xl }}
            />

            <TouchableOpacity
              onPress={() => setFlowState('SNAPSHOT_RESULT')}
              style={styles.cancelLink}
            >
              <Text style={styles.cancelLinkText}>View Latest Snapshot</Text>
            </TouchableOpacity>
          </View>
        )}

        {flowState === 'PROCESSING' && (
          <View style={styles.processingSection}>
            <View style={styles.processingSpinnerWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
            <Text style={styles.processingTitle}>{processingStage}</Text>
            <Text style={styles.processingNote}>
              Photos are processed ephemerally with zero permanent storage of raw selfies without your consent.
            </Text>
          </View>
        )}

        {flowState === 'SNAPSHOT_RESULT' && (
          <View>
            {/* Header */}
            <View style={styles.headerSection}>
              <View style={styles.headerRow}>
                <View>
                  <Text style={typography.eyebrow}>COSMETIC BASELINE • DAY 12 OF 42</Text>
                  <Text style={styles.snapshotTitle}>Skin Snapshot</Text>
                </View>
                <TouchableOpacity
                  style={styles.rescanBtn}
                  onPress={() => setFlowState('GUIDANCE')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera-reverse-outline" size={16} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.rescanBtnText}>New Scan</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.snapshotSubtitle}>
                Calibrated visible skin appearance dimensions and your top 3 personalized focus areas.
              </Text>
            </View>

            {/* Real Biometric Face Capture Card with AI Feature Tags */}
            <Card variant="elevated" style={styles.faceCaptureCard}>
              <View style={styles.faceCaptureImgWrap}>
                <Image source={localImages.scanPortrait} style={styles.faceCaptureImg} resizeMode="cover" />
                
                {/* Calibration Banner */}
                <View style={styles.calibrationOverlay}>
                  <View style={styles.calibPill}>
                    <View style={styles.calibDot} />
                    <Text style={styles.calibText}>CALIBRATED 5200K DAYLIGHT • 98% MATCH</Text>
                  </View>
                </View>

                {/* AI Detection Feature Markers */}
                <View style={[styles.aiMarker, { top: '38%', left: '20%' }]}>
                  <View style={styles.markerDot} />
                  <View style={styles.markerCard}>
                    <Text style={styles.markerTitle}>Visible Redness</Text>
                    <Text style={styles.markerScore}>Score: 74 • Mid-Cheek</Text>
                  </View>
                </View>

                <View style={[styles.aiMarker, { top: '48%', right: '22%' }]}>
                  <View style={styles.markerDot} />
                  <View style={styles.markerCard}>
                    <Text style={styles.markerTitle}>Pore Balance</Text>
                    <Text style={styles.markerScore}>Score: 82 • Normalizing</Text>
                  </View>
                </View>

                <View style={[styles.aiMarker, { top: '22%', right: '28%' }]}>
                  <View style={styles.markerDot} />
                  <View style={styles.markerCard}>
                    <Text style={styles.markerTitle}>Hydration Gloss</Text>
                    <Text style={styles.markerScore}>Score: 86 • Steady</Text>
                  </View>
                </View>
              </View>
            </Card>

            {/* Overall Score Dial Card */}
            <Card variant="elevated" style={styles.dialCard}>
              <LinearGradient
                colors={gradients.champagneGlow}
                style={styles.dialGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.dialContent}>
                  <View style={styles.dialScoreContainer}>
                    <Text style={styles.dialScore}>81</Text>
                    <Text style={styles.dialScoreMax}>/100</Text>
                  </View>
                  <View style={styles.dialTextWrap}>
                    <Text style={styles.dialEyebrow}>OVERALL COSMETIC BALANCE</Text>
                    <Text style={styles.dialHeadline}>Healthy Barrier Function</Text>
                    <Text style={styles.dialSummary}>
                      Surface hydration is steady. Focus on calming slight cheek flushing with gentle barrier ceramides.
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </Card>

            {/* Top 3 Prioritized Focus Areas */}
            <View style={styles.focusHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>Top 3 Focus Areas This Week</Text>
              <Text style={styles.sectionHeaderMeta}>AI Calibrated</Text>
            </View>

            <Card variant="elevated" style={styles.focusListCard}>
              {/* Focus 1 */}
              <View style={styles.focusItem}>
                <FocusBadge priority={1} label="Visible Redness" />
                <Text style={styles.focusItemTitle}>Calming Barrier Support</Text>
                <Text style={styles.focusItemDesc}>
                  Slight visible flushing across mid-cheeks. Prioritize soothing hydration and barrier-friendly ceramides.
                </Text>
                <View style={styles.solutionPill}>
                  <Ionicons name="sparkles" size={12} color={colors.primaryLight} />
                  <Text style={styles.solutionPillText}>Routine match: Centella Calming Serum</Text>
                </View>
              </View>

              <View style={styles.focusDivider} />

              {/* Focus 2 */}
              <View style={styles.focusItem}>
                <FocusBadge priority={2} label="Pore Definition" />
                <Text style={styles.focusItemTitle}>Gentle T-Zone Balance</Text>
                <Text style={styles.focusItemDesc}>
                  Pore visibility concentrated around central nose. Avoid abrasive scrubs that prompt reactive shine.
                </Text>
                <View style={styles.solutionPill}>
                  <Ionicons name="water-outline" size={12} color={colors.goldDark} />
                  <Text style={styles.solutionPillText}>Routine match: Hydrating Gentle Cleanser</Text>
                </View>
              </View>

              <View style={styles.focusDivider} />

              {/* Focus 3 */}
              <View style={styles.focusItem}>
                <FocusBadge priority={3} label="Texture Smoothness" />
                <Text style={styles.focusItemTitle}>Consistent Daily Hydration</Text>
                <Text style={styles.focusItemDesc}>
                  Balanced surface moisture helps maintain smooth cosmetic skin texture over time.
                </Text>
                <View style={styles.solutionPill}>
                  <Ionicons name="shield-checkmark-outline" size={12} color={colors.primary} />
                  <Text style={styles.solutionPillText}>Routine match: Barrier Recovery Moisturizer</Text>
                </View>
              </View>
            </Card>

            {/* Detailed Appearance Dimension Gauges */}
            <View style={[styles.focusHeaderRow, { marginTop: spacing.xl }]}>
              <Text style={styles.sectionHeaderTitle}>Cosmetic Appearance Dimensions</Text>
              <Text style={styles.sectionHeaderMeta}>0–100 Scale</Text>
            </View>

            <Card variant="elevated" style={styles.metricsCard}>
              <MetricGauge label="Redness Appearance" score={74} description="Surface warmth predominantly visible on cheeks" />
              <View style={styles.gaugeDivider} />
              <MetricGauge label="Texture Smoothness" score={85} description="Fine skin grain, balanced cosmetic feel" />
              <View style={styles.gaugeDivider} />
              <MetricGauge label="Pore Visibility" score={82} description="Moderate definition in central nasal bridge" />
              <View style={styles.gaugeDivider} />
              <MetricGauge label="Surface Hydration" score={86} description="Plump, dewy moisture barrier retention" />
            </Card>

            <DisclaimerBar />
          </View>
        )}
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
  guidanceSection: {
    paddingTop: spacing.xs
  },
  guidanceTitle: {
    ...typography.display,
    fontSize: 28,
    lineHeight: 34,
    marginTop: spacing.xxs,
    marginBottom: spacing.xs
  },
  guidanceBody: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.lg
  },
  viewfinderCard: {
    backgroundColor: colors.surfaceTwilight,
    borderRadius: radii.xl,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadows.medium
  },
  viewfinderOval: {
    width: 250,
    height: 310,
    borderRadius: 125,
    borderWidth: 2,
    borderColor: 'rgba(197, 154, 111, 0.7)',
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center'
  },
  viewfinderImg: {
    width: '100%',
    height: '100%'
  },
  reticleOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: spacing.md
  },
  cornerBracket: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: colors.goldDark,
    zIndex: 10
  },
  cornerTopLeft: {
    top: 18,
    left: 18,
    borderTopWidth: 3,
    borderLeftWidth: 3
  },
  cornerTopRight: {
    top: 18,
    right: 18,
    borderTopWidth: 3,
    borderRightWidth: 3
  },
  cornerBottomLeft: {
    bottom: 18,
    left: 18,
    borderBottomWidth: 3,
    borderLeftWidth: 3
  },
  cornerBottomRight: {
    bottom: 18,
    right: 18,
    borderBottomWidth: 3,
    borderRightWidth: 3
  },
  laserLine: {
    position: 'absolute',
    top: '45%',
    left: 20,
    right: 20,
    height: 1.5,
    backgroundColor: colors.goldLight,
    opacity: 0.8
  },
  alignmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(19, 30, 24, 0.85)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(197, 154, 111, 0.4)'
  },
  alignmentBadgeText: {
    ...typography.captionBold,
    fontSize: 9,
    color: colors.goldLight,
    marginLeft: 4,
    letterSpacing: 0.6
  },
  checklistCard: {
    padding: spacing.base
  },
  checklistTitle: {
    ...typography.eyebrow,
    color: colors.primary,
    marginBottom: spacing.md
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm
  },
  checkBadgeDone: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm
  },
  checkText: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1
  },
  cancelLink: {
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.xs
  },
  cancelLinkText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 13
  },
  processingSection: {
    paddingVertical: spacing.huge * 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  processingSpinnerWrap: {
    marginBottom: spacing.lg
  },
  processingTitle: {
    ...typography.title1,
    fontSize: 20,
    textAlign: 'center',
    marginBottom: spacing.sm
  },
  processingNote: {
    ...typography.caption,
    textAlign: 'center',
    color: colors.textSecondary,
    maxWidth: 280,
    lineHeight: 18
  },
  headerSection: {
    marginTop: spacing.xs,
    marginBottom: spacing.md
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  rescanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(26, 56, 43, 0.12)',
    ...shadows.subtle
  },
  rescanBtnText: {
    ...typography.captionBold,
    fontSize: 11,
    color: colors.primary
  },
  snapshotTitle: {
    ...typography.display,
    fontSize: 28,
    lineHeight: 34,
    marginTop: spacing.xxs
  },
  snapshotSubtitle: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4
  },
  faceCaptureCard: {
    padding: 0,
    overflow: 'hidden',
    borderRadius: radii.xl,
    marginBottom: spacing.md,
    ...shadows.medium
  },
  faceCaptureImgWrap: {
    width: '100%',
    height: 320,
    position: 'relative'
  },
  faceCaptureImg: {
    width: '100%',
    height: '100%'
  },
  calibrationOverlay: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'center'
  },
  calibPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(19, 30, 24, 0.82)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(197, 154, 111, 0.4)'
  },
  calibDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.routineDone,
    marginRight: 6
  },
  calibText: {
    ...typography.captionBold,
    fontSize: 9,
    color: colors.goldLight,
    letterSpacing: 0.8
  },
  aiMarker: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center'
  },
  markerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.goldDark,
    borderWidth: 2,
    borderColor: colors.surface,
    ...shadows.subtle
  },
  markerCard: {
    backgroundColor: 'rgba(19, 30, 24, 0.88)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    marginLeft: 6,
    borderWidth: 0.8,
    borderColor: 'rgba(197, 154, 111, 0.3)'
  },
  markerTitle: {
    ...typography.captionBold,
    fontSize: 10,
    color: colors.goldLight
  },
  markerScore: {
    ...typography.caption,
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.85)'
  },
  dialCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 154, 111, 0.3)'
  },
  dialGradient: {
    padding: spacing.base
  },
  dialContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  dialScoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(197, 154, 111, 0.3)',
    marginRight: spacing.md,
    ...shadows.subtle
  },
  dialScore: {
    ...typography.metricValue,
    fontSize: 34,
    color: colors.primary
  },
  dialScoreMax: {
    ...typography.captionBold,
    color: colors.textTertiary,
    fontSize: 14,
    marginLeft: 2
  },
  dialTextWrap: {
    flex: 1
  },
  dialEyebrow: {
    ...typography.eyebrow,
    fontSize: 9,
    color: colors.goldDark,
    marginBottom: 2
  },
  dialHeadline: {
    ...typography.title2,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2
  },
  dialSummary: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16
  },
  focusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.sm
  },
  sectionHeaderTitle: {
    ...typography.title2,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary
  },
  sectionHeaderMeta: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textTertiary
  },
  focusListCard: {
    padding: spacing.base
  },
  focusItem: {
    paddingVertical: spacing.xs
  },
  focusItemTitle: {
    ...typography.title2,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.xs,
    marginBottom: spacing.xxs
  },
  focusItemDesc: {
    ...typography.body,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.xs
  },
  solutionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 56, 43, 0.05)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    alignSelf: 'flex-start'
  },
  solutionPillText: {
    ...typography.captionBold,
    fontSize: 11,
    color: colors.primary,
    marginLeft: spacing.xxs
  },
  focusDivider: {
    height: 1,
    backgroundColor: 'rgba(26, 56, 43, 0.06)',
    marginVertical: spacing.sm
  },
  metricsCard: {
    padding: spacing.base
  },
  gaugeDivider: {
    height: 1,
    backgroundColor: 'rgba(26, 56, 43, 0.06)',
    marginVertical: spacing.md
  }
});
