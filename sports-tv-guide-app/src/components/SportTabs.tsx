/**
 * Sport Tabs - Filter games by sport type
 */

import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';

import { SportType } from '@types/index';
import { SPORTS, COLORS } from '@constants/index';
import { useGameStore } from '@store/gameStore';

interface SportTabsProps {
  selectedSport: SportType | null;
  onSelectSport: (sport: SportType | null) => void;
}

const SportTabs: React.FC<SportTabsProps> = ({ selectedSport, onSelectSport }) => {
  const preferences = useGameStore((state) => state.preferences);
  const games = useGameStore((state) => state.games);

  // Only show sports that have events for the day
  const sportsWithGames = preferences.selectedSports.filter((sport) => {
    const sportGames = games.get(sport);
    return sportGames && sportGames.length > 0;
  });

  // If only one sport has games, no need for tabs
  if (sportsWithGames.length <= 1) {
    return null;
  }

  return (
    <View style={styles.container}>
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
    whiteSpace: 'nowrap',
  },
  tabTextActive: {
    color: COLORS.WHITE,
  },
});

export default SportTabs;
