"""
Fetch scoreboard data from ESPN's public API.

Supports college basketball, college football, NFL, NHL, and MLB.
"""

from __future__ import annotations

from constants.espn import CONFERENCE_SHORT_NAMES, SCOREBOARD_GROUPS, SCOREBOARD_URLS
from utils.client import get_client


class ScoreboardService:
    """Service for fetching scoreboard data from ESPN."""

    @classmethod
    async def fetch_scoreboard(
        cls,
        sport: str,
        date: str | None = None,
        limit: int = 100,
        season_type: int | None = None,
    ) -> dict:
        """Fetch scoreboard for a sport, optionally filtered by date.

        Args:
            sport: ``'basketball-college'``, ``'football-college'``, or ``'football-nfl'``.
            date: Date in ``YYYYMMDD`` format (optional, defaults to today).
            limit: Max number of events to return.
            season_type: ESPN season type (2=regular, 3=postseason).

        Returns:
            ESPN scoreboard response with events, leagues, and season info.

        Raises:
            ValueError: If the sport is not supported.
        """
        url = SCOREBOARD_URLS.get(sport)
        if url is None:
            raise ValueError(
                f"Unsupported sport: {sport!r}. Expected one of {list(SCOREBOARD_URLS)}"
            )

        params: dict[str, str | int] = {"limit": limit}
        if date:
            params["dates"] = date
        if season_type is not None:
            params["seasontype"] = season_type
        # College sports require a groups filter to return all games;
        # without it ESPN only returns a small curated subset.
        groups = SCOREBOARD_GROUPS.get(sport)
        if groups is not None:
            params["groups"] = groups

        client = get_client()
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        return resp.json()

    @classmethod
    async def fetch_and_format(
        cls,
        sport: str,
        date: str | None = None,
        limit: int = 100,
        season_type: int | None = None,
    ) -> dict:
        """Fetch scoreboard and format into game list."""
        raw = await cls.fetch_scoreboard(
            sport,
            date=date,
            limit=limit,
            season_type=season_type,
        )
        return {"games": cls.format_events(raw, sport)}

    @classmethod
    def format_events(cls, data: dict, sport: str) -> list[dict]:
        """Format ESPN events into game dicts matching GameSchema."""
        events = data.get("events", [])
        return [cls._format_event(event, sport) for event in events]

    @classmethod
    def _format_event(cls, event: dict, sport: str) -> dict:
        """Format a single ESPN event."""
        competition = (event.get("competitions") or [{}])[0]
        competitors = competition.get("competitors", [])
        home = next((c for c in competitors if c.get("homeAway") == "home"), {})
        away = next((c for c in competitors if c.get("homeAway") == "away"), {})

        return {
            "id": event.get("id", ""),
            "eventId": event.get("id", ""),
            "sport": sport,
            "homeTeam": cls._format_team(home),
            "awayTeam": cls._format_team(away),
            "status": cls._parse_status(event.get("status")),
            "startTime": event.get("date", ""),
            "endTime": event.get("endDate"),
            "network": (competition.get("broadcasts") or [{}])[0].get("names", [""])[0]
            or "TBD",
            "homeScore": int(home["score"]) if home.get("score") else None,
            "awayScore": int(away["score"]) if away.get("score") else None,
            "venue": (competition.get("venue") or {}).get("fullName"),
            "venueCity": (competition.get("venue") or {})
            .get("address", {})
            .get("city"),
            "venueState": (competition.get("venue") or {})
            .get("address", {})
            .get("state"),
            "quarter": cls._parse_quarter(event.get("status")),
            "timeRemaining": cls._parse_time_remaining(competition.get("status")),
            "statusDetail": cls._parse_status_detail(event.get("status")),
            "odds": cls._parse_odds(competition.get("odds")),
            "predictor": cls._parse_predictor(competition.get("predictor")),
        }

    @classmethod
    def _format_team(cls, competitor: dict) -> dict:
        """Format a competitor into a team dict."""
        team = competitor.get("team", {})
        records = competitor.get("records", [])
        rank = competitor.get("curatedRank", {}).get("current")

        conf_id = str(team.get("conferenceId", ""))

        return {
            "id": team.get("id"),
            "name": team.get("displayName", "TBD"),
            "abbreviation": team.get("abbreviation", "TBD"),
            "logo": team.get("logo"),
            # ESPN provides team color as a hex string without '#' (e.g. "003087")
            "color": team.get("color"),
            "record": records[0].get("summary") if records else None,
            "conferenceRecord": cls._parse_conference_record(records),
            "conference": CONFERENCE_SHORT_NAMES.get(conf_id),
            "rank": rank if rank is not None and rank < 99 else None,
        }

    @classmethod
    def _parse_status(cls, status: dict | None) -> str:
        """Parse ESPN status into normalized status string."""
        if not status:
            return "scheduled"
        state = (status.get("type", {}).get("state") or "").lower()
        status_map = {"in": "in_progress", "post": "completed", "pre": "scheduled"}
        return status_map.get(state, "scheduled")

    @classmethod
    def _parse_quarter(cls, status: dict | None) -> str | None:
        """Parse current quarter/period from status."""
        if not status:
            return None
        state = status.get("type", {}).get("state", "")
        period = status.get("period")
        if state == "in" and period:
            period_map = {1: "Q1", 2: "Q2", 3: "Q3", 4: "Q4", 5: "OT"}
            return period_map.get(period, f"Period {period}")
        return None

    @classmethod
    def _parse_time_remaining(cls, status: dict | None) -> str | None:
        """Parse display clock from competition status."""
        if not status:
            return None
        display_clock = status.get("displayClock")
        return display_clock if display_clock else None

    @classmethod
    def _parse_status_detail(cls, status: dict | None) -> str | None:
        """Parse short status detail from ESPN (e.g. 'Halftime', 'Q2 - 5:42', 'Top 5th')."""
        if not status:
            return None
        state = (status.get("type", {}).get("state") or "").lower()
        if state in ("in", "post"):
            return status.get("type", {}).get("shortDetail")
        return None

    @classmethod
    def _parse_conference_record(cls, records: list) -> str | None:
        """Parse conference record from records list."""
        if not records or len(records) < 2:
            return None
        conf_record = next(
            (
                r
                for r in records
                if r.get("name") == "vsConf" or r.get("type") == "vsconf"
            ),
            None,
        )
        if conf_record and conf_record.get("summary"):
            return conf_record["summary"]
        return records[1].get("summary") if len(records) > 1 else None

    @classmethod
    def _parse_predictor(cls, predictor: dict | None) -> dict | None:
        """Parse predictor data from competition.

        Note: ESPN's scoreboard endpoint rarely includes predictor data.
        The summary endpoint is the primary source for win projections
        (see ``GameService._parse_predictor``).
        """
        if not predictor:
            return None
        home = predictor.get("homeTeam", {})
        away = predictor.get("awayTeam", {})
        if not home and not away:
            return None
        return {
            "homeTeam": {
                "id": home.get("id"),
                "gameProjection": float(home["gameProjection"])
                if home.get("gameProjection") is not None
                else None,
                "teamChanceLoss": float(home["teamChanceLoss"])
                if home.get("teamChanceLoss") is not None
                else None,
            },
            "awayTeam": {
                "id": away.get("id"),
                "gameProjection": float(away["gameProjection"])
                if away.get("gameProjection") is not None
                else None,
                "teamChanceLoss": float(away["teamChanceLoss"])
                if away.get("teamChanceLoss") is not None
                else None,
            },
        }

    @classmethod
    def _parse_odds(cls, odds: list | None) -> dict | None:
        """Parse odds from competition odds list."""
        if not odds:
            return None
        primary = odds[0] if odds else {}
        spread = primary.get("spread")
        over_under = primary.get("overUnder")
        if spread is None and over_under is None:
            return None
        return {
            "spread": float(spread) if spread is not None else None,
            "overUnder": float(over_under) if over_under is not None else None,
        }
