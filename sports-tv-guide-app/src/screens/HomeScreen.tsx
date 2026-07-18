/**
 * Home Screen - Main TV Guide interface
 * Displays today's games organized by time and sport
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { apiService } from '@services/api';
import { useGameStore, getAllGames, getLiveGames } from '@store/gameStore';
import { SPORTS, GAME_REFRESH_INTERVAL, EMPTY_STATE_MESSAGES } from '@constants/index';
import { ThemeColors } from '@constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Game, SportType } from '@types/index';

import InProgressTodaySection from '@components/InProgressTodaySection';
import SportTabs from '@components/SportTabs';
import TVGuideGrid from '@components/TVGuideGrid';
import EmptyState from '@components/EmptyState';
import tvIcon from '../../assets/images/tv-icon.png';

/**
 * Filter games by team name/abbreviation, sport display name, or network.
 */
const filterGamesByQuery = (games: Game[], query: string): Game[] => {
  const term = query.trim().toLowerCase();
  if (!term) return games;

  return games.filter((game) => {
    const sportName = SPORTS[game.sport]?.displayName ?? '';
    const haystack = [
      game.homeTeam.name,
      game.homeTeam.abbreviation,
      game.awayTeam.name,
      game.awayTeam.abbreviation,
      sportName,
      game.network,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(term);
  });
};

const HomeScreen: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<{ navigate: (screen: string) => void }>();
  const {
    games,
    setGames,
    loading,
    setLoading,
    error,
    setError,
    preferences,
    setPreferences,
    clearCache,
  } = useGameStore();

  const [refreshing, setRefreshing] = useState(false);
  const [filteredSport, setFilteredSport] = useState<SportType | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Reset filter if the selected sport has no games
  useEffect(() => {
    if (filteredSport) {
      const sportGames = games.get(filteredSport);
      if (!sportGames || sportGames.length === 0) {
        setFilteredSport(null);
      }
    }
  }, [filteredSport, games]);

  /**
   * Load games for selected sports
   */
  const loadingRef = React.useRef(false);

  const loadGames = useCallback(
    async (refresh = false) => {
      if (!refresh && loadingRef.current) return;

      loadingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        const sportSchedules = await apiService.getMultipleSports(preferences.selectedSports);

        // Update store with fetched games
        sportSchedules.forEach((gamesForSport, sport) => {
          setGames(sport, gamesForSport);
        });

        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load games';
        setError(errorMessage);
        console.error('Error loading games:', err);
      } finally {
        loadingRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [preferences.selectedSports, setGames, setLoading, setError]
  );

  /**
   * Load games on screen focus
   */
  useFocusEffect(
    useCallback(() => {
      loadGames();

      // Set up auto-refresh for live games
      const refreshInterval = setInterval(() => {
        loadGames(true);
      }, GAME_REFRESH_INTERVAL);

      return () => clearInterval(refreshInterval);
    }, [loadGames])
  );

  /**
   * Handle manual refresh
   */
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    clearCache(); // Clear cache on manual refresh
    loadGames(true);
  }, [loadGames, clearCache]);

  /**
   * Toggle dark/light theme via preferences
   */
  const handleToggleTheme = useCallback(() => {
    setPreferences({ darkModeEnabled: !preferences.darkModeEnabled });
  }, [preferences.darkModeEnabled, setPreferences]);

  /**
   * Toggle the search input; clear the query when closing.
   */
  const handleToggleSearch = useCallback(() => {
    setShowSearch((prev) => {
      if (prev) setSearchQuery('');
      return !prev;
    });
  }, []);

  const hasSearch = searchQuery.trim().length > 0;

  /**
   * Today's date label for the header.
   */
  const dateLabel = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
    []
  );

  /**
   * Get games to display. When searching, the query narrows the full set and
   * overrides the sport tab filter; otherwise the sport filter applies.
   */
  const allGames = getAllGames(useGameStore.getState());

  const displayGames = hasSearch
    ? filterGamesByQuery(allGames, searchQuery)
    : filteredSport
      ? games.get(filteredSport) || []
      : allGames;

  const liveGames = getLiveGames(useGameStore.getState());
  const liveDisplayGames = hasSearch ? filterGamesByQuery(liveGames, searchQuery) : liveGames;

  /**
   * Render content
   */
  const renderContent = () => {
    if (loading && !refreshing && allGames.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>{EMPTY_STATE_MESSAGES.LOADING.title}</Text>
        </View>
      );
    }

    if (error && allGames.length === 0) {
      return (
        <EmptyState
          title={EMPTY_STATE_MESSAGES.ERROR.title}
          subtitle={EMPTY_STATE_MESSAGES.ERROR.subtitle}
          description={error}
          onRetry={handleRefresh}
        />
      );
    }

    if (allGames.length === 0) {
      return (
        <EmptyState
          title={EMPTY_STATE_MESSAGES.NO_GAMES_TODAY.title}
          subtitle={EMPTY_STATE_MESSAGES.NO_GAMES_TODAY.subtitle}
          description={EMPTY_STATE_MESSAGES.NO_GAMES_TODAY.description}
          showTomorrowsGames={true}
          onRetry={handleRefresh}
        />
      );
    }

    return (
      <>
        {/* In Progress Today Section */}
        <InProgressTodaySection games={liveDisplayGames} />

        {/* Sport Type Tabs (hidden while searching) */}
        {!hasSearch && (
          <SportTabs
            selectedSport={filteredSport}
            onSelectSport={setFilteredSport}
            onBracketPress={() => navigation.navigate('Bracket')}
          />
        )}

        {/* TV Guide Grid or filtered empty state */}
        {displayGames.length > 0 ? (
          <TVGuideGrid games={displayGames} />
        ) : (
          <EmptyState
            title={EMPTY_STATE_MESSAGES.NO_GAMES_TODAY.title}
            subtitle={EMPTY_STATE_MESSAGES.NO_GAMES_TODAY.subtitle}
            description={
              hasSearch
                ? `No games match "${searchQuery.trim()}"`
                : EMPTY_STATE_MESSAGES.NO_GAMES_TODAY.description
            }
            onRetry={handleRefresh}
          />
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <Image source={tvIcon} style={styles.headerIcon} />
          <View>
            <Text style={styles.headerTitle}>Sports TV Guide</Text>
            <Text style={styles.headerDate}>{dateLabel}</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleToggleSearch}
            activeOpacity={0.7}
            accessibilityLabel="Search games"
          >
            <Text style={styles.headerButtonIcon}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleToggleTheme}
            activeOpacity={0.7}
            accessibilityLabel="Toggle theme"
          >
            <Text style={styles.headerButtonIcon}>
              {preferences.darkModeEnabled ? '☀️' : '🌙'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {showSearch && (
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search team, sport, or network"
            placeholderTextColor={theme.textSecondary}
            autoFocus
            returnKeyType="search"
          />
          <TouchableOpacity onPress={handleToggleSearch} activeOpacity={0.7}>
            <Text style={styles.searchClear}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.scrollView}>{renderContent()}</View>
    </SafeAreaView>
  );
};

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.headerBg,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    headerIcon: {
      width: 28,
      height: 28,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.textInverse,
    },
    headerDate: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.textInverse,
      opacity: 0.85,
      marginTop: 1,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.overlay,
    },
    headerButtonIcon: {
      fontSize: 18,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.surface,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    searchIcon: {
      fontSize: 14,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: theme.text,
      paddingVertical: 4,
    },
    searchClear: {
      fontSize: 16,
      color: theme.textSecondary,
      paddingHorizontal: 4,
    },
    scrollView: {
      flex: 1,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: theme.textSecondary,
    },
  });

export default HomeScreen;
