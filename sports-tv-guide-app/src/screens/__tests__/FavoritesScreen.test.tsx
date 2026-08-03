/**
 * Tests for FavoritesScreen — covers the empty state (regression: the
 * screen used to render blank instead of "No favorites yet" because
 * `useGameStore((state) => getFavoriteGames(state))` allocated a new
 * array on every call, which loops forever under useSyncExternalStore)
 * and the happy path where a favorited game renders.
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';

import FavoritesScreen from '../FavoritesScreen';
import { useGameStore } from '@store/gameStore';
import { Game } from '@types/index';

const renderScreen = () =>
  render(
    <NavigationContainer>
      <FavoritesScreen />
    </NavigationContainer>
  );

const SAMPLE_GAME: Game = {
  id: '401634567',
  eventId: '401634567',
  sport: 'basketball-college',
  homeTeam: { id: '150', name: 'Duke Blue Devils', abbreviation: 'DUKE', logo: '', record: '25-5' },
  awayTeam: {
    id: '153',
    name: 'North Carolina Tar Heels',
    abbreviation: 'UNC',
    logo: '',
    record: '20-10',
  },
  status: 'scheduled',
  startTime: '2026-03-15T23:00Z',
  network: 'ESPN',
};

beforeEach(() => {
  useGameStore.setState({
    games: new Map(),
    preferences: {
      ...useGameStore.getState().preferences,
      favoriteTeams: [],
      favoriteGames: [],
    },
  });
});

describe('FavoritesScreen', () => {
  it('shows the empty state when there are no favorites', () => {
    renderScreen();
    expect(screen.getByText('No favorites yet')).toBeTruthy();
  });

  it('lists a game once its id is favorited', () => {
    useGameStore.setState((state) => ({
      games: new Map([[SAMPLE_GAME.sport, [SAMPLE_GAME]]]),
      preferences: { ...state.preferences, favoriteGames: [SAMPLE_GAME.id] },
    }));

    renderScreen();
    expect(screen.queryByText('No favorites yet')).toBeNull();
    expect(screen.getByText('Duke Blue Devils')).toBeTruthy();
  });
});
