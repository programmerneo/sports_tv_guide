/**
 * Empty State - Shows when there are no games
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

import { Game } from '@types/index';
import { COLORS, SPORTS } from '@constants/index';
import { apiService } from '@services/api';
import { useGameStore } from '@store/gameStore';

interface EmptyStateProps {
  title: string;
  subtitle: string;
  description: string;
  showTomorrowsGames?: boolean;
  onRetry?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  subtitle,
  description,
  showTomorrowsGames = false,
  onRetry,
}) => {
  const [tomorrowsGames, setTomorrowsGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const preferences = useGameStore((state) => state.preferences);

  useEffect(() => {
    if (showTomorrowsGames) {
      loadTomorrowsGames();
    }
  }, [showTomorrowsGames, preferences.selectedSports]);

  const loadTomorrowsGames = async () => {
    setLoading(true);
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const sportSchedules = await apiService.getMultipleSports(
        preferences.selectedSports,
        tomorrow
      );

      const allGames: Game[] = [];
      sportSchedules.forEach((games) => {
        allGames.push(...games);
      });

      setTomorrowsGames(allGames);
    } catch (error) {
      console.error("Failed to load tomorrow's games:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, styles.content]}>
      {/* Main Message */}
      <View style={styles.messageContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      {/* Retry Button */}
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.7}>
          <Text style={styles.retryButtonText}>🔄 Try Again</Text>
        </TouchableOpacity>
      )}

      {/* Tomorrow's Games Section */}
      {showTomorrowsGames && (
        <View style={styles.tomorrowSection}>
          <Text style={styles.tomorrowTitle}>📅 Games Tomorrow</Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.PRIMARY} />
              <Text style={styles.loadingText}>Loading tomorrow's games...</Text>
            </View>
          ) : tomorrowsGames.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tomorrowScroll}
              contentContainerStyle={styles.tomorrowContent}
            >
              {tomorrowsGames.slice(0, 6).map((game) => (
                <View key={game.id} style={styles.tomorrowGame}>
                  <View style={styles.tomorrowGameHeader}>
                    <Text style={styles.tomorrowSport}>{SPORTS[game.sport]?.emoji}</Text>
                  </View>

                  <View style={styles.tomorrowMatchup}>
                    <Text style={styles.tomorrowTeam} numberOfLines={1}>
                      {game.awayTeam.abbreviation}
                    </Text>
                    <Text style={styles.tomorrowVs}>vs</Text>
                    <Text style={styles.tomorrowTeam} numberOfLines={1}>
                      {game.homeTeam.abbreviation}
                    </Text>
                  </View>

                  <Text style={styles.tomorrowTime}>
                    {new Date(game.startTime).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </Text>

                  <Text style={styles.tomorrowNetwork}>{game.network}</Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.noTomorrowText}>No games tomorrow either. Check again soon!</Text>
          )}
        </View>
      )}

      {/* Helpful Tips */}
      <View style={styles.tipsSection}>
        <Text style={styles.tipsTitle}>💡 Tips</Text>
        <View style={styles.tipItem}>
          <Text style={styles.tipDot}>•</Text>
          <Text style={styles.tipText}>Pull down to refresh and check for live games</Text>
        </View>
        <View style={styles.tipItem}>
          <Text style={styles.tipDot}>•</Text>
          <Text style={styles.tipText}>Tap ⭐ to add your favorite teams and games</Text>
        </View>
        <View style={styles.tipItem}>
          <Text style={styles.tipDot}>•</Text>
          <Text style={styles.tipText}>Use 🔔 to set reminders for upcoming games</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.LIGHT_BG,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 40,
    alignItems: 'center',
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.DARK_TEXT,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.LIGHT_TEXT,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: COLORS.LIGHT_TEXT,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 32,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.WHITE,
  },
  tomorrowSection: {
    width: '100%',
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  tomorrowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.DARK_TEXT,
    marginBottom: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    fontSize: 12,
    color: COLORS.LIGHT_TEXT,
    marginTop: 8,
  },
  tomorrowScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  tomorrowContent: {
    paddingRight: 8,
  },
  tomorrowGame: {
    backgroundColor: COLORS.LIGHT_BG,
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    width: 120,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  tomorrowGameHeader: {
    marginBottom: 8,
  },
  tomorrowSport: {
    fontSize: 24,
  },
  tomorrowMatchup: {
    alignItems: 'center',
    marginBottom: 8,
  },
  tomorrowTeam: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.DARK_TEXT,
  },
  tomorrowVs: {
    fontSize: 9,
    color: COLORS.LIGHT_TEXT,
    marginVertical: 2,
  },
  tomorrowTime: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.PRIMARY,
    marginBottom: 4,
  },
  tomorrowNetwork: {
    fontSize: 9,
    color: COLORS.LIGHT_TEXT,
  },
  noTomorrowText: {
    fontSize: 12,
    color: COLORS.LIGHT_TEXT,
    textAlign: 'center',
    paddingVertical: 12,
  },
  tipsSection: {
    width: '100%',
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    padding: 16,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.DARK_TEXT,
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  tipDot: {
    fontSize: 12,
    color: COLORS.PRIMARY,
    marginRight: 8,
    fontWeight: 'bold',
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.LIGHT_TEXT,
    lineHeight: 18,
  },
});

export default EmptyState;
