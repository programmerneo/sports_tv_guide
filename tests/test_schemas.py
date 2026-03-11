"""Tests for Pydantic response schemas."""

from __future__ import annotations

from schemas.game import (
    GameSchema,
    GameSummarySchema,
    OddsSchema,
    ScheduleResponseSchema,
    TeamSchema,
)


def test_team_schema_serializes_to_camel_case():
    team = TeamSchema(
        id="123",
        name="Duke Blue Devils",
        abbreviation="DUKE",
        logo="https://example.com/duke.png",
        record="25-5",
        conference_record="15-3",
        rank=5,
    )
    data = team.model_dump(by_alias=True)
    assert data["conferenceRecord"] == "15-3"
    assert "conference_record" not in data


def test_team_schema_optional_fields():
    team = TeamSchema(name="TBD", abbreviation="TBD")
    data = team.model_dump(by_alias=True)
    assert data["id"] is None
    assert data["logo"] is None
    assert data["color"] is None
    assert data["record"] is None
    assert data["rank"] is None


def test_team_schema_color_field():
    """Color should serialize as a bare hex string (no '#' prefix)."""
    team = TeamSchema(name="Duke", abbreviation="DUKE", color="003087")
    data = team.model_dump(by_alias=True)
    assert data["color"] == "003087"


def test_odds_schema():
    odds = OddsSchema(spread=-3.5, over_under=145.5)
    data = odds.model_dump(by_alias=True)
    assert data["spread"] == -3.5
    assert data["overUnder"] == 145.5


def test_game_schema_full():
    game = GameSchema(
        id="401234567",
        event_id="401234567",
        sport="basketball-college",
        home_team=TeamSchema(name="Duke", abbreviation="DUKE"),
        away_team=TeamSchema(name="UNC", abbreviation="UNC"),
        status="in_progress",
        start_time="2025-03-15T19:00Z",
        network="ESPN",
        home_score=45,
        away_score=42,
        venue="Cameron Indoor Stadium",
        venue_city="Durham",
        venue_state="NC",
        quarter="Q2",
        time_remaining="5:30",
        odds=OddsSchema(spread=-3.5, over_under=145.5),
    )
    data = game.model_dump(by_alias=True)
    assert data["eventId"] == "401234567"
    assert data["homeTeam"]["name"] == "Duke"
    assert data["awayTeam"]["abbreviation"] == "UNC"
    assert data["homeScore"] == 45
    assert data["venueCity"] == "Durham"
    assert data["venueState"] == "NC"
    assert data["timeRemaining"] == "5:30"
    assert data["odds"]["overUnder"] == 145.5


def test_game_summary_schema_extends_game():
    summary = GameSummarySchema(
        id="401234567",
        event_id="401234567",
        sport="basketball-college",
        home_team=TeamSchema(name="Duke", abbreviation="DUKE"),
        away_team=TeamSchema(name="UNC", abbreviation="UNC"),
        status="completed",
        start_time="2025-03-15T19:00Z",
        network="ESPN",
        box_score={"teams": []},
        plays=[{"id": "1"}],
        leaders=[{"team": "Duke"}],
    )
    data = summary.model_dump(by_alias=True)
    assert data["boxScore"] == {"teams": []}
    assert data["plays"] == [{"id": "1"}]
    assert data["leaders"] == [{"team": "Duke"}]


def test_schedule_response_schema():
    response = ScheduleResponseSchema(
        games=[
            GameSchema(
                id="1",
                event_id="1",
                sport="football-nfl",
                home_team=TeamSchema(name="Eagles", abbreviation="PHI"),
                away_team=TeamSchema(name="Cowboys", abbreviation="DAL"),
                status="scheduled",
                start_time="2025-09-07T20:00Z",
                network="NBC",
            ),
        ]
    )
    data = response.model_dump(by_alias=True)
    assert len(data["games"]) == 1
    assert data["games"][0]["sport"] == "football-nfl"
