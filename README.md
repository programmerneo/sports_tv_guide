# NCAA API

Python port of the NCAA API — returns consumable JSON data from [ncaa.com](https://www.ncaa.com) and [ESPN](https://www.espn.com).

Originally based on [henrygd/ncaa-api](https://github.com/henrygd/ncaa-api) (also available as a [Docker image](https://hub.docker.com/r/henrygd/ncaa-api)), rewritten in Python with FastAPI.

Built with **FastAPI**, this application fetches data from ESPN's public API (scoreboard, game summaries, schedule, rankings, standings) and NCAA endpoints (brackets), serving everything through a clean REST interface with aggressive caching.

## Quick Start

**Prerequisites:** Python 3.11+, [uv](https://docs.astral.sh/uv/)

```bash
# Install dependencies
uv sync

# Run in development mode (hot reload)
uv run fastapi dev main.py

# Run in production mode
uv run fastapi run main.py
```

The server starts on `http://localhost:3000` by default. Visit `http://localhost:3000/docs` for interactive Swagger UI documentation.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |

## API Endpoints

All endpoints are prefixed with `/api`.

### Scoreboard (ESPN API)

```
GET /api/scoreboard/basketball-college
GET /api/scoreboard/football-college
GET /api/scoreboard/football-nfl
```

Live and historical scores from ESPN. Query params: `?dates=YYYYMMDD`, `?limit=100`, `?seasontype=2` (2=regular, 3=postseason).

**Cache:** 45 seconds

### Game Summary (ESPN API)

```
GET /api/game/basketball-college/{event_id}
GET /api/game/football-college/{event_id}
GET /api/game/football-nfl/{event_id}
```

Complete game summary (boxscore, play-by-play, leaders, starting pitchers for MLB) from ESPN. The `event_id` is an ESPN event ID obtained from scoreboard responses.

**Cache:** 45 seconds

### Schedule (ESPN API)

```
GET /api/schedule/basketball-college
GET /api/schedule/football-college
GET /api/schedule/football-nfl
```

Game schedules from ESPN. Query params: `?dates=YYYYMMDD`, `?seasontype=2`.

**Cache:** 30 minutes

### Brackets

```
GET /api/brackets/{sport}/{division}/{year}
```

Tournament bracket data.

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
GET /api/standings/basketball-college
```

Standings fetched from ESPN's public API. Returns teams grouped by conference/division with records, win percentage, streak, point differential, playoff seed, and sport-specific stats.

**Cache:** 30 minutes

### Golf (ESPN API)

```
GET /api/golf/pga/scoreboard
GET /api/golf/liv/scoreboard
GET /api/golf/pga/summary/{event_id}
GET /api/golf/liv/summary/{event_id}
```

PGA Tour and LIV Golf tournament data from ESPN. The scoreboard returns the tournament schedule for the season; the summary provides the full leaderboard, hole-by-hole scores, and course info.

Query params (scoreboard): `?dates=YYYY` for full season or `?dates=YYYYMMDD` for a specific date, `?limit=100`.

**Cache:** Scoreboard 30 minutes, Summary 45 seconds

## Architecture

```
├── main.py                  # FastAPI app, middleware, CLI entry point
├── api/                     # Route handlers (auto-discovered)
│   ├── __init__.py          # Router auto-discovery logic
│   ├── scoreboard.py        # Live scores (ESPN API)
│   ├── game.py              # Game summaries (ESPN API)
│   ├── schedule.py          # Schedules (ESPN API)
│   ├── rankings.py          # AP Top 25 (ESPN API)
│   ├── standings.py         # NFL, MLB, NCAA basketball standings (ESPN API)
│   ├── brackets.py          # Tournament brackets (NCAA)
│   └── golf.py              # PGA Tour and LIV Golf (ESPN API)
├── constants/
│   └── espn.py              # ESPN API base URLs, endpoint mappings, stat configs
├── models/
│   └── codes.py             # Sport/division codes, season logic
├── services/
│   ├── scoreboard_espn_service.py  # ESPN scoreboard fetcher
│   ├── game_espn_service.py        # ESPN game summary fetcher
│   ├── rankings_service.py  # ESPN rankings fetcher
│   └── standings_service.py # ESPN standings fetcher
├── utils/
│   ├── cache.py             # TTL cache tiers with async locks
│   └── client.py            # Shared async HTTP client (singleton)
├── schemas/
│   └── game.py              # Pydantic response schemas (GameSchema, GameSummarySchema)
└── tests/
    ├── conftest.py           # TestClient fixture
    ├── fixtures/
    │   └── espn_data.py      # Sample ESPN API response data for tests
    ├── test_endpoints.py     # Endpoint smoke tests
    ├── test_auto_discovery.py # Router discovery tests
    ├── test_models.py        # Model and code mapping tests
    ├── test_schemas.py       # Pydantic schema serialization tests
    ├── test_scoreboard_formatting.py  # ScoreboardService formatting tests
    ├── test_game_formatting.py        # GameService formatting tests
    └── test_api_contract.py  # API contract validation tests
```

### Key Design Decisions

- **Auto-discovery:** Drop a file in `api/` with a `router` attribute and it's registered automatically — no changes to `main.py` needed.
- **ESPN-first:** Scoreboard, game summaries, schedule, rankings, and standings all use ESPN's free public JSON API — no auth required, no scraping.
- **NCAA fallback:** Brackets still use NCAA endpoints where no ESPN equivalent exists.
- **Three-tier caching:** 45s for live scores, 5m for brackets, 30m for static data. Async locks prevent thundering herd on cache misses.
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
