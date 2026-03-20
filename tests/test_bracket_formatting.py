"""Tests for BracketService formatting methods."""

from __future__ import annotations

import pytest

from services.bracket_service import BracketService
from tests.fixtures.ncaa_bracket_data import (
    SAMPLE_NCAA_BRACKET_RESPONSE,
    SAMPLE_NCAA_EMPTY_RESPONSE,
)


@pytest.fixture()
def formatted():
    """Pre-formatted bracket response for reuse across tests."""
    return BracketService.format_bracket(SAMPLE_NCAA_BRACKET_RESPONSE)


# --- Top-level fields ---


def test_format_bracket_title(formatted):
    assert formatted["title"] == "NCAA Division I Men's Basketball Championship 2026"


def test_format_bracket_year(formatted):
    assert formatted["year"] == 2026


def test_format_bracket_tab_count(formatted):
    assert len(formatted["tabs"]) == 4


# --- Empty response ---


def test_format_bracket_empty():
    result = BracketService.format_bracket(SAMPLE_NCAA_EMPTY_RESPONSE)
    assert result["tabs"] == []
    assert result["title"] == ""


# --- Tab labels ---


def test_region_tab_labels(formatted):
    labels = [t["label"] for t in formatted["tabs"]]
    assert "East" in labels
    assert "West" in labels


def test_first_four_tab_label(formatted):
    ff_tab = next(t for t in formatted["tabs"] if t["regionCode"] == "TT")
    assert ff_tab["label"] == "Play-in Games"


def test_final_four_tab_label(formatted):
    cc_tab = next(t for t in formatted["tabs"] if t["regionCode"] == "CC")
    # Derived from round 6 title with HTML entity stripped
    assert "Final Four" in cc_tab["label"]


# --- Enabled / live counts ---


def test_enabled_tabs(formatted):
    east = next(t for t in formatted["tabs"] if t["label"] == "East")
    west = next(t for t in formatted["tabs"] if t["label"] == "West")
    assert east["isEnabled"] is True  # has final games
    assert west["isEnabled"] is True  # has live game


def test_live_count(formatted):
    west = next(t for t in formatted["tabs"] if t["label"] == "West")
    assert west["liveCount"] == 1

    east = next(t for t in formatted["tabs"] if t["label"] == "East")
    assert east["liveCount"] == 0


# --- Default tab selection ---


def test_default_tab_is_live_section(formatted):
    # West has a live game, so it should be default
    assert formatted["defaultTabSectionId"] == 2


def test_default_tab_no_live_games():
    """When no live games, default to last enabled tab."""
    # Modify fixture: change the live game to final
    import copy

    data = copy.deepcopy(SAMPLE_NCAA_BRACKET_RESPONSE)
    for game in data["championships"][0]["games"]:
        if game["gameState"] == "I":
            game["gameState"] = "F"

    result = BracketService.format_bracket(data)
    # Should pick last enabled tab (First Four section 5 has a final game)
    assert result["defaultTabSectionId"] is not None


# --- Region rounds ---


def test_east_region_rounds(formatted):
    east = next(t for t in formatted["tabs"] if t["label"] == "East")
    rounds = east["rounds"]
    assert len(rounds) == 2  # first round + second round
    assert rounds[0]["label"] == "First Round"
    assert rounds[1]["label"] == "Second Round"


def test_east_first_round_games(formatted):
    east = next(t for t in formatted["tabs"] if t["label"] == "East")
    first_round = east["rounds"][0]
    assert len(first_round["games"]) == 2
    # Sorted by bracketPositionId
    assert first_round["games"][0]["bracketPositionId"] == 201
    assert first_round["games"][1]["bracketPositionId"] == 202


def test_round_subtitle(formatted):
    east = next(t for t in formatted["tabs"] if t["label"] == "East")
    assert east["rounds"][0]["subtitle"] == "Mar 20-21"


# --- Game formatting ---


def test_game_teams_formatted(formatted):
    east = next(t for t in formatted["tabs"] if t["label"] == "East")
    game = east["rounds"][0]["games"][0]
    assert len(game["teams"]) == 2
    top = next(t for t in game["teams"] if t["isTop"])
    assert top["nameShort"] == "Duke"
    assert top["seed"] == 1
    assert top["score"] == 85
    assert top["isWinner"] is True


def test_game_broadcaster(formatted):
    ff_tab = next(t for t in formatted["tabs"] if t["regionCode"] == "TT")
    game = ff_tab["rounds"][0]["games"][0]
    assert game["broadcaster"] == {"name": "truTV"}


def test_game_no_broadcaster(formatted):
    east = next(t for t in formatted["tabs"] if t["label"] == "East")
    game = east["rounds"][0]["games"][0]
    assert game["broadcaster"] is None


# --- Final Four ---


def test_final_four_rounds(formatted):
    cc_tab = next(t for t in formatted["tabs"] if t["regionCode"] == "CC")
    rounds = cc_tab["rounds"]
    assert len(rounds) == 2
    assert rounds[0]["label"] == "Semifinals"
    assert rounds[1]["label"] == "Championship"


def test_final_four_semis(formatted):
    cc_tab = next(t for t in formatted["tabs"] if t["regionCode"] == "CC")
    semis = cc_tab["rounds"][0]
    assert len(semis["games"]) == 2


# --- First Four ---


def test_first_four_games(formatted):
    tt_tab = next(t for t in formatted["tabs"] if t["regionCode"] == "TT")
    assert len(tt_tab["rounds"]) == 1
    assert tt_tab["rounds"][0]["label"] == "Play-in Games"
    assert len(tt_tab["rounds"][0]["games"]) == 1


# --- Championship info ---


def test_championship_info(formatted):
    info = formatted["championshipInfo"]
    assert info is not None
    assert "National Championship" in info
    assert "TBS" in info


# --- HTML entity cleaning ---


def test_clean_title_strips_entities():
    assert BracketService._clean_title("Final Four&#174;") == "Final Four\u00ae"


def test_clean_title_strips_numeric_entities():
    assert BracketService._clean_title("Test&#8212;Value") == "Test\u2014Value"


def test_clean_title_empty():
    assert BracketService._clean_title("") == ""
    assert BracketService._clean_title("  ") == ""
