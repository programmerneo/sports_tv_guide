/**
 * Core types for Sports TV Guide application
 */

export type SportType =
  | 'basketball-college'
  | 'football-college'
  | 'football-nfl'
  | 'golf-pga'
  | 'golf-liv'
  | 'hockey-nhl'
  | 'baseball-mlb';

export type GameStatus = 'scheduled' | 'in_progress' | 'completed' | 'postponed' | 'canceled';

export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  logo?: string;
  color?: string;
  record?: string;
  conferenceRecord?: string;
  conference?: string;
  rank?: number;
}

export interface Game {
  id: string;
  eventId: string;
  sport: SportType;
  homeTeam: Team;
  awayTeam: Team;
  status: GameStatus;
  startTime: string; // ISO 8601 format
  endTime?: string;
  network: string;
  homeScore?: number;
  awayScore?: number;
  venue?: string;
  venueCity?: string;
  venueState?: string;
  quarter?: string;
  timeRemaining?: string;
  statusDetail?: string;
  odds?: {
    spread?: number;
    overUnder?: number;
  };
  predictor?: {
    homeTeam?: {
      id?: string;
      gameProjection?: number;
      teamChanceLoss?: number;
    };
    awayTeam?: {
      id?: string;
      gameProjection?: number;
      teamChanceLoss?: number;
    };
  };
}

export interface PitcherInfo {
  name: string;
  shortName: string;
  headshot?: string;
  jersey?: string;
  statistics: StatEntry[];
}

export interface StartingPitchers {
  away: PitcherInfo | null;
  home: PitcherInfo | null;
}

export interface GameSummary extends Game {
  boxScore?: BoxScore;
  startingPitchers?: StartingPitchers;
  plays?: Play[];
  leaders?: TeamLeaders;
  articles?: Article[];
}

export interface BoxScore {
  homeTeamStats: TeamStats;
  awayTeamStats: TeamStats;
}

export interface StatEntry {
  label: string;
  displayValue: string;
}

export interface TeamStats {
  teamId: string;
  teamName: string;
  statistics: StatEntry[];
}

export interface Play {
  id: string;
  period: number;
  clock?: string;
  description: string;
  score?: {
    homeTeam: number;
    awayTeam: number;
  };
}

export interface PlayerStats {
  id: string;
  name: string;
  position?: string;
  jerseyNumber?: number;
  points: number;
  rebounds?: number;
  assists?: number;
  steals?: number;
  blocks?: number;
  turnovers?: number;
}

export interface TeamLeaders {
  home: {
    teamId: string;
    players: PlayerStats[];
  };
  away: {
    teamId: string;
    players: PlayerStats[];
  };
}

export interface Article {
  id: string;
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  publishedAt: string;
}

export interface GolfLeaderboardEntry {
  position: string | number;
  name: string;
  country: string;
  countryFlag?: string;
  totalScore: string;
  totalStrokes?: number | null;
  toPar: string;
  today: string;
  thru: string;
  rounds: string[];
}

export interface GolfLeaderboard {
  tournamentName: string;
  statusDetail: string;
  leaderboard: GolfLeaderboardEntry[];
  courseName?: string;
  coursePar?: number;
  courseYards?: number;
  courseCity?: string;
  courseState?: string;
  displayPurse?: string;
  previousWinner?: string;
}

export interface Scoreboard {
  events: Game[];
  leagues: {
    id: string;
    name: string;
    season: number;
    seasonType: number;
  };
}

export interface UserPreferences {
  favoriteTeams: string[]; // Team IDs
  favoriteGames: string[]; // Game IDs
  timezone: string;
  notificationsEnabled: boolean;
  darkModeEnabled: boolean;
  selectedSports: SportType[];
}
