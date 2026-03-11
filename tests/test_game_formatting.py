"""Tests for GameService formatting methods."""

from __future__ import annotations

from services.game_espn_service import GameService
from tests.fixtures.espn_data import (
    SAMPLE_ESPN_PREDICTOR,
    SAMPLE_ESPN_SUMMARY,
    SAMPLE_ESPN_WINPROBABILITY,
)


def test_format_summary_basic_fields():
    result = GameService._format_summary(SAMPLE_ESPN_SUMMARY, "basketball-college")
    assert result["id"] == "401634567"
    assert result["eventId"] == "401634567"
    assert result["sport"] == "basketball-college"
    assert result["status"] == "completed"
    assert result["startTime"] == "2025-03-15T23:00Z"
    assert result["network"] == "ESPN2"
    assert result["venue"] == "Cameron Indoor Stadium"


def test_format_summary_scores():
    result = GameService._format_summary(SAMPLE_ESPN_SUMMARY, "basketball-college")
    assert result["homeScore"] == 85
    assert result["awayScore"] == 78


def test_format_summary_teams():
    result = GameService._format_summary(SAMPLE_ESPN_SUMMARY, "basketball-college")
    assert result["homeTeam"]["name"] == "Duke Blue Devils"
    assert result["homeTeam"]["abbreviation"] == "DUKE"
    assert result["homeTeam"]["record"] == "25-5"
    assert result["homeTeam"]["rank"] == 5
    assert result["awayTeam"]["rank"] is None  # 99 = unranked


def test_format_summary_venue_with_address():
    result = GameService._format_summary(SAMPLE_ESPN_SUMMARY, "basketball-college")
    assert result["venue"] == "Cameron Indoor Stadium"
    assert result["venueCity"] == "Durham"
    assert result["venueState"] == "NC"


def test_format_summary_odds():
    result = GameService._format_summary(SAMPLE_ESPN_SUMMARY, "basketball-college")
    assert result["odds"]["spread"] == -3.5
    assert result["odds"]["overUnder"] == 155.5


def test_format_summary_extended_data():
    result = GameService._format_summary(SAMPLE_ESPN_SUMMARY, "basketball-college")
    assert result["boxScore"] is not None
    assert result["plays"] is not None
    assert result["leaders"] is not None


def test_format_summary_empty_data():
    result = GameService._format_summary({}, "basketball-college")
    assert result["id"] == ""
    assert result["status"] == "scheduled"
    assert result["homeTeam"]["name"] == "Home"
    assert result["awayTeam"]["name"] == "Away"
    assert result["boxScore"] is None
    assert result["plays"] is None


def test_format_summary_no_odds():
    data = {**SAMPLE_ESPN_SUMMARY, "pickcenter": []}
    result = GameService._format_summary(data, "football-nfl")
    assert result["odds"] is None


def test_format_summary_no_venue():
    data = {**SAMPLE_ESPN_SUMMARY, "gameInfo": {}}
    result = GameService._format_summary(data, "basketball-college")
    assert result["venue"] is None
    assert result["venueCity"] is None
    assert result["venueState"] is None


def test_format_summary_predictor_from_predictor_field():
    """Scheduled games use the top-level 'predictor' field."""
    data = {**SAMPLE_ESPN_SUMMARY, "predictor": SAMPLE_ESPN_PREDICTOR}
    result = GameService._format_summary(data, "basketball-college")
    assert result["predictor"] is not None
    assert result["predictor"]["homeTeam"]["gameProjection"] == 76.4
    assert result["predictor"]["awayTeam"]["gameProjection"] == 23.6


def test_format_summary_predictor_from_winprobability():
    """Live/completed games fall back to 'winprobability' array."""
    data = {**SAMPLE_ESPN_SUMMARY, "winprobability": SAMPLE_ESPN_WINPROBABILITY}
    result = GameService._format_summary(data, "basketball-college")
    assert result["predictor"] is not None
    # Last entry: homeWinPercentage=0.85 → 85.0% home, 15.0% away
    assert result["predictor"]["homeTeam"]["gameProjection"] == 85.0
    assert result["predictor"]["awayTeam"]["gameProjection"] == 15.0
    assert result["predictor"]["homeTeam"]["id"] == "150"
    assert result["predictor"]["awayTeam"]["id"] == "153"


def test_format_summary_no_predictor():
    """No predictor or winprobability returns None."""
    result = GameService._format_summary(SAMPLE_ESPN_SUMMARY, "basketball-college")
    assert result["predictor"] is None


def test_format_summary_winprobability_empty_array():
    """Empty winprobability array should return None predictor."""
    data = {**SAMPLE_ESPN_SUMMARY, "winprobability": []}
    result = GameService._format_summary(data, "basketball-college")
    assert result["predictor"] is None


def test_format_summary_predictor_takes_priority_over_winprobability():
    """When both predictor and winprobability are present, predictor wins."""
    data = {
        **SAMPLE_ESPN_SUMMARY,
        "predictor": SAMPLE_ESPN_PREDICTOR,
        "winprobability": SAMPLE_ESPN_WINPROBABILITY,
    }
    result = GameService._format_summary(data, "basketball-college")
    # Should use predictor (76.4) not winprobability (85.0)
    assert result["predictor"]["homeTeam"]["gameProjection"] == 76.4


def test_format_summary_team_colors():
    """Team colors should be extracted from ESPN summary data."""
    result = GameService._format_summary(SAMPLE_ESPN_SUMMARY, "basketball-college")
    assert result["homeTeam"]["color"] == "003087"
    assert result["awayTeam"]["color"] == "7BAFD4"
