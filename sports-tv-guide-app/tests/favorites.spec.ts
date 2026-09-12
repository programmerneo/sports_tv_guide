import { test, expect, Page } from '@playwright/test';
import scheduleFixture from './fixtures/favorites-schedule.json';

/**
 * FavoritesScreen shows games that are either an explicitly favorited
 * individual game (preferences.favoriteGames) or a game played by a
 * favorited team (preferences.favoriteTeams, namespaced by sport via
 * favoriteTeamKey -- see gameStore.ts). Empty favorites render an empty
 * state instead of a list.
 *
 * getFavoriteGames used to be selected directly --
 * `useGameStore((state) => getFavoriteGames(state))` -- which allocates a
 * new array on every call. Because the value is never reference-equal to
 * the previous render's result, useSyncExternalStore's reference check
 * never settles and React re-renders forever with no error boundary to
 * catch it, so the screen renders blank (see FavoritesScreen.tsx and the
 * "fix Favorites blank-render bug" commit). It's now fixed by subscribing
 * to the individual preference/games slices and deriving the list with
 * useMemo. Every test below that reaches the Favorites screen with real
 * data populated exercises that path, and the "regression" test explicitly
 * mounts/unmounts it twice to guard against it coming back.
 */

const PERSIST_KEY = 'sports-tv-guide-store';

const BASE_PREFERENCES = {
  favoriteTeams: [] as string[],
  favoriteGames: [] as string[],
  timezone: 'America/Chicago',
  notificationsEnabled: true,
  darkModeEnabled: false,
  selectedSports: [
    'football-nfl',
    'football-college',
    'basketball-college',
    'hockey-nhl',
    'baseball-mlb',
    'golf-pga',
  ],
};

const EMPTY_SPORTS = [
  'basketball-college',
  'football-nfl',
  'hockey-nhl',
  'baseball-mlb',
  'golf-pga',
  'golf-liv',
];

async function mockSchedules(page: Page) {
  await page.route('**/api/schedule/football-college**', (route) =>
    route.fulfill({ json: scheduleFixture })
  );
  for (const sport of EMPTY_SPORTS) {
    await page.route(`**/api/schedule/${sport}**`, (route) => route.fulfill({ json: { games: [] } }));
  }
  await page.route('**/api/standings/*/status', (route) =>
    route.fulfill({ json: { sport: 'football-college', inSeason: true } })
  );
}

/** Preload the zustand-persisted store (localStorage) before the app boots. */
async function seedPreferences(
  page: Page,
  overrides: Partial<typeof BASE_PREFERENCES> = {}
) {
  const preferences = { ...BASE_PREFERENCES, ...overrides };
  const persisted = JSON.stringify({
    state: { preferences, scheduledReminders: {} },
    version: 1,
  });
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    { key: PERSIST_KEY, value: persisted }
  );
}

async function goToFavorites(page: Page) {
  await page.getByRole('tab', { name: /Favorites/i }).click();
  // Unique to this screen (unlike the plain "Favorites" text, which also
  // appears as the tab's own label).
  await expect(page.getByText('⭐ Manage Favorite Teams')).toBeVisible();
}

test.describe('FavoritesScreen', () => {
  test('shows the empty state when no games or teams are favorited', async ({ page }) => {
    await mockSchedules(page);
    await seedPreferences(page);
    await page.goto('/');

    await goToFavorites(page);

    await expect(page.getByText('No favorites yet')).toBeVisible();
    await expect(page.getByText('Tap the star on a game to save it here.')).toBeVisible();
    await expect(page.getByText('Manage Favorite Teams ›')).toBeVisible();
  });

  test('a favorited team\'s game appears, and non-favorited games do not', async ({ page }) => {
    await mockSchedules(page);
    // Indiana (id "84") is the home team on game 401858439 in the fixture.
    await seedPreferences(page, { favoriteTeams: ['football-college:84'] });
    await page.goto('/');

    await goToFavorites(page);

    await expect(page.getByText('Indiana Hoosiers')).toBeVisible();
    await expect(page.getByText('Howard Bison')).toBeVisible();
    await expect(page.getByText('No favorites yet')).not.toBeVisible();

    // Games belonging to neither a favorited team nor favoriteGames must not leak in.
    await expect(page.getByText('Never Favorited Home')).not.toBeVisible();
    await expect(page.getByText('Explicitly Favorited Home')).not.toBeVisible();
  });

  test('an explicitly favorited individual game appears without its teams being favorited', async ({
    page,
  }) => {
    await mockSchedules(page);
    await seedPreferences(page, { favoriteGames: ['999001'] });
    await page.goto('/');

    await goToFavorites(page);

    await expect(page.getByText('Explicitly Favorited Home')).toBeVisible();
    await expect(page.getByText('Explicitly Favorited Away')).toBeVisible();
    await expect(page.getByText('No favorites yet')).not.toBeVisible();

    await expect(page.getByText('Indiana Hoosiers')).not.toBeVisible();
    await expect(page.getByText('Never Favorited Home')).not.toBeVisible();
  });

  test('regression: renders the favorited list (not blank) across repeated mounts', async ({
    page,
  }) => {
    await mockSchedules(page);
    // Mix a team favorite and an explicit game favorite -- both read paths
    // getFavoriteGames combines -- so both the useMemo deps and the filter
    // predicate are exercised together, same as they were the day the old
    // `(state) => getFavoriteGames(state)` selector looped forever.
    await seedPreferences(page, {
      favoriteTeams: ['football-college:84'],
      favoriteGames: ['999001'],
    });
    await page.goto('/');

    await goToFavorites(page);
    await expect(page.getByText('Indiana Hoosiers')).toBeVisible();
    await expect(page.getByText('Explicitly Favorited Home')).toBeVisible();

    // Unmount by navigating to Home, then remount Favorites -- the old
    // buggy selector allocated a fresh array on every subscription
    // notification, which would blank the screen (or hang the tab) on
    // this exact remount.
    await page.getByRole('tab', { name: /Home/i }).click();
    await goToFavorites(page);

    await expect(page.getByText('Indiana Hoosiers')).toBeVisible();
    await expect(page.getByText('Explicitly Favorited Home')).toBeVisible();
    await expect(page.getByText('⭐ Manage Favorite Teams')).toBeVisible();
  });
});
