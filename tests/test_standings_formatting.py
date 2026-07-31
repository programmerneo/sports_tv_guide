"""Tests for StandingsService formatting and filtering logic."""

from __future__ import annotations

from collections.abc import Generator
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient
from services.standings_service import StandingsService

from tests.fixtures.espn_data import (
    SAMPLE_CFB_ENTRY,
    SAMPLE_ESPN_STANDINGS_CFB,
    SAMPLE_ESPN_STANDINGS_FLAT,
    SAMPLE_ESPN_STANDINGS_NESTED,
    SAMPLE_NFL_ENTRY_NO_TIES,
    SAMPLE_NFL_ENTRY_WITH_TIES,
)

# ── _format_team ──────────────────────────────────────────────────────────────


def test_format_team_basic_fields() -> None:
    """Basic team identity fields are pulled from the ESPN entry."""
    result = StandingsService._format_team(SAMPLE_NFL_ENTRY_NO_TIES, "nfl")
    assert result["team"] == "Kansas City Chiefs"
    assert result["shortName"] == "Kansas City"
    assert result["abbreviation"] == "KC"
    assert result["logo"] == "https://example.com/kc.png"


def test_format_team_record_without_ties() -> None:
    """A team with no ties formats its record as W-L."""
    result = StandingsService._format_team(SAMPLE_NFL_ENTRY_NO_TIES, "nfl")
    assert result["record"] == "15-2"


def test_format_team_record_with_ties() -> None:
    """A team with ties formats its record as W-L-T."""
    result = StandingsService._format_team(SAMPLE_NFL_ENTRY_WITH_TIES, "nfl")
    assert result["record"] == "14-3-1"


def test_format_team_stats_included() -> None:
    """Extracted stats surface as top-level keys on the formatted team."""
    result = StandingsService._format_team(SAMPLE_NFL_ENTRY_NO_TIES, "nfl")
    assert result["winPercent"] == ".882"
    assert result["pointsFor"] == "496"
    assert result["pointsAgainst"] == "275"


def test_format_team_wins_losses_not_in_result() -> None:
    """wins/losses are folded into record; they shouldn't appear as separate keys."""
    result = StandingsService._format_team(SAMPLE_NFL_ENTRY_NO_TIES, "nfl")
    assert "wins" not in result
    assert "losses" not in result


def test_format_team_football_college_uses_overall_record() -> None:
    """CFB has no losses/ties stat, so the pre-joined ``overall`` is the record."""
    result = StandingsService._format_team(SAMPLE_CFB_ENTRY, "football-college")
    assert result["record"] == "13-3"
    assert "overall" not in result
    assert result["playoffSeed"] == "3"


# ── _extract_stats ────────────────────────────────────────────────────────────


def test_extract_stats_returns_desired_fields() -> None:
    """Only fields in the desired stat list are extracted."""
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


def test_extract_stats_ignores_unknown_names() -> None:
    """Stats with names outside the desired list are dropped."""
    stats = [{"name": "unknownMetric", "displayValue": "42"}]
    result = StandingsService._extract_stats(stats, "nhl")
    assert result == {}


def test_extract_stats_keeps_first_of_repeated_names() -> None:
    """College endpoints repeat stat names per split; the overall value wins."""
    result = StandingsService._extract_stats(SAMPLE_CFB_ENTRY["stats"], "football-college")
    assert result["pointsFor"] == "495"
    assert result["playoffSeed"] == "3"


# ── filter_by_conference ──────────────────────────────────────────────────────


def _make_standings_data() -> dict[str, Any]:
    """Build a minimal standings payload with three divisions for filter tests."""
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


def test_filter_by_conference_matches_name() -> None:
    """Filtering by full division name returns only that division."""
    data = _make_standings_data()
    result = StandingsService.filter_by_conference(data, "atlantic division")
    assert len(result["groups"]) == 1
    assert result["groups"][0]["name"] == "Atlantic Division"


def test_filter_by_conference_matches_abbreviation() -> None:
    """Filtering by abbreviation returns only the matching division."""
    data = _make_standings_data()
    result = StandingsService.filter_by_conference(data, "met")
    assert len(result["groups"]) == 1
    assert result["groups"][0]["abbreviation"] == "met"


def test_filter_by_conference_case_insensitive() -> None:
    """The conference filter matches regardless of case."""
    data = _make_standings_data()
    result = StandingsService.filter_by_conference(data, "ATLANTIC DIVISION")
    assert len(result["groups"]) == 1


