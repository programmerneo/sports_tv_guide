"""
NCAA Men's Basketball tournament bracket route.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from schemas.codes import get_season_year
from utils.cache import cache_5m, cached_json_response
from utils.client import get_client

router = APIRouter(tags=["brackets"])

_SPORT = "basketball-men"
_DIVISION = 1  # D1


@router.get("/march-madness/brackets")
async def brackets(year: int | None = None):
    """NCAA Men's Basketball D1 tournament bracket.

    Query params:
        year: Season year (optional, defaults to current season).
    """
    season_year = year or get_season_year(datetime.now(timezone.utc))
    cache_key = f"/brackets/{_SPORT}/d1/{season_year}"

    variables = {
        "sportUrl": _SPORT,
        "division": _DIVISION,
        "year": season_year,
    }
    extensions = {
        "persistedQuery": {
            "version": 1,
            # Apollo GraphQL persisted query hash — identifies the query definition,
            # not tied to season year. Only changes if NCAA updates the query.
            "sha256Hash": "e651c2602fb9e82cdad6e947389600c6b69e0e463e437b78bf7ec614d6d15f80",
        }
    }
    url = (
        f"https://sdataprod.ncaa.com/"
        f"?operationName=get_championship_ncaa"
        f"&variables={json.dumps(variables, separators=(',', ':'))}"
        f"&extensions={json.dumps(extensions, separators=(',', ':'))}"
    )

    async def _fetch() -> dict:
        client = get_client()
        resp = await client.get(url)
        if resp.status_code != 200:
            raise HTTPException(status_code=404, detail="Resource not found")
        data = resp.json()
        if not data.get("data", {}).get("championships"):
            raise HTTPException(status_code=404, detail="Resource not found")
        return data["data"]

    return await cached_json_response(
        cache=cache_5m,
        cache_key=cache_key,
        fetch=_fetch,
        max_age=300,
    )
