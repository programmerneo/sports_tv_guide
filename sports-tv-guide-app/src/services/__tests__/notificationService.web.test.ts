/**
 * Tests for the web notification service (browser Notification API + setTimeout).
 * Imports the concrete `.web` module directly by path to bypass jest-expo's
 * platform resolution, so it runs regardless of the configured test platform.
 */

import { Game } from '@types/index';
import * as notificationService from '../notificationService.web';

const NOW = new Date('2099-01-01T00:00:00Z').getTime();
const LEAD_MINUTES = 30;
// 1 hour after NOW, minus the 30 minute lead => fires 30 minutes from NOW.
const FUTURE_START_TIME = new Date(NOW + 60 * 60 * 1000).toISOString();
const PAST_START_TIME = '2000-01-01T12:00:00Z';

const SAMPLE_GAME: Game = {
  id: '401634567',
  eventId: '401634567',
  sport: 'basketball-college',
  homeTeam: {
    id: '150',
    name: 'Duke Blue Devils',
    abbreviation: 'DUKE',
  },
  awayTeam: {
    id: '153',
    name: 'North Carolina Tar Heels',
    abbreviation: 'UNC',
  },
  status: 'scheduled',
  startTime: FUTURE_START_TIME,
  network: 'ESPN',
};

const PAST_GAME: Game = {
  ...SAMPLE_GAME,
  id: '401634569',
  eventId: '401634569',
  startTime: PAST_START_TIME,
};

let mockNotificationConstructor: jest.Mock;

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);

  mockNotificationConstructor = jest.fn();
  (mockNotificationConstructor as unknown as { permission: string }).permission = 'granted';
  (mockNotificationConstructor as unknown as { requestPermission: jest.Mock }).requestPermission =
    jest.fn().mockResolvedValue('granted');

  // @ts-expect-error - stubbing the global browser Notification API for tests
  global.Notification = mockNotificationConstructor;
});

afterEach(() => {
  jest.useRealTimers();
  // @ts-expect-error - clean up the stubbed global
  delete global.Notification;
});

describe('scheduleGameReminder', () => {
  it('returns a non-null id and fires a Notification when the timer elapses', async () => {
    const id = await notificationService.scheduleGameReminder(SAMPLE_GAME, LEAD_MINUTES);

    expect(id).not.toBeNull();
    expect(mockNotificationConstructor).not.toHaveBeenCalled();

    const triggerOffsetMs = new Date(FUTURE_START_TIME).getTime() - LEAD_MINUTES * 60 * 1000 - NOW;
    jest.advanceTimersByTime(triggerOffsetMs);

    expect(mockNotificationConstructor).toHaveBeenCalledTimes(1);
  });

  it('returns null and does not schedule a timer when the trigger time has already passed', async () => {
    const id = await notificationService.scheduleGameReminder(PAST_GAME, LEAD_MINUTES);

    expect(id).toBeNull();
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe('cancelGameReminder', () => {
  it('clears the pending timeout so the Notification never fires', async () => {
    const id = await notificationService.scheduleGameReminder(SAMPLE_GAME, LEAD_MINUTES);
    expect(id).not.toBeNull();

    await notificationService.cancelGameReminder(id as string);

    const triggerOffsetMs = new Date(FUTURE_START_TIME).getTime() - LEAD_MINUTES * 60 * 1000 - NOW;
    jest.advanceTimersByTime(triggerOffsetMs + 1000);

    expect(mockNotificationConstructor).not.toHaveBeenCalled();
  });
});

describe('addNotificationReceivedListener', () => {
  it('calls the callback with the gameId when the reminder timer elapses', async () => {
    const callback = jest.fn();
    notificationService.addNotificationReceivedListener(callback);

    await notificationService.scheduleGameReminder(SAMPLE_GAME, LEAD_MINUTES);

    const triggerOffsetMs = new Date(FUTURE_START_TIME).getTime() - LEAD_MINUTES * 60 * 1000 - NOW;
    jest.advanceTimersByTime(triggerOffsetMs);

    expect(callback).toHaveBeenCalledWith(SAMPLE_GAME.id);
  });
});

describe('addNotificationResponseListener', () => {
  it('calls the callback with the gameId when the Notification is clicked', async () => {
    const callback = jest.fn();
    notificationService.addNotificationResponseListener(callback);

    await notificationService.scheduleGameReminder(SAMPLE_GAME, LEAD_MINUTES);

    const triggerOffsetMs = new Date(FUTURE_START_TIME).getTime() - LEAD_MINUTES * 60 * 1000 - NOW;
    jest.advanceTimersByTime(triggerOffsetMs);

    const notificationInstance = mockNotificationConstructor.mock.instances[0] as unknown as {
      onclick: () => void;
    };
    notificationInstance.onclick();

    expect(callback).toHaveBeenCalledWith(SAMPLE_GAME.id);
  });

  it('stops firing after unsubscribe, while other subscribers still fire', async () => {
    const unsubscribedCallback = jest.fn();
    const subscribedCallback = jest.fn();

    const unsubscribe = notificationService.addNotificationReceivedListener(unsubscribedCallback);
    notificationService.addNotificationReceivedListener(subscribedCallback);
    unsubscribe();

    const OTHER_GAME: Game = {
      ...SAMPLE_GAME,
      id: '401634570',
      eventId: '401634570',
    };

    await notificationService.scheduleGameReminder(OTHER_GAME, LEAD_MINUTES);

    const triggerOffsetMs = new Date(FUTURE_START_TIME).getTime() - LEAD_MINUTES * 60 * 1000 - NOW;
    jest.advanceTimersByTime(triggerOffsetMs);

    expect(unsubscribedCallback).not.toHaveBeenCalled();
    expect(subscribedCallback).toHaveBeenCalledWith(OTHER_GAME.id);
  });
});
