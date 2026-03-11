"""
Schedule routes -- game dates via ESPN's scoreboard API.
"""

from __future__ import annotations

from fastapi import APIRouter, Request

from services.scoreboard_espn_service import ScoreboardService
from utils.cache import cache_45s, cached_json_response

router = APIRouter(tags=["schedule"])


@router.get("/schedule/basketball-college")
@router.get("/schedule/football-college")
@router.get("/schedule/football-nfl")
@router.get("/schedule/hockey-nhl")
@router.get("/schedule/baseball-mlb")
async def schedule(
    request: Request,
    date: str | None = None,
    seasontype: int | None = None,
):
    """Schedule for a sport on a given date.

    Query params:
        date: YYYYMMDD format (optional, defaults to today).
        seasontype: 2=regular, 3=postseason.
    """
    sport = request.url.path.split("/")[3]
    cache_key = f"schedule:{sport}:{date or 'today'}:{seasontype}"

    # Use 45s cache so live scores stay fresh
    return await cached_json_response(
        cache=cache_45s,
        cache_key=cache_key,
        fetch=lambda: ScoreboardService.fetch_and_format(
            sport=sport,
            date=date,
            season_type=seasontype,
        ),
        max_age=45,
    )


@router.get("/schedule/golf-pga")
async def golf_schedule(
    date: str | None = None,
):
    """Golf tournament schedule formatted as games.

    Returns active/upcoming tournaments for today. Each tournament is
    represented as a single 'game' entry so the frontend can display it
    alongside other sports.

    Query params:
        date: YYYYMMDD format (optional, defaults to today).
    """
    from datetime import datetime, timezone

    from services.golf_service import GolfService

    season_dates = date or str(datetime.now(timezone.utc).year)
    cache_key = f"schedule:golf-pga:{season_dates}"

    return await cached_json_response(
        cache=cache_45s,
        cache_key=cache_key,
        fetch=lambda: GolfService.fetch_schedule(date=season_dates),
        max_age=45,
    )
