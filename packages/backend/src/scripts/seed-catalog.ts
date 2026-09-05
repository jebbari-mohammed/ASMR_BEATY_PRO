import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

export async function seedCatalog() {
  let seedFilePath = path.join(__dirname, '../data/seed-products.json');
  if (!fs.existsSync(seedFilePath)) {
    seedFilePath = path.join(__dirname, '../../src/data/seed-products.json');
  }
  const rawData = fs.readFileSync(seedFilePath, 'utf-8');
  const products = JSON.parse(rawData);

  console.log(`[SeedCatalog] Found ${products.length} products to import.`);

  for (const item of products) {
    const { offers, ...productData } = item;

    // Save Product
    await db.collection('products').doc(productData.productId).set(productData, { merge: true });
    console.log(`  ✓ Product saved: ${productData.brand} ${productData.name} (${productData.productId})`);

    // Save Offers as subcollection
    if (offers && Array.isArray(offers)) {
      for (const offer of offers) {
        await db
          .collection('products')
          .doc(productData.productId)
          .collection('offers')
          .doc(offer.offerId)
          .set(offer, { merge: true });

        // Also save in root offers collection for fast global offer lookup
        await db.collection('offers').doc(offer.offerId).set(offer, { merge: true });
        console.log(`    ↳ Offer saved: ${offer.merchantDisplayName} - $${offer.price} (${offer.offerId})`);
      }
    }
  }

  console.log('[SeedCatalog] Product catalog seed completed successfully.');
}

if (require.main === module) {
  seedCatalog()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[SeedCatalog] Failed:', err);
      process.exit(1);
    });
}
