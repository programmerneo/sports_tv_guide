"""
Scoreboard routes -- live scores via ESPN's public API.

Supports men's basketball, college football, and NFL.
"""

from __future__ import annotations

from fastapi import APIRouter, Request

from services.scoreboard_espn_service import ScoreboardService
from utils.cache import cache_45s, cached_json_response

router = APIRouter(tags=["scoreboard"])


@router.get("/scoreboard/basketball-college")
@router.get("/scoreboard/football-college")
@router.get("/scoreboard/football-nfl")
async def scoreboard(
    request: Request,
    date: str | None = None,
    limit: int = 100,
    seasontype: int | None = None,
):
    """Live and historical scores for a sport.

    Query params:
        date: YYYYMMDD format (optional, defaults to today).
        limit: Max events (default 100).
        seasontype: 2=regular, 3=postseason.
    """
    sport = request.url.path.split("/")[3]
    cache_key = f"scoreboard:{sport}:{date or 'today'}:{limit}:{seasontype}"

    return await cached_json_response(
        cache=cache_45s,
        cache_key=cache_key,
        fetch=lambda: ScoreboardService.fetch_and_format(
            sport=sport,
            date=date,
            limit=limit,
            season_type=seasontype,
        ),
        max_age=60,
    )
