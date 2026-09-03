import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, radii, spacing, shadows } from '../theme/tokens';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'elevated' | 'subtle' | 'outlined' | 'twilight' | 'champagne';
}

export const Card: React.FC<CardProps> = ({ children, style, variant = 'elevated' }) => {
  return (
    <View
      style={[
        styles.base,
        variant === 'elevated' && styles.elevated,
        variant === 'subtle' && styles.subtle,
        variant === 'outlined' && styles.outlined,
        variant === 'twilight' && styles.twilight,
        variant === 'champagne' && styles.champagne,
        style
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    padding: spacing.base,
    backgroundColor: colors.surface
  },
  elevated: {
    ...shadows.card,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  subtle: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: 'rgba(234, 229, 220, 0.4)'
  },
  outlined: {
    backgroundColor: colors.surfaceTranslucent,
    borderWidth: 1,
    borderColor: colors.border
  },
  twilight: {
    backgroundColor: colors.surfaceTwilightCard,
    borderWidth: 1,
    borderColor: colors.borderDark,
    ...shadows.subtle
  },
  champagne: {
    backgroundColor: colors.goldLight,
    borderWidth: 1,
    borderColor: 'rgba(197, 154, 111, 0.25)',
    ...shadows.subtle
  }
});
