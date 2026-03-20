/**
 * Sport Tabs - Filter games by sport type
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';

import { SportType } from '@types/index';
import { SPORTS, COLORS } from '@constants/index';
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
}

const SportTabs: React.FC<SportTabsProps> = ({ selectedSport, onSelectSport, onBracketPress }) => {
  const preferences = useGameStore((state) => state.preferences);
  const games = useGameStore((state) => state.games);

  const showBracket = useMemo(
    () => isMarchMadnessSeason() && onBracketPress != null,
    [onBracketPress]
  );

  // Only show sports that have events for the day
  const sportsWithGames = preferences.selectedSports.filter((sport) => {
    const sportGames = games.get(sport);
    return sportGames && sportGames.length > 0;
  });

  // If only one sport has games and no bracket, no need for tabs
  if (sportsWithGames.length <= 1 && !showBracket) {
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.WHITE,
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
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.LIGHT_BG,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.LIGHT_TEXT,
  },
  tabTextActive: {
    color: COLORS.WHITE,
  },
});

export default SportTabs;
