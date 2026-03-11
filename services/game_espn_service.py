"""
Fetch game summary data from ESPN's public API.

Returns boxscore, play-by-play, win probability, leaders, and game info
all in one response.
"""

from __future__ import annotations

from constants.espn import SUMMARY_URLS
from utils.client import get_client


class GameService:
    """Service for fetching game summary data from ESPN."""

    @classmethod
    async def fetch_game_summary(cls, sport: str, event_id: str) -> dict:
        """Fetch complete game summary for an ESPN event.

        Args:
            sport: ``'basketball-college'``, ``'football-college'``, or ``'football-nfl'``.
            event_id: ESPN event ID (obtained from scoreboard response).

        Returns:
            ESPN summary response with boxscore, plays, leaders, etc.

        Raises:
            ValueError: If the sport is not supported.
        """
        url = SUMMARY_URLS.get(sport)
        if url is None:
            raise ValueError(
                f"Unsupported sport: {sport!r}. Expected one of {list(SUMMARY_URLS)}"
            )

        client = get_client()
        resp = await client.get(url, params={"event": event_id})
        resp.raise_for_status()
        return resp.json()

    @classmethod
    async def fetch_and_format(cls, sport: str, event_id: str) -> dict:
        """Fetch game summary and format into GameSummary dict."""
        raw = await cls.fetch_game_summary(sport, event_id)
        return cls._format_summary(raw, sport)

    @classmethod
    def _format_summary(cls, data: dict, sport: str) -> dict:
        """Format ESPN summary into GameSummary dict."""
        header = data.get("header", {})
        competitions = header.get("competitions", [{}])
        competition = competitions[0] if competitions else {}
        competitors = competition.get("competitors", [])

        home = next((c for c in competitors if c.get("homeAway") == "home"), {})
        away = next((c for c in competitors if c.get("homeAway") == "away"), {})

        home_team_info = home.get("team", {})
        away_team_info = away.get("team", {})

        # Build conference lookup from standings.groups in the response
        conf_names = cls._build_conference_lookup(data)

        # Get status from header
        status_obj = competition.get("status", {})
        state = (status_obj.get("type", {}).get("state") or "").lower()
        status_map = {"in": "in_progress", "post": "completed", "pre": "scheduled"}
        status = status_map.get(state, "scheduled")

        # Quarter/period
        quarter = None
        period = status_obj.get("period")
        if state == "in" and period:
            period_map = {1: "Q1", 2: "Q2", 3: "Q3", 4: "Q4", 5: "OT"}
            quarter = period_map.get(period, f"Period {period}")

        # Get event ID from header
        event_id = header.get("id", "")

        # Broadcasts
        broadcasts = competition.get("broadcasts", [])
        network = "TBD"
        if broadcasts:
            names = broadcasts[0].get("names", [])
            network = names[0] if names else "TBD"

        # Venue
        venue_info = data.get("gameInfo", {}).get("venue", {})
        venue = venue_info.get("fullName")
        venue_address = venue_info.get("address", {})
        venue_city = venue_address.get("city")
        venue_state = venue_address.get("state")

        # Odds
        odds_data = data.get("pickcenter", [])
        odds = None
        if odds_data:
            primary = odds_data[0]
            spread = primary.get("spread")
            over_under = primary.get("overUnder")
            if spread is not None or over_under is not None:
                odds = {
                    "spread": float(spread) if spread is not None else None,
                    "overUnder": float(over_under) if over_under is not None else None,
                }

        # Predictor — ESPN uses "predictor" for scheduled games and
        # "winprobability" (play-by-play array) for live/completed games.
        predictor = cls._parse_predictor(data, home_team_info, away_team_info)

        # Build home/away rank from records
        home_rank = home.get("rank")
        away_rank = away.get("rank")

        return {
            "id": event_id,
            "eventId": event_id,
            "sport": sport,
            "homeTeam": {
                "id": home_team_info.get("id"),
                "name": home_team_info.get("displayName", "Home"),
                "abbreviation": home_team_info.get("abbreviation", "HM"),
                "logo": home_team_info.get("logo"),
                "color": home_team_info.get("color"),
                "record": home.get("record", [{}])[0].get("displayValue")
                if isinstance(home.get("record"), list)
                else None,
                "conferenceRecord": None,
                "conference": conf_names.get(
                    str(home_team_info.get("groups", {}).get("id", ""))
                ),
                "rank": home_rank if home_rank and home_rank < 99 else None,
            },
            "awayTeam": {
                "id": away_team_info.get("id"),
                "name": away_team_info.get("displayName", "Away"),
                "abbreviation": away_team_info.get("abbreviation", "AW"),
                "logo": away_team_info.get("logo"),
                "color": away_team_info.get("color"),
                "record": away.get("record", [{}])[0].get("displayValue")
                if isinstance(away.get("record"), list)
                else None,
                "conferenceRecord": None,
                "conference": conf_names.get(
                    str(away_team_info.get("groups", {}).get("id", ""))
                ),
                "rank": away_rank if away_rank and away_rank < 99 else None,
            },
            "status": status,
            "startTime": competition.get("date", ""),
            "endTime": None,
            "network": network,
            "homeScore": int(home.get("score", 0)) if home.get("score") else None,
            "awayScore": int(away.get("score", 0)) if away.get("score") else None,
            "venue": venue,
            "venueCity": venue_city,
            "venueState": venue_state,
            "quarter": quarter,
            "timeRemaining": status_obj.get("displayClock"),
            "statusDetail": status_obj.get("type", {}).get("shortDetail")
            if state in ("in", "post")
            else None,
            "odds": odds,
            "predictor": predictor,
            "boxScore": cls._parse_boxscore(data.get("boxscore")),
            "plays": data.get("plays"),
            "leaders": data.get("leaders"),
        }

    @classmethod
    def _parse_predictor(
        cls, data: dict, home_team_info: dict, away_team_info: dict
    ) -> dict | None:
        """Parse predictor from ESPN summary.

        ESPN uses two different structures depending on game state:

        - **Scheduled**: ``predictor`` object with ``homeTeam.gameProjection``
          and ``awayTeam.gameProjection`` as percentage strings (e.g. ``"76.4"``).
        - **Live / Completed**: ``winprobability`` array of play-by-play entries,
          each with ``homeWinPercentage`` as a 0–1 decimal (e.g. ``0.723``).
          The last entry represents the current / final win probability.

        This method normalises both into a single format with percentage values
        (0–100) so the frontend can render a consistent predictor bar.

        Args:
            data: Full ESPN summary response dict.
            home_team_info: Home team dict from ``header.competitions[].competitors[].team``.
            away_team_info: Away team dict from ``header.competitions[].competitors[].team``.

        Returns:
            Predictor dict with ``homeTeam`` and ``awayTeam`` sub-dicts
            containing ``gameProjection`` and ``teamChanceLoss``, or ``None``
            if neither source is available.
        """
        predictor_data = data.get("predictor")
        if predictor_data:
            pred_home = predictor_data.get("homeTeam", {})
            pred_away = predictor_data.get("awayTeam", {})
            if pred_home or pred_away:
                return {
                    "homeTeam": {
                        "id": pred_home.get("id"),
                        "gameProjection": float(pred_home["gameProjection"])
                        if pred_home.get("gameProjection") is not None
                        else None,
                        "teamChanceLoss": float(pred_home["teamChanceLoss"])
                        if pred_home.get("teamChanceLoss") is not None
                        else None,
                    },
                    "awayTeam": {
                        "id": pred_away.get("id"),
                        "gameProjection": float(pred_away["gameProjection"])
                        if pred_away.get("gameProjection") is not None
                        else None,
                        "teamChanceLoss": float(pred_away["teamChanceLoss"])
                        if pred_away.get("teamChanceLoss") is not None
                        else None,
                    },
                }

        # Fallback: derive from winprobability (live / completed games).
        # ESPN returns an array of {homeWinPercentage, tiePercentage, playId}
        # entries — one per play.  The last entry is the most recent.
        win_prob = data.get("winprobability")
        if win_prob:
            last = win_prob[-1]
            home_pct = last.get("homeWinPercentage")
            if home_pct is not None:
                # Convert 0–1 decimal to 0–100 percentage
                home_proj = round(home_pct * 100, 1)
                away_proj = round((1 - home_pct) * 100, 1)
                return {
                    "homeTeam": {
                        "id": home_team_info.get("id"),
                        "gameProjection": home_proj,
                        "teamChanceLoss": away_proj,
                    },
                    "awayTeam": {
                        "id": away_team_info.get("id"),
                        "gameProjection": away_proj,
                        "teamChanceLoss": home_proj,
                    },
                }

        return None

    @classmethod
    def _build_conference_lookup(cls, data: dict) -> dict[str, str]:
        """Build conference ID → short name map from standings.groups."""
        conf_names: dict[str, str] = {}
        for group in data.get("standings", {}).get("groups", []):
            href = group.get("href", "")
            short = group.get("shortDivisionHeader")
            if "/group/" in href and short:
                group_id = href.split("/group/")[-1]
                conf_names[group_id] = short
        return conf_names

    # Key batting stats to display for baseball box scores (in order).
    _MLB_BATTING_STATS = [
        "runs",
        "hits",
        "homeRuns",
        "RBIs",
        "walks",
        "strikeouts",
        "stolenBases",
        "avg",
    ]
    # Key pitching stats to display for baseball box scores (in order).
    _MLB_PITCHING_STATS = [
        "ERA",
        "innings",
        "strikeouts",
        "walks",
        "hits",
        "earnedRuns",
    ]
    # Key fielding stats.
    _MLB_FIELDING_STATS = ["errors"]

    @classmethod
    def _parse_boxscore(cls, boxscore: dict | None) -> dict | None:
        """Parse ESPN boxscore into {homeTeamStats, awayTeamStats}.

        ESPN returns ``boxscore.teams[]`` where each team entry has a
        ``statistics`` array.  The structure varies by sport:

        - **Basketball / Football / Hockey**: flat list of
          ``{name, displayValue, label}`` objects.
        - **Baseball**: category objects (``batting``, ``pitching``,
          ``fielding``) each containing a ``stats`` sub-array of
          ``{name, displayValue, abbreviation}`` objects.

        This method normalises both into a generic ``[{label, displayValue}]``
        format the frontend can render for any sport.

        Args:
            boxscore: Raw ESPN boxscore dict, or None.

        Returns:
            Parsed boxscore with ``homeTeamStats`` and ``awayTeamStats``,
            or None if data is missing.
        """
        if not boxscore:
            return None

        teams = boxscore.get("teams", [])
        if not teams:
            return None

        result = {}
        for entry in teams:
            home_away = entry.get("homeAway", "")
            team_info = entry.get("team", {})
            stats_list = entry.get("statistics", [])

            # Detect baseball: categories have a nested "stats" sub-array
            # instead of a direct "displayValue" on each entry.
            is_baseball = any(s.get("stats") for s in stats_list)

            if is_baseball:
                statistics = cls._parse_baseball_stats(stats_list)
            else:
                statistics = [
                    {
                        "label": s.get("label", s.get("name", "")),
                        "displayValue": s.get("displayValue", ""),
                    }
                    for s in stats_list
                    if s.get("displayValue")
                ]

            team_stats = {
                "teamId": team_info.get("id", ""),
                "teamName": team_info.get("displayName", ""),
                "statistics": statistics,
            }

            key = "homeTeamStats" if home_away == "home" else "awayTeamStats"
            result[key] = team_stats

        if "homeTeamStats" not in result or "awayTeamStats" not in result:
            return None

        return result

    @classmethod
    def _parse_baseball_stats(cls, stats_list: list[dict]) -> list[dict]:
        """Extract key stats from baseball's nested category structure.

        Baseball stats are grouped into categories (batting, pitching,
        fielding) each with a ``stats`` sub-array.  This method picks
        the most relevant stats and flattens them into label/value pairs.
        """
        categories: dict[str, dict[str, str]] = {}
        for cat in stats_list:
            cat_name = cat.get("name", "")
            cat_stats = cat.get("stats", [])
            categories[cat_name] = {
                s["name"]: s.get("displayValue", "") for s in cat_stats if "name" in s
            }

        # Map of category → stat names to display, with abbreviation labels.
        display_map = [
            ("batting", cls._MLB_BATTING_STATS),
            ("pitching", cls._MLB_PITCHING_STATS),
            ("fielding", cls._MLB_FIELDING_STATS),
        ]

        result: list[dict] = []
        for cat_name, stat_names in display_map:
            cat_data = categories.get(cat_name, {})
            for stat_name in stat_names:
                value = cat_data.get(stat_name)
                if value is not None:
                    # Use abbreviation-style labels for display
                    label = cls._baseball_label(cat_name, stat_name)
                    result.append({"label": label, "displayValue": str(value)})

        return result

    @staticmethod
    def _baseball_label(category: str, stat_name: str) -> str:
        """Human-friendly label for a baseball stat."""
        labels = {
            "runs": "R",
            "hits": "H",
            "homeRuns": "HR",
            "RBIs": "RBI",
            "walks": "BB",
            "strikeouts": "K",
            "stolenBases": "SB",
            "avg": "AVG",
            "ERA": "ERA",
            "innings": "IP",
            "earnedRuns": "ER",
            "errors": "E",
        }
        label = labels.get(stat_name, stat_name)
        # Disambiguate shared stat names between batting/pitching
        if stat_name in ("hits", "walks", "strikeouts") and category == "pitching":
            label = f"{label} (P)"
        return label
