import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing, typography } from '../theme/tokens';

interface MetricGaugeProps {
  label: string;
  score: number; // 0 - 100
  description?: string;
}

export const MetricGauge: React.FC<MetricGaugeProps> = ({ label, score, description }) => {
  // Score interpretation in supportive, non-clinical terms
  const getDescriptor = (val: number): string => {
    if (val >= 85) return 'Optimal Balance';
    if (val >= 70) return 'Mild Focus Area';
    return 'Priority Focus';
  };

  const getBarColor = (val: number): string => {
    if (val >= 85) return colors.primaryLight;
    if (val >= 70) return colors.gold;
    return colors.terracotta;
  };

  const getDescriptorBadgeStyle = (val: number) => {
    if (val >= 85) return styles.badgeSuccess;
    if (val >= 70) return styles.badgeGold;
    return styles.badgeTerracotta;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.labelGroup}>
          <Text style={styles.label}>{label}</Text>
          <View style={[styles.descriptorBadge, getDescriptorBadgeStyle(score)]}>
            <Text style={styles.descriptorText}>{getDescriptor(score)}</Text>
          </View>
        </View>
        <Text style={styles.scoreText}>{score}<Text style={styles.scoreMax}>/100</Text></Text>
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
    marginVertical: spacing.sm + 2
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs + 2
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  label: {
    ...typography.bodyBold,
    fontSize: 13,
    color: colors.textPrimary,
    marginRight: spacing.sm
  },
  descriptorBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full
  },
  badgeSuccess: {
    backgroundColor: colors.primarySoft
  },
  badgeGold: {
    backgroundColor: colors.goldLight
  },
  badgeTerracotta: {
    backgroundColor: colors.terracottaLight
  },
  descriptorText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.3
  },
  scoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary
  },
  scoreMax: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.textTertiary
  },
  track: {
    height: 7,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radii.full,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(234, 229, 220, 0.4)'
  },
  fill: {
    height: '100%',
    borderRadius: radii.full
  },
  description: {
    ...typography.caption,
    marginTop: spacing.xs + 2,
    color: colors.textSecondary,
    fontSize: 12
  }
});
