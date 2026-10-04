import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { buildStarterPlan } from './personalized-starter';
import { OnboardingService } from './onboarding-machine';

export type RoutinePeriod = 'morning' | 'evening';
export type RoutineCategory = 'Cleanse' | 'Hydrate' | 'Treat' | 'Protect' | 'Other';
export type RoutineStep = {
  id: string;
  period: RoutinePeriod;
  category: RoutineCategory;
  name: string;
  detail: string;
  // A paused step remains editable but is omitted from the daily checklist.
  // Older saved routines have no paused field and remain active.
  paused?: boolean;
};

export function activeRoutineSteps<T extends RoutineStep>(steps: T[]): T[] {
  return steps.filter(step => step.paused !== true);
}

export function routineAvailability(steps: RoutineStep[]): 'empty' | 'all_paused' | 'active' {
  if (steps.length === 0) return 'empty';
  return activeRoutineSteps(steps).length === 0 ? 'all_paused' : 'active';
}

export const STARTER_STEPS: RoutineStep[] = [
  { id: 'm1', period: 'morning', category: 'Cleanse', name: 'Gentle cleanse', detail: 'Use a cleanser you already tolerate, or rinse with water.' },
  { id: 'm2', period: 'morning', category: 'Hydrate', name: 'Moisturize', detail: 'Apply your usual moisturizer as directed.' },
  { id: 'm3', period: 'morning', category: 'Protect', name: 'Sun protection', detail: 'Apply broad-spectrum sunscreen as directed on its label.' },
  { id: 'e1', period: 'evening', category: 'Cleanse', name: 'Gentle cleanse', detail: 'Wash off the day with a cleanser you already tolerate.' },
  { id: 'e3', period: 'evening', category: 'Hydrate', name: 'Moisturize', detail: 'Apply your usual moisturizer as directed.' }
];

function routineDocument(uid = auth().currentUser?.uid) {
  if (!uid) throw new Error('Sign in to access your routine.');
  return firestore().collection('users').doc(uid).collection('routines').doc('current');
}

function validStep(step: unknown): step is RoutineStep {
  if (!step || typeof step !== 'object') return false;
  const value = step as Record<string, unknown>;
  return typeof value.id === 'string' && /^[A-Za-z0-9_-]{2,64}$/.test(value.id)
    && (value.period === 'morning' || value.period === 'evening')
    && ['Cleanse', 'Hydrate', 'Treat', 'Protect', 'Other'].includes(String(value.category))
    && typeof value.name === 'string' && value.name.trim().length > 0 && value.name.length <= 60
    && typeof value.detail === 'string' && value.detail.length <= 180
    && (value.paused === undefined || typeof value.paused === 'boolean');
}

export class RoutineService {
  static async get(): Promise<RoutineStep[]> {
    const uid = auth().currentUser?.uid;
    if (!uid) throw new Error('Sign in to access your routine.');
    const stillCurrent = () => auth().currentUser?.uid === uid;
    const snapshot = await routineDocument(uid).get();
    if (!stillCurrent()) throw new Error('Account changed while loading your routine.');
    if (!snapshot.exists()) {
      try {
        const saved = await OnboardingService.getStarterPreferences(uid);
        if (!stillCurrent()) throw new Error('Account changed while loading your routine.');
        if (saved) return buildStarterPlan(saved).steps;
      } catch {
        // A profile read should not prevent the safe generic starter routine.
        if (!stillCurrent()) throw new Error('Account changed while loading your routine.');
      }
      return STARTER_STEPS;
    }
    const steps = snapshot.data()?.steps;
    if (!Array.isArray(steps) || !steps.every(validStep)) throw new Error('Your saved routine could not be read.');
    return steps;
  }

  static async save(steps: RoutineStep[], expectedUid: string): Promise<void> {
    if (steps.length < 1 || steps.length > 20 || !steps.every(validStep) || new Set(steps.map(step => step.id)).size !== steps.length) {
      throw new Error('A routine needs 1 to 20 valid, unique steps.');
    }
    const uid = auth().currentUser?.uid;
    if (!uid || uid !== expectedUid) throw new Error('Account changed before saving your routine.');
    await routineDocument(uid).set({ steps, updatedAt: Date.now() });
  }

  static newStep(period: RoutinePeriod): RoutineStep {
    return {
      id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      period,
      category: 'Other',
      name: '',
      detail: ''
    };
  }
}
