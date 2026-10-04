import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export type ShelfCategory = 'Cleanser' | 'Moisturizer' | 'Sunscreen' | 'Treatment' | 'Other';
export interface ShelfItem {
  id: string;
  brand: string;
  name: string;
  category: ShelfCategory;
  openedOn: string | null;
  addedAt: number;
}

function collection(expectedUid: string) {
  const uid = auth().currentUser?.uid;
  if (!uid || uid !== expectedUid) throw new Error('Account changed while accessing your shelf.');
  return firestore().collection('users').doc(uid).collection('shelf');
}

function validOpenedOn(value: string | null): boolean {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

export class ShelfService {
  static async list(expectedUid: string): Promise<ShelfItem[]> {
    const result = await collection(expectedUid).orderBy('addedAt', 'desc').limit(100).get();
    if (auth().currentUser?.uid !== expectedUid) throw new Error('Account changed while loading your shelf.');
    return result.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ShelfItem));
  }

  static async add(input: Pick<ShelfItem, 'brand' | 'name' | 'category' | 'openedOn'>, expectedUid: string): Promise<ShelfItem> {
    const name = input.name.trim().slice(0, 100);
    const brand = input.brand.trim().slice(0, 80);
    if (name.length < 2) throw new Error('Enter the product name.');
    if (!validOpenedOn(input.openedOn)) throw new Error('Enter a real opening date in YYYY-MM-DD format.');
    const ref = collection(expectedUid).doc();
    const item: ShelfItem = { id: ref.id, name, brand, category: input.category, openedOn: input.openedOn || null, addedAt: Date.now() };
    await ref.set(item);
    return item;
  }

  static async update(id: string, input: Pick<ShelfItem, 'brand' | 'name' | 'category' | 'openedOn'>, expectedUid: string): Promise<void> {
    if (!/^[A-Za-z0-9]{8,40}$/.test(id)) throw new Error('Invalid shelf item.');
    const name = input.name.trim().slice(0, 100);
    const brand = input.brand.trim().slice(0, 80);
    if (name.length < 2) throw new Error('Enter the product name.');
    if (!validOpenedOn(input.openedOn)) throw new Error('Enter a real opening date in YYYY-MM-DD format.');
    await collection(expectedUid).doc(id).update({ name, brand, category: input.category, openedOn: input.openedOn || null });
  }

  static async remove(id: string, expectedUid: string): Promise<void> {
    if (!/^[A-Za-z0-9]{8,40}$/.test(id)) throw new Error('Invalid shelf item.');
    await collection(expectedUid).doc(id).delete();
  }
}
