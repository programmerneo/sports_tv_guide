/**
 * AUTO-GENERATED — DO NOT EDIT
 *
 * Generated from Pydantic schemas in schemas/game.py
 * Run: uv run python scripts/generate_types.py
 */


export interface TeamSchema {
  id?: string | null;
  name: string;
  abbreviation: string;
  logo?: string | null;
  color?: string | null;
  record?: string | null;
  conferenceRecord?: string | null;
  conference?: string | null;
  rank?: number | null;
}

export interface OddsSchema {
  spread?: number | null;
  overUnder?: number | null;
}

export interface GameSchema {
  id: string;
  eventId: string;
  sport: string;
  homeTeam: TeamSchema;
  awayTeam: TeamSchema;
  status: string;
  startTime: string;
  endTime?: string | null;
  network: string;
  homeScore?: number | null;
  awayScore?: number | null;
  venue?: string | null;
  venueCity?: string | null;
  venueState?: string | null;
  quarter?: string | null;
  timeRemaining?: string | null;
  statusDetail?: string | null;
  odds?: OddsSchema | null;
  predictor?: PredictorSchema | null;
}

export interface GameSummarySchema {
  id: string;
  eventId: string;
  sport: string;
  homeTeam: TeamSchema;
  awayTeam: TeamSchema;
  status: string;
  startTime: string;
  endTime?: string | null;
  network: string;
  homeScore?: number | null;
  awayScore?: number | null;
  venue?: string | null;
  venueCity?: string | null;
  venueState?: string | null;
  quarter?: string | null;
  timeRemaining?: string | null;
  statusDetail?: string | null;
  odds?: OddsSchema | null;
  predictor?: PredictorSchema | null;
  boxScore?: Record<string, unknown> | null;
  plays?: unknown[] | null;
  leaders?: unknown[] | null;
}

export interface ScheduleResponseSchema {
  games: GameSchema[];
}
