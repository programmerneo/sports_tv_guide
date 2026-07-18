import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGameStore, getFavoriteGames } from '@store/gameStore';
import { Game } from '@types/index';
import { useTheme } from '@/hooks/useTheme';
import { ThemeColors } from '@constants/theme';
import GameCard from '@components/GameCard';
import BoxScoreModal from '@components/BoxScoreModal';

export default function FavoritesScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  // Subscribe to games so the list recomputes when game data changes.
  useGameStore((state) => state.games);
  const favorites = useGameStore((state) => getFavoriteGames(state));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Favorites</Text>
      </View>

      {favorites.length > 0 ? (
        <FlatList
          data={favorites}
          keyExtractor={(game) => game.id}
          renderItem={({ item }) => (
            <GameCard game={item} onPress={() => setSelectedGame(item)} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>⭐</Text>
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptyDescription}>
            Tap the star on a game to save it here.
          </Text>
        </View>
      )}

      {selectedGame && (
        <BoxScoreModal
          game={selectedGame}
          visible={!!selectedGame}
          onClose={() => setSelectedGame(null)}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      backgroundColor: theme.headerBg,
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: theme.textInverse,
    },
    listContent: {
      paddingVertical: 12,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    emptyEmoji: {
      fontSize: 48,
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 8,
    },
    emptyDescription: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
