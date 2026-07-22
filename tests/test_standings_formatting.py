"""Tests for StandingsService formatting and filtering logic."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

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


# ── is_in_season ────────────────────────────────────────────────────────────


def _season_window_response(regular_start: str, postseason_end: str) -> dict:
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
    async def get(self, url):
        raise RuntimeError("boom")


class _MockPerYearClient:
    """Mock client that responds per-URL, letting a test fail one candidate
    year's fetch while succeeding on another.
    """

    def __init__(self, url_to_data: dict[str, dict]):
        self._url_to_data = url_to_data

    async def get(self, url):
        if url not in self._url_to_data:
            raise RuntimeError(f"unexpected url: {url}")
        data = self._url_to_data[url]
        if data is None:
            raise RuntimeError("boom")
        return _MockResponse(data)


@pytest.fixture(autouse=True)
def _clear_season_window_cache():
    """Avoid cross-test bleed since ``cache_default`` is a shared TTLCache."""
    from utils.cache import cache_default

    cache_default.clear()
    yield
    cache_default.clear()


@pytest.mark.asyncio
@pytest.mark.parametrize("sport", ["nhl", "basketball-college"])
async def test_is_in_season_ungated_sports_always_true(monkeypatch, sport):
    """Ungated sports return True without making any HTTP call."""
    monkeypatch.setattr(
        "services.standings_service.get_client",
        lambda: (_ for _ in ()).throw(AssertionError("should not be called")),
    )

    assert await StandingsService.is_in_season(sport) is True


@pytest.mark.asyncio
async def test_is_in_season_true_when_between_start_and_end(monkeypatch):
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
async def test_is_in_season_false_before_regular_season_starts(monkeypatch):
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
async def test_is_in_season_false_after_postseason_before_next_season(monkeypatch):
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
async def test_is_in_season_fails_open_when_all_candidates_fail(monkeypatch):
    """Every candidate year lookup failing outright fails open (True)."""
    monkeypatch.setattr(
        "services.standings_service.get_client",
        lambda: _MockErrorClient(),
    )

    assert await StandingsService.is_in_season("nfl") is True


@pytest.mark.asyncio
async def test_is_in_season_one_candidate_fails_other_succeeds(monkeypatch):
    """One candidate year fails, the other resolves and matches -> True."""
    now = datetime.now(UTC)
    start = (now - timedelta(days=30)).isoformat()
    end = (now + timedelta(days=30)).isoformat()

    from constants.espn import season_url

    url_to_data = {
        season_url("nfl", now.year): _season_window_response(start, end),
        season_url("nfl", now.year - 1): None,
    }
    monkeypatch.setattr(
        "services.standings_service.get_client",
        lambda: _MockPerYearClient(url_to_data),
    )

    assert await StandingsService.is_in_season("nfl") is True


# ── /standings/{sport} season gate (route-level) ─────────────────────────────


def test_standings_route_returns_404_when_season_ended(client, monkeypatch):
    async def _not_in_season(sport):
        return False

    monkeypatch.setattr(StandingsService, "is_in_season", _not_in_season)

    resp = client.get("/api/standings/nfl")

    assert resp.status_code == 404
    assert "nfl" in resp.json()["detail"]


# ── /standings/{sport}/status ────────────────────────────────────────────────


def test_standings_status_route_returns_in_season_shape(client, monkeypatch):
    async def _in_season(sport):
        return True

    monkeypatch.setattr(StandingsService, "is_in_season", _in_season)

    resp = client.get("/api/standings/mlb/status")

    assert resp.status_code == 200
    assert resp.json() == {"sport": "mlb", "inSeason": True}


def test_standings_status_route_does_not_shadow_standings_route(client, monkeypatch):
    """/status and the base sport route must resolve independently."""

    async def _not_in_season(sport):
        return False

    monkeypatch.setattr(StandingsService, "is_in_season", _not_in_season)

    status_resp = client.get("/api/standings/mlb/status")
    standings_resp = client.get("/api/standings/mlb")

    assert status_resp.status_code == 200
    assert status_resp.json() == {"sport": "mlb", "inSeason": False}
    assert standings_resp.status_code == 404
