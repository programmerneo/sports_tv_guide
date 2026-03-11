/**
 * Box Score Modal - Displays detailed game information
 * For golf events, shows the tournament leaderboard (top 30)
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Game, GameSummary, GolfLeaderboard, GolfLeaderboardEntry } from '@types/index';
import { COLORS, SPORTS, GAME_REFRESH_INTERVAL } from '@constants/index';
import { apiService } from '@services/api';

interface BoxScoreModalProps {
  game: Game;
  visible: boolean;
  onClose: () => void;
}

const isGolfSport = (sport: string): boolean => sport === 'golf-pga' || sport === 'golf-liv';

/**
 * Parse a hex color string (with or without '#') into [r, g, b].
 */
export const parseHex = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

/**
 * Compute simple Euclidean distance between two hex colors.
 */
export const colorDistance = (a: string, b: string): number => {
  const [r1, g1, b1] = parseHex(a);
  const [r2, g2, b2] = parseHex(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
};

/**
 * Lighten a hex color by mixing it with white.
 * amount: 0 = original, 1 = white
 */
export const lightenColor = (hex: string, amount: number): string => {
  const [r, g, b] = parseHex(hex);
  const lighten = (c: number) => Math.round(c + (255 - c) * amount);
  return `#${lighten(r).toString(16).padStart(2, '0')}${lighten(g).toString(16).padStart(2, '0')}${lighten(b).toString(16).padStart(2, '0')}`;
};

/**
 * Ensure two bar colors are visually distinguishable.
 * If they're too similar, lighten the away team color.
 */
export const ensureContrastingColors = (away: string, home: string): [string, string] => {
  const MIN_DISTANCE = 80;
  if (colorDistance(away, home) < MIN_DISTANCE) {
    return [lightenColor(away, 0.45), home];
  }
  return [away, home];
};

const BoxScoreModal: React.FC<BoxScoreModalProps> = ({ game, visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const [gameSummary, setGameSummary] = useState<GameSummary>(game as GameSummary);
  const [golfLeaderboard, setGolfLeaderboard] = useState<GolfLeaderboard | null>(null);
  const [loading, setLoading] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isGolf = isGolfSport(game.sport);

  useEffect(() => {
    if (visible) {
      if (isGolf) {
        loadGolfLeaderboard();
      } else {
        loadGameSummary();
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visible, game.id]);

  // Auto-refresh for live games/tournaments
  useEffect(() => {
    const isLive = isGolf ? game.status === 'in_progress' : gameSummary.status === 'in_progress';

    if (visible && isLive) {
      intervalRef.current = setInterval(
        isGolf ? loadGolfLeaderboard : loadGameSummary,
        GAME_REFRESH_INTERVAL
      );
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visible, gameSummary.status, game.status]);

  const loadGameSummary = async () => {
    setLoading(true);
    try {
      const summary = await apiService.getGameSummary(game.sport, game.eventId);
      setGameSummary(summary);
    } catch (error) {
      console.error('Failed to load game summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGolfLeaderboard = async () => {
    setLoading(true);
    try {
      const leaderboard = await apiService.getGolfLeaderboard(game.eventId);
      setGolfLeaderboard(leaderboard);
    } catch (error) {
      console.error('Failed to load golf leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = isGolf ? loadGolfLeaderboard : loadGameSummary;

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderGolfContent = () => (
    <>
      {/* Tournament Header */}
      <View style={styles.golfTournamentHeader}>
        <Text style={styles.golfTournamentEmoji}>⛳</Text>
        <Text style={styles.golfTournamentName}>{game.homeTeam.name}</Text>
        {game.awayTeam.name ? (
          <Text style={styles.golfCourseName}>{game.awayTeam.name}</Text>
        ) : null}
        {game.statusDetail && (
          <View style={styles.golfStatusBadge}>
            <Text
              style={[
                styles.golfStatusText,
                game.status === 'in_progress' && styles.golfStatusLive,
              ]}
            >
              {game.status === 'in_progress' ? 'LIVE - ' : ''}
              {game.statusDetail}
            </Text>
          </View>
        )}
        {golfLeaderboard?.statusDetail && !game.statusDetail && (
          <Text style={styles.golfRoundInfo}>{golfLeaderboard.statusDetail}</Text>
        )}
      </View>

      {/* Tournament Info */}
      <View style={styles.infoSection}>
        {game.venue && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Course</Text>
            <View style={styles.infoValueColumn}>
              <Text style={styles.infoValue}>{game.venue}</Text>
              {(game.venueCity || game.venueState) && (
                <Text style={styles.infoValueSecondary}>
                  {[game.venueCity, game.venueState].filter(Boolean).join(', ')}
                </Text>
              )}
            </View>
          </View>
        )}
        {game.network && game.network !== 'TBD' && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Network</Text>
            <Text style={styles.infoValue}>{game.network}</Text>
          </View>
        )}
      </View>

      {/* Leaderboard */}
      {golfLeaderboard && golfLeaderboard.leaderboard.length > 0 ? (
        <View style={styles.leaderboardSection}>
          <Text style={styles.sectionTitle}>Leaderboard - Top 30</Text>

          {/* Leaderboard Header */}
          <View style={styles.leaderboardHeaderRow}>
            <Text style={[styles.leaderboardHeaderText, styles.lbPos]}>POS</Text>
            <Text style={[styles.leaderboardHeaderText, styles.lbName]}>PLAYER</Text>
            <Text style={[styles.leaderboardHeaderText, styles.lbScore]}>SCORE</Text>
            <Text style={[styles.leaderboardHeaderText, styles.lbToday]}>TODAY</Text>
            <Text style={[styles.leaderboardHeaderText, styles.lbThru]}>THRU</Text>
          </View>

          {/* Leaderboard Rows */}
          {golfLeaderboard.leaderboard.map((entry: GolfLeaderboardEntry, index: number) => (
            <View
              key={`${entry.name}-${index}`}
              style={[
                styles.leaderboardRow,
                index % 2 === 0 && styles.leaderboardRowEven,
                index < 3 && styles.leaderboardRowTop3,
              ]}
            >
              <Text style={[styles.leaderboardCell, styles.lbPos, index < 3 && styles.lbPosTop3]}>
                {entry.position}
              </Text>
              <View style={styles.lbName}>
                <Text style={[styles.leaderboardCell, styles.lbPlayerName]} numberOfLines={1}>
                  {entry.name}
                </Text>
                {entry.country ? <Text style={styles.lbCountry}>{entry.country}</Text> : null}
              </View>
              <Text style={[styles.leaderboardCell, styles.lbScore, styles.lbScoreValue]}>
                {entry.totalScore}
              </Text>
              <Text style={[styles.leaderboardCell, styles.lbToday]}>{entry.today || '-'}</Text>
              <Text style={[styles.leaderboardCell, styles.lbThru]}>{entry.thru || '-'}</Text>
            </View>
          ))}
        </View>
      ) : (
        !loading && (
          <View style={styles.noLeaderboard}>
            <Text style={styles.noLeaderboardText}>Leaderboard not yet available</Text>
            <Text style={styles.noLeaderboardSubtext}>Check back when the tournament starts</Text>
          </View>
        )
      )}
    </>
  );

  const renderGameContent = () => (
    <>
      {/* Score Section */}
      <View style={styles.scoreContainer}>
        {/* Away Team */}
        <View style={styles.teamBox}>
          <View style={styles.logoContainer}>
            {game.awayTeam.logo ? (
              <Image source={{ uri: game.awayTeam.logo }} style={styles.teamLogoImage} />
            ) : (
              <Text style={styles.teamLogoLarge}>{SPORTS[game.sport]?.emoji || '🏅'}</Text>
            )}
          </View>
          <Text style={styles.teamNameLarge}>
            {game.awayTeam.rank && <Text style={styles.rankText}>{game.awayTeam.rank} </Text>}
            {game.awayTeam.name}
          </Text>
          {game.awayTeam.record && (
            <Text style={styles.recordLarge}>
              {game.awayTeam.record}
              {game.awayTeam.conferenceRecord &&
                `, ${game.awayTeam.conferenceRecord} ${game.awayTeam.conference || ''}`}
            </Text>
          )}
        </View>

        {/* Center: Score or Pre-game Info */}
        {game.status === 'scheduled' ? (
          <View style={styles.pregameCenter}>
            <Text style={styles.pregameTime}>{formatTime(game.startTime)}</Text>
            {game.odds?.spread !== undefined && (
              <Text style={styles.pregameSpread}>
                {game.homeTeam.abbreviation}{' '}
                {game.odds.spread > 0 ? `+${game.odds.spread}` : game.odds.spread}
              </Text>
            )}
            {game.odds?.overUnder !== undefined && (
              <Text style={styles.pregameOverUnder}>O/U {game.odds.overUnder}</Text>
            )}
            <Text style={styles.pregameNetwork}>{game.network}</Text>
          </View>
        ) : (
          <View style={styles.scoreCenter}>
            <View style={styles.scoreDisplay}>
              <Text style={styles.scoreLarge}>{gameSummary.awayScore ?? '-'}</Text>
              <Text style={styles.scoreSeparator}>-</Text>
              <Text style={styles.scoreLarge}>{gameSummary.homeScore ?? '-'}</Text>
            </View>
            {gameSummary.status === 'in_progress' && gameSummary.statusDetail && (
              <Text style={styles.scoreStatus}>{gameSummary.statusDetail}</Text>
            )}
            {gameSummary.status === 'in_progress' && <Text style={styles.liveLabel}>LIVE</Text>}
            {gameSummary.status === 'completed' && (
              <Text style={styles.scoreStatusFinal}>FINAL</Text>
            )}
          </View>
        )}

        {/* Home Team */}
        <View style={styles.teamBox}>
          <View style={styles.logoContainer}>
            {game.homeTeam.logo ? (
              <Image source={{ uri: game.homeTeam.logo }} style={styles.teamLogoImage} />
            ) : (
              <Text style={styles.teamLogoLarge}>{SPORTS[game.sport]?.emoji || '🏅'}</Text>
            )}
          </View>
          <Text style={styles.teamNameLarge}>
            {game.homeTeam.rank && <Text style={styles.rankText}>{game.homeTeam.rank} </Text>}
            {game.homeTeam.name}
          </Text>
          {game.homeTeam.record && (
            <Text style={styles.recordLarge}>
              {game.homeTeam.record}
              {game.homeTeam.conferenceRecord &&
                `, ${game.homeTeam.conferenceRecord} ${game.homeTeam.conference || ''}`}
            </Text>
          )}
        </View>
      </View>

      {/* Predictor Bar — uses team colors from ESPN (hex without '#') with
           generic blue fallbacks. Shows "FAVORED" label on the higher-projection side.
           Data source: "predictor" (pre-game) or "winprobability" (live/completed). */}
      {(gameSummary.predictor || game.predictor) &&
        (() => {
          const predictor = gameSummary.predictor || game.predictor;
          const awayPct = predictor?.awayTeam?.gameProjection;
          const homePct = predictor?.homeTeam?.gameProjection;
          if (awayPct == null || homePct == null) return null;
          // ESPN returns color as hex without '#' prefix (e.g. "003087")
          const rawAwayColor = game.awayTeam.color ? `#${game.awayTeam.color}` : '#8899cc';
          const rawHomeColor = game.homeTeam.color ? `#${game.homeTeam.color}` : '#3a4d8f';
          const [awayColor, homeColor] = ensureContrastingColors(rawAwayColor, rawHomeColor);
          const awayFavored = awayPct > homePct;
          return (
            <View style={styles.predictorSection}>
              <Text style={styles.predictorTitle}>Matchup Predictor</Text>
              <View style={styles.predictorBarContainer}>
                <View
                  style={[styles.predictorBarAway, { flex: awayPct, backgroundColor: awayColor }]}
                />
                <View
                  style={[styles.predictorBarHome, { flex: homePct, backgroundColor: homeColor }]}
                />
              </View>
              <View style={styles.predictorLabels}>
                <View style={styles.predictorLabelRow}>
                  <Text style={styles.predictorPct}>{awayPct.toFixed(1)}%</Text>
                  {awayFavored && <Text style={styles.predictorFavored}>FAVORED</Text>}
                </View>
                <View style={styles.predictorLabelRow}>
                  {!awayFavored && <Text style={styles.predictorFavored}>FAVORED</Text>}
                  <Text style={styles.predictorPct}>{homePct.toFixed(1)}%</Text>
                </View>
              </View>
            </View>
          );
        })()}

      {/* Game Info */}
      <View style={styles.infoSection}>
        {game.status !== 'scheduled' && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Start Time</Text>
            <Text style={styles.infoValue}>{formatTime(game.startTime)}</Text>
          </View>
        )}

        {game.venue && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Venue</Text>
            <View style={styles.infoValueColumn}>
              <Text style={styles.infoValue}>{game.venue}</Text>
              {(game.venueCity || game.venueState) && (
                <Text style={styles.infoValueSecondary}>
                  {[game.venueCity, game.venueState].filter(Boolean).join(', ')}
                </Text>
              )}
            </View>
          </View>
        )}

        {game.status !== 'scheduled' && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Network</Text>
            <Text style={styles.infoValue}>{game.network}</Text>
          </View>
        )}

        {game.status !== 'scheduled' && game.odds?.spread !== undefined && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Spread</Text>
            <Text style={styles.infoValue}>
              {game.odds.spread > 0 ? `+${game.odds.spread}` : game.odds.spread}
            </Text>
          </View>
        )}

        {game.status !== 'scheduled' && game.odds?.overUnder !== undefined && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Over/Under</Text>
            <Text style={styles.infoValue}>{game.odds.overUnder}</Text>
          </View>
        )}
      </View>

      {/* Box Score (if available) */}
      {gameSummary.boxScore && (
        <View style={styles.boxScoreSection}>
          <Text style={styles.sectionTitle}>Box Score</Text>

          {/* Away Team Stats */}
          {gameSummary.boxScore.awayTeamStats && (
            <View style={styles.teamStatsBox}>
              <Text style={styles.teamStatsName}>{game.awayTeam.abbreviation}</Text>
              <View style={styles.statsGrid}>
                {Object.entries(gameSummary.boxScore.awayTeamStats).map(
                  ([key, value]) =>
                    key !== 'teamId' &&
                    key !== 'teamName' && (
                      <View key={key} style={styles.statItem}>
                        <Text style={styles.statLabel}>{key.toUpperCase().substring(0, 3)}</Text>
                        <Text style={styles.statValue}>{String(value)}</Text>
                      </View>
                    )
                )}
              </View>
            </View>
          )}

          {/* Home Team Stats */}
          {gameSummary.boxScore.homeTeamStats && (
            <View style={styles.teamStatsBox}>
              <Text style={styles.teamStatsName}>{game.homeTeam.abbreviation}</Text>
              <View style={styles.statsGrid}>
                {Object.entries(gameSummary.boxScore.homeTeamStats).map(
                  ([key, value]) =>
                    key !== 'teamId' &&
                    key !== 'teamName' && (
                      <View key={key} style={styles.statItem}>
                        <Text style={styles.statLabel}>{key.toUpperCase().substring(0, 3)}</Text>
                        <Text style={styles.statValue}>{String(value)}</Text>
                      </View>
                    )
                )}
              </View>
            </View>
          )}
        </View>
      )}
    </>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕ Close</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isGolf ? 'Tournament Leaderboard' : 'Game Details'}
          </Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
            <Text style={styles.refreshText}>🔄</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
          {isGolf ? renderGolfContent() : renderGameContent()}

          {/* Notify Button */}
          <TouchableOpacity style={styles.notifyButtonLarge}>
            <Text style={styles.notifyButtonText}>🔔 Set Reminder</Text>
          </TouchableOpacity>

          <View style={styles.spacer} />
        </ScrollView>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.LIGHT_BG,
  },
  header: {
    backgroundColor: COLORS.PRIMARY,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.WHITE,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.WHITE,
  },
  refreshButton: {
    padding: 8,
  },
  refreshText: {
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // ── Golf Tournament Header ─────────────────────────────────────────────────
  golfTournamentHeader: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  golfTournamentEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  golfTournamentName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.DARK_TEXT,
    textAlign: 'center',
    marginBottom: 4,
  },
  golfCourseName: {
    fontSize: 14,
    color: COLORS.LIGHT_TEXT,
    textAlign: 'center',
    marginBottom: 8,
  },
  golfStatusBadge: {
    backgroundColor: COLORS.LIGHT_BG,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 4,
  },
  golfStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.DARK_TEXT,
  },
  golfStatusLive: {
    color: COLORS.LIVE_RED,
  },
  golfRoundInfo: {
    fontSize: 13,
    color: COLORS.LIGHT_TEXT,
    marginTop: 4,
  },

  // ── Leaderboard ─────────────────────────────────────────────────────────────
  leaderboardSection: {
    marginBottom: 16,
  },
  leaderboardHeaderRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.PRIMARY,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  leaderboardHeaderText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.WHITE,
  },
  leaderboardRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.WHITE,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
    alignItems: 'center',
  },
  leaderboardRowEven: {
    backgroundColor: '#fafafa',
  },
  leaderboardRowTop3: {
    backgroundColor: '#f0f4ff',
  },
  leaderboardCell: {
    fontSize: 13,
    color: COLORS.DARK_TEXT,
  },
  lbPos: {
    width: 40,
    textAlign: 'center',
  },
  lbPosTop3: {
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  lbName: {
    flex: 1,
    paddingRight: 8,
  },
  lbPlayerName: {
    fontWeight: '500',
  },
  lbCountry: {
    fontSize: 10,
    color: COLORS.LIGHT_TEXT,
    marginTop: 1,
  },
  lbScore: {
    width: 50,
    textAlign: 'center',
  },
  lbScoreValue: {
    fontWeight: 'bold',
  },
  lbToday: {
    width: 50,
    textAlign: 'center',
  },
  lbThru: {
    width: 40,
    textAlign: 'center',
  },
  noLeaderboard: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  noLeaderboardText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.DARK_TEXT,
    marginBottom: 4,
  },
  noLeaderboardSubtext: {
    fontSize: 13,
    color: COLORS.LIGHT_TEXT,
  },

  // ── Game Score Section ──────────────────────────────────────────────────────
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  teamBox: {
    alignItems: 'center',
    flex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  teamLogoLarge: {
    fontSize: 40,
  },
  teamNameLarge: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.DARK_TEXT,
    textAlign: 'center',
  },
  rankText: {
    fontWeight: 'normal',
    color: COLORS.LIGHT_TEXT,
  },
  recordLarge: {
    fontSize: 12,
    color: COLORS.LIGHT_TEXT,
    marginTop: 4,
  },
  scoreCenter: {
    alignItems: 'center',
  },
  scoreDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreStatus: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.LIVE_RED,
    marginTop: 4,
  },
  scoreStatusFinal: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.LIGHT_TEXT,
    marginTop: 4,
  },
  scoreLarge: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  scoreLive: {
    color: COLORS.LIVE_RED,
  },
  liveLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.LIVE_RED,
    marginTop: 2,
  },
  scoreSeparator: {
    fontSize: 32,
    color: COLORS.LIGHT_TEXT,
    marginHorizontal: 8,
  },
  teamLogoImage: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
  },
  pregameCenter: {
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 4,
  },
  pregameTime: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.DARK_TEXT,
  },
  pregameSpread: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.LIGHT_TEXT,
  },
  pregameOverUnder: {
    fontSize: 14,
    color: COLORS.LIGHT_TEXT,
  },
  pregameNetwork: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.DARK_TEXT,
    marginTop: 4,
  },
  predictorSection: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  predictorTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.LIGHT_TEXT,
    marginBottom: 8,
  },
  predictorBarContainer: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginHorizontal: 40,
  },
  predictorBarAway: {
    backgroundColor: '#8899cc',
  },
  predictorBarHome: {
    backgroundColor: '#3a4d8f',
  },
  predictorLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    marginHorizontal: 40,
  },
  predictorLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  predictorPct: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.DARK_TEXT,
  },
  predictorFavored: {
    fontSize: 9,
    fontWeight: 'bold',
    color: COLORS.LIVE_RED,
    letterSpacing: 0.5,
  },
  infoSection: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.LIGHT_TEXT,
  },
  infoValue: {
    fontSize: 12,
    color: COLORS.DARK_TEXT,
    fontWeight: '500',
  },
  infoValueColumn: {
    alignItems: 'flex-end',
  },
  infoValueSecondary: {
    fontSize: 11,
    color: COLORS.LIGHT_TEXT,
    marginTop: 2,
  },
  boxScoreSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.DARK_TEXT,
    marginBottom: 12,
  },
  teamStatsBox: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  teamStatsName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statItem: {
    width: '23%',
    backgroundColor: COLORS.LIGHT_BG,
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.LIGHT_TEXT,
  },
  statValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.DARK_TEXT,
    marginTop: 2,
  },
  notifyButtonLarge: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  notifyButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.WHITE,
  },
  spacer: {
    height: 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
});

export default BoxScoreModal;
