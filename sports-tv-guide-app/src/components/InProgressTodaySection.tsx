/**
 * In Progress Today Section - Shows live and upcoming games at the top
 */

import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, Image } from 'react-native';

import { Game } from '@types/index';
import { COLORS, SPORTS } from '@constants/index';
import BoxScoreModal from './BoxScoreModal';

interface InProgressTodaySectionProps {
  games: Game[];
}

const InProgressTodaySection: React.FC<InProgressTodaySectionProps> = ({ games }) => {
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.WHITE,
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
    color: COLORS.LIGHT_TEXT,
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
    backgroundColor: COLORS.BORDER,
  },
  sportLabelContainer: {
    justifyContent: 'center',
    marginRight: 8,
  },
  sportLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.LIGHT_TEXT,
    textTransform: 'uppercase',
  },
  gameCard: {
    backgroundColor: COLORS.LIGHT_BG,
    borderRadius: 12,
    padding: 12,
    marginRight: 8,
    width: 140,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.PRIMARY,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  networkText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.LIGHT_TEXT,
  },
  countdown: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.PRIMARY,
    backgroundColor: COLORS.LIGHT_BG,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  countdownLive: {
    color: COLORS.LIVE_RED,
    backgroundColor: '#fff0f0',
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
    color: COLORS.DARK_TEXT,
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
    color: COLORS.DARK_TEXT,
  },
  vs: {
    fontSize: 10,
    color: COLORS.LIGHT_TEXT,
    marginHorizontal: 4,
  },
  liveScore: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 8,
    padding: 6,
    alignItems: 'center',
  },
  score: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.WHITE,
  },
  quarter: {
    fontSize: 10,
    color: COLORS.WHITE,
    marginTop: 2,
  },
  finalScore: {
    backgroundColor: COLORS.LIGHT_TEXT,
    borderRadius: 8,
    padding: 6,
    alignItems: 'center',
  },
  finalLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.WHITE,
    marginTop: 2,
  },
});

export default InProgressTodaySection;
