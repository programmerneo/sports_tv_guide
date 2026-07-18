/**
 * In Progress Today Section - Shows live and upcoming games at the top
 */

import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, Image } from 'react-native';

import { Game } from '@types/index';
import { SPORTS } from '@constants/index';
import { ThemeColors } from '@constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useGameStore } from '@store/gameStore';
import BoxScoreModal from './BoxScoreModal';

interface InProgressTodaySectionProps {
  games: Game[];
}

const InProgressTodaySection: React.FC<InProgressTodaySectionProps> = ({ games }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const favoriteGames = useGameStore((s) => s.preferences.favoriteGames);
  const toggleFavoriteGame = useGameStore((s) => s.toggleFavoriteGame);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  const formatCountdown = (startTime: string): string => {
    const now = new Date();
    const start = new Date(startTime);
    const diff = start.getTime() - now.getTime();

    if (diff < 0) return 'LIVE';

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  const gamesBySport = useMemo(() => {
    const grouped = new Map<string, Game[]>();
    for (const game of games) {
      const existing = grouped.get(game.sport) || [];
      existing.push(game);
      grouped.set(game.sport, existing);
    }
    return grouped;
  }, [games]);

  if (games.length === 0) {
    return null;
  }

  const sportKeys = Array.from(gamesBySport.keys());

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>In Progress ({games.length})</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          style={styles.scrollContainer}
          contentContainerStyle={styles.contentContainer}
        >
          {sportKeys.map((sport, sportIndex) => (
            <React.Fragment key={sport}>
              {sportIndex > 0 && (
                <View style={styles.sportDivider}>
                  <View style={styles.dividerLine} />
                </View>
              )}
              <View style={styles.sportLabelContainer}>
                <Text style={styles.sportLabel}>
                  {SPORTS[sport as keyof typeof SPORTS]?.emoji}{' '}
                  {SPORTS[sport as keyof typeof SPORTS]?.displayName || sport}
                </Text>
              </View>
              {gamesBySport.get(sport)!.map((game) => (
                <TouchableOpacity
                  key={game.id}
                  style={styles.gameCard}
                  onPress={() => setSelectedGame(game)}
                  activeOpacity={0.7}
                >
                  <TouchableOpacity
                    style={styles.favoriteButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      toggleFavoriteGame(game.id);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel={
                      favoriteGames.includes(game.id)
                        ? 'Remove from favorites'
                        : 'Add to favorites'
                    }
                    accessibilityRole="button"
                  >
                    <Text
                      style={[
                        styles.favoriteStar,
                        favoriteGames.includes(game.id) && styles.favoriteStarActive,
                      ]}
                    >
                      {favoriteGames.includes(game.id) ? '★' : '☆'}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.gameHeader}>
                    <Text style={styles.networkText}>{game.network}</Text>
                    <Text
                      style={[
                        styles.countdown,
                        formatCountdown(game.startTime) === 'LIVE' && styles.countdownLive,
                      ]}
                    >
                      {formatCountdown(game.startTime)}
                    </Text>
                  </View>

                  {game.sport.startsWith('golf') ? (
                    <View style={styles.golfMatchup}>
                      <Text style={styles.golfEmoji}>⛳</Text>
                      <Text style={styles.golfTournament} numberOfLines={2}>
                        {game.homeTeam.name}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.matchup}>
                      <View style={styles.team}>
                        {game.awayTeam.logo ? (
                          <Image source={{ uri: game.awayTeam.logo }} style={styles.teamLogo} />
                        ) : (
                          <Text style={styles.teamEmoji}>{SPORTS[game.sport]?.emoji || '🏆'}</Text>
                        )}
                        <Text style={styles.teamName}>{game.awayTeam.abbreviation}</Text>
                      </View>

                      <Text style={styles.vs}>vs</Text>

                      <View style={styles.team}>
                        {game.homeTeam.logo ? (
                          <Image source={{ uri: game.homeTeam.logo }} style={styles.teamLogo} />
                        ) : (
                          <Text style={styles.teamEmoji}>{SPORTS[game.sport]?.emoji || '🏆'}</Text>
                        )}
                        <Text style={styles.teamName}>{game.homeTeam.abbreviation}</Text>
                      </View>
                    </View>
                  )}

                  {game.sport.startsWith('golf') ? (
                    <View style={styles.liveScore}>
                      <Text style={styles.score}>View</Text>
                    </View>
                  ) : (
                    <>
                      {game.status === 'in_progress' && (
                        <View style={styles.liveScore}>
                          <Text style={styles.score}>
                            {game.awayScore} - {game.homeScore}
                          </Text>
                          {game.statusDetail && (
                            <Text style={styles.quarter}>{game.statusDetail}</Text>
                          )}
                        </View>
                      )}
                      {game.status === 'completed' && (
                        <View style={styles.finalScore}>
                          <Text style={styles.score}>
                            {game.awayScore} - {game.homeScore}
                          </Text>
                          <Text style={styles.finalLabel}>FINAL</Text>
                        </View>
                      )}
                    </>
                  )}
                </TouchableOpacity>
              ))}
            </React.Fragment>
          ))}
        </ScrollView>
      </View>

      {/* Box Score Modal */}
      {selectedGame && (
        <BoxScoreModal
          game={selectedGame}
          visible={!!selectedGame}
          onClose={() => setSelectedGame(null)}
        />
      )}
    </>
  );
};

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.surface,
      paddingVertical: 12,
      marginBottom: 8,
    },
    header: {
      marginBottom: 12,
      paddingHorizontal: 16,
    },
    title: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
      textTransform: 'uppercase',
    },
    scrollContainer: {
      marginBottom: 8,
    },
    contentContainer: {
      paddingLeft: 16,
      paddingRight: 16,
      alignItems: 'center',
    },
    sportDivider: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    dividerLine: {
      width: 1,
      height: 80,
      backgroundColor: theme.border,
    },
    sportLabelContainer: {
      justifyContent: 'center',
      marginRight: 8,
    },
    sportLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textSecondary,
      textTransform: 'uppercase',
    },
    gameCard: {
      backgroundColor: theme.background,
      borderRadius: 12,
      padding: 12,
      marginRight: 8,
      width: 140,
      borderLeftWidth: 4,
      borderLeftColor: theme.primary,
    },
    gameHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
      paddingRight: 18,
    },
    favoriteButton: {
      position: 'absolute',
      top: 4,
      right: 4,
      zIndex: 2,
      padding: 2,
    },
    favoriteStar: {
      fontSize: 16,
      lineHeight: 18,
      color: theme.textSecondary,
    },
    favoriteStarActive: {
      color: theme.secondary,
    },
    networkText: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    countdown: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.primary,
      backgroundColor: theme.background,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    countdownLive: {
      color: theme.live,
      backgroundColor: theme.surfaceAlt,
    },
    golfMatchup: {
      alignItems: 'center',
      marginBottom: 8,
    },
    golfEmoji: {
      fontSize: 24,
      marginBottom: 4,
    },
    golfTournament: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.text,
      textAlign: 'center',
    },
    matchup: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    team: {
      flex: 1,
      alignItems: 'center',
    },
    teamLogo: {
      width: 28,
      height: 28,
      borderRadius: 4,
      marginBottom: 2,
    },
    teamEmoji: {
      fontSize: 28,
      marginBottom: 2,
    },
    teamName: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.text,
    },
    vs: {
      fontSize: 10,
      color: theme.textSecondary,
      marginHorizontal: 4,
    },
    liveScore: {
      backgroundColor: theme.primary,
      borderRadius: 8,
      padding: 6,
      alignItems: 'center',
    },
    score: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.textInverse,
    },
    quarter: {
      fontSize: 10,
      color: theme.textInverse,
      marginTop: 2,
    },
    finalScore: {
      backgroundColor: theme.textSecondary,
      borderRadius: 8,
      padding: 6,
      alignItems: 'center',
    },
    finalLabel: {
      fontSize: 10,
      fontWeight: 'bold',
      color: theme.textInverse,
      marginTop: 2,
    },
  });

export default InProgressTodaySection;
