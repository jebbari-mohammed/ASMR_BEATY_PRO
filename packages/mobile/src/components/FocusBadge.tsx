import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing, typography } from '../theme/tokens.js';

interface FocusBadgeProps {
  label: string;
  priority?: 1 | 2 | 3;
}

export const FocusBadge: React.FC<FocusBadgeProps> = ({ label, priority = 1 }) => {
  return (
    <View style={[styles.container, priority === 1 ? styles.priority1 : styles.priorityDefault]}>
      <Text style={[styles.text, priority === 1 ? styles.textPriority1 : styles.textDefault]}>
        Focus #{priority}: {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
    marginRight: spacing.xs,
    marginBottom: spacing.xs
  },
  priority1: {
    backgroundColor: colors.terracottaLight
  },
  priorityDefault: {
    backgroundColor: colors.sageLight
  },
  text: {
    ...typography.captionBold,
    fontSize: 12
  },
  textPriority1: {
    color: colors.terracotta
  },
  textDefault: {
    color: colors.sage
  }
});