def test_filter_by_conference_no_match_returns_empty() -> None:
    """A conference query with no match returns an empty group list."""
    data = _make_standings_data()
    result = StandingsService.filter_by_conference(data, "pac12")
    assert result["groups"] == []


def test_filter_by_conference_preserves_other_fields() -> None:
    """Filtering only touches ``groups``; other top-level fields pass through."""
    data = _make_standings_data()
    result = StandingsService.filter_by_conference(data, "cen")
    assert result["sport"] == "nhl"
    assert result["season"] == "2025-26"


# ── fetch_standings group parsing ─────────────────────────────────────────────


class _MockResponse:
    def __init__(self, data: dict[str, Any]) -> None:
        self._data = data

    def raise_for_status(self) -> None:
        pass

    def json(self) -> dict[str, Any]:
        return self._data


class _MockClient:
    def __init__(self, data: dict[str, Any]) -> None:
        self._data = data

    async def get(self, url: str) -> _MockResponse:
        return _MockResponse(self._data)


@pytest.mark.asyncio
async def test_fetch_standings_flat_structure(monkeypatch: pytest.MonkeyPatch) -> None:
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
async def test_fetch_standings_nested_structure(monkeypatch: pytest.MonkeyPatch) -> None:
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


@pytest.mark.asyncio
async def test_fetch_standings_football_college(monkeypatch: pytest.MonkeyPatch) -> None:
    """FBS response produces one group per conference with formatted teams."""
    monkeypatch.setattr(
        "services.standings_service.get_client",
        lambda: _MockClient(SAMPLE_ESPN_STANDINGS_CFB),
    )

    result = await StandingsService.fetch_standings("football-college")

    assert result["sport"] == "football-college"
    assert result["league"] == "FBS"
    assert len(result["groups"]) == 1
    group = result["groups"][0]
    assert group["name"] == "Atlantic Coast Conference"
    assert group["abbreviation"] == "acc"
    assert group["teams"][0]["record"] == "13-3"


@pytest.mark.asyncio
async def test_fetch_standings_unsupported_sport_raises() -> None:
    """An unknown sport key is rejected before any HTTP call."""
    with pytest.raises(ValueError, match="Unsupported sport"):
        await StandingsService.fetch_standings("cricket")


# ── is_in_season ────────────────────────────────────────────────────────────


def _season_window_response(regular_start: str, postseason_end: str) -> dict[str, Any]:
    """Build a mock ESPN season resource with regular-season/postseason types."""
    return {
        "types": {
            "items": [
                {"type": 1, "name": "Preseason"},
                {"type": 2, "name": "Regular Season", "startDate": regular_start},
                {"type": 3, "name": "Postseason", "endDate": postseason_end},
                {"type": 4, "name": "Off Season"},
            ]
        }
    }


class _MockErrorClient:
    async def get(self, url: str) -> _MockResponse:
        raise RuntimeError("boom")


class _MockPerYearClient:
    """Mock client that responds per-URL.

    Lets a test fail one candidate year's fetch while succeeding on another.
    """

    def __init__(self, url_to_data: dict[str, dict[str, Any] | None]) -> None:
        self._url_to_data = url_to_data

    async def get(self, url: str) -> _MockResponse:
        if url not in self._url_to_data:
            raise RuntimeError(f"unexpected url: {url}")
        data = self._url_to_data[url]
        if data is None:
            raise RuntimeError("boom")
        return _MockResponse(data)


@pytest.fixture(autouse=True)
def _clear_season_window_cache() -> Generator[None]:
    """Avoid cross-test bleed since ``cache_default`` is a shared TTLCache."""
    from utils.cache import cache_default

    cache_default.clear()
    yield
    cache_default.clear()


@pytest.mark.asyncio
@pytest.mark.parametrize("sport", ["nhl", "basketball-college"])
async def test_is_in_season_ungated_sports_always_true(monkeypatch: pytest.MonkeyPatch, sport: str) -> None:
    """Ungated sports return True without making any HTTP call."""
    monkeypatch.setattr(
        "services.standings_service.get_client",
        lambda: (_ for _ in ()).throw(AssertionError("should not be called")),
    )

    assert await StandingsService.is_in_season(sport) is True


