"""
Shared async HTTP client for all NCAA upstream requests.

Uses a single ``httpx.AsyncClient`` with sensible defaults so that
connection pooling is reused across the application.
"""

from __future__ import annotations

import httpx

_client: httpx.AsyncClient | None = None


def get_client() -> httpx.AsyncClient:
    """Return the shared ``httpx.AsyncClient``, creating it on first call."""
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0, connect=10.0),
            follow_redirects=True,
            headers={"User-Agent": "ncaa-api-python/0.1.0"},
        )
    return _client


async def close_client() -> None:
    """Gracefully close the shared client (called on app shutdown)."""
    global _client
    if _client and not _client.is_closed:
        await _client.aclose()
        _client = None
