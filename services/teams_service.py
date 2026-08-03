"""
Fetch a sport's full team list from ESPN.

Supports NFL, MLB, NHL, and NCAA college basketball and football. Used to
build a browsable favorite-teams picker (year-round, not gated to games
loaded today).
"""

from __future__ import annotations

from collections.abc import Iterator

from constants.espn import CONFERENCE_SHORT_NAMES, STANDINGS_URLS, TEAMS_URLS
from utils.client import get_client

# Sports that need a "conference" field for sub-filtering in the favorites
# picker. NFL/MLB/NHL have no conference concept relevant to this app.
_COLLEGE_SPORTS = ("football-college", "basketball-college")


class TeamsService:
    """Service for fetching a sport's team list from ESPN."""

    @classmethod
    async def list_teams(cls, sport: str) -> dict:
        """Fetch every team for a sport.

        Args:
            sport: One of the keys in :data:`constants.espn.TEAMS_URLS`
                (e.g. ``'nfl'``, ``'basketball-college'``, ``'football-college'``).

        Returns:
            Dictionary with the sport key and a list of teams, sorted
            alphabetically by name.

        Raises:
            ValueError: If the sport is not supported.
        """
        url = TEAMS_URLS.get(sport)
        if url is None:
            raise ValueError(f"Unsupported sport: {sport!r}. Expected one of {list(TEAMS_URLS)}")

        client = get_client()
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()

        conference_by_id: dict[str, str] = {}
        if sport in _COLLEGE_SPORTS:
            conference_by_id = await cls._build_conference_map(sport)

        raw_teams = data.get("sports", [{}])[0].get("leagues", [{}])[0].get("teams", [])
        teams = [cls._format_team(entry.get("team", {}), sport, conference_by_id) for entry in raw_teams]
        teams.sort(key=lambda t: t["name"])

        return {"sport": sport, "teams": teams}

    @classmethod
    async def _build_conference_map(cls, sport: str) -> dict[str, str]:
        """Map team id -> conference display name, from the standings endpoint.

        ESPN's bulk teams-list endpoint (:data:`constants.espn.TEAMS_URLS`)
        carries no conference info at all on the team object (verified
        against the live response) — not even a ``groups`` field, which only
        shows up on the single-team detail endpoint (one request per team,
        not viable for 755 college football teams). Conference has to come
        from the standings endpoint's conference groupings instead.

        Each standings conference group's own ``id`` only maps through
        :data:`CONFERENCE_SHORT_NAMES` for basketball-college — its ids match
        that dict exactly (verified). Football-college's standings groups use
        a *different* id namespace (e.g. ACC is id 1 there vs. id 2 in the
        dict) that also *collides* with unrelated basketball ids (football's
        id 1 would silently resolve to the dict's "Am. East" via id 1, not
        "ACC"), so football-college always uses the group's own
        ESPN-provided ``name`` instead of the id lookup.
        """
        url = STANDINGS_URLS[sport]
        client = get_client()
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()

        conference_by_id: dict[str, str] = {}
        for child in data.get("children", []):
            for group in cls._iter_conference_groups(child):
                group_id = str(group.get("id", ""))
                group_name = group.get("name", "")
                conference = (
                    CONFERENCE_SHORT_NAMES.get(group_id, group_name) if sport == "basketball-college" else group_name
                )
                for entry in group.get("standings", {}).get("entries", []):
                    team_id = entry.get("team", {}).get("id")
                    if team_id:
                        conference_by_id[team_id] = conference
        return conference_by_id

    @classmethod
    def _iter_conference_groups(cls, child: dict) -> Iterator[dict]:
        """Yield the leaf conference groups under a standings child node.

        Mirrors ``StandingsService.fetch_standings``'s flat-vs-nested
        handling: some sports nest conferences under a league container
        (e.g. AL/NL), others list them directly.
        """
        sub_children = child.get("children", [])
        direct_entries = child.get("standings", {}).get("entries", [])
        if sub_children and not direct_entries:
            yield from sub_children
        else:
            yield child

    @classmethod
    def _format_team(cls, team: dict, sport: str, conference_by_id: dict[str, str] | None = None) -> dict:
        """Format a single team entry.

        Args:
            team: Raw ESPN team object.
            sport: Short sport key.
            conference_by_id: Team id -> conference name map, from
                :meth:`_build_conference_map`. Only consulted for
                ``sport in _COLLEGE_SPORTS``.
        """
        result: dict = {
            "id": team.get("id", ""),
            "name": team.get("displayName", ""),
            "abbreviation": team.get("abbreviation", ""),
            "logo": (team.get("logos") or [{}])[0].get("href", ""),
        }
        if sport in _COLLEGE_SPORTS:
            result["conference"] = (conference_by_id or {}).get(team.get("id"))
        return result
