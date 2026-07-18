/**
 * Game Card - Individual game display
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { Game } from '@types/index';
import { NETWORK_LOGOS, SPORTS } from '@constants/index';
import { ThemeColors } from '@constants/theme';
import { useTheme, useIsDark } from '@/hooks/useTheme';
import { useGameStore } from '@store/gameStore';

interface GameCardProps {
  game: Game;
  onPress?: () => void;
  compact?: boolean;
}

const GameCard: React.FC<GameCardProps> = ({ game, onPress, compact = false }) => {
  const theme = useTheme();
  const isDark = useIsDark();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const favoriteGames = useGameStore((s) => s.preferences.favoriteGames);
  const toggleFavoriteGame = useGameStore((s) => s.toggleFavoriteGame);
  const isFavorite = favoriteGames.includes(game.id);
  const isLive = game.status === 'in_progress';
  const isCompleted = game.status === 'completed';

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactContainer, isLive && styles.compactLive]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <TouchableOpacity
          style={styles.favoriteButtonCompact}
          onPress={(e) => {
            e.stopPropagation();
            toggleFavoriteGame(game.id);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          accessibilityRole="button"
        >
          <Text style={[styles.favoriteStarCompact, isFavorite && styles.favoriteStarActive]}>
            {isFavorite ? '★' : '☆'}
          </Text>
        </TouchableOpacity>

        <View style={styles.compactContent}>
          <View style={styles.compactTeams}>
            <Text style={styles.compactTeamName}>{game.awayTeam.abbreviation}</Text>
          </View>

          <Text style={styles.compactVs}>vs</Text>

          <View style={styles.compactTeams}>
            <Text style={styles.compactTeamName}>{game.homeTeam.abbreviation}</Text>
          </View>
        </View>

        {isLive && (
          <View style={styles.compactLiveBadge}>
            <View style={styles.livePulse} />
            <Text style={styles.compactLiveText}>
              {game.statusDetail || 'LIVE'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.container, isLive && styles.containerLive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Favorite Star */}
      <TouchableOpacity
        style={[styles.favoriteButton, isLive && styles.favoriteButtonLive]}
        onPress={(e) => {
          e.stopPropagation();
          toggleFavoriteGame(game.id);
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        accessibilityRole="button"
      >
        <Text style={[styles.favoriteStar, isFavorite && styles.favoriteStarActive]}>
          {isFavorite ? '★' : '☆'}
        </Text>
      </TouchableOpacity>

      {/* Live Indicator */}
      {isLive && (
        <View style={styles.liveIndicator}>
          <View style={styles.livePulse} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.sportBadge}>
          <Text style={styles.sportEmoji}>{SPORTS[game.sport]?.emoji}</Text>
          <Text style={styles.sportName}>{SPORTS[game.sport]?.displayName}</Text>
        </View>

        <Text style={styles.network}>
          {NETWORK_LOGOS[game.network] || '📺'} {game.network}
        </Text>
      </View>

      {/* Matchup */}
      <View style={styles.matchup}>
        {/* Away Team */}
        <View style={styles.teamSection}>
          <Text style={styles.teamName}>{game.awayTeam.name}</Text>
          {game.awayTeam.record && (
            <Text style={styles.record}>
              {game.awayTeam.record}
              {game.awayTeam.conferenceRecord && `, ${game.awayTeam.conferenceRecord} ${game.awayTeam.conference || ''}`}
            </Text>
          )}
        </View>

        {/* Score */}
        <View style={styles.scoreSection}>
          <View style={styles.scoreRow}>
            <Text style={[styles.score, isLive && styles.scoreLive]}>{game.awayScore ?? '-'}</Text>
            <Text style={styles.separator}>-</Text>
            <Text style={[styles.score, isLive && styles.scoreLive]}>{game.homeScore ?? '-'}</Text>
          </View>

          {isLive && game.statusDetail && <Text style={styles.quarter}>{game.statusDetail}</Text>}
        </View>

        {/* Home Team */}
        <View style={[styles.teamSection, styles.teamSectionRight]}>
          <Text style={styles.teamName}>{game.homeTeam.name}</Text>
          {game.homeTeam.record && (
            <Text style={styles.record}>
              {game.homeTeam.record}
              {game.homeTeam.conferenceRecord && `, ${game.homeTeam.conferenceRecord} ${game.homeTeam.conference || ''}`}
            </Text>
          )}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.time, isLive && styles.timeLive]}>
          {isLive && game.statusDetail
            ? game.statusDetail
            : isCompleted
              ? game.statusDetail || 'Final'
              : formatTime(game.startTime)}
        </Text>

        {game.venue && (
          <Text style={styles.venue} numberOfLines={1}>
            📍 {game.venue}
          </Text>
        )}
      </View>

      {/* Notify Button */}
      <TouchableOpacity
        style={styles.notifyButton}
        onPress={(e) => {
          e.stopPropagation();
          // Handle notification
        }}
      >
        <Text style={styles.notifyText}>🔔 Notify</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const createStyles = (theme: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 16,
      marginHorizontal: 8,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: theme.border,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 2,
    },
    containerLive: {
      borderColor: theme.live,
    },
    liveIndicator: {
      position: 'absolute',
      top: 8,
      right: 8,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.live,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    livePulse: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.textInverse,
      marginRight: 4,
    },
    liveText: {
      fontSize: 11,
      fontWeight: 'bold',
      color: theme.textInverse,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sportBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primary,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    sportEmoji: {
      fontSize: 14,
      marginRight: 4,
    },
    sportName: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.textInverse,
    },
    network: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    matchup: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      paddingVertical: 8,
    },
    teamSection: {
      flex: 1,
      alignItems: 'flex-start',
    },
    teamSectionRight: {
      alignItems: 'flex-end',
    },
    teamName: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.text,
    },
    record: {
      fontSize: 11,
      color: theme.textSecondary,
      marginTop: 2,
    },
    scoreSection: {
      alignItems: 'center',
      marginHorizontal: 12,
    },
    scoreRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    score: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.primary,
    },
    scoreLive: {
      color: theme.live,
    },
    separator: {
      fontSize: 16,
      color: theme.textSecondary,
      marginHorizontal: 2,
    },
    quarter: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.textSecondary,
      marginTop: 2,
    },
    footer: {
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingTop: 8,
      marginBottom: 8,
    },
    time: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    timeLive: {
      color: theme.live,
    },
    venue: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    favoriteButton: {
      position: 'absolute',
      top: 6,
      right: 8,
      zIndex: 2,
      padding: 2,
    },
    favoriteButtonLive: {
      top: 36,
    },
    favoriteStar: {
      fontSize: 20,
      lineHeight: 22,
      color: theme.textSecondary,
    },
    favoriteStarActive: {
      color: theme.secondary,
    },
    favoriteButtonCompact: {
      position: 'absolute',
      top: 2,
      right: 4,
      zIndex: 2,
      padding: 2,
    },
    favoriteStarCompact: {
      fontSize: 14,
      lineHeight: 16,
      color: theme.textSecondary,
    },
    notifyButton: {
      backgroundColor: theme.primary,
      paddingVertical: 8,
      borderRadius: 6,
      alignItems: 'center',
    },
    notifyText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: theme.textInverse,
    },
    compactContainer: {
      backgroundColor: theme.card,
      borderRadius: 8,
      padding: 8,
      marginHorizontal: 4,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    compactLive: {
      borderColor: theme.live,
      backgroundColor: theme.surfaceAlt,
    },
    compactContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    compactTeams: {
      flex: 1,
      alignItems: 'center',
    },
    compactTeamName: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.text,
    },
    compactScore: {
      fontSize: 13,
      fontWeight: 'bold',
      color: theme.primary,
      marginTop: 2,
    },
    compactVs: {
      fontSize: 9,
      color: theme.textSecondary,
      marginHorizontal: 4,
    },
    compactLiveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      paddingTop: 4,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      justifyContent: 'center',
    },
    compactLiveText: {
      fontSize: 9,
      fontWeight: 'bold',
      color: theme.live,
      marginLeft: 2,
    },
  });

export default GameCard;
