import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { colors, spacing, typography, radii } from '../../src/theme/tokens.js';
import { Card } from '../../src/components/Card.js';
import { Button } from '../../src/components/Button.js';
import { FocusBadge } from '../../src/components/FocusBadge.js';
import { MetricGauge } from '../../src/components/MetricGauge.js';
import { DisclaimerBar } from '../../src/components/DisclaimerBar.js';

type ScanFlowState = 'GUIDANCE' | 'PROCESSING' | 'SNAPSHOT_RESULT';

export default function ScanScreen() {
  const [flowState, setFlowState] = useState<ScanFlowState>('SNAPSHOT_RESULT'); // default displays snapshot for review
  const [processingStage, setProcessingStage] = useState<string>('Checking photo quality...');

  const simulateScan = () => {
    setFlowState('PROCESSING');
    setProcessingStage('Checking photo quality...');
    setTimeout(() => {
      setProcessingStage('Mapping cosmetic skin features...');
    }, 1200);
    setTimeout(() => {
      setProcessingStage('Building your Skin Snapshot...');
    }, 2400);
    setTimeout(() => {
      setFlowState('SNAPSHOT_RESULT');
    }, 3600);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {flowState === 'GUIDANCE' && (
        <View style={styles.guidanceContainer}>
          <Text style={typography.h1}>Guided Skin Scan</Text>
          <Text style={[typography.body, styles.guidanceSubtitle]}>
            Stand in soft, even natural light with a neutral expression. Remove glasses and tuck hair back.
          </Text>

          {/* Camera Frame Preview Oval */}
          <View style={styles.ovalFrameContainer}>
            <View style={styles.ovalFrame}>
              <Text style={styles.guidanceHint}>Align your face within the frame</Text>
            </View>
          </View>

          {/* Real-time Quality Guidance Checklist */}
          <Card variant="subtle" style={styles.checklistCard}>
            <Text style={typography.captionBold}>Pre-Scan Quality Checklist</Text>
            <Text style={styles.checkItem}>✓ Even lighting (no heavy shadows)</Text>
            <Text style={styles.checkItem}>✓ Neutral facial expression</Text>
            <Text style={styles.checkItem}>✓ Camera held at eye level</Text>
            <Text style={styles.checkItem}>✓ Eyes open and clearly visible</Text>
          </Card>

          <Button title="Take Skin Scan" onPress={simulateScan} style={{ marginTop: spacing.xl }} />
        </View>
      )}

      {flowState === 'PROCESSING' && (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={colors.sage} />
          <Text style={[typography.h2, styles.processingText]}>{processingStage}</Text>
          <Text style={[typography.caption, { textAlign: 'center', marginTop: spacing.sm }]}>
            Your photo is securely analyzed with ephemeral privacy controls.
          </Text>
        </View>
      )}

      {flowState === 'SNAPSHOT_RESULT' && (
        <View>
          {/* Header */}
          <View style={styles.header}>
            <Text style={typography.captionBold}>TODAY'S COSMETIC BASELINE</Text>
            <Text style={[typography.h1, styles.title]}>Skin Snapshot</Text>
            <Text style={typography.body}>
              Here are your top visible cosmetic characteristics and focus areas for this week's routine.
            </Text>
          </View>

          {/* Top 3 Focus Areas */}
          <Card variant="elevated" style={styles.focusCard}>
            <Text style={[typography.captionBold, { color: colors.sage, marginBottom: spacing.sm }]}>
              YOUR TOP 3 FOCUS AREAS THIS WEEK
            </Text>

            <View style={styles.focusItem}>
              <FocusBadge priority={1} label="Visible Redness" />
              <Text style={[typography.bodyBold, { marginTop: spacing.xs }]}>Calming Barrier Support</Text>
              <Text style={typography.caption}>
                Slight visible flushing across the mid-cheeks. Prioritize soothing hydration and barrier-friendly lipids.
              </Text>
            </View>

            <View style={[styles.focusItem, styles.focusDivider]}>
              <FocusBadge priority={2} label="Pore Appearance" />
              <Text style={[typography.bodyBold, { marginTop: spacing.xs }]}>Balanced Gentle Cleansing</Text>
              <Text style={typography.caption}>
                Pore definition in the T-zone. Avoid harsh scrubs that provoke excess oil reflection.
              </Text>
            </View>

            <View style={[styles.focusItem, styles.focusDivider]}>
              <FocusBadge priority={3} label="Texture Smoothness" />
              <Text style={[typography.bodyBold, { marginTop: spacing.xs }]}>Consistent Daily Hydration</Text>
              <Text style={typography.caption}>
                Balanced surface moisture helps maintain smooth cosmetic skin texture over time.
              </Text>
            </View>
          </Card>

          {/* Detailed Cosmetic Metric Gauges */}
          <View style={styles.sectionHeader}>
            <Text style={typography.h2}>Cosmetic Measurements</Text>
            <Text style={typography.caption}>Standardized 0–100 Appearance Scale</Text>
          </View>

          <Card variant="subtle" style={styles.metricsCard}>
            <MetricGauge label="Redness Appearance" score={74} description="Surface warmth predominantly visible on cheeks" />
            <MetricGauge label="Visible Blemishes" score={82} description="A few minor localized spots noted" />
            <MetricGauge label="Texture Smoothness" score={86} description="Surface appears largely hydrated and smooth" />
            <MetricGauge label="Pore Appearance" score={79} description="Definition concentrated around central nose/forehead" />
            <MetricGauge label="Shine & Oiliness" score={80} description="Balanced natural sebum appearance" />
            <MetricGauge label="Tone Uniformity" score={84} description="Uniform tone appearance across primary facial planes" />
          </Card>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button
              title="Apply Focus to My Routine"
              onPress={() => alert('Routine updated to align with your top focus areas.')}
            />
            <Button
              title="Retake Scan"
              variant="outline"
              onPress={() => setFlowState('GUIDANCE')}
              style={{ marginTop: spacing.sm }}
            />
          </View>

          <DisclaimerBar showAffiliate={false} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    padding: spacing.base,
    paddingBottom: spacing.huge
  },
  header: {
    marginBottom: spacing.base
  },
  title: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs
  },
  guidanceContainer: {
    paddingTop: spacing.lg
  },
  guidanceSubtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.xl
  },
  ovalFrameContainer: {
    alignItems: 'center',
    marginVertical: spacing.xl
  },
  ovalFrame: {
    width: 220,
    height: 300,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: colors.sage,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.base
  },
  guidanceHint: {
    ...typography.captionBold,
    textAlign: 'center',
    color: colors.sage
  },
  checklistCard: {
    marginTop: spacing.lg
  },
  checkItem: {
    ...typography.body,
    fontSize: 14,
    marginTop: spacing.xs,
    color: colors.textSecondary
  },
  processingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.huge * 2
  },
  processingText: {
    marginTop: spacing.xl,
    textAlign: 'center'
  },
  focusCard: {
    marginBottom: spacing.xl
  },
  focusItem: {
    marginVertical: spacing.xs
  },
  focusDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
    marginTop: spacing.md
  },
  sectionHeader: {
    marginBottom: spacing.sm
  },
  metricsCard: {
    marginBottom: spacing.xl
  },
  actionButtons: {
    marginBottom: spacing.base
  }
});
