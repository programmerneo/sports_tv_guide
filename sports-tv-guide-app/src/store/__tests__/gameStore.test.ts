/**
 * Tests for Zustand game store
 */

import { useGameStore, getAllGames, getLiveGames, getUpcomingGames, getGamesBySport } from '../gameStore';
import { Game, SportType } from '@types/index';

// Sample game fixtures matching backend response shape
const SAMPLE_SCHEDULED_GAME: Game = {
  id: '401634567',
  eventId: '401634567',
  sport: 'basketball-college',
  homeTeam: {
    id: '150',
    name: 'Duke Blue Devils',
    abbreviation: 'DUKE',
    logo: 'https://example.com/duke.png',
    record: '25-5',
    conferenceRecord: '15-3',
    rank: 5,
  },
  awayTeam: {
    id: '153',
    name: 'North Carolina Tar Heels',
    abbreviation: 'UNC',
    logo: 'https://example.com/unc.png',
    record: '20-10',
    conferenceRecord: '12-6',
  },
  status: 'scheduled',
  startTime: '2026-03-15T23:00Z',
  network: 'ESPN',
  homeScore: undefined,
  awayScore: undefined,
  venue: 'Cameron Indoor Stadium',
  venueCity: 'Durham',
  venueState: 'NC',
  odds: { spread: -3.5, overUnder: 155.5 },
};

const SAMPLE_LIVE_GAME: Game = {
  ...SAMPLE_SCHEDULED_GAME,
  id: '401634568',
  eventId: '401634568',
  status: 'in_progress',
  homeScore: 42,
  awayScore: 38,
  quarter: 'Q2',
  timeRemaining: '5:30',
};

const SAMPLE_COMPLETED_GAME: Game = {
  ...SAMPLE_SCHEDULED_GAME,
  id: '401634569',
  eventId: '401634569',
  status: 'completed',
  startTime: '2026-03-15T18:00Z',
  homeScore: 85,
  awayScore: 78,
};

const SAMPLE_NFL_GAME: Game = {
  ...SAMPLE_SCHEDULED_GAME,
  id: '401700001',
  eventId: '401700001',
  sport: 'football-nfl',
  startTime: '2026-03-15T20:00Z',
  network: 'FOX',
};

beforeEach(() => {
  // Reset store to initial state
  useGameStore.setState({
    games: new Map(),
    selectedGame: null,
    loading: false,
    error: null,
    preferences: {
      favoriteTeams: [],
      favoriteGames: [],
      timezone: 'America/New_York',
      notificationsEnabled: true,
      darkModeEnabled: false,
      selectedSports: ['football-nfl', 'basketball-college'],
    },
  });
});

describe('setGames', () => {
  it('stores games for a sport', () => {
    const { setGames } = useGameStore.getState();
    setGames('basketball-college', [SAMPLE_SCHEDULED_GAME]);

    const state = useGameStore.getState();
    expect(state.games.get('basketball-college')).toHaveLength(1);
    expect(state.games.get('basketball-college')![0].id).toBe('401634567');
  });

  it('replaces existing games for same sport', () => {
    const { setGames } = useGameStore.getState();
    setGames('basketball-college', [SAMPLE_SCHEDULED_GAME]);
    setGames('basketball-college', [SAMPLE_LIVE_GAME, SAMPLE_COMPLETED_GAME]);

    const state = useGameStore.getState();
    expect(state.games.get('basketball-college')).toHaveLength(2);
  });

  it('does not affect other sports', () => {
    const { setGames } = useGameStore.getState();
    setGames('basketball-college', [SAMPLE_SCHEDULED_GAME]);
    setGames('football-nfl', [SAMPLE_NFL_GAME]);

    const state = useGameStore.getState();
    expect(state.games.get('basketball-college')).toHaveLength(1);
    expect(state.games.get('football-nfl')).toHaveLength(1);
  });
});

describe('getAllGames', () => {
  it('returns empty array when no games loaded', () => {
    const games = getAllGames(useGameStore.getState());
    expect(games).toEqual([]);
  });

  it('returns games sorted by start time', () => {
    const { setGames } = useGameStore.getState();
    setGames('basketball-college', [SAMPLE_SCHEDULED_GAME, SAMPLE_COMPLETED_GAME]);

    const games = getAllGames(useGameStore.getState());
    expect(games).toHaveLength(2);
    // Completed game at 18:00 should come before scheduled at 23:00
    expect(games[0].id).toBe('401634569');
    expect(games[1].id).toBe('401634567');
  });

  it('combines games from multiple selected sports', () => {
    const { setGames } = useGameStore.getState();
    setGames('basketball-college', [SAMPLE_SCHEDULED_GAME]);
    setGames('football-nfl', [SAMPLE_NFL_GAME]);

    const games = getAllGames(useGameStore.getState());
    expect(games).toHaveLength(2);
  });

  it('only includes games from selected sports', () => {
    const { setGames } = useGameStore.getState();
    setGames('basketball-college', [SAMPLE_SCHEDULED_GAME]);
    setGames('football-college', [{ ...SAMPLE_NFL_GAME, sport: 'football-college' as SportType }]);

    // football-college is NOT in selectedSports
    const games = getAllGames(useGameStore.getState());
    expect(games).toHaveLength(1);
    expect(games[0].sport).toBe('basketball-college');
  });
});

describe('getLiveGames', () => {
  it('returns only in_progress games', () => {
    const { setGames } = useGameStore.getState();
    setGames('basketball-college', [SAMPLE_SCHEDULED_GAME, SAMPLE_LIVE_GAME, SAMPLE_COMPLETED_GAME]);

    const live = getLiveGames(useGameStore.getState());
    expect(live).toHaveLength(1);
    expect(live[0].status).toBe('in_progress');
  });

  it('returns empty when no live games', () => {
    const { setGames } = useGameStore.getState();
    setGames('basketball-college', [SAMPLE_SCHEDULED_GAME, SAMPLE_COMPLETED_GAME]);

    const live = getLiveGames(useGameStore.getState());
    expect(live).toHaveLength(0);
  });
});

