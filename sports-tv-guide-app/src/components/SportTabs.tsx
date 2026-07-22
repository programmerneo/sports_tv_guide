/**
 * Sport Tabs - Filter games by sport type
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';

import { SportType, StandingsSportType } from '@types/index';
import { SPORTS, HOME_TO_STANDINGS_SPORT } from '@constants/index';
import { ThemeColors } from '@constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useGameStore } from '@store/gameStore';

/** March Madness season window: March 14 – April 10. */
function isMarchMadnessSeason(): boolean {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed: 2 = March, 3 = April
  const day = now.getDate();

  if (month === 2 && day >= 14) return true; // March 14+
  if (month === 3 && day <= 10) return true; // through April 10
  return false;
}

interface SportTabsProps {
  selectedSport: SportType | null;
  onSelectSport: (sport: SportType | null) => void;
  onBracketPress?: () => void;
  /** Whether each sport's "🏆 Standings" pill should be shown (in-season check). */
  standingsAvailable?: Partial<Record<SportType, boolean>>;
  onStandingsPress?: (sport: StandingsSportType) => void;
}

const SportTabs: React.FC<SportTabsProps> = ({
  selectedSport,
  onSelectSport,
  onBracketPress,
  standingsAvailable,
  onStandingsPress,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const preferences = useGameStore((state) => state.preferences);
  const games = useGameStore((state) => state.games);

  const showBracket = useMemo(
    () => isMarchMadnessSeason() && onBracketPress != null,
    [onBracketPress]
  );

  // Sports (in Home-screen key form) with an available standings pill.
  const standingsSports = useMemo(
    () =>
      (Object.entries(HOME_TO_STANDINGS_SPORT) as [SportType, StandingsSportType][]).filter(
        ([homeSport]) => standingsAvailable?.[homeSport]
      ),
    [standingsAvailable]
  );
  const hasStandingsLinks = standingsSports.length > 0;

  // Only show sports that have events for the day
  const sportsWithGames = preferences.selectedSports.filter((sport) => {
    const sportGames = games.get(sport);
    return sportGames && sportGames.length > 0;
  });

  // If only one sport has games and there's no bracket or standings pill, no need for tabs
  if (sportsWithGames.length <= 1 && !showBracket && !hasStandingsLinks) {
    return null;
  }

  return (
    <View style={styles.container}>
      {showBracket && (
        <TouchableOpacity style={styles.bracketTab} onPress={onBracketPress} activeOpacity={0.7}>
          <Text style={styles.bracketIcon}>&#x1F3C0;</Text>
          <Text style={styles.bracketText}>Bracket</Text>
        </TouchableOpacity>
      )}

      {standingsSports.map(([homeSport, shortSport]) => (
        <TouchableOpacity
          key={homeSport}
          style={styles.standingsTab}
          onPress={() => onStandingsPress?.(shortSport)}
          activeOpacity={0.7}
        >
          <Text style={styles.standingsIcon}>&#x1F3C6;</Text>
          <Text style={styles.standingsText}>{SPORTS[homeSport].displayName} Standings</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={[styles.tab, selectedSport === null && styles.tabActive]}
        onPress={() => onSelectSport(null)}
      >
        <Text style={[styles.tabText, selectedSport === null && styles.tabTextActive]}>
          All Sports
        </Text>
      </TouchableOpacity>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}
      >
        {sportsWithGames.map((sport) => {
          const sportInfo = SPORTS[sport];
          const isActive = selectedSport === sport;

          return (
            <TouchableOpacity
              key={sport}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => onSelectSport(sport)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {sportInfo.emoji} {sportInfo.displayName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.surface,
      paddingHorizontal: 16,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    scrollContainer: {
      flex: 1,
      marginLeft: 8,
    },
    contentContainer: {
      paddingRight: 8,
    },
    bracketTab: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: '#1A3358',
      marginRight: 20,
      gap: 4,
    },
    bracketIcon: {
      fontSize: 12,
    },
    bracketText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#C8991D',
    },
    standingsTab: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: theme.primary,
      marginRight: 20,
      gap: 4,
    },
    standingsIcon: {
      fontSize: 12,
    },
    standingsText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textInverse,
    },
    tab: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      marginRight: 8,
    },
    tabActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    tabText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    tabTextActive: {
      color: theme.textInverse,
    },
  });

export default SportTabs;
