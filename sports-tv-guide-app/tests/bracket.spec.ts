import { test, expect, Page } from '@playwright/test';
import busySlotFixture from './fixtures/football-college-busy-slot.json';
import bracketFixture from './fixtures/march-madness-bracket.json';

/**
 * BracketScreen wraps BracketView (March Madness bracket), reached from the
 * Home screen's "Bracket" pill in SportTabs. That pill only renders when
 * `isMarchMadnessSeason()` (March 14 - April 10, see SportTabs.tsx) is true,
 * so every test here pins the browser clock into that window via
 * `page.clock.setFixedTime` before navigating -- otherwise the pill never
 * appears and Bracket is unreachable through the real UI flow.
 *
 * The pill also only shows up once the Home screen has at least one game
 * loaded (an all-empty schedule renders a full-screen empty state instead of
 * SportTabs), so we reuse the busy-slot football-college fixture from
 * tv-guide-grid.spec.ts purely to get past that gate.
 */

const MARCH_MADNESS_DATE = '2026-03-20T12:00:00';

const EMPTY_SPORTS = [
  'basketball-college',
  'football-nfl',
  'hockey-nhl',
  'baseball-mlb',
  'golf-pga',
  'golf-liv',
];

async function mockHomeShell(page: Page) {
  await page.route('**/api/schedule/football-college**', (route) =>
    route.fulfill({ json: busySlotFixture })
  );
  for (const sport of EMPTY_SPORTS) {
    await page.route(`**/api/schedule/${sport}**`, (route) => route.fulfill({ json: { games: [] } }));
  }
  await page.route('**/api/standings/*/status', (route) =>
    route.fulfill({ json: { sport: 'football-college', inSeason: true } })
  );
}

async function openBracketScreen(page: Page) {
  await page.clock.setFixedTime(new Date(MARCH_MADNESS_DATE));
  await mockHomeShell(page);
  await page.goto('/');
  await page.getByText('Bracket', { exact: true }).click();
}

async function goToBracket(page: Page) {
  await openBracketScreen(page);
  await expect(page.getByText('MARCH MADNESS')).toBeVisible();
}

test.describe('BracketScreen', () => {
  test('renders the default region with seeded teams, a final score, and an upcoming matchup', async ({
    page,
  }) => {
    await page.route('**/api/march-madness/brackets**', (route) =>
      route.fulfill({ json: bracketFixture })
    );

    await goToBracket(page);

    await expect(page.getByText('2026')).toBeVisible();

    // South (defaultTabSectionId 10) is active by default -- Round 1's
    // completed Duke/Mount St. Mary's game with seeds and final score.
    // "DUKE" appears twice (Round 1 winner, Round 2 matchup), so scope with .first().
    await expect(page.getByText('DUKE').first()).toBeVisible();
    await expect(page.getByText('MSM')).toBeVisible();
    await expect(page.getByText('78')).toBeVisible();
    await expect(page.getByText('65')).toBeVisible();
    await expect(page.getByText('FINAL')).toBeVisible();

    // Round 2's not-yet-started Duke/Arizona game shows its tipoff time and network.
    await expect(page.getByText('Round 2')).toBeVisible();
    await expect(page.getByText('ARIZ')).toBeVisible();
    await expect(page.getByText('9:39 PM ET')).toBeVisible();
    await expect(page.getByText('CBS')).toBeVisible();
  });

  test('switching region tabs swaps the matchups shown, including a live game with a clock', async ({
    page,
  }) => {
    await page.route('**/api/march-madness/brackets**', (route) =>
      route.fulfill({ json: bracketFixture })
    );

    await goToBracket(page);
    await expect(page.getByText('DUKE').first()).toBeVisible();

    // East's live-game badge (liveCount: 1) shows on the tab itself.
    await expect(page.getByText('East')).toBeVisible();
    await page.getByText('East', { exact: true }).click();

    await expect(page.getByText('AUB')).toBeVisible();
    await expect(page.getByText('YALE')).toBeVisible();
    await expect(page.getByText('LIVE')).toBeVisible();
    await expect(page.getByText('8:42 2nd')).toBeVisible();

    // Only the active region's bracket renders at a time.
    await expect(page.getByText('DUKE')).not.toBeVisible();
  });

  test('shows a retry-able empty state when no bracket data is available', async ({ page }) => {
    await page.route('**/api/march-madness/brackets**', (route) =>
      route.fulfill({ json: { title: '', year: 0, championshipInfo: null, defaultTabSectionId: null, tabs: [] } })
    );

    await openBracketScreen(page);

    await expect(page.getByText('No bracket data available')).toBeVisible();
    await expect(page.getByText('Retry')).toBeVisible();
  });

  test('the back button returns to the Home screen', async ({ page }) => {
    await page.route('**/api/march-madness/brackets**', (route) =>
      route.fulfill({ json: bracketFixture })
    );

    await goToBracket(page);
    // "Home" also matches the bottom tab's own label -- BracketView's own
    // back button renders first in DOM order, so .first() is unambiguous.
    await page.getByText('Home', { exact: true }).first().click();

    await expect(page.getByText('Sports TV Guide')).toBeVisible();
  });
});
