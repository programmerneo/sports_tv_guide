/**
 * Web game-start reminder notifications, backed by the browser Notification API.
 *
 * expo-notifications is not supported on web, so this implementation uses
 * `Notification` + `setTimeout` directly instead. Limitation: reminders only
 * fire while the tab is open (no service worker/background delivery), since
 * a bare `setTimeout` is cleared when the page unloads.
 */

import { Game } from '@types/index';

const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;

// Maps the notification id returned to callers back to the underlying
// timeout handle, so cancelGameReminder can clear it.
const pendingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

// Callbacks subscribed via addNotificationReceivedListener/addNotificationResponseListener.
// Plain Sets (no native event system on web), fired manually when our own timer elapses.
const receivedCallbacks = new Set<(gameId: string) => void>();
const responseCallbacks = new Set<(gameId: string) => void>();

/**
 * No-op on web: there is nothing to configure ahead of time for the browser
 * Notification API. Kept async and exported for interface parity with native.
 */
export async function configureNotificationHandler(): Promise<void> {
  return;
}

/**
 * Request permission to show notifications, returning whether it was granted.
 * Returns `false` gracefully if the browser doesn't support notifications.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (typeof Notification === 'undefined') {
    return false;
  }

  const result = await Notification.requestPermission();
  return result === 'granted';
}

/**
 * Schedule a reminder notification for a game, firing `leadMinutes` before its start time.
 *
 * Returns an id usable with `cancelGameReminder`, or `null` if the trigger
 * time has already passed (game starting too soon, or already live).
 */
export async function scheduleGameReminder(
  game: Game,
  leadMinutes: number
): Promise<string | null> {
  const triggerTime =
    new Date(game.startTime).getTime() - leadMinutes * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
  const delayMs = triggerTime - Date.now();

  if (delayMs <= 0) {
    return null;
  }

  const title = 'Game starting soon';
  const body = `${game.awayTeam.name} @ ${game.homeTeam.name} starts in ${leadMinutes} minutes`;

  const notificationId = String(Date.now());
  const timeoutId = setTimeout(() => {
    if (typeof Notification !== 'undefined') {
      const notification = new Notification(title, { body });
      // On web our timer elapsing IS the delivery moment, so "received" fires here.
      receivedCallbacks.forEach((callback) => callback(game.id));
      notification.onclick = () => {
        responseCallbacks.forEach((callback) => callback(game.id));
      };
    }
    pendingTimeouts.delete(notificationId);
  }, delayMs);

  pendingTimeouts.set(notificationId, timeoutId);

  return notificationId;
}

/**
 * Cancel a previously scheduled reminder notification.
 */
export async function cancelGameReminder(notificationId: string): Promise<void> {
  const timeoutId = pendingTimeouts.get(notificationId);
  if (timeoutId !== undefined) {
    clearTimeout(timeoutId);
    pendingTimeouts.delete(notificationId);
  }
}

/**
 * Subscribe to a reminder actually being delivered (i.e. our timer elapsing
 * and the browser Notification being constructed). Returns an unsubscribe function.
 */
export function addNotificationReceivedListener(callback: (gameId: string) => void): () => void {
  receivedCallbacks.add(callback);
  return () => receivedCallbacks.delete(callback);
}

/**
 * Subscribe to the user clicking a delivered reminder notification.
 * Returns an unsubscribe function.
 */
export function addNotificationResponseListener(callback: (gameId: string) => void): () => void {
  responseCallbacks.add(callback);
  return () => responseCallbacks.delete(callback);
}
