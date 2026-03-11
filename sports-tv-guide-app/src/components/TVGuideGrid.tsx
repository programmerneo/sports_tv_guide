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
  Dimensions,
  Image,
} from 'react-native';

import { Game } from '@types/index';
import { COLORS, SPORTS, TIME_SLOTS } from '@constants/index';
import BoxScoreModal from './BoxScoreModal';

const HEADER_HEIGHT = 50;
const SCROLL_HINT_HEIGHT = 30;

interface TVGuideGridProps {
  games: Game[];
}

const TVGuideGrid: React.FC<TVGuideGridProps> = ({ games }) => {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const verticalScrollRef = useRef<ScrollView>(null);
  const hasScrolled = useRef(false);

  /**
   * Get unique sports from games
   */
  const sports = useMemo(() => {
    const uniqueSports = new Set(games.map((g) => g.sport));
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
    return games.filter((g) => g.sport === sport && getTimeSlot(g) === timeSlot);
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

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const columnWidth = (screenWidth - 60) / Math.max(sports.length, 1);
  // Reserve space for header bar, in-progress section, sport tabs, and bottom nav
  const gridHeight = screenHeight - 250;

  if (games.length === 0) {
    return null;
  }

  return (
    <>
      <View style={[styles.container, { height: gridHeight }]}>
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
                          return (
                            <TouchableOpacity
                              key={game.id}
                              style={styles.gameMini}
                              onPress={() => setSelectedGame(game)}
                              activeOpacity={0.7}
                            >
                              {/* Teams with logos */}
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.WHITE,
    marginHorizontal: 8,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  row: {
    flexDirection: 'row',
  },
  timeColumnHeader: {
    width: 50,
  },
  headerCell: {
    backgroundColor: COLORS.PRIMARY,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
    borderRightWidth: 1,
    borderRightColor: COLORS.BORDER,
    justifyContent: 'center',
    alignItems: 'center',
    height: HEADER_HEIGHT,
    paddingHorizontal: 8,
  },
  sportHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.WHITE,
    textAlign: 'center',
  },
  timeCell: {
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
    borderRightWidth: 1,
    borderRightColor: COLORS.BORDER,
    backgroundColor: COLORS.LIGHT_BG,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.DARK_TEXT,
    textAlign: 'center',
  },
  gameCell: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
    borderRightWidth: 1,
    borderRightColor: COLORS.BORDER,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
  },
  gameCellWithContent: {
    backgroundColor: '#f9f9f9',
  },
  gameContent: {
    width: '100%',
  },
  gameMini: {
    alignItems: 'center',
    marginBottom: 4,
    paddingHorizontal: 4,
    paddingVertical: 4,
    backgroundColor: COLORS.WHITE,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
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
    color: COLORS.DARK_TEXT,
  },
  vsText: {
    fontSize: 9,
    color: COLORS.LIGHT_TEXT,
    marginVertical: 1,
  },
  gameTime: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.DARK_TEXT,
    marginTop: 3,
  },
  networkText: {
    fontSize: 8,
    color: COLORS.LIGHT_TEXT,
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
    color: COLORS.LIGHT_TEXT,
    fontWeight: '500',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.LIVE_RED,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  liveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.WHITE,
    marginRight: 2,
  },
  liveText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: COLORS.WHITE,
  },
  liveScore: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.LIVE_RED,
    marginLeft: 2,
  },
  finalBadge: {
    backgroundColor: COLORS.LIGHT_TEXT,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    marginTop: 3,
  },
  finalText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: COLORS.WHITE,
  },
  finalScore: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.DARK_TEXT,
    marginTop: 2,
  },
  emptyCell: {
    fontSize: 12,
    color: COLORS.LIGHT_TEXT,
    fontWeight: '300',
  },
  scrollHint: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: SCROLL_HINT_HEIGHT,
    backgroundColor: COLORS.LIGHT_BG,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    gap: 6,
  },
  scrollHintText: {
    fontSize: 11,
    color: COLORS.LIGHT_TEXT,
    fontWeight: '500',
  },
  scrollHintArrow: {
    fontSize: 10,
    color: COLORS.LIGHT_TEXT,
  },
});

export default TVGuideGrid;
