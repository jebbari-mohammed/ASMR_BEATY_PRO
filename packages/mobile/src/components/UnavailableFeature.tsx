import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { Header } from './Header';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface Props {
  eyebrow: string;
  title: string;
  description: string;
  icon: IconName;
  onClose?: () => void;
}

export function UnavailableFeature({ eyebrow, title, description, icon, onClose }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      {onClose ? (
        <View style={[styles.modalTop, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityLabel="Close">
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      ) : <Header />}
      <View style={styles.content}>
        <LinearGradient colors={['#F3F7F4', '#FAF4ED']} style={styles.artwork}>
          <View style={styles.iconRing}>
            <Ionicons name={icon} size={44} color={colors.primary} />
          </View>
        </LinearGradient>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  modalTop: { paddingHorizontal: spacing.base, alignItems: 'flex-end' },
  closeButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xxl, paddingBottom: 80 },
  artwork: { height: 210, borderRadius: radii.xl, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xxl },
  iconRing: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { ...typography.eyebrow, marginBottom: spacing.sm },
  title: { ...typography.display, marginBottom: spacing.md },
  description: { ...typography.body, fontSize: 16, lineHeight: 24 }
});
