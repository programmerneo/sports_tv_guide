# NCAA API

Python port of the NCAA API — returns consumable JSON data from [ncaa.com](https://www.ncaa.com) and [ESPN](https://www.espn.com).

Originally based on [henrygd/ncaa-api](https://github.com/henrygd/ncaa-api) (also available as a [Docker image](https://hub.docker.com/r/henrygd/ncaa-api)), rewritten in Python with FastAPI.

Built with **FastAPI**, this application fetches data from ESPN's public API (scoreboard, game summaries, schedule, rankings, standings) and NCAA endpoints (brackets), serving everything through a clean REST interface with aggressive caching.

## Quick Start

**Prerequisites:** Python 3.11+, [uv](https://docs.astral.sh/uv/)

```bash
# Install dependencies
uv sync

# Run in development mode
uv run python main.py

# Run with hot reload
uv run python main.py --reload

# Run in production mode (no reload, multiple workers possible)
uv run fastapi run main.py --port 3001
```

`python main.py` reads its port from `config.py` (`settings.port`, default `3001`), so the server always lands on the same port regardless of who launches it. Override via the `PORT` env var or a `.env` file. Avoid `fastapi dev main.py` without `--port 3001` — it silently defaults to 8000 and the frontend won't find the backend.

The server starts on `http://localhost:3001` by default. Visit `http://localhost:3001/docs` for interactive Swagger UI documentation.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |

## API Endpoints

All endpoints are prefixed with `/api`.

### Scoreboard (ESPN API)

```
GET /api/scoreboard/basketball-college
GET /api/scoreboard/football-college
GET /api/scoreboard/football-nfl
```

Live and historical scores from ESPN. Query params: `?date=YYYYMMDD`, `?limit=100`, `?seasontype=2` (2=regular, 3=postseason).

**Cache:** 45 seconds

### Game Summary (ESPN API)

```
GET /api/game/basketball-college/{event_id}
GET /api/game/football-college/{event_id}
GET /api/game/football-nfl/{event_id}
GET /api/game/hockey-nhl/{event_id}
GET /api/game/baseball-mlb/{event_id}
```

Complete game summary (boxscore, play-by-play, leaders, starting pitchers for MLB) from ESPN. The `event_id` is an ESPN event ID obtained from scoreboard responses.

**Cache:** 45 seconds

### Schedule (ESPN API)

```
GET /api/schedule/basketball-college
GET /api/schedule/football-college
GET /api/schedule/football-nfl
GET /api/schedule/hockey-nhl
GET /api/schedule/baseball-mlb
GET /api/schedule/golf-pga
GET /api/schedule/golf-liv
```

Game schedules from ESPN. Query params: `?date=YYYYMMDD`, `?seasontype=2` (the golf routes accept `?date` only). The golf routes return each active/upcoming tournament as a single "game" entry so the frontend can render it alongside other sports; with no `date`, they default to the current year rather than today.

**Cache:** 45 seconds (same tier as live scores, so in-progress scores stay fresh)

### Brackets

```
GET /api/march-madness/brackets
```

NCAA Men's Basketball D1 tournament bracket (fetched from NCAA's GraphQL endpoint). Query params: `?year=YYYY` — the *championship* year (e.g. `2026` for March 2026), defaulting to the current calendar year.

**Cache:** 5 minutes

### Rankings (ESPN API)

```
GET /api/rankings/basketball-college/d1/associated-press
GET /api/rankings/football-college/d1/associated-press
```

AP Top 25 rankings fetched from ESPN's public API. Returns rank, previous rank, record, poll points, first-place votes, trend, and team logo for all 25 ranked teams plus others receiving votes.

**Cache:** 30 minutes

### Standings (ESPN API)

```
GET /api/standings/nfl
GET /api/standings/mlb
GET /api/standings/nhl
GET /api/standings/basketball-college
GET /api/standings/football-college
GET /api/standings/{sport}/status
```

Standings fetched from ESPN's public API. Returns teams grouped by conference/division with records, win percentage, streak, point differential, playoff seed, and sport-specific stats. Query params: `?conference=` — optional conference name or abbreviation to filter by (e.g. `big10`, `Big Ten Conference`).

`nfl`, `mlb`, and `football-college` are gated to their in-season window only — from that season's regular-season start through the end of ESPN's postseason window; outside that window `/api/standings/{nfl,mlb,football-college}` returns 404. `nhl` and `basketball-college` are never gated. The lightweight `/status` endpoint returns `{"sport": ..., "inSeason": bool}` for checking availability without fetching full standings data — used by the frontend to decide whether to show a standings link. (`football-college` uses ESPN's FBS standings endpoint — 11 conference groups — and reports its record via ESPN's pre-joined `overall` string, since those entries carry no `losses`/`ties`/`winPercent` stats.)

**Cache:** 30 minutes

### Golf (ESPN API)

```
GET /api/golf/pga/scoreboard
GET /api/golf/liv/scoreboard
GET /api/golf/pga/summary/{event_id}
GET /api/golf/liv/summary/{event_id}
GET /api/golf/pga/leaderboard/{event_id}
GET /api/golf/liv/leaderboard/{event_id}
```

PGA Tour and LIV Golf tournament data from ESPN. The scoreboard returns the tournament schedule for the season; the summary provides the raw ESPN payload (full leaderboard, hole-by-hole scores, and course info); the leaderboard returns a formatted top-30 with player positions, scores, and round-by-round results.

Query params (scoreboard only): `?dates=YYYY` for full season or `?dates=YYYYMMDD` for a specific date (defaults to the current year), `?limit=100`. Note this is `dates` (plural) — unlike `/api/scoreboard/*` and `/api/schedule/*`, which take `date`.

**Cache:** 45 seconds for all three (scoreboard, summary, leaderboard)

## Architecture

```
├── main.py                  # FastAPI app, middleware, CLI entry point
├── api/                     # Route handlers (auto-discovered)
│   ├── __init__.py          # Router auto-discovery logic
│   ├── scoreboard.py        # Live scores (ESPN API)
│   ├── game.py              # Game summaries (ESPN API)
│   ├── schedule.py          # Schedules (ESPN API)
│   ├── rankings.py          # AP Top 25 (ESPN API)
│   ├── standings.py         # NFL, MLB, NHL, NCAA basketball/football standings (ESPN API)
│   ├── brackets.py          # Tournament brackets (NCAA)
│   └── golf.py              # PGA Tour and LIV Golf (ESPN API)
├── constants/
│   └── espn.py              # ESPN API base URLs, endpoint mappings, stat configs
├── services/
│   ├── scoreboard_espn_service.py  # ESPN scoreboard fetcher
│   ├── game_espn_service.py        # ESPN game summary fetcher
│   ├── golf_service.py      # Golf schedule/leaderboard formatting
│   ├── rankings_service.py  # ESPN rankings fetcher
│   ├── standings_service.py # ESPN standings fetcher + season gating
│   └── bracket_service.py   # NCAA bracket formatting
├── utils/
│   ├── cache.py             # TTL cache tiers with async locks
│   └── client.py            # Shared async HTTP client (singleton)
├── schemas/
│   ├── codes.py             # Sport/division codes, season logic
│   ├── game.py              # Pydantic response schemas (GameSchema, GameSummarySchema)
│   ├── bracket.py           # Pydantic bracket response schemas
│   └── api-contract.json    # Generated API contract (see scripts/generate_types.py)
├── scripts/
│   └── generate_types.py    # Emits the API contract / frontend TS types
└── tests/
    ├── conftest.py           # TestClient fixture
    ├── fixtures/
    │   ├── espn_data.py      # Sample ESPN API response data for tests
    │   └── ncaa_bracket_data.py  # Sample NCAA bracket response data
    ├── test_endpoints.py     # Endpoint smoke tests
    ├── test_auto_discovery.py # Router discovery tests
    ├── test_models.py        # Code mapping / season logic tests (schemas/codes.py)
    ├── test_schemas.py       # Pydantic schema serialization tests
    ├── test_scoreboard_formatting.py  # ScoreboardService formatting tests
    ├── test_game_formatting.py        # GameService formatting tests
    ├── test_standings_formatting.py   # StandingsService formatting tests
    ├── test_bracket_formatting.py     # BracketService formatting tests
    └── test_api_contract.py  # API contract validation tests
```

### Key Design Decisions

- **Auto-discovery:** Drop a file in `api/` with a `router` attribute and it's registered automatically — no changes to `main.py` needed.
- **ESPN-first:** Scoreboard, game summaries, schedule, rankings, and standings all use ESPN's free public JSON API — no auth required, no scraping.
- **NCAA fallback:** Brackets still use NCAA endpoints where no ESPN equivalent exists.
- **Three-tier caching** (`utils/cache.py`): `cache_45s` for anything score-bearing (scoreboard, game summaries, schedule, golf), `cache_5m` for brackets, `cache_default` (30m) for static data (rankings, standings). Async locks prevent thundering herd on cache misses.
- **Passthrough JSON:** ESPN responses are served as-is (no format conversion), keeping the service layer thin.

## Development

### Linting

This project uses [ruff](https://docs.astral.sh/ruff/) for linting and formatting.

```bash
# Check for lint errors
uv run ruff check .

# Auto-fix fixable errors
uv run ruff check --fix .

# Format code
uv run ruff format .
```

### Testing

```bash
# Run all tests
uv run pytest

# Run with verbose output
uv run pytest -v

# Run a specific test file
uv run pytest tests/test_endpoints.py
```

## License

MIT
