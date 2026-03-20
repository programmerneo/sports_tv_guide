/**
 * Home Screen - Main TV Guide interface
 * Displays today's games organized by time and sport
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { apiService } from '@services/api';
import { useGameStore, getAllGames, getLiveGames } from '@store/gameStore';
import { COLORS, SPORTS, GAME_REFRESH_INTERVAL, EMPTY_STATE_MESSAGES } from '@constants/index';
import { Game, SportType } from '@types/index';

import InProgressTodaySection from '@components/InProgressTodaySection';
import SportTabs from '@components/SportTabs';
import TVGuideGrid from '@components/TVGuideGrid';
import EmptyState from '@components/EmptyState';
import tvIcon from '../../assets/images/tv-icon.png';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<{ navigate: (screen: string) => void }>();
  const { games, setGames, loading, setLoading, error, setError, preferences, clearCache } =
    useGameStore();

  const [refreshing, setRefreshing] = useState(false);
  const [filteredSport, setFilteredSport] = useState<SportType | null>(null);

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
   * Get games to display (filtered by sport if selected)
   */
  const displayGames = filteredSport
    ? games.get(filteredSport) || []
    : getAllGames(useGameStore.getState());

  /**
   * Render content
   */
  const allGames = getAllGames(useGameStore.getState());

  const renderContent = () => {
    if (loading && !refreshing && allGames.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
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
        <InProgressTodaySection games={getLiveGames(useGameStore.getState())} />

        {/* Sport Type Tabs */}
        <SportTabs
          selectedSport={filteredSport}
          onSelectSport={setFilteredSport}
          onBracketPress={() => navigation.navigate('Bracket')}
        />

        {/* TV Guide Grid or filtered empty state */}
        {displayGames.length > 0 ? (
          <TVGuideGrid games={displayGames} />
        ) : (
          <EmptyState
            title={EMPTY_STATE_MESSAGES.NO_GAMES_TODAY.title}
            subtitle={EMPTY_STATE_MESSAGES.NO_GAMES_TODAY.subtitle}
            description={EMPTY_STATE_MESSAGES.NO_GAMES_TODAY.description}
            onRetry={handleRefresh}
          />
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <Image source={tvIcon} style={styles.headerIcon} />
        <Text style={styles.headerTitle}>Sports TV Guide</Text>
      </View>
      <View style={styles.scrollView}>{renderContent()}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.LIGHT_BG,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  headerIcon: {
    width: 28,
    height: 28,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.WHITE,
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
    color: COLORS.LIGHT_TEXT,
  },
});

export default HomeScreen;
