"""API contract tests.

These tests validate that the backend formatting functions produce output
that conforms to the Pydantic response schemas.  If a service changes the
shape of its output, these tests will catch the mismatch before it reaches
the frontend.
"""

from __future__ import annotations

from pydantic import ValidationError
import pytest

from schemas.game import GameSchema, GameSummarySchema, ScheduleResponseSchema
from services.game_espn_service import GameService
from services.scoreboard_espn_service import ScoreboardService
from tests.fixtures.espn_data import SAMPLE_ESPN_SCOREBOARD, SAMPLE_ESPN_SUMMARY


def test_scoreboard_output_validates_against_game_schema():
    """format_events output must parse into GameSchema without errors."""
    games = ScoreboardService.format_events(
        SAMPLE_ESPN_SCOREBOARD, "basketball-college"
    )
    assert len(games) > 0

    for game_dict in games:
        game = GameSchema(**game_dict)
        # Verify key camelCase aliases work
        serialized = game.model_dump(by_alias=True)
        assert "homeTeam" in serialized
        assert "awayTeam" in serialized
        assert "eventId" in serialized
        assert "startTime" in serialized


def test_scoreboard_output_validates_as_schedule_response():
    """fetch_and_format wraps games in {games: [...]}, matching ScheduleResponseSchema."""
    games = ScoreboardService.format_events(
        SAMPLE_ESPN_SCOREBOARD, "basketball-college"
    )
    response = {"games": games}

    schedule = ScheduleResponseSchema(**response)
    assert len(schedule.games) > 0

    serialized = schedule.model_dump(by_alias=True)
    assert "games" in serialized
    assert isinstance(serialized["games"], list)


def test_game_summary_output_validates_against_schema():
    """_format_summary output must parse into GameSummarySchema."""
    summary_dict = GameService._format_summary(
        SAMPLE_ESPN_SUMMARY, "basketball-college"
    )

    summary = GameSummarySchema(**summary_dict)
    serialized = summary.model_dump(by_alias=True)
    assert "homeTeam" in serialized
    assert "boxScore" in serialized
    assert "plays" in serialized
    assert "leaders" in serialized


def test_required_fields_present_in_scoreboard_output():
    """All required GameSchema fields must be non-None in scoreboard output."""
    games = ScoreboardService.format_events(
        SAMPLE_ESPN_SCOREBOARD, "basketball-college"
    )
    game = GameSchema(**games[0])

    # Required fields (no default)
    assert game.id != ""
    assert game.event_id != ""
    assert game.sport != ""
    assert game.home_team is not None
    assert game.away_team is not None
    assert game.status != ""
    assert game.start_time != ""
    assert game.network != ""


def test_required_fields_present_in_game_summary_output():
    """All required GameSummarySchema fields must be non-None."""
    summary_dict = GameService._format_summary(
        SAMPLE_ESPN_SUMMARY, "basketball-college"
    )
    summary = GameSummarySchema(**summary_dict)

    assert summary.id != ""
    assert summary.event_id != ""
    assert summary.home_team is not None
    assert summary.away_team is not None


def test_venue_fields_in_scoreboard_output():
    """Venue city and state must be extracted when present."""
    games = ScoreboardService.format_events(
        SAMPLE_ESPN_SCOREBOARD, "basketball-college"
    )
    game = GameSchema(**games[0])

    assert game.venue is not None
    assert game.venue_city is not None
    assert game.venue_state is not None


def test_venue_fields_in_game_summary_output():
    """Venue city and state must be extracted from game summary."""
    summary_dict = GameService._format_summary(
        SAMPLE_ESPN_SUMMARY, "basketball-college"
    )
    summary = GameSummarySchema(**summary_dict)

    assert summary.venue is not None
    assert summary.venue_city is not None
    assert summary.venue_state is not None


def test_odds_fields_in_scoreboard_output():
    """Odds must parse correctly when present."""
    games = ScoreboardService.format_events(
        SAMPLE_ESPN_SCOREBOARD, "basketball-college"
    )
    game = GameSchema(**games[0])

    assert game.odds is not None
    assert game.odds.spread is not None
    assert game.odds.over_under is not None


def test_schema_rejects_missing_required_fields():
    """GameSchema must reject data missing required fields."""
    with pytest.raises(ValidationError):
        GameSchema(id="1")  # Missing all other required fields


def test_schema_rejects_wrong_types():
    """GameSchema must reject wrong types for required fields."""
    with pytest.raises(ValidationError):
        GameSchema(
            id=123,  # Should be string
            event_id="1",
            sport="basketball-college",
            home_team={"name": "A", "abbreviation": "A"},
            away_team={"name": "B", "abbreviation": "B"},
            status="scheduled",
            start_time="2026-03-15T23:00Z",
            network="ESPN",
        )


def test_empty_scoreboard_produces_empty_schedule():
    """Empty ESPN data should produce a valid empty schedule response."""
    games = ScoreboardService.format_events({}, "basketball-college")
    response = ScheduleResponseSchema(games=games)
    assert len(response.games) == 0


def test_camel_case_serialization_matches_frontend_keys():
    """Serialized output keys must match what the frontend expects."""
    games = ScoreboardService.format_events(
        SAMPLE_ESPN_SCOREBOARD, "basketball-college"
    )
    game = GameSchema(**games[0])
    serialized = game.model_dump(by_alias=True)

    # These are the exact keys the frontend reads from the API response
    expected_keys = {
        "id",
        "eventId",
        "sport",
        "homeTeam",
        "awayTeam",
        "status",
        "startTime",
        "endTime",
        "network",
        "homeScore",
        "awayScore",
        "venue",
        "venueCity",
        "venueState",
        "quarter",
        "timeRemaining",
        "statusDetail",
        "odds",
        "predictor",
    }
    assert expected_keys == set(serialized.keys())

    # Verify nested team keys
    team_keys = {
        "id",
        "name",
        "abbreviation",
        "logo",
        "color",
        "record",
        "conferenceRecord",
        "conference",
        "rank",
    }
    assert team_keys == set(serialized["homeTeam"].keys())
    assert team_keys == set(serialized["awayTeam"].keys())
