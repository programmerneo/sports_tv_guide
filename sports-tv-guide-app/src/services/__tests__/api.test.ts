/**
 * Tests for the API service
 */

import { apiService } from '../api';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Sample pre-formatted game data (as returned by backend)
const SAMPLE_GAME = {
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
    rank: undefined,
  },
  status: 'completed',
  startTime: '2025-03-15T23:00Z',
  endTime: '2025-03-16T01:30Z',
  network: 'ESPN',
  homeScore: 85,
  awayScore: 78,
  venue: 'Cameron Indoor Stadium',
  venueCity: 'Durham',
  venueState: 'NC',
  quarter: undefined,
  timeRemaining: undefined,
  odds: { spread: -3.5, overUnder: 155.5 },
};

const SAMPLE_SCHEDULE_RESPONSE = {
  games: [SAMPLE_GAME],
};

const SAMPLE_GAME_SUMMARY = {
  ...SAMPLE_GAME,
  boxScore: {
    homeTeamStats: {
      teamId: '150',
      teamName: 'Duke Blue Devils',
      points: 85,
    },
    awayTeamStats: {
      teamId: '153',
      teamName: 'North Carolina Tar Heels',
      points: 78,
    },
  },
  plays: [{ id: '1', period: 1, description: 'Jump ball' }],
  leaders: {
    home: { teamId: '150', players: [] },
    away: { teamId: '153', players: [] },
  },
};

beforeEach(() => {
  mockFetch.mockClear();
  apiService.clearCache();
});

describe('getSchedule', () => {
  it('returns games from backend response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => SAMPLE_SCHEDULE_RESPONSE,
      text: async () => '',
    });

    const games = await apiService.getSchedule('basketball-college');

    expect(games).toHaveLength(1);
    expect(games[0].id).toBe('401634567');
    expect(games[0].homeTeam.name).toBe('Duke Blue Devils');
    expect(games[0].awayTeam.abbreviation).toBe('UNC');
    expect(games[0].homeScore).toBe(85);
    expect(games[0].venue).toBe('Cameron Indoor Stadium');
    expect(games[0].venueCity).toBe('Durham');
    expect(games[0].venueState).toBe('NC');
    expect(games[0].status).toBe('completed');
  });

  it('returns empty array when no games', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ games: [] }),
      text: async () => '',
    });

    const games = await apiService.getSchedule('football-nfl');
    expect(games).toHaveLength(0);
  });

  it('handles missing games key gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
      text: async () => '',
    });

    const games = await apiService.getSchedule('football-college');
    expect(games).toHaveLength(0);
  });

  it('uses cached data on subsequent calls', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => SAMPLE_SCHEDULE_RESPONSE,
      text: async () => '',
    });

    await apiService.getSchedule('basketball-college');
    const games = await apiService.getSchedule('basketball-college');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(games).toHaveLength(1);
  });

  it('throws on HTTP error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    await expect(apiService.getSchedule('basketball-college')).rejects.toThrow('HTTP 500');
  });
});

describe('getGameSummary', () => {
  it('returns game summary from backend', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => SAMPLE_GAME_SUMMARY,
      text: async () => '',
    });

    const summary = await apiService.getGameSummary('basketball-college', '401634567');

    expect(summary.id).toBe('401634567');
    expect(summary.homeTeam.name).toBe('Duke Blue Devils');
    expect(summary.boxScore).toBeDefined();
    expect(summary.plays).toHaveLength(1);
    expect(summary.leaders).toBeDefined();
    expect(summary.leaders?.home.teamId).toBe('150');
  });

  it('uses cached data on subsequent calls', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => SAMPLE_GAME_SUMMARY,
      text: async () => '',
    });

    await apiService.getGameSummary('basketball-college', '401634567');
    const summary = await apiService.getGameSummary('basketball-college', '401634567');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(summary.boxScore).toBeDefined();
  });
});

describe('getMultipleSports', () => {
  it('fetches multiple sports in parallel', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => SAMPLE_SCHEDULE_RESPONSE,
        text: async () => '',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ games: [] }),
        text: async () => '',
      });

    const result = await apiService.getMultipleSports(['basketball-college', 'football-nfl']);

    expect(result.get('basketball-college')).toHaveLength(1);
    expect(result.get('football-nfl')).toHaveLength(0);
  });

  it('handles partial failures gracefully', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => SAMPLE_SCHEDULE_RESPONSE,
        text: async () => '',
      })
      .mockRejectedValueOnce(new Error('Network error'));

    const result = await apiService.getMultipleSports(['basketball-college', 'football-nfl']);

    expect(result.get('basketball-college')).toHaveLength(1);
    expect(result.get('football-nfl')).toHaveLength(0);
  });
});

describe('cache management', () => {
  it('clearCache removes all cached data', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => SAMPLE_SCHEDULE_RESPONSE,
      text: async () => '',
    });

    await apiService.getSchedule('basketball-college');
    apiService.clearCache();
    await apiService.getSchedule('basketball-college');

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('clearCacheByPattern removes matching keys', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => SAMPLE_SCHEDULE_RESPONSE,
      text: async () => '',
    });

    await apiService.getSchedule('basketball-college');
    apiService.clearCacheByPattern('basketball');
    await apiService.getSchedule('basketball-college');

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('getCacheStats returns cache info', () => {
    const stats = apiService.getCacheStats();
    expect(stats).toHaveProperty('size');
    expect(stats).toHaveProperty('keys');
  });

  it('getCacheStats reflects cached entries', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => SAMPLE_SCHEDULE_RESPONSE,
      text: async () => '',
    });

    await apiService.getSchedule('basketball-college');
    const stats = apiService.getCacheStats();

    expect(stats.size).toBe(1);
    expect(stats.keys).toHaveLength(1);
    expect(stats.keys[0]).toContain('basketball-college');
  });
});
