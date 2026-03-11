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
    "boxscore": {"teams": [{"team": {"id": "150"}}]},
    "plays": [{"id": "1", "text": "Jump ball"}],
    "leaders": [{"team": {"id": "150"}}],
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
