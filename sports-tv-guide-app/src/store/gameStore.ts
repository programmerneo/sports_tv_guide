/**
 * Zustand store for game and app state management
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Game, GameSummary, SportType, UserPreferences } from '@types/index';
import { DEFAULT_USER_PREFERENCES } from '@constants/index';
import { cancelGameReminder } from '@services/notificationService';

// AsyncStorage key for the persisted slice of the store.
const PERSIST_KEY = 'sports-tv-guide-store';

interface ScheduledReminder {
  notificationId: string;
  startTime: string; // ISO 8601, copied from Game.startTime at schedule time
}

interface GameState {
  // Games data
  games: Map<SportType, Game[]>;
  selectedGame: GameSummary | null;
  loading: boolean;
  error: string | null;

  // User preferences
  preferences: UserPreferences;

  // Scheduled game-start reminder notifications, keyed by game id.
  scheduledReminders: Record<string, ScheduledReminder>;

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
  addScheduledReminder: (gameId: string, notificationId: string, startTime: string) => void;
  removeScheduledReminder: (gameId: string) => void;
  pruneExpiredReminders: () => void;
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
      scheduledReminders: {},

      setGames: (sport: SportType, games: Game[]) =>
        set((state) => {
          const newGames = new Map(state.games);
          newGames.set(sport, games);

          // Drop reminders for games that are no longer scheduled/live (completed,
          // postponed, canceled) so scheduledReminders doesn't accumulate stale entries.
          const remainingReminders = { ...state.scheduledReminders };
          const idsToCancel: string[] = [];
          games.forEach((game) => {
            const reminder = remainingReminders[game.id];
            if (reminder && game.status !== 'scheduled' && game.status !== 'in_progress') {
              idsToCancel.push(reminder.notificationId);
              delete remainingReminders[game.id];
            }
          });
          idsToCancel.forEach((id) => {
            cancelGameReminder(id).catch(() => {});
          });

          return { games: newGames, scheduledReminders: remainingReminders };
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

      addScheduledReminder: (gameId: string, notificationId: string, startTime: string) =>
        set((state) => ({
          scheduledReminders: {
            ...state.scheduledReminders,
            [gameId]: { notificationId, startTime },
          },
        })),

      removeScheduledReminder: (gameId: string) =>
        set((state) => {
          const remaining = { ...state.scheduledReminders };
          delete remaining[gameId];
          return { scheduledReminders: remaining };
        }),

      pruneExpiredReminders: () =>
        set((state) => {
          const remaining = { ...state.scheduledReminders };
          const idsToCancel: string[] = [];
          const now = Date.now();

          Object.entries(remaining).forEach(([gameId, reminder]) => {
            if (new Date(reminder.startTime).getTime() <= now) {
              idsToCancel.push(reminder.notificationId);
              delete remaining[gameId];
            }
          });

          idsToCancel.forEach((id) => {
            cancelGameReminder(id).catch(() => {});
          });

          return { scheduledReminders: remaining };
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
      // Only persist user preferences and scheduled reminders. Games are
      // volatile fetched data (and `games` is a Map, which JSON cannot
      // serialize), while selectedGame, loading, and error are transient UI state.
      partialize: (state) => ({
        preferences: state.preferences,
        scheduledReminders: state.scheduledReminders,
      }),
    }
  )
);

/**
 * Build a favoriteTeams entry for a team, namespaced by sport.
 *
 * ESPN team ids aren't globally unique across leagues (e.g. id "1" exists in
 * both MLB and NFL), so a bare team id can't be used as the favorite key —
 * favoriting one sport's team would incorrectly also match another sport's
 * team with the same id. Every read/write of favoriteTeams must go through
 * this helper.
 */
export const favoriteTeamKey = (sport: SportType, teamId: string): string => `${sport}:${teamId}`;

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
      favoriteTeams.includes(favoriteTeamKey(game.sport, game.homeTeam.id)) ||
      favoriteTeams.includes(favoriteTeamKey(game.sport, game.awayTeam.id))
  );
};
