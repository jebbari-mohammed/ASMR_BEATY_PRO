import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, StyleProp, View } from 'react-native';
import { colors, radii, spacing, typography, shadows } from '../theme/tokens';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'gold' | 'outline' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  icon
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'gold' && styles.gold,
        variant === 'outline' && styles.outline,
        variant === 'ghost' && styles.ghost,
        disabled && styles.disabled,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'gold' ? colors.textInverse : colors.primary} />
      ) : (
        <View style={styles.contentRow}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text
            style={[
              typography.button,
              variant === 'primary' && styles.primaryText,
              variant === 'secondary' && styles.secondaryText,
              variant === 'gold' && styles.goldText,
              variant === 'outline' && styles.outlineText,
              variant === 'ghost' && styles.ghostText,
              disabled && styles.disabledText
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center'
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconContainer: {
    marginRight: spacing.sm
  },
  primary: {
    backgroundColor: colors.primary,
    ...shadows.card
  },
  primaryText: {
    color: colors.textInverse,
    fontWeight: '700'
  },
  secondary: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(45, 86, 67, 0.15)'
  },
  secondaryText: {
    color: colors.primary,
    fontWeight: '600'
  },
  gold: {
    backgroundColor: colors.gold,
    ...shadows.card
  },
  goldText: {
    color: colors.textInverse,
    fontWeight: '700'
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.border
  },
  outlineText: {
    color: colors.textPrimary,
    fontWeight: '600'
  },
  ghost: {
    backgroundColor: 'transparent'
  },
  ghostText: {
    color: colors.textSecondary
  },
  disabled: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0
  },
  disabledText: {
    color: colors.textTertiary
  }
});
