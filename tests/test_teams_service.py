"""Tests for TeamsService formatting and fetching logic."""

from __future__ import annotations

from typing import Any

import pytest
from services.teams_service import TeamsService

from tests.fixtures.espn_data import (
    SAMPLE_ESPN_STANDINGS_TEAMS_BASKETBALL_COLLEGE,
    SAMPLE_ESPN_STANDINGS_TEAMS_FOOTBALL_COLLEGE,
    SAMPLE_ESPN_TEAMS_CFB,
    SAMPLE_ESPN_TEAMS_NFL,
)

# ── _format_team ──────────────────────────────────────────────────────────────


def test_format_team_basic_fields() -> None:
    """Basic team identity fields are pulled from the ESPN team object."""
    team = {
        "id": "22",
        "displayName": "Arizona Cardinals",
        "abbreviation": "ARI",
        "logos": [{"href": "https://example.com/ari.png"}],
    }
    result = TeamsService._format_team(team, "nfl")

    assert result["id"] == "22"
    assert result["name"] == "Arizona Cardinals"
    assert result["abbreviation"] == "ARI"
    assert result["logo"] == "https://example.com/ari.png"


def test_format_team_pro_sport_has_no_conference() -> None:
    """Pro sports (no conference concept in this app) get no conference key."""
    team = {"id": "22", "displayName": "Arizona Cardinals", "abbreviation": "ARI", "logos": []}
    result = TeamsService._format_team(team, "nfl")

    assert "conference" not in result


def test_format_team_college_conference_resolved_via_map() -> None:
    """College sports resolve conference from the id -> name map."""
    team = {"id": "150", "displayName": "Duke Blue Devils", "abbreviation": "DUKE", "logos": []}
    result = TeamsService._format_team(team, "basketball-college", {"150": "ACC"})

    assert result["conference"] == "ACC"


def test_format_team_college_conference_missing_from_map_is_none() -> None:
    """A college team with no map entry gets ``conference: None`` (not an error)."""
    team = {"id": "999", "displayName": "Unknown Team", "abbreviation": "UNK", "logos": []}
    result = TeamsService._format_team(team, "football-college", {})

    assert result["conference"] is None


# ── list_teams ────────────────────────────────────────────────────────────────


class _MockResponse:
    def __init__(self, data: dict[str, Any]) -> None:
        self._data = data

    def raise_for_status(self) -> None:
        pass

    def json(self) -> dict[str, Any]:
        return self._data


class _MockClient:
    """Returns teams-list data or standings data depending on the URL."""

    def __init__(self, teams_data: dict[str, Any], standings_data: dict[str, Any] | None = None) -> None:
        self._teams_data = teams_data
        self._standings_data = standings_data

    async def get(self, url: str) -> _MockResponse:
        if "standings" in url:
            return _MockResponse(self._standings_data)
        return _MockResponse(self._teams_data)


@pytest.mark.asyncio
async def test_list_teams_unsupported_sport_raises_value_error() -> None:
    """An unknown sport key raises ValueError (bad path)."""
    with pytest.raises(ValueError):
        await TeamsService.list_teams("curling")


@pytest.mark.asyncio
async def test_list_teams_nfl_returns_sorted_teams_without_conference(monkeypatch: pytest.MonkeyPatch) -> None:
    """NFL teams are returned alphabetically, with no conference field."""
    monkeypatch.setattr(
        "services.teams_service.get_client",
        lambda: _MockClient(SAMPLE_ESPN_TEAMS_NFL),
    )

    result = await TeamsService.list_teams("nfl")

    assert result["sport"] == "nfl"
    names = [t["name"] for t in result["teams"]]
    assert names == sorted(names)
    assert all("conference" not in t for t in result["teams"])


@pytest.mark.asyncio
async def test_list_teams_basketball_college_resolves_conference(monkeypatch: pytest.MonkeyPatch) -> None:
    """College teams get conference resolved via the standings lookup."""
    monkeypatch.setattr(
        "services.teams_service.get_client",
        lambda: _MockClient(SAMPLE_ESPN_TEAMS_CFB, SAMPLE_ESPN_STANDINGS_TEAMS_BASKETBALL_COLLEGE),
    )

    result = await TeamsService.list_teams("basketball-college")

    duke = next(t for t in result["teams"] if t["abbreviation"] == "DUKE")
    assert duke["conference"] == "ACC"


@pytest.mark.asyncio
async def test_list_teams_football_college_falls_back_to_group_name(monkeypatch: pytest.MonkeyPatch) -> None:
    """Football-college's standings ids don't match CONFERENCE_SHORT_NAMES.

    Conference resolution falls back to the standings group's own name.
    """
    monkeypatch.setattr(
        "services.teams_service.get_client",
        lambda: _MockClient(SAMPLE_ESPN_TEAMS_CFB, SAMPLE_ESPN_STANDINGS_TEAMS_FOOTBALL_COLLEGE),
    )

    result = await TeamsService.list_teams("football-college")

    miami = next(t for t in result["teams"] if t["abbreviation"] == "MIA")
    assert miami["conference"] == "Atlantic Coast Conference"
