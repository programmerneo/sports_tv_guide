import { test, expect, Page } from '@playwright/test';

/**
 * ProfileScreen: Appearance (dark mode), Favorite Teams link, and
 * Notifications (game reminders) toggle. Preferences are persisted via
 * zustand's `persist` middleware to a single localStorage key
 * (`sports-tv-guide-store`, see PERSIST_KEY in gameStore.ts) -- on web,
 * @react-native-async-storage's web shim is a thin wrapper directly over
 * `window.localStorage`. Tests seed that key with `page.addInitScript`
 * before navigating, same convention as favorites.spec.ts /
 * notifications.spec.ts, so the starting preferences are deterministic
 * regardless of DEFAULT_USER_PREFERENCES.
 *
 * Both switches render as react-native-web's <input type="checkbox"
 * role="switch"> with no distinguishing aria-label, so they're located by
 * DOM order: Dark Mode (Appearance section) is first, Notifications
 * (Game Reminders) is second. Each switch's own track view recolors from
 * `theme.border` (off) to `theme.primary` (on) -- and because toggling dark
 * mode also swaps which theme is active, the track's own on-color for that
 * switch changes between the light and dark `primary` hex, which doubles as
 * proof the theme itself actually changed.
 */

const PERSIST_KEY = 'sports-tv-guide-store';

const LIGHT_PRIMARY = 'rgb(102, 126, 234)'; // theme.ts lightTheme.primary #667eea
const DARK_PRIMARY = 'rgb(124, 140, 255)'; // theme.ts darkTheme.primary #7c8cff
const LIGHT_BORDER = 'rgb(224, 224, 224)'; // theme.ts lightTheme.border #e0e0e0

interface SeedPreferences {
  darkModeEnabled?: boolean;
  notificationsEnabled?: boolean;
}

async function mockHomeShell(page: Page) {
  // Every screen sits behind the same bottom-tab shell as HomeScreen, which
  // fetches a schedule per selected sport and a standings/status check on
  // mount -- stub both so the app renders without a live backend, same as
  // manage-teams.spec.ts / standings.spec.ts. ProfileScreen itself makes no
  // network calls.
  await page.route('**/api/schedule/**', (route) => route.fulfill({ json: { games: [] } }));
  await page.route('**/api/standings/*/status', (route) =>
    route.fulfill({ json: { sport: 'mlb', inSeason: false } })
  );
}

async function seedPreferences(page: Page, overrides: SeedPreferences = {}) {
  const preferences = {
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
    ...overrides,
  };
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

async function goToProfile(page: Page) {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Profile' }).click();
  await expect(page.getByText('Appearance')).toBeVisible();
}

/** The switch's own track view -- first `div` inside its parent root View. */
function trackFor(switchLocator: ReturnType<Page['getByRole']>) {
  return switchLocator.locator('xpath=..').locator('div').first();
}

test.describe('ProfileScreen', () => {
  test('toggling Dark Mode flips the switch and re-colors it with the dark theme', async ({
    page,
  }) => {
    await mockHomeShell(page);
    await seedPreferences(page);
    await goToProfile(page);

    const darkModeSwitch = page.getByRole('switch').nth(0);
    const track = trackFor(darkModeSwitch);

    await expect(darkModeSwitch).not.toBeChecked();
    await expect(track).toHaveCSS('background-color', LIGHT_BORDER);

    await darkModeSwitch.click();

    await expect(darkModeSwitch).toBeChecked();
    // Track color for an "on" switch is theme.primary -- now the dark
    // theme's primary, proving the whole app theme flipped, not just this
    // control's own on/off state.
    await expect(track).toHaveCSS('background-color', DARK_PRIMARY);
  });

  test('toggling Game Reminders flips only that switch and persists the change', async ({
    page,
  }) => {
    await mockHomeShell(page);
    await seedPreferences(page); // notificationsEnabled: true by default
    await goToProfile(page);

    const darkModeSwitch = page.getByRole('switch').nth(0);
    const notificationsSwitch = page.getByRole('switch').nth(1);

    await expect(notificationsSwitch).toBeChecked();
    await expect(trackFor(notificationsSwitch)).toHaveCSS('background-color', LIGHT_PRIMARY);

    await notificationsSwitch.click();

    await expect(notificationsSwitch).not.toBeChecked();
    await expect(trackFor(notificationsSwitch)).toHaveCSS('background-color', LIGHT_BORDER);
    // Dark Mode is untouched by toggling the other switch.
    await expect(darkModeSwitch).not.toBeChecked();

    const persisted = await page.evaluate((key) => window.localStorage.getItem(key), PERSIST_KEY);
    const parsed = JSON.parse(persisted ?? '{}');
    expect(parsed.state.preferences.notificationsEnabled).toBe(false);
  });

  test('the Favorite Teams row navigates to Manage Teams', async ({ page }) => {
    await mockHomeShell(page);
    await seedPreferences(page);
    await page.route('**/api/teams/**', (route) =>
      route.fulfill({ json: { sport: 'mlb', teams: [] } })
    );
    await goToProfile(page);

    await page.getByText('Favorite Teams', { exact: true }).click();

    await expect(page.getByText('Manage Teams')).toBeVisible();
  });

  test('the Dark Mode toggle survives navigating away and back, and is written to persisted storage', async ({
    page,
  }) => {
    await mockHomeShell(page);
    await seedPreferences(page);
    await goToProfile(page);

    const darkModeSwitch = page.getByRole('switch').nth(0);
    await darkModeSwitch.click();
    await expect(darkModeSwitch).toBeChecked();

    // Navigating away and back within the same session (state lives in the
    // zustand store, outside the screen's own component tree, so it isn't
    // reset by unmounting/remounting ProfileScreen).
    await page.getByRole('tab', { name: 'Home' }).click();
    await page.getByRole('tab', { name: 'Profile' }).click();
    await expect(page.getByText('Appearance')).toBeVisible();
    await expect(page.getByRole('switch').nth(0)).toBeChecked();
    await expect(trackFor(page.getByRole('switch').nth(0))).toHaveCSS(
      'background-color',
      DARK_PRIMARY
    );

    // The zustand `persist` middleware also actually wrote the change through
    // to localStorage (not just in-memory) -- verified directly rather than
    // via page.reload(), since page.addInitScript's seed script (registered
    // by seedPreferences above) re-runs on every navigation, including a
    // reload, which would just overwrite this with the original seed value.
    const persisted = await page.evaluate((key) => window.localStorage.getItem(key), PERSIST_KEY);
    const parsed = JSON.parse(persisted ?? '{}');
    expect(parsed.state.preferences.darkModeEnabled).toBe(true);
  });
});
