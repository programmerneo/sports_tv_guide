/**
 * Tests for ManageTeamsScreen — favorited teams render first under
 * "★ Favorites", tapping a team's star toggles it immediately (moving it
 * between sections), and a failed fetch shows the EmptyState retry UI.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';

import ManageTeamsScreen from '../ManageTeamsScreen';
import { apiService } from '@services/api';
import { favoriteTeamKey, useGameStore } from '@store/gameStore';
import { STANDINGS_SPORTS, STANDINGS_TO_HOME_SPORT } from '@constants/index';
import { Team } from '@types/index';

// The screen defaults to the first STANDINGS_SPORTS tab; favorite keys are
// namespaced by that tab's Home-screen sport (see favoriteTeamKey) since
// ESPN team ids aren't unique across sports.
const DEFAULT_SPORT = STANDINGS_SPORTS[0];
const DEFAULT_HOME_SPORT = STANDINGS_TO_HOME_SPORT[DEFAULT_SPORT];

const BRUINS: Team = { id: '1', name: 'Boston Bruins', abbreviation: 'BOS' };
const DUCKS: Team = { id: '2', name: 'Anaheim Ducks', abbreviation: 'ANA' };

const renderScreen = () =>
  render(
    <NavigationContainer>
      <ManageTeamsScreen />
    </NavigationContainer>
  );

beforeEach(() => {
  useGameStore.setState((state) => ({
    preferences: { ...state.preferences, favoriteTeams: [] },
  }));
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('ManageTeamsScreen', () => {
  it('lists teams, with a favorited team under "★ Favorites"', async () => {
    jest
      .spyOn(apiService, 'getTeams')
      .mockResolvedValue({ sport: DEFAULT_SPORT, teams: [BRUINS, DUCKS] });
    useGameStore.setState((state) => ({
      preferences: {
        ...state.preferences,
        favoriteTeams: [favoriteTeamKey(DEFAULT_HOME_SPORT, BRUINS.id)],
      },
    }));

    renderScreen();

    await waitFor(() => expect(screen.getByText('Boston Bruins')).toBeTruthy());
    expect(screen.getByText('★ Favorites')).toBeTruthy();
    expect(screen.getByText('All Teams')).toBeTruthy();
    expect(screen.getByText('Anaheim Ducks')).toBeTruthy();
  });

  it('toggles favorite state immediately and moves the row between sections', async () => {
    jest.spyOn(apiService, 'getTeams').mockResolvedValue({ sport: DEFAULT_SPORT, teams: [BRUINS] });

    renderScreen();

    await waitFor(() => expect(screen.getByText('Boston Bruins')).toBeTruthy());
    expect(screen.queryByText('★ Favorites')).toBeNull();

    fireEvent.press(screen.getByLabelText('Add Boston Bruins to favorite teams'));

    expect(useGameStore.getState().preferences.favoriteTeams).toContain(
      favoriteTeamKey(DEFAULT_HOME_SPORT, BRUINS.id)
    );
    expect(screen.getByText('★ Favorites')).toBeTruthy();
    expect(screen.getByLabelText('Remove Boston Bruins from favorite teams')).toBeTruthy();
  });

  it('shows the EmptyState retry UI when the fetch fails', async () => {
    jest.spyOn(apiService, 'getTeams').mockRejectedValue(new Error('boom'));

    renderScreen();

    await waitFor(() => expect(screen.getByText('Failed to load teams')).toBeTruthy());
    expect(screen.getByText('🔄 Try Again')).toBeTruthy();
  });
});
