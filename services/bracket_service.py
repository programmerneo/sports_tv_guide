"""
Parse and format NCAA tournament bracket data.

Moves all bracket data transformation from the frontend into the backend,
following the same service pattern as GameService and GolfService.
"""

from __future__ import annotations

import html
import re

FIRST_FOUR_CODE = "TT"
FINAL_FOUR_CODE = "CC"


class BracketService:
    """Service for parsing NCAA tournament bracket data."""

    @classmethod
    def format_bracket(cls, raw: dict) -> dict:
        """Parse raw NCAA bracket data into a structured response.

        Args:
            raw: Raw NCAA GraphQL response (the ``data`` key).

        Returns:
            Dict matching ``BracketResponseSchema`` with pre-built tabs,
            rounds, and game data ready for the frontend.
        """
        championships = raw.get("championships", [])
        if not championships:
            return {"title": "", "year": 0, "tabs": []}

        champ = championships[0]
        games = champ.get("games", [])
        rounds = champ.get("rounds", [])
        regions = champ.get("regions", [])

        # Build lookup structures
        enabled_sections = cls._enabled_sections(games)
        live_counts = cls._live_counts(games)

        # Build tabs with pre-parsed rounds
        tabs = []
        for region in regions:
            section_id = region["sectionId"]
            region_code = region.get("regionCode", "")
            label = cls._region_label(region, region_code, rounds)

            # Build round columns for this tab
            if region_code == FINAL_FOUR_CODE:
                round_columns = cls._build_final_four_rounds(
                    games, section_id, rounds)
            elif region_code == FIRST_FOUR_CODE:
                round_columns = cls._build_first_four_rounds(games, section_id)
            else:
                round_columns = cls._build_region_rounds(
                    games, section_id, rounds)

            tabs.append(
                {
                    "sectionId": section_id,
                    "label": label,
                    "regionCode": region_code,
                    "isEnabled": section_id in enabled_sections,
                    "liveCount": live_counts.get(section_id, 0),
                    "rounds": round_columns,
                }
            )

        # Auto-select default tab: live game tab first, then last enabled
        default_tab = cls._pick_default_tab(tabs, games)

        return {
            "title": champ.get("title", ""),
            "year": champ.get("year", 0),
            "championshipInfo": cls._championship_info(champ, games, rounds),
            "defaultTabSectionId": default_tab,
            "tabs": tabs,
        }

    # --- Private helpers ---

    @classmethod
    def _clean_title(cls, raw: str) -> str:
        """Strip HTML entities and whitespace from API title strings."""
        cleaned = html.unescape(raw or "")
        cleaned = re.sub(r"&#\d+;", "", cleaned)
        return cleaned.strip()

    @classmethod
    def _region_label(cls, region: dict, region_code: str, rounds: list[dict]) -> str:
        """Derive a tab label for a region."""
        label = cls._clean_title(region.get("title", ""))
        if not label and region_code == FIRST_FOUR_CODE:
            return "Play-in Games"
        if not label and region_code == FINAL_FOUR_CODE:
            ff = next((r for r in rounds if r.get("roundNumber") == 6), None)
            return cls._clean_title(ff["title"]) if ff else "Final Four"
        return label or cls._clean_title(region.get("abbreviation", ""))

    @classmethod
    def _enabled_sections(cls, games: list[dict]) -> set[int]:
        """Return sectionIds that have at least one finished, live, or scheduled game with real teams."""
        enabled: set[int] = set()
        for game in games:
            game_state = game.get("gameState", "")

            # Enable for finished or live games
            if game_state in ("F", "I"):
                enabled.add(game["sectionId"])
            # Enable for scheduled games that have real teams (not TBD)
            elif game_state == "P":
                teams = game.get("teams", [])
                if teams and any(team.get("nameShort") not in ("", "TBD") for team in teams):
                    enabled.add(game["sectionId"])
        return enabled

    @classmethod
    def _live_counts(cls, games: list[dict]) -> dict[int, int]:
        """Count live games per sectionId."""
        counts: dict[int, int] = {}
        for game in games:
            if game.get("gameState") == "I":
                sid = game["sectionId"]
                counts[sid] = counts.get(sid, 0) + 1
        return counts

    @classmethod
    def _format_game(cls, game: dict) -> dict:
        """Format a single bracket game for the response."""
        teams = []
        for t in game.get("teams", []):
            if not t.get("isVisible", True):
                continue
            teams.append(
                {
                    "isHome": t.get("isHome", False),
                    "isTop": t.get("isTop", False),
                    "isWinner": t.get("isWinner", False),
                    "logoUrl": t.get("logoUrl", ""),
                    "score": t.get("score"),
                    "seed": t.get("seed"),
                    "nameShort": t.get("nameShort", ""),
                    "nameFull": t.get("nameFull", ""),
                }
            )

        broadcaster = None
        raw_broadcaster = game.get("broadcaster")
        if raw_broadcaster and raw_broadcaster.get("name"):
            broadcaster = {"name": raw_broadcaster["name"]}

        return {
            "contestId": game.get("contestId", 0),
            "bracketPositionId": game.get("bracketPositionId", 0),
            "gameState": game.get("gameState", ""),
            "contestClock": game.get("contestClock", ""),
            "currentPeriod": game.get("currentPeriod", ""),
            "hasStartTime": game.get("hasStartTime", False),
            "startTime": game.get("startTime", ""),
            "startTimeEpoch": game.get("startTimeEpoch", 0),
            "teams": teams,
            "broadcaster": broadcaster,
        }

    @classmethod
    def _round_info(cls, rounds: list[dict]) -> list[dict]:
        """Get round labels and subtitles for region columns (rounds 2-5)."""
        region_rounds = sorted(
            [r for r in rounds if 2 <= r.get("roundNumber", 0) <= 5],
            key=lambda r: r["roundNumber"],
        )
        return [
            {
                "label": cls._clean_title(r.get("title", "")),
                "subtitle": r.get("subtitle", ""),
            }
            for r in region_rounds
        ]

    @classmethod
    def _build_region_rounds(
        cls, games: list[dict], section_id: int, rounds: list[dict]
    ) -> list[dict]:
        """Build round columns for a standard region bracket.

        Finds first-round games (bracketPositionId 2xx) for the section,
        then walks the victorBracketPositionId chain to build subsequent rounds.
        """
        by_bracket: dict[int, dict] = {}
        for g in games:
            by_bracket[g["bracketPositionId"]] = g

        # First round: games in this section with bracketPositionId in the 200s
        first_round = sorted(
            [
                g
                for g in games
                if g["sectionId"] == section_id and 200 <= g["bracketPositionId"] < 300
            ],
            key=lambda g: g["bracketPositionId"],
        )
        if not first_round:
            return []

        round_info = cls._round_info(rounds)
        game_rounds = [first_round]

        # Walk the tree via victorBracketPositionId
        current_round = first_round
        while len(current_round) > 1:
            next_ids: set[int] = set()
            for g in current_round:
                vid = g.get("victorBracketPositionId")
                if vid is not None:
                    next_ids.add(vid)
            next_round = sorted(
                [by_bracket[nid] for nid in next_ids if nid in by_bracket],
                key=lambda g: g["bracketPositionId"],
            )
            if not next_round:
                break
            game_rounds.append(next_round)
            current_round = next_round

        result = []
        for idx, round_games in enumerate(game_rounds):
            info = round_info[idx] if idx < len(round_info) else {}
            result.append(
                {
                    "label": info.get("label", f"Round {idx + 1}"),
                    "subtitle": info.get("subtitle", ""),
                    "games": [cls._format_game(g) for g in round_games],
                }
            )
        return result

    @classmethod
    def _build_final_four_rounds(
        cls, games: list[dict], section_id: int, rounds: list[dict]
    ) -> list[dict]:
        """Build Final Four + Championship rounds from section games."""
        section_games = sorted(
            [g for g in games if g["sectionId"] == section_id],
            key=lambda g: g["bracketPositionId"],
        )
        semis = [g for g in section_games if 600 <=
                 g["bracketPositionId"] < 700]
        final = [g for g in section_games if g["bracketPositionId"] >= 700]

        result = []
        if semis:
            result.append(
                {
                    "label": "Semifinals",
                    "subtitle": "",
                    "games": [cls._format_game(g) for g in semis],
                }
            )
        if final:
            result.append(
                {
                    "label": "Championship",
                    "subtitle": "",
                    "games": [cls._format_game(g) for g in final],
                }
            )
        return result

    @classmethod
    def _build_first_four_rounds(cls, games: list[dict], section_id: int) -> list[dict]:
        """Build play-in game list as a single round column."""
        play_in = sorted(
            [g for g in games if g["sectionId"] == section_id],
            key=lambda g: g["bracketPositionId"],
        )
        if not play_in:
            return []
        return [
            {
                "label": "Play-in Games",
                "subtitle": "",
                "games": [cls._format_game(g) for g in play_in],
            }
        ]

    @classmethod
    def _pick_default_tab(cls, tabs: list[dict], games: list[dict]) -> int | None:
        """Pick the default active tab: live game first, then last enabled."""
        # Find section with a live game
        for game in games:
            if game.get("gameState") == "I":
                return game["sectionId"]

        # Last enabled tab (most recent round with action)
        for tab in reversed(tabs):
            if tab["isEnabled"]:
                return tab["sectionId"]

        # Fallback to first tab
        return tabs[0]["sectionId"] if tabs else None

    @classmethod
    def _championship_info(
        cls, champ: dict, games: list[dict], rounds: list[dict]
    ) -> str | None:
        """Build championship game info string for the header subtitle."""
        champ_round = next(
            (r for r in rounds if r.get("roundNumber") == 7), None)
        if not champ_round:
            return None

        champ_game = next(
            (g for g in games if g.get("bracketPositionId", 0) >= 700), None
        )
        if not champ_game:
            return None

        epoch = champ_game.get("startTimeEpoch", 0)
        if not epoch:
            return cls._clean_title(champ_round.get("title", ""))

        # Format date/time components — frontend will still do timezone-local
        # display, but we provide the raw epoch and a pre-formatted string
        network = ""
        broadcaster = champ_game.get("broadcaster")
        if broadcaster and broadcaster.get("name"):
            network = broadcaster["name"]

        title = cls._clean_title(champ_round.get("title", ""))
        info = title
        if network:
            info += f"\n{network}"
        return info or None
