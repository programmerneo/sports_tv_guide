"""
Golf-specific service layer.

Formats ESPN golf data into structures compatible with the frontend
schedule and leaderboard views.
"""

from __future__ import annotations

from datetime import datetime, timezone

from constants.espn import SCOREBOARD_URLS, SUMMARY_URLS
from utils.client import get_client

LEADERBOARD_LIMIT = 30


class GolfService:
    """Service for golf-specific data formatting."""

    @classmethod
    async def fetch_schedule(cls, date: str | None = None) -> dict:
        """Fetch PGA golf tournaments and format as schedule games.

        Args:
            date: Year (YYYY) or date (YYYYMMDD) for filtering.

        Returns:
            Dict with ``games`` list of tournament entries.
        """
        url = SCOREBOARD_URLS["golf-pga"]
        params: dict[str, str | int] = {"limit": 100}
        if date:
            params["dates"] = date

        client = get_client()
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

        events = data.get("events", [])
        games = []
        for event in events:
            game = cls._format_tournament_as_game(event)
            if game:
                games.append(game)

        return {"games": games}

    @classmethod
    async def fetch_leaderboard(cls, event_id: str) -> dict:
        """Fetch golf tournament leaderboard (top 30).

        Args:
            event_id: ESPN event ID.

        Returns:
            Dict with tournament info and ``leaderboard`` list.
        """
        url = SUMMARY_URLS["golf-pga"]
        client = get_client()
        resp = await client.get(url, params={"event": event_id})
        resp.raise_for_status()
        data = resp.json()

        return cls._format_leaderboard(data)

    @classmethod
    def _format_tournament_as_game(cls, event: dict) -> dict | None:
        """Format an ESPN golf event into a Game-compatible dict.

        Golf tournaments don't have home/away teams, so we represent
        the tournament name as the 'homeTeam' and the course as 'awayTeam'.
        """
        status_obj = event.get("status", {})
        state = (status_obj.get("type", {}).get("state") or "").lower()
        status_map = {"in": "in_progress", "post": "completed", "pre": "scheduled"}
        status = status_map.get(state, "scheduled")

        # Only return active or upcoming tournaments
        # Skip completed tournaments unless they finished today
        if status == "completed":
            end_date_str = event.get("endDate")
            if end_date_str:
                try:
                    end_date = datetime.fromisoformat(
                        end_date_str.replace("Z", "+00:00")
                    )
                    today = datetime.now(timezone.utc).date()
                    if end_date.date() < today:
                        return None
                except (ValueError, TypeError):
                    return None

        competition = (event.get("competitions") or [{}])[0]

        # Get broadcast info
        broadcasts = competition.get("broadcasts") or event.get("broadcasts", [])
        network = "TBD"
        if broadcasts:
            first = broadcasts[0]
            if isinstance(first, dict):
                names = first.get("names") or first.get("market", {}).get("names", [])
                if isinstance(names, list) and names:
                    network = names[0]
                elif isinstance(names, str):
                    network = names

        # Get venue/course info
        venue = competition.get("venue") or event.get("venue") or {}
        venue_name = venue.get("fullName", "")
        venue_city = venue.get("address", {}).get("city")
        venue_state = venue.get("address", {}).get("state")

        # Course info from the event or competitions
        courses = event.get("courses", [])
        course_name = courses[0].get("name", "") if courses else ""

        event_name = event.get("name", "PGA Tournament")
        short_name = event.get("shortName", event_name)
        event_logo = (
            (event.get("logos") or [{}])[0].get("href") if event.get("logos") else None
        )

        status_detail = status_obj.get("type", {}).get("shortDetail")

        return {
            "id": event.get("id", ""),
            "eventId": event.get("id", ""),
            "sport": "golf-pga",
            "homeTeam": {
                "id": event.get("id", ""),
                "name": event_name,
                "abbreviation": short_name[:6] if short_name else "PGA",
                "logo": event_logo,
                "record": None,
                "conferenceRecord": None,
                "conference": None,
                "rank": None,
            },
            "awayTeam": {
                "id": "",
                "name": course_name or venue_name,
                "abbreviation": "COURSE",
                "logo": None,
                "record": None,
                "conferenceRecord": None,
                "conference": None,
                "rank": None,
            },
            "status": status,
            "startTime": event.get("date", ""),
            "endTime": event.get("endDate"),
            "network": network,
            "homeScore": None,
            "awayScore": None,
            "venue": venue_name or course_name,
            "venueCity": venue_city,
            "venueState": venue_state,
            "quarter": None,
            "timeRemaining": None,
            "statusDetail": status_detail,
            "odds": None,
            "predictor": None,
        }

    @classmethod
    def _format_leaderboard(cls, data: dict) -> dict:
        """Format ESPN golf summary into a leaderboard response.

        Args:
            data: Raw ESPN summary response.

        Returns:
            Dict with tournament info and top-30 leaderboard entries.
        """
        event = data.get("header", {})
        event_name = event.get("competitions", [{}])[0].get(
            "name", event.get("name", "")
        )

        # Status info
        status_obj = (event.get("competitions") or [{}])[0].get("status", {})
        status_detail = status_obj.get("type", {}).get("shortDetail", "")

        # Extract leaderboard from competitors
        competitors = data.get("leaderboard", {}).get("competitors", [])
        if not competitors:
            # Fallback: try events[0].competitions[0].competitors
            competitions = data.get("events", [{}])[0].get("competitions", [{}])
            if competitions:
                competitors = competitions[0].get("competitors", [])

        leaderboard = []
        for entry in competitors[:LEADERBOARD_LIMIT]:
            athlete = entry.get("athlete", {})
            stats = entry.get("statistics", [])

            # Parse linescores for round scores
            rounds = []
            for ls in entry.get("linescores", []):
                value = ls.get("displayValue") or ls.get("value")
                if value is not None:
                    rounds.append(str(value))

            leaderboard.append(
                {
                    "position": entry.get("status", {})
                    .get("position", {})
                    .get("displayName")
                    or entry.get("sortOrder", ""),
                    "name": athlete.get("displayName", "Unknown"),
                    "country": athlete.get("flag", {}).get("alt", ""),
                    "totalScore": entry.get("score", {}).get("displayValue", "E"),
                    "toPar": entry.get("statistics", [{}])[0].get("displayValue", "E")
                    if stats
                    else "E",
                    "today": entry.get("status", {}).get("displayValue", ""),
                    "thru": entry.get("status", {}).get("detail", ""),
                    "rounds": rounds,
                }
            )

        return {
            "tournamentName": event_name,
            "statusDetail": status_detail,
            "leaderboard": leaderboard,
        }
