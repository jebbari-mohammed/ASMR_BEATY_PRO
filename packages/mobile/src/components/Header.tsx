import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, radii, shadows } from '../theme/tokens';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, showBack = false }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 20) + 8 }]}>
      <View style={styles.topRow}>
        <View style={styles.brandGroup}>
          {showBack && (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
          <View>
            <View style={styles.logoRow}>
              <Text style={styles.brandTitle}>ASMR BEAUTY</Text>
            </View>
            <Text style={styles.tagline}>YOUR SKINCARE JOURNAL</Text>
          </View>
        </View>

        <View style={styles.actionsGroup}>
          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.8}
            onPress={() => router.push('/modal/settings')}
            accessibilityLabel="Open Settings and Privacy"
          >
            <Ionicons name="settings-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {title && (
        <View style={styles.titleContainer}>
          {subtitle && <Text style={styles.subtitle}>{subtitle.toUpperCase()}</Text>}
          <Text style={styles.mainTitle}>{title}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  backButton: {
    marginRight: spacing.sm,
    padding: spacing.xs
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: colors.primary
  },
  tagline: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: colors.textTertiary,
    marginTop: 1
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  titleContainer: {
    marginTop: spacing.sm
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: colors.goldDark,
    marginBottom: 2
  },
  mainTitle: {
    ...typography.display,
    fontSize: 28,
    lineHeight: 34
  }
});
