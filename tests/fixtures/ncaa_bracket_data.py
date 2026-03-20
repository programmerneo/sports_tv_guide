"""Sample NCAA bracket API response data for tests.

Mirrors the structure returned by the NCAA GraphQL endpoint
(sdataprod.ncaa.com) so that BracketService formatting can be
tested without network calls.
"""

from __future__ import annotations

# Minimal bracket data with two regions, Final Four, and First Four sections.

_TEAM_DUKE_TOP = {
    "isHome": False,
    "isTop": True,
    "isWinner": True,
    "isVisible": True,
    "logoUrl": "https://example.com/duke.png",
    "score": 85,
    "seed": 1,
    "nameShort": "Duke",
    "nameFull": "Duke Blue Devils",
    "seoname": "duke",
    "textOverride": None,
}

_TEAM_UNC_BOTTOM = {
    "isHome": True,
    "isTop": False,
    "isWinner": False,
    "isVisible": True,
    "logoUrl": "https://example.com/unc.png",
    "score": 78,
    "seed": 8,
    "nameShort": "UNC",
    "nameFull": "North Carolina Tar Heels",
    "seoname": "north-carolina",
    "textOverride": None,
}

_TEAM_KANSAS_TOP = {
    "isHome": False,
    "isTop": True,
    "isWinner": False,
    "isVisible": True,
    "logoUrl": "https://example.com/kansas.png",
    "score": 70,
    "seed": 2,
    "nameShort": "Kansas",
    "nameFull": "Kansas Jayhawks",
    "seoname": "kansas",
    "textOverride": None,
}

_TEAM_BAYLOR_BOTTOM = {
    "isHome": True,
    "isTop": False,
    "isWinner": True,
    "isVisible": True,
    "logoUrl": "https://example.com/baylor.png",
    "score": 75,
    "seed": 7,
    "nameShort": "Baylor",
    "nameFull": "Baylor Bears",
    "seoname": "baylor",
    "textOverride": None,
}

_TEAM_TBD = {
    "isHome": False,
    "isTop": True,
    "isWinner": False,
    "isVisible": True,
    "logoUrl": "",
    "score": None,
    "seed": None,
    "nameShort": "TBD",
    "nameFull": "TBD",
    "seoname": "",
    "textOverride": None,
}


def _make_game(
    contest_id: int,
    bracket_pos: int,
    section_id: int,
    teams: list[dict],
    game_state: str = "F",
    victor_pos: int | None = None,
    epoch: int = 1711000000,
    broadcaster_name: str | None = None,
) -> dict:
    broadcaster = {"name": broadcaster_name} if broadcaster_name else None
    return {
        "contestId": contest_id,
        "bracketPositionId": bracket_pos,
        "bracketId": 1,
        "victorBracketPositionId": victor_pos,
        "contestClock": "",
        "currentPeriod": "",
        "finalMessage": "FINAL" if game_state == "F" else "",
        "gameState": game_state,
        "statusCodeDisplay": "",
        "liveVideoEnabled": False,
        "hasStartTime": True,
        "startDate": "2026-03-20",
        "startTime": "7:00 PM ET",
        "startTimeEpoch": epoch,
        "sectionId": section_id,
        "title": "",
        "url": "",
        "enabled": True,
        "visible": True,
        "teams": teams,
        "broadcaster": broadcaster,
    }


# Section 1 = East region, Section 2 = West region
# Section 5 = First Four (TT), Section 6 = Final Four (CC)

# East region: 2 first-round games feeding into 1 second-round game
EAST_GAME_1 = _make_game(
    contest_id=101,
    bracket_pos=201,
    section_id=1,
    teams=[_TEAM_DUKE_TOP, _TEAM_UNC_BOTTOM],
    victor_pos=301,
)
EAST_GAME_2 = _make_game(
    contest_id=102,
    bracket_pos=202,
    section_id=1,
    teams=[_TEAM_KANSAS_TOP, _TEAM_BAYLOR_BOTTOM],
    victor_pos=301,
)
EAST_GAME_ROUND2 = _make_game(
    contest_id=103,
    bracket_pos=301,
    section_id=1,
    teams=[_TEAM_DUKE_TOP, _TEAM_BAYLOR_BOTTOM],
    victor_pos=None,
)

# Live game in West region
WEST_LIVE_GAME = _make_game(
    contest_id=201,
    bracket_pos=203,
    section_id=2,
    teams=[_TEAM_KANSAS_TOP, _TEAM_UNC_BOTTOM],
    game_state="I",
    victor_pos=302,
)

