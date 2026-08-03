# Claude Instructions for NCAA API Project

## Project Overview

Python port of the NCAA API — returns consumable JSON from ncaa.com and ESPN, built with Python 3.11+ and FastAPI.

## Code Style

All code must follow `.claude/rules/code-style.md`. Read it before writing code.

## Quick Reference

```bash
uv run python main.py            # Run app (uses settings.port = 3001 from config.py)
uv run python main.py --reload   # Run with hot reload
uv run pytest                    # Run tests
uv run ruff check . && uv run ruff format .  # Lint + format
```

Do not launch with `fastapi dev main.py` — without `--port 3001` it silently defaults to 8000, and the frontend (which expects 3001) will render "no games today" instead of a clear error.

## ESPN API Gotchas

- **Scoreboard `groups` param required for college sports.** Without it, ESPN returns only 2-3 featured games. Use `groups=50` (D1 basketball) / `groups=80` (FBS football). Defined in `SCOREBOARD_GROUPS` in `constants/espn.py`. NFL and golf don't need it.
- **Win projections use two structures.** Summary endpoint: `predictor` object (pre-game, `gameProjection` as percentage string `"76.4"`). Live/completed: `winprobability` array (`homeWinPercentage` as 0-1 decimal). `GameService._parse_predictor` normalises both. Scoreboard does **not** include predictor data.
- **Team colors are hex without `#`.** ESPN returns `team.color` as bare hex (e.g. `"003087"`). Frontend prepends `#`.
- **MLB starting pitchers use `probables` array.** ESPN nests pitcher data under `competitors[].probables[].athlete` with stats in `probables[].statistics.splits.categories[]`. `GameService._parse_starting_pitchers` extracts name, headshot, jersey, and filtered stats (ERA, W, L, WHIP, K). Only populated for `baseball-mlb`; other sports get `None`.
- **Golf dates are midnight placeholders.** ESPN returns `event.date` as midnight ET (e.g. `2026-03-12T04:00Z`) for multi-day tournaments — not a real tee time. `GolfService._format_tournament_as_game` substitutes the current time for in-progress tournaments so they land in the correct TV guide time slot. Golf also uses `homeTeam` for tournament name/logo and `awayTeam` for course info since there are no real teams.
- **NFL/MLB/college-football standings are gated to in-season only, on both ends.** `StandingsService.is_in_season` fetches ESPN's core API season resource (`sports.core.api.espn.com/.../seasons/{year}`, see `season_url` in `constants/espn.py`), whose `types.items` array carries start/end dates for every season phase. A sport is "in season" when `now` falls between that season's Regular Season `startDate` (type 2) and Postseason `endDate` (type 3) — checked for `now.year` then `now.year - 1` (covers Jan/Feb when the relevant season started the prior calendar year). Gated sports are exactly the keys of `POSTSEASON_SPORT_PATHS` (`nfl`, `mlb`, `football-college`); `/standings/nfl`, `/standings/mlb`, and `/standings/football-college` 404 outside that window; `/standings/{sport}/status` returns `{"sport", "inSeason"}` for a cheap check (used by the frontend to decide whether to show a "Standings" link without fetching full data). NHL and basketball-college are never gated (`inSeason` always `true`). Fails open (`True`) only if ESPN lookups fail for *every* candidate year — a legitimate off-season match is never overridden. **Known imprecision**: NFL's postseason `endDate` lands a few days after the actual Super Bowl (accurate enough), and college football's is tight too (late Aug → ~Jan 21, days after the CFP final), but MLB's is ESPN's whole postseason-type window — about 6 weeks after the actual World Series ends — so MLB standings stay visible into mid-December rather than disappearing right after the World Series. Accepted trade-off for now; a hardcoded per-season date table would fix it if needed.
- **College standings endpoints repeat every stat `name` once per split.** Basketball/football college `standings` entries list `overall`, then `homerecord_*`, `awayrecord_*`, `vsconf_*`, `vs-ranked-teams`, ... — each reusing the *same* stat names. `StandingsService._extract_stats` therefore keeps the **first** occurrence (the overall value) and ignores later ones. Fixing this also corrected latent value corruption for basketball-college, which had been surfacing split values as overall ones. Don't "simplify" that check away.
- **College football has no `losses`/`ties`/`winPercent` stats — the record arrives pre-joined as `overall`.** `STANDINGS_URLS['football-college']` needs no `level`/`groups` param (that endpoint is already FBS-scoped, 11 conference groups), and `STANDINGS_EXTRA_STATS['football-college']` requests `overall` instead. `_format_team` prefers `overall` (e.g. `"13-3"`) as the record when present and only falls back to building `wins-losses(-ties)`; `overall` is then excluded from the passthrough stats so it doesn't duplicate `record`. Because there's no `winPercent`, the frontend's NCAAF columns deliberately have **no PCT column** (W-L, Conf, PF, PA only).
- **The bulk teams-list endpoint (`GET /teams/{sport}`, `TeamsService`) carries no conference data at all.** ESPN's `.../teams?limit=999` response (the `?limit=999` is required — it paginates at a small default page size and would otherwise silently truncate e.g. football-college's 755 teams) has no `groups` field on the team object; that only appears on the single-team detail endpoint, not viable per-request for hundreds of teams. Conference names for `football-college`/`basketball-college` are instead cross-referenced from the standings endpoint's conference groupings (`TeamsService._build_conference_map`, called directly — bypassing the router-level in-season gate in `api/standings.py`, since `StandingsService.fetch_standings` itself isn't gated). **Do not resolve football-college's conference via `CONFERENCE_SHORT_NAMES`** — its standings-group ids use a different, colliding namespace than basketball's (football's id `1` is ACC; the dict's id `1` is "Am. East"). Only `basketball-college`'s ids verifiably match that dict; football always uses the standings group's own ESPN-provided `name` instead.

