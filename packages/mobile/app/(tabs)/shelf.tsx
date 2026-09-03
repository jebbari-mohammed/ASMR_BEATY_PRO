import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, radii, shadows, gradients } from '../../src/theme/tokens';
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
  feedback: 'loved' | 'works_well' | 'neutral' | 'irritating';
}

export default function ShelfScreen() {
  const [shelfItems] = useState<OwnedProduct[]>([
    {
      id: 'p1',
      brand: 'CeraVe',
      name: 'Hydrating Facial Cleanser',
      category: 'Cleanser',
      dateStarted: 'Aug 21, 2026',
      daysActive: 14,
      feedback: 'works_well'
    },
    {
      id: 'p2',
      brand: 'La Roche-Posay',
      name: 'Toleriane Double Repair Moisturizer',
      category: 'Moisturizer',
      dateStarted: 'Aug 21, 2026',
      daysActive: 14,
      feedback: 'loved'
    },
    {
      id: 'p3',
      brand: 'EltaMD',
      name: 'UV Clear Broad-Spectrum SPF 46',
      category: 'Sunscreen',
      dateStarted: 'Aug 24, 2026',
      daysActive: 11,
      feedback: 'works_well'
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
            Catalog the formulas you own, monitor when you started them, and evaluate how your skin tolerates each ingredient.
          </Text>
        </View>

        {/* Action Buttons: Barcode & OCR */}
        <View style={styles.actionRow}>
          <Button
            title="Barcode Scanner"
            variant="primary"
            icon={<Ionicons name="barcode-outline" size={18} color={colors.textInverse} />}
            onPress={() => alert('Barcode camera scanner ready.')}
            style={{ flex: 1, marginRight: spacing.sm }}
          />
          <Button
            title="Label OCR"
            variant="secondary"
            icon={<Ionicons name="camera-outline" size={18} color={colors.primary} />}
            onPress={() => alert('Bottle label text recognition ready.')}
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
              <View style={styles.bottleIconWrap}>
                <Ionicons name="cube-outline" size={20} color={colors.primary} />
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
                <Text style={styles.productMeta}>
                  {item.category} • Started {item.dateStarted} ({item.daysActive} days active)
                </Text>
              </View>
            </View>
          </Card>
        ))}

        {/* Vetted Recommendation Card */}
        <View style={[styles.sectionHeaderRow, { marginTop: spacing.xl }]}>
          <Text style={styles.sectionTitle}>Coach Recommendation</Text>
          <Text style={styles.sectionMeta}>Filtered by SafetyEngine</Text>
        </View>

        <Card variant="elevated" style={styles.recCard}>
          <LinearGradient
            colors={gradients.champagneGlow}
            style={styles.recGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.recBadgeRow}>
              <View style={styles.recPill}>
                <Ionicons name="sparkles" size={12} color={colors.goldDark} />
                <Text style={styles.recPillText}>BEST FIT FOR VISIBLE REDNESS</Text>
              </View>
              <Text style={styles.recPrice}>$16.50 USD</Text>
            </View>

            <Text style={styles.recBrand}>SKIN1004</Text>
            <Text style={styles.recName}>Madagascar Centella Ampoule</Text>
            <Text style={styles.recDesc}>
              Single-ingredient 100% Centella Asiatica Extract. Soothes surface warmth and fortifies compromised moisture barriers.
            </Text>

            {/* Why This Product Dropdown */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowWhyModal(!showWhyModal)}
              style={styles.whyDropdown}
            >
              <Ionicons
                name={showWhyModal ? 'chevron-up' : 'information-circle-outline'}
                size={16}
                color={colors.primary}
              />
              <Text style={styles.whyDropdownText}>
                {showWhyModal ? 'Hide Safety & Compatibility Breakdown' : 'Why this product? View Breakdown'}
              </Text>
            </TouchableOpacity>

            {showWhyModal && (
              <View style={styles.whyContainer}>
                <View style={styles.whyRow}>
                  <Ionicons name="checkmark-circle" size={15} color={colors.routineDone} />
                  <Text style={styles.whyText}>Zero active ingredient conflicts with your current SPF & moisturizer.</Text>
                </View>
                <View style={styles.whyRow}>
                  <Ionicons name="checkmark-circle" size={15} color={colors.routineDone} />
                  <Text style={styles.whyText}>Completely fragrance-free and essential oil-free.</Text>
                </View>
                <View style={styles.whyRow}>
                  <Ionicons name="checkmark-circle" size={15} color={colors.routineDone} />
                  <Text style={styles.whyText}>Does not duplicate any active serum currently on your shelf.</Text>
                </View>
                <View style={styles.whyRow}>
                  <Ionicons name="checkmark-circle" size={15} color={colors.routineDone} />
                  <Text style={styles.whyText}>In-stock with verified retailer shipping to your region.</Text>
                </View>
              </View>
            )}

            <Button
              title="View Offer on iHerb ($16.50)"
              variant="primary"
              icon={<Ionicons name="open-outline" size={16} color={colors.textInverse} />}
              onPress={() => alert('Resolving trusted affiliate merchant link...')}
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
    marginVertical: spacing.md
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
    marginBottom: spacing.xl
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md
  },
  sectionTitle: {
    ...typography.h2,
    fontSize: 18
  },
  sectionMeta: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textTertiary
  },
  productCard: {
    padding: spacing.base,
    marginBottom: spacing.sm + 2
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  bottleIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md
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
    fontSize: 10,
    fontWeight: '800',
    color: colors.goldDark,
    letterSpacing: 0.8
  },
  feedbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full
  },
  feedbackLoved: {
    backgroundColor: colors.goldLight
  },
  feedbackGood: {
    backgroundColor: colors.routineDoneBg
  },
  feedbackText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 3
  },
  feedbackTextLoved: {
    color: colors.goldDark
  },
  feedbackTextGood: {
    color: colors.routineDone
  },
  productName: {
    ...typography.bodyBold,
    fontSize: 14,
    marginBottom: 2
  },
  productMeta: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary
  },
  recCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(197, 154, 111, 0.35)'
  },
  recGradient: {
    padding: spacing.base + 2
  },
  recBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm
  },
  recPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(197, 154, 111, 0.3)'
  },
  recPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.goldDark,
    letterSpacing: 0.8,
    marginLeft: 4
  },
  recPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary
  },
  recBrand: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.goldDark,
    letterSpacing: 1.2
  },
  recName: {
    ...typography.h2,
    fontSize: 18,
    marginTop: 2,
    marginBottom: spacing.xs
  },
  recDesc: {
    ...typography.caption,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary
  },
  whyDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.xs
  },
  whyDropdownText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 4
  },
  whyContainer: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  whyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs + 2
  },
  whyText: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    flex: 1
  }
});
