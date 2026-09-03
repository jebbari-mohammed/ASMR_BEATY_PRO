import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, radii, shadows, gradients } from '../../src/theme/tokens';
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

            {/* High-Tech Luxury Viewfinder */}
            <View style={styles.viewfinderCard}>
              <View style={styles.viewfinderOval}>
                {/* Corner brackets */}
                <View style={[styles.cornerBracket, styles.cornerTopLeft]} />
                <View style={[styles.cornerBracket, styles.cornerTopRight]} />
                <View style={[styles.cornerBracket, styles.cornerBottomLeft]} />
                <View style={[styles.cornerBracket, styles.cornerBottomRight]} />

                <Ionicons name="scan-outline" size={48} color={colors.goldDark} style={styles.scanIcon} />
                <Text style={styles.viewfinderHint}>Align face within golden ratio frame</Text>
                
                <View style={styles.laserLine} />
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
              <Text style={typography.eyebrow}>COSMETIC BASELINE • DAY 12 OF 42</Text>
              <Text style={styles.snapshotTitle}>Skin Snapshot</Text>
              <Text style={styles.snapshotSubtitle}>
                Calibrated visible skin appearance dimensions and your top 3 personalized focus areas.
              </Text>
            </View>

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
                      Surface hydration is steady. Focus on calming slight cheek flushing.
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
              <MetricGauge label="Visible Blemishes" score={82} description="A few minor localized spots noted" />
              <MetricGauge label="Texture Smoothness" score={86} description="Surface appears largely hydrated and smooth" />
              <MetricGauge label="Pore Appearance" score={79} description="Definition concentrated around central nose" />
              <MetricGauge label="Shine & Oiliness" score={80} description="Balanced natural sebum appearance" />
              <MetricGauge label="Tone Uniformity" score={84} description="Uniform tone appearance across primary facial planes" />
            </Card>

            {/* Actions */}
            <View style={styles.actionButtonGroup}>
              <Button
                title="Apply Focus to My Routine"
                variant="primary"
                icon={<Ionicons name="sparkles" size={16} color={colors.textInverse} />}
                onPress={() => alert('Routine updated to align with your top focus areas.')}
              />
              <Button
                title="Take New Scan Photo"
                variant="outline"
                icon={<Ionicons name="camera-outline" size={16} color={colors.textPrimary} />}
                onPress={() => setFlowState('GUIDANCE')}
                style={{ marginTop: spacing.sm }}
              />
            </View>

            <DisclaimerBar showAffiliate={false} />
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
  headerSection: {
    marginVertical: spacing.md
  },
  snapshotTitle: {
    ...typography.display,
    fontSize: 28,
    lineHeight: 34,
    marginTop: spacing.xxs,
    marginBottom: spacing.xs
  },
  snapshotSubtitle: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20
  },
  dialCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(197, 154, 111, 0.25)'
  },
  dialGradient: {
    padding: spacing.base + 2
  },
  dialContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  dialScoreContainer: {
    width: 74,
    height: 74,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.base,
    borderWidth: 2,
    borderColor: colors.gold,
    ...shadows.subtle
  },
  dialScore: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary
  },
  dialScoreMax: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textTertiary,
    marginTop: -2
  },
  dialTextWrap: {
    flex: 1
  },
  dialEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.goldDark
  },
  dialHeadline: {
    ...typography.h3,
    fontSize: 16,
    color: colors.textPrimary,
    marginTop: 2
  },
  dialSummary: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2
  },
  focusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md
  },
  sectionHeaderTitle: {
    ...typography.h2,
    fontSize: 18
  },
  sectionHeaderMeta: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textTertiary
  },
  focusListCard: {
    padding: spacing.base,
    marginBottom: spacing.xl
  },
  focusItem: {
    marginVertical: spacing.xs
  },
  focusItemTitle: {
    ...typography.bodyBold,
    fontSize: 15,
    marginTop: spacing.xs + 2,
    marginBottom: 2
  },
  focusItemDesc: {
    ...typography.caption,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary
  },
  solutionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
    marginTop: spacing.sm
  },
  solutionPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: 4
  },
  focusDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.md
  },
  metricsCard: {
    padding: spacing.base,
    marginBottom: spacing.xl
  },
  actionButtonGroup: {
    marginBottom: spacing.base
  },
  guidanceSection: {
    paddingTop: spacing.md
  },
  guidanceTitle: {
    ...typography.display,
    fontSize: 28,
    marginTop: spacing.xxs,
    marginBottom: spacing.xs
  },
  guidanceBody: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: spacing.lg
  },
  viewfinderCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSecondary,
    paddingVertical: spacing.xxl,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.xl
  },
  viewfinderOval: {
    width: 200,
    height: 270,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: colors.gold,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.base,
    position: 'relative'
  },
  cornerBracket: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderColor: colors.primary,
    borderWidth: 2
  },
  cornerTopLeft: {
    top: -10,
    left: -10,
    borderRightWidth: 0,
    borderBottomWidth: 0
  },
  cornerTopRight: {
    top: -10,
    right: -10,
    borderLeftWidth: 0,
    borderBottomWidth: 0
  },
  cornerBottomLeft: {
    bottom: -10,
    left: -10,
    borderRightWidth: 0,
    borderTopWidth: 0
  },
  cornerBottomRight: {
    bottom: -10,
    right: -10,
    borderLeftWidth: 0,
    borderTopWidth: 0
  },
  scanIcon: {
    marginBottom: spacing.sm
  },
  viewfinderHint: {
    ...typography.captionBold,
    fontSize: 12,
    textAlign: 'center',
    color: colors.goldDark
  },
  laserLine: {
    position: 'absolute',
    width: '80%',
    height: 2,
    backgroundColor: colors.gold,
    top: '45%'
  },
  checklistCard: {
    padding: spacing.base
  },
  checklistTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.primary,
    marginBottom: spacing.md
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm + 2
  },
  checkBadgeDone: {
    width: 20,
    height: 20,
    borderRadius: radii.full,
    backgroundColor: colors.routineDone,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm
  },
  checkText: {
    ...typography.body,
    fontSize: 13,
    color: colors.textSecondary
  },
  cancelLink: {
    marginTop: spacing.md,
    alignItems: 'center',
    padding: spacing.sm
  },
  cancelLinkText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 13
  },
  processingSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.huge * 2
  },
  processingSpinnerWrap: {
    width: 72,
    height: 72,
    borderRadius: radii.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl
  },
  processingTitle: {
    ...typography.h2,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: spacing.sm
  },
  processingNote: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl
  }
});
