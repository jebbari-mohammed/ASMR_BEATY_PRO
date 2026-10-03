import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export interface RoutineLog {
  day: string;
  completedIds: string[];
  updatedAt: number;
}

export interface RoutineLogView {
  log: RoutineLog | null;
  pendingWrites: boolean;
}

export class RoutineLogCorrectionError extends Error {
  constructor() {
    super('The latest step change could not sync.');
    this.name = 'RoutineLogCorrectionError';
  }
}

const COLLECTION = 'routineLogs';

function userCollection() {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('Sign in to save routine activity.');
  return firestore().collection('users').doc(uid).collection(COLLECTION);
}

function validDay(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Invalid calendar day.');
}

export class RoutineLogService {
  static async get(day: string): Promise<RoutineLog | null> {
    validDay(day);
    const doc = await userCollection().doc(day).get();
    if (!doc.exists()) return null;
    const data = doc.data();
    return {
      day,
      completedIds: Array.isArray(data?.completedIds) ? data.completedIds.filter((id: unknown) => typeof id === 'string') : [],
      updatedAt: Number(data?.updatedAt ?? 0)
    };
  }

  static watch(day: string, onChange: (view: RoutineLogView) => void, onError: (error: Error) => void): () => void {
    validDay(day);
    return userCollection().doc(day).onSnapshot({ includeMetadataChanges: true }, snapshot => {
      const data = snapshot.data();
      onChange({
        log: snapshot.exists() ? {
          day,
          completedIds: Array.isArray(data?.completedIds)
            ? data.completedIds.filter((id: unknown): id is string => typeof id === 'string')
            : [],
          updatedAt: Number(data?.updatedAt ?? 0)
        } : null,
        pendingWrites: snapshot.metadata.hasPendingWrites
      });
    }, onError);
  }

  static async setStep(
    day: string,
    stepId: string,
    completed: boolean,
    currentStepIds: string[],
    latestIntent?: () => boolean | undefined
  ): Promise<void> {
    validDay(day);
    if (!/^[A-Za-z0-9_-]{2,64}$/.test(stepId)) throw new Error('Invalid routine step.');
    if (currentStepIds.length < 1 || currentStepIds.length > 20 ||
        !currentStepIds.includes(stepId) ||
        new Set(currentStepIds).size !== currentStepIds.length ||
        !currentStepIds.every(id => /^[A-Za-z0-9_-]{2,64}$/.test(id))) {
      throw new Error('The current routine could not be verified.');
    }
    const uid = auth().currentUser?.uid;
    if (!uid) throw new Error('Sign in to save routine activity.');
    const user = firestore().collection('users').doc(uid);
    const reference = user.collection(COLLECTION).doc(day);
    const routineReference = user.collection('routines').doc('current');
    // Field transforms merge independent checkoffs from two devices. Writing
    // the entire array from a screen's local snapshot would drop the other
    // device's changes whenever the snapshots differ.
    try {
      await reference.set({
        day,
        completedIds: completed
          ? firestore.FieldValue.arrayUnion(stepId)
          : firestore.FieldValue.arrayRemove(stepId),
        updatedAt: Date.now()
      }, { merge: true });
    } catch (cause) {
      // A completed step removed from the routine can remain in a past day log.
      // If that fills the 20-ID rule limit, compact the latest server value in
      // a transaction before adding this step. Revoked memberships still fail.
      const code = String((cause as { code?: unknown })?.code ?? '');
      if (!completed || !code.includes('permission-denied')) throw cause;
      try {
        await firestore().runTransaction(async transaction => {
          const snapshot = await transaction.get(reference);
          const routine = await transaction.get(routineReference);
          const saved = snapshot.data()?.completedIds;
          if (!Array.isArray(saved)) throw new Error('No saved steps to compact.');
          let currentIds = new Set(currentStepIds);
          if (routine.exists()) {
            const latestSteps = routine.data()?.steps;
            if (!Array.isArray(latestSteps) || latestSteps.length < 1 || latestSteps.length > 20 ||
                !latestSteps.every((step: unknown) => step && typeof step === 'object' &&
                  typeof (step as { id?: unknown }).id === 'string' &&
                  /^[A-Za-z0-9_-]{2,64}$/.test((step as { id: string }).id))) {
              throw new Error('The saved routine could not be verified.');
            }
            currentIds = new Set(latestSteps.map((step: { id: string }) => step.id));
          }
          if (!currentIds.has(stepId)) throw new Error('The step is no longer in your routine.');
          const retained = saved.filter((id: unknown): id is string => typeof id === 'string' && currentIds.has(id));
          if (retained.length === saved.length) throw new Error('No retired steps to compact.');
          transaction.set(reference, {
            day,
            completedIds: [...new Set([...retained, stepId])],
            updatedAt: Date.now()
          }, { merge: true });
        });
      } catch {
        throw cause;
      }
      // A user may undo this checkoff while the denied add is being compacted.
      // The undo transform can reach the server before the transaction commits;
      // apply it once more afterward so the most recent tap wins.
      if (latestIntent?.() === false) {
        try {
          await reference.set({
            day,
            completedIds: firestore.FieldValue.arrayRemove(stepId),
            updatedAt: Date.now()
          }, { merge: true });
        } catch {
          throw new RoutineLogCorrectionError();
        }
      }
    }
  }

  static async recent(limit = 60): Promise<RoutineLog[]> {
    const result = await userCollection().orderBy('day', 'desc').limit(Math.min(Math.max(limit, 1), 90)).get();
    return result.docs.map((doc) => {
      const data = doc.data();
      return { day: doc.id, completedIds: Array.isArray(data.completedIds) ? data.completedIds : [], updatedAt: Number(data.updatedAt ?? 0) };
    });
  }
}
