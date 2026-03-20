"""Pydantic response schemas for March Madness bracket data."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class BracketTeamSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    is_home: bool = False
    is_top: bool = False
    is_winner: bool = False
    logo_url: str = ""
    score: int | None = None
    seed: int | None = None
    name_short: str = ""
    name_full: str = ""


class BracketBroadcasterSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    name: str


class BracketGameSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    contest_id: int
    bracket_position_id: int
    game_state: str  # 'F' = final, 'I' = in-progress, 'P' = pre-game
    contest_clock: str = ""
    current_period: str = ""
    has_start_time: bool = False
    start_time: str = ""
    start_time_epoch: int = 0
    teams: list[BracketTeamSchema] = []
    broadcaster: BracketBroadcasterSchema | None = None


class BracketRoundColumn(BaseModel):
    """A column of games within a bracket view (one round)."""

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    label: str
    subtitle: str = ""
    games: list[BracketGameSchema] = []


class BracketTabSchema(BaseModel):
    """A region/section tab in the bracket UI."""

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    section_id: int
    label: str
    region_code: str
    is_enabled: bool = False
    live_count: int = 0
    rounds: list[BracketRoundColumn] = []


class BracketResponseSchema(BaseModel):
    """Top-level bracket response with all data pre-parsed for the frontend."""

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    title: str = ""
    year: int = 0
    championship_info: str | None = None
    default_tab_section_id: int | None = None
    tabs: list[BracketTabSchema] = []
