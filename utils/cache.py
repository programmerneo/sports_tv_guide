"""
TTL-based in-memory caches.

Import ``cache_default`` for the default 30-minute TTL.  Use ``cache_45s`` or
``cache_5m`` only where a shorter TTL is needed (live scores, brackets).
"""

from __future__ import annotations

import asyncio
import json
from collections.abc import Awaitable, Callable

from cachetools import TTLCache
from fastapi import HTTPException, Response

# ── Configuration ─────────────────────────────────────────────────────────
CACHE_MAXSIZE = 2048
CACHE_TTL_DEFAULT = 30 * 60  # 30 minutes
CACHE_TTL_SHORT = 45  # 45 seconds (live scores, games)
CACHE_TTL_MEDIUM = 5 * 60  # 5 minutes (brackets)

# ── Cache instances ───────────────────────────────────────────────────────
cache_default: TTLCache = TTLCache(maxsize=CACHE_MAXSIZE, ttl=CACHE_TTL_DEFAULT)
cache_45s: TTLCache = TTLCache(maxsize=CACHE_MAXSIZE, ttl=CACHE_TTL_SHORT)
cache_5m: TTLCache = TTLCache(maxsize=CACHE_MAXSIZE, ttl=CACHE_TTL_MEDIUM)

# Semaphore-like locks keyed by cache key to prevent thundering-herd.
_locks: dict[str, asyncio.Lock] = {}


def get_lock(key: str) -> asyncio.Lock:
    """Return (or create) an ``asyncio.Lock`` for *key*."""
    if key not in _locks:
        _locks[key] = asyncio.Lock()
    return _locks[key]


async def cached_data(
    cache: TTLCache,
    cache_key: str,
    fetch: Callable[[], Awaitable[dict]],
) -> dict:
    """Fetch data with cache-aside pattern, returning a plain dict.

    Args:
        cache: TTLCache instance to read/write.
        cache_key: Key for the cache entry.
        fetch: Async callable that returns the data dict on cache miss.

    Returns:
        The cached or freshly fetched dictionary.

    Raises:
        HTTPException: 502 if *fetch* raises a non-HTTP exception.
    """
    async with get_lock(cache_key):
        if cache_key in cache:
            return json.loads(cache[cache_key])

        try:
            data = await fetch()
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=502, detail=str(exc))

        cache[cache_key] = json.dumps(data)
        return data


async def cached_json_response(
    cache: TTLCache,
    cache_key: str,
    fetch: Callable[[], Awaitable[dict]],
    max_age: int,
) -> Response:
    """Fetch data with cache-aside pattern, returning a JSON ``Response``.

    Args:
        cache: TTLCache instance to read/write.
        cache_key: Key for the cache entry.
        fetch: Async callable that returns the data dict on cache miss.
        max_age: ``Cache-Control`` max-age value in seconds.

    Returns:
        A FastAPI ``Response`` with JSON content and cache headers.

    Raises:
        HTTPException: 502 if *fetch* raises a non-HTTP exception.
    """
    async with get_lock(cache_key):
        if cache_key in cache:
            return Response(
                content=cache[cache_key],
                media_type="application/json",
                headers={
                    "Cache-Control": f"public, max-age={max_age}",
                    "x-cache": "hit",
                },
            )

        try:
            data = await fetch()
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=502, detail=str(exc))

        payload = json.dumps(data)
        cache[cache_key] = payload
        return Response(
            content=payload,
            media_type="application/json",
            headers={"Cache-Control": f"public, max-age={max_age}"},
        )