## Frontend Notes (`sports-tv-guide-app/`)

- **Game-start reminders are split by platform, not by `Platform.OS` branching.** `src/services/notificationService.native.ts` (iOS/Android, wraps `expo-notifications`) and `src/services/notificationService.web.ts` (browser `Notification` API + `setTimeout`) export the same function signatures; Metro's platform-specific file resolution picks the right one automatically for any import of `./services/notificationService`. `expo-notifications` [does not support web at all](https://docs.expo.dev/versions/latest/sdk/notifications/) — don't try to "fix" the web path by importing it there. Web reminders only fire while the tab stays open (no OS-level background scheduling for web pages); a real background/closed-tab experience would need a push server.
- **Dev-server CORS**: `main.py` allows any `localhost`/`127.0.0.1`/`10.0.2.2` port via `allow_origin_regex` (not just `8081`/`19006`) specifically because Expo auto-increments its web dev port when the default is busy — don't narrow this back down to a fixed port list.
- **There is no full-text search feature.** A `SearchScreen.tsx`-style dedicated search was considered and removed (along with an inline `HomeScreen` search bar) — not applicable to a same-day TV guide. Don't reintroduce one without a clear use case; if "find a team/channel fast" comes up again, the Manage Teams picker (below) may already cover it.
- **Favorite team ids must be namespaced by sport — `favoriteTeamKey(sport, teamId)` in `gameStore.ts`.** ESPN team ids are not unique across leagues (e.g. the Arizona Cardinals (NFL) and Arizona Diamondbacks (MLB) are both id `22`). `preferences.favoriteTeams` stores composite keys like `"baseball-mlb:22"`, never a bare id. Every read/write of `favoriteTeams` (`getFavoriteGames`, `ManageTeamsScreen.tsx`, `NotificationsScreen.tsx`'s favorite badge) must go through this helper — checking a bare `team.id` against the array will silently cross-match teams from other sports. `ManageTeamsScreen` uses `StandingsSportType` (short keys: `nfl`/`mlb`/`nhl`/...) while `Game.sport` uses the long `SportType` form (`football-nfl`/`baseball-mlb`/...); `STANDINGS_TO_HOME_SPORT` in `constants/index.ts` translates between them so the same namespace is used on both the write side (favoriting in the picker) and the read side (matching against loaded games).
- **A horizontal `ScrollView` on web only responds to a true horizontal-wheel gesture** (trackpad swipe / shift+scroll) — an ordinary vertical mouse-wheel scroll, what most users try first, does nothing, with no visible indication it's even scrollable. `ManageTeamsScreen`'s sport-tabs row and conference-chips row both attach a `Platform.OS === 'web'`-only `onWheel` handler that translates vertical wheel input into `scrollLeft` movement (`handleWheelScroll`). Any new horizontal `ScrollView` on web should do the same rather than relying on trackpad-only scrolling.

## Guidelines

- Follow ESPN-first approach; use NCAA endpoints only where no ESPN equivalent exists
- Three-tier caching: 45s live scores, 5m brackets, 30m static data
- Keep services thin — pass through ESPN JSON as-is
- Always run tests and linter after changes
- Prefer editing existing files over creating new ones
