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
  Modal,
} from 'react-native';

import { Game } from '@types/index';
import { NATIONAL_BROADCAST_NETWORKS, SPORTS, TIME_SLOTS } from '@constants/index';
import { ThemeColors } from '@constants/theme';
import { useTheme } from '@/hooks/useTheme';
import BoxScoreModal from './BoxScoreModal';

const HEADER_HEIGHT = 50;
const SCROLL_HINT_HEIGHT = 30;
const MAX_VISIBLE_GAMES_PER_SLOT = 3;

interface TVGuideGridProps {
  games: Game[];
}

const parseWins = (record?: string): number => {
  const match = record?.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

const gameMinRank = (game: Game): number =>
  Math.min(game.homeTeam.rank ?? Infinity, game.awayTeam.rank ?? Infinity);

const broadcastTier = (network: string): number =>
  NATIONAL_BROADCAST_NETWORKS.has(network.toUpperCase()) ? 0 : 1;

const combinedWins = (game: Game): number =>
  parseWins(game.homeTeam.record) + parseWins(game.awayTeam.record);

/**
 * Order games within a single slot/sport cell: national broadcast (ABC/CBS/
 * NBC/FOX/ESPN) over cable/streaming first, then best rank, then combined
 * win total as a tiebreaker -- so when a slot has more games than the grid
 * can show (e.g. NCAAF's noon-ET slot), the most notable ones survive the cut.
 */
const compareGamePopularity = (a: Game, b: Game): number => {
  const tierDiff = broadcastTier(a.network) - broadcastTier(b.network);
  if (tierDiff !== 0) return tierDiff;

  const rankDiff = gameMinRank(a) - gameMinRank(b);
  if (rankDiff !== 0) return rankDiff;

  return combinedWins(b) - combinedWins(a);
};

const TVGuideGrid: React.FC<TVGuideGridProps> = ({ games }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [expandedSlot, setExpandedSlot] = useState<{ sport: string; slot: string } | null>(null);
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
    return games
      .filter((g) => getColumnSport(g.sport) === sport && getTimeSlot(g) === timeSlot)
      .sort(compareGamePopularity);
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
                const visibleGames = slotsGames.slice(0, MAX_VISIBLE_GAMES_PER_SLOT);
                const overflowCount = slotsGames.length - visibleGames.length;

                return (
                  <View
                    key={`${sport}-${slot}`}
                    style={[
                      styles.gameCell,
                      { width: columnWidth },
                      slotsGames.length > 0 ? styles.gameCellWithContent : styles.gameCellEmpty,
                    ]}
                  >
                    {slotsGames.length > 0 ? (
                      <View style={styles.gameContent}>
                        {visibleGames.map((game) => {
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
                        {overflowCount > 0 && (
                          <TouchableOpacity
                            style={styles.moreGamesPill}
                            onPress={() => setExpandedSlot({ sport, slot })}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.moreGamesText}>+{overflowCount} more</Text>
                          </TouchableOpacity>
                        )}
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

      {/* "+N more" overflow list for a busy slot/sport cell */}
      <Modal
        visible={!!expandedSlot}
        animationType="fade"
        transparent
        onRequestClose={() => setExpandedSlot(null)}
      >
        <TouchableOpacity
          style={styles.expandedOverlay}
          activeOpacity={1}
          onPress={() => setExpandedSlot(null)}
        >
          <TouchableOpacity style={styles.expandedSheet} activeOpacity={1}>
            <View style={styles.expandedHeader}>
              <Text style={styles.expandedTitle}>
                {expandedSlot &&
                  `${SPORTS[expandedSlot.sport as keyof typeof SPORTS]?.displayName ?? ''} · ${expandedSlot.slot}`}
              </Text>
              <TouchableOpacity onPress={() => setExpandedSlot(null)} hitSlop={8}>
                <Text style={styles.expandedClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.expandedList}>
              {expandedSlot &&
                getGamesForSlot(expandedSlot.sport, expandedSlot.slot).map((game) => (
                  <TouchableOpacity
                    key={game.id}
                    style={styles.expandedRow}
                    onPress={() => {
                      setExpandedSlot(null);
                      setSelectedGame(game);
                    }}
                  >
                    <Text style={styles.expandedRowText} numberOfLines={1}>
                      {game.awayTeam.abbreviation} @ {game.homeTeam.abbreviation}
                    </Text>
                    <Text style={styles.expandedRowNetwork}>{game.network}</Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
    gameCellEmpty: {
      backgroundColor: theme.background,
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
      color: 'transparent',
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
    moreGamesPill: {
      alignSelf: 'center',
      backgroundColor: theme.primary,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
      marginTop: 2,
    },
    moreGamesText: {
      fontSize: 9,
      fontWeight: '600',
      color: theme.textInverse,
    },
    expandedOverlay: {
      flex: 1,
      backgroundColor: theme.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    expandedSheet: {
      width: '100%',
      maxWidth: 360,
      maxHeight: '70%',
      backgroundColor: theme.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    expandedHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.primary,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    expandedTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.textInverse,
    },
    expandedClose: {
      fontSize: 16,
      color: theme.textInverse,
    },
    expandedList: {
      maxHeight: 320,
    },
    expandedRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    expandedRowText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.text,
      flex: 1,
      marginRight: 8,
    },
    expandedRowNetwork: {
      fontSize: 11,
      color: theme.textSecondary,
    },
  });

export default TVGuideGrid;
