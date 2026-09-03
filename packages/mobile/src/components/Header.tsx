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
              <View style={styles.proBadge}>
                <Text style={styles.proText}>PRO</Text>
              </View>
            </View>
            <Text style={styles.tagline}>INTELLIGENT SKIN COACH</Text>
          </View>
        </View>

        <View style={styles.actionsGroup}>
          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.8}
            onPress={() => router.push('/modal/spot-journal')}
          >
            <Ionicons name="camera-outline" size={18} color={colors.primary} />
            <View style={styles.badgeDot} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.avatarRing} activeOpacity={0.8}>
            <View style={styles.avatarInner}>
              <Text style={styles.avatarText}>S</Text>
            </View>
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
  proBadge: {
    backgroundColor: colors.gold,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.xs,
    marginLeft: 6
  },
  proText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textInverse,
    letterSpacing: 0.8
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
    marginRight: spacing.sm,
    ...shadows.subtle,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  badgeDot: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.terracotta
  },
  avatarRing: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    padding: 2,
    backgroundColor: colors.goldLight,
    borderWidth: 1.5,
    borderColor: colors.gold
  },
  avatarInner: {
    flex: 1,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textInverse
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
