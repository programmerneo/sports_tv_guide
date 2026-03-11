"""
Fetch AP Top 25 rankings from ESPN's public API.

Replaces HTML scraping of ncaa.com with structured JSON from ESPN.
Supports both men's basketball and college football.
"""

from __future__ import annotations

from constants.espn import RANKINGS_URLS
from utils.client import get_client


class RankingsService:
    """Service for fetching AP Top 25 rankings from ESPN."""

    @classmethod
    async def fetch_ap_top_25(cls, sport: str = "basketball-college") -> dict:
        """Fetch the current AP Top 25 rankings for a sport.

        Args:
            sport: ``'basketball-college'`` or ``'football'``.

        Returns:
            Dictionary with poll metadata and a list of ranked teams.

        Raises:
            ValueError: If the sport is not supported.
        """
        url = RANKINGS_URLS.get(sport)
        if url is None:
            raise ValueError(
                f"Unsupported sport: {sport!r}. Expected one of {list(RANKINGS_URLS)}"
            )

        client = get_client()
        resp = await client.get(url)
        if resp.status_code == 400:
            # ESPN returns 400 during the off-season when no poll is active.
            return {"poll": "AP Top 25", "sport": sport, "ranks": [], "others": []}
        resp.raise_for_status()
        data = resp.json()

        rankings = data.get("rankings", [])
        ap_poll = next((r for r in rankings if r.get("type") == "ap"), None)
        if ap_poll is None:
            return {"poll": "AP Top 25", "sport": sport, "ranks": [], "others": []}

        return {
            "poll": ap_poll.get("name", "AP Top 25"),
            "sport": sport,
            "headline": ap_poll.get("headline", ""),
            "date": ap_poll.get("date", ""),
            "lastUpdated": ap_poll.get("lastUpdated", ""),
            "season": ap_poll.get("season", {}).get("displayName", ""),
            "week": ap_poll.get("occurrence", {}).get("displayValue", ""),
            "ranks": [cls._format_team(r) for r in ap_poll.get("ranks", [])],
            "others": [cls._format_team(r) for r in ap_poll.get("others", [])],
        }

    @classmethod
    def _format_team(cls, entry: dict) -> dict:
        """Format a single ranked team entry from ESPN data."""
        team = entry.get("team", {})
        return {
            "rank": entry.get("current"),
            "previous": entry.get("previous"),
            "team": team.get("location", ""),
            "name": team.get("name", ""),
            "abbreviation": team.get("abbreviation", ""),
            "record": entry.get("recordSummary", ""),
            "points": entry.get("points"),
            "firstPlaceVotes": entry.get("firstPlaceVotes"),
            "trend": entry.get("trend", ""),
            "logo": team.get("logo", ""),
        }
