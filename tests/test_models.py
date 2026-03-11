"""
Tests for data models and code lookups.
"""

from __future__ import annotations

from datetime import datetime

import pytest

from schemas.codes import (
    SPORTS,
    get_division_code,
    get_season_year,
)


def test_get_division_code_football():
    assert get_division_code("football", "fbs") == 11
    assert get_division_code("football", "fcs") == 12


def test_get_division_code_basketball():
    assert get_division_code("basketball-men", "d1") == 1


def test_get_division_code_invalid_sport():
    with pytest.raises(ValueError, match="not supported"):
        get_division_code("quidditch", "d1")


def test_get_season_year_fall():
    # September 2025 → season 2025
    assert get_season_year(datetime(2025, 9, 1)) == 2025


def test_get_season_year_spring():
    # March 2025 → season 2024
    assert get_season_year(datetime(2025, 3, 1)) == 2024


def test_sports_dict_has_expected_entries():
    assert "football" in SPORTS
    assert "basketball-men" in SPORTS
    assert "baseball" in SPORTS
    assert SPORTS["football"].code == "MFB"
