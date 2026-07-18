/**
 * Zustand store for game and app state management
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Game, GameSummary, SportType, UserPreferences } from '@types/index';
import { DEFAULT_USER_PREFERENCES } from '@constants/index';

// AsyncStorage key for the persisted slice of the store.
const PERSIST_KEY = 'sports-tv-guide-store';

interface GameState {
  // Games data
  games: Map<SportType, Game[]>;
  selectedGame: GameSummary | null;
  loading: boolean;
  error: string | null;

  // User preferences
  preferences: UserPreferences;

  // Actions
  setGames: (sport: SportType, games: Game[]) => void;
  setSelectedGame: (game: GameSummary | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPreferences: (preferences: Partial<UserPreferences>) => void;
  toggleFavoriteGame: (gameId: string) => void;
  toggleFavoriteTeam: (teamId: string) => void;
  addSelectedSport: (sport: SportType) => void;
  removeSelectedSport: (sport: SportType) => void;
  clearCache: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      games: new Map(),
      selectedGame: null,
      loading: false,
      error: null,
      preferences: DEFAULT_USER_PREFERENCES,

      setGames: (sport: SportType, games: Game[]) =>
        set((state) => {
          const newGames = new Map(state.games);
          newGames.set(sport, games);
          return { games: newGames };
        }),

      setSelectedGame: (game: GameSummary | null) => set({ selectedGame: game }),

      setLoading: (loading: boolean) => set({ loading }),

      setError: (error: string | null) => set({ error }),

      setPreferences: (newPreferences: Partial<UserPreferences>) =>
        set((state) => ({
          preferences: { ...state.preferences, ...newPreferences },
        })),

      toggleFavoriteGame: (gameId: string) =>
        set((state) => {
          const favorites = state.preferences.favoriteGames;
          const updated = favorites.includes(gameId)
            ? favorites.filter((id) => id !== gameId)
            : [...favorites, gameId];

          return {
            preferences: { ...state.preferences, favoriteGames: updated },
          };
        }),

      toggleFavoriteTeam: (teamId: string) =>
        set((state) => {
          const favorites = state.preferences.favoriteTeams;
          const updated = favorites.includes(teamId)
            ? favorites.filter((id) => id !== teamId)
            : [...favorites, teamId];

          return {
            preferences: { ...state.preferences, favoriteTeams: updated },
          };
        }),

      addSelectedSport: (sport: SportType) =>
        set((state) => {
          const sports = state.preferences.selectedSports;
          if (!sports.includes(sport)) {
            return {
              preferences: {
                ...state.preferences,
                selectedSports: [...sports, sport],
              },
            };
          }
          return state;
        }),

      removeSelectedSport: (sport: SportType) =>
        set((state) => {
          const sports = state.preferences.selectedSports;
          return {
            preferences: {
              ...state.preferences,
              selectedSports: sports.filter((s) => s !== sport),
            },
          };
        }),

      clearCache: () =>
        set({
          games: new Map(),
          selectedGame: null,
          error: null,
        }),
    }),
    {
      name: PERSIST_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist user preferences. Games are volatile fetched data (and
      // `games` is a Map, which JSON cannot serialize), while selectedGame,
      // loading, and error are transient UI state.
      partialize: (state) => ({ preferences: state.preferences }),
    }
  )
);

/**
 * Get games for all selected sports, sorted by time
 */
export const getAllGames = (state: GameState): Game[] => {
  const allGames: Game[] = [];

  state.preferences.selectedSports.forEach((sport) => {
    const sportGames = state.games.get(sport) || [];
    allGames.push(...sportGames);
  });

  // Sort by start time
  return allGames.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
};

/**
 * Get live games
 */
export const getLiveGames = (state: GameState): Game[] => {
  return getAllGames(state).filter((game) => game.status === 'in_progress');
};

/**
 * Get upcoming games (scheduled today)
 */
export const getUpcomingGames = (state: GameState): Game[] => {
  return getAllGames(state).filter((game) => game.status === 'scheduled');
};

/**
 * Get games by sport
 */
export const getGamesBySport = (state: GameState, sport: SportType): Game[] => {
  return state.games.get(sport) || [];
};

/**
 * Get favorited games, sorted by start time.
 *
 * A game is a favorite when its id is in preferences.favoriteGames, or when
 * either competing team's id is in preferences.favoriteTeams. Order follows
 * getAllGames, which is already sorted by start time.
 */
export const getFavoriteGames = (state: GameState): Game[] => {
  const { favoriteGames, favoriteTeams } = state.preferences;

  return getAllGames(state).filter(
    (game) =>
      favoriteGames.includes(game.id) ||
      favoriteTeams.includes(game.homeTeam.id) ||
      favoriteTeams.includes(game.awayTeam.id)
  );
};