@pytest.mark.asyncio
async def test_is_in_season_true_when_between_start_and_end(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Now is between regular-season start and postseason end -> in season."""
    now = datetime.now(UTC)
    start = (now - timedelta(days=30)).isoformat()
    end = (now + timedelta(days=30)).isoformat()
    monkeypatch.setattr(
        "services.standings_service.get_client",
        lambda: _MockClient(_season_window_response(start, end)),
    )

    assert await StandingsService.is_in_season("nfl") is True


@pytest.mark.asyncio
async def test_is_in_season_false_before_regular_season_starts(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Now is before this year's (and last year's) regular-season kickoff."""
    now = datetime.now(UTC)
    start = (now + timedelta(days=60)).isoformat()
    end = (now + timedelta(days=200)).isoformat()
    # Both candidate years report a future regular season -> not in season.
    monkeypatch.setattr(
        "services.standings_service.get_client",
        lambda: _MockClient(_season_window_response(start, end)),
    )

    assert await StandingsService.is_in_season("nfl") is False


@pytest.mark.asyncio
async def test_is_in_season_false_after_postseason_before_next_season(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Now is in the off-season gap after the championship, before next kickoff."""
    now = datetime.now(UTC)
    start = (now - timedelta(days=300)).isoformat()
    end = (now - timedelta(days=30)).isoformat()
    monkeypatch.setattr(
        "services.standings_service.get_client",
        lambda: _MockClient(_season_window_response(start, end)),
    )

    assert await StandingsService.is_in_season("mlb") is False


@pytest.mark.asyncio
async def test_is_in_season_fails_open_when_all_candidates_fail(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Every candidate year lookup failing outright fails open (True)."""
    monkeypatch.setattr(
        "services.standings_service.get_client",
        lambda: _MockErrorClient(),
    )

    assert await StandingsService.is_in_season("nfl") is True


@pytest.mark.asyncio
async def test_is_in_season_one_candidate_fails_other_succeeds(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """One candidate year fails, the other resolves and matches -> True."""
    now = datetime.now(UTC)
    start = (now - timedelta(days=30)).isoformat()
    end = (now + timedelta(days=30)).isoformat()

    from constants.espn import season_url

    url_to_data: dict[str, dict[str, Any] | None] = {
        season_url("nfl", now.year): _season_window_response(start, end),
        season_url("nfl", now.year - 1): None,
    }
    monkeypatch.setattr(
        "services.standings_service.get_client",
        lambda: _MockPerYearClient(url_to_data),
    )

    assert await StandingsService.is_in_season("nfl") is True


# ── /standings/{sport} season gate (route-level) ─────────────────────────────


def test_standings_route_returns_404_when_season_ended(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    """The base standings route 404s once StandingsService reports out-of-season."""

    async def _not_in_season(sport: str) -> bool:
        return False

    monkeypatch.setattr(StandingsService, "is_in_season", _not_in_season)

    resp = client.get("/api/standings/nfl")

    assert resp.status_code == 404
    assert "nfl" in resp.json()["detail"]


def test_standings_route_football_college_404_when_out_of_season(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """College football is gated too, so it 404s out of season."""

    async def _not_in_season(sport: str) -> bool:
        return False

    monkeypatch.setattr(StandingsService, "is_in_season", _not_in_season)

    resp = client.get("/api/standings/football-college")

    assert resp.status_code == 404
    assert "football-college" in resp.json()["detail"]


def test_standings_route_football_college_returns_groups(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    """In season, the CFB route returns formatted conference groups."""

    async def _in_season(sport: str) -> bool:
        return True

    monkeypatch.setattr(StandingsService, "is_in_season", _in_season)
    monkeypatch.setattr(
        "services.standings_service.get_client",
        lambda: _MockClient(SAMPLE_ESPN_STANDINGS_CFB),
    )

    resp = client.get("/api/standings/football-college")

    assert resp.status_code == 200
    body = resp.json()
    assert body["sport"] == "football-college"
    assert body["groups"][0]["abbreviation"] == "acc"


# ── /standings/{sport}/status ────────────────────────────────────────────────


def test_standings_status_route_returns_in_season_shape(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    """The status route returns the sport key and in-season boolean."""

    async def _in_season(sport: str) -> bool:
        return True

    monkeypatch.setattr(StandingsService, "is_in_season", _in_season)

    resp = client.get("/api/standings/mlb/status")

    assert resp.status_code == 200
    assert resp.json() == {"sport": "mlb", "inSeason": True}


def test_standings_status_route_does_not_shadow_standings_route(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """/status and the base sport route must resolve independently."""

    async def _not_in_season(sport: str) -> bool:
        return False

    monkeypatch.setattr(StandingsService, "is_in_season", _not_in_season)

    status_resp = client.get("/api/standings/mlb/status")
    standings_resp = client.get("/api/standings/mlb")

    assert status_resp.status_code == 200
    assert status_resp.json() == {"sport": "mlb", "inSeason": False}
    assert standings_resp.status_code == 404
