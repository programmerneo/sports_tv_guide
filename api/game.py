"""
Game summary routes -- boxscore, plays, leaders via ESPN's public API.

Uses ESPN event IDs (obtained from scoreboard responses).
"""

from __future__ import annotations

from fastapi import APIRouter, Request

from services.game_espn_service import GameService
from utils.cache import cache_45s, cached_json_response

router = APIRouter(tags=["game"])


@router.get("/game/basketball-college/{event_id}")
@router.get("/game/football-college/{event_id}")
@router.get("/game/football-nfl/{event_id}")
@router.get("/game/hockey-nhl/{event_id}")
@router.get("/game/baseball-mlb/{event_id}")
async def game_summary(request: Request, event_id: str):
    """Complete game summary (boxscore, play-by-play, leaders).

    The event_id is an ESPN event ID from the scoreboard.
    """
    sport = request.url.path.split("/")[3]
    cache_key = f"game:{sport}:{event_id}"

    return await cached_json_response(
        cache=cache_45s,
        cache_key=cache_key,
        fetch=lambda: GameService.fetch_and_format(
            sport=sport,
            event_id=event_id,
        ),
        max_age=60,
    )
