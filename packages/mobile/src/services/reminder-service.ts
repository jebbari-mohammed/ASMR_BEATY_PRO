import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';

export type ReminderTime = { hour: number; minute: number };
export type ReminderPreferences = {
  enabled: boolean;
  morning: ReminderTime;
  evening: ReminderTime;
  notificationIds: string[];
};

const DEFAULTS: ReminderPreferences = {
  enabled: false,
  morning: { hour: 8, minute: 0 },
  evening: { hour: 21, minute: 0 },
  notificationIds: []
};
const CHANNEL = 'routine-reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  })
});

function key(uid: string): string {
  return `asmr_reminders_${uid}`;
}

export class ReminderService {
  static async get(uid: string): Promise<ReminderPreferences> {
    const raw = await SecureStore.getItemAsync(key(uid));
    if (!raw) return DEFAULTS;
    try {
      const saved = JSON.parse(raw) as Partial<ReminderPreferences>;
      return {
        enabled: saved.enabled === true,
        morning: saved.morning ?? DEFAULTS.morning,
        evening: saved.evening ?? DEFAULTS.evening,
        notificationIds: Array.isArray(saved.notificationIds) ? saved.notificationIds : []
      };
    } catch {
      return DEFAULTS;
    }
  }

  static async configure(uid: string, enabled: boolean, morning?: ReminderTime, evening?: ReminderTime): Promise<ReminderPreferences> {
    const previous = await this.get(uid);
    const next: ReminderPreferences = {
      enabled,
      morning: morning ?? previous.morning,
      evening: evening ?? previous.evening,
      notificationIds: []
    };
    if (enabled) {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(CHANNEL, {
          name: 'Routine reminders',
          importance: Notifications.AndroidImportance.DEFAULT
        });
      }
      const existing = await Notifications.getPermissionsAsync();
      const permission = existing.granted ? existing : await Notifications.requestPermissionsAsync();
      if (!permission.granted) throw new Error('Notifications are disabled in device settings.');
    }

    await Promise.all(previous.notificationIds.map(id => Notifications.cancelScheduledNotificationAsync(id)));
    if (enabled) {
      try {
        for (const [time, title, body] of [
          [next.morning, 'A gentle start', 'Your morning skincare routine is ready.'],
          [next.evening, 'A quiet moment', 'Your evening skincare routine is ready.']
        ] as const) {
          next.notificationIds.push(await Notifications.scheduleNotificationAsync({
            content: { title, body, data: { route: '/(tabs)/today' } },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: time.hour, minute: time.minute, channelId: CHANNEL }
          }));
        }
      } catch (error) {
        await Promise.all(next.notificationIds.map(id => Notifications.cancelScheduledNotificationAsync(id)));
        throw error;
      }
    }
    await SecureStore.setItemAsync(key(uid), JSON.stringify(next));
    return next;
  }

  static async disable(uid: string): Promise<void> {
    await this.configure(uid, false);
  }
}
