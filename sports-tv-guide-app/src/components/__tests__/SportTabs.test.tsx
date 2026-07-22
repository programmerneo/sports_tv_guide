/**
 * Tests for SportTabs' "🏆 Standings" pills (mirrors the March Madness
 * "Bracket" pill slot/styling).
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import SportTabs from '../SportTabs';

describe('SportTabs standings pills', () => {
  it('renders a standings pill and calls onStandingsPress with the short sport key', () => {
    const onStandingsPress = jest.fn();

    render(
      <SportTabs
        selectedSport={null}
        onSelectSport={jest.fn()}
        standingsAvailable={{ 'baseball-mlb': true }}
        onStandingsPress={onStandingsPress}
      />
    );

    const pill = screen.getByText('MLB Standings');
    fireEvent.press(pill);

    expect(onStandingsPress).toHaveBeenCalledWith('mlb');
  });

  it('renders no standings pill when standingsAvailable is empty', () => {
    render(<SportTabs selectedSport={null} onSelectSport={jest.fn()} />);

    expect(screen.queryByText(/Standings/)).toBeNull();
  });
});
