import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, radii } from '../theme/tokens';

interface DisclaimerBarProps {
  showAffiliate?: boolean;
}

export const DisclaimerBar: React.FC<DisclaimerBarProps> = ({ showAffiliate = true }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Cosmetic wellness and routine coaching. Not a medical device; does not diagnose, treat, or cure skin diseases.
      </Text>
      {showAffiliate && (
        <Text style={[styles.text, styles.affiliateText]}>
          We may earn a commission from affiliate links. This does not affect our compatibility ranking.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radii.md,
    marginVertical: spacing.md
  },
  text: {
    ...typography.caption,
    textAlign: 'center',
    color: colors.textTertiary,
    lineHeight: 16
  },
  affiliateText: {
    marginTop: spacing.xs,
    fontStyle: 'italic'
  }
});