describe('getUpcomingGames', () => {
  it('returns only scheduled games', () => {
    const { setGames } = useGameStore.getState();
    setGames('basketball-college', [SAMPLE_SCHEDULED_GAME, SAMPLE_LIVE_GAME, SAMPLE_COMPLETED_GAME]);

    const upcoming = getUpcomingGames(useGameStore.getState());
    expect(upcoming).toHaveLength(1);
    expect(upcoming[0].status).toBe('scheduled');
  });
});

describe('getGamesBySport', () => {
  it('returns games for a specific sport', () => {
    const { setGames } = useGameStore.getState();
    setGames('basketball-college', [SAMPLE_SCHEDULED_GAME]);
    setGames('football-nfl', [SAMPLE_NFL_GAME]);

    const bball = getGamesBySport(useGameStore.getState(), 'basketball-college');
    expect(bball).toHaveLength(1);
    expect(bball[0].sport).toBe('basketball-college');
  });

  it('returns empty array for sport with no games', () => {
    const games = getGamesBySport(useGameStore.getState(), 'football-college');
    expect(games).toEqual([]);
  });
});

describe('preferences', () => {
  it('addSelectedSport adds a sport', () => {
    const { addSelectedSport } = useGameStore.getState();
    addSelectedSport('football-college');

    const state = useGameStore.getState();
    expect(state.preferences.selectedSports).toContain('football-college');
  });

  it('addSelectedSport does not duplicate', () => {
    const { addSelectedSport } = useGameStore.getState();
    addSelectedSport('basketball-college');

    const state = useGameStore.getState();
    const count = state.preferences.selectedSports.filter((s) => s === 'basketball-college').length;
    expect(count).toBe(1);
  });

  it('removeSelectedSport removes a sport', () => {
    const { removeSelectedSport } = useGameStore.getState();
    removeSelectedSport('football-nfl');

    const state = useGameStore.getState();
    expect(state.preferences.selectedSports).not.toContain('football-nfl');
  });

  it('toggleFavoriteTeam adds and removes', () => {
    const { toggleFavoriteTeam } = useGameStore.getState();
    toggleFavoriteTeam('150');
    expect(useGameStore.getState().preferences.favoriteTeams).toContain('150');

    toggleFavoriteTeam('150');
    expect(useGameStore.getState().preferences.favoriteTeams).not.toContain('150');
  });

  it('toggleFavoriteGame adds and removes', () => {
    const { toggleFavoriteGame } = useGameStore.getState();
    toggleFavoriteGame('401634567');
    expect(useGameStore.getState().preferences.favoriteGames).toContain('401634567');

    toggleFavoriteGame('401634567');
    expect(useGameStore.getState().preferences.favoriteGames).not.toContain('401634567');
  });
});

describe('clearCache', () => {
  it('resets games, selectedGame, and error', () => {
    const { setGames, setError, clearCache } = useGameStore.getState();
    setGames('basketball-college', [SAMPLE_SCHEDULED_GAME]);
    setError('Something went wrong');

    clearCache();

    const state = useGameStore.getState();
    expect(state.games.size).toBe(0);
    expect(state.selectedGame).toBeNull();
    expect(state.error).toBeNull();
  });

  it('preserves preferences after clear', () => {
    const { addSelectedSport, clearCache } = useGameStore.getState();
    addSelectedSport('football-college');

    clearCache();

    const state = useGameStore.getState();
    expect(state.preferences.selectedSports).toContain('football-college');
  });
});

describe('game data shape validation', () => {
  it('games have required fields from backend', () => {
    const { setGames } = useGameStore.getState();
    setGames('basketball-college', [SAMPLE_SCHEDULED_GAME]);

    const games = getAllGames(useGameStore.getState());
    const game = games[0];

    expect(game.id).toBeDefined();
    expect(game.eventId).toBeDefined();
    expect(game.sport).toBeDefined();
    expect(game.homeTeam).toBeDefined();
    expect(game.awayTeam).toBeDefined();
    expect(game.status).toBeDefined();
    expect(game.startTime).toBeDefined();
    expect(game.network).toBeDefined();
  });

  it('team data has required fields', () => {
    const { setGames } = useGameStore.getState();
    setGames('basketball-college', [SAMPLE_SCHEDULED_GAME]);

    const game = getAllGames(useGameStore.getState())[0];

    expect(game.homeTeam.id).toBe('150');
    expect(game.homeTeam.name).toBe('Duke Blue Devils');
    expect(game.homeTeam.abbreviation).toBe('DUKE');
    expect(game.homeTeam.record).toBe('25-5');
    expect(game.homeTeam.rank).toBe(5);
  });

  it('venue includes city and state', () => {
    const { setGames } = useGameStore.getState();
    setGames('basketball-college', [SAMPLE_SCHEDULED_GAME]);

    const game = getAllGames(useGameStore.getState())[0];

    expect(game.venue).toBe('Cameron Indoor Stadium');
    expect(game.venueCity).toBe('Durham');
    expect(game.venueState).toBe('NC');
  });

  it('odds data is accessible', () => {
    const { setGames } = useGameStore.getState();
    setGames('basketball-college', [SAMPLE_SCHEDULED_GAME]);

    const game = getAllGames(useGameStore.getState())[0];

    expect(game.odds).toBeDefined();
    expect(game.odds!.spread).toBe(-3.5);
    expect(game.odds!.overUnder).toBe(155.5);
  });
});
