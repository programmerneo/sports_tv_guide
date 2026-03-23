/**
 * March Madness Bracket View
 *
 * Classic NCAA tournament bracket with region tabs, round columns,
 * connector lines, and live game indicators.
 *
 * All data parsing is done on the backend — this component only renders.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { apiService } from '@services/api';
import { BracketGame, BracketResponse, BracketTab, BracketTeam } from '@types/index';

// --- Theme ---

const BRACKET_COLORS = {
  NAVY: '#0B1E3D',
  NAVY_LIGHT: '#132D5E',
  NAVY_MID: '#0F2749',
  GOLD: '#C8991D',
  GOLD_LIGHT: '#E8BB44',
  GOLD_DIM: 'rgba(200, 153, 29, 0.15)',
  WHITE: '#FFFFFF',
  OFF_WHITE: '#F0EDE6',
  CARD_BG: '#FFFFFF',
  CARD_BORDER: '#D4D0C8',
  WINNER_BG: '#F7F5EF',
  LOSER_TEXT: '#A0A0A0',
  LIVE_RED: '#E8350E',
  LIVE_BG: 'rgba(232, 53, 14, 0.12)',
  CONNECTOR: '#3A5A8C',
  SEED_BG: '#0B1E3D',
  FINAL_BADGE: '#2D6A4F',
  PRE_BADGE: '#4A6FA5',
};

// --- Constants ---

const FIRST_FOUR_CODE = 'TT';
const FINAL_FOUR_CODE = 'CC';

const CARD_WIDTH = 156;
const CARD_HEIGHT = 58;
const CARD_GAP = 6;
const ROUND_GAP = 32;
const CONNECTOR_WIDTH = ROUND_GAP;

// --- Helpers ---

/** Format a game's start time as 12-hour local time (e.g. "7:09 PM ET"). */
function formatLocalTime(game: BracketGame): string {
  if (!game.startTimeEpoch) return game.startTime || '';
  const date = new Date(game.startTimeEpoch * 1000);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  });
}

function isLive(game: BracketGame): boolean {
  return game.gameState === 'I';
}

function isFinal(game: BracketGame): boolean {
  return game.gameState === 'F';
}

// --- Sub-components ---

interface TeamRowProps {
  team: BracketTeam;
  game: BracketGame;
  isTop: boolean;
}

const TeamRow: React.FC<TeamRowProps> = ({ team, game, isTop }) => {
  const gameFinished = isFinal(game);
  const gameLive = isLive(game);
  const isWinner = team.isWinner && gameFinished;
  const isLoser = !team.isWinner && gameFinished;

  return (
    <View
      style={[
        styles.teamRow,
        isTop ? styles.teamRowTop : styles.teamRowBottom,
        isWinner && styles.teamRowWinner,
      ]}
    >
      {team.seed != null && (
        <View style={[styles.seedBadge, isLoser && styles.seedBadgeLoser]}>
          <Text style={[styles.seedText, isLoser && styles.seedTextLoser]}>{team.seed}</Text>
        </View>
      )}
      <Text
        style={[
          styles.teamName,
          isLoser && styles.teamNameLoser,
          isWinner && styles.teamNameWinner,
        ]}
        numberOfLines={1}
      >
        {team.nameShort}
      </Text>
      {(gameFinished || gameLive) && team.score != null && (
        <Text
          style={[styles.scoreText, isWinner && styles.scoreWinner, isLoser && styles.scoreLoser]}
        >
          {team.score}
        </Text>
      )}
    </View>
  );
};

interface MatchupCardProps {
  game: BracketGame;
}