# Pre-game in West
WEST_PRE_GAME = _make_game(
    contest_id=202,
    bracket_pos=204,
    section_id=2,
    teams=[_TEAM_TBD, _TEAM_TBD],
    game_state="P",
    victor_pos=302,
)

# Final Four (section 6)
FF_SEMI_1 = _make_game(
    contest_id=601,
    bracket_pos=601,
    section_id=6,
    teams=[_TEAM_DUKE_TOP, _TEAM_BAYLOR_BOTTOM],
    game_state="P",
    victor_pos=701,
    broadcaster_name="TBS",
)
FF_SEMI_2 = _make_game(
    contest_id=602,
    bracket_pos=602,
    section_id=6,
    teams=[_TEAM_KANSAS_TOP, _TEAM_UNC_BOTTOM],
    game_state="P",
    victor_pos=701,
    broadcaster_name="TBS",
)
FF_CHAMPIONSHIP = _make_game(
    contest_id=701,
    bracket_pos=701,
    section_id=6,
    teams=[_TEAM_TBD, _TEAM_TBD],
    game_state="P",
    epoch=1711200000,
    broadcaster_name="TBS",
)

# First Four (section 5)
FIRST_FOUR_GAME = _make_game(
    contest_id=501,
    bracket_pos=101,
    section_id=5,
    teams=[_TEAM_KANSAS_TOP, _TEAM_UNC_BOTTOM],
    broadcaster_name="truTV",
)

SAMPLE_NCAA_BRACKET_RESPONSE = {
    "championships": [
        {
            "title": "NCAA Division I Men's Basketball Championship 2026",
            "year": 2026,
            "season": 2026,
            "sportUrl": "basketball-men",
            "championshipId": 1,
            "divisionName": "Division I",
            "games": [
                EAST_GAME_1,
                EAST_GAME_2,
                EAST_GAME_ROUND2,
                WEST_LIVE_GAME,
                WEST_PRE_GAME,
                FF_SEMI_1,
                FF_SEMI_2,
                FF_CHAMPIONSHIP,
                FIRST_FOUR_GAME,
            ],
            "rounds": [
                {
                    "id": "1",
                    "roundNumber": 1,
                    "label": "First Four",
                    "staged": False,
                    "subtitle": "Mar 18-19",
                    "title": "First Four",
                },
                {
                    "id": "2",
                    "roundNumber": 2,
                    "label": "R64",
                    "staged": False,
                    "subtitle": "Mar 20-21",
                    "title": "First Round",
                },
                {
                    "id": "3",
                    "roundNumber": 3,
                    "label": "R32",
                    "staged": False,
                    "subtitle": "Mar 22-23",
                    "title": "Second Round",
                },
                {
                    "id": "4",
                    "roundNumber": 4,
                    "label": "S16",
                    "staged": False,
                    "subtitle": "Mar 27-28",
                    "title": "Sweet 16",
                },
                {
                    "id": "5",
                    "roundNumber": 5,
                    "label": "E8",
                    "staged": False,
                    "subtitle": "Mar 29-30",
                    "title": "Elite Eight",
                },
                {
                    "id": "6",
                    "roundNumber": 6,
                    "label": "FF",
                    "staged": False,
                    "subtitle": "Apr 5",
                    "title": "Final Four&#174;",
                },
                {
                    "id": "7",
                    "roundNumber": 7,
                    "label": "NC",
                    "staged": False,
                    "subtitle": "Apr 7",
                    "title": "National Championship",
                },
            ],
            "regions": [
                {
                    "id": "r1",
                    "abbreviation": "East",
                    "title": "East",
                    "subtitle": "",
                    "sectionId": 1,
                    "regionCode": "E",
                },
                {
                    "id": "r2",
                    "abbreviation": "West",
                    "title": "West",
                    "subtitle": "",
                    "sectionId": 2,
                    "regionCode": "W",
                },
                {
                    "id": "r5",
                    "abbreviation": "TT",
                    "title": "",
                    "subtitle": "",
                    "sectionId": 5,
                    "regionCode": "TT",
                },
                {
                    "id": "r6",
                    "abbreviation": "CC",
                    "title": "",
                    "subtitle": "",
                    "sectionId": 6,
                    "regionCode": "CC",
                },
            ],
        }
    ],
}

SAMPLE_NCAA_EMPTY_RESPONSE = {
    "championships": [],
}
