"""Tests for ScoreboardService formatting methods."""

from __future__ import annotations

from services.scoreboard_espn_service import ScoreboardService
from tests.fixtures.espn_data import SAMPLE_ESPN_EVENT, SAMPLE_ESPN_SCOREBOARD


def test_format_events_returns_list():
    result = ScoreboardService.format_events(
        SAMPLE_ESPN_SCOREBOARD, "basketball-college"
    )
    assert isinstance(result, list)
    assert len(result) == 1


def test_format_event_basic_fields():
    result = ScoreboardService.format_events(
        SAMPLE_ESPN_SCOREBOARD, "basketball-college"
    )
    game = result[0]
    assert game["id"] == "401634567"
    assert game["eventId"] == "401634567"
    assert game["sport"] == "basketball-college"
    assert game["startTime"] == "2025-03-15T23:00Z"
    assert game["network"] == "ESPN"
    assert game["venue"] == "Cameron Indoor Stadium"


def test_format_event_scores():
    result = ScoreboardService.format_events(
        SAMPLE_ESPN_SCOREBOARD, "basketball-college"
    )
    game = result[0]
    assert game["homeScore"] == 85
    assert game["awayScore"] == 78


def test_format_event_teams():
    result = ScoreboardService.format_events(
        SAMPLE_ESPN_SCOREBOARD, "basketball-college"
    )
    game = result[0]

    home = game["homeTeam"]
    assert home["name"] == "Duke Blue Devils"
    assert home["abbreviation"] == "DUKE"
    assert home["record"] == "25-5"
    assert home["conferenceRecord"] == "15-3"
    assert home["rank"] == 5

    away = game["awayTeam"]
    assert away["name"] == "North Carolina Tar Heels"
    assert away["rank"] is None  # 99 = unranked


def test_format_event_venue_with_address():
    result = ScoreboardService.format_events(
        SAMPLE_ESPN_SCOREBOARD, "basketball-college"
    )
    game = result[0]
    assert game["venue"] == "Cameron Indoor Stadium"
    assert game["venueCity"] == "Durham"
    assert game["venueState"] == "NC"


def test_format_event_venue_no_address():
    """Venue without address should have None for city/state."""
    event = {
        **SAMPLE_ESPN_EVENT,
        "competitions": [
            {
                **SAMPLE_ESPN_EVENT["competitions"][0],
                "venue": {"fullName": "Some Arena"},
            }
        ],
    }
    result = ScoreboardService.format_events({"events": [event]}, "basketball-college")
    game = result[0]
    assert game["venue"] == "Some Arena"
    assert game["venueCity"] is None
    assert game["venueState"] is None


def test_format_event_odds():
    result = ScoreboardService.format_events(
        SAMPLE_ESPN_SCOREBOARD, "basketball-college"
    )
    game = result[0]
    assert game["odds"]["spread"] == -3.5
    assert game["odds"]["overUnder"] == 155.5


def test_parse_status_values():
    assert ScoreboardService._parse_status(None) == "scheduled"
    assert ScoreboardService._parse_status({"type": {"state": "pre"}}) == "scheduled"
    assert ScoreboardService._parse_status({"type": {"state": "in"}}) == "in_progress"
    assert ScoreboardService._parse_status({"type": {"state": "post"}}) == "completed"
    assert (
        ScoreboardService._parse_status({"type": {"state": "unknown"}}) == "scheduled"
    )


def test_parse_quarter_values():
    assert ScoreboardService._parse_quarter(None) is None
    assert (
        ScoreboardService._parse_quarter({"type": {"state": "pre"}, "period": 0})
        is None
    )
    assert (
        ScoreboardService._parse_quarter({"type": {"state": "in"}, "period": 1}) == "Q1"
    )
    assert (
        ScoreboardService._parse_quarter({"type": {"state": "in"}, "period": 4}) == "Q4"
    )
    assert (
        ScoreboardService._parse_quarter({"type": {"state": "in"}, "period": 5}) == "OT"
    )
    assert (
        ScoreboardService._parse_quarter({"type": {"state": "in"}, "period": 6})
        == "Period 6"
    )


def test_parse_odds_none_cases():
    assert ScoreboardService._parse_odds(None) is None
    assert ScoreboardService._parse_odds([]) is None
    assert ScoreboardService._parse_odds([{}]) is None


def test_parse_conference_record():
    # No records
    assert ScoreboardService._parse_conference_record([]) is None
    # Only one record
    assert ScoreboardService._parse_conference_record([{"summary": "25-5"}]) is None
    # With vsConf record
    records = [
        {"summary": "25-5", "name": "overall"},
        {"summary": "15-3", "name": "vsConf"},
    ]
    assert ScoreboardService._parse_conference_record(records) == "15-3"


def test_format_events_empty_data():
    result = ScoreboardService.format_events({}, "basketball-college")
    assert result == []

    result = ScoreboardService.format_events({"events": []}, "basketball-college")
    assert result == []


def test_format_team_unranked():
    """Teams with rank >= 99 should have rank set to None."""
    competitor = {
        "team": {"displayName": "Team", "abbreviation": "TM"},
        "curatedRank": {"current": 99},
    }
    team = ScoreboardService._format_team(competitor)
    assert team["rank"] is None


def test_format_team_no_rank():
    """Teams with no curatedRank should have rank set to None."""
    competitor = {
        "team": {"displayName": "Team", "abbreviation": "TM"},
    }
    team = ScoreboardService._format_team(competitor)
    assert team["rank"] is None


def test_format_team_color():
    """Team color should be extracted from ESPN team data."""
    result = ScoreboardService.format_events(
        SAMPLE_ESPN_SCOREBOARD, "basketball-college"
    )
    game = result[0]
    assert game["homeTeam"]["color"] == "003087"
    assert game["awayTeam"]["color"] == "7BAFD4"


def test_format_team_color_missing():
    """Teams without color should have color set to None."""
    competitor = {
        "team": {"displayName": "Team", "abbreviation": "TM"},
    }
    team = ScoreboardService._format_team(competitor)
    assert team["color"] is None


def test_parse_network_skips_mlbtv():
    """MLB.TV streaming entry should be skipped when a real network is available."""
    broadcasts = [
        {"names": ["MLB.TV"]},
        {"names": ["Marquee Sports Net"]},
        {"names": ["DBACKS.TV"]},
    ]
    assert ScoreboardService._parse_network(broadcasts) == "Marquee Sports Net"


def test_parse_network_mlbtv_only():
    """Falls back to MLB.TV when it's the only broadcast."""
    assert ScoreboardService._parse_network([{"names": ["MLB.TV"]}]) == "MLB.TV"


def test_parse_network_national_tv():
    """National TV network (e.g. ESPN) should be returned as-is."""
    assert ScoreboardService._parse_network([{"names": ["ESPN"]}]) == "ESPN"


def test_parse_network_apple_tv():
    """Apple TV+ national broadcast should not be filtered out."""
    assert ScoreboardService._parse_network([{"names": ["Apple TV"]}]) == "Apple TV"


def test_parse_network_empty():
    """Empty broadcasts list should return TBD."""
    assert ScoreboardService._parse_network([]) == "TBD"
