"""
Sport codes and division mappings.

Ported from the original TypeScript ``codes.ts``.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal

# ---------------------------------------------------------------------------
# Sport → internal code / division mapping
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class SportConfig:
    code: str
    divisions: dict[str, int] = field(default_factory=dict)


SPORTS: dict[str, SportConfig] = {
    # -- Fall --
    "football": SportConfig(
        code="MFB",
        divisions={"fbs": 11, "fcs": 12},
    ),
    "soccer-men": SportConfig(
        code="MSO",
        divisions={"d1": 1, "d2": 2, "d3": 3},
    ),
    "waterpolo-men": SportConfig(
        code="MWP",
        divisions={"d1": 1},
    ),
    # -- Winter --
    "basketball-men": SportConfig(
        code="MBB",
        divisions={"d1": 1, "d2": 2, "d3": 3},
    ),
    "icehockey-men": SportConfig(
        code="MIH",
        divisions={"d1": 1, "d3": 3},
    ),
    # -- Spring --
    "baseball": SportConfig(
        code="MBA",
        divisions={"d1": 1, "d2": 2, "d3": 3},
    ),
    "lacrosse-men": SportConfig(
        code="MLA",
        divisions={"d1": 1, "d2": 2, "d3": 3},
    ),
    "volleyball-men": SportConfig(
        code="MVB",
        divisions={"d1": 1, "d3": 3},
    ),
}

SUPPORTED_SPORTS: list[str] = list(SPORTS.keys())

DivisionKey = Literal["fbs", "fcs", "d1", "d2", "d3"]

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------


def get_division_code(sport: str, division: str) -> int | str:
    """Return the numeric division code for a sport + division pair."""
    cfg = SPORTS.get(sport)
    if cfg is None:
        raise ValueError(f"{sport} {division} is not supported")
    return cfg.divisions.get(division, division)


def get_season_year(date: datetime) -> int:
    """
    NCAA season year flips in August.
    Months 0-6 (Jan–Jul) belong to the *previous* year's season.
    """
    return date.year - 1 if date.month < 8 else date.year
