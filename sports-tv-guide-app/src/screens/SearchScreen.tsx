import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@constants/index';

export default function SearchScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Search Screen</Text>
      <Text style={styles.subtext}>Find teams and games</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.LIGHT_BG,
  },
  text: { fontSize: 18, fontWeight: 'bold', color: COLORS.DARK_TEXT },
  subtext: { marginTop: 8, fontSize: 14, color: COLORS.LIGHT_TEXT },
});
