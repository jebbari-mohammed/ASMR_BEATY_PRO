import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../theme/tokens';

interface DisclaimerBarProps {
  showAffiliate?: boolean;
}

export const DisclaimerBar: React.FC<DisclaimerBarProps> = ({ showAffiliate = true }) => {
  return (
    <View style={styles.container}>
      <View style={styles.badgeRow}>
        <Ionicons name="shield-checkmark-outline" size={13} color={colors.primaryLight} style={styles.icon} />
        <Text style={styles.title}>COSMETIC WELLNESS ASSURANCE</Text>
      </View>
      <Text style={styles.text}>
        Designed strictly for appearance tracking & routine consistency. Not a medical device; does not diagnose, treat, or cure skin conditions.
      </Text>
      {showAffiliate && (
        <Text style={[styles.text, styles.affiliateText]}>
          We may earn a commission if you purchase through our links. Commission does not affect compatibility ranking.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(245, 242, 235, 0.7)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderRadius: radii.lg,
    marginVertical: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(234, 229, 220, 0.6)'
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs
  },
  icon: {
    marginRight: spacing.xs
  },
  title: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.primaryLight
  },
  text: {
    ...typography.caption,
    textAlign: 'center',
    color: colors.textTertiary,
    lineHeight: 16
  },
  affiliateText: {
    marginTop: spacing.xs,
    fontSize: 11,
    color: colors.goldDark
  }
});
