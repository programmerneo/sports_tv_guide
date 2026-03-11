"""
Fetch standings from ESPN's public API.

Supports NFL, MLB, and NCAA college basketball.
"""

from __future__ import annotations

from constants.espn import (
    STANDINGS_COMMON_STATS,
    STANDINGS_EXTRA_STATS,
    STANDINGS_URLS,
)
from utils.client import get_client


class StandingsService:
    """Service for fetching standings from ESPN."""

    @classmethod
    async def fetch_standings(cls, sport: str) -> dict:
        """Fetch current standings for a sport.

        Args:
            sport: ``'nfl'``, ``'mlb'``, or ``'basketball-college'``.

        Returns:
            Dictionary with league name and a list of conference/division groups.

        Raises:
            ValueError: If the sport is not supported.
        """
        url = STANDINGS_URLS.get(sport)
        if url is None:
            raise ValueError(
                f"Unsupported sport: {sport!r}. Expected one of {list(STANDINGS_URLS)}"
            )

        client = get_client()
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()

        groups: list[dict] = []
        for group in data.get("children", []):
            teams = []
            standings = group.get("standings", {})
            for entry in standings.get("entries", []):
                teams.append(cls._format_team(entry, sport))

            groups.append(
                {
                    "name": group.get("name", ""),
                    "abbreviation": group.get("abbreviation", ""),
                    "teams": teams,
                }
            )

        return {
            "sport": sport,
            "league": data.get("name", ""),
            "season": (
                data.get("seasons", [{}])[0].get("displayName", "")
                if data.get("seasons")
                else ""
            ),
            "groups": groups,
        }

    @classmethod
    def filter_by_conference(cls, data: dict, conference: str) -> dict:
        """Filter standings to a single conference.

        Args:
            data: Full standings dict from :meth:`fetch_standings`.
            conference: Conference name or abbreviation (case-insensitive).

        Returns:
            Standings dict with ``groups`` limited to the matching conference.
        """
        query = conference.lower()
        filtered = [
            g
            for g in data.get("groups", [])
            if query
            in (
                g.get("name", "").lower(),
                g.get("abbreviation", "").lower(),
            )
        ]
        return {**data, "groups": filtered}

    @classmethod
    def _extract_stats(cls, stats: list[dict], sport: str) -> dict:
        """Pull relevant stats from ESPN's flat stats array into a dict."""
        desired = STANDINGS_COMMON_STATS + STANDINGS_EXTRA_STATS.get(sport, [])
        by_name: dict[str, str] = {}
        for s in stats:
            name = s.get("name") or s.get("type", "")
            if name in desired:
                by_name[name] = s.get("displayValue", s.get("value", ""))
        return by_name

    @classmethod
    def _format_team(cls, entry: dict, sport: str) -> dict:
        """Format a single team entry."""
        team = entry.get("team", {})
        stats = cls._extract_stats(entry.get("stats", []), sport)

        # Build a record string from wins/losses(/ties).
        wins = stats.get("wins", "0")
        losses = stats.get("losses", "0")
        ties = stats.get("ties")
        record = (
            f"{wins}-{losses}-{ties}" if ties and ties != "0" else f"{wins}-{losses}"
        )

        result: dict = {
            "team": team.get("displayName", ""),
            "shortName": team.get("shortDisplayName", ""),
            "abbreviation": team.get("abbreviation", ""),
            "logo": (team.get("logos") or [{}])[0].get("href", ""),
            "record": record,
        }
        # Include all extracted stats (minus wins/losses/ties already in record).
        for key, val in stats.items():
            if key not in ("wins", "losses", "ties"):
                result[key] = val
        return result
