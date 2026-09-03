import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing, typography } from '../theme/tokens.js';

interface MetricGaugeProps {
  label: string;
  score: number; // 0 - 100
  description?: string;
}

export const MetricGauge: React.FC<MetricGaugeProps> = ({ label, score, description }) => {
  // Score interpretation in supportive, non-clinical terms
  const getDescriptor = (val: number): string => {
    if (val >= 85) return 'Optimal cosmetic balance';
    if (val >= 70) return 'Mild focus area';
    return 'Key routine focus';
  };

  const getBarColor = (val: number): string => {
    if (val >= 85) return colors.sage;
    if (val >= 70) return colors.calmFocus;
    return colors.terracotta;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.descriptor}>{getDescriptor(score)}</Text>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${score}%`, backgroundColor: getBarColor(score) }]} />
      </View>

      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs
  },
  label: {
    ...typography.bodyBold,
    fontSize: 14,
    color: colors.textPrimary
  },
  descriptor: {
    ...typography.caption,
    color: colors.textSecondary
  },
  track: {
    height: 6,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radii.full,
    overflow: 'hidden'
  },
  fill: {
    height: '100%',
    borderRadius: radii.full
  },
  description: {
    ...typography.caption,
    marginTop: spacing.xs,
    color: colors.textTertiary
  }
});
