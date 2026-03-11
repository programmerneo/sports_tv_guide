"""
Standings via ESPN's public API (no scraping).

Supports NFL, MLB, and NCAA college basketball.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from services.standings_service import StandingsService
from utils.cache import cache_default, cached_data

router = APIRouter(tags=["standings"])

# URL path segment → service sport key
_PATH_TO_SPORT: dict[str, str] = {
    "nfl": "nfl",
    "mlb": "mlb",
    "basketball-college": "basketball-college",
}


@router.get("/standings/nfl")
@router.get("/standings/mlb")
@router.get("/standings/basketball-college")
async def standings(request: Request, conference: str | None = None):
    """Standings for a given sport.

    Args:
        conference: Optional conference name or abbreviation to filter by
            (e.g. ``big10``, ``Big Ten Conference``).
    """
    sport = request.url.path.split("/")[3]
    sport_key = _PATH_TO_SPORT.get(sport)
    if sport_key is None:
        raise HTTPException(
            status_code=404,
            detail=f"Unsupported sport: {sport}",
        )

    cache_key = f"standings:{sport_key}"

    data = await cached_data(
        cache=cache_default,
        cache_key=cache_key,
        fetch=lambda: StandingsService.fetch_standings(sport_key),
    )

    if conference is not None:
        data = StandingsService.filter_by_conference(
            data,
            conference,
        )

    return data
