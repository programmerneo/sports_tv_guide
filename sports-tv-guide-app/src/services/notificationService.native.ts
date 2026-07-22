/**
 * Native (iOS/Android) game-start reminder notifications, backed by expo-notifications.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Game } from '@types/index';

const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const DEFAULT_ANDROID_CHANNEL_ID = 'default';

/**
 * Configure how notifications are presented while the app is foregrounded,
 * and set up the default Android notification channel.
 */
export async function configureNotificationHandler(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(DEFAULT_ANDROID_CHANNEL_ID, {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }
}

/**
 * Request permission to show notifications, returning whether it was granted.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Schedule a reminder notification for a game, firing `leadMinutes` before its start time.
 *
 * Returns the scheduled notification's id, or `null` if the trigger time has
 * already passed (game starting too soon, or already live).
 */
export async function scheduleGameReminder(
  game: Game,
  leadMinutes: number
): Promise<string | null> {
  const triggerDate = new Date(
    new Date(game.startTime).getTime() - leadMinutes * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND
  );

  if (triggerDate.getTime() <= Date.now()) {
    return null;
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Game starting soon',
      body: `${game.awayTeam.name} @ ${game.homeTeam.name} starts in ${leadMinutes} minutes`,
      sound: true,
      data: { gameId: game.id },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
  });

  return notificationId;
}

/**
 * Cancel a previously scheduled reminder notification.
 */
export async function cancelGameReminder(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Subscribe to a reminder actually being delivered (foreground or background).
 * Returns an unsubscribe function.
 */
export function addNotificationReceivedListener(callback: (gameId: string) => void): () => void {
  const subscription = Notifications.addNotificationReceivedListener((notification) => {
    const gameId = notification.request.content.data?.gameId;
    if (typeof gameId === 'string') {
      callback(gameId);
    }
  });
  return () => subscription.remove();
}

/**
 * Subscribe to the user tapping a delivered reminder notification.
 * Returns an unsubscribe function.
 */
export function addNotificationResponseListener(callback: (gameId: string) => void): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const gameId = response.notification.request.content.data?.gameId;
    if (typeof gameId === 'string') {
      callback(gameId);
    }
  });
  return () => subscription.remove();
}
