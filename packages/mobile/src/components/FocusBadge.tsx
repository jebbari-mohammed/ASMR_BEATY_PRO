import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '../theme/tokens';

interface FocusBadgeProps {
  label: string;
  priority?: 1 | 2 | 3;
}

export const FocusBadge: React.FC<FocusBadgeProps> = ({ label, priority = 1 }) => {
  return (
    <View style={[styles.container, priority === 1 ? styles.priority1 : priority === 2 ? styles.priority2 : styles.priority3]}>
      <Ionicons
        name={priority === 1 ? 'sparkles' : priority === 2 ? 'water-outline' : 'leaf-outline'}
        size={11}
        color={priority === 1 ? colors.terracotta : priority === 2 ? colors.goldDark : colors.primaryLight}
        style={styles.icon}
      />
      <Text style={[styles.text, priority === 1 ? styles.textPriority1 : priority === 2 ? styles.textPriority2 : styles.textPriority3]}>
        PRIORITY #{priority} • {label.toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
    borderWidth: 1
  },
  icon: {
    marginRight: 4
  },
  priority1: {
    backgroundColor: colors.terracottaLight,
    borderColor: 'rgba(186, 109, 84, 0.25)'
  },
  priority2: {
    backgroundColor: colors.goldLight,
    borderColor: 'rgba(197, 154, 111, 0.3)'
  },
  priority3: {
    backgroundColor: colors.primarySoft,
    borderColor: 'rgba(45, 86, 67, 0.2)'
  },
  text: {
    ...typography.captionBold,
    fontSize: 10,
    letterSpacing: 0.8
  },
  textPriority1: {
    color: colors.terracotta
  },
  textPriority2: {
    color: colors.goldDark
  },
  textPriority3: {
    color: colors.primaryLight
  }
});
