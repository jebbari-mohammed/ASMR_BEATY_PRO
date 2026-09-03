import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing, typography, radii } from '../../src/theme/tokens.js';
import { Card } from '../../src/components/Card.js';
import { Button } from '../../src/components/Button.js';
import { DisclaimerBar } from '../../src/components/DisclaimerBar.js';

interface OwnedProduct {
  id: string;
  brand: string;
  name: string;
  category: string;
  dateStarted: string;
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
      feedback: 'works_well'
    },
    {
      id: 'p2',
      brand: 'La Roche-Posay',
      name: 'Toleriane Double Repair Face Moisturizer',
      category: 'Moisturizer',
      dateStarted: 'Aug 21, 2026',
      feedback: 'loved'
    },
    {
      id: 'p3',
      brand: 'EltaMD',
      name: 'UV Clear Broad-Spectrum SPF 46',
      category: 'Sunscreen',
      dateStarted: 'Aug 24, 2026',
      feedback: 'works_well'
    }
  ]);

  const [showWhyModal, setShowWhyModal] = useState<boolean>(false);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={typography.captionBold}>PRODUCT INVENTORY & MEMORY</Text>
        <Text style={[typography.h1, styles.title]}>My Shelf</Text>
        <Text style={typography.body}>
          Keep track of products you own, when you started them, and how your skin responded.
        </Text>
      </View>

      {/* Quick Add Barcode / Label Scanner Action */}
      <View style={styles.scanActions}>
        <Button
          title="Scan Product Barcode"
          onPress={() => alert('Barcode scanner opened')}
          style={{ flex: 1, marginRight: spacing.sm }}
        />
        <Button
          title="Label OCR"
          variant="secondary"
          onPress={() => alert('Camera opened for bottle label OCR')}
        />
      </View>

      {/* Owned Products List */}
      <View style={styles.sectionHeader}>
        <Text style={typography.h2}>Currently Using ({shelfItems.length})</Text>
      </View>

      {shelfItems.map(item => (
        <Card key={item.id} variant="elevated" style={styles.productCard}>
          <View style={styles.productHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.brandText}>{item.brand}</Text>
              <Text style={typography.bodyBold}>{item.name}</Text>
              <Text style={typography.caption}>Started: {item.dateStarted} • {item.category}</Text>
            </View>
            <View style={styles.feedbackPill}>
              <Text style={styles.feedbackText}>
                {item.feedback === 'loved' ? '⭐ Loved' : '✓ Works Well'}
              </Text>
            </View>
          </View>
        </Card>
      ))}

      {/* Vetted Safe Recommendation (Section 16 & 54) */}
      <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
        <Text style={typography.h2}>Coach Recommendation</Text>
        <Text style={typography.caption}>Evaluated against your allergies, routine, and latest scan</Text>
      </View>

      <Card variant="elevated" style={styles.recommendationCard}>
        <View style={styles.recBadge}>
          <Text style={styles.recBadgeText}>BEST FIT FOR VISIBLE REDNESS</Text>
        </View>

        <Text style={styles.brandText}>SKIN1004</Text>
        <Text style={[typography.h3, { marginTop: 2 }]}>Madagascar Centella Ampoule</Text>
        <Text style={[typography.caption, { marginVertical: spacing.xs }]}>
          100% Centella Asiatica Extract • Fragrance-Free • $16.50 USD
        </Text>

        {/* Transparent "Why This Product?" */}
        <TouchableOpacity
          style={styles.whyButton}
          onPress={() => setShowWhyModal(!showWhyModal)}
        >
          <Text style={styles.whyButtonText}>
            {showWhyModal ? 'Hide compatibility breakdown ▴' : 'Why this product? ▾'}
          </Text>
        </TouchableOpacity>

        {showWhyModal && (
          <View style={styles.whyContainer}>
            <Text style={styles.whyCheck}>✓ Matches your sensitive skin profile</Text>
            <Text style={styles.whyCheck}>✓ Safe to introduce: no active conflict with your routine</Text>
            <Text style={styles.whyCheck}>✓ Zero added fragrance or essential oils</Text>
            <Text style={styles.whyCheck}>✓ Does not duplicate any existing owned serum</Text>
          </View>
        )}

        <View style={styles.retailRow}>
          <Button
            title="View Offer on iHerb ($16.50)"
            onPress={() => alert('Opening trusted affiliate merchant link...')}
            style={{ flex: 1, marginTop: spacing.md }}
          />
        </View>
      </Card>

      <DisclaimerBar showAffiliate={true} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    padding: spacing.base,
    paddingBottom: spacing.huge
  },
  header: {
    marginBottom: spacing.base
  },
  title: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs
  },
  scanActions: {
    flexDirection: 'row',
    marginBottom: spacing.xl
  },
  sectionHeader: {
    marginBottom: spacing.sm
  },
  productCard: {
    marginBottom: spacing.sm
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  brandText: {
    ...typography.captionBold,
    color: colors.sage,
    fontSize: 12,
    textTransform: 'uppercase'
  },
  feedbackPill: {
    backgroundColor: colors.surfaceSecondary,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full
  },
  feedbackText: {
    ...typography.captionBold,
    fontSize: 11,
    color: colors.textSecondary
  },
  recommendationCard: {
    padding: spacing.base,
    borderWidth: 1.5,
    borderColor: colors.sage
  },
  recBadge: {
    backgroundColor: colors.sageLight,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs
  },
  recBadgeText: {
    ...typography.captionBold,
    color: colors.sage,
    fontSize: 10
  },
  whyButton: {
    marginTop: spacing.xs,
    paddingVertical: spacing.xs
  },
  whyButtonText: {
    ...typography.captionBold,
    color: colors.calmFocus
  },
  whyContainer: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radii.md,
    marginVertical: spacing.xs
  },
  whyCheck: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 3
  },
  retailRow: {
    flexDirection: 'row'
  }
});
