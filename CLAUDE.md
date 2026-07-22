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
- **NFL/MLB standings are gated to in-season only, on both ends.** `StandingsService.is_in_season` fetches ESPN's core API season resource (`sports.core.api.espn.com/.../seasons/{year}`, see `season_url` in `constants/espn.py`), whose `types.items` array carries start/end dates for every season phase. A sport is "in season" when `now` falls between that season's Regular Season `startDate` (type 2) and Postseason `endDate` (type 3) — checked for `now.year` then `now.year - 1` (covers Jan/Feb when the relevant season started the prior calendar year). `/standings/nfl` and `/standings/mlb` 404 outside that window; `/standings/{sport}/status` returns `{"sport", "inSeason"}` for a cheap check (used by the frontend to decide whether to show a "Standings" link without fetching full data). NHL and basketball-college are never gated (`inSeason` always `true`). Fails open (`True`) only if ESPN lookups fail for *every* candidate year — a legitimate off-season match is never overridden. **Known imprecision**: NFL's postseason `endDate` lands a few days after the actual Super Bowl (accurate enough), but MLB's is ESPN's whole postseason-type window — about 6 weeks after the actual World Series ends — so MLB standings stay visible into mid-December rather than disappearing right after the World Series. Accepted trade-off for now; a hardcoded per-season date table would fix it if needed.

## Guidelines

- Follow ESPN-first approach; use NCAA endpoints only where no ESPN equivalent exists
- Three-tier caching: 45s live scores, 5m brackets, 30m static data
- Keep services thin — pass through ESPN JSON as-is
- Always run tests and linter after changes
- Prefer editing existing files over creating new ones
