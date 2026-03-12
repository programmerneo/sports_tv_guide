"""
Golf-specific service layer.

Formats ESPN golf data into structures compatible with the frontend
schedule and leaderboard views.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from constants.espn import SCOREBOARD_URLS, SUMMARY_URLS
from utils.client import get_client

logger = logging.getLogger(__name__)

LEADERBOARD_LIMIT = 30
CORE_API_BASE = "https://sports.core.api.espn.com/v2/sports"


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

        Tries the ESPN summary endpoint first. If it fails (ESPN
        intermittently returns 502 for golf summaries), falls back to
        the core competitors API.

        Args:
            event_id: ESPN event ID.

        Returns:
            Dict with tournament info and ``leaderboard`` list.
        """
        client = get_client()

        # Fetch tournament details (course, purse, champion) in parallel
        # with the leaderboard data
        details_task = cls._fetch_tournament_details(event_id)

        # Primary: summary endpoint
        url = SUMMARY_URLS["golf-pga"]
        resp = await client.get(url, params={"event": event_id})

        details = await details_task

        if resp.status_code == 200:
            result = cls._format_leaderboard(resp.json())
            result.update(details)
            return result

        logger.warning(
            "Golf summary endpoint returned %s for event %s, using core API fallback",
            resp.status_code,
            event_id,
        )

        result = await cls._fetch_leaderboard_from_core_api(event_id)
        result.update(details)
        return result

    @classmethod
    async def _fetch_tournament_details(cls, event_id: str) -> dict:
        """Fetch tournament metadata (course, purse, defending champion) from ESPN core API.

        Args:
            event_id: ESPN event ID.

        Returns:
            Dict with course info, purse, and defending champion fields.
        """
        url = f"{CORE_API_BASE}/golf/leagues/pga/events/{event_id}"
        client = get_client()
        try:
            resp = await client.get(url)
            if resp.status_code != 200:
                logger.warning(
                    "Core API returned %s for event %s", resp.status_code, event_id
                )
                return {}
            data = resp.json()
        except Exception:
            logger.warning(
                "Failed to fetch tournament details for event %s",
                event_id,
                exc_info=True,
            )
            return {}

        result: dict = {}

        # Course info
        courses = data.get("courses", [])
        if courses:
            course = courses[0]
            result["courseName"] = course.get("name", "")
            result["coursePar"] = course.get("shotsToPar")
            result["courseYards"] = course.get("totalYards")
            address = course.get("address", {})
            result["courseCity"] = address.get("city", "")
            result["courseState"] = address.get("state", "")

        # Purse
        result["displayPurse"] = data.get("displayPurse", "")

        # Defending champion
        champ = data.get("defendingChampion", {}).get("athlete", {})
        if champ:
            result["previousWinner"] = champ.get("displayName", "")

        return result

    @classmethod
    async def _fetch_leaderboard_from_core_api(cls, event_id: str) -> dict:
        """Fallback: build leaderboard from ESPN's core competitors API.

        The core API returns ``$ref`` links per competitor that must be
        followed individually.  We fetch athlete, status, and score refs
        in parallel for each of the top 30 competitors.

        Args:
            event_id: ESPN event ID.

        Returns:
            Dict with tournament info and ``leaderboard`` list.
        """
        base = "https://sports.core.api.espn.com/v2/sports"
        comp_url = (
            f"{base}/golf/leagues/pga/events/{event_id}"
            f"/competitions/{event_id}/competitors"
        )

        client = get_client()
        resp = await client.get(comp_url, params={"limit": LEADERBOARD_LIMIT})
        resp.raise_for_status()
        items = resp.json().get("items", [])

        # Fetch event name from the scoreboard
        sb_url = f"{SCOREBOARD_URLS['golf-pga']}/{event_id}"
        sb_resp = await client.get(sb_url)
        event_name = ""
        status_detail = ""
        if sb_resp.status_code == 200:
            sb_data = sb_resp.json()
            event_name = sb_data.get("name", "")
            sb_status = sb_data.get("status", {}).get("type", {})
            status_detail = sb_status.get("shortDetail", "")

        async def fetch_competitor(item: dict) -> dict | None:
            """Fetch athlete, status, score, and linescores for a competitor."""
            refs = {}
            for key in ("athlete", "status", "score", "linescores"):
                ref = item.get(key, {})
                if isinstance(ref, dict) and "$ref" in ref:
                    refs[key] = ref["$ref"]

            if not refs:
                return None

            results = {}
            tasks = {key: client.get(url) for key, url in refs.items()}
            responses = await asyncio.gather(*tasks.values(), return_exceptions=True)

            for key, response in zip(tasks.keys(), responses):
                if isinstance(response, Exception):
                    logger.warning("Failed to fetch %s ref: %s", key, response)
                    results[key] = {}
                elif response.status_code == 200:
                    results[key] = response.json()
                else:
                    results[key] = {}

            athlete = results.get("athlete", {})
            status = results.get("status", {})
            score = results.get("score", {})
            linescores_data = results.get("linescores", {})

            position = status.get("position", {})
            thru = status.get("thru")
            hole = status.get("hole")
            state = status.get("type", {}).get("state", "")

            if state == "post":
                thru_display = "F"
            elif thru is not None:
                thru_display = str(thru)
            elif hole is not None:
                thru_display = str(hole)
            else:
                thru_display = "-"

            # Parse round scores from linescores
            rounds = []
            total_strokes = 0
            has_completed_round = False
            for ls in linescores_data.get("items", []):
                value = ls.get("value")
                display = ls.get("displayValue")
                if value is not None and display is not None:
                    rounds.append(str(int(value)))
                    total_strokes += int(value)
                    has_completed_round = True

            return {
                "position": position.get("displayName", str(item.get("order", ""))),
                "name": athlete.get("displayName", "Unknown"),
                "country": athlete.get("flag", {}).get("alt", ""),
                "countryFlag": athlete.get("flag", {}).get("href", ""),
                "totalScore": score.get("displayValue", "E"),
                "totalStrokes": total_strokes if has_completed_round else None,
                "toPar": score.get("displayValue", "E"),
                "today": status.get("displayValue", ""),
                "thru": thru_display,
                "rounds": rounds,
            }

        entries = await asyncio.gather(*(fetch_competitor(item) for item in items))
        leaderboard = [e for e in entries if e is not None]

        return {
            "tournamentName": event_name,
            "statusDetail": status_detail,
            "leaderboard": leaderboard,
        }

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

        # ESPN golf dates are midnight placeholders (e.g. 2026-03-12T04:00Z).
        # For in-progress tournaments, use the current time so they appear in
        # the correct TV guide time slot instead of showing as 11 PM / midnight.
        start_time = event.get("date", "")
        if status == "in_progress":
            start_time = datetime.now(timezone.utc).isoformat()

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
            "startTime": start_time,
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

            # Parse linescores for round scores and total strokes
            rounds = []
            total_strokes = 0
            has_completed_round = False
            for ls in entry.get("linescores", []):
                value = ls.get("value")
                display = ls.get("displayValue") or (
                    str(int(value)) if value is not None else None
                )
                if display is not None:
                    rounds.append(str(display))
                if value is not None:
                    total_strokes += int(value)
                    has_completed_round = True

            leaderboard.append(
                {
                    "position": entry.get("status", {})
                    .get("position", {})
                    .get("displayName")
                    or entry.get("sortOrder", ""),
                    "name": athlete.get("displayName", "Unknown"),
                    "country": athlete.get("flag", {}).get("alt", ""),
                    "countryFlag": athlete.get("flag", {}).get("href", ""),
                    "totalScore": entry.get("score", {}).get("displayValue", "E"),
                    "totalStrokes": total_strokes if has_completed_round else None,
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
