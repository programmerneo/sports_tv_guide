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
