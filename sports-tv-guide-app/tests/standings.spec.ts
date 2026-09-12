import { test, expect, Page } from '@playwright/test';
import mlbFixture from './fixtures/standings-mlb.json';
import nhlFixture from './fixtures/standings-nhl.json';
import cfbFixture from './fixtures/standings-football-college.json';

/**
 * StandingsScreen fetches every sport in STANDINGS_SPORTS
 * (mlb, nfl, basketball-college, football-college, nhl) on focus and only
 * keeps the ones whose season matches the current year -- a rejected/404
 * request (out of season) silently drops that sport's tab rather than
 * erroring. These tests control exactly which sports are "in season" by
 * choosing which /api/standings/{sport} routes resolve vs. 404.
 */

const ALL_STANDINGS_SPORTS = ['mlb', 'nfl', 'basketball-college', 'football-college', 'nhl'];

type FixtureMap = Partial<Record<string, unknown>>;

async function mockHomeShell(page: Page) {
  // HomeScreen (which the bottom-tab "Standings" button lives on) fetches a
  // schedule per selected sport and a standings/status check per
  // HOME_TO_STANDINGS_SPORT entry on mount -- stub both so it renders
  // immediately without needing a live backend.
  await page.route('**/api/schedule/**', (route) => route.fulfill({ json: { games: [] } }));
  await page.route('**/api/standings/*/status', (route) =>
    route.fulfill({ json: { sport: 'mlb', inSeason: false } })
  );
}

async function mockStandings(page: Page, active: FixtureMap) {
  for (const sport of ALL_STANDINGS_SPORTS) {
    if (sport in active) {
      const fixture = active[sport];
      await page.route(`**/api/standings/${sport}`, (route) => route.fulfill({ json: fixture }));
    } else {
      await page.route(`**/api/standings/${sport}`, (route) =>
        route.fulfill({ status: 404, json: { detail: `${sport} season has ended` } })
      );
    }
  }
}

async function goToStandings(page: Page) {
  await page.goto('/');
  await page.getByText('Standings', { exact: true }).click();
  // Wait for the loading spinner to resolve into either the tab bar or the
  // empty state before making assertions.
  await page.waitForSelector('text=Standings');
}

test.describe('StandingsScreen', () => {
  test('renders team rows with the correct records for the default active sport', async ({
    page,
  }) => {
    await mockHomeShell(page);
    await mockStandings(page, { mlb: mlbFixture, nhl: nhlFixture });
    await goToStandings(page);

    // mlb sorts first among active sports (STANDINGS_SPORTS order), so its
    // tab should be selected without any extra interaction.
    await expect(page.getByText('⚾ MLB')).toBeVisible();
    await expect(page.getByText('Yankees')).toBeVisible();

    // Record "95-67" is split into separate W/L stat cells.
    const yankeesRow = page.locator('text=Yankees').locator('..').locator('..');
    await expect(yankeesRow.getByText('95')).toBeVisible();
    await expect(yankeesRow.getByText('67')).toBeVisible();
    await expect(yankeesRow.getByText('.586')).toBeVisible();
  });

  test('an out-of-season sport is omitted from the tab list entirely', async ({ page }) => {
    await mockHomeShell(page);
    await mockStandings(page, { mlb: mlbFixture, nhl: nhlFixture });
    await goToStandings(page);

    await expect(page.getByText('🏈 NFL')).not.toBeVisible();
    await expect(page.getByText('🏀 NCAAB')).not.toBeVisible();
  });

  test('switching sport tabs swaps the standings table shown', async ({ page }) => {
    await mockHomeShell(page);
    await mockStandings(page, { mlb: mlbFixture, nhl: nhlFixture });
    await goToStandings(page);

    await expect(page.getByText('Yankees')).toBeVisible();

    await page.getByText('🏒 NHL').click();

    await expect(page.getByText('Bruins')).toBeVisible();
    await expect(page.getByText('Yankees')).not.toBeVisible();
  });

  test('MLB league sub-tabs filter divisions to American League vs. National League', async ({
    page,
  }) => {
    await mockHomeShell(page);
    await mockStandings(page, { mlb: mlbFixture });
    await goToStandings(page);

    // Defaults to the first league found in the fixture's group order (AL).
    await expect(page.getByText('Yankees')).toBeVisible();
    await expect(page.getByText('Dodgers')).not.toBeVisible();

    await page.getByText('National League').click();

    await expect(page.getByText('Dodgers')).toBeVisible();
    await expect(page.getByText('Yankees')).not.toBeVisible();
  });

  test('college football standings show conference groups, split W/L, and no PCT column', async ({
    page,
  }) => {
    await mockHomeShell(page);
    await mockStandings(page, { 'football-college': cfbFixture });
    await goToStandings(page);

    await expect(page.getByText('🏈 NCAAF')).toBeVisible();
    await expect(page.getByText('Big Ten')).toBeVisible();
    await expect(page.getByText('SEC')).toBeVisible();

    // Record "11-1" split into separate cells, plus the Conf/PF/PA stats --
    // and explicitly no PCT column since ESPN's college-football endpoint
    // has no winPercent stat.
    await expect(page.getByText('Ohio State')).toBeVisible();
    await expect(page.getByText('11')).toBeVisible();
    await expect(page.getByText('.875')).toBeVisible();
    await expect(page.getByText('480')).toBeVisible();
    await expect(page.getByText('PCT')).not.toBeVisible();
  });

  test('shows the empty state when no sport currently has an active season', async ({ page }) => {
    await mockHomeShell(page);
    await mockStandings(page, {});
    await goToStandings(page);

    await expect(page.getByText('No Active Standings')).toBeVisible();
    await expect(page.getByText('Check back during the season')).toBeVisible();
  });
});
