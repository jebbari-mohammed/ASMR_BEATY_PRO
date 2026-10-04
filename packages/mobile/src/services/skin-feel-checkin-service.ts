import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';

export const SKIN_FEELS = ['comfortable', 'dry_tight', 'oily', 'sensitive', 'mixed'] as const;
export type SkinFeel = typeof SKIN_FEELS[number];

export interface SkinFeelCheckin {
  day: string;
  feel: SkinFeel;
  updatedAt: number;
}

export interface SkinFeelCheckinView {
  checkin: SkinFeelCheckin | null;
  pendingWrites: boolean;
}

const COLLECTION = 'skinFeelCheckins';
const RECENT_LIMIT = 14;

export function localDayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function validDay(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const [year, month, date] = day.split('-').map(Number);
  const parsed = new Date(year, month - 1, date);
  return parsed.getFullYear() === year && parsed.getMonth() + 1 === month && parsed.getDate() === date;
}

function requireAccount(uid: string) {
  if (!uid || auth().currentUser?.uid !== uid) throw new Error('Sign in to save your check-in.');
}

function collectionFor(uid: string) {
  requireAccount(uid);
  return firestore().collection('users').doc(uid).collection(COLLECTION);
}

function parseCheckin(day: string, data: Record<string, unknown> | undefined): SkinFeelCheckin | null {
  if (!validDay(day) || !data || data.day !== day ||
      !SKIN_FEELS.includes(data.feel as SkinFeel) ||
      typeof data.updatedAt !== 'number' || !Number.isSafeInteger(data.updatedAt)) return null;
  return { day, feel: data.feel as SkinFeel, updatedAt: data.updatedAt };
}

export class SkinFeelCheckinService {
  static watchToday(
    day: string,
    uid: string,
    onChange: (view: SkinFeelCheckinView) => void,
    onError: (error: Error) => void
  ): () => void {
    if (!validDay(day)) throw new Error('Invalid calendar day.');
    return collectionFor(uid).doc(day).onSnapshot({ includeMetadataChanges: true }, snapshot => {
      if (auth().currentUser?.uid !== uid) return;
      onChange({
        checkin: snapshot.exists() ? parseCheckin(day, snapshot.data()) : null,
        pendingWrites: snapshot.metadata.hasPendingWrites
      });
    }, error => { if (auth().currentUser?.uid === uid) onError(error); });
  }

  static async setToday(day: string, uid: string, feel: SkinFeel): Promise<void> {
    if (!validDay(day) || day !== localDayKey()) throw new Error('Check in for today only.');
    if (!SKIN_FEELS.includes(feel)) throw new Error('Choose a listed skin feel.');
    requireAccount(uid);
    await functions().httpsCallable('changeSkinFeelCheckin')({ day, feel });
    requireAccount(uid);
  }

  static async removeToday(day: string, uid: string): Promise<void> {
    if (!validDay(day) || day !== localDayKey()) throw new Error('Remove today’s check-in only.');
    requireAccount(uid);
    await functions().httpsCallable('changeSkinFeelCheckin')({ day, feel: null });
    requireAccount(uid);
  }

  static async recent(uid: string): Promise<SkinFeelCheckin[]> {
    const result = await collectionFor(uid).orderBy('day', 'desc').limit(RECENT_LIMIT).get();
    requireAccount(uid);
    return result.docs.map(doc => parseCheckin(doc.id, doc.data())).filter((item): item is SkinFeelCheckin => item !== null);
  }
}
