"""
Golf routes -- PGA Tour and LIV Golf via ESPN's public API.
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Request

from services.game_espn_service import GameService
from services.scoreboard_espn_service import ScoreboardService
from utils.cache import cache_45s, cache_default, cached_json_response

router = APIRouter(tags=["golf"])


@router.get("/golf/pga/scoreboard")
@router.get("/golf/liv/scoreboard")
async def golf_scoreboard(
    request: Request,
    dates: str | None = None,
    limit: int = 100,
):
    """Golf tournament schedule with basic status.

    Returns the list of tournaments for the season. Use the summary
    endpoint with an event_id from this response to get the full leaderboard.

    Query params:
        dates: YYYY for full season or YYYYMMDD for a specific date
               (defaults to current year).
        limit: Max events (default 100).
    """
    sport = request.url.path.split("/")[3]
    tour = f"golf-{sport}"
    season_dates = dates or str(datetime.now(timezone.utc).year)
    cache_key = f"golf:{tour}:{season_dates}:{limit}"

    return await cached_json_response(
        cache=cache_default,
        cache_key=cache_key,
        fetch=lambda: ScoreboardService.fetch_scoreboard(
            sport=tour,
            date=season_dates,
            limit=limit,
        ),
        max_age=1800,
    )


@router.get("/golf/pga/summary/{event_id}")
@router.get("/golf/liv/summary/{event_id}")
async def golf_summary(request: Request, event_id: str):
    """Full tournament leaderboard, hole-by-hole scores, and course info.

    The event_id is an ESPN event ID obtained from the scoreboard endpoint.
    """
    sport = request.url.path.split("/")[3]
    tour = f"golf-{sport}"
    cache_key = f"golf-summary:{tour}:{event_id}"

    return await cached_json_response(
        cache=cache_45s,
        cache_key=cache_key,
        fetch=lambda: GameService.fetch_game_summary(
            sport=tour,
            event_id=event_id,
        ),
        max_age=60,
    )


@router.get("/golf/pga/leaderboard/{event_id}")
@router.get("/golf/liv/leaderboard/{event_id}")
async def golf_leaderboard(request: Request, event_id: str):
    """Top-30 golf leaderboard for a tournament.

    Returns formatted leaderboard with player positions, scores,
    and round-by-round results.

    Args:
        event_id: ESPN event ID from the scoreboard endpoint.
    """
    from services.golf_service import GolfService

    sport = request.url.path.split("/")[3]
    tour = f"golf-{sport}"
    cache_key = f"golf-leaderboard:{tour}:{event_id}"

    return await cached_json_response(
        cache=cache_45s,
        cache_key=cache_key,
        fetch=lambda: GolfService.fetch_leaderboard(event_id=event_id, tour=tour),
        max_age=60,
    )
