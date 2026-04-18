/**
 * API client service for connecting to the sports backend
 */

import { API_BASE_URL, API_TIMEOUT, CACHE_DURATION as CacheDuration } from '@constants/index';
import { BracketResponse, Game, GameSummary, GolfLeaderboard, SportType } from '@types/index';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class ApiService {
  private cache = new Map<string, CacheEntry<unknown>>();

  /**
   * Format date for API requests (YYYYMMDD format)
   */
  private formatDate(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(key: string, duration: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    const age = Date.now() - entry.timestamp;
    return age < duration;
  }

  /**
   * Get cached data if valid, otherwise null
   */
  private getCachedData<T>(key: string, duration: number): T | null {
    if (this.isCacheValid(key, duration)) {
      const entry = this.cache.get(key);
      return entry?.data ?? null;
    }
    this.cache.delete(key);
    return null;
  }

  /**
   * Set cache data with timestamp
   */
  private setCacheData<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Make a fetch request with timeout and error handling
   */
  private async fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      // Ensure we don't have double slashes if API_BASE_URL ends with one
      const cleanUrl = url.replace(/([^:]\/)\/+/g, '$1');
      console.log(`[API] Fetching: ${cleanUrl}`);

      const response = await fetch(cleanUrl, {
        ...options,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[API] HTTP Error ${response.status}: ${errorText}`);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return response;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Fetch schedule for a given sport and date
   */
  async getSchedule(sport: SportType, date?: Date): Promise<Game[]> {
    const formattedDate = this.formatDate(date);
    const cacheKey = `schedule:${sport}:${formattedDate}`;

    const cached = this.getCachedData<Game[]>(cacheKey, CacheDuration.SCHEDULE);
    if (cached) return cached;

    try {
      const params = new URLSearchParams({ date: formattedDate });
      const url = `${API_BASE_URL}/api/schedule/${sport}?${params}`;
      const response = await this.fetchWithTimeout(url);
      const data = await response.json();

      let games: Game[] = data.games || [];

      // When fetching PGA, also pull LIV and merge into the same column
      if (sport === 'golf-pga') {
        try {
          const livUrl = `${API_BASE_URL}/api/schedule/golf-liv?${params}`;
          const livResponse = await this.fetchWithTimeout(livUrl);
          const livData = await livResponse.json();
          games = [...games, ...(livData.games || [])];
        } catch (livError) {
          console.warn('Failed to fetch LIV golf schedule:', livError);
        }
      }

      this.setCacheData(cacheKey, games);
      return games;
    } catch (error) {
      console.error(`Failed to fetch ${sport} schedule:`, error);
      throw error;
    }
  }

  /**
   * Fetch game summary
   */
  async getGameSummary(sport: SportType, eventId: string): Promise<GameSummary> {
    const cacheKey = `game:${sport}:${eventId}`;

    const cached = this.getCachedData<GameSummary>(cacheKey, CacheDuration.GAME_SUMMARY);
    if (cached) return cached;

    try {
      const url = `${API_BASE_URL}/api/game/${sport}/${eventId}`;
      const response = await this.fetchWithTimeout(url);
      const gameSummary: GameSummary = await response.json();
      this.setCacheData(cacheKey, gameSummary);
      return gameSummary;
    } catch (error) {
      console.error(`Failed to fetch game summary for ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Fetch golf leaderboard
   */
  async getGolfLeaderboard(eventId: string, sport: SportType = 'golf-pga'): Promise<GolfLeaderboard> {
    const cacheKey = `golf-leaderboard:${eventId}`;

    const cached = this.getCachedData<GolfLeaderboard>(cacheKey, CacheDuration.GAME_SUMMARY);
    if (cached) return cached;

    try {
      const tour = sport === 'golf-liv' ? 'liv' : 'pga';
      const url = `${API_BASE_URL}/api/golf/${tour}/leaderboard/${eventId}`;
      const response = await this.fetchWithTimeout(url);
      const leaderboard: GolfLeaderboard = await response.json();
      this.setCacheData(cacheKey, leaderboard);
      return leaderboard;
    } catch (error) {
      console.error(`Failed to fetch golf leaderboard for ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Fetch March Madness bracket data
   */
  async getBrackets(year?: number): Promise<BracketResponse> {
    const cacheKey = `brackets:${year || 'current'}`;

    const cached = this.getCachedData<BracketResponse>(cacheKey, CacheDuration.STANDINGS);
    if (cached) return cached;

    try {
      const params = year ? `?year=${year}` : '';
      const url = `${API_BASE_URL}/api/march-madness/brackets${params}`;
      const response = await this.fetchWithTimeout(url);
      const data: BracketResponse = await response.json();
      this.setCacheData(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch brackets:', error);
      throw error;
    }
  }

  /**
   * Fetch multiple sports schedules in parallel
   */
  async getMultipleSports(sports: SportType[], date?: Date): Promise<Map<SportType, Game[]>> {
    const promises = sports.map((sport) => this.getSchedule(sport, date));
    const results = await Promise.allSettled(promises);

    const sportSchedules = new Map<SportType, Game[]>();

    results.forEach((result, index) => {
      const sport = sports[index];
      if (result.status === 'fulfilled') {
        sportSchedules.set(sport, result.value);
      } else {
        console.warn(`Failed to fetch ${sport} schedule:`, result.reason);
        sportSchedules.set(sport, []);
      }
    });

    return sportSchedules;
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear cache for a specific key pattern
   */
  clearCacheByPattern(pattern: string): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Get cache stats (for debugging)
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const apiService = new ApiService();
