/**
 * Bracket Screen - March Madness tournament bracket
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import BracketView from '@components/BracketView';
import { useTheme } from '@hooks/useTheme';

const BracketScreen: React.FC = () => {
  const navigation = useNavigation();
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <BracketView onBack={() => navigation.goBack()} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default BracketScreen;
