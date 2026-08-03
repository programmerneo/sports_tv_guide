"""Pydantic response schemas for team-list data."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from schemas.game import TeamSchema


class TeamsResponseSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    sport: str
    teams: list[TeamSchema]
