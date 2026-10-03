import * as SecureStore from 'expo-secure-store';

const DAYS_KEY = 'asmr_routine_days_v1';

/** Remove checkoffs written by the retired device-only routine store. */
export async function clearLegacyRoutineCheckoffs(): Promise<void> {
  const raw = await SecureStore.getItemAsync(DAYS_KEY);
  let days: unknown = [];
  if (raw) {
    try { days = JSON.parse(raw); }
    catch { throw new Error('The legacy routine index could not be read.'); }
  }
  if (!Array.isArray(days) || !days.every(day =>
    typeof day === 'string' && day.length > 0 && day.length <= 128
  )) {
    throw new Error('The legacy routine index is invalid.');
  }
  const keys = [...new Set(days)].map(day => `asmr_daily_routine_${day}`);
  const deletions = await Promise.allSettled(keys.map(key => SecureStore.deleteItemAsync(key)));
  if (deletions.some(result => result.status === 'rejected')) {
    throw new Error('Some legacy routine checkoffs could not be removed.');
  }
  await SecureStore.deleteItemAsync(DAYS_KEY);
}
