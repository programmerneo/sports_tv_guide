/**
 * Tests for the native notification service (wraps expo-notifications).
 * jest-expo's default test platform resolves `../notificationService` to
 * `notificationService.native.ts`.
 */

import { Game } from '@types/index';

// Declare jest.fn()s inline in the factory (not via outer const references) -
// module mocks are hoisted above imports, so outer `const` bindings would
// still be undefined when the factory runs.
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

import * as Notifications from 'expo-notifications';
import * as notificationService from '../notificationService';

const mockScheduleNotificationAsync = Notifications.scheduleNotificationAsync as jest.Mock;
const mockCancelScheduledNotificationAsync =
  Notifications.cancelScheduledNotificationAsync as jest.Mock;
const mockRequestPermissionsAsync = Notifications.requestPermissionsAsync as jest.Mock;
const mockSetNotificationHandler = Notifications.setNotificationHandler as jest.Mock;
const mockSetNotificationChannelAsync = Notifications.setNotificationChannelAsync as jest.Mock;
const mockAddNotificationReceivedListener =
  Notifications.addNotificationReceivedListener as jest.Mock;
const mockAddNotificationResponseReceivedListener =
  Notifications.addNotificationResponseReceivedListener as jest.Mock;

// Fixed, hard-coded future game start time (avoids Date.now()-relative flakiness).
const FUTURE_START_TIME = '2099-01-01T12:00:00Z';
const LEAD_MINUTES = 30;

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
  startTime: '2000-01-01T12:00:00Z',
};

beforeEach(() => {
  mockScheduleNotificationAsync.mockReset();
  mockCancelScheduledNotificationAsync.mockReset();
  mockRequestPermissionsAsync.mockReset();
  mockSetNotificationHandler.mockReset();
  mockSetNotificationChannelAsync.mockReset();
  mockAddNotificationReceivedListener.mockReset();
  mockAddNotificationResponseReceivedListener.mockReset();
});

describe('scheduleGameReminder', () => {
  it('schedules a notification at startTime minus leadMinutes', async () => {
    mockScheduleNotificationAsync.mockResolvedValue('notification-id-1');

    const id = await notificationService.scheduleGameReminder(SAMPLE_GAME, LEAD_MINUTES);

    expect(id).toBe('notification-id-1');
    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(1);

    const call = mockScheduleNotificationAsync.mock.calls[0][0];
    const expectedTrigger = new Date(FUTURE_START_TIME).getTime() - LEAD_MINUTES * 60 * 1000;
    const actualTriggerDate: Date = call.trigger.date ?? call.trigger;

    expect(new Date(actualTriggerDate).getTime()).toBe(expectedTrigger);
  });

  it('returns null and does not schedule when the trigger time has already passed', async () => {
    const id = await notificationService.scheduleGameReminder(PAST_GAME, LEAD_MINUTES);

    expect(id).toBeNull();
    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
  });
});

describe('cancelGameReminder', () => {
  it('calls cancelScheduledNotificationAsync with the given id', async () => {
    await notificationService.cancelGameReminder('notification-id-1');

    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith('notification-id-1');
  });
});

describe('addNotificationReceivedListener', () => {
  it('registers with the native API and invokes the callback with the gameId', () => {
    const mockRemove = jest.fn();
    mockAddNotificationReceivedListener.mockReturnValue({ remove: mockRemove });

    const callback = jest.fn();
    const unsubscribe = notificationService.addNotificationReceivedListener(callback);

    expect(mockAddNotificationReceivedListener).toHaveBeenCalledTimes(1);
    const nativeCallback = mockAddNotificationReceivedListener.mock.calls[0][0];

    nativeCallback({ request: { content: { data: { gameId: SAMPLE_GAME.id } } } });
    expect(callback).toHaveBeenCalledWith(SAMPLE_GAME.id);

    unsubscribe();
    expect(mockRemove).toHaveBeenCalledTimes(1);
  });
});

describe('addNotificationResponseListener', () => {
  it('registers with the native API and invokes the callback with the gameId', () => {
    const mockRemove = jest.fn();
    mockAddNotificationResponseReceivedListener.mockReturnValue({ remove: mockRemove });

    const callback = jest.fn();
    const unsubscribe = notificationService.addNotificationResponseListener(callback);

    expect(mockAddNotificationResponseReceivedListener).toHaveBeenCalledTimes(1);
    const nativeCallback = mockAddNotificationResponseReceivedListener.mock.calls[0][0];

    nativeCallback({
      notification: { request: { content: { data: { gameId: SAMPLE_GAME.id } } } },
    });
    expect(callback).toHaveBeenCalledWith(SAMPLE_GAME.id);

    unsubscribe();
    expect(mockRemove).toHaveBeenCalledTimes(1);
  });
});
