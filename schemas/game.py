"""Pydantic response schemas for game data."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class TeamSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    id: str | None = None
    name: str
    abbreviation: str
    logo: str | None = None
    color: str | None = None  # ESPN hex color without '#' prefix (e.g. "003087")
    record: str | None = None
    conference_record: str | None = None
    conference: str | None = None
    rank: int | None = None


class OddsSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    spread: float | None = None
    over_under: float | None = None


class PredictorTeamSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    id: str | None = None
    game_projection: float | None = None
    team_chance_loss: float | None = None


class PredictorSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    home_team: PredictorTeamSchema | None = None
    away_team: PredictorTeamSchema | None = None


class GameSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    id: str
    event_id: str
    sport: str
    home_team: TeamSchema
    away_team: TeamSchema
    status: str  # 'scheduled', 'in_progress', 'completed', 'postponed', 'canceled'
    start_time: str  # ISO 8601
    end_time: str | None = None
    network: str
    home_score: int | None = None
    away_score: int | None = None
    venue: str | None = None
    venue_city: str | None = None
    venue_state: str | None = None
    quarter: str | None = None
    time_remaining: str | None = None
    status_detail: str | None = None
    odds: OddsSchema | None = None
    predictor: PredictorSchema | None = None


class GameSummarySchema(GameSchema):
    box_score: dict | None = None
    plays: list | None = None
    leaders: list | None = None


class ScheduleResponseSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    games: list[GameSchema]
