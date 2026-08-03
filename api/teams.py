"""
Team lists via ESPN's public API (no scraping).

Supports NFL, MLB, NHL, and NCAA college basketball and football. Browsable
year-round (not gated to games loaded today) so the frontend can build a
favorite-teams picker.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request
from services.teams_service import TeamsService
from utils.cache import cache_default, cached_data

router = APIRouter(tags=["teams"])

# URL path segment → service sport key
_PATH_TO_SPORT: dict[str, str] = {
    "nfl": "nfl",
    "mlb": "mlb",
    "nhl": "nhl",
    "basketball-college": "basketball-college",
    "football-college": "football-college",
}


@router.get("/teams/nfl")
@router.get("/teams/mlb")
@router.get("/teams/nhl")
@router.get("/teams/basketball-college")
@router.get("/teams/football-college")
async def teams(request: Request) -> dict[str, Any]:
    """Full team list for a given sport."""
    sport = request.url.path.split("/")[3]
    sport_key = _PATH_TO_SPORT.get(sport)
    if sport_key is None:
        raise HTTPException(
            status_code=404,
            detail=f"Unsupported sport: {sport}",
        )

    cache_key = f"teams:{sport_key}"

    return await cached_data(
        cache=cache_default,
        cache_key=cache_key,
        fetch=lambda: TeamsService.list_teams(sport_key),
    )
