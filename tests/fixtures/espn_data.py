"""Sample ESPN API response data for tests.

These fixtures mirror the structure returned by ESPN's public API
endpoints so that formatting logic can be tested without network calls.
"""

from __future__ import annotations

# ── Scoreboard / Schedule fixtures ───────────────────────────────────────────

SAMPLE_ESPN_EVENT = {
    "id": "401634567",
    "date": "2025-03-15T23:00Z",
    "endDate": "2025-03-16T01:30Z",
    "status": {
        "type": {"state": "post"},
        "period": 2,
    },
    "competitions": [
        {
            "competitors": [
                {
                    "homeAway": "home",
                    "score": "85",
                    "team": {
                        "id": "150",
                        "displayName": "Duke Blue Devils",
                        "abbreviation": "DUKE",
                        "logo": "https://example.com/duke.png",
                        "color": "003087",
                    },
                    "records": [
                        {"summary": "25-5", "name": "overall"},
                        {"summary": "15-3", "name": "vsConf"},
                    ],
                    "curatedRank": {"current": 5},
                },
                {
                    "homeAway": "away",
                    "score": "78",
                    "team": {
                        "id": "153",
                        "displayName": "North Carolina Tar Heels",
                        "abbreviation": "UNC",
                        "logo": "https://example.com/unc.png",
                        "color": "7BAFD4",
                    },
                    "records": [
                        {"summary": "20-10", "name": "overall"},
                        {"summary": "12-6", "name": "vsConf"},
                    ],
                    "curatedRank": {"current": 99},
                },
            ],
            "broadcasts": [{"names": ["ESPN"]}],
            "venue": {
                "fullName": "Cameron Indoor Stadium",
                "address": {"city": "Durham", "state": "NC"},
            },
            "odds": [{"spread": -3.5, "overUnder": 155.5}],
            "status": {"displayClock": "0:00"},
        }
    ],
}

SAMPLE_ESPN_SCOREBOARD = {
    "events": [SAMPLE_ESPN_EVENT],
}

# ── Game summary fixtures ────────────────────────────────────────────────────

SAMPLE_ESPN_SUMMARY = {
    "header": {
        "id": "401634567",
        "competitions": [
            {
                "date": "2025-03-15T23:00Z",
                "status": {
                    "type": {"state": "post"},
                    "period": 2,
                    "displayClock": "0:00",
                },
                "competitors": [
                    {
                        "homeAway": "home",
                        "score": "85",
                        "team": {
                            "id": "150",
                            "displayName": "Duke Blue Devils",
                            "abbreviation": "DUKE",
                            "logo": "https://example.com/duke.png",
                            "color": "003087",
                        },
                        "rank": 5,
                        "record": [{"displayValue": "25-5"}],
                    },
                    {
                        "homeAway": "away",
                        "score": "78",
                        "team": {
                            "id": "153",
                            "displayName": "North Carolina Tar Heels",
                            "abbreviation": "UNC",
                            "logo": "https://example.com/unc.png",
                            "color": "7BAFD4",
                        },
                        "rank": 99,
                        "record": [{"displayValue": "20-10"}],
                    },
                ],
                "broadcasts": [{"names": ["ESPN2"]}],
            }
        ],
    },
    "gameInfo": {
        "venue": {
            "fullName": "Cameron Indoor Stadium",
            "address": {"city": "Durham", "state": "NC"},
        },
    },
    "pickcenter": [{"spread": -3.5, "overUnder": 155.5}],
    "boxscore": {
        "teams": [
            {
                "homeAway": "home",
                "team": {"id": "150", "displayName": "Duke Blue Devils"},
                "statistics": [
                    {
                        "name": "fieldGoalsMade-fieldGoalsAttempted",
                        "displayValue": "30-60",
                        "label": "FG",
                    },
                    {
                        "name": "threePointFieldGoalsMade-threePointFieldGoalsAttempted",
                        "displayValue": "5-15",
                        "label": "3PT",
                    },
                    {
                        "name": "freeThrowsMade-freeThrowsAttempted",
                        "displayValue": "20-25",
                        "label": "FT",
                    },
                    {
                        "name": "totalRebounds",
                        "displayValue": "35",
                        "label": "Rebounds",
                    },
                    {"name": "assists", "displayValue": "18", "label": "Assists"},
                    {"name": "turnovers", "displayValue": "10", "label": "Turnovers"},
                    {"name": "steals", "displayValue": "7", "label": "Steals"},
                    {"name": "blocks", "displayValue": "4", "label": "Blocks"},
                    {"name": "fouls", "displayValue": "15", "label": "Fouls"},
                ],
            },
            {
                "homeAway": "away",
                "team": {"id": "153", "displayName": "North Carolina Tar Heels"},
                "statistics": [
                    {
                        "name": "fieldGoalsMade-fieldGoalsAttempted",
                        "displayValue": "28-62",
                        "label": "FG",
                    },
                    {
                        "name": "threePointFieldGoalsMade-threePointFieldGoalsAttempted",
                        "displayValue": "8-20",
                        "label": "3PT",
                    },
                    {
                        "name": "freeThrowsMade-freeThrowsAttempted",
                        "displayValue": "14-18",
                        "label": "FT",
                    },
                    {
                        "name": "totalRebounds",
                        "displayValue": "30",
                        "label": "Rebounds",
                    },
                    {"name": "assists", "displayValue": "15", "label": "Assists"},
                    {"name": "turnovers", "displayValue": "12", "label": "Turnovers"},
                    {"name": "steals", "displayValue": "5", "label": "Steals"},
                    {"name": "blocks", "displayValue": "3", "label": "Blocks"},
                    {"name": "fouls", "displayValue": "20", "label": "Fouls"},
                ],
            },
        ],
    },
    "plays": [{"id": "1", "text": "Jump ball"}],
    "leaders": [{"team": {"id": "150"}}],
}

