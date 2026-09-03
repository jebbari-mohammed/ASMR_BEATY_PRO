import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, StyleProp, View } from 'react-native';
import { colors, radii, spacing, typography, shadows } from '../theme/tokens';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'gold' | 'luxury' | 'outline' | 'ghost';
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
        (variant === 'gold' || variant === 'luxury') && styles.gold,
        variant === 'outline' && styles.outline,
        variant === 'ghost' && styles.ghost,
        disabled && styles.disabled,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'gold' || variant === 'luxury' ? colors.textInverse : colors.primary} />
      ) : (
        <View style={styles.contentRow}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text
            style={[
              typography.button,
              variant === 'primary' && styles.primaryText,
              variant === 'secondary' && styles.secondaryText,
              (variant === 'gold' || variant === 'luxury') && styles.goldText,
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
    height: 48,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl
  },
  primary: {
    backgroundColor: colors.primary,
    ...shadows.subtle
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(26, 56, 43, 0.12)',
    ...shadows.subtle
  },
  gold: {
    backgroundColor: colors.goldDark,
    ...shadows.subtle
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary
  },
  ghost: {
    backgroundColor: 'transparent'
  },
  disabled: {
    opacity: 0.45
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconContainer: {
    marginRight: spacing.xs
  },
  primaryText: {
    color: colors.textInverse
  },
  secondaryText: {
    color: colors.primary
  },
  goldText: {
    color: colors.textInverse
  },
  outlineText: {
    color: colors.primary
  },
  ghostText: {
    color: colors.primary
  },
  disabledText: {
    color: colors.textSecondary
  }
});
