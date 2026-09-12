import { test, expect, Page } from '@playwright/test';
import busySlotFixture from './fixtures/football-college-busy-slot.json';

/**
 * The fixture packs 14 real NCAAF games into a single 11:00 AM (local)
 * slot -- the exact scenario that used to silently drop the Michigan/
 * Oklahoma game (see TVGuideGrid's old hardcoded `slice(0, 2)`).
 */
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
    route.fulfill({ json: busySlotFixture })
  );
  for (const sport of EMPTY_SPORTS) {
    await page.route(`**/api/schedule/${sport}**`, (route) => route.fulfill({ json: { games: [] } }));
  }
  await page.route('**/api/standings/*/status', (route) =>
    route.fulfill({ json: { sport: 'football-college', inSeason: true } })
  );
}

test.beforeEach(async ({ page }) => {
  await mockSchedules(page);
  await page.goto('/');
});

test('a busy slot shows the top-3 games plus a "+N more" pill instead of silently dropping games', async ({
  page,
}) => {
  // Top 3 by popularity (national network, then rank): ORE@OKST (ESPN),
  // ASU@TA&M (ABC), OU@MICH (FOX) -- Michigan should be directly visible.
  await expect(page.getByText('MICH')).toBeVisible();
  await expect(page.getByText('+11 more')).toBeVisible();
});

test('expanding "+N more" lists every game in the slot, including ones outside the top 3', async ({
  page,
}) => {
  await page.getByText('+11 more').click();

  // Games far down ESPN's ordering that never make the inline preview.
  await expect(page.getByText('WOF @ KENT')).toBeVisible();
  await expect(page.getByText('GWEB @ LIB')).toBeVisible();
});

test('tapping a game in the overflow list opens its box score', async ({ page }) => {
  await page.getByText('+11 more').click();
  await page.getByText('OU @ MICH').click();

  await expect(page.getByText('Game Details')).toBeVisible();
});
