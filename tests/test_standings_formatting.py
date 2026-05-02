"""Tests for StandingsService formatting and filtering logic."""

from __future__ import annotations

import pytest

from services.standings_service import StandingsService
from tests.fixtures.espn_data import (
    SAMPLE_ESPN_STANDINGS_FLAT,
    SAMPLE_ESPN_STANDINGS_NESTED,
    SAMPLE_NFL_ENTRY_NO_TIES,
    SAMPLE_NFL_ENTRY_WITH_TIES,
)


# ── _format_team ──────────────────────────────────────────────────────────────


def test_format_team_basic_fields():
    result = StandingsService._format_team(SAMPLE_NFL_ENTRY_NO_TIES, "nfl")
    assert result["team"] == "Kansas City Chiefs"
    assert result["shortName"] == "Kansas City"
    assert result["abbreviation"] == "KC"
    assert result["logo"] == "https://example.com/kc.png"


def test_format_team_record_without_ties():
    result = StandingsService._format_team(SAMPLE_NFL_ENTRY_NO_TIES, "nfl")
    assert result["record"] == "15-2"


def test_format_team_record_with_ties():
    result = StandingsService._format_team(SAMPLE_NFL_ENTRY_WITH_TIES, "nfl")
    assert result["record"] == "14-3-1"


def test_format_team_stats_included():
    result = StandingsService._format_team(SAMPLE_NFL_ENTRY_NO_TIES, "nfl")
    assert result["winPercent"] == ".882"
    assert result["pointsFor"] == "496"
    assert result["pointsAgainst"] == "275"


def test_format_team_wins_losses_not_in_result():
    # wins/losses are folded into record; they should not appear as separate keys
    result = StandingsService._format_team(SAMPLE_NFL_ENTRY_NO_TIES, "nfl")
    assert "wins" not in result
    assert "losses" not in result


# ── _extract_stats ────────────────────────────────────────────────────────────


def test_extract_stats_returns_desired_fields():
    stats = [
        {"name": "wins", "displayValue": "10"},
        {"name": "losses", "displayValue": "5"},
        {"name": "winPercent", "displayValue": ".667"},
        {"name": "irrelevantStat", "displayValue": "99"},
    ]
    result = StandingsService._extract_stats(stats, "nhl")
    assert result["wins"] == "10"
    assert result["winPercent"] == ".667"
    assert "irrelevantStat" not in result


def test_extract_stats_ignores_unknown_names():
    stats = [{"name": "unknownMetric", "displayValue": "42"}]
    result = StandingsService._extract_stats(stats, "nhl")
    assert result == {}


# ── filter_by_conference ──────────────────────────────────────────────────────


def _make_standings_data():
    return {
        "sport": "nhl",
        "league": "NHL",
        "season": "2025-26",
        "groups": [
            {
                "name": "Atlantic Division",
                "abbreviation": "atl",
                "league": "Eastern",
                "teams": [],
            },
            {
                "name": "Metropolitan Division",
                "abbreviation": "met",
                "league": "Eastern",
                "teams": [],
            },
            {
                "name": "Central Division",
                "abbreviation": "cen",
                "league": "Western",
                "teams": [],
            },
        ],
    }


def test_filter_by_conference_matches_name():
    data = _make_standings_data()
    result = StandingsService.filter_by_conference(data, "atlantic division")
    assert len(result["groups"]) == 1
    assert result["groups"][0]["name"] == "Atlantic Division"


def test_filter_by_conference_matches_abbreviation():
    data = _make_standings_data()
    result = StandingsService.filter_by_conference(data, "met")
    assert len(result["groups"]) == 1
    assert result["groups"][0]["abbreviation"] == "met"


def test_filter_by_conference_case_insensitive():
    data = _make_standings_data()
    result = StandingsService.filter_by_conference(data, "ATLANTIC DIVISION")
    assert len(result["groups"]) == 1


def test_filter_by_conference_no_match_returns_empty():
    data = _make_standings_data()
    result = StandingsService.filter_by_conference(data, "pac12")
    assert result["groups"] == []


def test_filter_by_conference_preserves_other_fields():
    data = _make_standings_data()
    result = StandingsService.filter_by_conference(data, "cen")
    assert result["sport"] == "nhl"
    assert result["season"] == "2025-26"


# ── fetch_standings group parsing ─────────────────────────────────────────────


class _MockResponse:
    def __init__(self, data):
        self._data = data

    def raise_for_status(self):
        pass

    def json(self):
        return self._data


class _MockClient:
    def __init__(self, data):
        self._data = data

    async def get(self, url):
        return _MockResponse(self._data)


@pytest.mark.asyncio
async def test_fetch_standings_flat_structure(monkeypatch):
    """Flat ESPN response (NHL-style) produces one group per division."""
    monkeypatch.setattr(
        "services.standings_service.get_client",
        lambda: _MockClient(SAMPLE_ESPN_STANDINGS_FLAT),
    )

    result = await StandingsService.fetch_standings("nhl")

    assert result["sport"] == "nhl"
    assert result["season"] == "2025-26"
    assert len(result["groups"]) == 2
    assert result["groups"][0]["name"] == "Atlantic Division"
    assert result["groups"][0]["league"] is None
    assert len(result["groups"][0]["teams"]) == 1
    assert result["groups"][0]["teams"][0]["abbreviation"] == "BOS"


@pytest.mark.asyncio
async def test_fetch_standings_nested_structure(monkeypatch):
    """Nested ESPN response (MLB-style) attaches league name to each group."""
    monkeypatch.setattr(
        "services.standings_service.get_client",
        lambda: _MockClient(SAMPLE_ESPN_STANDINGS_NESTED),
    )

    result = await StandingsService.fetch_standings("mlb")

    assert result["season"] == "2025"
    assert len(result["groups"]) == 2

    al_group = next(g for g in result["groups"] if "American" in g["league"])
    assert al_group["name"] == "American League East"
    assert al_group["teams"][0]["abbreviation"] == "NYY"

    nl_group = next(g for g in result["groups"] if "National" in g["league"])
    assert nl_group["name"] == "National League East"
