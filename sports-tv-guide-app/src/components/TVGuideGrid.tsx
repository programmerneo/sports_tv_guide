/**
 * TV Guide Grid - Main grid layout showing games organized by time and sport
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  Image,
} from 'react-native';

import { Game } from '@types/index';
import { SPORTS, TIME_SLOTS } from '@constants/index';
import { ThemeColors } from '@constants/theme';
import { useTheme } from '@/hooks/useTheme';
import BoxScoreModal from './BoxScoreModal';

const HEADER_HEIGHT = 50;
const SCROLL_HINT_HEIGHT = 30;

interface TVGuideGridProps {
  games: Game[];
}

const TVGuideGrid: React.FC<TVGuideGridProps> = ({ games }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const verticalScrollRef = useRef<ScrollView>(null);
  const hasScrolled = useRef(false);

  /**
   * Normalize sport to its display column (e.g. golf-liv → golf-pga so both tours share one column)
   */
  const getColumnSport = (sport: string): string => (sport === 'golf-liv' ? 'golf-pga' : sport);

  /**
   * Get unique sports from games
   */
  const sports = useMemo(() => {
    const uniqueSports = new Set(games.map((g) => getColumnSport(g.sport)));
    return Array.from(uniqueSports);
  }, [games]);

  /**
   * Map a time slot label to its 24-hour value for comparison
   */
  const slotToHour = (slot: string): number => {
    const [timePart, period] = slot.split(' ');
    const [hourStr, minStr] = timePart.split(':');
    let hour = parseInt(hourStr);
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    return hour + parseInt(minStr) / 60;
  };

  /**
   * Find the closest time slot for a game
   */
  const getTimeSlot = (game: Game): string => {
    const date = new Date(game.startTime);
    const gameHour = date.getHours() + date.getMinutes() / 60;

    let closest = TIME_SLOTS[0];
    let minDiff = Infinity;
    for (const slot of TIME_SLOTS) {
      const diff = Math.abs(gameHour - slotToHour(slot));
      if (diff < minDiff) {
        minDiff = diff;
        closest = slot;
      }
    }
    return closest;
  };

  /**
   * Get games for a specific sport and time slot
   */
  const getGamesForSlot = (sport: string, timeSlot: string): Game[] => {
    return games.filter((g) => getColumnSport(g.sport) === sport && getTimeSlot(g) === timeSlot);
  };

  /**
   * Filter to only time slots that have at least one game across all sports
   */
  const activeTimeSlots = useMemo(() => {
    return TIME_SLOTS.filter((slot) =>
      sports.some((sport) => getGamesForSlot(sport, slot).length > 0)
    );
  }, [games, sports]);

  /**
   * Find the index of the active time slot ~30 minutes before the current time
   * so the user starts with a bit of recent context visible.
   */
  const currentSlotIndex = useMemo(() => {
    const now = new Date();
    const targetHour = now.getHours() + (now.getMinutes() - 30) / 60;

    let closestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < activeTimeSlots.length; i++) {
      const diff = Math.abs(targetHour - slotToHour(activeTimeSlots[i]));
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    return closestIdx;
  }, [activeTimeSlots]);

  /**
   * Auto-scroll to the target time slot once content is laid out.
   * Uses onContentSizeChange which fires reliably after all rows are measured.
   */
  const rowOffsets = useRef<Record<number, number>>({});

  const handleRowLayout = useCallback((index: number, y: number) => {
    rowOffsets.current[index] = y;
  }, []);

  const handleContentSizeChange = useCallback(() => {
    if (hasScrolled.current) return;
    const targetY = rowOffsets.current[currentSlotIndex];
    if (targetY != null) {
      hasScrolled.current = true;
      verticalScrollRef.current?.scrollTo({ y: targetY, animated: false });
    }
  }, [currentSlotIndex]);

  const { width: screenWidth } = useWindowDimensions();
  const columnWidth = (screenWidth - 60) / Math.max(sports.length, 1);

  if (games.length === 0) {
    return null;
  }

  return (
    <>
      <View style={[styles.container, { flex: 1 }]}>
        {/* Header Row: pinned above the vertical scroll */}
        <View style={styles.row}>
          <View style={[styles.headerCell, styles.timeColumnHeader]} />
          {sports.map((sport) => (
            <View key={sport} style={[styles.headerCell, { width: columnWidth }]}>
              <Text style={styles.sportHeaderText}>
                {SPORTS[sport]?.emoji} {SPORTS[sport]?.displayName}
              </Text>
            </View>
          ))}
        </View>

        {/* Scrollable data rows */}
        <ScrollView
          ref={verticalScrollRef}
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={true}
          style={{ flex: 1 }}
          onContentSizeChange={handleContentSizeChange}
        >
          {activeTimeSlots.map((slot, index) => (
            <View
              key={slot}
              style={styles.row}
              onLayout={(e) => handleRowLayout(index, e.nativeEvent.layout.y)}
            >
              {/* Time Label */}
              <View style={styles.timeCell}>
                <Text style={styles.timeText}>{slot}</Text>
              </View>

              {/* Game cells for each sport */}
              {sports.map((sport) => {
                const slotsGames = getGamesForSlot(sport, slot);

                return (
                  <View
                    key={`${sport}-${slot}`}
                    style={[
                      styles.gameCell,
                      { width: columnWidth },
                      slotsGames.length > 0 && styles.gameCellWithContent,
                    ]}
                  >
                    {slotsGames.length > 0 ? (
                      <View style={styles.gameContent}>
                        {slotsGames.slice(0, 2).map((game) => {
                          const gameTime = new Date(game.startTime).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          });
                          const isGolf = game.sport.startsWith('golf');
                          return (
                            <TouchableOpacity
                              key={game.id}
                              style={styles.gameMini}
                              onPress={() => setSelectedGame(game)}
                              activeOpacity={0.7}
                            >
                              {isGolf ? (
                                /* Golf: show tournament logo (or ⛳ fallback) + name */
                                <View style={styles.teamRow}>
                                  {game.homeTeam.logo ? (
                                    <Image
                                      source={{ uri: game.homeTeam.logo }}
                                      style={styles.teamLogo}
                                    />
                                  ) : (
                                    <Text style={{ fontSize: 14 }}>⛳</Text>
                                  )}
                                  <Text style={styles.teamName} numberOfLines={2}>
                                    {game.homeTeam.name}
                                  </Text>
                                </View>
                              ) : (
                                /* Teams with logos */
                                <>
                                  <View style={styles.teamRow}>
                                    {game.awayTeam.logo && (
                                      <Image
                                        source={{ uri: game.awayTeam.logo }}
                                        style={styles.teamLogo}
                                      />
                                    )}
                                    <Text style={styles.teamName} numberOfLines={1}>
                                      {game.awayTeam.abbreviation}
                                    </Text>
                                  </View>
                                  <Text style={styles.vsText}>@</Text>
                                  <View style={styles.teamRow}>
                                    {game.homeTeam.logo && (
                                      <Image
                                        source={{ uri: game.homeTeam.logo }}
                                        style={styles.teamLogo}
                                      />
                                    )}
                                    <Text style={styles.teamName} numberOfLines={1}>
                                      {game.homeTeam.abbreviation}
                                    </Text>
                                  </View>
                                </>
                              )}

                              {/* Status badge + score */}
                              {game.status === 'completed' ? (
                                <>
                                  <View style={styles.finalBadge}>
                                    <Text style={styles.finalText}>FINAL</Text>
                                  </View>
                                  <Text style={styles.finalScore}>
                                    {game.awayScore}-{game.homeScore}
                                  </Text>
                                </>
                              ) : game.status === 'in_progress' ? (
                                <>
                                  <View style={styles.liveBadge}>
                                    <View style={styles.liveDot} />
                                    <Text style={styles.liveText}>LIVE</Text>
                                  </View>
                                </>
                              ) : (
                                <Text style={styles.gameTime}>{gameTime}</Text>
                              )}

                              {/* Network — always shown */}
                              <Text style={styles.networkText} numberOfLines={1}>
                                {game.network}
                              </Text>

                              {/* Odds — always shown when available */}
                              {game.odds && (
                                <View style={styles.oddsRow}>
                                  {game.odds.spread != null && (
                                    <Text style={styles.oddsText}>
                                      {game.odds.spread > 0 ? '+' : ''}
                                      {game.odds.spread}
                                    </Text>
                                  )}
                                  {game.odds.overUnder != null && (
                                    <Text style={styles.oddsText}>O/U {game.odds.overUnder}</Text>
                                  )}
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ) : (
                      <Text style={styles.emptyCell}>-</Text>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>

        {/* Scroll hint at the bottom */}
        <View style={styles.scrollHint}>
          <Text style={styles.scrollHintArrow}>&#x25B2;</Text>
          <Text style={styles.scrollHintText}>Scroll for more times</Text>
          <Text style={styles.scrollHintArrow}>&#x25BC;</Text>
        </View>
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
      marginHorizontal: 8,
      marginBottom: 16,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.border,
    },
    row: {
      flexDirection: 'row',
    },
    timeColumnHeader: {
      width: 50,
    },
    headerCell: {
      backgroundColor: theme.primary,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      borderRightWidth: 1,
      borderRightColor: theme.border,
      justifyContent: 'center',
      alignItems: 'center',
      height: HEADER_HEIGHT,
      paddingHorizontal: 8,
    },
    sportHeaderText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textInverse,
      textAlign: 'center',
    },
    timeCell: {
      width: 50,
      justifyContent: 'center',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      borderRightWidth: 1,
      borderRightColor: theme.border,
      backgroundColor: theme.background,
      paddingHorizontal: 4,
      paddingVertical: 8,
    },
    timeText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.text,
      textAlign: 'center',
    },
    gameCell: {
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      borderRightWidth: 1,
      borderRightColor: theme.border,
      padding: 4,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.surface,
    },
    gameCellWithContent: {
      backgroundColor: theme.surfaceAlt,
    },
    gameContent: {
      width: '100%',
    },
    gameMini: {
      alignItems: 'center',
      marginBottom: 4,
      paddingHorizontal: 4,
      paddingVertical: 4,
      backgroundColor: theme.surface,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: theme.border,
    },
    teamRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    teamLogo: {
      width: 18,
      height: 18,
      borderRadius: 2,
    },
    teamName: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.text,
    },
    vsText: {
      fontSize: 9,
      color: theme.textSecondary,
      marginVertical: 1,
    },
    gameTime: {
      fontSize: 9,
      fontWeight: '600',
      color: theme.text,
      marginTop: 3,
    },
    networkText: {
      fontSize: 8,
      color: theme.textSecondary,
      fontWeight: '500',
      marginTop: 2,
    },
    oddsRow: {
      flexDirection: 'row',
      gap: 4,
      marginTop: 2,
    },
    oddsText: {
      fontSize: 7,
      color: theme.textSecondary,
      fontWeight: '500',
    },
    liveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.live,
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 3,
    },
    liveDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.textInverse,
      marginRight: 2,
    },
    liveText: {
      fontSize: 8,
      fontWeight: 'bold',
      color: theme.textInverse,
    },
    liveScore: {
      fontSize: 10,
      fontWeight: 'bold',
      color: theme.live,
      marginLeft: 2,
    },
    finalBadge: {
      backgroundColor: theme.textSecondary,
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 3,
      marginTop: 3,
    },
    finalText: {
      fontSize: 8,
      fontWeight: 'bold',
      color: theme.textInverse,
    },
    finalScore: {
      fontSize: 10,
      fontWeight: 'bold',
      color: theme.text,
      marginTop: 2,
    },
    emptyCell: {
      fontSize: 12,
      color: theme.textSecondary,
      fontWeight: '300',
    },
    scrollHint: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      height: SCROLL_HINT_HEIGHT,
      backgroundColor: theme.background,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      gap: 6,
    },
    scrollHintText: {
      fontSize: 11,
      color: theme.textSecondary,
      fontWeight: '500',
    },
    scrollHintArrow: {
      fontSize: 10,
      color: theme.textSecondary,
    },
  });

export default TVGuideGrid;
