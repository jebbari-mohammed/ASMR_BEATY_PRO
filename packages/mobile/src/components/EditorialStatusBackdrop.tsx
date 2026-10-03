import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/tokens';

/** Keeps status icons legible while the editorial hero scrolls beneath them. */
export function EditorialStatusBackdrop() {
  const { top } = useSafeAreaInsets();
  return <View pointerEvents="none" style={[styles.backdrop, { height: top }]} />;
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: colors.primary
  }
});
