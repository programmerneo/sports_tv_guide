import { test, expect, Page } from '@playwright/test';
import games from './fixtures/notifications-games.json';

/**
 * NotificationsScreen lists games that have an active scheduled reminder
 * (see gameStore's `scheduledReminders`, keyed by game id). Reminders are
 * created from BoxScoreModal's bell icon, not from this screen itself --
 * this screen only displays them and lets the user cancel one.
 *
 * Reminders (and preferences, e.g. favoriteTeams) are persisted via zustand's
 * `persist` middleware to a single localStorage key (`sports-tv-guide-store`,
 * see PERSIST_KEY in gameStore.ts). On web, @react-native-async-storage's web
 * shim is a thin wrapper directly over `window.localStorage`, so tests seed
 * that key with `page.addInitScript` before navigating instead of driving the
 * full favorite -> open box score -> tap bell UI flow.
 */

const FUTURE_SOON = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
const FUTURE_LATER = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 60 * 60 * 1000).toISOString();

// All sports fetched by default other than football-college, which is the
// sport used for every fixture game below. Left empty so nothing but the
// seeded games shows up.
const OTHER_SPORTS = ['football-nfl', 'basketball-college', 'hockey-nhl', 'baseball-mlb', 'golf-pga'];

type FixtureGame = (typeof games)['favoriteGame'];

function withStartTime(game: FixtureGame, startTime: string) {
  return { ...game, startTime };
}

async function mockSchedules(page: Page, footballCollegeGames: FixtureGame[]) {
  await page.route('**/api/schedule/football-college**', (route) =>
    route.fulfill({ json: { games: footballCollegeGames } })
  );
  for (const sport of OTHER_SPORTS) {
    await page.route(`**/api/schedule/${sport}**`, (route) => route.fulfill({ json: { games: [] } }));
  }
}

interface SeedOptions {
  scheduledReminders?: Record<string, { notificationId: string; startTime: string }>;
  favoriteTeams?: string[];
}

/**
 * Seed the persisted zustand store (localStorage key `sports-tv-guide-store`)
 * before the app boots, so scheduledReminders/favoriteTeams are already in
 * place on first render -- matching the `{ state, version }` shape zustand's
 * persist middleware itself writes.
 */
async function seedStore(page: Page, { scheduledReminders = {}, favoriteTeams = [] }: SeedOptions) {
  const storeData = {
    state: {
      preferences: {
        favoriteTeams,
        favoriteGames: [],
        timezone: 'America/Chicago',
        notificationsEnabled: true,
        darkModeEnabled: false,
        selectedSports: ['football-nfl', 'football-college', 'basketball-college', 'hockey-nhl', 'baseball-mlb', 'golf-pga'],
      },
      scheduledReminders,
    },
    version: 1,
  };

  await page.addInitScript((data) => {
    window.localStorage.setItem('sports-tv-guide-store', JSON.stringify(data));
  }, storeData);
}

async function goToNotifications(page: Page) {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Notifications' }).click();
  // Confirms the Notifications screen (not just the tab button) rendered,
  // without colliding with the tab bar's own "Notifications" label text.
  await expect(page.getByText('← Home')).toBeVisible();
}

test('shows an empty state when no reminders are scheduled', async ({ page }) => {
  const plainGame = withStartTime(games.plainGame, FUTURE_SOON);
  await mockSchedules(page, [plainGame]);
  await seedStore(page, {}); // no scheduledReminders at all

  await goToNotifications(page);

  await expect(page.getByText('No active reminders. Tap the 🔕 on a game to set one.')).toBeVisible();
  // The unrelated game exists in the schedule but has no reminder, so it
  // must not leak onto this screen.
  await expect(page.getByText('Oklahoma Sooners vs Texas Longhorns')).not.toBeVisible();
});

test('displays a scheduled reminder with its start time, network, and a cancel control', async ({
  page,
}) => {
  const plainGame = withStartTime(games.plainGame, FUTURE_SOON);
  await mockSchedules(page, [plainGame]);
  await seedStore(page, {
    scheduledReminders: { [plainGame.id]: { notificationId: 'notif-1', startTime: plainGame.startTime } },
  });

  await goToNotifications(page);

  await expect(page.getByText('Oklahoma Sooners vs Texas Longhorns')).toBeVisible();
  await expect(page.getByText(/^Starts at .* on FOX$/)).toBeVisible();
  await expect(page.getByText('★ Favorite')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel reminder' })).toBeVisible();
});

test('displays a live game reminder with a LIVE subtitle instead of a start time', async ({ page }) => {
  const liveGame = withStartTime(games.liveGame, PAST);
  await mockSchedules(page, [liveGame]);
  // The ScheduledReminder record's own `startTime` (used only by
  // pruneExpiredReminders, which runs on every app mount) must stay in the
  // future, even though the *game's* startTime is in the past because it's
  // already live -- otherwise the reminder is pruned as stale before the
  // screen ever renders it.
  await seedStore(page, {
    scheduledReminders: { [liveGame.id]: { notificationId: 'notif-live', startTime: FUTURE_SOON } },
  });

  await goToNotifications(page);

  await expect(page.getByText('Georgia Tech Yellow Jackets vs Clemson Tigers')).toBeVisible();
  await expect(page.getByText('LIVE now on ABC')).toBeVisible();
});

test('sorts a favorited team\'s reminder above a non-favorite one and shows its badge', async ({
  page,
}) => {
  const favoriteGame = withStartTime(games.favoriteGame, FUTURE_SOON);
  const plainGame = withStartTime(games.plainGame, FUTURE_LATER);
  await mockSchedules(page, [favoriteGame, plainGame]);
  await seedStore(page, {
    scheduledReminders: {
      [favoriteGame.id]: { notificationId: 'notif-fav', startTime: favoriteGame.startTime },
      [plainGame.id]: { notificationId: 'notif-plain', startTime: plainGame.startTime },
    },
    // Duke (home team of favoriteGame) is favorited, namespaced by sport per favoriteTeamKey.
    favoriteTeams: [`football-college:${favoriteGame.homeTeam.id}`],
  });

  await goToNotifications(page);

  const titles = page.getByText(/ vs /);
  await expect(titles).toHaveCount(2);
  await expect(titles.first()).toHaveText('North Carolina Tar Heels vs Duke Blue Devils');
  await expect(titles.nth(1)).toHaveText('Oklahoma Sooners vs Texas Longhorns');
  await expect(page.getByText('★ Favorite')).toBeVisible();
});

test('canceling a reminder removes it from the list and from persisted storage', async ({ page }) => {
  const plainGame = withStartTime(games.plainGame, FUTURE_SOON);
  await mockSchedules(page, [plainGame]);
  await seedStore(page, {
    scheduledReminders: { [plainGame.id]: { notificationId: 'notif-cancel', startTime: plainGame.startTime } },
  });

  await goToNotifications(page);

  await expect(page.getByText('Oklahoma Sooners vs Texas Longhorns')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel reminder' }).click();

  await expect(page.getByText('Oklahoma Sooners vs Texas Longhorns')).not.toBeVisible();
  await expect(page.getByText('No active reminders. Tap the 🔕 on a game to set one.')).toBeVisible();

  const persisted = await page.evaluate(() => window.localStorage.getItem('sports-tv-guide-store'));
  const parsed = JSON.parse(persisted ?? '{}');
  expect(parsed.state.scheduledReminders).toEqual({});
});
