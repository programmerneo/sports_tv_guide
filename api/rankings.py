"""
AP Top 25 rankings via ESPN's public API (no scraping).
"""

from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException, Request, Response

from services.rankings_service import RankingsService
from utils.cache import cache_default, get_lock

router = APIRouter(tags=["rankings"])

# URL path segment → service sport key
_PATH_TO_SPORT: dict[str, str] = {
    "basketball-college": "basketball-college",
    "football-college": "football-college",
}


@router.get("/rankings/basketball-college/d1/associated-press")
@router.get("/rankings/football-college/d1/associated-press")
async def rankings(request: Request):
    """AP Top 25 rankings for a given sport."""
    sport = request.url.path.split("/")[3]
    sport_key = _PATH_TO_SPORT.get(sport)
    if sport_key is None:
        raise HTTPException(status_code=404, detail=f"Unsupported sport: {sport}")

    cache_key = f"rankings:{sport_key}:d1:ap"

    async with get_lock(cache_key):
        if cache_key in cache_default:
            return Response(
                content=cache_default[cache_key],
                media_type="application/json",
                headers={"Cache-Control": "public, max-age=1800"},
            )

        try:
            data = await RankingsService.fetch_ap_top_25(sport=sport_key)
        except Exception as exc:
            raise HTTPException(status_code=502, detail=str(exc))

        payload = json.dumps(data)
        cache_default[cache_key] = payload
        return Response(
            content=payload,
            media_type="application/json",
            headers={"Cache-Control": "public, max-age=1800"},
        )
