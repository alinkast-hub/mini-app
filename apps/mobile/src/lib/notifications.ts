import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { TimerMode } from '@/types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleSessionEndNotification(
  mode: TimerMode,
  soundEnabled: boolean,
): Promise<string> {
  const titles: Record<TimerMode, string> = {
    work: '🍅 Focus session complete!',
    shortBreak: '☕ Short break over',
    longBreak: '🌿 Long break finished',
  };
  const bodies: Record<TimerMode, string> = {
    work: 'Time for a break.',
    shortBreak: 'Ready to get back to work?',
    longBreak: "Let's start a fresh work session!",
  };

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: titles[mode],
      body: bodies[mode],
      sound: soundEnabled ? 'notification.wav' : undefined,
    },
    trigger: null, // fire immediately (called at timer end)
  });
  return id;
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