# ── Baseball boxscore fixture ────────────────────────────────────────────────
# ESPN MLB uses a nested category structure instead of flat stats.

SAMPLE_ESPN_MLB_BOXSCORE = {
    "teams": [
        {
            "homeAway": "home",
            "team": {"id": "15", "displayName": "Atlanta Braves"},
            "statistics": [
                {
                    "name": "batting",
                    "stats": [
                        {"name": "runs", "displayValue": "5", "abbreviation": "R"},
                        {"name": "hits", "displayValue": "9", "abbreviation": "H"},
                        {"name": "homeRuns", "displayValue": "2", "abbreviation": "HR"},
                        {"name": "RBIs", "displayValue": "5", "abbreviation": "RBI"},
                        {"name": "walks", "displayValue": "3", "abbreviation": "BB"},
                        {
                            "name": "strikeouts",
                            "displayValue": "12",
                            "abbreviation": "K",
                        },
                        {
                            "name": "stolenBases",
                            "displayValue": "1",
                            "abbreviation": "SB",
                        },
                        {"name": "avg", "displayValue": ".273", "abbreviation": "AVG"},
                    ],
                },
                {
                    "name": "pitching",
                    "stats": [
                        {"name": "ERA", "displayValue": "3.00", "abbreviation": "ERA"},
                        {
                            "name": "innings",
                            "displayValue": "9.0",
                            "abbreviation": "IP",
                        },
                        {
                            "name": "strikeouts",
                            "displayValue": "10",
                            "abbreviation": "K",
                        },
                        {"name": "walks", "displayValue": "2", "abbreviation": "BB"},
                        {"name": "hits", "displayValue": "7", "abbreviation": "H"},
                        {
                            "name": "earnedRuns",
                            "displayValue": "3",
                            "abbreviation": "ER",
                        },
                    ],
                },
                {
                    "name": "fielding",
                    "stats": [
                        {"name": "errors", "displayValue": "0", "abbreviation": "E"},
                    ],
                },
            ],
        },
        {
            "homeAway": "away",
            "team": {"id": "30", "displayName": "Tampa Bay Rays"},
            "statistics": [
                {
                    "name": "batting",
                    "stats": [
                        {"name": "runs", "displayValue": "3", "abbreviation": "R"},
                        {"name": "hits", "displayValue": "7", "abbreviation": "H"},
                        {"name": "homeRuns", "displayValue": "1", "abbreviation": "HR"},
                        {"name": "RBIs", "displayValue": "3", "abbreviation": "RBI"},
                        {"name": "walks", "displayValue": "2", "abbreviation": "BB"},
                        {
                            "name": "strikeouts",
                            "displayValue": "8",
                            "abbreviation": "K",
                        },
                        {
                            "name": "stolenBases",
                            "displayValue": "0",
                            "abbreviation": "SB",
                        },
                        {"name": "avg", "displayValue": ".206", "abbreviation": "AVG"},
                    ],
                },
                {
                    "name": "pitching",
                    "stats": [
                        {"name": "ERA", "displayValue": "5.63", "abbreviation": "ERA"},
                        {
                            "name": "innings",
                            "displayValue": "8.0",
                            "abbreviation": "IP",
                        },
                        {
                            "name": "strikeouts",
                            "displayValue": "12",
                            "abbreviation": "K",
                        },
                        {"name": "walks", "displayValue": "3", "abbreviation": "BB"},
                        {"name": "hits", "displayValue": "9", "abbreviation": "H"},
                        {
                            "name": "earnedRuns",
                            "displayValue": "5",
                            "abbreviation": "ER",
                        },
                    ],
                },
                {
                    "name": "fielding",
                    "stats": [
                        {"name": "errors", "displayValue": "2", "abbreviation": "E"},
                    ],
                },
            ],
        },
    ],
}