const MatchupCard: React.FC<MatchupCardProps> = ({ game }) => {
  const gameLive = isLive(game);
  const gameFinished = isFinal(game);
  const topTeam = game.teams.find((t) => t.isTop) || game.teams[0];
  const bottomTeam = game.teams.find((t) => !t.isTop) || game.teams[1];

  return (
    <View style={[styles.matchupCard, gameLive && styles.matchupCardLive]}>
      {/* Status strip */}
      {gameLive && (
        <View style={styles.liveStrip}>
          <View style={styles.liveDot} />
          <Text style={styles.liveLabel}>LIVE</Text>
          {game.contestClock ? <Text style={styles.liveClock}>{game.contestClock}</Text> : null}
        </View>
      )}
      {!gameLive && gameFinished && (
        <View style={styles.finalStrip}>
          <Text style={styles.finalLabel}>FINAL</Text>
        </View>
      )}
      {!gameLive && !gameFinished && game.hasStartTime && (
        <View style={styles.preStrip}>
          <Text style={styles.preLabel}>{formatLocalTime(game)}</Text>
          {game.broadcaster?.name && (
            <Text style={styles.networkLabel}>{game.broadcaster.name}</Text>
          )}
        </View>
      )}

      {/* Teams */}
      {topTeam && <TeamRow team={topTeam} game={game} isTop />}
      <View style={styles.divider} />
      {bottomTeam && <TeamRow team={bottomTeam} game={game} isTop={false} />}
    </View>
  );
};

/** Vertical connector lines between rounds */
interface ConnectorProps {
  gamesInRound: number;
  roundIndex: number;
}

const RoundConnectors: React.FC<ConnectorProps> = ({ gamesInRound, roundIndex }) => {
  const pairs = Math.floor(gamesInRound / 2);
  const pairHeight = (CARD_HEIGHT + CARD_GAP) * 2;
  const spreadFactor = Math.pow(2, roundIndex);

  const connectors = [];
  for (let i = 0; i < pairs; i++) {
    const blockHeight = pairHeight * spreadFactor;
    connectors.push(
      <View key={i} style={[styles.connectorBlock, { height: blockHeight }]}>
        <View style={[styles.connectorHLine, { top: blockHeight * 0.25 }]} />
        <View style={[styles.connectorHLine, { top: blockHeight * 0.75 - 1 }]} />
        <View
          style={[
            styles.connectorVLine,
            {
              top: blockHeight * 0.25,
              height: blockHeight * 0.5,
            },
          ]}
        />
        <View style={[styles.connectorHLineOut, { top: blockHeight * 0.5 - 1 }]} />
      </View>
    );
  }

  return <View style={styles.connectorColumn}>{connectors}</View>;
};

/** A single round column of matchup cards */
interface RoundColumnProps {
  games: BracketGame[];
  roundIndex: number;
  label: string;
  subtitle?: string;
}

const RoundColumn: React.FC<RoundColumnProps> = ({ games, roundIndex, label, subtitle }) => {
  const spreadFactor = Math.pow(2, roundIndex);
  const cardSlotHeight = (CARD_HEIGHT + CARD_GAP) * spreadFactor;

  return (
    <View style={styles.roundColumn}>
      <Text style={styles.roundLabel}>{label}</Text>
      {subtitle ? <Text style={styles.roundSubtitle}>{subtitle}</Text> : null}
      <View style={styles.roundGames}>
        {games.map((game, idx) => (
          <View
            key={game.contestId}
            style={[
              styles.cardSlot,
              {
                height: cardSlotHeight,
                marginBottom: idx < games.length - 1 ? 0 : 0,
              },
            ]}
          >
            <MatchupCard game={game} />
          </View>
        ))}
      </View>
    </View>
  );
};

// --- Main Component ---

interface BracketViewProps {
  year?: number;
  onBack?: () => void;
}

