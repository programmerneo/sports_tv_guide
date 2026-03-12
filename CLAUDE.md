# Claude Instructions for NCAA API Project

## Project Overview

Python port of the NCAA API — returns consumable JSON from ncaa.com and ESPN, built with Python 3.11+ and FastAPI.

## Code Style

All code must follow `.claude/rules/code-style.md`. Read it before writing code.

## Quick Reference

```bash
uv run fastapi dev main.py       # Run app
uv run pytest                    # Run tests
uv run ruff check . && uv run ruff format .  # Lint + format
```

## ESPN API Gotchas

- **Scoreboard `groups` param required for college sports.** Without it, ESPN returns only 2-3 featured games. Use `groups=50` (D1 basketball) / `groups=80` (FBS football). Defined in `SCOREBOARD_GROUPS` in `constants/espn.py`. NFL and golf don't need it.
- **Win projections use two structures.** Summary endpoint: `predictor` object (pre-game, `gameProjection` as percentage string `"76.4"`). Live/completed: `winprobability` array (`homeWinPercentage` as 0-1 decimal). `GameService._parse_predictor` normalises both. Scoreboard does **not** include predictor data.
- **Team colors are hex without `#`.** ESPN returns `team.color` as bare hex (e.g. `"003087"`). Frontend prepends `#`.
- **Golf dates are midnight placeholders.** ESPN returns `event.date` as midnight ET (e.g. `2026-03-12T04:00Z`) for multi-day tournaments — not a real tee time. `GolfService._format_tournament_as_game` substitutes the current time for in-progress tournaments so they land in the correct TV guide time slot. Golf also uses `homeTeam` for tournament name/logo and `awayTeam` for course info since there are no real teams.

## Guidelines

- Follow ESPN-first approach; use NCAA endpoints only where no ESPN equivalent exists
- Three-tier caching: 45s live scores, 5m brackets, 30m static data
- Keep services thin — pass through ESPN JSON as-is
- Always run tests and linter after changes
- Prefer editing existing files over creating new ones