# ── Baseball summary with probable pitchers ─────────────────────────────────
# ESPN includes a ``probables`` array on each competitor for scheduled MLB games.

SAMPLE_ESPN_MLB_SUMMARY = {
    "header": {
        "id": "401654321",
        "competitions": [
            {
                "date": "2025-07-10T23:10Z",
                "status": {
                    "type": {"state": "pre"},
                    "displayClock": "0:00",
                },
                "competitors": [
                    {
                        "homeAway": "home",
                        "team": {
                            "id": "15",
                            "displayName": "Atlanta Braves",
                            "abbreviation": "ATL",
                            "logo": "https://example.com/atl.png",
                            "color": "CE1141",
                        },
                        "record": [{"displayValue": "45-38"}],
                        "probables": [
                            {
                                "name": "probableStartingPitcher",
                                "playerId": 33912,
                                "athlete": {
                                    "id": "33912",
                                    "displayName": "Max Fried",
                                    "shortName": "M. Fried",
                                    "headshot": {
                                        "href": "https://example.com/fried.png",
                                        "alt": "Max Fried",
                                    },
                                    "jersey": "32",
                                },
                                "statistics": {
                                    "splits": {
                                        "categories": [
                                            {
                                                "name": "strikeouts",
                                                "abbreviation": "K",
                                                "displayValue": "95",
                                            },
                                            {
                                                "name": "losses",
                                                "abbreviation": "L",
                                                "displayValue": "5",
                                            },
                                            {
                                                "name": "wins",
                                                "abbreviation": "W",
                                                "displayValue": "10",
                                            },
                                            {
                                                "name": "ERA",
                                                "abbreviation": "ERA",
                                                "displayValue": "3.25",
                                            },
                                            {
                                                "name": "WHIP",
                                                "abbreviation": "WHIP",
                                                "displayValue": "1.12",
                                            },
                                        ]
                                    }
                                },
                            }
                        ],
                    },
                    {
                        "homeAway": "away",
                        "team": {
                            "id": "30",
                            "displayName": "Tampa Bay Rays",
                            "abbreviation": "TB",
                            "logo": "https://example.com/tb.png",
                            "color": "092C5C",
                        },
                        "record": [{"displayValue": "40-43"}],
                        "probables": [
                            {
                                "name": "probableStartingPitcher",
                                "playerId": 34567,
                                "athlete": {
                                    "id": "34567",
                                    "displayName": "Shane McClanahan",
                                    "shortName": "S. McClanahan",
                                    "headshot": {
                                        "href": "https://example.com/mcclanahan.png",
                                        "alt": "Shane McClanahan",
                                    },
                                    "jersey": "18",
                                },
                                "statistics": {
                                    "splits": {
                                        "categories": [
                                            {
                                                "name": "strikeouts",
                                                "abbreviation": "K",
                                                "displayValue": "72",
                                            },
                                            {
                                                "name": "losses",
                                                "abbreviation": "L",
                                                "displayValue": "3",
                                            },
                                            {
                                                "name": "wins",
                                                "abbreviation": "W",
                                                "displayValue": "8",
                                            },
                                            {
                                                "name": "ERA",
                                                "abbreviation": "ERA",
                                                "displayValue": "2.87",
                                            },
                                            {
                                                "name": "WHIP",
                                                "abbreviation": "WHIP",
                                                "displayValue": "0.96",
                                            },
                                        ]
                                    }
                                },
                            }
                        ],
                    },
                ],
                "broadcasts": [{"names": ["TBS"]}],
            }
        ],
    },
    "gameInfo": {
        "venue": {
            "fullName": "Truist Park",
            "address": {"city": "Atlanta", "state": "GA"},
        },
    },
    "pickcenter": [],
    "boxscore": {"teams": SAMPLE_ESPN_MLB_BOXSCORE["teams"]},
}

# ── Win probability fixture (live / completed games) ────────────────────────
# ESPN replaces "predictor" with "winprobability" once a game is in progress.
# Each entry represents a play; the last entry is the most recent probability.

SAMPLE_ESPN_WINPROBABILITY = [
    {"homeWinPercentage": 0.5, "tiePercentage": 0.0, "playId": "401634567001"},
    {"homeWinPercentage": 0.62, "tiePercentage": 0.0, "playId": "401634567050"},
    {"homeWinPercentage": 0.85, "tiePercentage": 0.0, "playId": "401634567200"},
]

