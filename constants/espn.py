"""
ESPN public API constants.

Base URLs, endpoint mappings, and stat configurations for ESPN data.

eg. https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/summary?event=401803377

"""

# ── Base URLs ─────────────────────────────────────────────────────────────────
ESPN_SITE_API = "https://site.api.espn.com/apis/site/v2/sports"
ESPN_API = "https://site.api.espn.com/apis/v2/sports"

# ── Rankings endpoints ────────────────────────────────────────────────────────
RANKINGS_URLS: dict[str, str] = {
    "basketball-college": f"{ESPN_SITE_API}/basketball/mens-college-basketball/rankings",
    "football-college": (f"{ESPN_SITE_API}/football/college-football/rankings"),
}

# ── Standings endpoints ───────────────────────────────────────────────────────
STANDINGS_URLS: dict[str, str] = {
    "nfl": f"{ESPN_API}/football/nfl/standings",
    "mlb": f"{ESPN_API}/baseball/mlb/standings",
    "basketball-college": f"{ESPN_API}/basketball/mens-college-basketball/standings",
}

# ── Standings stat fields to extract per team ─────────────────────────────────
STANDINGS_COMMON_STATS: list[str] = [
    "wins",
    "losses",
    "winPercent",
    "streak",
    "pointsFor",
    "pointsAgainst",
    "pointDifferential",
]

STANDINGS_EXTRA_STATS: dict[str, list[str]] = {
    "nfl": ["ties", "playoffSeed", "clincher"],
    "mlb": [
        "gamesPlayed",
        "gamesBehind",
        "playoffSeed",
        "clincher",
        "homeWins",
        "homeLosses",
        "roadWins",
        "roadLosses",
    ],
    "basketball-college": [
        "leagueWinPercent",
        "gamesBehind",
        "playoffSeed",
    ],
}

# ── Conference ID → short name (from ESPN standings) ─────────────────────────
# Used to resolve conferenceId (scoreboard) and groups.id (summary) to display
# names.  Sourced from the basketball standings endpoint; football conferences
# share the same IDs where they overlap.
CONFERENCE_SHORT_NAMES: dict[str, str] = {
    "1": "Am. East",
    "2": "ACC",
    "3": "A-10",
    "4": "Big East",
    "5": "Big Sky",
    "6": "Big South",
    "7": "Big Ten",
    "8": "Big 12",
    "9": "Big West",
    "10": "CAA",
    "11": "CUSA",
    "12": "Ivy",
    "13": "MAAC",
    "14": "MAC",
    "15": "SEC",  # football ID
    "16": "MEAC",
    "18": "MVC",
    "19": "NEC",
    "20": "OVC",
    "22": "Patriot",
    "23": "SEC",
    "24": "SoCon",
    "25": "Southland",
    "26": "SWAC",
    "27": "Sun Belt",
    "29": "WCC",
    "30": "WAC",
    "44": "Mountain West",
    "45": "Horizon",
    "46": "ASUN",
    "49": "Summit",
    "62": "American",
}

# ── Sport slug mapping ────────────────────────────────────────────────────────
# Maps this API's sport keys to ESPN's {sport}/{league} path segments.
ESPN_SPORT_SLUGS: dict[str, str] = {
    "basketball-college": "basketball/mens-college-basketball",
    "football-college": "football/college-football",
    "football-nfl": "football/nfl",
    "hockey-nhl": "hockey/nhl",
    "baseball-mlb": "baseball/mlb",
    "golf-pga": "golf/pga",
    "golf-liv": "golf/liv",
}

# ── Scoreboard group filters ─────────────────────────────────────────────────
# ESPN's scoreboard returns only a curated subset unless a ``groups`` param is
# provided.  50 = Division I (basketball), 80 = FBS (football).
SCOREBOARD_GROUPS: dict[str, int] = {
    "basketball-college": 50,
    "football-college": 80,
}

# ── Scoreboard endpoints ─────────────────────────────────────────────────────
SCOREBOARD_URLS: dict[str, str] = {
    sport: f"{ESPN_SITE_API}/{slug}/scoreboard"
    for sport, slug in ESPN_SPORT_SLUGS.items()
}

# ── Game summary endpoints ───────────────────────────────────────────────────
SUMMARY_URLS: dict[str, str] = {
    sport: f"{ESPN_SITE_API}/{slug}/summary" for sport, slug in ESPN_SPORT_SLUGS.items()
}
