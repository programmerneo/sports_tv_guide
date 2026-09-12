import { test, expect, Page } from '@playwright/test';
import mlbFixture from './fixtures/teams-mlb.json';
import nflFixture from './fixtures/teams-nfl.json';
import cfbFixture from './fixtures/teams-football-college.json';

/**
 * ManageTeamsScreen: browse teams per sport, filter college sports by
 * conference, and toggle favorites. Reached via the "Favorites" bottom tab
 * -> "⭐ Manage Favorite Teams" link (see FavoritesScreen.tsx).
 *
 * Both the mlb and nfl fixtures reuse ESPN team id "22" on purpose --
 * Arizona Diamondbacks (MLB) and Arizona Cardinals (NFL) really do collide
 * on that id, which is exactly why favorites must be namespaced by sport
 * (favoriteTeamKey in gameStore.ts). A test below asserts that namespacing
 * actually holds through the UI.
 */

const TEAMS_FIXTURES: Record<string, unknown> = {
  mlb: mlbFixture,
  nfl: nflFixture,
  'football-college': cfbFixture,
  'basketball-college': { sport: 'basketball-college', teams: [] },
  nhl: { sport: 'nhl', teams: [] },
};

async function mockHomeShell(page: Page) {
  // HomeScreen (which every bottom tab lives alongside) fetches a schedule
  // per selected sport and a standings/status check on mount -- stub both
  // so it renders without needing a live backend, same as standings.spec.ts.
  await page.route('**/api/schedule/**', (route) => route.fulfill({ json: { games: [] } }));
  await page.route('**/api/standings/*/status', (route) =>
    route.fulfill({ json: { sport: 'mlb', inSeason: false } })
  );
}

async function mockTeams(page: Page) {
  for (const [sport, fixture] of Object.entries(TEAMS_FIXTURES)) {
    await page.route(`**/api/teams/${sport}`, (route) => route.fulfill({ json: fixture }));
  }
}

async function goToManageTeams(page: Page) {
  await page.goto('/');
  await page.getByText('Favorites', { exact: true }).click();
  await page.getByText('⭐ Manage Favorite Teams').click();
  await expect(page.getByText('Manage Teams')).toBeVisible();
}

test.describe('ManageTeamsScreen', () => {
  test('defaults to the first sport tab and switches team lists when another tab is tapped', async ({
    page,
  }) => {
    await mockHomeShell(page);
    await mockTeams(page);
    await goToManageTeams(page);

    // STANDINGS_SPORTS[0] is 'mlb', so its tab is active without interaction.
    await expect(page.getByText('⚾ MLB')).toBeVisible();
    await expect(page.getByText('Los Angeles Dodgers')).toBeVisible();
    await expect(page.getByText('Kansas City Chiefs')).not.toBeVisible();

    await page.getByText('🏈 NFL').click();

    await expect(page.getByText('Kansas City Chiefs')).toBeVisible();
    await expect(page.getByText('Los Angeles Dodgers')).not.toBeVisible();
  });

  test('conference chips filter the college football team list', async ({ page }) => {
    await mockHomeShell(page);
    await mockTeams(page);
    await goToManageTeams(page);

    await page.getByText('🏈 NCAAF').click();

    // Unfiltered: all three teams across both conferences are visible.
    await expect(page.getByText('Michigan Wolverines')).toBeVisible();
    await expect(page.getByText('Ohio State Buckeyes')).toBeVisible();
    await expect(page.getByText('Georgia Bulldogs')).toBeVisible();

    await page.getByText('Big Ten', { exact: true }).click();

    await expect(page.getByText('Michigan Wolverines')).toBeVisible();
    await expect(page.getByText('Ohio State Buckeyes')).toBeVisible();
    await expect(page.getByText('Georgia Bulldogs')).not.toBeVisible();

    await page.getByText('All', { exact: true }).click();

    await expect(page.getByText('Georgia Bulldogs')).toBeVisible();
  });

  test('tapping a team\'s star favorites it and moves it under the "★ Favorites" section', async ({
    page,
  }) => {
    await mockHomeShell(page);
    await mockTeams(page);
    await goToManageTeams(page);

    await expect(page.getByText('★ Favorites')).not.toBeVisible();

    await page.getByLabel('Add Los Angeles Dodgers to favorite teams').click();

    await expect(page.getByText('★ Favorites')).toBeVisible();
    await expect(page.getByLabel('Remove Los Angeles Dodgers from favorite teams')).toBeVisible();
  });

  test('favoriting a team on one sport does not favorite a same-id team on another sport', async ({
    page,
  }) => {
    await mockHomeShell(page);
    await mockTeams(page);
    await goToManageTeams(page);

    // Default MLB tab: favorite Arizona Diamondbacks (id "22").
    await page.getByLabel('Add Arizona Diamondbacks to favorite teams').click();
    await expect(page.getByLabel('Remove Arizona Diamondbacks from favorite teams')).toBeVisible();

    // NFL's Arizona Cardinals shares the raw id "22" but must not be
    // affected -- favorites are namespaced by favoriteTeamKey(sport, id).
    await page.getByText('🏈 NFL').click();

    await expect(page.getByText('★ Favorites')).not.toBeVisible();
    await expect(page.getByLabel('Add Arizona Cardinals to favorite teams')).toBeVisible();
  });

  test('favorited state persists across a full page reload', async ({ page }) => {
    await mockHomeShell(page);
    await mockTeams(page);
    await goToManageTeams(page);

    await page.getByLabel('Add Los Angeles Dodgers to favorite teams').click();
    await expect(page.getByText('★ Favorites')).toBeVisible();

    await page.reload();

    // The reload lands back on Home; navigate back into Manage Teams.
    await page.getByText('Favorites', { exact: true }).click();
    await page.getByText('⭐ Manage Favorite Teams').click();

    await expect(page.getByText('★ Favorites')).toBeVisible();
    await expect(page.getByLabel('Remove Los Angeles Dodgers from favorite teams')).toBeVisible();
  });
});