# ── Predictor fixture (scheduled games) ─────────────────────────────────────

SAMPLE_ESPN_PREDICTOR = {
    "header": "Matchup Predictor",
    "homeTeam": {"id": "150", "gameProjection": "76.4", "teamChanceLoss": "23.6"},
    "awayTeam": {"id": "153", "gameProjection": "23.6", "teamChanceLoss": "76.4"},
}

# ── Standings fixtures ────────────────────────────────────────────────────────


def _make_team_entry(display_name, short_name, abbreviation, logo, stats):
    """Build a minimal ESPN standings entry."""
    return {
        "team": {
            "displayName": display_name,
            "shortDisplayName": short_name,
            "abbreviation": abbreviation,
            "logos": [{"href": logo}],
        },
        "stats": [{"name": k, "displayValue": v} for k, v in stats.items()],
    }


# Flat structure (NHL/NFL style) — each child is a division with direct entries
SAMPLE_ESPN_STANDINGS_FLAT = {
    "name": "National Hockey League",
    "seasons": [{"displayName": "2025-26"}],
    "children": [
        {
            "name": "Atlantic Division",
            "abbreviation": "ATL",
            "standings": {
                "entries": [
                    _make_team_entry(
                        "Boston Bruins",
                        "Boston",
                        "BOS",
                        "https://example.com/bos.png",
                        {
                            "wins": "40",
                            "losses": "20",
                            "points": "93",
                            "gamesPlayed": "62",
                            "overtimeLosses": "2",
                            "pointsFor": "210",
                            "pointsAgainst": "175",
                        },
                    ),
                ]
            },
        },
        {
            "name": "Metropolitan Division",
            "abbreviation": "MET",
            "standings": {
                "entries": [
                    _make_team_entry(
                        "New York Rangers",
                        "NY Rangers",
                        "NYR",
                        "https://example.com/nyr.png",
                        {
                            "wins": "38",
                            "losses": "22",
                            "points": "88",
                            "gamesPlayed": "62",
                            "overtimeLosses": "2",
                            "pointsFor": "198",
                            "pointsAgainst": "180",
                        },
                    ),
                ]
            },
        },
    ],
}

# Nested structure (MLB style) — children are league containers with sub-children
SAMPLE_ESPN_STANDINGS_NESTED = {
    "name": "MLB",
    "seasons": [{"displayName": "2025"}],
    "children": [
        {
            "name": "American League",
            "children": [
                {
                    "name": "American League East",
                    "abbreviation": "ALE",
                    "standings": {
                        "entries": [
                            _make_team_entry(
                                "New York Yankees",
                                "NY Yankees",
                                "NYY",
                                "https://example.com/nyy.png",
                                {
                                    "wins": "55",
                                    "losses": "30",
                                    "winPercent": ".647",
                                    "gamesBehind": "0",
                                    "gamesPlayed": "85",
                                    "homeWins": "28",
                                    "homeLosses": "14",
                                    "roadWins": "27",
                                    "roadLosses": "16",
                                },
                            ),
                        ]
                    },
                },
            ],
        },
        {
            "name": "National League",
            "children": [
                {
                    "name": "National League East",
                    "abbreviation": "NLE",
                    "standings": {
                        "entries": [
                            _make_team_entry(
                                "Atlanta Braves",
                                "Atlanta",
                                "ATL",
                                "https://example.com/atl.png",
                                {
                                    "wins": "50",
                                    "losses": "35",
                                    "winPercent": ".588",
                                    "gamesBehind": "0",
                                    "gamesPlayed": "85",
                                    "homeWins": "25",
                                    "homeLosses": "17",
                                    "roadWins": "25",
                                    "roadLosses": "18",
                                },
                            ),
                        ]
                    },
                },
            ],
        },
    ],
}

# NFL entry with ties (used to test the W-L-T record string)
SAMPLE_NFL_ENTRY_WITH_TIES = _make_team_entry(
    "Philadelphia Eagles",
    "Philadelphia",
    "PHI",
    "https://example.com/phi.png",
    {
        "wins": "14",
        "losses": "3",
        "ties": "1",
        "winPercent": ".806",
        "pointsFor": "477",
        "pointsAgainst": "344",
    },
)

# NFL entry without ties
SAMPLE_NFL_ENTRY_NO_TIES = _make_team_entry(
    "Kansas City Chiefs",
    "Kansas City",
    "KC",
    "https://example.com/kc.png",
    {
        "wins": "15",
        "losses": "2",
        "ties": "0",
        "winPercent": ".882",
        "pointsFor": "496",
        "pointsAgainst": "275",
    },
)
