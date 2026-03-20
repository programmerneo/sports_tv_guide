/**
 * Bracket Screen - March Madness tournament bracket
 */

import React from 'react';
import { useNavigation } from '@react-navigation/native';

import BracketView from '@components/BracketView';

const BracketScreen: React.FC = () => {
  const navigation = useNavigation();

  return <BracketView onBack={() => navigation.goBack()} />;
};

export default BracketScreen;
