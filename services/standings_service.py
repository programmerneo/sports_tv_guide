"""
Fetch standings from ESPN's public API.

Supports NFL, MLB, NHL, and NCAA college basketball and football.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from constants.espn import (
    POSTSEASON_SPORT_PATHS,
    STANDINGS_COMMON_STATS,
    STANDINGS_EXTRA_STATS,
    STANDINGS_URLS,
    season_url,
)
from fastapi import HTTPException
from utils.cache import cache_default, cached_data
from utils.client import get_client

# ESPN core API season-type identifiers (from ``types.items[].type``).
_SEASON_TYPE_REGULAR = 2
_SEASON_TYPE_POSTSEASON = 3

logger = logging.getLogger(__name__)


def _parse_iso8601(value: str) -> datetime:
    """Parse an ESPN ISO8601 timestamp (``Z`` suffix) into a UTC datetime."""
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


class StandingsService:
    """Service for fetching standings from ESPN."""

    @classmethod
    async def is_in_season(cls, sport: str) -> bool:
        """Check whether a sport's regular season or postseason is active.

        Only NFL, MLB, and college football are gated; other sports are
        always considered available. A gated sport is "in season" for a
        candidate year if the current time falls between that season's
        regular-season start and postseason end. Two candidate years are
        tried (the current year, then the previous year) to cover the
        Jan/Feb window where the
        relevant season is still the previous year's (e.g. a season that
        runs Sept 2025 -> Feb 2026).

        Fails open (returns ``True``) only if *every* candidate year's
        lookup failed outright (network error, bad response, etc.) — if at
        least one candidate year resolved successfully but its window
        didn't match, that's a legitimate "not in season" and is reported
        as such rather than papered over.

        Args:
            sport: Short sport key (e.g. ``'nfl'``, ``'mlb'``, ``'nhl'``).

        Returns:
            ``True`` if the sport isn't gated, if it's currently between its
            regular-season start and postseason end, or if every lookup
            failed; ``False`` otherwise.
        """
        if sport not in POSTSEASON_SPORT_PATHS:
            return True

        now = datetime.now(UTC)
        resolved_any = False
        for year in (now.year, now.year - 1):
            window = await cls._fetch_season_window(sport, year)
            if window is None:
                continue
            resolved_any = True
            regular_start = _parse_iso8601(window["regularStart"])
            postseason_end = _parse_iso8601(window["postseasonEnd"])
            if regular_start <= now < postseason_end:
                return True

        if not resolved_any:
            logger.warning("Could not determine season window for sport: %s", sport)
            return True

        return False

    @classmethod
    async def _fetch_season_window(cls, sport: str, year: int) -> dict | None:
        """Fetch (and cache) a sport's regular-season start / postseason end.

        Returns:
            Dict with ``regularStart`` and ``postseasonEnd`` ISO8601 strings,
            or ``None`` if the lookup failed for any reason (missing season,
            network error, malformed response).
        """
        cache_key = f"season_window:{sport}:{year}"

        async def _fetch() -> dict:
            client = get_client()
            resp = await client.get(season_url(sport, year))
            resp.raise_for_status()
            data = resp.json()
            items = data.get("types", {}).get("items", [])
            regular = next((i for i in items if i.get("type") == _SEASON_TYPE_REGULAR), None)
            postseason = next((i for i in items if i.get("type") == _SEASON_TYPE_POSTSEASON), None)
            if regular is None or postseason is None:
                raise ValueError(f"Missing season type data for {sport} {year}")
            return {
                "regularStart": regular["startDate"],
                "postseasonEnd": postseason["endDate"],
            }

        try:
            return await cached_data(cache=cache_default, cache_key=cache_key, fetch=_fetch)
        except HTTPException as exc:
            logger.warning(
                "Failed to fetch season window for %s season %s: %s",
                sport,
                year,
                exc.detail,
            )
            return None

    @classmethod
    async def fetch_standings(cls, sport: str) -> dict:
        """Fetch current standings for a sport.

        Args:
            sport: One of the keys in
                :data:`constants.espn.STANDINGS_URLS` (e.g. ``'nfl'``,
                ``'basketball-college'``, ``'football-college'``).

        Returns:
            Dictionary with league name and a list of conference/division groups.

        Raises:
            ValueError: If the sport is not supported.
        """
        url = STANDINGS_URLS.get(sport)
        if url is None:
            raise ValueError(f"Unsupported sport: {sport!r}. Expected one of {list(STANDINGS_URLS)}")

        client = get_client()
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()

        groups: list[dict] = []
        for child in data.get("children", []):
            sub_children = child.get("children", [])
            direct_entries = child.get("standings", {}).get("entries", [])

            if sub_children and not direct_entries:
                # Nested: child is a league container (e.g., AL/NL in MLB)
                league_name = child.get("name", "")
                for group in sub_children:
                    teams = [cls._format_team(entry, sport) for entry in group.get("standings", {}).get("entries", [])]
                    groups.append(
                        {
                            "name": group.get("name", ""),
                            "abbreviation": group.get("abbreviation", ""),
                            "league": league_name,
                            "teams": teams,
                        }
                    )
            else:
                # Flat: child is a direct division group
                teams = [cls._format_team(entry, sport) for entry in direct_entries]
                groups.append(
                    {
                        "name": child.get("name", ""),
                        "abbreviation": child.get("abbreviation", ""),
                        "league": None,
                        "teams": teams,
                    }
                )

        return {
            "sport": sport,
            "league": data.get("name", ""),
            "season": (data.get("seasons", [{}])[0].get("displayName", "") if data.get("seasons") else ""),
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
            # College endpoints repeat every stat ``name`` once per split
            # (overall, then homerecord_*, awayrecord_*, vsconf_*, ...), so keep
            # the first occurrence — the overall value — and ignore the splits.
            if name in desired and name not in by_name:
                by_name[name] = s.get("displayValue", s.get("value", ""))
        return by_name

    @classmethod
    def _format_team(cls, entry: dict, sport: str) -> dict:
        """Format a single team entry."""
        team = entry.get("team", {})
        stats = cls._extract_stats(entry.get("stats", []), sport)

        # Prefer ESPN's pre-joined overall record (college football has no
        # ``losses``/``ties`` stat), else build one from wins/losses(/ties).
        record = stats.get("overall")
        if not record:
            wins = stats.get("wins", "0")
            losses = stats.get("losses", "0")
            ties = stats.get("ties")
            record = f"{wins}-{losses}-{ties}" if ties and ties != "0" else f"{wins}-{losses}"

        result: dict = {
            "team": team.get("displayName", ""),
            "shortName": team.get("shortDisplayName", ""),
            "abbreviation": team.get("abbreviation", ""),
            "logo": (team.get("logos") or [{}])[0].get("href", ""),
            "record": record,
        }
        # Include all extracted stats (minus those already folded into record).
        for key, val in stats.items():
            if key not in ("wins", "losses", "ties", "overall"):
                result[key] = val
        return result
