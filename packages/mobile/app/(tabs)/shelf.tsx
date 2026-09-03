import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, radii, shadows, gradients } from '../../src/theme/tokens';
import { localImages } from '../../src/theme/images';
import { Header } from '../../src/components/Header';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { DisclaimerBar } from '../../src/components/DisclaimerBar';

interface OwnedProduct {
  id: string;
  brand: string;
  name: string;
  category: string;
  dateStarted: string;
  daysActive: number;
  actives: string;
  image: any;
  feedback: 'loved' | 'works_well' | 'neutral' | 'irritating';
}

export default function ShelfScreen() {
  const [shelfItems] = useState<OwnedProduct[]>([
    {
      id: 'p1',
      brand: 'AURA',
      name: 'Honey Botanical Soothing Serum',
      category: 'Treatment',
      dateStarted: 'Aug 21, 2026',
      daysActive: 14,
      actives: 'Propolis 83% • Royal Jelly',
      image: localImages.serumBottle,
      feedback: 'loved'
    },
    {
      id: 'p2',
      brand: 'KŌR',
      name: 'Barrier Recovery Cream',
      category: 'Moisturizer',
      dateStarted: 'Aug 21, 2026',
      daysActive: 14,
      actives: 'Ceramides NP/AP/EOP • Squalane',
      image: localImages.creamBottle,
      feedback: 'loved'
    }
  ]);

  const [showWhyModal, setShowWhyModal] = useState<boolean>(false);

  return (
    <View style={styles.screen}>
      <Header />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={typography.eyebrow}>PRODUCT INVENTORY & MEMORY</Text>
          <Text style={styles.title}>My Shelf</Text>
          <Text style={styles.subtitle}>
            Catalog formulas you own, track when you opened them, and observe how your barrier tolerates each active.
          </Text>
        </View>

        {/* Action Buttons: Barcode & OCR */}
        <View style={styles.actionRow}>
          <Button
            title="Scan Barcode"
            variant="primary"
            icon={<Ionicons name="barcode-outline" size={18} color={colors.textInverse} />}
            onPress={() => alert('Launching barcode scanner...')}
            style={{ flex: 1, marginRight: spacing.sm }}
          />
          <Button
            title="Label OCR Photo"
            variant="secondary"
            icon={<Ionicons name="camera-outline" size={18} color={colors.primary} />}
            onPress={() => alert('Launching bottle label OCR camera...')}
            style={{ flex: 1 }}
          />
        </View>

        {/* Owned Products */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Currently In Routine ({shelfItems.length})</Text>
          <Text style={styles.sectionMeta}>Verified Formulas</Text>
        </View>

        {shelfItems.map(item => (
          <Card key={item.id} variant="elevated" style={styles.productCard}>
            <View style={styles.productRow}>
              <View style={styles.productImgWrap}>
                <Image source={item.image} style={styles.productThumb} resizeMode="cover" />
              </View>

              <View style={styles.productInfo}>
                <View style={styles.brandRow}>
                  <Text style={styles.brandText}>{item.brand.toUpperCase()}</Text>
                  <View style={[styles.feedbackBadge, item.feedback === 'loved' ? styles.feedbackLoved : styles.feedbackGood]}>
                    <Ionicons
                      name={item.feedback === 'loved' ? 'star' : 'checkmark-circle'}
                      size={11}
                      color={item.feedback === 'loved' ? colors.goldDark : colors.routineDone}
                    />
                    <Text style={[styles.feedbackText, item.feedback === 'loved' ? styles.feedbackTextLoved : styles.feedbackTextGood]}>
                      {item.feedback === 'loved' ? 'Loved' : 'Works Well'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.activeFormulaText}>{item.actives}</Text>
                <Text style={styles.productMeta}>
                  {item.category} • Started {item.dateStarted} ({item.daysActive}d active)
                </Text>
              </View>
            </View>
          </Card>
        ))}

        {/* Vetted Recommendation Card with Real Product Packshot */}
        <View style={[styles.sectionHeaderRow, { marginTop: spacing.xl }]}>
          <Text style={styles.sectionTitle}>Coach Recommendation</Text>
          <Text style={styles.sectionMeta}>Vetted by SafetyEngine</Text>
        </View>

        <Card variant="elevated" style={styles.recCard}>
          <LinearGradient
            colors={gradients.champagneGlow}
            style={styles.recGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.recTopRow}>
              <View style={styles.recPill}>
                <Ionicons name="sparkles" size={12} color={colors.goldDark} />
                <Text style={styles.recPillText}>98% COMPATIBILITY MATCH</Text>
              </View>
              <Text style={styles.priceText}>$18.00</Text>
            </View>

            <View style={styles.recProductRow}>
              <Image source={localImages.serumBottle} style={styles.recProductThumb} />

              <View style={styles.recProductDetails}>
                <Text style={styles.recBrand}>AURA BOTANICALS</Text>
                <Text style={styles.recTitle}>Nourishing Honey Calming Serum</Text>
                <Text style={styles.recDesc}>
                  Targeted barrier soothing for visible mid-cheek redness without conflicting with your evening routine.
                </Text>
              </View>
            </View>

            {/* Why This Fits Transparency Pill */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowWhyModal(!showWhyModal)}
              style={styles.whyButton}
            >
              <Ionicons name="information-circle" size={16} color={colors.primary} />
              <Text style={styles.whyButtonText}>Why This Product? (Safety Breakdown)</Text>
              <Ionicons name={showWhyModal ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
            </TouchableOpacity>

            {showWhyModal && (
              <View style={styles.whyBox}>
                <View style={styles.whyItem}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.routineDone} />
                  <Text style={styles.whyItemText}>Zero conflicting actives with your current cleanser & SPF</Text>
                </View>
                <View style={styles.whyItem}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.routineDone} />
                  <Text style={styles.whyItemText}>Alcohol-free & fragrance-free formulation</Text>
                </View>
                <View style={styles.whyItem}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.routineDone} />
                  <Text style={styles.whyItemText}>Available for direct dispatch via authorized partner</Text>
                </View>
              </View>
            )}

            <Button
              title="View at Authorized Retailer (iHerb)"
              variant="luxury"
              icon={<Ionicons name="open-outline" size={16} color={colors.surfaceTwilight} />}
              onPress={() => alert('Opening verified partner store...')}
              style={{ marginTop: spacing.md }}
            />
          </LinearGradient>
        </Card>

        <DisclaimerBar showAffiliate={true} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  container: {
    flex: 1
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.huge
  },
  headerSection: {
    marginTop: spacing.xs,
    marginBottom: spacing.md
  },
  title: {
    ...typography.display,
    fontSize: 28,
    lineHeight: 34,
    marginTop: spacing.xxs,
    marginBottom: spacing.xs
  },
  subtitle: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20
  },
  actionRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm
  },
  sectionTitle: {
    ...typography.title2,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary
  },
  sectionMeta: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textTertiary
  },
  productCard: {
    marginBottom: spacing.sm,
    padding: spacing.sm + 4
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  productImgWrap: {
    width: 64,
    height: 64,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(26, 56, 43, 0.08)',
    backgroundColor: colors.surfaceSubtle,
    marginRight: spacing.md
  },
  productThumb: {
    width: '100%',
    height: '100%'
  },
  productInfo: {
    flex: 1
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2
  },
  brandText: {
    ...typography.eyebrow,
    fontSize: 10,
    color: colors.goldDark,
    letterSpacing: 0.8
  },
  feedbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full
  },
  feedbackLoved: {
    backgroundColor: 'rgba(197, 154, 111, 0.15)'
  },
  feedbackGood: {
    backgroundColor: 'rgba(74, 124, 89, 0.1)'
  },
  feedbackText: {
    ...typography.captionBold,
    fontSize: 10,
    marginLeft: 3
  },
  feedbackTextLoved: {
    color: colors.goldDark
  },
  feedbackTextGood: {
    color: colors.routineDone
  },
  productName: {
    ...typography.title2,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2
  },
  activeFormulaText: {
    ...typography.captionBold,
    fontSize: 11,
    color: colors.primary,
    marginBottom: 2
  },
  productMeta: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textTertiary
  },
  recCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(197, 154, 111, 0.3)'
  },
  recGradient: {
    padding: spacing.base
  },
  recTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md
  },
  recPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
    ...shadows.subtle
  },
  recPillText: {
    ...typography.captionBold,
    fontSize: 10,
    color: colors.goldDark,
    marginLeft: 4,
    letterSpacing: 0.8
  },
  priceText: {
    ...typography.metricValue,
    fontSize: 18,
    color: colors.primary
  },
  recProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md
  },
  recProductThumb: {
    width: 72,
    height: 72,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 154, 111, 0.4)',
    marginRight: spacing.md
  },
  recProductDetails: {
    flex: 1
  },
  recBrand: {
    ...typography.eyebrow,
    fontSize: 10,
    color: colors.goldDark,
    letterSpacing: 0.8,
    marginBottom: 2
  },
  recTitle: {
    ...typography.title2,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 3
  },
  recDesc: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16
  },
  whyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radii.md,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(26, 56, 43, 0.08)'
  },
  whyButtonText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 12,
    flex: 1,
    marginLeft: spacing.xs
  },
  whyBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: radii.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(26, 56, 43, 0.06)'
  },
  whyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  whyItemText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textPrimary,
    marginLeft: 6
  }
});