const BracketView: React.FC<BracketViewProps> = ({ year, onBack }) => {
  const [bracketData, setBracketData] = useState<BracketResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<number | null>(null);

  const loadBrackets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getBrackets(year);
      if (response.tabs?.length > 0) {
        setBracketData(response);
        setActiveTab(response.defaultTabSectionId ?? response.tabs[0].sectionId);
      } else {
        setError('No bracket data available');
      }
    } catch {
      setError('Failed to load bracket');
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    loadBrackets();
  }, [loadBrackets]);

  const activeRegion = bracketData?.tabs.find((t) => t.sectionId === activeTab);

  // Hide the First Four tab once all its play-in games are finished
  const visibleTabs = (bracketData?.tabs || []).filter((tab) => {
    if (tab.regionCode !== FIRST_FOUR_CODE) return true;
    const allGames = tab.rounds.flatMap((r) => r.games);
    return allGames.length === 0 || allGames.some((g) => !isFinal(g));
  });

  // --- Render Helpers ---

  const renderRounds = (tab: BracketTab) => {
    if (tab.rounds.length === 0) {
      return <Text style={styles.emptyText}>No games yet</Text>;
    }

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        contentContainerStyle={styles.bracketScroll}
      >
        {tab.rounds.map((round, rIdx) => (
          <React.Fragment key={rIdx}>
            <RoundColumn
              games={round.games}
              roundIndex={rIdx}
              label={round.label}
              subtitle={round.subtitle}
            />
            {rIdx < tab.rounds.length - 1 && (
              <RoundConnectors gamesInRound={round.games.length} roundIndex={rIdx} />
            )}
          </React.Fragment>
        ))}
      </ScrollView>
    );
  };

  const renderFinalFour = (tab: BracketTab) => {
    if (tab.rounds.length === 0) {
      return <Text style={styles.emptyText}>Final Four not yet set</Text>;
    }

    const lastRound = tab.rounds[tab.rounds.length - 1];
    const champGame = lastRound?.games[0];
    const champion = champGame && isFinal(champGame)
      ? champGame.teams.find((t) => t.isWinner)
      : null;

    return (
      <View style={styles.finalFourContainer}>
        <View style={styles.finalFourBanner}>
          <Text style={styles.finalFourTitle}>FINAL FOUR</Text>
          {bracketData?.title && (
            <Text style={styles.finalFourSubtitle}>{bracketData.title}</Text>
          )}
        </View>
        {renderRounds(tab)}
        {champion && (
          <View style={styles.championBanner}>
            <Text style={styles.championCrown}>&#x1F3C6;</Text>
            <Text style={styles.championLabel}>NATIONAL CHAMPION</Text>
            <Text style={styles.championName}>{champion.nameFull}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderFirstFour = (tab: BracketTab) => {
    if (tab.rounds.length === 0) {
      return <Text style={styles.emptyText}>No play-in games</Text>;
    }

    const games = tab.rounds[0]?.games || [];
    return (
      <View style={styles.firstFourContainer}>
        <View style={styles.firstFourBanner}>
          <Text style={styles.firstFourTitle}>PLAY-IN GAMES</Text>
        </View>
        <View style={styles.firstFourGrid}>
          {games.map((game) => (
            <View key={game.contestId} style={styles.firstFourCard}>
              <MatchupCard game={game} />
              {game.broadcaster?.name && (
                <Text style={styles.firstFourNetwork}>{game.broadcaster.name}</Text>
              )}
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderContent = () => {
    if (!activeRegion || activeTab == null) return null;
    if (activeRegion.regionCode === FINAL_FOUR_CODE) return renderFinalFour(activeRegion);
    if (activeRegion.regionCode === FIRST_FOUR_CODE) return renderFirstFour(activeRegion);
    return renderRounds(activeRegion);
  };

  // --- Main Render ---

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BRACKET_COLORS.GOLD} />
        <Text style={styles.loadingText}>Loading bracket...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorEmoji}>&#x1F3C0;</Text>
        <Text style={styles.errorTitle}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadBrackets}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerStripe} />
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <Text style={styles.backArrow}>&#x2039;</Text>
            <Text style={styles.backLabel}>Home</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>MARCH MADNESS</Text>
        <Text style={styles.headerYear}>{bracketData?.year || ''}</Text>
        {bracketData?.championshipInfo && (
          <Text style={styles.headerChampInfo}>{bracketData.championshipInfo}</Text>
        )}
      </View>

      {/* Region Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        style={styles.tabBarContainer}
        contentContainerStyle={styles.tabBar}
      >
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.sectionId;
          return (
            <TouchableOpacity
              key={tab.sectionId}
              style={[styles.tab, isActive && styles.tabActive, !tab.isEnabled && styles.tabDisabled]}
              onPress={tab.isEnabled ? () => setActiveTab(tab.sectionId) : undefined}
              activeOpacity={tab.isEnabled ? 0.7 : 1}
              disabled={!tab.isEnabled}
            >
              <Text
                style={[
                  styles.tabText,
                  isActive && styles.tabTextActive,
                  !tab.isEnabled && styles.tabTextDisabled,
                ]}
              >
                {tab.label}
              </Text>
              {tab.liveCount > 0 && (
                <View style={styles.tabLiveBadge}>
                  <View style={styles.tabLiveDot} />
                  <Text style={styles.tabLiveCount}>{tab.liveCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Bracket Content */}
      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator
      >
        {renderContent()}
      </ScrollView>
    </View>
  );
};

// --- Styles ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRACKET_COLORS.NAVY,
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
    paddingBottom: 28,
    paddingHorizontal: 20,
    backgroundColor: BRACKET_COLORS.NAVY,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  headerStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: BRACKET_COLORS.GOLD,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: BRACKET_COLORS.WHITE,
    letterSpacing: 4,
  },
  headerYear: {
    fontSize: 18,
    fontWeight: '600',
    color: BRACKET_COLORS.GOLD,
    letterSpacing: 2,
    marginTop: 2,
  },
  headerChampInfo: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    left: 12,
    bottom: 18,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 4,
    backgroundColor: '#667eea',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: BRACKET_COLORS.WHITE,
  },
  backArrow: {
    fontSize: 28,
    fontWeight: '400',
    color: BRACKET_COLORS.WHITE,
    lineHeight: 28,
  },
  backLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: BRACKET_COLORS.WHITE,
  },

  // Tabs
  tabBarContainer: {
    maxHeight: 40,
    backgroundColor: BRACKET_COLORS.NAVY_MID,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 4,
    height: 28,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 0,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    gap: 4,
    height: 24,
  },
  tabActive: {
    backgroundColor: BRACKET_COLORS.GOLD,
  },
  tabDisabled: {
    opacity: 0.55,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: BRACKET_COLORS.NAVY,
  },
  tabTextDisabled: {
    color: 'rgba(255,255,255,0.6)',
  },
  tabLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRACKET_COLORS.LIVE_RED,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    gap: 3,
  },
  tabLiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: BRACKET_COLORS.WHITE,
  },
  tabLiveCount: {
    fontSize: 10,
    fontWeight: '800',
    color: BRACKET_COLORS.WHITE,
  },

  // Content
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: 16,
    paddingBottom: 40,
  },

  // Bracket scroll
  bracketScroll: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'flex-start',
  },

  // Round column
  roundColumn: {
    alignItems: 'center',
  },
  roundLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  roundSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
  },
  roundGames: {
    alignItems: 'center',
  },
  cardSlot: {
    justifyContent: 'center',
    width: CARD_WIDTH,
  },

  // Matchup card
  matchupCard: {
    width: CARD_WIDTH,
    backgroundColor: BRACKET_COLORS.CARD_BG,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BRACKET_COLORS.CARD_BORDER,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  matchupCardLive: {
    borderColor: BRACKET_COLORS.LIVE_RED,
    borderWidth: 1.5,
  },

  // Team rows
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
    height: 24,
  },
  teamRowTop: {
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  teamRowBottom: {
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  teamRowWinner: {
    backgroundColor: BRACKET_COLORS.WINNER_BG,
  },
  seedBadge: {
    width: 22,
    height: 24,
    backgroundColor: BRACKET_COLORS.SEED_BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seedBadgeLoser: {
    backgroundColor: '#8A8A8A',
  },
  seedText: {
    fontSize: 10,
    fontWeight: '800',
    color: BRACKET_COLORS.WHITE,
  },
  seedTextLoser: {
    color: '#D0D0D0',
  },
  teamName: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: BRACKET_COLORS.NAVY,
    paddingLeft: 6,
  },
  teamNameLoser: {
    color: BRACKET_COLORS.LOSER_TEXT,
  },
  teamNameWinner: {
    fontWeight: '800',
    color: BRACKET_COLORS.FINAL_BADGE,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: BRACKET_COLORS.NAVY,
    minWidth: 24,
    textAlign: 'right',
  },
  scoreWinner: {
    fontWeight: '900',
    color: BRACKET_COLORS.NAVY,
  },
  scoreLoser: {
    color: BRACKET_COLORS.LOSER_TEXT,
  },

  // Divider between teams
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E0DDD5',
    marginLeft: 22,
  },

  // Status strips
  liveStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRACKET_COLORS.LIVE_BG,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BRACKET_COLORS.LIVE_RED,
  },
  liveLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: BRACKET_COLORS.LIVE_RED,
    letterSpacing: 1,
  },
  liveClock: {
    fontSize: 9,
    fontWeight: '600',
    color: BRACKET_COLORS.LIVE_RED,
  },
  finalStrip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#F5F3ED',
  },
  finalLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#7A7A7A',
    letterSpacing: 1,
  },
  preStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#EBF0F7',
    gap: 6,
  },
  preLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: BRACKET_COLORS.PRE_BADGE,
  },
  networkLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#7A8FAD',
  },

  // Connector lines
  connectorColumn: {
    width: CONNECTOR_WIDTH,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 22, // offset for round label
  },
  connectorBlock: {
    width: CONNECTOR_WIDTH,
    position: 'relative',
  },
  connectorHLine: {
    position: 'absolute',
    left: 0,
    width: CONNECTOR_WIDTH / 2,
    height: 1.5,
    backgroundColor: BRACKET_COLORS.CONNECTOR,
  },
  connectorVLine: {
    position: 'absolute',
    left: CONNECTOR_WIDTH / 2 - 0.75,
    width: 1.5,
    backgroundColor: BRACKET_COLORS.CONNECTOR,
  },
  connectorHLineOut: {
    position: 'absolute',
    left: CONNECTOR_WIDTH / 2,
    width: CONNECTOR_WIDTH / 2,
    height: 1.5,
    backgroundColor: BRACKET_COLORS.CONNECTOR,
  },

  // Final Four
  finalFourContainer: {
    alignItems: 'center',
  },
  finalFourBanner: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: BRACKET_COLORS.GOLD_DIM,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(200, 153, 29, 0.25)',
  },
  finalFourTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: BRACKET_COLORS.GOLD_LIGHT,
    letterSpacing: 4,
  },
  finalFourSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  championBanner: {
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: BRACKET_COLORS.GOLD_DIM,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BRACKET_COLORS.GOLD,
  },
  championCrown: {
    fontSize: 32,
    marginBottom: 6,
  },
  championLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: BRACKET_COLORS.GOLD,
    letterSpacing: 3,
    marginBottom: 4,
  },
  championName: {
    fontSize: 18,
    fontWeight: '900',
    color: BRACKET_COLORS.WHITE,
    textAlign: 'center',
  },

  // First Four
  firstFourContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  firstFourBanner: {
    alignItems: 'center',
    marginBottom: 16,
  },
  firstFourTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: BRACKET_COLORS.WHITE,
    letterSpacing: 3,
  },
  firstFourSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  firstFourGrid: {
    gap: 12,
    width: '100%',
    maxWidth: 340,
  },
  firstFourCard: {
    alignItems: 'center',
    gap: 4,
  },
  firstFourNetwork: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },

  // States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BRACKET_COLORS.NAVY,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BRACKET_COLORS.NAVY,
    gap: 12,
    paddingHorizontal: 32,
  },
  errorEmoji: {
    fontSize: 48,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: BRACKET_COLORS.WHITE,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: BRACKET_COLORS.GOLD,
    borderRadius: 20,
    marginTop: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '700',
    color: BRACKET_COLORS.NAVY,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 40,
  },
});

export default BracketView;
