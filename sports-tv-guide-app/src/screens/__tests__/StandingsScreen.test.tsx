/**
 * Tests for StandingsScreen's handling of sports that fail to load
 * (e.g. nfl/mlb returning 404 once their postseason has ended).
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { render, screen, waitFor } from '@testing-library/react-native';

import StandingsScreen from '../StandingsScreen';
import { apiService } from '@services/api';
import { lightTheme } from '@constants/theme';
import { StandingsResponse, StandingsScreenParams } from '@types/index';

const NHL_STANDINGS: StandingsResponse = {
  sport: 'nhl',
  season: `${new Date().getFullYear()}`,
  groups: [],
};

const MLB_STANDINGS: StandingsResponse = {
  sport: 'mlb',
  season: `${new Date().getFullYear()}`,
  groups: [],
};

const Stack = createNativeStackNavigator();

// StandingsScreen uses useRoute(), which requires being rendered as an actual
// screen within a navigator (not just inside a bare NavigationContainer).
function renderScreen(params?: StandingsScreenParams) {
  return render(
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Standings" component={StandingsScreen} initialParams={params} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

describe('StandingsScreen', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('omits a sport whose standings request rejects (e.g. gated 404) from the tab list', async () => {
    jest.spyOn(apiService, 'getStandings').mockImplementation(async (sport) => {
      if (sport === 'nfl' || sport === 'mlb') {
        throw new Error(`HTTP 404: ${sport} season has ended`);
      }
      return NHL_STANDINGS;
    });

    renderScreen();

    await waitFor(() => expect(screen.queryByText('🏒 NHL')).toBeTruthy());

    expect(screen.queryByText('🏈 NFL')).toBeNull();
    expect(screen.queryByText('⚾ MLB')).toBeNull();
  });

  it('preselects the sport passed via route params when it is active', async () => {
    jest.spyOn(apiService, 'getStandings').mockImplementation(async (sport) => {
      if (sport === 'nhl') return NHL_STANDINGS;
      if (sport === 'mlb') return MLB_STANDINGS;
      throw new Error(`HTTP 404: ${sport} season has ended`);
    });

    renderScreen({ sport: 'mlb' });

    await waitFor(() => expect(screen.queryByText('🏒 NHL')).toBeTruthy());

    // MLB tab (not NHL, the first active sport) should be the selected/active one.
    const mlbTabText = screen.getByText('⚾ MLB');
    const nhlTabText = screen.getByText('🏒 NHL');
    expect(mlbTabText.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: lightTheme.textInverse })])
    );
    expect(nhlTabText.props.style).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ color: lightTheme.textInverse })])
    );
  });
});
